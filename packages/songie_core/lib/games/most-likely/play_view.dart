import 'package:flutter/material.dart';

import '../../shared/models.dart';
import '../../shared/text.dart';
import '../../ui/icons.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/game_module.dart';
import '../kit/kit.dart';
import 'common.dart';
import 'models.dart';
import 'podium.dart';
import 'settings_panel.dart';
import 'strings.dart';

typedef _Send = Future<void> Function(Json action);
typedef _Nick = String Function(String id);

final _note = T.b(12, color: C.text3, weight: FontWeight.w700);

/// games/most-likely/client/PlayView.tsx
class MostLikelyPlayView extends StatefulWidget {
  const MostLikelyPlayView({super.key, required this.props});
  final PlayViewProps props;

  @override
  State<MostLikelyPlayView> createState() => _MostLikelyPlayViewState();
}

class _MostLikelyPlayViewState extends State<MostLikelyPlayView> {
  String? _error;

  Future<void> _send(Json action) async {
    setState(() => _error = null);
    final res = await widget.props.act(action);
    if (!res.ok && mounted) setState(() => _error = res.error);
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.props;
    final view = MostLikelyView.fromJson(p.view);
    final byId = {for (final x in view.people) x.id: x};
    String nick(String id) => id == p.meId ? SPlay.you : (byId[id]?.nick ?? '?');
    String plainNick(String id) => byId[id]?.nick ?? '?';
    final isHost = p.room.hostId == p.meId;

    if (view.phase == 'podium') return MostLikelyPodium(view: view, meId: p.meId, code: p.room.code);

    final vote = view.phase == 'vote';
    final result = view.result;
    final g = Layout.gutter(context);

    // `.ml-stage`: ekranı doldurur, düğmeler altta.
    final stage = ConstrainedBox(
      constraints: BoxConstraints(minHeight: viewportHeight(context) - 72 - 22),
      child: IntrinsicHeight(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: gapped(12, [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Flexible(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                    decoration: BoxDecoration(
                      color: C.mint,
                      border: Border.all(color: C.ink, width: 3),
                      borderRadius: BorderRadius.circular(R.pill),
                    ),
                    child: Text(SPlay.round(view.round, view.totalRounds), style: T.d(16, color: C.ink2, height: 1.2)),
                  ),
                ),
                Text(
                  p.room.code,
                  style: T.b(13, color: C.text3, weight: FontWeight.w800, letterSpacing: 2),
                ),
              ],
            ),
            if (vote) ...[
              if (view.endsAt > 0) _Timer(view: view),
              _Question(prompt: view.prompt),
              Expanded(
                child: _Vote(view: view, meId: p.meId, isHost: isHost, nick: nick, send: _send, error: _error),
              ),
            ] else if (result != null) ...[
              _Question(prompt: view.prompt),
              Expanded(
                child: _Reveal(view: view, result: result, isHost: isHost, nick: nick, plainNick: plainNick, send: _send, error: _error),
              ),
            ],
          ]),
        ),
      ),
    );

    return GameColumn(
      maxWidth: 440 + 2 * g,
      bottom: 24,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          stage,
          // `.ml-more`
          const SizedBox(height: 28),
          VStack(
            gap: 14,
            children: [
              _Players(view: view, meId: p.meId),
              _History(view: view, nick: plainNick),
              _Panel(
                title: SSide.settings,
                children: [
                  Text(SSide.settingsNote, style: _note),
                  MostLikelySettingsPanel(
                    props: SettingsPanelProps(
                      settings: p.settings,
                      editable: isHost,
                      api: p.api,
                      players: p.room.players,
                      meId: p.meId,
                      section: 'secondary',
                      onChange: (n) => p.setSettings(n),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// `.ml-q`: beyaz soru kartı (+1°), üstünde sarı "Aramızdaki en…" etiketi (−4°).
class _Question extends StatelessWidget {
  const _Question({required this.prompt});
  final Prompt prompt;

  @override
  Widget build(BuildContext context) {
    final full = '${prompt.text} ${S.suffix}';
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Transform.rotate(
        angle: deg(1),
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(18, 22, 18, 18),
              decoration: BoxDecoration(
                color: C.paper,
                border: Border.all(color: C.ink, width: 3),
                borderRadius: BorderRadius.circular(26),
                boxShadow: hardShadow(7, 7),
              ),
              child: Semantics(
                header: true,
                label: '${S.prefix} $full',
                child: ExcludeSemantics(
                  child: Text(
                    full,
                    style: T.d(32, color: C.ink2, height: 1.05),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
            ),
            // `top: -16px` dolgu kutusuna göre; 3px çerçeveyle dış kenardan −13.
            Positioned(
              top: -13,
              left: -40,
              right: -40,
              child: Center(
                child: Transform.rotate(
                  angle: deg(-4),
                  child: ExcludeSemantics(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                      decoration: BoxDecoration(
                        color: C.yellow,
                        border: Border.all(color: C.ink, width: 3),
                        borderRadius: BorderRadius.circular(R.pill),
                      ),
                      child: Text('${S.prefix}…', style: T.d(15, color: C.ink2, height: 1.45), maxLines: 1, softWrap: false),
                    ),
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

/// `.ml-timer`: süre çubuğu + saniye.
class _Timer extends StatelessWidget {
  const _Timer({required this.view});
  final MostLikelyView view;

  @override
  Widget build(BuildContext context) => Remaining(
    serverNow: view.serverNow,
    endsAt: view.endsAt,
    builder: (context, remaining) {
      final secs = (remaining / 1000).ceil();
      final low = remaining < 5000;
      final color = low ? C.red : C.yellow;
      return Semantics(
        label: SPlay.timeLeft(secs),
        child: Row(
          children: [
            Expanded(
              child: Container(
                height: 10,
                clipBehavior: Clip.antiAlias,
                alignment: Alignment.centerLeft,
                decoration: BoxDecoration(color: C.ink2, borderRadius: BorderRadius.circular(R.pill)),
                child: AnimatedFractionallySizedBox(
                  duration: MediaQuery.disableAnimationsOf(context) ? Duration.zero : const Duration(milliseconds: 200),
                  widthFactor: view.durationMs > 0 ? (remaining / view.durationMs).clamp(0.0, 1.0) : 0,
                  heightFactor: 1,
                  child: ColoredBox(color: color),
                ),
              ),
            ),
            const SizedBox(width: 10),
            ConstrainedBox(
              constraints: const BoxConstraints(minWidth: 20),
              child: ExcludeSemantics(
                child: Text(
                  '$secs',
                  style: T.d(18, color: color, height: 1.45),
                  textAlign: TextAlign.right,
                ),
              ),
            ),
          ],
        ),
      );
    },
  );
}

/// Oylama: oyuncu kutuları, tahmin sekmeleri, durum ve oda sahibi düğmeleri (`.ml-body`).
class _Vote extends StatefulWidget {
  const _Vote({required this.view, required this.meId, required this.isHost, required this.nick, required this.send, required this.error});
  final MostLikelyView view;
  final String meId;
  final bool isHost;
  final _Nick nick;
  final _Send send;
  final String? error;

  @override
  State<_Vote> createState() => _VoteState();
}

class _VoteState extends State<_Vote> {
  /// vote | guess
  String _mode = 'vote';

  @override
  void didUpdateWidget(_Vote old) {
    super.didUpdateWidget(old);
    // Yeni soruda oy sekmesine dön.
    if (old.view.prompt.id != widget.view.prompt.id) _mode = 'vote';
  }

  Json get _base => {'round': widget.view.round, 'promptId': widget.view.prompt.id};

  Future<void> _pick(String id) async {
    final v = widget.view;
    if (v.predict && _mode == 'guess') {
      await widget.send({'type': 'guess', ..._base, 'target': id});
    } else {
      await widget.send({'type': 'vote', ..._base, 'target': id});
      // Oy verince tahmine geç.
      if (v.predict && v.myGuess == null && mounted) setState(() => _mode = 'guess');
    }
  }

  @override
  Widget build(BuildContext context) {
    final v = widget.view;
    final candidates = v.people.where((p) => p.present).toList();
    final voted = v.voted.toSet();
    final voters = candidates.where((p) => p.connected || voted.contains(p.id)).toList();
    final doneCount = voters.where((p) => voted.contains(p.id)).length;
    final amIn = candidates.any((p) => p.id == widget.meId);
    final guessing = v.predict && _mode == 'guess';
    final waiting = v.waitingFor.isNotEmpty ? ' · ${SPlay.waiting}: ${joinNames(v.waitingFor.map(widget.nick).toList())}' : '';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: gapped(10, [
        if (amIn && v.predict) _Tabs(mode: _mode, voted: v.myVote != null, guessed: v.myGuess != null, onMode: (m) => setState(() => _mode = m)),
        if (amIn)
          Text(
            guessing ? SPlay.tapToGuess : SPlay.tapToVote(v.selfVote),
            style: T.b(13, color: C.text2, weight: FontWeight.w700),
            textAlign: TextAlign.center,
          ),
        Padding(
          padding: const EdgeInsets.only(top: 10),
          child: Grid2(
            columns: 3,
            rowGap: 10,
            columnGap: 10,
            children: [
              for (final p in candidates)
                Builder(
                  builder: (context) {
                    final self = p.id == widget.meId;
                    final blocked = !guessing && self && !v.selfVote;
                    final isVote = v.myVote == p.id;
                    final isGuess = v.myGuess == p.id;
                    final tag = [if (isVote) SPlay.myVote, if (isGuess) SPlay.myGuess].join(' · ');
                    return _Tile(
                      person: p,
                      self: self,
                      on: guessing ? isGuess : isVote,
                      tag: tag.isEmpty ? null : tag,
                      done: voted.contains(p.id),
                      enabled: amIn && !blocked,
                      onTap: () => _pick(p.id),
                    );
                  },
                ),
            ],
          ),
        ),
        const Spacer(),
        Text(
          '${SPlay.progress(doneCount, voters.length)}$waiting',
          style: T.b(13, color: C.text, weight: FontWeight.w800),
        ),
        Text('${v.anonymous ? SPlay.anonymousNote : SPlay.openNote}${v.endsAt == 0 ? ' ${SPlay.untimed}' : ''}', style: _note),
        if (widget.error != null) ErrorText(widget.error!, center: true),
        if (widget.isHost) ...[
          MlGhost(icon: 'skip', label: SPlay.skip, onTap: () => widget.send({'type': 'skip', ..._base})),
          MlCta(label: SPlay.revealNow, onTap: v.voted.isEmpty ? null : () => widget.send({'type': 'reveal', ..._base})),
        ],
      ]),
    );
  }
}

/// `.ml-tabs`: Oyum / Tahminim.
class _Tabs extends StatelessWidget {
  const _Tabs({required this.mode, required this.voted, required this.guessed, required this.onMode});
  final String mode;
  final bool voted;
  final bool guessed;
  final ValueChanged<String> onMode;

  Widget _tab(String m, String label, bool done) {
    final selected = mode == m;
    final fg = selected ? C.ink2 : C.text2;
    return Pressable(
      onTap: () => onMode(m),
      label: label,
      selected: selected,
      builder: (context, _) => Container(
        constraints: const BoxConstraints(minHeight: 44),
        alignment: Alignment.center,
        decoration: BoxDecoration(color: selected ? C.yellow : null, borderRadius: BorderRadius.circular(12)),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Flexible(
              child: Text(label, style: T.d(17, color: fg, height: 1.45)),
            ),
            if (done) ...[const SizedBox(width: 4), SIcon('check', size: 15, color: fg)],
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(4),
    decoration: BoxDecoration(
      color: C.panel2,
      border: Border.all(color: C.ink, width: 2),
      borderRadius: BorderRadius.circular(16),
    ),
    child: Row(
      children: [
        Expanded(child: _tab('vote', SPlay.modeVote, voted)),
        const SizedBox(width: 6),
        Expanded(child: _tab('guess', SPlay.modeGuess, guessed)),
      ],
    ),
  );
}

/// `.ml-tile`: oyuncu kutusu. Seçiliyken sarı, 3px aşağı ve −2° (120ms).
class _Tile extends StatelessWidget {
  const _Tile({required this.person, required this.self, required this.on, required this.tag, required this.done, required this.enabled, required this.onTap});
  final Person person;
  final bool self;
  final bool on;
  final String? tag;
  final bool done;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final fg = on ? C.ink2 : C.text;
    return Opacity(
      opacity: !enabled && !on ? 0.5 : 1,
      child: Pressable(
        onTap: enabled ? onTap : null,
        label: self ? '${person.nick} (${SPlay.you})' : person.nick,
        selected: on,
        builder: (context, _) => TweenAnimationBuilder<double>(
          tween: Tween(end: on ? 1 : 0),
          duration: MediaQuery.disableAnimationsOf(context) ? Duration.zero : const Duration(milliseconds: 120),
          curve: Curves.ease,
          builder: (context, t, _) => Transform.translate(
            offset: Offset(0, 3 * t),
            child: Transform.rotate(
              angle: deg(-2 * t),
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  Container(
                    width: double.infinity,
                    constraints: const BoxConstraints(minHeight: 104),
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
                    decoration: BoxDecoration(
                      color: on ? C.yellow : C.panel,
                      border: Border.all(color: C.ink, width: 3),
                      borderRadius: BorderRadius.circular(18),
                      boxShadow: hardShadow(0, 5 - 3 * t),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        SAvatar(avatar: person.avatar, nick: person.nick, size: 50, dim: !person.connected),
                        const SizedBox(height: 6),
                        Text(
                          person.nick,
                          style: T.b(14, color: fg, weight: FontWeight.w800),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  // `.ml-tile-tag`: üst kenarın ortasında koyu hap (top −9 dolgu kutusuna göre).
                  if (tag != null)
                    Positioned(
                      top: -6,
                      left: -40,
                      right: -40,
                      child: Center(
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 1),
                          decoration: BoxDecoration(color: C.ink2, borderRadius: BorderRadius.circular(R.pill)),
                          child: Text(
                            tag!,
                            style: T.b(11, color: C.text, weight: FontWeight.w800),
                            maxLines: 1,
                            softWrap: false,
                          ),
                        ),
                      ),
                    ),
                  // `.ml-tile-done`: oy verdi.
                  if (done)
                    Positioned(
                      top: 9,
                      right: 9,
                      child: Semantics(
                        label: SPlay.voted,
                        child: Container(
                          width: 16,
                          height: 16,
                          decoration: BoxDecoration(
                            color: C.mint,
                            shape: BoxShape.circle,
                            border: Border.all(color: C.ink, width: 2),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Açıklama: unvan sahibi, oy çubukları, tahminler (`.ml-body`).
class _Reveal extends StatelessWidget {
  const _Reveal({
    required this.view,
    required this.result,
    required this.isHost,
    required this.nick,
    required this.plainNick,
    required this.send,
    required this.error,
  });
  final MostLikelyView view;
  final RoundResult result;
  final bool isHost;
  final _Nick nick;
  final _Nick plainNick;
  final _Send send;
  final String? error;

  @override
  Widget build(BuildContext context) {
    final r = result;
    final byId = {for (final p in view.people) p.id: p};
    final max = r.counts.isEmpty ? 0 : r.counts.first.votes;
    final last = view.totalRounds != null && view.round >= view.totalRounds!;
    final byTarget = <String, List<String>>{};
    for (final b in r.ballots ?? const <Ballot>[]) {
      (byTarget[b.target] ??= []).add(b.voter);
    }
    // Oy almayanlar da çubukta sıfırla görünsün.
    final rows = [
      ...r.counts,
      for (final p in view.people)
        if (p.present && !r.counts.any((c) => c.id == p.id)) VoteCount(id: p.id, votes: 0),
    ];
    final winners = [for (final id in r.winners) ?byId[id]];

    return Semantics(
      liveRegion: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: gapped(10, [
          if (r.winners.isNotEmpty)
            _Winner(
              people: winners,
              tie: r.winners.length > 1,
              name: joinNames(r.winners.map(plainNick).toList()),
              line: SPlay.winnerLine(S.title(view.prompt.text), max),
            )
          else
            DashedBox(
              color: C.violet,
              radius: 18,
              width: 3,
              padding: const EdgeInsets.all(14),
              child: Text(
                SPlay.noVotes,
                style: T.b(16, color: C.text2, weight: FontWeight.w800),
                textAlign: TextAlign.center,
              ),
            ),
          VStack(
            gap: 6,
            children: [
              for (final c in rows)
                _BarRow(
                  key: ValueKey(c.id),
                  name: plainNick(c.id),
                  votes: c.votes,
                  total: r.total,
                  color: avatarColors[byId[c.id]?.avatar.color] ?? avatarColors['mint']!,
                  voters: r.ballots != null && (byTarget[c.id]?.isNotEmpty ?? false) ? joinNames(byTarget[c.id]!.map(nick).toList()) : null,
                ),
            ],
          ),
          if (r.correctGuessers != null)
            Text(
              r.correctGuessers!.isNotEmpty ? SPlay.correctGuess(joinNames(r.correctGuessers!.map(nick).toList())) : SPlay.nobodyGuessed,
              style: T.b(14, color: C.mint, weight: FontWeight.w800),
            ),
          const Spacer(),
          if (error != null) ErrorText(error!, center: true),
          if (isHost)
            MlCta(label: last ? SPlay.finish : SPlay.next, onTap: () => send({'type': 'next', 'round': view.round}))
          else
            Text(SPlay.waitHost, style: _note, textAlign: TextAlign.center),
        ]),
      ),
    );
  }
}

/// `.ml-winner`: sarı unvan kartı (−1.5°); beraberlikte avatarlar üst üste biner.
class _Winner extends StatelessWidget {
  const _Winner({required this.people, required this.tie, required this.name, required this.line});
  final List<Person> people;
  final bool tie;
  final String name;
  final String line;

  @override
  Widget build(BuildContext context) {
    final size = tie ? 52.0 : 68.0;
    return Transform.rotate(
      angle: deg(-1.5),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: C.yellow,
          border: Border.all(color: C.ink, width: 3),
          borderRadius: BorderRadius.circular(22),
          boxShadow: hardShadow(0, 6),
        ),
        child: Row(
          children: [
            SizedBox(
              width: people.isEmpty ? 0 : size + (people.length - 1) * (size - 14),
              height: people.isEmpty ? 0 : size,
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  for (var i = 0; i < people.length; i++)
                    Positioned(
                      left: i * (size - 14),
                      top: 0,
                      child: SAvatar(avatar: people[i].avatar, nick: people[i].nick, size: size),
                    ),
                ],
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    trUpper(tie ? SPlay.winnerTie : SPlay.winnerOne),
                    style: T.b(12, color: C.ink2, weight: FontWeight.w800, letterSpacing: 1.5),
                  ),
                  Text(name, style: T.d(28, color: C.ink2)),
                  Text(
                    line,
                    style: T.b(13, color: C.ink2, weight: FontWeight.w800),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// `.ml-bar`: ad, oy çubuğu (avatar renginde, soldan büyür) ve sayı; açık oylarda oy verenler.
class _BarRow extends StatelessWidget {
  const _BarRow({super.key, required this.name, required this.votes, required this.total, required this.color, required this.voters});
  final String name;
  final int votes;
  final int total;
  final Color color;
  final String? voters;

  @override
  Widget build(BuildContext context) {
    final style = T.b(14, color: votes == 0 ? C.text3 : C.text, weight: FontWeight.w800);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            SizedBox(
              width: 56,
              child: Text(name, style: style, maxLines: 1, softWrap: false, overflow: TextOverflow.ellipsis),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Container(
                height: 16,
                alignment: Alignment.centerLeft,
                decoration: BoxDecoration(color: C.panel2, borderRadius: BorderRadius.circular(R.pill)),
                child: votes > 0
                    ? FractionallySizedBox(
                        widthFactor: total > 0 ? (votes / total).clamp(0.0, 1.0) : 0,
                        heightFactor: 1,
                        child: GrowX(
                          child: DecoratedBox(
                            decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(R.pill)),
                          ),
                        ),
                      )
                    : null,
              ),
            ),
            const SizedBox(width: 8),
            SizedBox(width: 18, child: Text('$votes', style: style, maxLines: 1, softWrap: false)),
          ],
        ),
        if (voters != null)
          Padding(
            padding: const EdgeInsets.only(left: 64),
            child: Text(
              '${SPlay.votedBy}: $voters',
              style: T.b(12, color: C.text3, weight: FontWeight.w700),
            ),
          ),
      ],
    );
  }
}

/// `.ml-panel`: koyu kutu (oyuncular, geçmiş, ayarlar).
class _Panel extends StatelessWidget {
  const _Panel({required this.title, required this.children});
  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    decoration: BoxDecoration(
      color: C.panel2,
      border: Border.all(color: C.ink, width: 3),
      borderRadius: BorderRadius.circular(20),
    ),
    child: VStack(
      gap: 10,
      children: [
        Semantics(
          header: true,
          child: Text(title, style: T.d(18, color: C.text, height: 1.1)),
        ),
        ...children,
      ],
    ),
  );
}

class _Players extends StatelessWidget {
  const _Players({required this.view, required this.meId});
  final MostLikelyView view;
  final String meId;

  @override
  Widget build(BuildContext context) {
    final showGuess = view.predict || view.guessScores.isNotEmpty;
    final rows = stableSorted(
      [
        for (final p in view.people)
          if (p.present) (p: p, titles: titlesOf(view, p.id).length, guess: view.guessScores[p.id] ?? 0),
      ],
      (a, b) {
        final t = b.titles - a.titles;
        return t != 0 ? t : b.guess - a.guess;
      },
    );
    return _Panel(
      title: SSide.players,
      children: [
        VStack(
          gap: 8,
          children: [
            for (final r in rows)
              Row(
                children: [
                  SAvatar(avatar: r.p.avatar, nick: r.p.nick, size: 28, dim: !r.p.connected),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      r.p.id == meId ? '${r.p.nick} (${SPlay.you})' : r.p.nick,
                      style: T.b(15, color: r.p.id == meId ? C.yellow : C.text, weight: FontWeight.w800),
                      maxLines: 1,
                      softWrap: false,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Trailing(
                    child: Text.rich(
                      TextSpan(
                        text: SSide.titles(r.titles),
                        children: [
                          if (showGuess)
                            TextSpan(
                              text: ' · ${SSide.guessPts(r.guess)}',
                              style: const TextStyle(color: C.text3),
                            ),
                        ],
                      ),
                      style: T.b(13, color: C.yellow, weight: FontWeight.w800),
                      textAlign: TextAlign.right,
                    ),
                  ),
                ],
              ),
          ],
        ),
      ],
    );
  }
}

class _History extends StatelessWidget {
  const _History({required this.view, required this.nick});
  final MostLikelyView view;
  final _Nick nick;

  @override
  Widget build(BuildContext context) {
    final items = view.history.reversed.toList();
    return _Panel(
      title: SSide.history,
      children: [
        if (items.isEmpty)
          Text(SSide.historyEmpty, style: _note)
        else
          VStack(
            gap: 8,
            children: [
              for (final h in items)
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      joinNames(h.winners.map(nick).toList()),
                      style: T.b(14, color: C.text, weight: FontWeight.w800),
                    ),
                    Text(
                      S.title(h.text),
                      style: T.b(13, color: C.text2, weight: FontWeight.w700),
                    ),
                  ],
                ),
            ],
          ),
      ],
    );
  }
}
