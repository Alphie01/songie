import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/scheduler.dart';

import '../../shared/models.dart';
import '../../shared/text.dart';
import '../../ui/icons.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/game_module.dart';
import '../kit/kit.dart';
import 'models.dart';
import 'strings.dart';

part 'fill_column.dart';
part 'podium.dart';
part 'table.dart';

typedef _Send = Future<void> Function(Json action);

int _nowMs() => DateTime.now().millisecondsSinceEpoch;

/// Puana, eşitlikte tamamlanana göre sıralama (JS `sort` kararlıdır: eşitler sunucu sırasında kalır).
List<(String, PlayerScore)> _ranked(BottleView view) {
  final list = [for (var i = 0; i < view.scores.length; i++) (i, view.scores[i])];
  list.sort((a, b) {
    final p = b.$2.$2.points - a.$2.$2.points;
    if (p != 0) return p;
    final d = b.$2.$2.done - a.$2.$2.done;
    return d != 0 ? d : a.$1 - b.$1;
  });
  return [for (final e in list) e.$2];
}

Color _kindColor(String kind) => kind == 'dare' ? C.red : C.sky;

/// `.bt-hint` (ve `.bt-hint-2`: daha açık).
Widget _hint(String text, {bool light = false}) => Text(
  text,
  style: T.b(14, color: light ? C.text2 : C.text3, weight: FontWeight.w700),
  textAlign: TextAlign.center,
);

/// games/bottle/client/PlayView.tsx
class BottlePlayView extends StatefulWidget {
  const BottlePlayView({super.key, required this.props});
  final PlayViewProps props;

  @override
  State<BottlePlayView> createState() => _BottlePlayViewState();
}

class _BottlePlayViewState extends State<BottlePlayView> {
  String? _error;
  String? _errorKey;
  bool _busy = false;
  late int _offset;

  int get _serverNow => asJson(widget.props.view).integer('serverNow');

  @override
  void initState() {
    super.initState();
    _offset = _serverNow - _nowMs();
  }

  @override
  void didUpdateWidget(BottlePlayView old) {
    super.didUpdateWidget(old);
    final sn = _serverNow;
    if (asJson(old.props.view).integer('serverNow') != sn) _offset = sn - _nowMs();
  }

  Future<void> _send(Json action) async {
    final round = asJson(widget.props.view).integer('round');
    setState(() {
      _error = null;
      _busy = true;
    });
    try {
      final res = await widget.props.act({...action, 'round': round});
      if (!res.ok && mounted) setState(() => _error = res.error);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.props;
    final view = BottleView.fromJson(p.view);
    final members = membersOf(p.room);
    final isHost = p.room.hostId == p.meId;

    // Yeni tur ya da aşamada eski hata silinir.
    final key = '${view.round}:${view.phase}';
    if (_errorKey != key) {
      _errorKey = key;
      _error = null;
    }

    if (view.phase == 'podium') return _Podium(view: view, members: members, meId: p.meId, code: p.room.code);

    // Masaüstündeki yan sütunlar (skorlar, ayarlar) telefonda gizli; skorlar ortada (`.sg-mobile-only`).
    final g = Layout.gutter(context);
    return GameColumn(
      maxWidth: Layout.col + 2 * g,
      bottom: 24,
      child: VStack(
        gap: 22,
        children: [
          _FillColumn(
            minHeight: viewportHeight(context) - 72 - 24,
            gap: 12,
            children: [
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
                      child: Text(SPlay.round(view.turnNumber, view.totalRounds), style: T.d(16, color: C.ink2, height: 1.2)),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    p.room.code,
                    style: T.b(13, color: C.text3, weight: FontWeight.w800, letterSpacing: 2),
                  ),
                ],
              ),
              _Table(view: view, members: members, meId: p.meId, offset: _offset),
              ..._stage(view, members, p.meId, isHost),
              if (_error != null) ErrorText(_error!, center: true),
            ],
          ),
          _Scores(view: view, members: members, meId: p.meId),
          const _HowTo(),
        ],
      ),
    );
  }

  /// Masanın altı: başlık ve aşamanın düğmeleri (`h1.bt-headline` + `section.bt-stage`).
  List<Widget> _stage(BottleView view, Map<String, RoomPlayer> members, String meId, bool isHost) {
    String nick(String id) => id == meId ? SPlay.you : (members[id]?.nick ?? '?');
    String name(String id) => members[id]?.nick ?? '?';
    bool online(String id) => members[id]?.connected ?? false;
    final busy = _busy;
    final send = _send;
    Widget headline(String text) => Semantics(
      liveRegion: true,
      child: Text(
        text,
        style: T.d(26, color: C.text, height: 1.05),
        textAlign: TextAlign.center,
      ),
    );

    if (view.phase == 'spin') {
      final mine = view.spinnerId == meId;
      final away = !online(view.spinnerId);
      final last = view.lastResult;
      return [
        headline(
          last != null
              ? SPlay.spunBy(name(last.spinnerId), last.spinnerId == meId, mine, name(view.spinnerId))
              : (mine ? SPlay.yourTurn : SPlay.waitSpinner(name(view.spinnerId))),
        ),
        _Grow(
          child: _FillColumn(
            gap: 10,
            children: [
              if (last != null) _LastResultBox(result: last, name: name),
              const _Grow(),
              if (mine) ...[
                _hint(SPlay.spinHint),
                SButton(
                  label: SPlay.spin,
                  tone: BtnTone.yellow,
                  block: true,
                  minHeight: 66,
                  radius: 22,
                  shadowY: 6,
                  fontSize: 24,
                  onPressed: busy ? null : () => send({'type': 'spin'}),
                ),
              ] else ...[
                if (away) _hint(SPlay.offline(name(view.spinnerId))),
                if (isHost)
                  VStack(
                    gap: 10,
                    children: [
                      SButton(
                        label: SPlay.spinFor(name(view.spinnerId)),
                        tone: BtnTone.yellow,
                        block: true,
                        minHeight: 58,
                        radius: 20,
                        shadowY: 5,
                        fontSize: 20,
                        onPressed: busy ? null : () => send({'type': 'spin'}),
                      ),
                      _Ghost(label: SPlay.skipSpinner, onTap: busy ? null : () => send({'type': 'skipSpinner'})),
                    ],
                  ),
              ],
            ],
          ),
        ),
      ];
    }

    if (view.phase == 'spinning') return [headline(SPlay.spinning), const _Grow()];

    final target = view.targetId;
    if (target == null) return const [];
    final iAmTarget = target == meId;
    final hostSkip = isHost && !online(target)
        ? VStack(
            gap: 10,
            children: [
              _hint(SPlay.targetOffline(name(target))),
              _Ghost(label: SPlay.skipTurn, onTap: busy ? null : () => send({'type': 'skipTurn'})),
            ],
          )
        : null;
    final head = headline(iAmTarget ? SPlay.pointedYou : SPlay.pointed(name(target)));

    if (view.phase == 'choose') {
      return [
        head,
        _Grow(
          child: _FillColumn(
            gap: 10,
            main: MainAxisAlignment.end,
            children: [
              if (iAmTarget) ...[
                _hint(SPlay.chooseHint, light: true),
                Row(
                  children: [
                    for (final k in kinds) ...[
                      if (k != kinds.first) const SizedBox(width: 12),
                      Expanded(
                        child: _Choice(kind: k, onTap: busy ? null : () => send({'type': 'choose', 'kind': k})),
                      ),
                    ],
                  ],
                ),
              ] else
                _hint(SPlay.choosing(name(target)), light: true),
              ?hostSkip,
            ],
          ),
        ),
      ];
    }

    final kind = view.kind ?? 'truth';
    final passesLeft = view.passesLeft;
    final noPass = passesLeft != null && passesLeft <= 0;
    final prompt = view.prompt;
    final vote = view.vote;
    return [
      head,
      _Grow(
        child: _FillColumn(
          gap: 10,
          children: [
            if (prompt != null) _PromptCard(key: ValueKey(prompt.id), id: prompt.id, kind: kind, text: prompt.text),
            const _Grow(),
            if (view.phase == 'task') ...[
              if (iAmTarget) ...[
                if (view.passPenalty && !noPass) _hint(SPlay.passCost),
                IntrinsicHeight(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Expanded(
                        flex: 2,
                        child: _BigButton(
                          color: C.mint,
                          label: SPlay.done(kind),
                          onTap: busy ? null : () => send({'type': 'done'}),
                          child: Text(SPlay.done(kind)),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _BigButton(
                          color: C.paper,
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          label: SPlay.pass,
                          onTap: busy || noPass ? null : () => send({'type': 'pass'}),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(SPlay.pass, style: T.d(17, color: C.ink2, height: 1.05)),
                              Text(
                                noPass ? SPlay.noPass : SPlay.passLeft(passesLeft),
                                style: T.b(12, color: C.ink2, weight: FontWeight.w800, height: 1.05),
                                textAlign: TextAlign.center,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ] else
                _hint(SPlay.doing(kind, nick(target)), light: true),
            ],
            if (view.phase == 'vote' && vote != null) _Vote(vote: vote, kind: kind, busy: busy, offset: _offset, send: send),
            ?hostSkip,
          ],
        ),
      ),
    ];
  }
}

/// `.bt-ghost`: tam genişlik, 46px şeffaf düğme.
class _Ghost extends StatelessWidget {
  const _Ghost({required this.label, required this.onTap});
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => Opacity(
    opacity: onTap == null ? 0.5 : 1,
    child: Pressable(
      onTap: onTap,
      label: label,
      builder: (context, _) => Container(
        constraints: const BoxConstraints(minHeight: 46),
        padding: const EdgeInsets.symmetric(horizontal: 14),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          border: Border.all(color: C.line2, width: 2),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Text(
          label,
          style: T.b(14, color: C.text2, weight: FontWeight.w800, height: 1),
          textAlign: TextAlign.center,
        ),
      ),
    ),
  );
}

/// `.btn.bt-done` / `.bt-pass` / oy düğmeleri: 62px, r20, 0 5 gölge; basınca 3px iner (80ms).
/// [outline] seçili oy (`aria-pressed`: beyaz halka), [faded] öteki seçenek seçiliyken sönük.
class _BigButton extends StatelessWidget {
  const _BigButton({
    required this.color,
    required this.label,
    required this.child,
    this.onTap,
    this.padding = const EdgeInsets.symmetric(horizontal: 18),
    this.outline = false,
    this.faded = false,
  });
  final Color color;
  final String label;
  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsets padding;
  final bool outline;
  final bool faded;

  @override
  Widget build(BuildContext context) => Opacity(
    opacity: faded ? 0.55 : (onTap == null ? 0.5 : 1),
    child: Pressable(
      onTap: onTap,
      label: label,
      selected: outline,
      builder: (context, pressed) => TweenAnimationBuilder<double>(
        tween: Tween(end: pressed ? 1 : 0),
        duration: const Duration(milliseconds: 80),
        curve: Curves.ease,
        builder: (context, t, _) => Transform.translate(
          offset: Offset(0, 3 * t),
          child: FocusRing(
            focused: outline,
            radius: 20,
            color: C.paper,
            width: 4,
            offset: 2,
            child: Container(
              constraints: const BoxConstraints(minHeight: 62),
              padding: padding,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: color,
                border: Border.all(color: C.ink, width: bw),
                borderRadius: BorderRadius.circular(20),
                boxShadow: hardShadow(0, 5 - 4 * t),
              ),
              child: DefaultTextStyle.merge(
                style: T.d(22, color: C.ink2),
                textAlign: TextAlign.center,
                child: ExcludeSemantics(child: child),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

/// `.bt-choice`: doğruluk (gök mavisi, −2°) / cesaret (kırmızı, +2°).
class _Choice extends StatelessWidget {
  const _Choice({required this.kind, required this.onTap});
  final String kind;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => Opacity(
    opacity: onTap == null ? 0.6 : 1,
    child: Pressable(
      onTap: onTap,
      label: S.kind(kind),
      builder: (context, pressed) => Transform.translate(
        offset: Offset(0, pressed ? 5 : 0),
        child: Transform.rotate(
          angle: deg(kind == 'dare' ? 2 : -2),
          child: Container(
            constraints: const BoxConstraints(minHeight: 96),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: _kindColor(kind),
              border: Border.all(color: C.ink, width: bw),
              borderRadius: BorderRadius.circular(24),
              boxShadow: hardShadow(0, pressed ? 1 : 6),
            ),
            child: ExcludeSemantics(
              child: Text(S.kind(kind), style: T.d(25, color: C.ink2, height: 1.45)),
            ),
          ),
        ),
      ),
    ),
  );
}

/// `.bt-card`: soru/görev kartı (−1°), girerken `bt-card-in` (280ms).
class _PromptCard extends StatelessWidget {
  const _PromptCard({super.key, required this.id, required this.kind, required this.text});
  final String id;
  final String kind;
  final String text;

  @override
  Widget build(BuildContext context) {
    final card = Transform.rotate(
      angle: deg(-1),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: _kindColor(kind),
          border: Border.all(color: C.ink, width: bw),
          borderRadius: BorderRadius.circular(24),
          boxShadow: Shadows.lg,
        ),
        child: VStack(
          gap: 6,
          children: [
            Text(
              trUpper(S.kind(kind)),
              style: T.b(12, color: C.ink2, weight: FontWeight.w800, letterSpacing: 2),
            ),
            Text(text, style: T.d(22, color: C.ink2, height: 1.12)),
          ],
        ),
      ),
    );
    if (MediaQuery.disableAnimationsOf(context)) return card;
    return EnterAnim(animKey: id, dy: 8, scale: 0.98, child: card);
  }
}

/// "Yaptı mı?" oylaması: evet/hayır, ilerleme çubuğu ve kalan saniye (250ms'de bir).
class _Vote extends StatefulWidget {
  const _Vote({required this.vote, required this.kind, required this.busy, required this.offset, required this.send});
  final VoteInfo vote;
  final String kind;
  final bool busy;
  final int offset;
  final _Send send;

  @override
  State<_Vote> createState() => _VoteState();
}

class _VoteState extends State<_Vote> {
  late final Timer _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(milliseconds: 250), (_) => mounted ? setState(() {}) : null);
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final v = widget.vote;
    final left = math.max(0, ((v.endsAt - (_nowMs() + widget.offset)) / 1000).ceil());
    final total = v.voters == 0 ? 1 : v.voters;
    final cast = v.yes + v.no;
    return VStack(
      gap: 12,
      children: [
        Text(
          SPlay.voteTitle(widget.kind),
          style: T.d(22, color: C.text, height: 1.1),
          textAlign: TextAlign.center,
        ),
        if (v.canVote)
          Row(
            children: [
              for (final yes in [true, false]) ...[
                if (!yes) const SizedBox(width: 10),
                Expanded(
                  child: _BigButton(
                    color: yes ? C.mint : C.red,
                    label: yes ? SPlay.yes : SPlay.no,
                    outline: v.myVote == yes,
                    faded: v.myVote != null && v.myVote != yes,
                    onTap: widget.busy ? null : () => widget.send({'type': 'vote', 'yes': yes}),
                    child: Text(yes ? SPlay.yes : SPlay.no),
                  ),
                ),
              ],
            ],
          )
        else
          _hint(SPlay.voteWait, light: true),
        Row(
          children: [
            Expanded(
              child: Container(
                height: 10,
                clipBehavior: Clip.antiAlias,
                alignment: Alignment.centerLeft,
                decoration: BoxDecoration(color: C.ink2, borderRadius: BorderRadius.circular(R.pill)),
                child: AnimatedFractionallySizedBox(
                  duration: const Duration(milliseconds: 200),
                  curve: Curves.ease,
                  widthFactor: (cast / total * 100).round() / 100,
                  heightFactor: 1,
                  child: const ColoredBox(color: C.mint),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Text(
              '${SPlay.voted(cast, v.voters)} · ${SPlay.seconds(left)}',
              style: T.b(13, color: C.text, weight: FontWeight.w800),
            ),
          ],
        ),
      ],
    );
  }
}

/// `.bt-last`: önceki turun sonucu.
class _LastResultBox extends StatelessWidget {
  const _LastResultBox({required this.result, required this.name});
  final LastResult result;
  final String Function(String id) name;

  @override
  Widget build(BuildContext context) {
    final r = result;
    final votes = r.votes;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: C.panel2,
        border: Border.all(color: C.ink, width: 2),
        borderRadius: BorderRadius.circular(R.md),
      ),
      child: VStack(
        gap: 2,
        children: [
          Text(
            '${SPlay.last(r.outcome, name(r.targetId))}${votes != null ? ' (${SPlay.votes(votes.yes, votes.no)})' : ''}',
            style: T.b(14, color: C.text2, weight: FontWeight.w700),
          ),
          if (r.text.isNotEmpty)
            Text(
              '${S.kind(r.kind)}: ${r.text}',
              style: T.b(14, color: C.text3, weight: FontWeight.w700),
            ),
        ],
      ),
    );
  }
}

/// `.bt-scores`: skor listesi (birinci nane rengi puanla).
class _Scores extends StatelessWidget {
  const _Scores({required this.view, required this.members, required this.meId});
  final BottleView view;
  final Map<String, RoomPlayer> members;
  final String meId;

  @override
  Widget build(BuildContext context) {
    final rows = _ranked(view).where((e) => members.containsKey(e.$1) || view.seats.contains(e.$1)).toList();
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: C.panel,
        border: Border.all(color: C.ink, width: bw),
        borderRadius: BorderRadius.circular(18),
      ),
      child: VStack(
        gap: 10,
        children: [
          Text(SPlay.scores, style: T.d(18, color: C.text, height: 1.1)),
          VStack(
            gap: 8,
            children: [
              for (var i = 0; i < rows.length; i++)
                Builder(
                  builder: (context) {
                    final (id, sc) = rows[i];
                    final m = members[id];
                    return Row(
                      children: [
                        if (m != null) ...[SAvatar(avatar: m.avatar, nick: m.nick, size: 28, dim: !m.connected), const SizedBox(width: 8)],
                        Expanded(
                          child: Align(
                            alignment: Alignment.centerLeft,
                            child: Text(
                              id == meId ? '${m?.nick ?? '?'} (${SPlay.you})' : (m?.nick ?? '?'),
                              style: T.b(15, color: C.text, weight: FontWeight.w800),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text('${sc.points}', style: T.d(17, color: i == 0 && sc.points > 0 ? C.mint : C.yellow)),
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

/// `.howto.bt-howto`: kesikli üst çizgi (line-2), numaralı adımlar.
class _HowTo extends StatelessWidget {
  const _HowTo();

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 8),
    child: CustomPaint(
      painter: const _DashedTop(color: C.line2),
      child: Padding(
        padding: const EdgeInsets.only(top: bw + 28),
        child: VStack(
          gap: 16,
          children: [
            Text(SHowto.title, style: T.d(22, color: C.text, height: 1.05)),
            VStack(
              gap: 16,
              children: [
                for (var i = 0; i < SHowto.steps.length; i++)
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Text(
                          '${i + 1}',
                          style: T.d(16, color: C.yellow, height: 1.45).copyWith(fontFeatures: const [FontFeature.tabularFigures()]),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(SHowto.steps[i].$1, style: T.d(16, color: C.text, height: 1.05)),
                            const SizedBox(height: 2),
                            Text(SHowto.steps[i].$2, style: T.b(13, color: C.text2)),
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
  );
}

/// `border-top: 3px dashed`: Chrome'un deseni (kalınlık ≥ 3: çizgi 2×, boşluk 1× kalınlık;
/// boşluk, iki uç çizgiyle bitecek biçimde uzunluğa göre ayarlanır).
class _DashedTop extends CustomPainter {
  const _DashedTop({required this.color});
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    const w = bw;
    final paint = Paint()..color = color;
    final length = size.width;
    const dash = w * 2;
    var gap = w * 1.0;
    if (length <= dash * 2) {
      canvas.drawRect(Rect.fromLTWH(0, 0, length, w), paint);
      return;
    }
    if (length <= 2 * dash + gap) {
      final m = length / (2 * dash + gap);
      canvas.drawRect(Rect.fromLTWH(0, 0, dash * m, w), paint);
      canvas.drawRect(Rect.fromLTWH(length - dash * m, 0, dash * m, w), paint);
      return;
    }
    final minDashes = ((length + gap) / (dash + gap)).floor();
    final minGap = (length - minDashes * dash) / (minDashes - 1);
    final maxGap = (length - (minDashes + 1) * dash) / minDashes;
    gap = maxGap <= 0 || (minGap - gap).abs() < (maxGap - gap).abs() ? minGap : maxGap;
    for (double x = 0; x < length - 0.01; x += dash + gap) {
      canvas.drawRect(Rect.fromLTWH(x, 0, math.min(dash, length - x), w), paint);
    }
  }

  @override
  bool shouldRepaint(_DashedTop old) => old.color != color;
}
