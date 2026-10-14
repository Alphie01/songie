import 'package:flutter/material.dart';

import '../../shared/text.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/kit.dart';
import 'common.dart';
import 'models.dart';
import 'strings.dart';

/// Sunucu oyun sonunu 10 sn gösterir (PODIUM_MS); `.ml-end-bar` bu sürede dolar.
const _podiumMs = 10000;

/// Oyun sonu (`.ml-end`, Sonuclar.dc.html dili).
class MostLikelyPodium extends StatelessWidget {
  const MostLikelyPodium({super.key, required this.view, required this.meId, required this.code});
  final MostLikelyView view;
  final String meId;
  final String code;

  @override
  Widget build(BuildContext context) {
    final rows = stableSorted(
      [
        for (final p in view.people)
          if (p.present) (p: p, titles: titlesOf(view, p.id), guess: view.guessScores[p.id] ?? 0),
      ],
      (a, b) {
        final t = b.titles.length - a.titles.length;
        return t != 0 ? t : b.guess - a.guess;
      },
    );
    final top = rows.isEmpty ? 0 : rows.first.titles.length;
    final kings = rows.where((r) => top > 0 && r.titles.length == top).toList();
    final first = rows.isNotEmpty ? rows[0] : null;
    final second = rows.length > 1 ? rows[1] : null;
    final showGuess = view.guessScores.isNotEmpty || view.predict;
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
                        Text(S.name, style: meta),
                        Text(code, style: meta.copyWith(letterSpacing: 2)),
                      ],
                    ),
                    Padding(
                      padding: const EdgeInsets.only(top: 18),
                      child: Column(
                        children: [
                          const EndSticker(SPodium.title),
                          const SizedBox(height: 6 + 8),
                          Text(
                            kings.isNotEmpty ? SPodium.winner(joinNames([for (final k in kings) k.p.nick])) : SPodium.nobody,
                            style: T.d(48, color: C.text, height: 0.95),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),
                    if (first != null && top > 0)
                      EndCards(
                        first: EndCard(number: '${first.titles.length}', name: first.p.nick),
                        second: second == null ? null : EndCard(number: '${second.titles.length}', name: second.p.nick, first: false),
                      ),
                    // `.ml-end-roster`
                    Semantics(
                      label: SPodium.titlesLabel,
                      container: true,
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: C.panel,
                          border: Border.all(color: C.ink, width: 3),
                          borderRadius: BorderRadius.circular(18),
                        ),
                        child: VStack(
                          gap: 8,
                          children: [
                            Text(
                              trUpper(SPodium.titlesLabel),
                              style: T.b(13, color: C.yellow, weight: FontWeight.w800, letterSpacing: 1),
                            ),
                            VStack(
                              gap: 10,
                              children: [
                                for (final r in rows)
                                  Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      SAvatar(avatar: r.p.avatar, nick: r.p.nick, size: 28),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Row(
                                              crossAxisAlignment: CrossAxisAlignment.baseline,
                                              textBaseline: TextBaseline.alphabetic,
                                              children: [
                                                Expanded(
                                                  child: Text(
                                                    r.p.nick,
                                                    style: T.b(15, color: r.p.id == meId ? C.yellow : C.text, weight: FontWeight.w800),
                                                  ),
                                                ),
                                                const SizedBox(width: 8),
                                                Trailing(
                                                  child: Text(
                                                    '${SPodium.titleCount(r.titles.length)}${showGuess ? ' · ${SPodium.guess(r.guess)}' : ''}',
                                                    style: T.b(12, color: C.yellow, weight: FontWeight.w800),
                                                    textAlign: TextAlign.right,
                                                  ),
                                                ),
                                              ],
                                            ),
                                            Text(
                                              r.titles.isEmpty ? SPodium.noTitles : r.titles.map(S.title).join(', '),
                                              style: T.b(13, color: C.text2, weight: FontWeight.w700),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    const Spacer(),
                    Column(
                      children: [
                        // `.ml-end-bar { width: 100% }`
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
