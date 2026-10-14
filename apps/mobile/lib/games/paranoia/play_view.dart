import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';

import '../../shared/models.dart';
import '../../shared/text.dart';
import '../../ui/icons.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/game_module.dart';
import '../kit/kit.dart';
import 'models.dart';
import 'strings.dart';

part 'envelope.dart';
part 'fill_column.dart';
part 'phases.dart';
part 'summary.dart';

typedef _Send = Future<bool> Function(Json action);

int _nowMs() => DateTime.now().millisecondsSinceEpoch;

/// `.pr-label` (h2: Baloo 2, 12px, 1.5px aralık, büyük harf).
final _label = T.d(12, color: C.text3, height: 1.05, letterSpacing: 1.5);

/// `.pr-h`
final _h = T.d(22, color: C.text, height: 1.1);

/// `.pr-hint`
final _hint = T.b(12, color: C.text3, weight: FontWeight.w700, height: 1.4);

/// Oyuncu adları ve avatarları: odadan ayrılanlar da adlarıyla görünür.
class _Who {
  _Who(this.members, this.names);
  final Map<String, RoomPlayer> members;
  final Map<String, String> names;

  String nick(String id) => members[id]?.nick ?? names[id] ?? '?';
  bool inRoom(String id) => members.containsKey(id);
  RoomPlayer player(String id) =>
      members[id] ??
      RoomPlayer(
        id: id,
        nick: nick(id),
        avatar: const Avatar(color: 'paper'),
        connected: false,
        ready: false,
      );
}

/// games/paranoia/client/PlayView.tsx
class ParanoiaPlayView extends StatefulWidget {
  const ParanoiaPlayView({super.key, required this.props});
  final PlayViewProps props;

  @override
  State<ParanoiaPlayView> createState() => _ParanoiaPlayViewState();
}

class _ParanoiaPlayViewState extends State<ParanoiaPlayView> {
  String? _error;
  late int _offset;
  late final Timer _timer;

  int get _serverNow => asJson(widget.props.view).integer('serverNow');

  @override
  void initState() {
    super.initState();
    _offset = _serverNow - _nowMs();
    // `useServerNow`: 250ms'de bir sunucu saatine göre "şimdi".
    _timer = Timer.periodic(const Duration(milliseconds: 250), (_) => mounted ? setState(() {}) : null);
  }

  @override
  void didUpdateWidget(ParanoiaPlayView old) {
    super.didUpdateWidget(old);
    final sn = _serverNow;
    if (asJson(old.props.view).integer('serverNow') != sn) _offset = sn - _nowMs();
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  Future<bool> _send(Json action) async {
    setState(() => _error = null);
    final res = await widget.props.act(action);
    if (!res.ok && mounted) setState(() => _error = res.error);
    return res.ok;
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.props;
    final view = ParanoiaView.fromJson(p.view);
    final settings = ParanoiaSettings.fromJson(p.settings);
    final isHost = p.room.hostId == p.meId;
    final who = _Who(membersOf(p.room), view.names);
    final now = _nowMs() + _offset;
    final summary = view.phase == 'summary';
    final revealing = view.phase == 'reveal';
    final label = revealing ? SPlay.progress(view.revealed.length, view.revealTotal) : SPlay.progress(math.min(view.answered + 1, view.total), view.total);

    final Widget? phase = switch (view.phase) {
      'pickFirst' => _PickFirst(view: view, isHost: isHost, who: who, send: _send),
      'asking' when view.myTurn => _MyTurn(key: ValueKey(view.seq), view: view, now: now, meId: p.meId, settings: settings, who: who, send: _send),
      'asking' => _Waiting(view: view, now: now, isHost: isHost, who: who, send: _send),
      'reveal' when view.revealed.isNotEmpty => _Reveal(view: view, meId: p.meId, isHost: isHost, settings: settings, who: who, send: _send),
      _ => null,
    };

    // Masaüstündeki yan sütunlar (oyuncular, ayarlar) telefonda gizli; oyuncular ortada (`.sg-mobile-only`).
    final g = Layout.gutter(context);
    return GameColumn(
      maxWidth: Layout.col + 2 * g,
      bottom: 24,
      child: _FillColumn(
        minHeight: viewportHeight(context) - 72 - 24,
        gap: 12,
        children: [
          if (summary)
            _Summary(view: view, now: now, isHost: isHost, code: p.room.code, who: who, send: _send)
          else ...[
            _Top(label: label, code: p.room.code),
            revealing
                ? _Progress(done: view.revealed.length - 1, total: view.revealTotal, label: label)
                : _Progress(done: view.answered, total: view.total, label: label),
            if (phase != null) _Grow(child: phase),
          ],
          if (_error != null) ErrorText(_error!, center: true),
          if (!summary)
            Padding(
              padding: const EdgeInsets.only(top: 16),
              child: _Roster(view: view, meId: p.meId, who: who),
            ),
        ],
      ),
    );
  }
}

/// `.pr-top`: nane hap (oyun · ilerleme) + oda kodu.
class _Top extends StatelessWidget {
  const _Top({required this.label, required this.code});
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
            color: C.mint,
            border: Border.all(color: C.ink, width: bw),
            borderRadius: BorderRadius.circular(R.pill),
          ),
          child: Text('${S.name} · $label', style: T.d(16, color: C.ink2, height: 1.2)),
        ),
      ),
      const SizedBox(width: 10),
      Text(
        code,
        style: T.b(13, color: C.text3, weight: FontWeight.w800, letterSpacing: 2),
      ),
    ],
  );
}

/// `.pr-progress`: her soru bir parça (bitti: nane, şimdiki: sarı).
class _Progress extends StatelessWidget {
  const _Progress({required this.done, required this.total, required this.label});
  final int done;
  final int total;
  final String label;

  @override
  Widget build(BuildContext context) => Semantics(
    label: label,
    child: Row(
      children: [
        for (var i = 0; i < total; i++) ...[
          if (i > 0) const SizedBox(width: 4),
          Expanded(
            child: Container(
              height: 8,
              decoration: BoxDecoration(color: i == done ? C.yellow : (i < done ? C.mint : C.panel), borderRadius: BorderRadius.circular(R.pill)),
            ),
          ),
        ],
      ],
    ),
  );
}

/// `.pr-timer`: kalan süre çubuğu (8 sn kala kırmızı) + saniye.
class _Countdown extends StatelessWidget {
  const _Countdown({required this.endsAt, required this.now, required this.durationMs});
  final int endsAt;
  final int now;
  final int durationMs;

  @override
  Widget build(BuildContext context) {
    final left = math.max(0, endsAt - now);
    final secs = (left / 1000).ceil();
    final low = left < 8000;
    final reduce = MediaQuery.disableAnimationsOf(context);
    return Row(
      children: [
        Expanded(
          child: Container(
            height: 8,
            clipBehavior: Clip.antiAlias,
            alignment: Alignment.centerLeft,
            decoration: BoxDecoration(color: C.bg, borderRadius: BorderRadius.circular(R.pill)),
            child: AnimatedFractionallySizedBox(
              duration: reduce ? Duration.zero : const Duration(milliseconds: 250),
              widthFactor: durationMs > 0 ? (left / durationMs).clamp(0.0, 1.0) : 0,
              heightFactor: 1,
              child: ColoredBox(color: low ? C.red : C.yellow),
            ),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          SPlay.secondsLeft(secs),
          style: T.b(13, color: low ? C.red : C.text, weight: FontWeight.w800).copyWith(fontFeatures: const [FontFeature.tabularFigures()]),
        ),
      ],
    );
  }
}

/// `.pr-roster`: oyuncular (soruyu alan sarı, bağlantısı kopan etiketli).
class _Roster extends StatelessWidget {
  const _Roster({required this.view, required this.meId, required this.who});
  final ParanoiaView view;
  final String meId;
  final _Who who;

  @override
  Widget build(BuildContext context) {
    final picked = {for (final x in view.stats) x.playerId: x.picked};
    return VStack(
      gap: 8,
      children: [
        Text(trUpper(SPlay.players), style: _label),
        VStack(
          gap: 6,
          children: [
            for (final id in view.players)
              Builder(
                builder: (context) {
                  final p = who.player(id);
                  final thinking = view.phase == 'asking' && view.holderId == id && id != meId;
                  final fg = thinking ? C.ink2 : C.text;
                  final tag = T.b(11, color: fg, weight: FontWeight.w800);
                  return Container(
                    constraints: const BoxConstraints(minHeight: 44),
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    decoration: BoxDecoration(
                      color: thinking ? C.yellow : C.panel,
                      border: Border.all(color: C.ink, width: 2),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Row(
                      children: [
                        SAvatar(avatar: p.avatar, nick: p.nick, size: 28, dim: !p.connected),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Align(
                            alignment: Alignment.centerLeft,
                            child: Text.rich(
                              TextSpan(
                                text: p.nick,
                                children: [
                                  if (id == meId)
                                    TextSpan(
                                      text: ' (${S.you})',
                                      style: T.b(14, color: fg.withValues(alpha: 0.75), weight: FontWeight.w700),
                                    ),
                                ],
                              ),
                              style: T.b(14, color: fg, weight: FontWeight.w800),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ),
                        if (thinking) ...[const SizedBox(width: 8), Text(SPlay.thinking, style: tag)],
                        if (!p.connected && who.inRoom(id)) ...[const SizedBox(width: 8), Text(SPlay.offline, style: tag)],
                        if (view.phase == 'summary') ...[
                          const SizedBox(width: 8),
                          Text(
                            '${picked[id] ?? 0}',
                            style: T.b(14, color: C.yellow, weight: FontWeight.w800),
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
    );
  }
}

/// Oyuncu seçici: iki sütunlu avatar düğmeleri; seçilemeyenler sönük.
class _Picker extends StatelessWidget {
  const _Picker({required this.ids, required this.choices, required this.selected, required this.onSelect, required this.who, this.notes});
  final List<String> ids;
  final List<String> choices;
  final String? selected;
  final void Function(String id) onSelect;
  final _Who who;
  final Map<String, String>? notes;

  @override
  Widget build(BuildContext context) => Grid2(
    rowGap: 8,
    columnGap: 8,
    equalHeight: true,
    children: [
      for (final id in ids)
        Builder(
          builder: (context) {
            final p = who.player(id);
            final ok = choices.contains(id);
            final checked = selected == id;
            final note = notes?[id];
            final fg = checked ? C.ink2 : C.text;
            return Opacity(
              opacity: ok ? 1 : 0.45,
              child: Pressable(
                onTap: ok ? () => onSelect(id) : null,
                label: p.nick,
                selected: checked,
                builder: (context, _) => Transform.rotate(
                  angle: checked ? deg(-1.5) : 0,
                  child: Container(
                    constraints: const BoxConstraints(minHeight: 52),
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    alignment: Alignment.centerLeft,
                    decoration: BoxDecoration(
                      color: checked ? C.mint : C.panel,
                      border: Border.all(color: C.ink, width: bw),
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: checked ? hardShadow(0, 3) : null,
                    ),
                    child: Row(
                      children: [
                        SAvatar(avatar: p.avatar, nick: p.nick, size: 34, dim: !p.connected),
                        const SizedBox(width: 10),
                        Flexible(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                p.nick,
                                style: T.d(17, color: fg, height: 1.15),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              if (note != null)
                                Text(
                                  note,
                                  style: T.b(11, color: fg, weight: FontWeight.w700),
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        ),
    ],
  );
}

/// `.pr-confirm`: büyük onay düğmesi (`data-on`: sarı; kapalı ve seçiliyken %60).
class _Confirm extends StatelessWidget {
  const _Confirm({required this.on, required this.onTap, required this.child});
  final bool on;
  final VoidCallback? onTap;
  final Widget child;

  @override
  Widget build(BuildContext context) => Opacity(
    opacity: onTap == null && on ? 0.6 : 1,
    child: Pressable(
      onTap: onTap,
      builder: (context, pressed) => Transform.translate(
        offset: Offset(0, pressed ? 5 : 0),
        child: Container(
          constraints: const BoxConstraints(minHeight: 62),
          padding: const EdgeInsets.symmetric(horizontal: 16),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: on ? C.yellow : C.panel,
            border: Border.all(color: C.ink, width: bw),
            borderRadius: BorderRadius.circular(20),
            boxShadow: hardShadow(0, pressed ? 1 : 6),
          ),
          child: DefaultTextStyle.merge(
            style: T.d(21, color: on ? C.ink2 : C.text3, height: 1.45),
            textAlign: TextAlign.center,
            child: child,
          ),
        ),
      ),
    ),
  );
}

/// `.pr-mine`: kendi gizli cevapların.
class _Mine extends StatelessWidget {
  const _Mine({required this.view, required this.who});
  final ParanoiaView view;
  final _Who who;

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    decoration: BoxDecoration(
      color: C.panel2,
      border: Border.all(color: C.ink, width: 2),
      borderRadius: BorderRadius.circular(16),
    ),
    child: VStack(
      gap: 6,
      children: [
        Text(trUpper(SPlay.mine), style: _label),
        VStack(
          gap: 6,
          children: [
            for (final m in view.mine)
              Text.rich(
                TextSpan(
                  text: '${m.question} → ',
                  children: [
                    TextSpan(
                      text: m.answerId != null ? who.nick(m.answerId!) : SPlay.passed,
                      style: T.b(14, color: C.yellow, weight: FontWeight.w800),
                    ),
                  ],
                ),
                style: T.b(14, color: C.text, weight: FontWeight.w700),
              ),
          ],
        ),
        Text(
          SPlay.mineHint,
          style: T.b(12, color: C.text3, weight: FontWeight.w700),
        ),
      ],
    ),
  );
}

/// `.pr-entries`: açılan soruların listesi.
class _EntryList extends StatelessWidget {
  const _EntryList({required this.entries, required this.who});
  final List<RevealedEntry> entries;
  final _Who who;

  @override
  Widget build(BuildContext context) => VStack(
    gap: 8,
    children: [
      for (final e in entries)
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: C.panel2,
            border: Border.all(color: C.ink, width: 2),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
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
                child: Text('${e.n}', style: T.d(14, color: C.ink2)),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      e.question,
                      style: T.b(14, color: C.text, weight: FontWeight.w800, height: 1.3),
                    ),
                    const SizedBox(height: 2),
                    Text.rich(
                      TextSpan(
                        text: '${SPlay.askedTo(who.nick(e.askedId))} → ',
                        children: [
                          TextSpan(
                            text: e.answerId != null ? who.nick(e.answerId!) : SPlay.noAnswer,
                            style: T.b(13, color: C.yellow, weight: FontWeight.w800),
                          ),
                        ],
                      ),
                      style: T.b(13, color: C.text3, weight: FontWeight.w700),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
    ],
  );
}

/// `.pr-big`
class _Big extends StatelessWidget {
  const _Big(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Text(
    text,
    style: T.d(30, color: C.text, height: 1.05),
    textAlign: TextAlign.center,
  );
}

/// `.pr-sub`: en fazla 290px.
class _Sub extends StatelessWidget {
  const _Sub(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => ConstrainedBox(
    constraints: const BoxConstraints(maxWidth: 290),
    child: Text(
      text,
      style: T.b(15, color: C.text2, weight: FontWeight.w700),
      textAlign: TextAlign.center,
    ),
  );
}

/// `.pr-secret-who`: sarı hap etiket.
class _WhoPill extends StatelessWidget {
  const _WhoPill(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
    decoration: BoxDecoration(color: C.yellow, borderRadius: BorderRadius.circular(R.pill)),
    child: Text(text, style: T.d(15, color: C.ink2, height: 1.45)),
  );
}

/// `.pr-secret`: koyu gizli soru kartı (−1°).
class _SecretCard extends StatelessWidget {
  const _SecretCard({required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Transform.rotate(
    angle: deg(-1),
    child: Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: C.ink2,
        border: Border.all(color: C.ink, width: bw),
        borderRadius: BorderRadius.circular(26),
        boxShadow: Shadows.lg,
      ),
      child: VStack(gap: 10, children: children),
    ),
  );
}
