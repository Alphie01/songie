part of 'play_view.dart';

/// `.ag-teams`: iki takımın üye listeleri (ızgara satırında eşit boy).
class _Teams extends StatelessWidget {
  const _Teams({required this.view, required this.members, required this.meId, required this.isHost, required this.send});
  final AgentsView view;
  final Map<String, RoomPlayer> members;
  final String meId;
  final bool isHost;
  final _Send send;

  @override
  Widget build(BuildContext context) {
    final over = view.phase == 'over';
    Widget roster(String t) => Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: C.panel,
        border: Border.all(color: C.ink, width: 3),
        borderRadius: BorderRadius.circular(18),
      ),
      child: VStack(
        gap: 8,
        children: [
          // h2.ag-roster-head: başlık yazısı (Baloo 2), satır yüksekliği 1.05.
          Text(trUpper(S.team[t]!), style: T.d(13, color: _teamColor(t), height: 1.05)),
          VStack(
            gap: 8,
            children: [
              for (final id in view.teams[t]!)
                if (members[id] case final m?)
                  _Member(
                    player: m,
                    me: id == meId,
                    team: t,
                    leader: view.leaders[t] == id,
                    next: view.nextLeaders[t] == id,
                    canMake: isHost && !view.closing && !(over ? view.nextLeaders[t] == id : view.leaders[t] == id),
                    over: over,
                    onMake: () => send({'type': 'setLeader', 'team': t, 'playerId': id}),
                  ),
            ],
          ),
        ],
      ),
    );
    return Semantics(
      container: true,
      label: SSettings.teams,
      child: Grid2(rowGap: 10, columnGap: 10, equalHeight: true, children: [roster('a'), roster('b')]),
    );
  }
}

/// `.ag-member`: avatar, ad, etiketler; sığmayan etiketler alta iner ve sağa yaslanır.
class _Member extends StatelessWidget {
  const _Member({
    required this.player,
    required this.me,
    required this.team,
    required this.leader,
    required this.next,
    required this.canMake,
    required this.over,
    required this.onMake,
  });
  final RoomPlayer player;
  final bool me;
  final String team;
  final bool leader;
  final bool next;
  final bool canMake;
  final bool over;
  final VoidCallback onMake;

  @override
  Widget build(BuildContext context) {
    Widget tag(String text, Color color) => Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
      decoration: BoxDecoration(color: C.ink2, borderRadius: BorderRadius.circular(6)),
      child: Text(
        text,
        style: T.b(10, color: color, weight: FontWeight.w800),
        maxLines: 1,
        softWrap: false,
      ),
    );
    final children = <Widget>[
      SAvatar(avatar: player.avatar, nick: player.nick, size: 28, dim: !player.connected),
      Text(
        '${player.nick}${me ? ' (${SPlay.you})' : ''}',
        style: T.b(15, color: C.text, weight: FontWeight.w800),
        maxLines: 1,
        softWrap: false,
        overflow: TextOverflow.ellipsis,
      ),
      if (leader) tag(SPlay.leader, C.yellow),
      if (next) tag(SPlay.nextLeader, _teamColor(team)),
      if (!player.connected)
        Text(
          SPlay.offline,
          style: T.b(10, color: C.text3, weight: FontWeight.w800),
          maxLines: 1,
          softWrap: false,
        ),
      if (canMake)
        Pressable(
          onTap: onMake,
          label: '${player.nick}: ${over ? SPlay.makeNextLeader : SPlay.makeLeader}',
          builder: (context, _) => Container(
            constraints: const BoxConstraints(minHeight: 28),
            padding: const EdgeInsets.symmetric(horizontal: 8),
            decoration: BoxDecoration(
              color: C.panel2,
              border: Border.all(color: C.ink, width: 2),
              borderRadius: BorderRadius.circular(8),
            ),
            // Genişlemeden dikeyde ortala.
            child: Align(
              widthFactor: 1,
              child: Text(
                SPlay.makeLeader,
                style: T.b(11, color: C.text2, weight: FontWeight.w800),
                maxLines: 1,
                softWrap: false,
              ),
            ),
          ),
        ),
    ];
    // `.gk-avatar + .ag-member-name + * { margin-left: auto }`; ad en fazla `100% - 36px`.
    return _FlexWrap(columnGap: 8, rowGap: 4, autoIndex: children.length > 2 ? 2 : null, limitIndex: 1, limitReserve: 36, children: children);
  }
}

/// `.ag-history`: verilen ipuçları, en yenisi üstte.
class _History extends StatelessWidget {
  const _History({required this.view});
  final AgentsView view;

  @override
  Widget build(BuildContext context) {
    final line = T.b(13, color: C.text, weight: FontWeight.w700);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: C.panel2,
        border: Border.all(color: C.ink, width: 2),
        borderRadius: BorderRadius.circular(16),
      ),
      child: VStack(
        gap: 6,
        children: [
          Text(trUpper(SPlay.history), style: T.d(12, color: C.text3, height: 1.05, letterSpacing: 1.5)),
          if (view.log.isEmpty)
            Text(SPlay.historyEmpty, style: line.copyWith(color: C.text3))
          else
            VStack(
              gap: 6,
              children: [
                for (final e in view.log.reversed)
                  Text.rich(
                    TextSpan(
                      children: [
                        TextSpan(
                          text: '${S.teamShort[e.team]} · ${e.word == null ? SPlay.noClue : '${trUpper(e.word!)} ${_num(e.number)}'}',
                          style: TextStyle(color: _teamColor(e.team), fontWeight: FontWeight.w800),
                        ),
                        if (e.word != null) ...[
                          const TextSpan(text: ' — '),
                          if (e.picks.isEmpty)
                            const TextSpan(text: SPlay.noPicks)
                          else
                            for (var k = 0; k < e.picks.length; k++)
                              TextSpan(
                                text: '${k > 0 ? ', ' : ''}${e.picks[k].word}',
                                style: e.picks[k].color == 'assassin' ? const TextStyle(color: C.red) : null,
                              ),
                        ],
                      ],
                    ),
                    style: line,
                  ),
              ],
            ),
        ],
      ),
    );
  }
}

/// `.ag-over`: tablo sonu başlığı (Sonuçlar ekranı dili), konfeti ve skor kartları.
class _OverHead extends StatelessWidget {
  const _OverHead({required this.view});
  final AgentsView view;

  @override
  Widget build(BuildContext context) {
    Widget piece(double w, double h, Color c, double rot, {bool round = false}) => Transform.rotate(
      angle: deg(rot),
      child: Container(
        width: w,
        height: h,
        decoration: BoxDecoration(color: c, borderRadius: BorderRadius.circular(round ? 99 : 2)),
      ),
    );
    final winner = view.winner;
    return Semantics(
      liveRegion: true,
      container: true,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Positioned(top: 0, left: 12, child: piece(16, 7, C.yellow, 30)),
          Positioned(top: 40, right: 22, child: piece(16, 7, C.pink, -40)),
          Positioned(top: 100, left: 46, child: piece(11, 11, C.mint, 20)),
          Positioned(top: -10, right: 102, child: piece(11, 11, C.sky, 0, round: true)),
          Positioned(top: 140, right: 42, child: piece(16, 7, C.coral, 70)),
          Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // padding-top 8 + boş konfeti öğesinden sonraki 18px boşluk + başlığın 18px üst payı.
              const SizedBox(height: 8 + 18 + 18),
              Column(
                children: [
                  EndSticker(view.closing ? SOver.kickerFinal : SOver.kicker),
                  const SizedBox(height: 6 + 8),
                  Text(
                    winner != null ? SOver.won(S.team[winner]!) : SOver.ended,
                    style: T.d(48, color: C.text, height: 0.95),
                    textAlign: TextAlign.center,
                  ),
                  if (view.reason != null) ...[
                    const SizedBox(height: 6),
                    Text(
                      SOver.reason[view.reason] ?? '',
                      style: T.b(14, color: C.text2, weight: FontWeight.w800),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 18),
              IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Expanded(
                      child: _ScoreCard(view: view, team: 'a'),
                    ),
                    const SizedBox(width: 12),
                    Center(
                      child: ExcludeSemantics(
                        child: Text('–', style: T.d(30, color: C.text3, height: 1.45)),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _ScoreCard(view: view, team: 'b'),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// `.ag-score`: kazanan −3° ve gölgeli (taçlı), kaybeden +2° ve alta yaslı.
class _ScoreCard extends StatelessWidget {
  const _ScoreCard({required this.view, required this.team});
  final AgentsView view;
  final String team;

  @override
  Widget build(BuildContext context) {
    final total = view.total[team]!;
    final found = total - view.remaining[team]!;
    final won = view.winner == team;
    final lost = view.winner != null && !won;
    Widget card = Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _teamColor(team),
        border: Border.all(color: C.ink, width: 4),
        borderRadius: BorderRadius.circular(26),
        boxShadow: won ? hardShadow(6, 6) : null,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (won) SSvg(crownSvg, width: 40, height: 28),
          if (lost) const SizedBox(height: 10),
          Text(
            '$found',
            style: T.d(lost ? 52 : 64, color: C.ink2),
            textAlign: TextAlign.center,
          ),
          Text(
            S.team[team]!,
            style: T.b(14, color: C.ink2, weight: FontWeight.w800),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
    card = Semantics(label: SOver.found(S.team[team]!, found, total), excludeSemantics: true, child: card);
    if (won) return Transform.rotate(angle: deg(-3), child: card);
    if (lost) {
      return Align(
        alignment: Alignment.bottomCenter,
        child: Transform.rotate(
          angle: deg(2),
          child: SizedBox(width: double.infinity, child: card),
        ),
      );
    }
    return card;
  }
}

/// `.ag-over-foot`: lobiye dönüş çubuğu, misafir notu ya da oda sahibinin düğmeleri.
class _OverActions extends StatelessWidget {
  const _OverActions({required this.view, required this.isHost, required this.send});
  final AgentsView view;
  final bool isHost;
  final _Send send;

  @override
  Widget build(BuildContext context) {
    final note = T.b(14, color: C.text2, weight: FontWeight.w800);
    final List<Widget> items;
    if (view.closing) {
      items = [const _ClosingBar(), Text(SOver.closing, style: note, textAlign: TextAlign.center)];
    } else if (!isHost) {
      items = [Text(SOver.waitHost, style: note, textAlign: TextAlign.center)];
    } else {
      items = [
        Text(SOver.newBoardHint, style: note, textAlign: TextAlign.center),
        _PushButton(
          label: SOver.newBoard,
          icon: 'replay',
          background: C.mint,
          minHeight: 62,
          radius: 20,
          shadowY: 6,
          pressY: 5,
          fontSize: 24,
          onTap: () => send({'type': 'newBoard'}),
        ),
        _PushButton(
          label: SOver.toLobby,
          background: C.panel,
          foreground: C.text,
          minHeight: 52,
          radius: 18,
          fontSize: 19,
          onTap: () => send({'type': 'toLobby'}),
        ),
      ];
    }
    return Padding(
      padding: const EdgeInsets.only(top: 6),
      child: VStack(gap: 10, children: items),
    );
  }
}

/// `.ag-howto`: oyunun içindeki "Nasıl oynanır" kutusu.
class _HowTo extends StatelessWidget {
  const _HowTo();

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: C.panel2,
      border: Border.all(color: C.ink, width: 3),
      borderRadius: BorderRadius.circular(20),
    ),
    child: VStack(
      gap: 12,
      children: [
        Text(SHowto.title, style: T.d(18, color: C.text, height: 1.05)),
        for (var i = 0; i < SHowto.steps.length; i++)
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 28,
                height: 28,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: C.yellow,
                  shape: BoxShape.circle,
                  border: Border.all(color: C.ink, width: 2),
                ),
                child: Text('${i + 1}', style: T.d(14, color: C.ink2, height: 1.45)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(SHowto.steps[i].$1, style: T.d(15, color: C.text, height: 1.05)),
                    const SizedBox(height: 2),
                    Text(SHowto.steps[i].$2, style: T.b(13, color: C.text2)),
                  ],
                ),
              ),
            ],
          ),
      ],
    ),
  );
}
