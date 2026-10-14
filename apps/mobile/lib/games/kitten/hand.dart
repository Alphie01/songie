part of 'play_view.dart';

// ---------- El ----------

/// Her tur yeniden kurulur (web'de `key={view.turn}`): seçim, hedef ve istenen kart sıfırlanır.
class _HandArea extends StatefulWidget {
  const _HandArea({super.key, required this.view, required this.meId, required this.nick, required this.send});
  final KittenView view;
  final String meId;
  final _Nick nick;
  final _Send send;

  @override
  State<_HandArea> createState() => _HandAreaState();
}

class _HandAreaState extends State<_HandArea> {
  List<String> _selected = const [];
  String? _target;
  String? _named;

  @override
  Widget build(BuildContext context) {
    final view = widget.view;
    final meId = widget.meId;
    final hand = sortHand(view.hand);
    final giving = view.phase == 'favor' && view.favor?.to == meId;
    final playing = view.phase == 'play' && view.current == meId;

    // Elden çıkan kartları seçimden düş.
    final live = _selected.where((id) => hand.any((c) => c.id == id)).toList();
    final cards = [for (final id in live) hand.firstWhere((c) => c.id == id)];
    final combo = playing ? detectCombo(cards, view.fiveCats) : null;
    final needsTarget = combo == 'favor' || combo == 'pair' || combo == 'triple';
    final targets = view.players.where((p) => p.alive && p.id != meId && p.cards > 0).toList();
    final ready = combo != null && (!needsTarget || _target != null) && (combo != 'triple' || _named != null);

    void toggle(KtCard card) {
      if (giving) {
        setState(() => _selected = [card.id]);
        return;
      }
      if (!playing) return;
      setState(() => _selected = _selected.contains(card.id) ? _selected.where((x) => x != card.id).toList() : [..._selected, card.id]);
    }

    Future<void> play() async {
      if (combo == null) return;
      final ok = await widget.send({
        'type': 'play',
        'cardIds': live,
        if (needsTarget && _target != null) 'target': _target,
        if (combo == 'triple' && _named != null) 'named': _named,
      });
      if (ok && mounted) {
        setState(() {
          _selected = const [];
          _target = null;
          _named = null;
        });
      }
    }

    final hint = T.b(12, color: C.text3, weight: FontWeight.w700);
    return VStack(
      gap: 12,
      children: [
        if (giving)
          _Box(
            children: [
              Text(SPlay.favorMe(widget.nick(view.favor!.from)), style: _boxTitle),
              Text(SPlay.favorMeHint, style: _smallStyle),
            ],
          ),
        Row(
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          children: [
            Text('${SPlay.hand} ${hand.length}', style: T.d(18, color: C.text, height: 1.05)),
            const SizedBox(width: 10),
            Expanded(
              child: live.isNotEmpty && !giving
                  ? Align(
                      alignment: Alignment.centerRight,
                      // `.kt-clear`: 44px yüksek ama −12px dikey kenar payıyla satırda 20px yer kaplar.
                      child: SizedBox(
                        height: 20,
                        child: OverflowBox(
                          minHeight: 44,
                          maxHeight: 44,
                          fit: OverflowBoxFit.deferToChild,
                          child: Pressable(
                            onTap: () => setState(() => _selected = const []),
                            label: SPlay.clear,
                            builder: (context, _) => Container(
                              constraints: const BoxConstraints(minHeight: 44),
                              padding: const EdgeInsets.symmetric(horizontal: 4),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    SPlay.clear,
                                    style: T.b(13, color: C.text3, weight: FontWeight.w800).copyWith(decoration: TextDecoration.underline, decorationColor: C.text3),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    )
                  : (playing ? Text(SPlay.selectHint, style: hint, textAlign: TextAlign.right) : const SizedBox()),
            ),
          ],
        ),
        if (hand.isEmpty)
          Text(SPlay.handEmpty, style: _smallStyle)
        else
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Grid2(
              columns: 3,
              rowGap: 8,
              columnGap: 8,
              equalHeight: true,
              children: [
                for (final c in hand)
                  _HCard(
                    key: ValueKey('hcard-${c.id}'),
                    card: c,
                    selected: live.contains(c.id),
                    dim: !(playing || giving),
                    onTap: playing || giving ? () => toggle(c) : null,
                  ),
              ],
            ),
          ),
        if (giving && live.isNotEmpty)
          SButton(
            label: SPlay.giveBtn(cardName[cards.first.kind] ?? cards.first.kind),
            tone: BtnTone.primary,
            block: true,
            minHeight: 60,
            radius: 20,
            shadowY: 5,
            fontSize: 21,
            onPressed: () => widget.send({'type': 'give', 'cardId': live.first}),
          ),
        if (playing)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: VStack(
              gap: 12,
              children: [
                if (combo != null && needsTarget)
                  _Choose(
                    label: SPlay.chooseTarget,
                    children: [
                      for (final t in targets)
                        SChip(label: widget.nick(t.id), count: '${t.cards}', selected: _target == t.id, onPressed: () => setState(() => _target = t.id)),
                    ],
                  ),
                if (combo == 'triple')
                  _Choose(
                    label: SPlay.chooseNamed,
                    children: [
                      for (final k in cardKinds.where((k) => k != 'bomb'))
                        SChip(label: cardName[k] ?? k, selected: _named == k, onPressed: () => setState(() => _named = k)),
                    ],
                  ),
                if (live.isNotEmpty) _PlaySel(label: combo != null ? SPlay.playAs(actionName[combo] ?? combo) : SPlay.invalid, onTap: ready ? play : null),
                SButton(
                  label: SPlay.draw,
                  tone: BtnTone.yellow,
                  block: true,
                  minHeight: 62,
                  radius: 20,
                  shadowY: 6,
                  fontSize: 21,
                  onPressed: () => widget.send({'type': 'draw', 'turn': view.turn}),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

/// `.kt-hcard`: el kartı (ad + kısa etki). Seçilince 8px kalkar, −2° döner, beyaz çerçeve alır.
class _HCard extends StatelessWidget {
  const _HCard({super.key, required this.card, required this.selected, required this.dim, this.onTap});
  final KtCard card;
  final bool selected;
  final bool dim;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final box = _Outline(
      on: selected,
      radius: 14,
      child: Container(
        constraints: const BoxConstraints(minHeight: 82),
        padding: const EdgeInsets.all(6),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: ktColor(card.kind),
          border: Border.all(color: C.ink, width: bw),
          borderRadius: BorderRadius.circular(14),
          boxShadow: hardShadow(0, selected ? 1 : 4),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(cardName[card.kind] ?? card.kind, style: T.d(15, color: C.ink2, height: 1.05), textAlign: TextAlign.center),
            const SizedBox(height: 4),
            Text(cardFx[card.kind] ?? '', style: T.b(10, color: C.ink2, weight: FontWeight.w700, height: 1.2), textAlign: TextAlign.center),
          ],
        ),
      ),
    );
    // Dönüşüm en dışta: dokunma alanı da kalkmış/dönmüş kartı izler (DOM gibi).
    return AnimatedContainer(
      duration: ktMotion(context, const Duration(milliseconds: 140)),
      curve: const Cubic(0.2, 0.8, 0.2, 1),
      transformAlignment: Alignment.center,
      transform: selected ? (Matrix4.translationValues(0, -8, 0)..multiply(Matrix4.rotationZ(deg(-2)))) : Matrix4.identity(),
      child: Opacity(
        opacity: dim ? 0.85 : 1,
        child: Pressable(onTap: onTap, label: cardName[card.kind], selected: selected, builder: (context, _) => box),
      ),
    );
  }
}

/// `.kt-choose`: etiket + çipler.
class _Choose extends StatelessWidget {
  const _Choose({required this.label, required this.children});
  final String label;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Semantics(
    container: true,
    label: label,
    child: VStack(gap: 6, children: [Text(label, style: _chooseLabel), SChips(children: children)]),
  );
}

/// `.kt-playsel`: sarı çerçeveli şeffaf "… oyna"; geçersizken mor çerçeve, soluk yazı.
class _PlaySel extends StatelessWidget {
  const _PlaySel({required this.label, this.onTap});
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final on = onTap != null;
    return Pressable(
      onTap: onTap,
      label: label,
      builder: (context, _) => Container(
        constraints: const BoxConstraints(minHeight: 52),
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
        decoration: BoxDecoration(border: Border.all(color: on ? C.yellow : C.violet, width: bw), borderRadius: BorderRadius.circular(18)),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [Flexible(child: Text(label, style: T.d(19, color: on ? C.text : C.text3), textAlign: TextAlign.center))],
        ),
      ),
    );
  }
}
