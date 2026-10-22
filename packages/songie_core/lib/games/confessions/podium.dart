import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../shared/models.dart';
import '../../shared/text.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/kit.dart';
import 'common.dart';
import 'models.dart';
import 'strings.dart';

/// Puanlar: oyuncu sırasıyla, odada olan ya da puanı olanlar, puana göre (kararlı).
List<MapEntry<String, PlayerStat>> rankedStats(ConfessionsView view, Map<String, RoomPlayer> members) =>
    stableSorted(view.stats.entries.where((e) => members.containsKey(e.key) || e.value.score > 0), (a, b) => b.value.score - a.value.score);

/// Oyun sonu (`.cf-podium`, Sonuclar.dc.html).
class ConfessionsPodium extends StatefulWidget {
  const ConfessionsPodium({super.key, required this.view, required this.members, required this.meId, required this.code});
  final ConfessionsView view;
  final Map<String, RoomPlayer> members;
  final String meId;
  final String code;

  @override
  State<ConfessionsPodium> createState() => _ConfessionsPodiumState();
}

class _ConfessionsPodiumState extends State<ConfessionsPodium> {
  /// Çubuk podyum süresince dolar (sunucu endsAt gönderiyor); ilk görünümde sabitlenir.
  late final int _barMs = () {
    final v = widget.view;
    final remaining = v.endsAt > 0 ? math.max(0, v.endsAt - v.serverNow) : 0;
    return math.max(1000, remaining > 0 ? remaining : 10000);
  }();

  @override
  Widget build(BuildContext context) {
    final view = widget.view;
    final members = widget.members;
    final meId = widget.meId;
    final rows = rankedStats(view, members);
    final p = view.podium ?? const PodiumInfo(confessions: 0);
    String nick(String id) => members[id]?.nick ?? '?';
    String named(String id) => id == meId ? '${nick(id)}${SPlay.meSuffix}' : nick(id);
    final anyPoints = rows.any((e) => e.value.score > 0);
    final winner = anyPoints && rows.isNotEmpty && (rows.length < 2 || rows[1].value.score < rows[0].value.score) ? rows[0].key : null;
    final first = rows.isNotEmpty ? rows[0] : null;
    final second = rows.length > 1 ? rows[1] : null;
    final width = MediaQuery.sizeOf(context).width;
    final maxWidth = 440 + 2 * Layout.gutter(context);
    final vh = viewportHeight(context);
    final meta = T.b(13, color: C.text3, weight: FontWeight.w800);

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
                        Text(widget.code, style: meta.copyWith(letterSpacing: 2)),
                      ],
                    ),
                    Padding(
                      padding: const EdgeInsets.only(top: 18),
                      child: Column(
                        children: [
                          const EndSticker(SPodium.title),
                          const SizedBox(height: 6 + 8),
                          // clamp(36px, 12vw, 48px)
                          Text(
                            !anyPoints ? SPodium.anonymous : (winner != null ? SPodium.winner(nick(winner)) : SPodium.draw),
                            style: T.d((width * 0.12).clamp(36.0, 48.0), color: C.text, height: 0.95),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 6),
                          Text(
                            SPodium.confessions(p.confessions),
                            style: T.b(14, color: C.text3, weight: FontWeight.w700),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),
                    if (anyPoints && first != null)
                      EndCards(
                        first: EndCard(number: '${first.value.score}', name: named(first.key), maxWidth: 200),
                        second: second == null ? null : EndCard(number: '${second.value.score}', name: named(second.key), first: false, maxWidth: 200),
                      ),
                    if (anyPoints)
                      Grid2(
                        equalHeight: true,
                        children: [
                          _Award(
                            title: SPodium.detective,
                            tone: C.mint,
                            who: p.detective == null ? null : nick(p.detective!.playerId),
                            value: p.detective == null ? null : SPodium.detectiveValue(p.detective!.value),
                            member: p.detective == null ? null : members[p.detective!.playerId],
                          ),
                          _Award(
                            title: SPodium.trickster,
                            tone: C.lilac,
                            who: p.trickster == null ? null : nick(p.trickster!.playerId),
                            value: p.trickster == null ? null : SPodium.tricksterValue(p.trickster!.value),
                            member: p.trickster == null ? null : members[p.trickster!.playerId],
                          ),
                        ],
                      ),
                    if (rows.length > 2)
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
                            for (final e in rows.skip(2))
                              Row(
                                children: [
                                  if (members[e.key] case final m?) ...[SAvatar(avatar: m.avatar, nick: m.nick, size: 28), const SizedBox(width: 8)],
                                  Expanded(
                                    child: Text(
                                      named(e.key),
                                      style: T.b(15, color: C.text, weight: FontWeight.w800),
                                      maxLines: 1,
                                      softWrap: false,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    '${e.value.score}',
                                    style: T.b(15, color: C.yellow, weight: FontWeight.w800),
                                  ),
                                ],
                              ),
                          ],
                        ),
                      ),
                    const Spacer(),
                    Column(
                      children: [
                        // `.cf-podium-bar { width: 100% }`
                        SizedBox(
                          width: double.infinity,
                          child: EndBar(durationMs: _barMs),
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

/// `.cf-roster[data-tone]`: ödül kutusu (en iyi dedektif / yanıltıcı).
class _Award extends StatelessWidget {
  const _Award({required this.title, required this.tone, required this.who, required this.value, required this.member});
  final String title;
  final Color tone;
  final String? who;
  final String? value;
  final RoomPlayer? member;

  @override
  Widget build(BuildContext context) {
    final valueStyle = T.b(13, color: C.text2, weight: FontWeight.w700);
    return Container(
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
            trUpper(title),
            style: T.b(13, color: tone, weight: FontWeight.w800),
          ),
          if (who != null) ...[
            Row(
              children: [
                if (member != null) ...[SAvatar(avatar: member!.avatar, nick: member!.nick, size: 28), const SizedBox(width: 8)],
                Expanded(
                  child: Text(
                    who!,
                    style: T.b(15, color: C.text, weight: FontWeight.w800),
                  ),
                ),
              ],
            ),
            Text(value ?? '', style: valueStyle),
          ] else
            Text(SPodium.none, style: valueStyle),
        ],
      ),
    );
  }
}
