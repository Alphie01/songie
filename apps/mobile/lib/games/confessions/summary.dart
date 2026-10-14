import 'package:flutter/material.dart';

import '../../shared/models.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import 'common.dart';
import 'models.dart';
import 'strings.dart';

/// Tur özeti (`.cf-summary`): açılan itiraflar sarı notlarda, yazarları ve tepkileriyle.
class CfSummary extends StatelessWidget {
  const CfSummary({super.key, required this.view, required this.isHost, required this.nick, required this.send});
  final ConfessionsView view;
  final bool isHost;
  final String Function(String id) nick;
  final Future<bool> Function(Json action) send;

  @override
  Widget build(BuildContext context) {
    final last = view.totalRounds != null && view.round >= view.totalRounds!;
    final recap = view.recap ?? const <RecapItem>[];
    final noteLine = T.b(13, color: C.text3, weight: FontWeight.w700);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: gapped(12, [
        Semantics(
          header: true,
          child: Text(SPlay.summaryTitle(view.round), style: T.d(32, color: C.text, height: 1.05)),
        ),
        if (recap.isEmpty)
          Text(SPlay.summaryEmpty, style: noteLine)
        else
          // `.cf-recap`: margin 4px 0.
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: VStack(
              gap: 14,
              children: [
                for (var i = 0; i < recap.length; i++)
                  Transform.rotate(
                    angle: deg(i.isOdd ? 1 : -1),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      decoration: BoxDecoration(
                        color: noteColor,
                        border: Border.all(color: C.ink, width: bw),
                        borderRadius: BorderRadius.circular(6),
                        boxShadow: hardShadow(5, 5),
                      ),
                      child: VStack(
                        gap: 8,
                        children: [
                          Text(
                            '“${recap[i].text}”',
                            style: T.d(18, color: noteInk, weight: FontWeight.w700, height: 1.2),
                          ),
                          Wrap(
                            spacing: 10,
                            runSpacing: 4,
                            crossAxisAlignment: WrapCrossAlignment.center,
                            children: [
                              Text(
                                recap[i].authorId != null ? SPlay.by(nick(recap[i].authorId!)) : SPlay.anonymous,
                                style: T.b(13, color: noteInk, weight: FontWeight.w800),
                              ),
                              for (final r in reactions)
                                if ((recap[i].reactions[r] ?? 0) > 0)
                                  Text(
                                    '${SPlay.reactions[r]} ${recap[i].reactions[r]}',
                                    style: T.b(13, color: noteInk, weight: FontWeight.w700),
                                  ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),
        if (isHost)
          CfBig(label: last ? SPlay.finish : SPlay.nextRound, onTap: () => send({'type': 'next'}))
        else
          Text(last ? SPlay.summaryLast : SPlay.summaryNext, style: noteLine, textAlign: TextAlign.center),
      ]),
    );
  }
}
