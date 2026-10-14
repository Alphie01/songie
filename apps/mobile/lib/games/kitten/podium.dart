part of 'play_view.dart';

/// Sunucudaki oyun sonu süresi (PODIUM_MS); çubuk bu sürede dolar.
const _podiumMs = 10000;

// ---------- Oyun sonu (tasarım: Sonuçlar) `.kt-end` ----------

class _Podium extends StatelessWidget {
  const _Podium({required this.view, required this.members, required this.room});
  final KittenView view;
  final Map<String, RoomPlayer> members;
  final RoomState room;

  @override
  Widget build(BuildContext context) {
    final winner = view.winner != null ? members[view.winner] : null;
    // Son patlayan ikinci olur; hayatta kalan birinci.
    final ranked = stableSorted(view.players, (a, b) => (b.out ?? 99) - (a.out ?? 99));
    final first = ranked.isNotEmpty ? ranked[0] : null;
    final second = ranked.length > 1 ? ranked[1] : null;
    final rest = ranked.length > 2 ? ranked.sublist(2) : const <KtPlayer>[];
    final half = (rest.length / 2).ceil();
    String nick(String id) => members[id]?.nick ?? '?';
    // Hayatta kalanlar (erken bitişte birden çok) ortak birinci; patlayanlar sonra patlayanların ardından.
    int place(KtPlayer p) => p.out == null ? 1 : 1 + ranked.where((q) => q.out == null || q.out! > p.out!).length;
    String sub(KtPlayer p) => p.out == null ? SPodium.survivor : SPodium.outAt(p.out!);
    final g = Layout.gutter(context);
    final vh = viewportHeight(context);
    final meta = T.b(13, color: C.text3, weight: FontWeight.w800);

    Widget roster(List<KtPlayer> col) => Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: C.panel, border: Border.all(color: C.ink, width: bw), borderRadius: BorderRadius.circular(18)),
      child: VStack(
        gap: 8,
        children: [
          for (final p in col)
            Row(
              children: [
                if (members[p.id] case final m?) ...[SAvatar(avatar: m.avatar, nick: m.nick, size: 28), const SizedBox(width: 8)],
                Expanded(
                  child: Text(nick(p.id), style: T.b(15, color: C.text, weight: FontWeight.w800), maxLines: 1, softWrap: false, overflow: TextOverflow.ellipsis),
                ),
                const SizedBox(width: 8),
                Text('${place(p)}.', style: T.b(15, color: C.yellow, weight: FontWeight.w800)),
              ],
            ),
        ],
      ),
    );

    final children = <Widget>[
      Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Flexible(child: Text(S.name, style: meta)),
          Text(room.code, style: meta.copyWith(letterSpacing: 2)),
        ],
      ),
      Padding(
        padding: const EdgeInsets.only(top: 18),
        child: Column(
          children: [
            const EndSticker(SPodium.gameOver),
            const SizedBox(height: 6 + 8),
            Text(winner != null ? SPodium.winnerTitle(winner.nick) : SPodium.none, style: T.d(48, color: C.text, height: 0.95), textAlign: TextAlign.center),
          ],
        ),
      ),
      if (first != null)
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(child: _EndCard(first: true, number: '${place(first)}', name: nick(first.id), sub: sub(first))),
              if (second != null) ...[
                const SizedBox(width: 12),
                Center(child: Text('–', style: T.d(30, color: C.text3, height: 1.45))),
                const SizedBox(width: 12),
                Expanded(
                  child: Align(
                    alignment: Alignment.bottomCenter,
                    child: SizedBox(width: double.infinity, child: _EndCard(first: false, number: '${place(second)}', name: nick(second.id), sub: sub(second))),
                  ),
                ),
              ],
            ],
          ),
        ),
      if (rest.isNotEmpty)
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(child: roster(rest.sublist(0, half))),
              const SizedBox(width: 10),
              Expanded(child: half < rest.length ? roster(rest.sublist(half)) : const SizedBox()),
            ],
          ),
        ),
    ];

    // `.kt-end { max-width: 100% }`: `.col` sınırını kaldırır, tam genişlik.
    return ConstrainedBox(
      constraints: BoxConstraints(minHeight: vh),
      child: ClipRect(
        child: Stack(
          children: [
            const Positioned.fill(child: Confetti(top: 102)),
            Padding(
              padding: EdgeInsets.fromLTRB(g, 72, g, 24),
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: vh - 72 - 24),
                child: IntrinsicHeight(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      for (final (i, w) in children.indexed) ...[if (i > 0) const SizedBox(height: 18), w],
                      // `.kt-end-spacer { flex: 1 }`: aralık iki yanında da var.
                      const SizedBox(height: 18),
                      const Spacer(),
                      const SizedBox(height: 18),
                      Semantics(
                        liveRegion: true,
                        child: Column(
                          children: [
                            const SizedBox(width: double.infinity, child: EndBar(durationMs: _podiumMs)),
                            const SizedBox(height: 10),
                            Text(SPodium.back, style: T.b(14, color: C.text2, weight: FontWeight.w800), textAlign: TextAlign.center),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// `.kt-end-card`: birinci nane (−3°, taçlı, gölgeli), ikinci lila (+2°, altta).
class _EndCard extends StatelessWidget {
  const _EndCard({required this.first, required this.number, required this.name, required this.sub});
  final bool first;
  final String number;
  final String name;
  final String sub;

  @override
  Widget build(BuildContext context) => Transform.rotate(
    angle: deg(first ? -3 : 2),
    child: Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: first ? C.mint : C.lilac,
        border: Border.all(color: C.ink, width: 4),
        borderRadius: BorderRadius.circular(26),
        boxShadow: first ? Shadows.lg : null,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (first) const SSvg(crownSvg, width: 40, height: 28),
          Padding(
            padding: EdgeInsets.only(top: first ? 0 : 10),
            child: Text(number, style: T.d(first ? 64 : 52, color: C.ink2), textAlign: TextAlign.center),
          ),
          Text(name, style: T.b(14, color: C.ink2, weight: FontWeight.w800), maxLines: 1, softWrap: false, overflow: TextOverflow.ellipsis),
          Text(sub, style: T.b(12, color: C.ink2, weight: FontWeight.w700), textAlign: TextAlign.center),
        ],
      ),
    ),
  );
}
