import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import '../../shared/models.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/kit.dart';
import 'common.dart';
import 'models.dart';
import 'strings.dart';

/// İtiraf: tahmin + açıklama (`.cf-confession`).
class CfConfession extends StatelessWidget {
  const CfConfession({
    super.key,
    required this.view,
    required this.current,
    required this.meId,
    required this.isHost,
    required this.members,
    required this.send,
  });
  final ConfessionsView view;
  final CurrentConfession current;
  final String meId;
  final bool isHost;
  final Map<String, RoomPlayer> members;
  final Future<bool> Function(Json action) send;

  @override
  Widget build(BuildContext context) {
    final c = current;
    final reveal = view.phase == 'reveal' ? view.reveal : null;
    final online = members.values.where((p) => p.connected).length;
    String nick(String id) => members[id]?.nick ?? '?';
    String label(String id) => id == meId ? SPlay.me : nick(id);
    final ask = reveal != null
        ? (reveal.authorId != null ? SPlay.author(reveal.authorId == meId ? SPlay.youCapital : nick(reveal.authorId!)) : SPlay.revealHidden)
        : SPlay.whoWrote;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: gapped(12, [
        if (view.topic != null)
          Text(
            view.topic!.text,
            style: T.b(13, color: C.text3, weight: FontWeight.w700),
          ),
        _Paper(key: ValueKey('paper-${c.id}'), confession: c),
        if (!c.hidden) _Reactions(confession: c, send: send),
        if (!c.hidden) ...[
          if (reveal != null) _Unmask(key: const ValueKey('r'), child: _ask(ask)) else KeyedSubtree(key: const ValueKey('g'), child: _ask(ask)),
          if (reveal == null)
            Text(
              view.hiddenAuthor ? SPlay.whoWroteHidden : SPlay.whoWroteHint,
              style: T.b(13, color: C.text3, weight: FontWeight.w700),
            ),
          Grid2(
            columns: 3,
            rowGap: 8,
            columnGap: 8,
            children: [
              for (final id in c.candidates)
                _PickButton(
                  label: label(id),
                  votes: reveal == null ? null : (reveal.tally[id] ?? 0),
                  chosen: view.myPick == id,
                  author: reveal != null && reveal.authorId == id,
                  wrong: reveal != null && reveal.authorId != null && view.myPick == id && reveal.authorId != id,
                  off: !(members[id]?.connected ?? false),
                  onTap: reveal == null ? () => send({'type': 'guess', 'confessionId': c.id, 'targetId': id}) : null,
                ),
            ],
          ),
          _Foot(view: view, meId: meId, online: online, label: label, nick: nick),
        ],
        if (isHost)
          HostBox(
            buttons: [
              SGhostButton(
                label: view.phase == 'guess' ? SPlay.closeGuess : (view.index >= view.count ? SPlay.nextRound : SPlay.next),
                onPressed: () => send({'type': 'next'}),
              ),
              if (!c.hidden) SGhostButton(label: SPlay.hide, onPressed: () => send({'type': 'hide', 'confessionId': c.id})),
            ],
          ),
      ]),
    );
  }

  Widget _ask(String text) => Semantics(
    header: true,
    child: Text(text, style: T.d(22, color: C.text, height: 1.15)),
  );
}

/// `.cf-paper`: bantlı yapışkan not (−2°); girişte 320ms kayar. Gizlenince kesikli, mor.
class _Paper extends StatelessWidget {
  const _Paper({super.key, required this.confession});
  final CurrentConfession confession;

  @override
  Widget build(BuildContext context) {
    final hidden = confession.hidden;
    final body = Container(
      width: double.infinity,
      // Kesikli çerçeve boyandığı için (dekorasyonda çerçeve yok) 3px elle eklenir.
      padding: hidden ? const EdgeInsets.fromLTRB(18 + bw, 22 + bw, 18 + bw, 16 + bw) : const EdgeInsets.fromLTRB(18, 22, 18, 16),
      decoration: BoxDecoration(
        color: hidden ? C.panel : noteColor,
        border: hidden ? null : Border.all(color: C.ink, width: bw),
        borderRadius: BorderRadius.circular(6),
        boxShadow: hidden ? null : hardShadow(7, 7),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // `.cf-quote`: satır yüksekliği 0.5; satırı blockquote'un (Nunito 16 / 1.45) payı belirler.
          Text(
            '“',
            style: T.d(46, color: hidden ? C.text3 : quoteColor, height: 0.5),
            strutStyle: const StrutStyle(fontFamily: T.font, fontSize: 16, height: 1.45, leadingDistribution: TextLeadingDistribution.even),
          ),
          Text(
            confession.text ?? SPlay.hiddenText,
            style: T.d(hidden ? 17 : 23, color: hidden ? C.text3 : noteInk, weight: FontWeight.w700, height: 1.15),
          ),
        ],
      ),
    );
    return Padding(
      padding: const EdgeInsets.only(top: 6),
      child: EnterAnim(
        animKey: confession.id,
        dy: 10,
        rotate: 2,
        duration: const Duration(milliseconds: 320),
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            Transform.rotate(
              angle: deg(-2),
              child: hidden
                  ? CustomPaint(
                      foregroundPainter: DashedRRectPainter(color: C.ink, radius: 6, strokeWidth: bw, dash: 6, gap: 3),
                      child: body,
                    )
                  : body,
            ),
            // `.cf-tape`: yarı saydam beyaz bant (−4°).
            Positioned(
              top: -14,
              left: 0,
              right: 0,
              child: Center(
                child: Transform.rotate(
                  angle: deg(-4),
                  child: Opacity(
                    opacity: 0.55,
                    child: Container(
                      width: 80,
                      height: 24,
                      decoration: BoxDecoration(color: C.paper, borderRadius: BorderRadius.circular(3)),
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

/// `.cf-reactions`: isimsiz tepkiler.
class _Reactions extends StatelessWidget {
  const _Reactions({required this.confession, required this.send});
  final CurrentConfession confession;
  final Future<bool> Function(Json action) send;

  @override
  Widget build(BuildContext context) => Semantics(
    container: true,
    label: SPlay.reactionsLabel,
    child: Wrap(
      spacing: 6,
      runSpacing: 6,
      children: [
        for (final r in reactions)
          Builder(
            builder: (context) {
              final on = confession.myReactions.contains(r);
              final text = '${SPlay.reactions[r]} ${confession.reactions[r] ?? 0}';
              return Pressable(
                onTap: () => send({'type': 'react', 'confessionId': confession.id, 'reaction': r}),
                label: text,
                selected: on,
                builder: (context, _) => Container(
                  constraints: const BoxConstraints(minHeight: 38),
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(
                    color: on ? C.pink : C.panel,
                    border: Border.all(color: C.ink, width: 2),
                    borderRadius: BorderRadius.circular(R.pill),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Flexible(
                        child: Text(
                          text,
                          style: T.b(13, color: on ? C.ink2 : C.text, weight: FontWeight.w800),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
      ],
    ),
  );
}

/// `.cf-pick`: aday düğmesi. Seçili sarı, yanlış kırmızı, yazan nane; açıklamada oy sayısı.
class _PickButton extends StatelessWidget {
  const _PickButton({
    required this.label,
    required this.votes,
    required this.chosen,
    required this.author,
    required this.wrong,
    required this.off,
    required this.onTap,
  });
  final String label;
  final int? votes;
  final bool chosen;
  final bool author;
  final bool wrong;
  final bool off;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final bg = author
        ? C.mint
        : wrong
        ? C.red
        : chosen
        ? C.yellow
        : C.panel;
    final fg = author || wrong || chosen ? C.ink2 : C.text;
    return Opacity(
      opacity: off ? 0.6 : 1,
      child: Pressable(
        onTap: onTap,
        label: label,
        selected: chosen,
        builder: (context, pressed) => AnimatedContainer(
          duration: MediaQuery.disableAnimationsOf(context) ? Duration.zero : const Duration(milliseconds: 80),
          transform: Matrix4.translationValues(0, pressed ? 3 : 0, 0),
          constraints: const BoxConstraints(minHeight: 54),
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
          decoration: BoxDecoration(
            color: bg,
            border: Border.all(color: C.ink, width: bw),
            borderRadius: BorderRadius.circular(R.md),
            boxShadow: hardShadow(0, pressed ? 1 : 4),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                label,
                style: T.d(17, color: fg, height: 1.1),
                maxLines: 1,
                softWrap: false,
                overflow: TextOverflow.ellipsis,
              ),
              if (votes != null)
                Opacity(
                  opacity: 0.8,
                  child: Text(
                    SPlay.votes(votes!),
                    style: T.b(12, color: fg, weight: FontWeight.w800, height: 1.1),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

/// `.cf-foot`: tahminde kaç kişi seçti; açıklamada bildin mi, kim yanılttı.
class _Foot extends StatelessWidget {
  const _Foot({required this.view, required this.meId, required this.online, required this.label, required this.nick});
  final ConfessionsView view;
  final String meId;
  final int online;
  final String Function(String id) label;
  final String Function(String id) nick;

  @override
  Widget build(BuildContext context) {
    final r = view.phase == 'reveal' ? view.reveal : null;
    String main;
    String? sub;
    var tone = 'dark';
    if (r == null) {
      main = view.myPick != null ? SPlay.myPick(label(view.myPick!), view.picked.length, online) : SPlay.picked(view.picked.length, online);
      sub = view.myPick != null ? SPlay.changePick : null;
    } else if (r.authorId == null) {
      tone = 'light';
      main = SPlay.revealHidden;
      sub = SPlay.tally;
    } else {
      final author = r.authorId!;
      var fooled = 0;
      for (final pt in r.points) {
        if (pt.playerId == author) {
          fooled = pt.delta;
          break;
        }
      }
      final mine = author == meId;
      final hit = !mine && view.myPick == author;
      main = mine ? SPlay.fooledMe(fooled) : '${view.myPick != null ? '${hit ? SPlay.gotIt : SPlay.missed} ' : ''}${SPlay.fooled(nick(author), fooled)}';
      final right = [for (final id in r.correct) id == meId ? SPlay.you : nick(id)];
      sub = right.isNotEmpty ? SPlay.rightList(right.join(', ')) : SPlay.nobodyRight;
      tone = hit ? 'hit' : 'light';
    }
    final bg = switch (tone) {
      'light' => C.paper,
      'hit' => C.mint,
      _ => C.panel2,
    };
    final fg = tone == 'dark' ? C.text2 : C.ink2;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: bg,
        border: Border.all(color: C.ink, width: bw),
        borderRadius: BorderRadius.circular(18),
      ),
      child: VStack(
        gap: 4,
        children: [
          Text(
            main,
            style: T.d(18, color: fg, height: 1.2),
            textAlign: TextAlign.center,
          ),
          if (sub != null)
            Opacity(
              opacity: 0.8,
              child: Text(
                sub,
                style: T.b(13, color: fg, weight: FontWeight.w700, height: 1.2),
                textAlign: TextAlign.center,
              ),
            ),
        ],
      ),
    );
  }
}

/// `.cf-ask[data-reveal]`: yazar açılırken bulanıklıktan netleşir (900ms).
class _Unmask extends StatefulWidget {
  const _Unmask({super.key, required this.child});
  final Widget child;

  @override
  State<_Unmask> createState() => _UnmaskState();
}

class _UnmaskState extends State<_Unmask> with SingleTickerProviderStateMixin {
  static const _curve = Cubic(0.2, 0.7, 0.1, 1);
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 900));
  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    if (MediaQuery.disableAnimationsOf(context)) {
      _c.value = 1;
    } else {
      _c.forward();
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: _c,
    child: widget.child,
    builder: (context, child) {
      final t = _curve.transform(_c.value);
      final sigma = 10 * (1 - t);
      return Opacity(
        opacity: t.clamp(0.0, 1.0),
        child: sigma <= 0.01
            ? child
            : ImageFiltered(
                imageFilter: ui.ImageFilter.blur(sigmaX: sigma, sigmaY: sigma),
                child: child,
              ),
      );
    },
  );
}
