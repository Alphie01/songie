part of 'play_view.dart';

// ---------- Katmanlar: bomba, geri koyma, patlama, geleceği gör, bildirim ----------

enum _Tone { night, bomb }

/// `--kt-night-veil: rgb(15 10 42 / 0.9)`, `--kt-bomb-veil: rgb(40 6 20 / 0.88)`, `--kt-bomb-text: #ffe0e6`.
const _nightVeil = Color.fromRGBO(15, 10, 42, 0.9);
const _bombVeil = Color.fromRGBO(40, 6, 20, 0.88);
const _bombText = Color(0xFFFFE0E6);

/// `.kt-overlay-title` (+ `.kt-mid` 32, `.kt-big` 44/1).
TextStyle _overlayTitle(double size, {double height = 1.05}) => T.d(size, color: C.text, height: height);
final _overlayHint = T.b(14, color: C.text2, weight: FontWeight.w700);
final _bombHint = T.b(15, color: _bombText, weight: FontWeight.w700);

/// `.kt-overlay`: ekranı kaplayan perde (180 ms belirir), 24px dolgu, gerekirse kayar; gövde en çok 400px.
/// [center]: `.kt-overlay-center` (ortalı, aralık 16). [boom]: gövde `kt-boom` ile büyüyerek gelir.
/// [stopBody]: gövdeye dokunmak perdeye geçmez (yalnızca dışı kapatır).
class _Overlay extends StatelessWidget {
  const _Overlay({
    super.key,
    required this.tone,
    required this.children,
    this.center = false,
    this.boom = false,
    this.onTap,
    this.stopBody = false,
    this.label,
  });
  final _Tone tone;
  final List<Widget> children;
  final bool center;
  final bool boom;
  final VoidCallback? onTap;
  final bool stopBody;
  final String? label;

  @override
  Widget build(BuildContext context) {
    final pad = ktScreenPadding(context);
    final insets = EdgeInsets.fromLTRB(24 + pad.left, 24 + pad.top, 24 + pad.right, 24 + pad.bottom);
    Widget body = ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 400),
      child: center
          ? DefaultTextStyle.merge(
              textAlign: TextAlign.center,
              child: VStack(gap: 16, crossAxisAlignment: CrossAxisAlignment.center, children: children),
            )
          : VStack(gap: 14, children: children),
    );
    if (boom) {
      body = EnterAnim(scale: 0.4, duration: ktMotion(context, const Duration(milliseconds: 600)), curve: const Cubic(0.2, 1.4, 0.4, 1), child: body);
    }
    if (stopBody) body = GestureDetector(onTap: () {}, child: body);
    return Positioned.fill(
      child: EnterAnim(
        duration: ktMotion(context, const Duration(milliseconds: 180)),
        curve: Curves.easeOut,
        child: Semantics(
          scopesRoute: true,
          namesRoute: true,
          explicitChildNodes: true,
          label: label,
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: onTap,
            child: ColoredBox(
              color: tone == _Tone.bomb ? _bombVeil : _nightVeil,
              child: LayoutBuilder(
                builder: (context, c) => SingleChildScrollView(
                  padding: insets,
                  child: ConstrainedBox(
                    constraints: BoxConstraints(minHeight: math.max(0, c.maxHeight - insets.vertical)),
                    child: Center(child: body),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// `.kt-bombcard`: kırmızı, −6° eğik, sürekli titreyen kart. [small]: `.kt-bombcard-sm`; [calm]: nane, durgun.
class _BombCard extends StatefulWidget {
  const _BombCard({required this.child, this.small = false, this.calm = false});
  final Widget child;
  final bool small;
  final bool calm;

  @override
  State<_BombCard> createState() => _BombCardState();
}

class _BombCardState extends State<_BombCard> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 600));

  bool get _still => widget.calm || MediaQuery.disableAnimationsOf(context);

  void _sync() {
    if (_still) {
      _c.stop();
    } else if (!_c.isAnimating) {
      _c.repeat();
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _sync();
  }

  @override
  void didUpdateWidget(_BombCard old) {
    super.didUpdateWidget(old);
    _sync();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  /// `@keyframes kt-shake`: 0/100% −6°, 25% −10° −2px, 75% −2° +2px; her aralık ease-in-out.
  static (double, double) _shake(double t) {
    double e(double u) => Curves.easeInOut.transform(u);
    if (t < .25) {
      final u = e(t / .25);
      return (-6 - 4 * u, -2 * u);
    }
    if (t < .75) {
      final u = e((t - .25) / .5);
      return (-10 + 8 * u, -2 + 4 * u);
    }
    final u = e((t - .75) / .25);
    return (-2 - 4 * u, 2 - 2 * u);
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.small;
    final box = Container(
      width: s ? 112 : 150,
      height: s ? 150 : 200,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: widget.calm ? C.mint : C.red,
        border: Border.all(color: C.ink, width: s ? bw : 4),
        borderRadius: BorderRadius.circular(s ? 18 : 22),
        boxShadow: s ? hardShadow(6, 6) : hardShadow(8, 8),
      ),
      child: widget.child,
    );
    if (_still) return Transform.rotate(angle: deg(-6), child: box);
    return AnimatedBuilder(
      animation: _c,
      child: box,
      builder: (context, child) {
        final (r, x) = _shake(_c.value);
        return Transform(
          alignment: Alignment.center,
          transform: Matrix4.rotationZ(deg(r))..multiply(Matrix4.translationValues(x, 0, 0)),
          child: child,
        );
      },
    );
  }
}

/// Bomba çeken (etkisiz kıl / geri koy) ve diğerleri için tam ekran katman.
class _BombOverlay extends StatelessWidget {
  const _BombOverlay({
    super.key,
    required this.view,
    required this.meId,
    required this.nick,
    required this.remaining,
    required this.spot,
    required this.index,
    required this.onSpot,
    required this.onIndex,
    required this.send,
  });
  final KittenView view;
  final String meId;
  final _Nick nick;
  final int remaining;

  /// top | second | bottom | random; null = kaydırıcıyla tam yer.
  final String? spot;
  final int index;
  final ValueChanged<String> onSpot;
  final ValueChanged<int> onIndex;
  final _Send send;

  @override
  Widget build(BuildContext context) {
    final mine = view.current == meId;
    final secs = (remaining / 1000).ceil();
    final max = view.deckCount;

    if (!mine) {
      final placing = view.phase == 'place';
      final title = placing ? SPlay.placeOther(nick(view.current)) : SPlay.bombOther(nick(view.current));
      return _Overlay(
        tone: placing ? _Tone.night : _Tone.bomb,
        center: true,
        label: title,
        children: [
          _BombCard(small: true, calm: placing, child: placing ? const KtGlyph(kind: 'defuse', size: 64) : const KtBombIcon(size: 64, sparks: true)),
          Text(title, style: _overlayTitle(26)),
          if (!placing) Text(SPlay.bombOtherHint, style: _overlayHint),
        ],
      );
    }

    if (view.phase == 'bomb') {
      return _Overlay(
        tone: _Tone.bomb,
        center: true,
        label: SPlay.bombMe,
        children: [
          const _BombCard(child: KtBombIcon(size: 90, sparks: true)),
          Text(SPlay.bombMe, style: _overlayTitle(44, height: 1)),
          Text(SPlay.bombMeHint, style: _bombHint),
          SButton(
            label: '${SPlay.defuseBtn} · $secs',
            tone: BtnTone.primary,
            block: true,
            minHeight: 60,
            radius: 20,
            shadowY: 5,
            fontSize: 21,
            onPressed: () => send({'type': 'defuse'}),
          ),
        ],
      );
    }

    final fixed = {'top': 0, 'second': math.min(1, max), 'bottom': max};
    final at = spot != null && spot != 'random' ? fixed[spot]! : math.min(index, max);
    String labelAt(int i) => i == 0 ? SPlay.placeTop : (i == max ? SPlay.placeBottom : SPlay.placeAt(i + 1));
    final label = spot == 'random' ? SPlay.placeRandom : labelAt(at);
    final spots = <(String, String)>[
      ('top', SPlay.placeTop),
      if (max >= 2) ('second', SPlay.placeAt(2)),
      ('bottom', SPlay.placeBottom),
      ('random', SPlay.placeRandom),
    ];
    void place() {
      final i = spot == 'random' ? math.Random().nextInt(max + 1) : at;
      send({'type': 'place', 'index': i});
    }

    return _Overlay(
      tone: _Tone.night,
      label: SPlay.placeMe,
      children: [
        Text(SPlay.placeMe, style: _overlayTitle(32)),
        Text(SPlay.placeHint, style: _overlayHint),
        Grid2(
          rowGap: 10,
          columnGap: 10,
          equalHeight: true,
          children: [for (final (k, l) in spots) _SpotBtn(label: l, selected: spot == k, onTap: () => onSpot(k))],
        ),
        if (max > 2)
          VStack(
            gap: 4,
            children: [
              Text(SPlay.placeExact, style: _chooseLabel),
              _Range(value: at, max: max, label: labelAt(at), onChanged: onIndex),
            ],
          ),
        SButton(
          label: '${SPlay.placeBtn(label)} · $secs',
          tone: BtnTone.yellow,
          block: true,
          minHeight: 60,
          radius: 20,
          shadowY: 5,
          fontSize: 21,
          onPressed: place,
        ),
      ],
    );
  }
}

/// `.kt-spot`: geri koyma seçeneği; seçiliyken mercan.
class _SpotBtn extends StatelessWidget {
  const _SpotBtn({required this.label, required this.selected, required this.onTap});
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Pressable(
    onTap: onTap,
    label: label,
    selected: selected,
    builder: (context, _) => Container(
      constraints: const BoxConstraints(minHeight: 52),
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
      decoration: BoxDecoration(
        color: selected ? C.coral : C.panel,
        border: Border.all(color: C.ink, width: bw),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [Flexible(child: Text(label, style: T.d(17, color: selected ? C.ink2 : C.text), textAlign: TextAlign.center))],
      ),
    ),
  );
}

/// `input.kt-range` (`accent-color: var(--coral)`): tarayıcının yerel kaydırıcısı.
/// iOS'ta Cupertino, Android'de Material kaydırıcı; dolu kısım ve topuz mercan.
class _Range extends StatelessWidget {
  const _Range({required this.value, required this.max, required this.label, required this.onChanged});
  final int value;
  final int max;
  final String label;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) => SizedBox(
    height: 44,
    child: SliderTheme(
      data: SliderTheme.of(context).copyWith(
        trackHeight: 4,
        activeTrackColor: C.coral,
        inactiveTrackColor: C.paper3,
        thumbColor: C.coral,
        overlayShape: SliderComponentShape.noOverlay,
        thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 8),
        tickMarkShape: SliderTickMarkShape.noTickMark,
        showValueIndicator: ShowValueIndicator.never,
      ),
      child: Slider.adaptive(
        value: value.clamp(0, max).toDouble(),
        min: 0,
        max: max.toDouble(),
        divisions: max > 0 ? max : null,
        activeColor: C.coral,
        semanticFormatterCallback: (_) => label,
        onChanged: (v) => onChanged(v.round()),
      ),
    ),
  );
}

/// `.kt-toast`: etkisiz kılma bildirimi (1.6 sn: belirir, durur, söner).
class _Toast extends StatefulWidget {
  const _Toast({required this.text});
  final String text;

  @override
  State<_Toast> createState() => _ToastState();
}

class _ToastState extends State<_Toast> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1600));

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MediaQuery.disableAnimationsOf(context)) {
      _c.value = .5;
    } else if (!_c.isAnimating && _c.value == 0) {
      _c.forward();
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final g = Layout.gutter(context);
    final box = Container(
      constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width - 2 * g),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: C.mint,
        border: Border.all(color: C.ink, width: bw),
        borderRadius: BorderRadius.circular(R.pill),
        boxShadow: hardShadow(0, 4),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const KtGlyph(kind: 'defuse', size: 20),
          const SizedBox(width: 8),
          Flexible(child: Text(widget.text, style: T.b(14, color: C.ink2, weight: FontWeight.w800))),
        ],
      ),
    );
    return Semantics(
      liveRegion: true,
      child: AnimatedBuilder(
        animation: _c,
        child: box,
        builder: (context, child) {
          // `@keyframes kt-toast`: 0% saydam +8px, 12–80% görünür, 100% saydam; aralıklar ease-out.
          final t = _c.value;
          double opacity = 1;
          double dy = 0;
          if (t < .12) {
            final u = Curves.easeOut.transform(t / .12);
            opacity = u;
            dy = 8 * (1 - u);
          } else if (t > .8) {
            opacity = 1 - Curves.easeOut.transform((t - .8) / .2);
          }
          return Opacity(opacity: opacity.clamp(0.0, 1.0), child: Transform.translate(offset: Offset(0, dy), child: child));
        },
      ),
    );
  }
}

/// `.kt-peekchip`: kapatılan "Geleceği Gör" kartlarını yeniden açar.
class _PeekChip extends StatelessWidget {
  const _PeekChip({required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Pressable(
    onTap: onTap,
    label: SPlay.futureAgain,
    builder: (context, _) => Container(
      constraints: const BoxConstraints(minHeight: 44),
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: C.lilac,
        border: Border.all(color: C.ink, width: bw),
        borderRadius: BorderRadius.circular(R.pill),
        boxShadow: hardShadow(0, 4),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const KtGlyph(kind: 'future', size: 20),
          const SizedBox(width: 8),
          Text(SPlay.futureAgain, style: T.d(15, color: C.ink2), maxLines: 1, softWrap: false),
        ],
      ),
    ),
  );
}
