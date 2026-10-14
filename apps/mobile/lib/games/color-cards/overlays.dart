part of 'play_view.dart';

// ---------- Pencere (renk seçimi, itiraz, el gösterimi): `.cc-overlay` + `.cc-modal` ----------

/// `--cc-scrim: rgb(15 10 42 / 0.86)`
const _scrim = Color.fromRGBO(15, 10, 42, 0.86);
final _modalTitle = T.d(24, color: C.ink2, height: 1.1);
final _modalText = T.b(14, color: C.inkSoft, weight: FontWeight.w700);

/// Ekranı kaplayan perde ve ortada beyaz kart. [onClose] verilirse perdeye dokununca kapanır.
class _Modal extends StatelessWidget {
  const _Modal({required this.children, this.onClose, this.label});
  final List<Widget> children;
  final VoidCallback? onClose;
  final String? label;

  @override
  Widget build(BuildContext context) => CcFixed(
    child: Builder(
      builder: (context) {
        final pad = ccScreenPadding(context);
        return EnterAnim(
          duration: ccMotion(context, const Duration(milliseconds: 160)),
          curve: Curves.easeOut,
          child: Semantics(
            scopesRoute: true,
            namesRoute: true,
            explicitChildNodes: true,
            label: label,
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: onClose,
              child: ColoredBox(
                color: _scrim,
                child: Padding(
                  padding: EdgeInsets.fromLTRB(24 + pad.left, 24 + pad.top, 24 + pad.right, 24 + pad.bottom),
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 400),
                      child: GestureDetector(
                        onTap: () {},
                        child: Container(
                          decoration: BoxDecoration(
                            color: C.paper,
                            border: Border.all(color: C.ink, width: bw),
                            borderRadius: BorderRadius.circular(26),
                            boxShadow: hardShadow(0, 8),
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(26 - bw),
                            child: SingleChildScrollView(
                              padding: const EdgeInsets.all(20),
                              child: DefaultTextStyle.merge(
                                style: T.b(16, color: C.ink2),
                                child: VStack(gap: 14, children: children),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      },
    ),
  );
}

/// `.cc-colors`: dört renk düğmesi, iki sütun.
class _ColorGrid extends StatelessWidget {
  const _ColorGrid({required this.onPick});
  final void Function(String color) onPick;

  @override
  Widget build(BuildContext context) => Grid2(
    rowGap: 10,
    columnGap: 10,
    children: [for (final c in ccColors) _ColorBtn(color: c, onTap: () => onPick(c))],
  );
}

/// `.cc-colorbtn` (basınca 3px iner).
class _ColorBtn extends StatelessWidget {
  const _ColorBtn({required this.color, required this.onTap});
  final String color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final label = colorName[color]!;
    return Pressable(
      onTap: onTap,
      label: label,
      builder: (context, pressed) => Container(
        transform: Matrix4.translationValues(0, pressed ? 3 : 0, 0),
        constraints: const BoxConstraints(minHeight: 64),
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
        decoration: BoxDecoration(
          color: ccColor(color),
          border: Border.all(color: C.ink, width: bw),
          borderRadius: BorderRadius.circular(16),
          boxShadow: hardShadow(0, pressed ? 1 : 4),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [Flexible(child: Text(label, style: T.d(20, color: C.ink2), maxLines: 1, softWrap: false))],
        ),
      ),
    );
  }
}

/// `.cc-modal-cancel`: açık mor, 2px çerçeve.
class _CancelBtn extends StatelessWidget {
  const _CancelBtn({required this.label, required this.onTap});
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Pressable(
    onTap: onTap,
    label: label,
    builder: (context, _) => Container(
      constraints: const BoxConstraints(minHeight: 46),
      padding: const EdgeInsets.symmetric(horizontal: 14),
      decoration: BoxDecoration(color: C.paper2, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(14)),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [Flexible(child: Text(label, style: T.b(16, color: C.ink2, weight: FontWeight.w800), textAlign: TextAlign.center))],
      ),
    ),
  );
}

// ---------- +4 itirazı ----------

class _ChallengeDialog extends StatelessWidget {
  const _ChallengeDialog({required this.view, required this.meId, required this.nick, required this.send, required this.remaining});
  final ColorCardsView view;
  final String meId;
  final _Nick nick;
  final _Send send;
  final int remaining;

  @override
  Widget build(BuildContext context) {
    final ch = view.challenge;
    if (view.phase != 'challenge' || ch == null || ch.victim != meId) return const SizedBox.shrink();
    final canStack = view.playable.isNotEmpty;
    final top = view.top;
    return _Modal(
      label: SPlay.challengeTitle(nick(ch.by)),
      children: [
        Center(child: top == null ? const SizedBox() : CcCardFace(color: top.color, value: top.value)),
        Text(SPlay.challengeTitle(nick(ch.by)), style: _modalTitle),
        Text(SPlay.challengeHint(ch.penalty), style: _modalText),
        if (canStack) Text(SPlay.challengeStackHint, style: _modalText),
        if (view.durationMs > 0) _Timer(remaining: remaining, total: view.durationMs, track: C.paper3),
        SButton(
          label: SPlay.challengeBtn,
          background: C.red,
          foreground: C.ink2,
          block: true,
          minHeight: 60,
          radius: 20,
          shadowY: 6,
          fontSize: 22,
          onPressed: () => send({'type': 'challenge', 'step': view.step}),
        ),
        _CancelBtn(label: SPlay.acceptBtn(ch.penalty), onTap: () => send({'type': 'accept', 'step': view.step})),
        if (canStack)
          Wrap(
            alignment: WrapAlignment.center,
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final c in view.hand.where((c) => view.playable.contains(c.id))) _StackFour(key: ValueKey(c.id), card: c, send: send),
            ],
          ),
      ],
    );
  }
}

/// Elindeki +4'ü koyup cezayı devret: önce kart, dokununca renk seçimi.
class _StackFour extends StatefulWidget {
  const _StackFour({super.key, required this.card, required this.send});
  final CcCard card;
  final _Send send;

  @override
  State<_StackFour> createState() => _StackFourState();
}

class _StackFourState extends State<_StackFour> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    final card = widget.card;
    if (!_open) {
      // `.cc-cardbtn[data-playable]`: 12px yukarıda, alttan 4px gölge.
      return Semantics(
        button: true,
        label: cardName(card.color, card.value),
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: () => setState(() => _open = true),
          child: Transform.translate(
            offset: const Offset(0, -12),
            child: DecoratedBox(
              decoration: BoxDecoration(borderRadius: BorderRadius.circular(12), boxShadow: hardShadow(0, 4)),
              child: CcCardFace(color: card.color, value: card.value),
            ),
          ),
        ),
      );
    }
    return IntrinsicWidth(child: _ColorGrid(onPick: (col) => widget.send({'type': 'play', 'cardId': card.id, 'color': col})));
  }
}

/// İtiraz edene oynayanın eli gösterilir; kapatılınca aynı gösterim bir daha açılmaz.
class _RevealDialog extends StatefulWidget {
  const _RevealDialog({required this.view, required this.nick});
  final ColorCardsView view;
  final _Nick nick;

  @override
  State<_RevealDialog> createState() => _RevealDialogState();
}

class _RevealDialogState extends State<_RevealDialog> {
  int _closed = 0;

  @override
  Widget build(BuildContext context) {
    final r = widget.view.reveal;
    if (r == null || _closed == r.seq) return const SizedBox.shrink();
    void close() => setState(() => _closed = r.seq);
    return _Modal(
      label: SPlay.revealTitle(widget.nick(r.of)),
      onClose: close,
      children: [
        Text(SPlay.revealTitle(widget.nick(r.of)), style: _modalTitle),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: r.guilty ? C.red : C.mint,
            border: Border.all(color: C.ink, width: 2),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(r.guilty ? SPlay.revealGuilty : SPlay.revealClean, style: T.b(15, color: C.ink2, weight: FontWeight.w800)),
        ),
        Wrap(
          alignment: WrapAlignment.center,
          spacing: 8,
          runSpacing: 8,
          children: [for (final c in sortHand(r.cards)) CcCardFace(color: c.color, value: c.value, size: CcSize.sm)],
        ),
        SButton(label: SPlay.close, tone: BtnTone.primary, block: true, minHeight: 60, radius: 20, shadowY: 6, fontSize: 22, onPressed: close),
      ],
    );
  }
}
