part of 'play_view.dart';

/// `RoleCard`: basılı tutunca açılır, bırakınca kapanır (yanındakiler görmesin).
/// Kartın üstünden başlayan sürükleme sayfayı kaydırmaz (CSS `touch-action: none`).
class _RoleCard extends StatelessWidget {
  const _RoleCard({required this.g, required this.reveal, required this.onReveal});
  final _G g;
  final bool reveal;
  final ValueChanged<bool> onReveal;

  @override
  Widget build(BuildContext context) {
    final me = g.view.me!;
    final pal = g.pal;
    final ink = T.b(13, color: C.ink2, weight: FontWeight.w800);

    Widget icon(Widget child, {required bool face}) => Container(
      width: 54,
      height: 54,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: face ? C.ink2 : _moon,
        border: Border.all(color: pal.edge, width: 3),
        borderRadius: BorderRadius.circular(16),
      ),
      child: child,
    );

    final Widget content;
    if (reveal) {
      final lines = <String>[
        if (me.role == 'wolf') me.allies.isNotEmpty ? '${SPlay.allies}: ${me.allies.map(g.plainNick).join(', ')}' : SPlay.noAllies,
        if (me.lover != null)
          SPlay.lover(g.plainNick(me.lover!.id), S.side[me.lover!.side] ?? me.lover!.side) +
              (me.lover!.side != sideOf(me.role) ? ' ${SPlay.loverMixed}' : ''),
        if (me.cupidPair != null) SPlay.cupidPair(g.plainNick(me.cupidPair!.$1), g.plainNick(me.cupidPair!.$2)),
        if (me.seerResults.isNotEmpty)
          '${SPlay.seerResults}: ${me.seerResults.map((r) => '${g.plainNick(r.id)} ${r.wolf ? SPlay.isWolf : SPlay.notWolf}').join(', ')}',
        if (me.potions != null) SPlay.potions(me.potions!.heal, me.potions!.poison),
        if (!me.alive) SPlay.youDied,
      ];
      content = Row(
        children: [
          icon(RoleGlyph(me.role, size: 32, color: roleColor(me.role)), face: true),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: _gapCol(2, [
                Text(S.role[me.role] ?? me.role, style: T.d(24, color: C.ink2)),
                for (final l in lines) Text(l, style: ink),
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Opacity(
                    opacity: 0.85,
                    child: Text(S.roleBlurb[me.role] ?? '', style: T.b(12, color: C.ink2, weight: FontWeight.w700, height: 1.35)),
                  ),
                ),
              ]),
            ),
          ),
        ],
      );
    } else {
      content = Row(
        children: [
          icon(Text('?', style: T.d(28, color: C.ink2, height: 1.45)), face: false),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: _gapCol(2, [
                Text(SPlay.roleHold, style: T.d(19, color: C.ink2, height: 1.15)),
                Opacity(opacity: 0.85, child: Text(SPlay.roleHoldHint, style: T.b(12, color: C.ink2, weight: FontWeight.w700))),
              ]),
            ),
          ),
        ],
      );
    }

    final card = _Lift(
      down: reveal,
      dy: 5,
      shadowUp: 7,
      shadowDown: 2,
      edge: pal.edge,
      builder: (shadow) => Container(
        width: double.infinity,
        constraints: const BoxConstraints(minHeight: 84),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: reveal ? roleColor(me.role) : C.lilac,
          border: Border.all(color: pal.edge, width: 3),
          borderRadius: BorderRadius.circular(22),
          boxShadow: shadow,
        ),
        child: content,
      ),
    );

    return Semantics(
      button: true,
      toggled: reveal,
      child: GestureDetector(
        // Sürükleme yarışını kazanıp sayfanın kaymasını engeller.
        onVerticalDragStart: (_) {},
        onVerticalDragUpdate: (_) {},
        onHorizontalDragStart: (_) {},
        onHorizontalDragUpdate: (_) {},
        child: Listener(
          behavior: HitTestBehavior.opaque,
          onPointerDown: (_) => onReveal(true),
          onPointerUp: (_) => onReveal(false),
          onPointerCancel: (_) => onReveal(false),
          child: Opacity(opacity: !me.alive && !reveal ? 0.7 : 1, child: card),
        ),
      ),
    );
  }
}
