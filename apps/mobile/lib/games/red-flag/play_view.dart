import 'package:flutter/material.dart';

import '../../shared/models.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/game_module.dart';
import '../kit/kit.dart';
import 'common.dart';
import 'models.dart';
import 'podium.dart';
import 'strings.dart';

typedef _Send = Future<void> Function(Json action);

/// Bayrak kartlarının tasarımdaki eğimi.
const _tilt = [-3.0, 1.0, 3.0];

final _note = T.b(13, color: C.text2, weight: FontWeight.w700);
final _noteDim = T.b(13, color: C.text3, weight: FontWeight.w700);

/// `.rf-big`: sarı büyük düğme (56px, r20, 0 5 gölge; kapalıyken %60).
Widget _big(String label, VoidCallback? onTap, {Color? background, double disabledOpacity = 0.6}) => SButton(
  label: label,
  tone: BtnTone.yellow,
  background: background,
  block: true,
  minHeight: 56,
  radius: 20,
  shadowY: 5,
  pressY: 4,
  fontSize: 20,
  disabledOpacity: disabledOpacity,
  onPressed: onTap,
);

/// games/red-flag/client/PlayView.tsx
///
/// Telefonda `.sg-side` sütunları (sol oyuncu listesi, sağdaki oyun içi ayarlar) gizlidir; oyuncu listesi
/// ortadaki `.sg-mobile-only` kopyasıyla görünür. Oyun içi ayar paneli web'de de telefonda görünmez.
class RedFlagPlayView extends StatefulWidget {
  const RedFlagPlayView({super.key, required this.props});
  final PlayViewProps props;

  @override
  State<RedFlagPlayView> createState() => _RedFlagPlayViewState();
}

class _RedFlagPlayViewState extends State<RedFlagPlayView> {
  String? _error;

  Future<void> _send(Json action) async {
    setState(() => _error = null);
    final res = await widget.props.act(action);
    if (!res.ok && mounted) setState(() => _error = res.error);
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.props;
    final view = RedFlagView.fromJson(p.view);
    final members = membersOf(p.room);
    String nick(String id) => id == p.meId ? SPlay.you : (members[id]?.nick ?? '?');
    final isHost = p.room.hostId == p.meId;

    if (view.phase == 'podium') return RedFlagPodium(view: view, members: members, meId: p.meId, code: p.room.code);

    final options = view.dealBreaker ? votes : votes.sublist(0, 2);
    final item = view.item;
    final reveal = view.reveal;
    final g = Layout.gutter(context);

    return GameColumn(
      maxWidth: 440 + 2 * g,
      bottom: 24,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: gapped(12, [
          // `.rf-head`
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Flexible(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                  decoration: BoxDecoration(
                    color: C.mint,
                    border: Border.all(color: C.ink, width: bw),
                    borderRadius: BorderRadius.circular(R.pill),
                  ),
                  child: Text(
                    view.phase == 'vote' ? SPlay.round(view.round, view.totalRounds) : SPlay.roundDone(view.round, view.totalRounds),
                    style: T.d(16, color: C.ink2, height: 1.2),
                    maxLines: 1,
                    softWrap: false,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Text(
                p.room.code,
                style: T.b(13, color: C.text3, weight: FontWeight.w800, letterSpacing: 2),
              ),
            ],
          ),
          if (view.phase == 'vote') _Timer(view: view),
          if (item != null) _Card(key: ValueKey('card-${item.id}'), view: view, item: item, options: options),
          if (view.phase == 'vote' && item != null) _VotePanel(view: view, item: item, options: options, send: _send, isHost: isHost, meId: p.meId),
          if (view.phase == 'reveal' && reveal != null)
            _Reveal(view: view, reveal: reveal, options: options, meId: p.meId, isHost: isHost, nick: nick, send: _send),
          if (_error != null) ErrorText(_error!, center: true),
          // `.sg-mobile-only.rf-after`
          Padding(
            padding: const EdgeInsets.only(top: 10),
            child: _Players(view: view, members: members, meId: p.meId),
          ),
          // `.rf-howto`
          const Padding(padding: EdgeInsets.only(top: 18), child: HowToSection()),
        ]),
      ),
    );
  }
}

/// `.rf-timer` (ya da süresizse "Süresiz").
class _Timer extends StatelessWidget {
  const _Timer({required this.view});
  final RedFlagView view;

  @override
  Widget build(BuildContext context) {
    if (view.endsAt == 0) {
      return Text(SPlay.untimed, style: T.b(13, color: C.text3, weight: FontWeight.w800));
    }
    final numStyle = T.b(14, color: C.yellow, weight: FontWeight.w800);
    final minNum = chWidth(context, numStyle, 4);
    return Remaining(
      serverNow: view.serverNow,
      endsAt: view.endsAt,
      builder: (context, left) {
        final low = left < 5000;
        final color = low ? C.red : C.yellow;
        return Row(
          children: [
            Expanded(
              child: Container(
                height: 10,
                clipBehavior: Clip.antiAlias,
                alignment: Alignment.centerLeft,
                decoration: BoxDecoration(color: C.ink2, borderRadius: BorderRadius.circular(R.pill)),
                child: AnimatedFractionallySizedBox(
                  duration: MediaQuery.disableAnimationsOf(context) ? Duration.zero : const Duration(milliseconds: 200),
                  widthFactor: view.durationMs > 0 ? (left / view.durationMs).clamp(0.0, 1.0) : 0,
                  heightFactor: 1,
                  child: ColoredBox(color: color),
                ),
              ),
            ),
            const SizedBox(width: 10),
            ConstrainedBox(
              constraints: BoxConstraints(minWidth: minNum),
              child: Text(
                SPlay.secs((left / 1000).ceil()),
                style: numStyle.copyWith(color: color),
                textAlign: TextAlign.right,
              ),
            ),
          ],
        );
      },
    );
  }
}

/// `.rf-card`: beyaz durum kartı (−1.5°), girişte 320ms kayar; açıklamada altında dağılım çubuğu.
class _Card extends StatelessWidget {
  const _Card({super.key, required this.view, required this.item, required this.options});
  final RedFlagView view;
  final Situation item;
  final List<String> options;

  @override
  Widget build(BuildContext context) {
    final reveal = view.phase == 'reveal' ? view.reveal : null;
    return EnterAnim(
      animKey: item.id,
      dy: 10,
      rotate: 2.5,
      duration: const Duration(milliseconds: 320),
      child: Transform.rotate(
        angle: deg(-1.5),
        child: Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: C.paper,
            border: Border.all(color: C.ink, width: bw),
            borderRadius: BorderRadius.circular(26),
            boxShadow: hardShadow(7, 7),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: gapped(10, [
              Align(
                alignment: Alignment.centerLeft,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 3),
                  decoration: BoxDecoration(
                    color: C.pink,
                    border: Border.all(color: C.ink, width: 2),
                    borderRadius: BorderRadius.circular(R.pill),
                  ),
                  child: Text(
                    view.categoryName,
                    style: T.b(13, color: C.ink2, weight: FontWeight.w800),
                  ),
                ),
              ),
              Text(item.text, style: T.d(28, color: C.ink2, height: 1.1)),
              if (reveal != null) VoteBar(counts: reveal.counts, total: reveal.total, options: options),
            ]),
          ),
        ),
      ),
    );
  }
}

/// `.rf-vote`: bayraklar, tahmin, ilerleme ve oda sahibi düğmeleri. En az `100dvh - 420px` boy.
class _VotePanel extends StatelessWidget {
  const _VotePanel({required this.view, required this.item, required this.options, required this.send, required this.isHost, required this.meId});
  final RedFlagView view;
  final Situation item;
  final List<String> options;
  final _Send send;
  final bool isHost;
  final String meId;

  @override
  Widget build(BuildContext context) {
    final labels = labelsFor(item);
    final canVote = view.voters.contains(meId);
    final picked = view.myVote != null;
    return ConstrainedBox(
      constraints: BoxConstraints(minHeight: viewportHeight(context) - 420),
      child: IntrinsicHeight(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: gapped(10, [
            Text(SPlay.pick, style: T.d(22, color: C.text, height: 1.05)),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: gappedRow(10, [
                for (var i = 0; i < options.length; i++)
                  Expanded(
                    child: _Flag(
                      vote: options[i],
                      label: labels[options[i]]!,
                      tilt: _tilt[i],
                      pressed: view.myVote == options[i],
                      dimmed: picked && view.myVote != options[i],
                      onTap: canVote ? () => send({'type': 'vote', 'itemId': item.id, 'vote': options[i]}) : null,
                    ),
                  ),
              ]),
            ),
            Text(picked ? SPlay.picked : SPlay.pickHint, style: _note, textAlign: TextAlign.center),
            if (view.predict)
              Opacity(
                opacity: picked ? 1 : 0.5,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: C.panel2,
                    border: Border.all(color: C.ink, width: 2),
                    borderRadius: BorderRadius.circular(R.md),
                  ),
                  child: VStack(
                    gap: 8,
                    children: [
                      Text.rich(
                        TextSpan(
                          text: '${SPlay.guessTitle} ',
                          children: [
                            TextSpan(
                              text: picked ? SPlay.guessHint : SPlay.guessFirst,
                              style: T.b(12, color: C.text3, weight: FontWeight.w700),
                            ),
                          ],
                        ),
                        style: T.b(14, color: C.text, weight: FontWeight.w800),
                      ),
                      Row(
                        children: gappedRow(6, [
                          for (final v in options)
                            Expanded(
                              child: _GuessOpt(
                                label: item.category == limitCategory ? S.limitVote[v]! : S.voteShort[v]!,
                                selected: view.myGuess == v,
                                onTap: picked ? () => send({'type': 'guess', 'itemId': item.id, 'vote': v}) : null,
                              ),
                            ),
                        ]),
                      ),
                    ],
                  ),
                ),
              ),
            const Spacer(),
            Text(
              SPlay.waiting(view.done.length, view.voters.length),
              style: T.b(13, color: C.text, weight: FontWeight.w800),
              textAlign: TextAlign.center,
            ),
            if (isHost) ...[
              _big(SPlay.revealNow, () => send({'type': 'reveal', 'itemId': item.id})),
              Center(
                child: SGhostButton(label: SPlay.skip, onPressed: () => send({'type': 'skip', 'itemId': item.id})),
              ),
            ],
          ]),
        ),
      ),
    );
  }
}

/// `.rf-flag`: eğik, renkli bayrak kartı. Seçiliyken 4px iner, beyaz halka; diğerleri %50.
class _Flag extends StatelessWidget {
  const _Flag({required this.vote, required this.label, required this.tilt, required this.pressed, required this.dimmed, required this.onTap});
  final String vote;
  final String label;
  final double tilt;
  final bool pressed;
  final bool dimmed;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final reduce = MediaQuery.disableAnimationsOf(context);
    return AnimatedOpacity(
      duration: reduce ? Duration.zero : const Duration(milliseconds: 120),
      opacity: dimmed ? 0.5 : 1,
      child: Pressable(
        onTap: onTap,
        label: label,
        selected: pressed,
        builder: (context, _) => Transform.rotate(
          angle: deg(tilt),
          child: TweenAnimationBuilder<double>(
            tween: Tween(end: pressed ? 1 : 0),
            duration: reduce ? Duration.zero : const Duration(milliseconds: 100),
            curve: Curves.ease,
            builder: (context, t, _) => Transform.translate(
              offset: Offset(0, 4 * t),
              child: FocusRing(
                focused: pressed,
                radius: 22,
                color: C.paper,
                width: 4,
                child: Container(
                  constraints: const BoxConstraints(minHeight: 128),
                  padding: const EdgeInsets.all(6),
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: voteColor(vote),
                    border: Border.all(color: C.ink, width: bw),
                    borderRadius: BorderRadius.circular(22),
                    boxShadow: hardShadow(0, 6 - 4 * t),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      VoteIcon(vote: vote, size: 40, color: C.ink2),
                      const SizedBox(height: 8),
                      Text(
                        label,
                        style: T.d(17, color: C.ink2),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// `.rf-guess-opt`: tahmin seçeneği (40px, r12; seçiliyken sarı).
class _GuessOpt extends StatelessWidget {
  const _GuessOpt({required this.label, required this.selected, required this.onTap});
  final String label;
  final bool selected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => Pressable(
    onTap: onTap,
    label: label,
    selected: selected,
    builder: (context, _) => Container(
      constraints: const BoxConstraints(minHeight: 40),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: selected ? C.yellow : C.panel,
        border: Border.all(color: C.ink, width: 2),
        borderRadius: BorderRadius.circular(R.sm),
      ),
      child: Text(
        label,
        style: T.b(14, color: selected ? C.ink2 : C.text, weight: FontWeight.w800),
        textAlign: TextAlign.center,
      ),
    ),
  );
}

/// `.rf-reveal`: karar, seçenek satırları, tahmin sonucu, tartışma ve hazırım. En az `100dvh - 420px` boy.
class _Reveal extends StatelessWidget {
  const _Reveal({
    required this.view,
    required this.reveal,
    required this.options,
    required this.meId,
    required this.isHost,
    required this.nick,
    required this.send,
  });
  final RedFlagView view;
  final RevealInfo reveal;
  final List<String> options;
  final String meId;
  final bool isHost;
  final String Function(String id) nick;
  final _Send send;

  @override
  Widget build(BuildContext context) {
    final r = reveal;
    final label = labelsFor(view.item);
    final iAmReady = view.ready.contains(meId);
    final unanimous = r.total > 1 && options.any((v) => r.counts[v] == r.total);
    final verdict = r.total == 0
        ? SPlay.nobody
        : unanimous
        ? SPlay.unanimous
        : r.majority.length > 1
        ? SPlay.tie
        : SPlay.majority(label[r.majority.first] ?? r.majority.first);
    final hit = r.myGuess != null && r.correct.contains(meId);
    final you = [
      if (r.myVote != null) SPlay.yourVote(label[r.myVote] ?? r.myVote!),
      if (view.predict) r.myGuess == null ? SPlay.noGuess : (hit ? SPlay.guessHit : SPlay.guessMiss(label[r.myGuess] ?? r.myGuess!)),
    ].join(' · ');
    final verdictColor = r.majority.length == 1 ? voteColor(r.majority.first) : C.text;

    return ConstrainedBox(
      constraints: BoxConstraints(minHeight: viewportHeight(context) - 420),
      child: IntrinsicHeight(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: gapped(10, [
            Semantics(
              liveRegion: true,
              child: Text(verdict, style: T.d(28, color: verdictColor)),
            ),
            VStack(
              gap: 10,
              children: [
                for (final v in options)
                  _OptionRow(
                    vote: v,
                    label: label[v] ?? v,
                    count: r.counts[v],
                    percent: pct(r.counts[v], r.total),
                    top: r.majority.length == 1 && r.majority.first == v,
                    names: [
                      for (final x in r.votes ?? const <VoteEntry>[])
                        if (x.vote == v) nick(x.playerId),
                    ],
                  ),
              ],
            ),
            if (you.isNotEmpty)
              Text(
                you,
                style: T.b(15, color: C.yellow, weight: FontWeight.w800),
              ),
            if (r.votes == null) Text(SPlay.anonNote, style: _note, textAlign: TextAlign.center),
            const Spacer(),
            if (view.discussEndsAt > 0)
              Remaining(
                serverNow: view.serverNow,
                endsAt: view.discussEndsAt,
                builder: (context, left) => Center(
                  child: Transform.rotate(
                    angle: deg(-2),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                        color: C.pink,
                        border: Border.all(color: C.ink, width: 2),
                        borderRadius: BorderRadius.circular(R.pill),
                      ),
                      child: Text(SPlay.nextIn((left / 1000).ceil()), style: T.d(16, color: C.ink2, height: 1.45)),
                    ),
                  ),
                ),
              ),
            Text(
              view.discussEndsAt > 0 ? SPlay.readyCountTimed(view.ready.length, view.voters.length) : SPlay.readyCount(view.ready.length, view.voters.length),
              style: _noteDim,
              textAlign: TextAlign.center,
            ),
            if (isHost)
              Remaining(
                serverNow: view.serverNow,
                endsAt: view.nextAt,
                builder: (context, lock) => _big(
                  lock > 0 ? '${SPlay.discussing} ${(lock / 1000).ceil()}' : SPlay.next,
                  lock > 0 ? null : () => send({'type': 'next', 'round': view.round}),
                ),
              )
            else
              _big(
                iAmReady ? SPlay.readyDone : SPlay.ready,
                iAmReady ? null : () => send({'type': 'ready', 'round': view.round}),
                background: iAmReady ? C.mint : null,
                disabledOpacity: iAmReady ? 1 : 0.6,
              ),
          ]),
        ),
      ),
    );
  }
}

/// `.rf-row`: seçenek satırı; çoğunluk kendi renginde. Açık modda oy verenler altında.
class _OptionRow extends StatelessWidget {
  const _OptionRow({required this.vote, required this.label, required this.count, required this.percent, required this.top, required this.names});
  final String vote;
  final String label;
  final int count;
  final int percent;
  final bool top;
  final List<String> names;

  @override
  Widget build(BuildContext context) {
    final fg = top ? C.ink2 : C.text;
    final style = T.b(16, color: fg, weight: FontWeight.w800);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: top ? voteColor(vote) : C.panel,
        border: Border.all(color: C.ink, width: 2),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                width: 14,
                height: 14,
                decoration: BoxDecoration(color: top ? C.ink2 : voteColor(vote), borderRadius: BorderRadius.circular(4)),
              ),
              const SizedBox(width: 10),
              Expanded(child: Text(label, style: style)),
              const SizedBox(width: 10),
              Trailing(
                child: Text('$count · %$percent', style: style, textAlign: TextAlign.right),
              ),
            ],
          ),
          if (names.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(left: 24, top: 4),
              child: Opacity(
                opacity: 0.85,
                child: Text(
                  names.join(', '),
                  style: T.b(13, color: fg, weight: FontWeight.w700),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// `.rf-box`: oyuncular (tahmin modunda puana göre).
class _Players extends StatelessWidget {
  const _Players({required this.view, required this.members, required this.meId});
  final RedFlagView view;
  final Map<String, RoomPlayer> members;
  final String meId;

  @override
  Widget build(BuildContext context) {
    final ids = {...view.voters, ...view.scores.keys}.where(members.containsKey).toList();
    final ranked = view.predict ? stableSorted(ids, (a, b) => (view.scores[b] ?? 0) - (view.scores[a] ?? 0)) : ids;
    final ptsStyle = T.b(14, color: C.text, weight: FontWeight.w800);
    final ptsMin = chWidth(context, ptsStyle, 2);
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: C.panel2,
        border: Border.all(color: C.ink, width: 2),
        borderRadius: BorderRadius.circular(18),
      ),
      child: VStack(
        gap: 8,
        children: [
          BoxTitle(view.predict ? SPlay.scores : SPlay.voters),
          VStack(
            gap: 6,
            children: [
              for (final id in ranked)
                Builder(
                  builder: (context) {
                    final m = members[id]!;
                    final done = view.done.contains(id);
                    final ready = view.ready.contains(id);
                    final tag = !m.connected
                        ? SPlay.offline
                        : view.phase == 'vote'
                        ? (done ? SPlay.votedTag : SPlay.thinkingTag)
                        : ready
                        ? SPlay.readyTag
                        : null;
                    final dataDone = view.phase == 'vote' ? done : ready;
                    return Opacity(
                      opacity: m.connected ? 1 : 0.6,
                      child: Row(
                        children: [
                          SAvatar(avatar: m.avatar, nick: m.nick, size: 26),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              id == meId ? '${m.nick} (sen)' : m.nick,
                              style: T.b(14, color: id == meId ? C.yellow : C.text, weight: FontWeight.w800),
                              maxLines: 1,
                              softWrap: false,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (tag != null) ...[
                            const SizedBox(width: 8),
                            Text(
                              tag,
                              style: T.b(11, color: dataDone ? C.mint : C.text3, weight: FontWeight.w800),
                              maxLines: 1,
                              softWrap: false,
                            ),
                          ],
                          if (view.predict) ...[
                            SizedBox(width: tag != null ? 8 + 6 : 8),
                            ConstrainedBox(
                              constraints: BoxConstraints(minWidth: ptsMin),
                              child: Text('${view.scores[id] ?? 0}', style: ptsStyle, textAlign: TextAlign.right),
                            ),
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
