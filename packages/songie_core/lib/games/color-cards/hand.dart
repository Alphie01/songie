part of 'play_view.dart';

// ---------- El ----------

class _HandArea extends StatefulWidget {
  const _HandArea({required this.view, required this.meId, required this.nick, required this.send});
  final ColorCardsView view;
  final String meId;
  final _Nick nick;
  final _Send send;

  @override
  State<_HandArea> createState() => _HandAreaState();
}

class _HandAreaState extends State<_HandArea> {
  CcCard? _picking;
  bool _lockedHint = false;

  @override
  void didUpdateWidget(_HandArea old) {
    super.didUpdateWidget(old);
    // Sıra değişince açık seçici kapanır; el değişince "kilitli" notu silinir.
    if (old.view.step != widget.view.step) _picking = null;
    if (old.view.hand.length != widget.view.hand.length) _lockedHint = false;
  }

  void _choose(CcCard card, Set<String> playable, int handLength, int others) {
    if (!playable.contains(card.id)) return;
    final needsColor = card.color == null;
    final needsSwap = widget.view.rules.sevenZero && card.value == '7' && handLength > 1 && others > 1;
    if (needsColor || needsSwap) {
      setState(() => _picking = card);
      return;
    }
    widget.send({'type': 'play', 'cardId': card.id});
  }

  Future<void> _finish(Json extra) async {
    final picking = _picking;
    if (picking == null) return;
    final ok = await widget.send({'type': 'play', 'cardId': picking.id, ...extra});
    if (ok && mounted) setState(() => _picking = null);
  }

  @override
  Widget build(BuildContext context) {
    final view = widget.view;
    final meId = widget.meId;
    final hand = sortHand(view.hand);
    final playable = view.playable.toSet();
    final myTurn = view.current == meId && (view.phase == 'play' || view.phase == 'challenge');
    final canAct = view.current == meId && view.phase == 'play';
    final others = view.players.where((p) => p.id != meId).toList();
    CcPlayer? me;
    for (final p in view.players) {
      if (p.id == meId) me = p;
    }
    final meCalled = me?.called ?? false;
    final called = meCalled && hand.length <= 2;
    final canCall = hand.isNotEmpty && hand.length <= 2 && !meCalled && view.phase != 'roundOver' && view.exposed != meId;
    final picking = _picking;
    final bluff = picking?.value == 'wild4' && hand.any((c) => c.color == view.activeColor && c.id != picking!.id);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        VStack(
          gap: 12,
          children: [
            if (_lockedHint) Semantics(liveRegion: true, child: Text(SPlay.lastCardLocked, style: _hintStyle, textAlign: TextAlign.center)),
            Row(
              children: [
                Expanded(child: Text('${SPlay.hand} ${hand.length}', style: T.d(18, color: C.text, height: 1.05))),
                const SizedBox(width: 12),
                _LastBtn(
                  label: called ? SPlay.lastCardDone : SPlay.lastCard,
                  dim: !canCall,
                  done: called,
                  hint: SPlay.lastCardHint,
                  onTap: () {
                    if (canCall) {
                      widget.send({'type': 'callLast'});
                    } else if (!called) {
                      setState(() => _lockedHint = true);
                    }
                  },
                ),
              ],
            ),
            _Fan(
              hand: hand,
              playable: playable,
              myTurn: myTurn,
              drawnId: view.drawnId,
              onChoose: (c) => _choose(c, playable, hand.length, others.length),
            ),
            if (canAct && view.drew)
              SButton(
                label: SPlay.pass,
                tone: BtnTone.outline,
                block: true,
                minHeight: 60,
                radius: 20,
                shadowY: 6,
                fontSize: 22,
                onPressed: () => widget.send({'type': 'pass', 'step': view.step}),
              )
            else
              // `.cc-draw:disabled`: sıra başkasındayken sönük mor (saydamlık yok).
              SButton(
                label: view.penalty > 0 && canAct ? SPlay.takePenalty(view.penalty) : SPlay.draw,
                tone: BtnTone.yellow,
                background: canAct ? null : C.panel,
                foreground: canAct ? null : C.text3,
                disabledOpacity: 1,
                block: true,
                minHeight: 60,
                radius: 20,
                shadowY: 6,
                fontSize: 22,
                onPressed: canAct ? () => widget.send({'type': 'draw', 'step': view.step}) : null,
              ),
          ],
        ),
        if (picking != null)
          _Modal(
            label: picking.color == null ? SPlay.chooseColorFor(cardName(picking.color, picking.value)) : SPlay.chooseSwap,
            onClose: () => setState(() => _picking = null),
            children: [
              if (picking.color == null) ...[
                Text(SPlay.chooseColorFor(cardName(picking.color, picking.value)), style: _modalTitle),
                if (bluff)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(color: C.coral, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(12)),
                    child: Text(SPlay.bluffWarn, style: T.b(14, color: C.ink2, weight: FontWeight.w800)),
                  ),
                _ColorGrid(onPick: (col) => _finish({'color': col})),
              ] else ...[
                Text(SPlay.chooseSwap, style: _modalTitle),
                Grid2(
                  rowGap: 10,
                  columnGap: 10,
                  equalHeight: true,
                  children: [
                    for (final p in others)
                      _SwapBtn(nick: widget.nick(p.id), count: SPlay.cardCount(p.cards), onTap: () => _finish({'swapWith': p.id})),
                  ],
                ),
              ],
              _CancelBtn(label: SPlay.cancel, onTap: () => setState(() => _picking = null)),
            ],
          ),
      ],
    );
  }
}

/// `.cc-hand`: yelpaze. Kartlar 58px; dar sütunda üst üste biner, sayfayı taşırmaz
/// (`margin: 0 min(-8px, (100cqw − 48px − n·58px) / 2n)`, uçlarda `overflow-x: clip`).
class _Fan extends StatelessWidget {
  const _Fan({required this.hand, required this.playable, required this.myTurn, required this.drawnId, required this.onChoose});
  final List<CcCard> hand;
  final Set<String> playable;
  final bool myTurn;
  final String? drawnId;
  final void Function(CcCard card) onChoose;

  @override
  Widget build(BuildContext context) {
    final n = hand.length;
    final spread = n > 1 ? math.min(6.0, 48 / (n - 1)) : 0.0;
    return Semantics(
      container: true,
      label: SPlay.hand,
      child: LayoutBuilder(
        builder: (context, c) {
          final w = c.maxWidth;
          final count = math.max(n, 1);
          final m = math.min(-8.0, (w - 48 - count * 58) / (2 * count));
          final slot = 58 + 2 * m;
          final start = (w - n * slot) / 2;
          return ClipRect(
            clipper: const CcHClip(),
            child: SizedBox(
              width: w,
              height: 104,
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  for (var i = 0; i < n; i++)
                    Positioned(
                      key: ValueKey(hand[i].id),
                      left: start + i * slot + m,
                      top: 10,
                      width: 58,
                      height: 90,
                      child: _CardBtn(
                        card: hand[i],
                        rotate: (i - (n - 1) / 2) * spread,
                        dy: myTurn ? (playable.contains(hand[i].id) ? -12 : 4) : 0,
                        dim: myTurn && !playable.contains(hand[i].id),
                        drawn: drawnId == hand[i].id,
                        onTap: playable.contains(hand[i].id) ? () => onChoose(hand[i]) : null,
                      ),
                    ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

/// `.cc-cardbtn`: kartın düğmesi (alttan 4px gölge; `rotate(--r) translateY(--dy)`, 150 ms geçiş).
class _CardBtn extends StatelessWidget {
  const _CardBtn({required this.card, required this.rotate, required this.dy, required this.dim, required this.drawn, this.onTap});
  final CcCard card;
  final double rotate;
  final double dy;
  final bool dim;
  final bool drawn;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    Widget face = DecoratedBox(
      decoration: BoxDecoration(borderRadius: BorderRadius.circular(12), boxShadow: hardShadow(0, 4)),
      child: CcCardFace(color: card.color, value: card.value, ring: drawn ? C.paper : null),
    );
    if (dim) face = ColorFiltered(colorFilter: ccDimFilter, child: face);
    // Dönüşüm en dışta: dokunma alanı da kartın döndürülmüş/kaldırılmış hâlini izler (DOM gibi).
    return AnimatedContainer(
      duration: ccMotion(context, const Duration(milliseconds: 150)),
      curve: Curves.ease,
      transformAlignment: Alignment.center,
      transform: Matrix4.rotationZ(deg(rotate))..multiply(Matrix4.translationValues(0, dy, 0)),
      child: Semantics(
        button: true,
        enabled: onTap != null,
        label: cardName(card.color, card.value),
        child: GestureDetector(behavior: HitTestBehavior.opaque, onTap: onTap, child: face),
      ),
    );
  }
}

/// `.cc-swapbtn`: 7-0 kuralında el değiştirilecek oyuncu.
class _SwapBtn extends StatelessWidget {
  const _SwapBtn({required this.nick, required this.count, required this.onTap});
  final String nick;
  final String count;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Pressable(
    onTap: onTap,
    label: nick,
    builder: (context, _) => Container(
      constraints: const BoxConstraints(minHeight: 64),
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(
        color: C.yellow,
        border: Border.all(color: C.ink, width: bw),
        borderRadius: BorderRadius.circular(16),
        boxShadow: hardShadow(0, 4),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(nick, style: T.d(18, color: C.ink2, height: 1.1), textAlign: TextAlign.center),
          Text(count, style: T.b(13, color: C.ink2, weight: FontWeight.w800, height: 1.1), textAlign: TextAlign.center),
        ],
      ),
    ),
  );
}
