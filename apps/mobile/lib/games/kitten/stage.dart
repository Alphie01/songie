part of 'play_view.dart';

// ---------- Duruma göre orta panel ----------

class _Stage extends StatelessWidget {
  const _Stage({
    required this.view,
    required this.meId,
    required this.isHost,
    required this.nick,
    required this.remaining,
    required this.send,
    required this.members,
  });
  final KittenView view;
  final String meId;
  final bool isHost;
  final _Nick nick;
  final int remaining;
  final _Send send;
  final Map<String, RoomPlayer> members;

  @override
  Widget build(BuildContext context) {
    final p = view.pending;
    if (view.phase == 'nope' && p != null) return _NopeWindow(view: view, pending: p, nick: nick, remaining: remaining, send: send);

    final favor = view.favor;
    if (view.phase == 'favor' && favor != null && favor.to != meId) {
      return _Box(children: [Text(SPlay.favorOther(nick(favor.from), nick(favor.to))), ?_timer(view, remaining)]);
    }

    if (view.phase == 'pick') {
      final pick = view.discardPick;
      if (pick != null) {
        return _Box(
          children: [
            Text(SPlay.pickMe, style: _boxTitle),
            Text(SPlay.pickHint, style: _smallStyle),
            ?_timer(view, remaining),
            ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 360),
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 6),
                child: Wrap(
                  alignment: WrapAlignment.center,
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final c in pick)
                      Semantics(
                        button: true,
                        label: cardName[c.kind],
                        child: GestureDetector(
                          behavior: HitTestBehavior.opaque,
                          onTap: () => send({'type': 'pick', 'cardId': c.id}),
                          child: ExcludeSemantics(child: KtCardFace(kind: c.kind)),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ],
        );
      }
      return _Box(children: [Text(SPlay.pickOther(nick(view.current))), ?_timer(view, remaining)]);
    }

    if (view.phase == 'play') {
      final mine = view.current == meId;
      final disconnected = members[view.current]?.connected == false;
      final text = mine
          ? SPlay.myTurnsLeft(view.turnsLeft)
          : [SPlay.turnOf(nick(view.current)), SPlay.turnsLeft(view.turnsLeft)].where((x) => x.isNotEmpty).join(', ');
      return VStack(
        gap: 8,
        children: [
          Text(text, style: _boxText, textAlign: TextAlign.center),
          if (view.myBomb != null) Text(SPlay.myBomb(view.myBomb!), style: T.b(13, color: C.lilac, weight: FontWeight.w800), textAlign: TextAlign.center),
          ?_timer(view, remaining),
          if (isHost && !mine && disconnected)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: VStack(
                gap: 8,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Text(SPlay.hostSkipHint, style: _smallStyle, textAlign: TextAlign.center),
                  SButton(label: SPlay.hostSkip(nick(view.current)), tone: BtnTone.dark, onPressed: () => send({'type': 'skipTurn'})),
                ],
              ),
            ),
        ],
      );
    }

    // bomb / place: tam ekran katman gösteriyor; burada kısa bir durum.
    // (Web'de İyilik İstenen oyuncu da buraya düşer ve "… bomba çekti!" görür; birebir korunur.)
    return _Box(children: [Text(view.phase == 'place' ? SPlay.placeOther(nick(view.current)) : SPlay.bombOther(nick(view.current)))]);
  }
}

/// `.kt-window`: Hayır penceresi (geri sayım, eylem, Hayır sayısı, oynanan kartlar).
class _NopeWindow extends StatelessWidget {
  const _NopeWindow({required this.view, required this.pending, required this.nick, required this.remaining, required this.send});
  final KittenView view;
  final KtPending pending;
  final _Nick nick;
  final int remaining;
  final _Send send;

  @override
  Widget build(BuildContext context) {
    final p = pending;
    final secs = (remaining / 1000).ceil();
    KtCard? nope;
    if (view.alive) {
      for (final c in view.hand) {
        if (c.kind == 'nope') {
          nope = c;
          break;
        }
      }
    }
    final cancel = !p.willHappen;
    final nopeCard = nope;
    return EnterAnim(
      dy: 6,
      scale: 0.98,
      duration: ktMotion(context, const Duration(milliseconds: 220)),
      child: Semantics(
        liveRegion: true,
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: cancel ? C.panel2 : C.ink2,
            border: Border.all(color: C.ink, width: bw),
            borderRadius: BorderRadius.circular(20),
            boxShadow: Shadows.lg,
          ),
          child: VStack(
            gap: 12,
            children: [
              Row(
                children: [
                  ConstrainedBox(
                    constraints: const BoxConstraints(minWidth: 56 * 1.1),
                    child: Text('$secs', style: T.d(56, color: secs <= 2 ? C.red : C.yellow), textAlign: TextAlign.center),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(SPlay.pendingTitle(nick(p.by), actionName[p.kind] ?? p.kind, p.target != null ? nick(p.target) : null), style: T.d(18, color: C.text, height: 1.15)),
                        if (p.named != null) Text(SPlay.pendingNamed(cardName[p.named] ?? p.named!), style: _smallStyle),
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Wrap(
                            crossAxisAlignment: WrapCrossAlignment.center,
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              Text(p.willHappen ? SPlay.willHappen : SPlay.willCancel, style: T.b(13, color: C.text2, weight: FontWeight.w700)),
                              if (p.nopes.isNotEmpty)
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 1),
                                  decoration: BoxDecoration(color: C.red, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(R.pill)),
                                  child: Text(SPlay.nopeCount(p.nopes.length), style: T.b(12, color: C.ink2, weight: FontWeight.w800)),
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      for (final (i, k) in p.cards.indexed) ...[if (i > 0) const SizedBox(width: 3), KtCardFace(kind: k, size: KtSize.mini)],
                    ],
                  ),
                ],
              ),
              ?_timer(view, remaining, color: cancel ? C.red : C.coral),
              if (view.alive)
                if (nopeCard != null)
                  _Btn(
                    label: SPlay.nopeBtn,
                    leading: const KtGlyph(kind: 'nope', size: 24),
                    background: C.red,
                    foreground: C.ink2,
                    minHeight: 62,
                    radius: 20,
                    shadowY: 6,
                    fontSize: 24,
                    onTap: () => send({'type': 'nope', 'pendingId': p.id, 'cardId': nopeCard.id}),
                  )
                else
                  Text(SPlay.noNope, style: _smallStyle, textAlign: TextAlign.center),
            ],
          ),
        ),
      ),
    );
  }
}
