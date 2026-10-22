import 'package:flutter/material.dart';

import '../../shared/models.dart';
import '../../shared/text.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/kit.dart';
import 'common.dart';
import 'models.dart';
import 'strings.dart';

/// Sunucunun podyum süresi (server/game.ts DEFAULT_TIMING.podiumMs); yalnızca çubuk animasyonu için.
const _podiumMs = 25000;

/// `.rf-roster`: koyu mor kutu (başlık + içerik, aralık 10).
class _Roster extends StatelessWidget {
  const _Roster({required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: C.panel,
      border: Border.all(color: C.ink, width: bw),
      borderRadius: BorderRadius.circular(18),
    ),
    child: VStack(gap: 10, children: children),
  );
}

String _legend(Counts c) => '${c.green} green · ${c.red} red${c.never > 0 ? ' · ${c.never} asla' : ''}';

/// Oyun sonu (`.rf-podium`, Sonuclar.dc.html): tolerans, ödüller, profiller, en çok bölen durumlar.
class RedFlagPodium extends StatelessWidget {
  const RedFlagPodium({super.key, required this.view, required this.members, required this.meId, required this.code});
  final RedFlagView view;
  final Map<String, RoomPlayer> members;
  final String meId;
  final String code;

  @override
  Widget build(BuildContext context) {
    final sum = view.summary ?? const Summary(rounds: 0, profiles: [], divisive: [], totals: Counts());
    String nick(String id) => (members[id]?.nick ?? '?') + (id == meId ? ' (sen)' : '');
    PlayerProfile? profile(String? id) {
      for (final p in sum.profiles) {
        if (p.playerId == id) return p;
      }
      return null;
    }

    final named = sum.profiles.length > 1 || (sum.profiles.length == 1 && sum.profiles.first.playerId != meId);
    final scores = stableSorted(view.scores.entries.where((e) => members.containsKey(e.key)), (a, b) => b.value - a.value);
    final showScores = view.predict && scores.any((e) => e.value > 0);
    final totalVotes = sum.totals.green + sum.totals.red + sum.totals.never;
    final awards = <({String label, String id, String note, String vote})>[
      if (sum.mostGreen != null) (label: SPodium.mostGreen, id: sum.mostGreen!, note: SPodium.tolerance(profile(sum.mostGreen)?.tolerance ?? 0), vote: 'green'),
      if (sum.strictest != null) (label: SPodium.strictest, id: sum.strictest!, note: SPodium.tolerance(profile(sum.strictest)?.tolerance ?? 0), vote: 'red'),
      if (sum.rebel != null) (label: SPodium.rebel, id: sum.rebel!, note: SPodium.rebelNote(profile(sum.rebel)?.minority ?? 0), vote: 'never'),
    ];
    final first = scores.isNotEmpty ? scores[0] : null;
    final second = scores.length > 1 ? scores[1] : null;
    final width = MediaQuery.sizeOf(context).width;
    final maxWidth = 440 + 2 * Layout.gutter(context);
    final vh = viewportHeight(context);
    final meta = T.b(13, color: C.text3, weight: FontWeight.w800);
    final dimNote = T.b(13, color: C.text3, weight: FontWeight.w700);

    return ConstrainedBox(
      constraints: BoxConstraints(minHeight: vh),
      child: Stack(
        children: [
          Positioned.fill(
            child: Align(
              alignment: Alignment.topCenter,
              child: ConstrainedBox(
                constraints: BoxConstraints(maxWidth: maxWidth),
                child: const Confetti(top: 102),
              ),
            ),
          ),
          GameColumn(
            maxWidth: maxWidth,
            bottom: 24,
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: vh - 72 - 24),
              child: IntrinsicHeight(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: gapped(18, [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Flexible(child: Text(S.name, style: meta)),
                        const SizedBox(width: 8),
                        Text(code, style: meta.copyWith(letterSpacing: 2)),
                      ],
                    ),
                    Padding(
                      padding: const EdgeInsets.only(top: 18),
                      child: Column(
                        children: [
                          const EndSticker(SPodium.gameOver),
                          const SizedBox(height: 6 + 8),
                          // clamp(36px, 12vw, 48px)
                          Text(
                            SPodium.title,
                            style: T.d((width * 0.12).clamp(36.0, 48.0), color: C.text, height: 0.95),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 6),
                          Text(
                            SPodium.sub(sum.rounds),
                            style: T.b(14, color: C.text3, weight: FontWeight.w700),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),
                    if (showScores && first != null)
                      Semantics(
                        label: SPodium.scores,
                        container: true,
                        child: EndCards(
                          first: EndCard(number: '${first.value}', name: nick(first.key), maxWidth: 200),
                          second: second == null ? null : EndCard(number: '${second.value}', name: nick(second.key), first: false, maxWidth: 200),
                        ),
                      ),
                    if (totalVotes > 0)
                      VStack(
                        gap: 8,
                        children: [
                          const BoxTitle(SPodium.totals),
                          VoteBar(counts: sum.totals, total: totalVotes, options: sum.totals.never > 0 ? votes : votes.sublist(0, 2)),
                          Text(
                            _legend(sum.totals),
                            style: T.b(13, color: C.text2, weight: FontWeight.w800),
                          ),
                        ],
                      ),
                    if (awards.isNotEmpty)
                      Grid2(
                        equalHeight: true,
                        children: [
                          for (final a in awards)
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: C.panel,
                                border: Border.all(color: C.ink, width: bw),
                                borderRadius: BorderRadius.circular(18),
                              ),
                              child: VStack(
                                gap: 8,
                                children: [
                                  Text(
                                    trUpper(a.label),
                                    style: T.b(13, color: voteColor(a.vote), weight: FontWeight.w800),
                                  ),
                                  Row(
                                    children: [
                                      if (members[a.id] case final m?) ...[SAvatar(avatar: m.avatar, nick: m.nick, size: 28), const SizedBox(width: 8)],
                                      Expanded(
                                        child: Text(
                                          nick(a.id),
                                          style: T.b(15, color: C.text, weight: FontWeight.w800),
                                        ),
                                      ),
                                    ],
                                  ),
                                  Text(
                                    a.note,
                                    style: T.b(13, color: C.text2, weight: FontWeight.w700),
                                  ),
                                ],
                              ),
                            ),
                        ],
                      ),
                    if (sum.profiles.isNotEmpty)
                      _Roster(
                        children: [
                          BoxTitle(named ? SPodium.profiles : SPodium.mine),
                          VStack(
                            gap: 10,
                            children: [
                              for (final p in sum.profiles)
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.stretch,
                                  children: [
                                    Row(
                                      children: [
                                        if (members[p.playerId] case final m?) ...[SAvatar(avatar: m.avatar, nick: m.nick, size: 28), const SizedBox(width: 8)],
                                        Expanded(
                                          child: Text(
                                            nick(p.playerId),
                                            style: T.b(15, color: p.playerId == meId ? C.yellow : C.text, weight: FontWeight.w800),
                                            maxLines: 1,
                                            softWrap: false,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Text(
                                          '%${p.tolerance}',
                                          style: T.b(15, color: C.yellow, weight: FontWeight.w800),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 8),
                                    ProfileBar(green: p.green, red: p.red, never: p.never),
                                  ],
                                ),
                            ],
                          ),
                          if (!named) Text(SPodium.anonNote, style: dimNote, textAlign: TextAlign.center),
                        ],
                      ),
                    _Roster(
                      children: [
                        const BoxTitle(SPodium.divisive),
                        if (sum.divisive.isEmpty)
                          Text(SPodium.noDivisive, style: dimNote, textAlign: TextAlign.center)
                        else
                          VStack(
                            gap: 10,
                            children: [
                              for (final d in sum.divisive)
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                  decoration: BoxDecoration(
                                    color: C.paper,
                                    border: Border.all(color: C.ink, width: 2),
                                    borderRadius: BorderRadius.circular(14),
                                  ),
                                  child: VStack(
                                    gap: 6,
                                    children: [
                                      Text(d.text, style: T.d(17, color: C.ink2, height: 1.15)),
                                      ProfileBar(green: d.counts.green, red: d.counts.red, never: d.counts.never),
                                      Text(
                                        _legend(d.counts),
                                        style: T.b(12, color: C.inkSoft, weight: FontWeight.w800),
                                      ),
                                    ],
                                  ),
                                ),
                            ],
                          ),
                      ],
                    ),
                    if (showScores && scores.length > 2)
                      _Roster(
                        children: [
                          for (var i = 2; i < scores.length; i++)
                            Row(
                              children: [
                                Text(
                                  '${i + 1}.',
                                  style: T.b(15, color: C.text3, weight: FontWeight.w800),
                                ),
                                const SizedBox(width: 8),
                                SAvatar(avatar: members[scores[i].key]!.avatar, nick: members[scores[i].key]!.nick, size: 28),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    nick(scores[i].key),
                                    style: T.b(15, color: C.text, weight: FontWeight.w800),
                                    maxLines: 1,
                                    softWrap: false,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  '${scores[i].value}',
                                  style: T.b(15, color: C.yellow, weight: FontWeight.w800),
                                ),
                              ],
                            ),
                        ],
                      ),
                    const Spacer(),
                    Column(
                      children: [
                        // `.rf-podium-bar { width: 100% }`
                        const SizedBox(
                          width: double.infinity,
                          child: EndBar(durationMs: _podiumMs),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          SPodium.back,
                          style: T.b(14, color: C.text2, weight: FontWeight.w800),
                        ),
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
