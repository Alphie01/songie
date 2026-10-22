import 'package:flutter/material.dart';

import '../../shared/models.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/game_module.dart';
import '../kit/kit.dart';
import 'models.dart';
import 'settings_panel.dart';
import 'strings.dart';

/// Sunucudaki PODIUM_MS ile aynı: sonuç ekranındaki "lobiye dönülüyor" çubuğu.
const _podiumMs = 12000;
const _mintDeep = Color(0xFF2AAE82);
const _lowRed = Color(0xFFB3262F);

String _splitStatement(String text) => text.replaceFirst(RegExp(r'^Ben hiç\s+'), '');

/// games/never/client/PlayView.tsx
class NeverPlayView extends StatefulWidget {
  const NeverPlayView({super.key, required this.props});
  final PlayViewProps props;

  @override
  State<NeverPlayView> createState() => _NeverPlayViewState();
}

class _NeverPlayViewState extends State<NeverPlayView> {
  String? _error;
  String? _pending;
  String? _pendingKey;

  Future<void> _send(Json action) async {
    setState(() => _error = null);
    final res = await widget.props.act(action);
    if (!res.ok && mounted) setState(() => _error = res.error);
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.props;
    final view = NeverView.fromJson(p.view);
    final members = membersOf(p.room);
    String nick(String id) => id == p.meId ? SPlay.you : (members[id]?.nick ?? '?');
    final isHost = p.room.hostId == p.meId;

    // Yeni cümle gelince iyimser seçimi sıfırla.
    final key = '${view.statement?.id}:${view.phase}';
    if (_pendingKey != key) {
      _pendingKey = key;
      _pending = null;
    }

    if (view.phase == 'podium') return _Podium(view: view, room: p.room, meId: p.meId);

    PlayerInfo? me;
    for (final pl in view.players) {
      if (pl.id == p.meId) me = pl;
    }

    final main = ConstrainedBox(
      constraints: BoxConstraints(minHeight: viewportHeight(context) - 72 - 22),
      child: IntrinsicHeight(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Flexible(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                    decoration: BoxDecoration(color: C.mint, border: Border.all(color: C.ink, width: 3), borderRadius: BorderRadius.circular(R.pill)),
                    child: Text(SPlay.round(view.round, view.totalRounds), style: T.d(16, color: C.ink2, height: 1.2), maxLines: 1),
                  ),
                ),
                const SizedBox(width: 12),
                if (me?.lives != null && view.maxLives != null)
                  Fingers(lives: me!.lives!, max: view.maxLives!)
                else
                  Text(p.room.code, style: T.b(13, color: C.text3, weight: FontWeight.w800, letterSpacing: 2)),
              ],
            ),
            if (view.statement != null) ...[
              const SizedBox(height: 14 + 6),
              _StatementCard(view: view, statement: view.statement!),
            ],
            if (view.phase == 'question' && view.statement != null) ...[
              const SizedBox(height: 14),
              Expanded(
                child: _Question(
                  view: view,
                  statement: view.statement!,
                  me: me,
                  isHost: isHost,
                  pending: _pending,
                  onAnswer: (a) {
                    setState(() => _pending = a);
                    _send({'type': 'answer', 'statementId': view.statement!.id, 'answer': a});
                  },
                  send: _send,
                ),
              ),
            ],
            if (view.phase == 'reveal' && view.reveal != null && view.statement != null) ...[
              const SizedBox(height: 14),
              Expanded(
                child: _Reveal(view: view, reveal: view.reveal!, statement: view.statement!, members: members, me: me, isHost: isHost, nick: nick, send: _send),
              ),
            ],
            if (_error != null) ...[const SizedBox(height: 14), ErrorText(_error!, center: true)],
          ],
        ),
      ),
    );

    return GameColumn(
      child: VStack(
        gap: 28,
        children: [
          main,
          VStack(
            gap: 14,
            children: [
              _PlayerList(view: view, members: members, meId: p.meId),
              _History(view: view, nick: nick),
              _Box(
                child: NeverSettingsPanel(
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
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Box extends StatelessWidget {
  const _Box({required this.child});
  final Widget child;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    decoration: BoxDecoration(color: C.panel2, border: Border.all(color: C.ink, width: 3), borderRadius: BorderRadius.circular(20)),
    child: child,
  );
}

/// Kalkık parmaklar: kalan can. İnen parmaklar mor.
class Fingers extends StatelessWidget {
  const Fingers({super.key, required this.lives, required this.max, this.small = false});
  final int lives;
  final int max;
  final bool small;

  @override
  Widget build(BuildContext context) {
    final w = small ? 7.0 : 9.0;
    final h = small ? 16.0 : 22.0;
    final top = small ? 4.0 : 5.0;
    final bottom = small ? 2.0 : 3.0;
    return Semantics(
      label: SPlay.lives(lives),
      child: Wrap(
        alignment: WrapAlignment.end,
        spacing: small ? 2 : 3,
        runSpacing: small ? 2 : 3,
        children: [
          for (var i = 0; i < max; i++)
            Container(
              width: w,
              height: h,
              decoration: BoxDecoration(
                color: i >= lives ? C.panel : C.yellow,
                border: Border.all(color: C.ink, width: 2),
                borderRadius: BorderRadius.vertical(top: Radius.circular(top), bottom: Radius.circular(bottom)),
              ),
            ),
        ],
      ),
    );
  }
}

class _StatementCard extends StatelessWidget {
  const _StatementCard({required this.view, required this.statement});
  final NeverView view;
  final Statement statement;

  @override
  Widget build(BuildContext context) {
    final timed = view.phase == 'question' && view.endsAt > 0 && view.durationMs > 0;
    return EnterAnim(
      key: ValueKey(statement.id),
      animKey: statement.id,
      dy: 10,
      scale: 0.98,
      child: Transform.rotate(
        angle: deg(-1.5),
        child: Container(
          clipBehavior: Clip.antiAlias,
          decoration: BoxDecoration(
            color: C.mint,
            border: Border.all(color: C.ink, width: 3),
            borderRadius: BorderRadius.circular(28),
            boxShadow: hardShadow(8, 8),
          ),
          child: Remaining(
            serverNow: view.serverNow,
            endsAt: timed ? view.endsAt : 0,
            builder: (context, remaining) {
              final low = remaining < 5000;
              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (timed)
                    Container(
                      height: 8,
                      color: _mintDeep,
                      alignment: Alignment.centerLeft,
                      child: AnimatedFractionallySizedBox(
                        duration: const Duration(milliseconds: 200),
                        widthFactor: (remaining / view.durationMs).clamp(0, 1),
                        heightFactor: 1,
                        child: ColoredBox(color: low ? C.red : C.ink2),
                      ),
                    ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
                    child: VStack(
                      gap: 6,
                      children: [
                        Text(SPlay.lead, style: T.d(26, color: C.ink2)),
                        Text(_splitStatement(statement.text), style: T.d(31, color: C.ink2, height: 1.08)),
                        Padding(
                          padding: const EdgeInsets.only(top: 6),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Flexible(child: Text(categoryNames[statement.category] ?? statement.category, style: T.b(13, color: C.ink2, weight: FontWeight.w800))),
                              if (timed) ...[
                                const SizedBox(width: 8),
                                Text(SPlay.secs((remaining / 1000).ceil()), style: T.b(13, color: low ? _lowRed : C.ink2, weight: FontWeight.w800)),
                              ],
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

/// `.nv-ghost`: mor çerçeveli şeffaf düğme.
class _Ghost extends StatelessWidget {
  const _Ghost({required this.label, required this.onTap, this.pressed = false});
  final String label;
  final VoidCallback onTap;
  final bool pressed;

  @override
  Widget build(BuildContext context) => Pressable(
    onTap: onTap,
    label: label,
    selected: pressed,
    builder: (context, _) => Container(
      constraints: const BoxConstraints(minHeight: 46),
      padding: const EdgeInsets.symmetric(horizontal: 10),
      alignment: Alignment.center,
      decoration: BoxDecoration(border: Border.all(color: pressed ? C.pink : C.violet, width: 2), borderRadius: BorderRadius.circular(14)),
      child: Text(label, style: T.b(14, color: pressed ? C.pink : C.text2, weight: FontWeight.w800, height: 1.2), textAlign: TextAlign.center),
    ),
  );
}

/// `.nv-cta`: sarı ana düğme.
class _Cta extends StatelessWidget {
  const _Cta({required this.label, required this.onTap, this.large = false});
  final String label;
  final VoidCallback onTap;
  final bool large;

  @override
  Widget build(BuildContext context) => SButton(
    label: label,
    tone: BtnTone.yellow,
    block: true,
    minHeight: large ? 60 : 58,
    radius: 20,
    shadowY: 5,
    pressY: 4,
    fontSize: large ? 22 : 20,
    onPressed: onTap,
  );
}

class _Question extends StatelessWidget {
  const _Question({
    required this.view,
    required this.statement,
    required this.me,
    required this.isHost,
    required this.pending,
    required this.onAnswer,
    required this.send,
  });
  final NeverView view;
  final Statement statement;
  final PlayerInfo? me;
  final bool isHost;
  final String? pending;
  final void Function(String a) onAnswer;
  final Future<void> Function(Json a) send;

  @override
  Widget build(BuildContext context) {
    final mine = pending ?? view.myAnswer;
    final active = view.players.where((p) => p.active).toList();
    final answered = active.where((p) => p.answered).length;
    final pct = active.isEmpty ? 0.0 : answered / active.length;
    final note = T.b(14, color: C.text2, weight: FontWeight.w700);

    Widget answer(String kind, String label) {
      final selected = mine == kind;
      final dimmed = mine != null && !selected;
      return Expanded(
        child: AnimatedOpacity(
          duration: const Duration(milliseconds: 140),
          opacity: dimmed ? 0.55 : 1,
          child: Pressable(
            onTap: () => onAnswer(kind),
            label: label,
            selected: selected,
            builder: (context, pressed) {
              final down = selected ? 5.0 : (pressed ? 4.0 : 0.0);
              final shadow = selected ? 2.0 : (pressed ? 1.0 : 7.0);
              return AnimatedContainer(
                duration: const Duration(milliseconds: 80),
                transform: Matrix4.translationValues(0, down, 0),
                child: FocusRing(
                  focused: selected,
                  radius: 24,
                  color: C.paper,
                  width: 4,
                  child: Container(
                    constraints: const BoxConstraints(minHeight: 120),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: kind == 'did' ? C.pink : C.paper,
                      border: Border.all(color: C.ink, width: 3),
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: hardShadow(0, shadow),
                    ),
                    child: Text(label, style: T.d(28, color: C.ink2)),
                  ),
                ),
              );
            },
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (view.canAnswer) ...[
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Row(children: [answer('did', SPlay.did), const SizedBox(width: 12), answer('didNot', SPlay.didNot)]),
          ),
          const SizedBox(height: 12),
          Text(mine != null ? SPlay.answeredNote : SPlay.askNote, style: note, textAlign: TextAlign.center),
        ] else
          _Box(child: Text(me?.eliminated == true ? SPlay.eliminatedNote : SPlay.lateNote, style: note, textAlign: TextAlign.center)),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: Container(
                height: 10,
                clipBehavior: Clip.antiAlias,
                decoration: BoxDecoration(color: C.ink2, borderRadius: BorderRadius.circular(R.pill)),
                alignment: Alignment.centerLeft,
                child: AnimatedFractionallySizedBox(
                  duration: const Duration(milliseconds: 200),
                  widthFactor: pct,
                  heightFactor: 1,
                  child: const ColoredBox(color: C.mint),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Text(SPlay.waiting(answered, active.length), style: T.b(13, color: C.text, weight: FontWeight.w800)),
          ],
        ),
        const SizedBox(height: 12),
        const Spacer(),
        const SizedBox(height: 12),
        Row(
          children: [
            if (view.canAnswer)
              Expanded(
                child: _Ghost(
                  label: view.skipMine ? SPlay.skipUndo(view.skipVotes, view.skipNeeded) : SPlay.skip(view.skipVotes, view.skipNeeded),
                  pressed: view.skipMine,
                  onTap: () => send({'type': 'voteSkip', 'statementId': statement.id}),
                ),
              ),
            if (view.canAnswer && isHost) const SizedBox(width: 8),
            if (isHost) Expanded(child: _Ghost(label: SPlay.nextStatement, onTap: () => send({'type': 'next', 'statementId': statement.id}))),
          ],
        ),
        if (isHost && answered > 0) ...[
          const SizedBox(height: 12),
          _Cta(label: SPlay.revealNow, onTap: () => send({'type': 'reveal', 'statementId': statement.id})),
        ],
      ],
    );
  }
}

class _Reveal extends StatelessWidget {
  const _Reveal({
    required this.view,
    required this.reveal,
    required this.statement,
    required this.members,
    required this.me,
    required this.isHost,
    required this.nick,
    required this.send,
  });
  final NeverView view;
  final RoundSummary reveal;
  final Statement statement;
  final Map<String, RoomPlayer> members;
  final PlayerInfo? me;
  final bool isHost;
  final String Function(String id) nick;
  final Future<void> Function(Json a) send;

  @override
  Widget build(BuildContext context) {
    final pct = reveal.answered > 0 ? (reveal.didCount / reveal.answered * 100).round() : 0;
    final headline = reveal.answered == 0
        ? SPlay.noAnswers
        : reveal.didCount == 0
        ? SPlay.nobody
        : reveal.didCount == reveal.answered
        ? SPlay.everyone
        : SPlay.didCount(reveal.didCount, reveal.answered);
    final missing = reveal.total - reveal.answered;
    final byId = {for (final pl in view.players) pl.id: pl};
    PlayerInfo? leader;
    if (!view.anonymous) {
      final sorted = view.players.where((x) => (x.didCount ?? 0) > 0).toList()..sort((a, b) => (b.didCount ?? 0) - (a.didCount ?? 0));
      leader = sorted.isEmpty ? null : sorted.first;
    }
    final youLine = view.myAnswer != null
        ? SPlay.yourAnswer(view.myAnswer!)
        : (me != null && !me!.eliminated && me!.active ? SPlay.noAnswer : null);
    final tellerNick = !view.anonymous && reveal.storytellerId != null ? members[reveal.storytellerId]?.nick : null;
    final lines = <String>[
      if (reveal.eliminatedIds != null && reveal.eliminatedIds!.isNotEmpty) '${SPlay.eliminated(joinNames(reveal.eliminatedIds!.map(nick).toList()))}.',
      if (leader != null && leader.didCount != null) SPlay.leader(nick(leader.id), leader.didCount!),
    ];
    final note = T.b(14, color: C.text2, weight: FontWeight.w700);

    return Semantics(
      liveRegion: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: _gapped(12, [
          Text(headline, style: T.d(26, color: C.text, height: 1.1), textAlign: TextAlign.center),
          Container(
            height: 40,
            clipBehavior: Clip.antiAlias,
            decoration: BoxDecoration(color: C.ink2, border: Border.all(color: C.ink, width: 3), borderRadius: BorderRadius.circular(14)),
            child: Stack(
              children: [
                Positioned.fill(child: GrowBar(fraction: pct / 100, color: C.pink)),
                Positioned(
                  left: 12,
                  top: 0,
                  bottom: 0,
                  child: Center(child: Text('%$pct', style: T.d(20, color: pct < 18 ? C.paper : C.ink2))),
                ),
              ],
            ),
          ),
          if (youLine != null || missing > 0)
            Wrap(
              alignment: WrapAlignment.spaceBetween,
              spacing: 12,
              runSpacing: 4,
              children: [
                if (youLine != null) Text(youLine, style: T.b(14, color: C.yellow, weight: FontWeight.w800)),
                if (missing > 0) Text(SPlay.unanswered(missing), style: T.b(14, color: C.text3, weight: FontWeight.w800)),
              ],
            ),
          if (reveal.didIds != null && reveal.didIds!.isNotEmpty)
            Grid2(
              rowGap: 8,
              columnGap: 8,
              children: [
                for (final id in reveal.didIds!)
                  Builder(
                    builder: (context) {
                      final m = members[id];
                      final pl = byId[id];
                      final out = reveal.eliminatedIds?.contains(id) ?? false;
                      final tail = out ? SPlay.eliminatedTag : (pl?.lives != null ? SPlay.doerLives(pl!.lives!) : null);
                      return Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(color: out ? C.red : C.panel, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(14)),
                        child: Row(
                          children: [
                            if (m != null) ...[SAvatar(avatar: m.avatar, nick: m.nick, size: 28, dim: !m.connected), const SizedBox(width: 8)],
                            Expanded(
                              child: Text(
                                '${m?.nick ?? '?'}${tail != null ? ' · $tail' : ''}',
                                style: T.b(14, color: out ? C.ink2 : C.text, weight: FontWeight.w800),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
              ],
            ),
          if (lines.isNotEmpty) Text(lines.join(' '), style: note),
          if (tellerNick != null)
            Transform.rotate(
              angle: deg(-1),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: C.yellow, border: Border.all(color: C.ink, width: 3), borderRadius: BorderRadius.circular(16)),
                child: Text(SPlay.storyteller(tellerNick), style: T.d(18, color: C.ink2, height: 1.15)),
              ),
            ),
          const Spacer(),
          if (isHost)
            _Cta(label: view.isFinal ? SPlay.toResults : SPlay.next, large: true, onTap: () => send({'type': 'next', 'statementId': statement.id}))
          else
            Text(view.isFinal ? SPlay.finalNote : SPlay.waitHost, style: note, textAlign: TextAlign.center),
        ]),
      ),
    );
  }
}

/// CSS `display:flex; gap`: boşluk her öğenin arasına, esnek boşluğun (Spacer) iki yanına da girer.
List<Widget> _gapped(double gap, List<Widget> items) {
  final out = <Widget>[];
  for (final w in items) {
    if (out.isNotEmpty) out.add(SizedBox(height: gap));
    out.add(w);
  }
  return out;
}

class _PlayerList extends StatelessWidget {
  const _PlayerList({required this.view, required this.members, required this.meId});
  final NeverView view;
  final Map<String, RoomPlayer> members;
  final String meId;

  @override
  Widget build(BuildContext context) {
    final sorted = [...view.players]
      ..sort((a, b) {
        final e = (a.eliminated ? 1 : 0) - (b.eliminated ? 1 : 0);
        return e != 0 ? e : (b.lives ?? 0) - (a.lives ?? 0);
      });
    return _Box(
      child: VStack(
        gap: 10,
        children: [
          Text.rich(
            TextSpan(
              text: '${SPlay.players} ',
              children: [TextSpan(text: '${view.players.length}', style: T.d(18, color: C.text3))],
            ),
            style: T.d(18, color: C.text),
          ),
          VStack(
            gap: 8,
            children: [
              for (final pl in sorted)
                if (members[pl.id] case final m?)
                  Builder(
                    builder: (context) {
                      final isMe = pl.id == meId;
                      final tag = pl.eliminated ? 'out' : (view.phase == 'question' ? (pl.answered ? 'answered' : 'waiting') : null);
                      final fg = isMe ? C.ink2 : C.text;
                      return Container(
                        constraints: const BoxConstraints(minHeight: 44),
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        decoration: BoxDecoration(color: isMe ? C.mint : C.panel, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(14)),
                        child: Row(
                          children: [
                            SAvatar(avatar: m.avatar, nick: m.nick, size: 28, dim: !m.connected || pl.eliminated),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Opacity(
                                opacity: pl.eliminated ? 0.7 : 1,
                                child: Text(
                                  m.nick,
                                  style: T.b(14, color: fg, weight: FontWeight.w800).copyWith(decoration: pl.eliminated ? TextDecoration.lineThrough : null, decorationColor: fg),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ),
                            if (tag != null) ...[
                              const SizedBox(width: 8),
                              if (tag == 'out')
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                  decoration: BoxDecoration(color: C.red, borderRadius: BorderRadius.circular(6)),
                                  child: Text(SPlay.eliminatedTag, style: T.b(11, color: C.ink2, weight: FontWeight.w800)),
                                )
                              else
                                Opacity(
                                  opacity: 0.85,
                                  child: Text(tag == 'answered' ? SPlay.answered : SPlay.waitingTag, style: T.b(11, color: fg, weight: FontWeight.w800)),
                                ),
                            ],
                            if (pl.lives != null && view.maxLives != null && !pl.eliminated) ...[
                              const SizedBox(width: 8),
                              Fingers(lives: pl.lives!, max: view.maxLives!, small: true),
                            ],
                          ],
                        ),
                      );
                    },
                  ),
            ],
          ),
        ],
      ),
    );
  }
}

class _History extends StatelessWidget {
  const _History({required this.view, required this.nick});
  final NeverView view;
  final String Function(String id) nick;

  @override
  Widget build(BuildContext context) {
    return _Box(
      child: VStack(
        gap: 10,
        children: [
          Text(SPlay.history, style: T.d(18, color: C.text)),
          if (view.history.isEmpty)
            Text(SPlay.historyEmpty, style: SettingsGroup.defaultHint())
          else
            ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 360),
              child: ListView.separated(
                shrinkWrap: true,
                padding: EdgeInsets.zero,
                itemCount: view.history.length,
                separatorBuilder: (_, _) => const SizedBox(height: 8),
                itemBuilder: (context, i) {
                  final r = view.history[i];
                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    decoration: BoxDecoration(color: C.panel, borderRadius: BorderRadius.circular(12)),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(r.text, style: T.b(14, color: C.text, weight: FontWeight.w700)),
                        const SizedBox(height: 2),
                        Text.rich(
                          TextSpan(
                            children: [
                              TextSpan(text: '${r.didCount}/${r.answered}', style: T.b(12, color: C.yellow, weight: FontWeight.w800)),
                              if (r.didIds != null && r.didIds!.isNotEmpty) TextSpan(text: ' ${r.didIds!.map(nick).join(', ')}'),
                            ],
                          ),
                          style: T.b(12, color: C.text3, weight: FontWeight.w700),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}

class _Podium extends StatelessWidget {
  const _Podium({required this.view, required this.room, required this.meId});
  final NeverView view;
  final RoomState room;
  final String meId;

  @override
  Widget build(BuildContext context) {
    final members = membersOf(room);
    final p = view.podium;
    String nick(String id) => members[id]?.nick ?? '?';
    List<PodiumPlayer>? rows;
    PodiumPlayer? most;
    PodiumPlayer? least;
    if (p?.players != null && p!.players!.isNotEmpty) {
      rows = [...p.players!]
        ..sort((a, b) {
          final l = (b.lives ?? 0) - (a.lives ?? 0);
          return l != 0 ? l : a.did - b.did;
        });
      most = ([...p.players!]..sort((a, b) => b.did - a.did)).first;
      least = ([...p.players!]..sort((a, b) => a.did - b.did)).first;
    }

    String title;
    if (p?.winners != null) {
      title = p!.winners!.isNotEmpty ? SPodium.winner(joinNames(p.winners!.map(nick).toList())) : SPodium.noneLeft;
    } else if (least != null && p!.players!.length > 1) {
      title = SPodium.cleanest(nick(least.id));
    } else {
      title = SPodium.title;
    }

    final livesMode = view.maxLives != null;
    final first = rows?.first;
    final second = most != null && first != null && most.id != first.id && most.did > 0 ? most : null;
    final note = T.b(14, color: C.text2, weight: FontWeight.w700);

    return ConstrainedBox(
      constraints: BoxConstraints(minHeight: viewportHeight(context)),
      child: Stack(
        children: [
          Positioned.fill(
            child: Align(
              alignment: Alignment.topCenter,
              child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 480), child: const Confetti(top: 102)),
            ),
          ),
          GameColumn(
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: viewportHeight(context) - 72 - 22),
              child: IntrinsicHeight(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: _gapped(18, [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(S.name, style: T.b(13, color: C.text3, weight: FontWeight.w800)),
                        Text(room.code, style: T.b(13, color: C.text3, weight: FontWeight.w800, letterSpacing: 2)),
                      ],
                    ),
                    Padding(
                      padding: const EdgeInsets.only(top: 18),
                      child: Column(
                        children: [
                          const EndSticker(SPodium.gameOver),
                          const SizedBox(height: 6 + 8),
                          Text(title, style: T.d(48, color: C.text, height: 0.95), textAlign: TextAlign.center),
                          const SizedBox(height: 6),
                          Text(SPodium.summary(p?.rounds ?? 0), style: T.b(14, color: C.text2, weight: FontWeight.w800), textAlign: TextAlign.center),
                        ],
                      ),
                    ),
                    if (first != null)
                      EndCards(
                        first: EndCard(
                          number: '${livesMode ? (first.lives ?? 0) : first.did}',
                          caption: livesMode ? SPodium.livesLeft : SPodium.timesDid,
                          name: nick(first.id),
                          maxWidth: 220,
                        ),
                        second: second == null
                            ? null
                            : EndCard(number: '${second.did}', caption: SPodium.mostDidCaption, name: nick(second.id), first: false, maxWidth: 220),
                      ),
                    if (p?.hottest != null)
                      Transform.rotate(
                        angle: deg(-1),
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(color: C.yellow, border: Border.all(color: C.ink, width: 3), borderRadius: BorderRadius.circular(16)),
                          child: VStack(
                            gap: 4,
                            children: [
                              Text(SPodium.hottest, style: T.b(13, color: C.ink2, weight: FontWeight.w800)),
                              Text(p!.hottest!.text, style: T.d(18, color: C.ink2, height: 1.15)),
                              Text(SPodium.hottestCount(p.hottest!.didCount, p.hottest!.total), style: T.b(13, color: C.ink2, weight: FontWeight.w800)),
                            ],
                          ),
                        ),
                      ),
                    if (rows != null)
                      Rosters<PodiumPlayer>(
                        items: rows,
                        row: (r) {
                          final m = members[r.id];
                          return Row(
                            children: [
                              if (m != null) ...[SAvatar(avatar: m.avatar, nick: m.nick, size: 28, dim: r.eliminated), const SizedBox(width: 8)],
                              Expanded(
                                child: Opacity(
                                  opacity: r.eliminated ? 0.6 : 1,
                                  child: Text(
                                    nick(r.id),
                                    style: T.b(15, color: r.id == meId ? C.mint : C.text, weight: FontWeight.w800),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(SPodium.timesShort(r.did), style: T.b(15, color: C.yellow, weight: FontWeight.w800)),
                            ],
                          );
                        },
                      )
                    else
                      Text(SPodium.anonymousNote, style: note, textAlign: TextAlign.center),
                    if (p?.me != null) Text(SPodium.me(p!.me!.did, p.me!.didNot), style: note, textAlign: TextAlign.center),
                    const Spacer(),
                    Column(
                      children: [
                        const EndBar(durationMs: _podiumMs),
                        const SizedBox(height: 10),
                        Text(SPodium.back, style: T.b(14, color: C.text2, weight: FontWeight.w800)),
                      ],
                    ),
                  ]),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
