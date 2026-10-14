part of 'play_view.dart';

/// Basılınca inen kutu: CSS `transition: transform 80ms, box-shadow 80ms` (zemin rengi anında değişir).
class _Lift extends StatelessWidget {
  const _Lift({required this.down, required this.dy, required this.shadowUp, required this.shadowDown, required this.edge, required this.builder});
  final bool down;
  final double dy;
  final double shadowUp;
  final double shadowDown;
  final Color edge;
  final Widget Function(List<BoxShadow> shadow) builder;

  @override
  Widget build(BuildContext context) => TweenAnimationBuilder<double>(
    tween: Tween(end: down ? 1 : 0),
    duration: const Duration(milliseconds: 80),
    curve: Curves.ease,
    builder: (context, t, _) => Transform.translate(
      offset: Offset(0, dy * t),
      child: builder(hardShadow(0, shadowUp + (shadowDown - shadowUp) * t, edge)),
    ),
  );
}

/// `Vote`: adaylar + "Kimseyi asma"; açık oyda kim kime verdi görünür.
class _Vote extends StatelessWidget {
  const _Vote({required this.g});
  final _G g;

  @override
  Widget build(BuildContext context) {
    final view = g.view;
    final pal = g.pal;
    final mySeat = g.seat(g.meId);
    final alive = g.alive;
    final voted = alive.where((x) => x.voted).length;
    final mine = view.myVote;
    List<String> votersFor(String? target) => view.liveVotes == null ? const [] : [for (final e in view.liveVotes!.entries) if (e.value == target) e.key];
    final canVote = mySeat?.alive ?? false;

    return _Panel(
      children: [
        _title(view.runoff ? SPlay.runoffTitle : SPlay.voteTitle),
        if (mySeat == null) _Note(SPlay.spectator, pal: pal) else if (!mySeat.alive) _Note(SPlay.deadVote, pal: pal),
        Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: _gapCol(10, [
            for (final id in <String?>[...view.candidates, null])
              Builder(
                builder: (context) {
                  final who = votersFor(id);
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _Ballot(
                        g: g,
                        id: id,
                        pressed: mine != null && mine.target == id,
                        count: view.liveVotes != null ? who.length : null,
                        onTap: canVote ? () => g.send({'type': 'vote', 'session': view.session, 'target': id}) : null,
                      ),
                      if (who.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.fromLTRB(14, 6, 14, 0),
                          child: Text(who.map(g.plainNick).join(', '), style: T.b(12, color: C.text3, weight: FontWeight.w700)),
                        ),
                    ],
                  );
                },
              ),
          ]),
        ),
        _hint(
          '${mine != null ? '${SPlay.voteMine(mine.target != null ? g.plainNick(mine.target!) : SPlay.nobody)}. ' : ''}'
          '${SPlay.voteProgress(voted, alive.length)}. ${SPlay.voteHint(view.liveVotes != null)}',
          pal,
          center: true,
        ),
        if (g.isHost) SGhostButton(label: SPlay.endVote, block: true, onPressed: () => g.send({'type': 'hostSkip', 'session': view.session})),
      ],
    );
  }
}

/// `.ww-ballot-btn`: aday satırı (seçilince sarı ve 3px aşağıda).
class _Ballot extends StatelessWidget {
  const _Ballot({required this.g, required this.id, required this.pressed, required this.count, required this.onTap});
  final _G g;

  /// null = "Kimseyi asma".
  final String? id;
  final bool pressed;
  final int? count;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final none = id == null;
    final fg = pressed ? C.ink2 : C.text;
    final bg = none ? (pressed ? C.paper2 : C.panel2) : (pressed ? C.yellow : C.panel);
    final m = id == null ? null : g.members[id];
    return Opacity(
      opacity: onTap == null ? 0.6 : 1,
      child: Pressable(
        onTap: onTap,
        selected: pressed,
        label: id == null ? SPlay.voteNone : g.plainNick(id!),
        builder: (context, _) => _Lift(
          down: pressed,
          dy: 3,
          shadowUp: 4,
          shadowDown: 1,
          edge: C.ink,
          builder: (shadow) => Container(
            constraints: const BoxConstraints(minHeight: 62),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(color: bg, border: Border.all(color: C.ink, width: 3), borderRadius: BorderRadius.circular(18), boxShadow: shadow),
            child: Row(
              children: [
                if (none)
                  SizedBox(width: 40, height: 40, child: CustomPaint(painter: DashedRRectPainter(color: C.violet, radius: 20, strokeWidth: 3)))
                else
                  _Face(member: m, size: 32),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    none ? SPlay.voteNone : g.plainNick(id!),
                    style: T.d(20, color: fg, height: 1.45),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                if (count != null) ...[const SizedBox(width: 12), _Count(count!, pal: g.pal)],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// `Verdict`: asılan (rolü açıksa) ya da kimse; oy dağılımı.
class _Verdict extends StatelessWidget {
  const _Verdict({required this.g});
  final _G g;

  @override
  Widget build(BuildContext context) {
    final v = g.view.lastVote!;
    final pal = g.pal;
    final hangedRole = v.hanged != null ? g.seat(v.hanged!)?.role : null;
    final max = math.max(1, v.tally.fold(0, (m, t) => math.max(m, t.n)));
    final title = v.hanged != null
        ? SPlay.hanged(g.nick(v.hanged!))
        : (v.noCandidates ? SPlay.sparedNone : (v.tie ? SPlay.sparedTie : SPlay.spared));
    final sorted = [...v.tally]..sort((a, b) => b.n - a.n);
    final row = T.b(14, color: C.text, weight: FontWeight.w800);

    return _Panel(
      children: [
        Text(title, style: T.d(34, color: C.text)),
        if (hangedRole != null)
          Align(
            alignment: Alignment.centerLeft,
            child: _RoleChip(role: hangedRole, label: SPlay.hangedRole(S.role[hangedRole]!), glyph: 14, pal: pal),
          ),
        if (v.tally.isNotEmpty)
          Semantics(
            label: SPlay.tally,
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: C.panel, border: Border.all(color: C.ink, width: 3), borderRadius: BorderRadius.circular(18)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: _gapCol(10, [
                  for (final t in sorted) ...[
                    // `grid-template-columns: minmax(0, 7em) 1fr auto`
                    Row(
                      children: [
                        SizedBox(
                          width: 14 * 7,
                          child: Text(t.id != null ? g.nick(t.id!) : SPlay.voteNone, style: row, maxLines: 1, overflow: TextOverflow.ellipsis),
                        ),
                        const SizedBox(width: 10),
                        Expanded(child: _Bar(fraction: t.n / max, color: t.id == v.hanged ? C.yellow : C.text3)),
                        const SizedBox(width: 10),
                        Text('${t.n}', style: _mono(14, C.text)),
                      ],
                    ),
                    if (v.votes != null)
                      for (final who in [
                        [for (final e in v.votes!.entries) if (e.value == t.id) g.nick(e.key)].join(', '),
                      ])
                        if (who.isNotEmpty) Text(who, style: T.b(12, color: C.text3, weight: FontWeight.w700)),
                  ],
                ]),
              ),
            ),
          ),
        _hint(SPlay.nightFalls, pal, center: true),
      ],
    );
  }
}
