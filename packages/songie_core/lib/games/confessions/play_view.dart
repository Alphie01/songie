import 'package:flutter/material.dart';

import '../../shared/models.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/game_module.dart';
import '../kit/kit.dart';
import 'common.dart';
import 'confession.dart';
import 'models.dart';
import 'podium.dart';
import 'strings.dart';
import 'summary.dart';
import 'write.dart';

/// games/confessions/client/PlayView.tsx
///
/// Telefonda `.sg-side` sütunları (sol puan listesi, sağdaki oyun içi ayarlar) gizlidir; puanlar ortadaki
/// `.sg-mobile-only` kopyasıyla görünür. Oyun içi ayar paneli web'de de telefonda görünmez.
class ConfessionsPlayView extends StatefulWidget {
  const ConfessionsPlayView({super.key, required this.props});
  final PlayViewProps props;

  @override
  State<ConfessionsPlayView> createState() => _ConfessionsPlayViewState();
}

class _ConfessionsPlayViewState extends State<ConfessionsPlayView> {
  String? _error;

  Future<bool> _send(Json action) async {
    setState(() => _error = null);
    final res = await widget.props.act(action);
    if (!res.ok && mounted) setState(() => _error = res.error);
    return res.ok;
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.props;
    final view = ConfessionsView.fromJson(p.view);
    final members = membersOf(p.room);
    String nick(String id) => members[id]?.nick ?? '?';
    final isHost = p.room.hostId == p.meId;

    if (view.phase == 'podium') return ConfessionsPodium(view: view, members: members, meId: p.meId, code: p.room.code);

    final head = view.phase == 'write'
        ? '${SPlay.round(view.round, view.totalRounds)} · ${SPlay.writePhase}'
        : view.phase == 'summary'
        ? SPlay.round(view.round, view.totalRounds)
        : SPlay.confessionOf(view.index, view.count);
    final current = view.current;
    final g = Layout.gutter(context);

    return GameColumn(
      maxWidth: 440 + 2 * g,
      bottom: 24,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: gapped(12, [
          // `.cf-head`
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
                  child: Text(head, style: T.d(16, color: C.ink2, height: 1.2), maxLines: 1, softWrap: false),
                ),
              ),
              const SizedBox(width: 12),
              Text(
                p.room.code,
                style: T.b(13, color: C.text3, weight: FontWeight.w800, letterSpacing: 2),
              ),
            ],
          ),
          if (view.phase != 'summary') _Timer(view: view),
          if (view.phase == 'write') CfWrite(view: view, meId: p.meId, isHost: isHost, members: members, send: _send),
          if ((view.phase == 'guess' || view.phase == 'reveal') && current != null)
            CfConfession(view: view, current: current, meId: p.meId, isHost: isHost, members: members, send: _send),
          if (view.phase == 'summary') CfSummary(view: view, isHost: isHost, nick: nick, send: _send),
          if (_error != null) ErrorText(_error!, center: true),
          // `.sg-mobile-only.cf-after`
          Padding(
            padding: const EdgeInsets.only(top: 10),
            child: _Scores(view: view, members: members, meId: p.meId),
          ),
          // `.cf-howto`
          const Padding(padding: EdgeInsets.only(top: 18), child: HowToSection()),
        ]),
      ),
    );
  }
}

/// `.cf-timer`: açıklamada sessiz (mor, saniyesiz); son 10 sn kırmızı. Süresizse "Süresiz".
class _Timer extends StatelessWidget {
  const _Timer({required this.view});
  final ConfessionsView view;

  @override
  Widget build(BuildContext context) {
    if (view.endsAt == 0) {
      return Text(SPlay.untimed, style: T.b(13, color: C.text3, weight: FontWeight.w800));
    }
    final quiet = view.phase == 'reveal';
    final numStyle = T.b(14, color: C.yellow, weight: FontWeight.w800);
    final minNum = chWidth(context, numStyle, 4);
    return Remaining(
      serverNow: view.serverNow,
      endsAt: view.endsAt,
      tick: const Duration(milliseconds: 250),
      builder: (context, remaining) {
        final low = !quiet && remaining < 10000;
        final fill = low ? C.red : (quiet ? C.violet : C.yellow);
        return Row(
          children: [
            Expanded(
              child: Container(
                height: 10,
                clipBehavior: Clip.antiAlias,
                alignment: Alignment.centerLeft,
                decoration: BoxDecoration(color: C.ink2, borderRadius: BorderRadius.circular(R.pill)),
                child: AnimatedFractionallySizedBox(
                  duration: MediaQuery.disableAnimationsOf(context) ? Duration.zero : const Duration(milliseconds: 250),
                  widthFactor: (remaining / (view.durationMs < 1 ? 1 : view.durationMs)).clamp(0.0, 1.0),
                  heightFactor: 1,
                  child: ColoredBox(color: fill),
                ),
              ),
            ),
            if (!quiet) ...[
              const SizedBox(width: 10),
              ConstrainedBox(
                constraints: BoxConstraints(minWidth: minNum),
                child: Text(
                  SPlay.secs((remaining / 1000).ceil()),
                  style: numStyle.copyWith(color: low ? C.red : C.yellow),
                  textAlign: TextAlign.right,
                ),
              ),
            ],
          ],
        );
      },
    );
  }
}

/// `.cf-box.cf-scores`: puanlar (gizli yazar modunda ayrıntısız).
class _Scores extends StatelessWidget {
  const _Scores({required this.view, required this.members, required this.meId});
  final ConfessionsView view;
  final Map<String, RoomPlayer> members;
  final String meId;

  @override
  Widget build(BuildContext context) {
    final rows = rankedStats(view, members);
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: C.panel2,
        border: Border.all(color: C.ink, width: 2),
        borderRadius: BorderRadius.circular(18),
      ),
      child: VStack(
        gap: 6,
        children: [
          const BoxTitle(SPlay.scores),
          VStack(
            gap: 6,
            children: [
              for (var i = 0; i < rows.length; i++)
                Builder(
                  builder: (context) {
                    final id = rows[i].key;
                    final st = rows[i].value;
                    final color = id == meId ? C.yellow : C.text;
                    final style = T.b(14, color: color, weight: FontWeight.w800);
                    return Row(
                      crossAxisAlignment: CrossAxisAlignment.baseline,
                      textBaseline: TextBaseline.alphabetic,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('${i + 1}. ${id == meId ? SPlay.youCapital : (members[id]?.nick ?? '?')}', style: style),
                              if (!view.hiddenAuthor)
                                Text(
                                  SPlay.detail(st.correct, st.fooled),
                                  style: T.b(11, color: C.text3, weight: FontWeight.w700),
                                ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 10),
                        Text('${st.score}', style: style),
                      ],
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
