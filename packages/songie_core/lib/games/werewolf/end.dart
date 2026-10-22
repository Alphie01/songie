part of 'play_view.dart';

/// `Over`: kazanan, iki tarafın kartları ve listeleri, gece olanlar, lobiye dönüş çubuğu.
class _Over extends StatefulWidget {
  const _Over({required this.g});
  final _G g;

  @override
  State<_Over> createState() => _OverState();
}

class _OverState extends State<_Over> {
  /// `totalRef`: ilk görünümde ölçülen bekleme süresi.
  late final int _total = math.max(1, widget.g.view.finishAt - widget.g.view.serverNow);

  @override
  Widget build(BuildContext context) {
    final g = widget.g;
    final view = g.view;
    final roles = view.roles ?? const <String, Role>{};
    final wolves = view.seats.where((x) => roles[x.id] == 'wolf').toList();
    final village = view.seats.where((x) => roles[x.id] != null && roles[x.id] != 'wolf').toList();
    final sides = <({String key, String label, List<SeatView> seats})>[
      (key: 'wolves', label: SPlay.sideWolves, seats: wolves),
      (key: 'village', label: SPlay.sideVillage, seats: village),
    ];
    // Kazanan taraf önde ve eğik; deli ya da âşıklar kazandıysa sıra değişmez.
    final ordered = view.winner == 'village' ? sides.reversed.toList() : sides;
    final top = view.winner == 'wolves' || view.winner == 'village' ? view.winner : null;

    final secret = view.secret;
    return Stack(
      clipBehavior: Clip.none,
      children: [
        // `.ww-confetti`: inset -40px 0 auto, 240px yükseklik.
        const Positioned(top: -40, left: 0, right: 0, height: 240, child: Confetti(top: 50)),
        Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: _gapCol(18, [
            Padding(
              padding: const EdgeInsets.only(top: 18),
              child: Column(
                children: [
                  const EndSticker(SPlay.gameOver),
                  const SizedBox(height: 6 + 8),
                  Text(
                    view.winner != null ? (SPlay.winnerTitle[view.winner] ?? SPlay.noWinner) : SPlay.noWinner,
                    style: T.d(48, color: C.text, height: 0.95),
                    textAlign: TextAlign.center,
                  ),
                  if (view.winReason != null && SPlay.reason[view.winReason] != null) ...[
                    const SizedBox(height: 6),
                    Text(SPlay.reason[view.winReason]!, style: T.b(15, color: C.text2, weight: FontWeight.w700), textAlign: TextAlign.center),
                  ],
                ],
              ),
            ),
            IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  for (var i = 0; i < ordered.length; i++) ...[
                    if (i > 0) ...[
                      const SizedBox(width: 12),
                      Center(child: Text('–', style: T.d(30, color: C.text3, height: 1.45))),
                      const SizedBox(width: 12),
                    ],
                    Expanded(child: _SideCard(side: ordered[i].key, label: ordered[i].label, n: ordered[i].seats.length, won: top == ordered[i].key)),
                  ],
                ],
              ),
            ),
            IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  for (var i = 0; i < ordered.length; i++) ...[
                    if (i > 0) const SizedBox(width: 10),
                    Expanded(
                      child: Semantics(
                        label: ordered[i].label,
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(color: C.panel, border: Border.all(color: C.ink, width: 3), borderRadius: BorderRadius.circular(18)),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: _gapCol(8, [
                              Text(
                                trUpper(ordered[i].label),
                                style: T.b(13, color: ordered[i].key == 'wolves' ? C.red : C.mint, weight: FontWeight.w800),
                              ),
                              for (final seat in ordered[i].seats) _RosterRow(g: g, seat: seat, role: roles[seat.id]!),
                            ]),
                          ),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            if (secret != null && secret.isNotEmpty) _Details(summary: SPlay.secretTitle, items: [for (final e in secret) _secretText(e, g.plainNick)]),
            const Spacer(),
            Remaining(
              serverNow: view.serverNow,
              endsAt: view.finishAt,
              tick: const Duration(milliseconds: 250),
              builder: (context, leftMs) => Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: _gapCol(10, [
                  _Bar(fraction: 1 - leftMs / _total, color: C.yellow, duration: const Duration(milliseconds: 250)),
                  Text(SPlay.backIn((leftMs / 1000).ceil()), style: T.b(14, color: C.text2, weight: FontWeight.w800), textAlign: TextAlign.center),
                  if (g.isHost) SButton(label: SPlay.backNow, tone: BtnTone.primary, large: true, block: true, onPressed: () => g.send({'type': 'finish'})),
                ]),
              ),
            ),
          ]),
        ),
      ],
    );
  }
}

/// `.ww-over-card`: tarafın kişi sayısı (kazanan: taçlı, büyük, −3°, gölgeli; diğeri +2°, altta).
class _SideCard extends StatelessWidget {
  const _SideCard({required this.side, required this.label, required this.n, required this.won});
  final String side;
  final String label;
  final int n;
  final bool won;

  @override
  Widget build(BuildContext context) {
    final card = Transform.rotate(
      angle: deg(won ? -3 : 2),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: side == 'wolves' ? C.red : C.mint,
          border: Border.all(color: C.ink, width: 4),
          borderRadius: BorderRadius.circular(26),
          boxShadow: won ? Shadows.lg : null,
        ),
        child: Column(
          mainAxisSize: won ? MainAxisSize.max : MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            if (won) const SSvg(crownSvg, width: 40, height: 28),
            Padding(
              padding: EdgeInsets.only(top: won ? 0 : 10),
              child: Text('$n', style: T.d(won ? 64 : 52, color: C.ink2), textAlign: TextAlign.center),
            ),
            Text(label, style: T.b(14, color: C.ink2, weight: FontWeight.w800), textAlign: TextAlign.center),
          ],
        ),
      ),
    );
    if (won) return card;
    // `align-self: flex-end`: doğal yükseklik, satırın dibinde.
    return Column(mainAxisAlignment: MainAxisAlignment.end, crossAxisAlignment: CrossAxisAlignment.stretch, children: [card]);
  }
}

/// `.ww-over-roster li`: avatar, ad ve rol (ölüyse soluk).
class _RosterRow extends StatelessWidget {
  const _RosterRow({required this.g, required this.seat, required this.role});
  final _G g;
  final SeatView seat;
  final Role role;

  @override
  Widget build(BuildContext context) => Row(
      children: [
        _Face(member: g.members[seat.id], size: 28),
        const SizedBox(width: 8),
        Expanded(
          child: Opacity(
            opacity: seat.alive ? 1 : 0.6,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(g.plainNick(seat.id), style: T.b(15, color: C.text, weight: FontWeight.w800, height: 1.15), maxLines: 1, softWrap: false, overflow: TextOverflow.clip),
                Text(S.role[role] ?? role, style: T.b(11, color: roleColor(role), weight: FontWeight.w800, height: 1.15), maxLines: 1, softWrap: false, overflow: TextOverflow.clip),
              ],
            ),
          ),
        ),
      ],
  );
}
