import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/services.dart';

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

/// Sunucunun podyum süresi (server/game.ts DEFAULT_TIMING.podiumMs); yalnızca çubuk animasyonu için.
const _podiumMs = 8000;

int _nowMs() => DateTime.now().millisecondsSinceEpoch;

/// `.fs-box-title` (h2: Baloo 2, 12px, 1.5px aralık, büyük harf).
final _boxTitle = T.d(12, color: C.text3, height: 1.05, letterSpacing: 1.5);

/// Puana göre sıralama; eşitlikte oyun sırası korunur (JS `sort` kararlıdır).
List<String> _ranking(FiveSecondsView view) {
  final idx = {for (var i = 0; i < view.order.length; i++) view.order[i]: i};
  return [...view.order]..sort((a, b) {
    final d = view.score(b) - view.score(a);
    return d != 0 ? d : idx[a]! - idx[b]!;
  });
}

Color _teamColor(String t) => t == 'b' ? C.lilac : C.mint;

/// games/five-seconds/client/PlayView.tsx
class FiveSecondsPlayView extends StatefulWidget {
  const FiveSecondsPlayView({super.key, required this.props});
  final PlayViewProps props;

  @override
  State<FiveSecondsPlayView> createState() => _FiveSecondsPlayViewState();
}

class _FiveSecondsPlayViewState extends State<FiveSecondsPlayView> {
  String? _error;

  Future<void> _send(Json action) async {
    setState(() => _error = null);
    final res = await widget.props.act(action);
    if (!res.ok && mounted) setState(() => _error = res.error);
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.props;
    final view = FiveSecondsView.fromJson(p.view);
    final members = membersOf(p.room);
    String nick(String id) => id == p.meId ? SPlay.you : (members[id]?.nick ?? '?');
    final isHost = p.room.hostId == p.meId;

    if (view.phase == 'podium') return _Podium(view: view, members: members, meId: p.meId, code: p.room.code);

    // Masaüstündeki sol skor ve sağ ayar sütunları telefonda gizli (`.sg-side`); skorlar ortada (`.sg-mobile-only`).
    final mine = view.performerId == p.meId;
    final phaseLabel = switch (view.phase) {
      'ready' => SPlay.phaseReady,
      'countdown' => mine ? SPlay.phaseMine : SPlay.phaseSpeaking(nick(view.performerId)),
      _ => SPlay.phaseVote,
    };
    final g = Layout.gutter(context);
    // `.fs-ready, .fs-turn { min-height: calc(100dvh - 200px) }`
    final minH = viewportHeight(context) - 200;

    return GameColumn(
      maxWidth: Layout.col + 2 * g,
      bottom: 24,
      child: VStack(
        gap: 14,
        children: [
          _Head(label: '${S.name} · $phaseLabel', code: p.room.code),
          if (view.phase == 'ready') _Ready(view: view, mine: mine, isHost: isHost, nick: nick, send: _send, minHeight: minH),
          if (view.phase == 'countdown') _Countdown(view: view, mine: mine, isHost: isHost, send: _send, minHeight: minH),
          if (view.phase == 'vote') _Vote(view: view, meId: p.meId, mine: mine, nick: nick, send: _send, members: members, minHeight: minH),
          if (isHost)
            Wrap(
              alignment: WrapAlignment.center,
              spacing: 8,
              runSpacing: 8,
              children: [
                if (view.prompt != null) SGhostButton(label: SPlay.swap, onPressed: () => _send({'type': 'swap', 'attemptId': view.attemptId})),
                SGhostButton(label: SPlay.skip, onPressed: () => _send({'type': 'skip', 'attemptId': view.attemptId})),
              ],
            ),
          if (_error != null) ErrorText(_error!, center: true),
          if (view.phase != 'vote')
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: _Scoreboard(view: view, members: members, meId: p.meId),
            ),
          const Padding(padding: EdgeInsets.only(top: 18), child: _HowTo()),
        ],
      ),
    );
  }
}

/// `.fs-head`: sarı hap (oyun · aşama) + oda kodu.
class _Head extends StatelessWidget {
  const _Head({required this.label, required this.code});
  final String label;
  final String code;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisAlignment: MainAxisAlignment.spaceBetween,
    children: [
      Flexible(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
          decoration: BoxDecoration(
            color: C.yellow,
            border: Border.all(color: C.ink, width: bw),
            borderRadius: BorderRadius.circular(R.pill),
          ),
          child: Text(
            label,
            style: T.d(16, color: C.ink2, height: 1.2),
            maxLines: 1,
            softWrap: false,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ),
      const SizedBox(width: 12),
      Text(
        code,
        style: T.b(13, color: C.text3, weight: FontWeight.w800, letterSpacing: 2),
      ),
    ],
  );
}

/// `.fs-ready` / `.fs-turn`: en az [minHeight] boyunda sütun; `_Grow` (`.fs-spacer`) ana düğmeyi dibe iter.
class _Section extends StatelessWidget {
  const _Section({required this.minHeight, required this.children, this.gap = 14, this.cross = CrossAxisAlignment.center});
  final double minHeight;
  final List<Widget> children;
  final double gap;
  final CrossAxisAlignment cross;

  @override
  Widget build(BuildContext context) => _FillColumn(minHeight: math.max(0, minHeight), gap: gap, cross: cross, children: children);
}

/// `.fs-hint`: en fazla 300px, ortalı.
class _Hint extends StatelessWidget {
  const _Hint(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => ConstrainedBox(
    constraints: const BoxConstraints(maxWidth: 300),
    child: Text(
      text,
      style: T.b(14, color: C.text2, weight: FontWeight.w700),
      textAlign: TextAlign.center,
    ),
  );
}

final _turnTitle = T.d(46, color: C.text);

class _Ready extends StatelessWidget {
  const _Ready({required this.view, required this.mine, required this.isHost, required this.nick, required this.send, required this.minHeight});
  final FiveSecondsView view;
  final bool mine;
  final bool isHost;
  final String Function(String id) nick;
  final Future<void> Function(Json a) send;
  final double minHeight;

  @override
  Widget build(BuildContext context) {
    final seconds = (view.durationMs / 1000).round();
    void start() => send({'type': 'ready', 'attemptId': view.attemptId});
    final steal = view.stealFrom != null && view.prompt != null;
    final performer = nick(view.performerId);
    return _Section(
      minHeight: minHeight,
      children: [
        if (view.lastResult != null && view.stealFrom == null) _LastResult(view: view, nick: nick),
        if (steal) ...[
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: C.pink,
              border: Border.all(color: C.ink, width: bw),
              borderRadius: BorderRadius.circular(18),
            ),
            child: VStack(
              gap: 4,
              children: [
                Text(
                  SPlay.stealTitle,
                  style: T.d(22, color: C.ink2, height: 1.1),
                  textAlign: TextAlign.center,
                ),
                Text(
                  SPlay.stealBody(nick(view.stealFrom!), performer),
                  style: T.b(14, color: C.ink2, weight: FontWeight.w700),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
          _PromptCard(prompt: view.prompt!, dim: true),
        ],
        if (mine)
          Text(SPlay.yourTurn, style: _turnTitle, textAlign: TextAlign.center)
        else
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                SPlay.next,
                style: T.b(14, color: C.text3, weight: FontWeight.w800, height: 1),
                textAlign: TextAlign.center,
              ),
              Text(performer, style: _turnTitle, textAlign: TextAlign.center),
            ],
          ),
        if (!steal)
          ExcludeSemantics(
            child: Container(
              width: 200,
              height: 200,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: C.yellow,
                shape: BoxShape.circle,
                border: Border.all(color: C.ink, width: 5),
                boxShadow: hardShadow(0, 10),
              ),
              child: Text('$seconds', style: T.d(120, color: C.ink2)),
            ),
          ),
        _Hint(mine ? SPlay.readyHint(seconds) : SPlay.waiting(performer)),
        const _Grow(),
        if (mine)
          SButton(label: SPlay.ready, tone: BtnTone.primary, block: true, minHeight: 68, radius: 22, shadowY: 6, pressY: 5, fontSize: 26, onPressed: start)
        else if (isHost)
          SGhostButton(label: SPlay.readyFor(performer), onPressed: start),
      ],
    );
  }
}

/// `.fs-last`: önceki denemenin sonucu.
class _LastResult extends StatelessWidget {
  const _LastResult({required this.view, required this.nick});
  final FiveSecondsView view;
  final String Function(String id) nick;

  @override
  Widget build(BuildContext context) {
    final r = view.lastResult!;
    final who = nick(r.performerId) == SPlay.you ? SPlay.youCap : nick(r.performerId);
    final title = r.skipped
        ? SPlay.resultSkipped(who)
        : r.success
        ? (r.steal ? SPlay.resultStolen(who) : SPlay.resultSuccess(who))
        : SPlay.resultFail(who);
    final parts = [r.success ? '$title +1' : title, if (r.prompt.isNotEmpty) '“${r.prompt}”', if (!r.skipped) SPlay.votes(r.yes, r.no)];
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: C.panel2,
        border: Border.all(color: C.ink, width: 2),
        borderRadius: BorderRadius.circular(R.md),
      ),
      child: Text(
        parts.join(' · '),
        style: T.b(14, color: C.text2, weight: FontWeight.w700),
        textAlign: TextAlign.center,
      ),
    );
  }
}

/// `.fs-prompt`: beyaz görev kartı (−1.5°); açılırken `fs-reveal` (320ms, hafif taşan eğri).
class _PromptCard extends StatelessWidget {
  const _PromptCard({super.key, required this.prompt, this.dim = false});
  final FivePrompt prompt;
  final bool dim;

  @override
  Widget build(BuildContext context) {
    final card = Transform.rotate(
      angle: deg(-1.5),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        decoration: BoxDecoration(
          color: C.paper,
          border: Border.all(color: C.ink, width: bw),
          borderRadius: BorderRadius.circular(24),
          boxShadow: hardShadow(6, 6),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
              decoration: BoxDecoration(
                color: C.coral,
                border: Border.all(color: C.ink, width: 2),
                borderRadius: BorderRadius.circular(R.pill),
              ),
              child: Text(
                categoryLabel[prompt.category] ?? prompt.category,
                style: T.b(12, color: C.ink2, weight: FontWeight.w800),
              ),
            ),
            const SizedBox(height: 8),
            Text(prompt.text, style: T.d(30, color: C.ink2, height: 1.05)),
          ],
        ),
      ),
    );
    if (dim) return Opacity(opacity: 0.7, child: card);
    if (MediaQuery.disableAnimationsOf(context)) return card;
    return EnterAnim(animKey: prompt.id, duration: const Duration(milliseconds: 320), curve: const Cubic(0.2, 0.9, 0.3, 1.2), scale: 0.92, child: card);
  }
}

/// `useRemaining` (requestAnimationFrame): kalan süre her karede sunucu saatine göre yenilenir.
class _FrameRemaining extends StatefulWidget {
  const _FrameRemaining({required this.serverNow, required this.endsAt, required this.builder, this.onFrame});
  final int serverNow;
  final int endsAt;
  final Widget Function(BuildContext context, int remainingMs) builder;
  final void Function(int remainingMs)? onFrame;

  @override
  State<_FrameRemaining> createState() => _FrameRemainingState();
}

class _FrameRemainingState extends State<_FrameRemaining> with SingleTickerProviderStateMixin {
  late int _offset = widget.serverNow - _nowMs();
  late final Ticker _ticker = createTicker(_tick);

  int get _remaining => math.max(0, widget.endsAt - (_nowMs() + _offset));

  @override
  void initState() {
    super.initState();
    _ticker.start();
  }

  @override
  void didUpdateWidget(_FrameRemaining old) {
    super.didUpdateWidget(old);
    if (old.serverNow != widget.serverNow) _offset = widget.serverNow - _nowMs();
    if (!_ticker.isActive && _remaining > 0) _ticker.start();
  }

  void _tick(Duration _) {
    final r = _remaining;
    widget.onFrame?.call(r);
    setState(() {});
    // Süre bitince görüntü değişmez; kare döngüsünü durdur (yeni görünümde yeniden başlar).
    if (r <= 0) _ticker.stop();
  }

  @override
  void dispose() {
    _ticker.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.builder(context, _remaining);
}

class _Countdown extends StatefulWidget {
  const _Countdown({required this.view, required this.mine, required this.isHost, required this.send, required this.minHeight});
  final FiveSecondsView view;
  final bool mine;
  final bool isHost;
  final Future<void> Function(Json a) send;
  final double minHeight;

  @override
  State<_Countdown> createState() => _CountdownState();
}

class _CountdownState extends State<_Countdown> {
  int? _lastBuzz;
  bool _reduce = false;

  bool _low(int remaining) => remaining <= math.max(2000, widget.view.durationMs * 0.3);

  /// Son saniyelerde telefonda kısa titreşim (hareket azaltma açıksa yok).
  void _onFrame(int remaining) {
    final secs = (remaining / 1000).ceil();
    if (!_low(remaining) || secs <= 0 || _lastBuzz == secs || _reduce) return;
    _lastBuzz = secs;
    HapticFeedback.mediumImpact();
  }

  @override
  Widget build(BuildContext context) {
    final view = widget.view;
    _reduce = MediaQuery.disableAnimationsOf(context);
    return _FrameRemaining(
      serverNow: view.serverNow,
      endsAt: view.endsAt,
      onFrame: _onFrame,
      builder: (context, remaining) {
        final secs = (remaining / 1000).ceil();
        return _Section(
          minHeight: widget.minHeight,
          children: [
            if (view.stealFrom != null)
              Transform.rotate(
                angle: deg(-2),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: C.pink,
                    border: Border.all(color: C.ink, width: 2),
                    borderRadius: BorderRadius.circular(R.pill),
                  ),
                  child: Text(
                    SPlay.stealTitle,
                    style: T.b(13, color: C.ink2, weight: FontWeight.w800),
                  ),
                ),
              ),
            if (view.prompt != null) _PromptCard(key: ValueKey(view.prompt!.id), prompt: view.prompt!),
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: _Ring(fraction: view.durationMs > 0 ? remaining / view.durationMs : 0, label: '$secs', low: _low(remaining)),
            ),
            _ThreeCounter(resetKey: '${view.attemptId}:${view.prompt?.id ?? ''}'),
            const _Grow(),
            if (widget.mine || widget.isHost)
              SButton(
                label: SPlay.done,
                tone: BtnTone.yellow,
                block: true,
                minHeight: 64,
                radius: 22,
                shadowY: 6,
                pressY: 5,
                fontSize: 24,
                onPressed: () => widget.send({'type': 'done', 'attemptId': view.attemptId}),
              ),
          ],
        );
      },
    );
  }
}

/// `.fs-ring`: 230px geri sayım halkası (SVG: r=100, iz 6px, dolgu 18px yuvarlak uçlu, tepeden saat yönünde).
class _Ring extends StatelessWidget {
  const _Ring({required this.fraction, required this.label, required this.low});
  final double fraction;
  final String label;
  final bool low;

  @override
  Widget build(BuildContext context) {
    final color = low ? C.red : C.yellow;
    return Semantics(
      label: '$label ${SPlay.seconds}',
      child: SizedBox(
        width: 230,
        height: 230,
        child: Stack(
          alignment: Alignment.center,
          children: [
            Positioned.fill(
              child: CustomPaint(
                painter: _RingPainter(fraction: fraction.clamp(0.0, 1.0), color: color),
              ),
            ),
            ExcludeSemantics(
              child: Text(label, style: T.d(110, color: color, height: 1.45)),
            ),
          ],
        ),
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  const _RingPainter({required this.fraction, required this.color});
  final double fraction;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final k = size.width / 230;
    final center = Offset(115 * k, 115 * k);
    final r = 100 * k;
    canvas.drawCircle(center, r, Paint()..color = C.ink2);
    canvas.drawCircle(
      center,
      r,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 6 * k
        ..color = C.ink,
    );
    if (fraction <= 0) return;
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: r),
      -math.pi / 2,
      2 * math.pi * fraction,
      false,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 18 * k
        ..strokeCap = StrokeCap.round
        ..color = color,
    );
  }

  @override
  bool shouldRepaint(_RingPainter old) => old.fraction != fraction || old.color != color;
}

/// Yalnızca görsel yardımcı: söylenen her şey için dokun. Sunucuya gitmez.
class _ThreeCounter extends StatefulWidget {
  const _ThreeCounter({required this.resetKey});
  final String resetKey;

  @override
  State<_ThreeCounter> createState() => _ThreeCounterState();
}

class _ThreeCounterState extends State<_ThreeCounter> {
  int _n = 0;

  @override
  void didUpdateWidget(_ThreeCounter old) {
    super.didUpdateWidget(old);
    if (old.resetKey != widget.resetKey) _n = 0;
  }

  @override
  Widget build(BuildContext context) => Column(
    mainAxisSize: MainAxisSize.min,
    children: [
      Text(
        SPlay.counter,
        style: T.b(13, color: C.text3, weight: FontWeight.w800),
      ),
      const SizedBox(height: 14),
      Semantics(
        container: true,
        liveRegion: true,
        value: SPlay.counterLabel(_n),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (var i = 1; i <= 3; i++) ...[
              if (i > 1) const SizedBox(width: 12),
              _Pip(n: i, pressed: i <= _n, onTap: () => setState(() => _n = _n == i ? i - 1 : i)),
            ],
          ],
        ),
      ),
    ],
  );
}

/// `.fs-pip`: 64px yuvarlak; basılıyken nane, 3px aşağıda (80ms).
class _Pip extends StatelessWidget {
  const _Pip({required this.n, required this.pressed, required this.onTap});
  final int n;
  final bool pressed;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Pressable(
    onTap: onTap,
    label: SPlay.pip(n),
    selected: pressed,
    builder: (context, _) => TweenAnimationBuilder<double>(
      tween: Tween(end: pressed ? 1 : 0),
      duration: const Duration(milliseconds: 80),
      curve: Curves.ease,
      builder: (context, t, _) => Transform.translate(
        offset: Offset(0, 3 * t),
        child: Container(
          width: 64,
          height: 64,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: pressed ? C.mint : C.panel,
            shape: BoxShape.circle,
            border: Border.all(color: C.ink, width: bw),
            boxShadow: hardShadow(0, 4 - 3 * t),
          ),
          child: ExcludeSemantics(
            child: Text('$n', style: T.d(26, color: pressed ? C.ink2 : C.text, height: 1.45)),
          ),
        ),
      ),
    ),
  );
}

class _Vote extends StatelessWidget {
  const _Vote({
    required this.view,
    required this.meId,
    required this.mine,
    required this.nick,
    required this.send,
    required this.members,
    required this.minHeight,
  });
  final FiveSecondsView view;
  final String meId;
  final bool mine;
  final String Function(String id) nick;
  final Future<void> Function(Json a) send;
  final Map<String, RoomPlayer> members;
  final double minHeight;

  @override
  Widget build(BuildContext context) {
    final total = view.voters.length;
    final count = view.voted.where(view.voters.contains).length;
    final canVote = !mine && view.order.contains(meId);
    final tally = view.tally ?? (yes: 0, no: 0);
    Widget card(bool yes) => _Tally(
      yes: yes,
      count: yes ? tally.yes : tally.no,
      button: canVote,
      pressed: view.myVote == yes,
      onTap: () => send({'type': 'vote', 'attemptId': view.attemptId, 'success': yes}),
    );
    return _Section(
      minHeight: minHeight,
      gap: 12,
      cross: CrossAxisAlignment.stretch,
      children: [
        if (view.prompt != null) _PromptCard(prompt: view.prompt!, dim: true),
        Padding(
          padding: const EdgeInsets.only(top: 10),
          child: Text(
            mine || !canVote ? SPlay.voteWait : SPlay.voteTitle(nick(view.performerId)),
            style: T.d(28, color: C.text, height: 1.1),
            textAlign: TextAlign.center,
          ),
        ),
        Grid2(columnGap: 10, rowGap: 10, equalHeight: true, children: [card(true), card(false)]),
        Text(
          '${SPlay.voteCount(count, total)} · ${SPlay.voteHint}',
          style: T.b(14, color: C.text, weight: FontWeight.w800),
          textAlign: TextAlign.center,
        ),
        _FrameRemaining(
          serverNow: view.serverNow,
          endsAt: view.voteEndsAt,
          builder: (context, remaining) => Container(
            height: 10,
            clipBehavior: Clip.antiAlias,
            alignment: Alignment.centerLeft,
            decoration: BoxDecoration(color: C.ink2, borderRadius: BorderRadius.circular(R.pill)),
            child: FractionallySizedBox(
              widthFactor: math.min(1.0, remaining / math.max(1, view.voteMs)),
              heightFactor: 1,
              child: const ColoredBox(color: C.yellow),
            ),
          ),
        ),
        if (view.myVote != null) const Center(child: _Hint(SPlay.voteChange)),
        const _Grow(),
        _Scoreboard(view: view, members: members, meId: meId),
      ],
    );
  }
}

/// `.fs-tally`: oy kartı (oy veren için düğme: basılıyken 4px aşağıda, beyaz çerçeve halkası).
class _Tally extends StatelessWidget {
  const _Tally({required this.yes, required this.count, required this.button, required this.pressed, required this.onTap});
  final bool yes;
  final int count;
  final bool button;
  final bool pressed;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final label = yes ? SPlay.voteYes : SPlay.voteNo;
    Widget box(double shadow) => Container(
      padding: const EdgeInsets.all(14),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: yes ? C.mint : C.red,
        border: Border.all(color: C.ink, width: bw),
        borderRadius: BorderRadius.circular(18),
        boxShadow: shadow > 0 ? hardShadow(0, shadow) : null,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('$count', style: T.d(44, color: C.ink2)),
          Text(
            label,
            style: T.b(14, color: C.ink2, weight: FontWeight.w800),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
    if (!button) return box(0);
    return Pressable(
      onTap: onTap,
      label: label,
      selected: pressed,
      builder: (context, _) => TweenAnimationBuilder<double>(
        tween: Tween(end: pressed ? 1 : 0),
        duration: const Duration(milliseconds: 80),
        curve: Curves.ease,
        builder: (context, t, _) => Transform.translate(
          offset: Offset(0, 4 * t),
          child: FocusRing(focused: pressed, radius: 18, color: C.paper, width: 4, offset: 2, child: box(5 - 4 * t)),
        ),
      ),
    );
  }
}

/// Skorlar: takım modunda iki renkli kart, değilse `.fs-box` listesi.
class _Scoreboard extends StatelessWidget {
  const _Scoreboard({required this.view, required this.members, required this.meId});
  final FiveSecondsView view;
  final Map<String, RoomPlayer> members;
  final String meId;

  @override
  Widget build(BuildContext context) {
    String name(String id) => id == meId ? SPlay.youCap : (members[id]?.nick ?? '?');
    final teams = view.teams;
    final ts = view.teamScores;
    if (view.teamMode && teams != null && ts != null) {
      final head = T.d(16, color: C.ink2, height: 1.05);
      final row = T.b(14, color: C.ink2, weight: FontWeight.w800);
      return Semantics(
        container: true,
        label: SPlay.scoreboard,
        child: Grid2(
          columnGap: 10,
          rowGap: 10,
          equalHeight: true,
          children: [
            for (final t in teamIds)
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: _teamColor(t),
                  border: Border.all(color: C.ink, width: bw),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: VStack(
                  gap: 6,
                  children: [
                    Row(
                      children: [
                        Expanded(child: Text(S.team(t), style: head)),
                        const SizedBox(width: 6),
                        Text('${ts[t] ?? 0}', style: head),
                      ],
                    ),
                    VStack(
                      gap: 6,
                      children: [
                        for (final id in teams[t] ?? const <String>[])
                          if (members[id] case final m?)
                            Opacity(
                              opacity: m.connected ? 1 : 0.6,
                              child: Row(
                                children: [
                                  SAvatar(avatar: m.avatar, nick: m.nick, size: 26),
                                  const SizedBox(width: 6),
                                  Expanded(
                                    child: Align(
                                      alignment: Alignment.centerLeft,
                                      child: view.performerId == id
                                          ? _Underlined(name(id), style: row)
                                          : Text(name(id), style: row, maxLines: 1, overflow: TextOverflow.ellipsis),
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Text('${view.score(id)}', style: row),
                                ],
                              ),
                            ),
                      ],
                    ),
                  ],
                ),
              ),
          ],
        ),
      );
    }

    final ranked = _ranking(view);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: C.panel2,
        border: Border.all(color: C.ink, width: 2),
        borderRadius: BorderRadius.circular(18),
      ),
      child: VStack(
        gap: 6,
        children: [
          Text(trUpper(SPlay.scoreboardRound(SPlay.round(view.round, view.totalRounds))), style: _boxTitle),
          VStack(
            gap: 6,
            children: [
              for (final id in ranked)
                if (members[id] case final m?)
                  Builder(
                    builder: (context) {
                      final rank = 1 + ranked.indexWhere((x) => view.score(x) == view.score(id));
                      final style = T.b(14, color: id == meId ? C.yellow : C.text, weight: FontWeight.w800);
                      return Opacity(
                        opacity: m.connected ? 1 : 0.6,
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Flexible(child: Text('$rank. ${name(id)}', style: style)),
                            const SizedBox(width: 10),
                            Text('${view.score(id)}', style: style),
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

/// Sırası gelen takım oyuncusu: `text-decoration: underline 3px; text-underline-offset: 3px`
/// (çizgi taban çizgisinin 3px altından başlar, 3px kalın, yazı genişliğinde).
class _Underlined extends StatelessWidget {
  const _Underlined(this.text, {required this.style});
  final String text;
  final TextStyle style;

  @override
  Widget build(BuildContext context) {
    final tp = TextPainter(
      text: TextSpan(text: text, style: style),
      textDirection: TextDirection.ltr,
      textScaler: MediaQuery.textScalerOf(context),
      maxLines: 1,
    )..layout();
    final baseline = tp.computeDistanceToActualBaseline(TextBaseline.alphabetic);
    tp.dispose();
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Text(text, style: style, maxLines: 1, overflow: TextOverflow.ellipsis),
        Positioned(
          left: 0,
          right: 0,
          top: baseline + 3,
          height: 3,
          child: ColoredBox(color: style.color ?? C.ink2),
        ),
      ],
    );
  }
}

/// `.fs-howto`: kesikli üst çizgi, numaralı adımlar.
class _HowTo extends StatelessWidget {
  const _HowTo();

  @override
  Widget build(BuildContext context) => CustomPaint(
    painter: const _DashedTop(color: C.violet),
    child: Padding(
      padding: const EdgeInsets.only(top: bw + 18),
      child: VStack(
        gap: 12,
        children: [
          Text(trUpper(SHowto.title), style: _boxTitle),
          VStack(
            gap: 12,
            children: [
              for (var i = 0; i < SHowto.steps.length; i++)
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 28,
                      height: 28,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: C.yellow,
                        shape: BoxShape.circle,
                        border: Border.all(color: C.ink, width: 2),
                      ),
                      child: Text('${i + 1}', style: T.d(14, color: C.ink2)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(SHowto.steps[i].$1, style: T.d(17, color: C.text, height: 1.2)),
                          const SizedBox(height: 2),
                          Text(SHowto.steps[i].$2, style: T.b(14, color: C.text2)),
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
