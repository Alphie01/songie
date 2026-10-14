import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../shared/models.dart';
import '../../shared/text.dart';
import '../../ui/icons.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/game_module.dart';
import '../kit/kit.dart';
import 'kind_icon.dart';
import 'models.dart';
import 'settings_panel.dart';
import 'strings.dart';

/// Sunucu oyun sonunu 8 sn gösterir (server/game.ts PODIUM_MS); CSS `ch-podium-fill 8s`.
const _podiumMs = 8000;

const _resultIcon = <String, String>{'correct': 'check', 'pass': 'skip', 'foul': 'x'};

const _gestureSvg =
    '<svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" '
    'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5" /><path d="M12 7V3M17 12h4" /></svg>';

/// `.ch-note`
final _note = T.b(13, color: C.text3, weight: FontWeight.w700);

typedef _Send = Future<void> Function(Json action);

/// Flex `gap`: boşluk her öğenin arasına girer (`.ch-podium-spacer` dahil).
List<Widget> _gapped(double gap, List<Widget> items) {
  final out = <Widget>[];
  for (final w in items) {
    if (out.isNotEmpty) out.add(SizedBox(height: gap));
    out.add(w);
  }
  return out;
}

/// games/charades/client/PlayView.tsx
class CharadesPlayView extends StatefulWidget {
  const CharadesPlayView({super.key, required this.props});
  final PlayViewProps props;

  @override
  State<CharadesPlayView> createState() => _CharadesPlayViewState();
}

class _CharadesPlayViewState extends State<CharadesPlayView> {
  String? _error;

  Future<void> _send(Json action) async {
    setState(() => _error = null);
    final res = await widget.props.act(action);
    if (!res.ok && mounted) setState(() => _error = res.error);
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.props;
    final view = CharadesView.fromJson(p.view);
    final members = membersOf(p.room);
    String nick(String id) => id == p.meId ? SPlay.you : (members[id]?.nick ?? '?');
    String rawNick(String id) => members[id]?.nick ?? '?';
    final isHost = p.room.hostId == p.meId;

    if (view.phase == 'podium') return _Podium(view: view, members: members, meId: p.meId, code: p.room.code);

    final g = Layout.gutter(context);
    // `.ch-col` yan boşluğu öğe öğe verilir: işaret şeridi (`.ch-strip`) kenardan kenara uzanır.
    Widget pad(Widget w) => Padding(padding: EdgeInsets.symmetric(horizontal: g), child: w);

    final top = Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Flexible(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
            decoration: BoxDecoration(color: C.yellow, border: Border.all(color: C.ink, width: bw), borderRadius: BorderRadius.circular(R.pill)),
            child: Text(
              '${S.name} · ${SPlay.turn(view.turnNumber, view.totalTurns)}',
              style: T.d(16, color: C.ink2, height: 1.2),
              maxLines: 1,
              softWrap: false,
            ),
          ),
        ),
        const SizedBox(width: 10),
        Text(p.room.code, style: T.b(13, color: C.text3, weight: FontWeight.w800, letterSpacing: 2)),
      ],
    );

    final List<Widget> phase;
    if (view.phase == 'ready') {
      phase = _ready(view: view, meId: p.meId, isHost: isHost, nick: nick, rawNick: rawNick, members: members, pad: pad);
    } else {
      phase = _turn(view: view, nick: rawNick, pad: pad, gutter: g);
    }

    // `.ch-screen`: sütun, gap 12, min-height 100dvh, 72px üst / 22px alt; sahne (`flex: 1 1 auto`) kalanı alır.
    final screen = Padding(
      padding: const EdgeInsets.only(top: 72, bottom: 22),
      child: ConstrainedBox(
        constraints: BoxConstraints(minHeight: viewportHeight(context) - 72 - 22),
        child: IntrinsicHeight(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: _gapped(12, [
              pad(top),
              pad(_Scores(view: view)),
              ...phase,
              if (_error != null) pad(Semantics(liveRegion: true, child: ErrorText(_error!, center: true))),
            ]),
          ),
        ),
      ),
    );

    // `.ch-more`: takımlar, ayarlar, nasıl oynanır; gap 14, altta 32px.
    final more = Padding(
      padding: EdgeInsets.fromLTRB(g, 0, g, 32),
      child: VStack(
        gap: 14,
        children: [
          _Rosters(view: view, members: members, meId: p.meId),
          _Box(
            child: CharadesSettingsPanel(
              props: SettingsPanelProps(
                settings: p.settings,
                editable: isHost,
                api: p.api,
                players: p.room.players,
                meId: p.meId,
                section: 'secondary',
                onChange: (n) => p.setSettings(n),
              ),
            ),
          ),
          const _HowTo(),
        ],
      ),
    );

    return Align(
      alignment: Alignment.topCenter,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: Layout.col + 2 * g),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [screen, more]),
      ),
    );
  }

  List<Widget> _ready({
    required CharadesView view,
    required String meId,
    required bool isHost,
    required String Function(String id) nick,
    required String Function(String id) rawNick,
    required Map<String, RoomPlayer> members,
    required Widget Function(Widget w) pad,
  }) {
    final mine = view.narratorId == meId;
    final narrator = members[view.narratorId];
    final last = view.lastTurn;
    return [
      // `.ch-stage.ch-stage-ready`
      Expanded(
        child: pad(
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: _gapped(16, [
                _NextCard(
                  view: view,
                  narrator: narrator,
                  name: mine ? '${narrator?.nick ?? ''} (${SPlay.you})' : rawNick(view.narratorId),
                ),
                if (last != null) _LastTurn(summary: last, nick: nick),
              ]),
            ),
          ),
        ),
      ),
      pad(
        mine
            ? VStack(
                gap: 8,
                children: [
                  _Btn.go(label: SPlay.startMine, onTap: () => _send({'type': 'start'})),
                  Text(SPlay.startMineHint, style: _note, textAlign: TextAlign.center),
                ],
              )
            : VStack(
                gap: 8,
                children: [
                  Text(SPlay.waitNarrator(rawNick(view.narratorId)), style: _note, textAlign: TextAlign.center),
                  if (isHost)
                    Grid2(
                      columnGap: 8,
                      equalHeight: true,
                      children: [
                        _Btn.light(label: SPlay.startForThem(rawNick(view.narratorId)), onTap: () => _send({'type': 'start'})),
                        _Btn.panel(label: SPlay.skipNarrator, onTap: () => _send({'type': 'skipNarrator'})),
                      ],
                    ),
                ],
              ),
      ),
    ];
  }

  List<Widget> _turn({required CharadesView view, required String Function(String id) nick, required Widget Function(Widget w) pad, required double gutter}) {
    final card = view.card;
    final headline = switch (view.role) {
      'narrator' => SPlay.headlineNarrator,
      'watcher' => SPlay.headlineWatcher,
      'guesser' => SPlay.guess(nick(view.narratorId)),
      _ => '${nick(view.narratorId)} ${SPlay.narrating}',
    };
    return [
      pad(
        Remaining(
          serverNow: view.serverNow,
          endsAt: view.endsAt,
          builder: (context, remaining) {
            final low = remaining < 10000;
            return Row(
              children: [
                _TimerNum(secs: (remaining / 1000).ceil(), low: low),
                const SizedBox(width: 10),
                Expanded(child: _Bar(fraction: view.durationMs > 0 ? remaining / view.durationMs : 0, low: low)),
              ],
            );
          },
        ),
      ),
      pad(Text(headline, style: T.b(15, color: C.text2, weight: FontWeight.w800), textAlign: TextAlign.center)),
      // `.ch-stage`
      Expanded(
        child: pad(
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [card != null ? _TitleCard(card: card, flash: view.flash) : _GuessBox(view: view)],
            ),
          ),
        ),
      ),
      // `.ch-stats`
      pad(
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            for (final (i, k) in const ['correct', 'pass', 'foul'].indexed) ...[
              if (i > 0) const SizedBox(width: 16),
              DefaultTextStyle.merge(
                style: T.b(14, color: k == 'correct' ? C.mint : (k == 'foul' ? C.red : C.text), weight: FontWeight.w800),
                child: Row(mainAxisSize: MainAxisSize.min, children: [Text(SPlay.stats[k]!), const SizedBox(width: 4), Text('${view.turnStats[k]}')]),
              ),
            ],
          ],
        ),
      ),
      _SignStrip(view: view, gutter: gutter, send: _send),
      if (view.role == 'narrator' && card != null)
        pad(
          VStack(
            gap: 8,
            children: [
              _Btn.go(label: SPlay.correct, onTap: () => _send({'type': 'correct', 'cardId': card.id})),
              Grid2(
                columnGap: 8,
                equalHeight: true,
                children: [
                  _Btn.light(
                    label: SPlay.pass(view.passesLeft),
                    onTap: view.passesLeft != null && view.passesLeft! <= 0 ? null : () => _send({'type': 'pass', 'cardId': card.id}),
                  ),
                  _Btn.panel(label: SPlay.undo, onTap: view.canUndo ? () => _send({'type': 'undo'}) : null),
                ],
              ),
            ],
          ),
        ),
      if (view.role == 'watcher' && card != null)
        pad(
          VStack(
            gap: 8,
            children: [
              _Btn.foul(label: SPlay.foul, onTap: () => _send({'type': 'foul', 'cardId': card.id})),
              Text(SPlay.foulHint(view.foulPenalty), style: _note, textAlign: TextAlign.center),
            ],
          ),
        ),
    ];
  }
}

// ---------------------------------------------------------------- Skorlar

class _Scores extends StatelessWidget {
  const _Scores({required this.view});
  final CharadesView view;

  @override
  Widget build(BuildContext context) => Grid2(
    columnGap: 10,
    equalHeight: true,
    children: [
      for (final t in teamIds)
        Builder(
          builder: (context) {
            final active = view.team == t;
            final fg = active ? C.ink2 : C.text;
            return Transform.rotate(
              angle: deg(active ? 1 : 0),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: active ? teamColor(t) : C.panel,
                  border: Border.all(color: C.ink, width: bw),
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: active ? hardShadow(0, 4) : null,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Flexible(
                      child: Text(
                        '${S.team[t]}${view.myTeam == t ? ' (${SPlay.you})' : ''}',
                        style: T.b(13, color: fg, weight: FontWeight.w800),
                        maxLines: 1,
                        softWrap: false,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text('${view.scores[t]}', style: T.d(26, color: fg)),
                  ],
                ),
              ),
            );
          },
        ),
    ],
  );
}

// ---------------------------------------------------------------- Düğme

/// `.ch-btn` ve türleri: basınca 3px (go/foul 5px) iner; gölgeli olanların gölgesi 1px'e düşer.
class _Btn extends StatelessWidget {
  const _Btn({
    required this.label,
    required this.onTap,
    required this.background,
    required this.foreground,
    this.minHeight = 50,
    this.radius = 16,
    this.shadow = 0,
    this.pressY = 3,
    this.fontSize = 18,
  });

  const _Btn.go({required String label, required VoidCallback? onTap})
    : this(label: label, onTap: onTap, background: C.mint, foreground: C.ink2, minHeight: 68, radius: 22, shadow: 6, pressY: 5, fontSize: 26);
  const _Btn.light({required String label, required VoidCallback? onTap}) : this(label: label, onTap: onTap, background: C.paper, foreground: C.ink2, shadow: 4);
  const _Btn.panel({required String label, required VoidCallback? onTap}) : this(label: label, onTap: onTap, background: C.panel, foreground: C.text);
  const _Btn.foul({required String label, required VoidCallback? onTap})
    : this(label: label, onTap: onTap, background: C.red, foreground: C.ink2, minHeight: 88, radius: 24, shadow: 7, pressY: 5, fontSize: 36);

  final String label;
  final VoidCallback? onTap;
  final Color background;
  final Color foreground;
  final double minHeight;
  final double radius;
  final double shadow;
  final double pressY;
  final double fontSize;

  @override
  Widget build(BuildContext context) {
    final enabled = onTap != null;
    final duration = MediaQuery.disableAnimationsOf(context) ? Duration.zero : const Duration(milliseconds: 80);
    return Opacity(
      opacity: enabled ? 1 : 0.5,
      child: Pressable(
        onTap: onTap,
        label: label,
        builder: (context, pressed) => AnimatedContainer(
          duration: duration,
          transform: Matrix4.translationValues(0, pressed ? pressY : 0, 0),
          constraints: BoxConstraints(minHeight: minHeight),
          padding: const EdgeInsets.symmetric(horizontal: 10),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: background,
            border: Border.all(color: C.ink, width: bw),
            borderRadius: BorderRadius.circular(radius),
            boxShadow: shadow > 0 ? hardShadow(0, pressed ? 1 : shadow) : null,
          ),
          child: Text(label, style: T.d(fontSize, color: foreground, height: 1.1), textAlign: TextAlign.center),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------- Hazırlık

/// `.ch-next`: sıradaki anlatıcı kartı (beyaz, −1.5°, 310px'e kadar).
class _NextCard extends StatelessWidget {
  const _NextCard({required this.view, required this.narrator, required this.name});
  final CharadesView view;
  final RoomPlayer? narrator;
  final String name;

  @override
  Widget build(BuildContext context) => Transform.rotate(
    angle: deg(-1.5),
    child: ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 310),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: C.paper,
          border: Border.all(color: C.ink, width: bw),
          borderRadius: BorderRadius.circular(28),
          boxShadow: hardShadow(8, 8),
        ),
        child: VStack(
          gap: 10,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(color: C.ink2, borderRadius: BorderRadius.circular(R.pill)),
              child: Text(SPlay.next, style: T.b(14, color: C.yellow, weight: FontWeight.w800)),
            ),
            if (narrator != null) SAvatar(avatar: narrator!.avatar, nick: narrator!.nick, size: 64),
            Text(name, style: T.d(36, color: C.ink2), textAlign: TextAlign.center),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(color: teamColor(view.team), border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(R.pill)),
              child: Text(S.team[view.team]!, style: T.b(14, color: C.ink2, weight: FontWeight.w800)),
            ),
          ],
        ),
      ),
    ),
  );
}

/// Son tur özeti.
class _LastTurn extends StatelessWidget {
  const _LastTurn({required this.summary, required this.nick});
  final TurnSummary summary;
  final String Function(String id) nick;

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(color: C.panel, border: Border.all(color: C.ink, width: bw), borderRadius: BorderRadius.circular(18)),
    child: VStack(
      gap: 8,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Flexible(
              child: Text(SPlay.lastTurn(S.team[summary.team]!, summary.points), style: T.b(13, color: teamColor(summary.team), weight: FontWeight.w800)),
            ),
            const SizedBox(width: 8),
            Text(nick(summary.narratorId), style: T.b(13, color: C.text3, weight: FontWeight.w800)),
          ],
        ),
        if (summary.cards.isEmpty)
          Text(SPlay.noCards, style: T.b(13, color: C.text3, weight: FontWeight.w700))
        else
          VStack(
            gap: 6,
            children: [
              for (final c in summary.cards)
                Row(
                  children: [
                    Container(
                      width: 24,
                      height: 24,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: c.result == 'correct' ? C.mint : (c.result == 'foul' ? C.red : C.yellow),
                        border: Border.all(color: C.ink, width: 2),
                        shape: BoxShape.circle,
                      ),
                      child: SIcon(_resultIcon[c.result] ?? 'skip', size: 14, color: C.ink2),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        c.title,
                        style: T.b(15, color: c.result == 'pass' ? C.text3 : C.text, weight: FontWeight.w800).copyWith(
                          decoration: c.result == 'pass' ? TextDecoration.lineThrough : null,
                          decorationColor: C.text3,
                        ),
                        maxLines: 1,
                        softWrap: false,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Semantics(label: S.kind[c.kind], child: KindIcon(kind: c.kind, size: 16, stroke: 2.4, color: C.text3)),
                  ],
                ),
            ],
          ),
      ],
    ),
  );
}

// ---------------------------------------------------------------- Tur

/// `.ch-timer-num`: 44px, sarı; son 10 sn kırmızı ve saniyenin ikinci yarısında 1.12 büyür (`steps(1)`).
class _TimerNum extends StatefulWidget {
  const _TimerNum({required this.secs, required this.low});
  final int secs;
  final bool low;

  @override
  State<_TimerNum> createState() => _TimerNumState();
}

class _TimerNumState extends State<_TimerNum> with SingleTickerProviderStateMixin {
  late final AnimationController _tick = AnimationController(vsync: this, duration: const Duration(seconds: 1));

  @override
  void initState() {
    super.initState();
    _sync();
  }

  @override
  void didUpdateWidget(_TimerNum old) {
    super.didUpdateWidget(old);
    if (old.low != widget.low) _sync();
  }

  void _sync() {
    if (widget.low) {
      _tick.repeat();
    } else {
      _tick
        ..stop()
        ..value = 0;
    }
  }

  @override
  void dispose() {
    _tick.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reduced = MediaQuery.disableAnimationsOf(context);
    final text = SizedBox(
      width: 44,
      child: Text(
        '${widget.secs}',
        style: T.d(30, color: widget.low ? C.red : C.yellow).copyWith(fontFeatures: const [FontFeature.tabularFigures()]),
        maxLines: 1,
        softWrap: false,
      ),
    );
    if (!widget.low || reduced) return text;
    return AnimatedBuilder(animation: _tick, child: text, builder: (context, child) => Transform.scale(scale: _tick.value >= 0.5 ? 1.12 : 1, child: child));
  }
}

/// `.ch-timer-bar`: 14px, 2px çerçeve; son 10 sn kırmızı.
class _Bar extends StatelessWidget {
  const _Bar({required this.fraction, required this.low});
  final double fraction;
  final bool low;

  @override
  Widget build(BuildContext context) => Container(
    height: 14,
    decoration: BoxDecoration(color: C.ink2, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(R.pill)),
    child: ClipRRect(
      borderRadius: BorderRadius.circular(R.pill),
      child: Align(
        alignment: Alignment.centerLeft,
        child: AnimatedFractionallySizedBox(
          duration: MediaQuery.disableAnimationsOf(context) ? Duration.zero : const Duration(milliseconds: 200),
          widthFactor: fraction.clamp(0.0, 1.0),
          heightFactor: 1,
          child: ColoredBox(color: low ? C.red : C.yellow),
        ),
      ),
    ),
  );
}

/// Anlatıcı ve rakip için kart: tür işareti, kelime sayısı ve kelimeler numaralı.
class _TitleCard extends StatelessWidget {
  const _TitleCard({required this.card, required this.flash});
  final CharadesCard card;
  final Flash? flash;

  @override
  Widget build(BuildContext context) {
    final words = card.title.split(RegExp(r'\s+')).where((w) => w.isNotEmpty).toList();
    final longest = words.fold<int>(0, (m, w) => math.max(m, w.length));
    final size = card.title.length > 28 || longest > 12 ? 26.0 : (card.title.length > 16 || longest > 9 ? 32.0 : 40.0);
    var n = 0;
    final wordWidgets = <Widget>[];
    for (final w in words) {
      final counts = countsAsWord(w);
      if (counts) n++;
      wordWidgets.add(
        Stack(
          clipBehavior: Clip.none,
          children: [
            Padding(padding: const EdgeInsets.only(right: 10), child: Text(w, style: T.d(size, color: C.ink2), textAlign: TextAlign.center)),
            if (counts)
              Positioned(
                top: -12,
                right: -4,
                child: Container(
                  width: 22,
                  height: 22,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(color: C.pink, border: Border.all(color: C.ink, width: 2), shape: BoxShape.circle),
                  child: Text('$n', style: T.d(13, color: C.ink2)),
                ),
              ),
          ],
        ),
      );
    }
    final f = flash;
    final body = Transform.rotate(
      angle: deg(-1.5),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 310),
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: C.paper,
                border: Border.all(color: C.ink, width: bw),
                borderRadius: BorderRadius.circular(28),
                boxShadow: hardShadow(8, 8),
              ),
              child: VStack(
                gap: 16,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Flexible(
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(color: C.ink2, borderRadius: BorderRadius.circular(R.pill)),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              KindIcon(kind: card.kind, size: 16, stroke: 2.6, color: C.yellow),
                              const SizedBox(width: 6),
                              Flexible(
                                child: Text(S.kind[card.kind] ?? card.kind, style: T.b(14, color: C.yellow, weight: FontWeight.w800), maxLines: 1, overflow: TextOverflow.ellipsis),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(color: C.yellow, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(R.pill)),
                        child: Text(S.words(card.words), style: T.b(14, color: C.ink2, weight: FontWeight.w800)),
                      ),
                    ],
                  ),
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Semantics(
                      label: card.title,
                      child: ExcludeSemantics(
                        child: Wrap(alignment: WrapAlignment.center, spacing: 10, runSpacing: 12, children: wordWidgets),
                      ),
                    ),
                  ),
                  // `.ch-gesture`: 2px kesikli mürekkep çerçeve
                  CustomPaint(
                    foregroundPainter: DashedRRectPainter(color: C.ink, radius: 14, strokeWidth: 2),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12 + 2, vertical: 10 + 2),
                      decoration: BoxDecoration(color: C.paper2, borderRadius: BorderRadius.circular(14)),
                      child: Row(
                        children: [
                          SSvg(_gestureSvg, width: 22, height: 22, color: C.ink2),
                          const SizedBox(width: 10),
                          Expanded(child: Text(SPlay.gesture(S.kindGesture[card.kind] ?? ''), style: T.b(14, color: C.ink2, weight: FontWeight.w800))),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            if (f != null)
              Positioned(
                top: -16,
                left: 0,
                right: 0,
                child: IgnorePointer(
                  child: Center(
                    child: _Keyframes(
                      key: ValueKey(f.id),
                      duration: const Duration(milliseconds: 1400),
                      frames: const [(0, 0, 0.7), (0.15, 1, 1), (0.7, 1, 1), (1, 0, 1)],
                      child: Transform.rotate(
                        angle: deg(-3),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                          decoration: BoxDecoration(
                            color: f.kind == 'foul' ? C.red : (f.kind == 'pass' ? C.yellow : C.mint),
                            border: Border.all(color: C.ink, width: bw),
                            borderRadius: BorderRadius.circular(R.pill),
                          ),
                          child: Text(SPlay.flash[f.kind] ?? '', style: T.b(14, color: C.ink2, weight: FontWeight.w800), maxLines: 1, softWrap: false),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
    if (MediaQuery.disableAnimationsOf(context)) return body;
    // `ch-card-in 260ms ease-out`: saydam, −6° ve 0.92 ölçekten
    return EnterAnim(
      key: ValueKey(card.id),
      animKey: card.id,
      duration: const Duration(milliseconds: 260),
      curve: Curves.easeOut,
      rotate: -4.5,
      scale: 0.92,
      child: body,
    );
  }
}

/// `.ch-guess`: başlığı görmeyenler için kesikli kutu; işaret balonu ve olay yazısı.
class _GuessBox extends StatelessWidget {
  const _GuessBox({required this.view});
  final CharadesView view;

  @override
  Widget build(BuildContext context) {
    final sign = view.sign;
    final flash = view.flash;
    final reduced = MediaQuery.disableAnimationsOf(context);
    Widget? signPill;
    if (sign != null) {
      final pill = Transform.rotate(
        angle: deg(-3),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          decoration: BoxDecoration(
            color: C.yellow,
            border: Border.all(color: C.ink, width: bw),
            borderRadius: BorderRadius.circular(R.pill),
            boxShadow: Shadows.sm,
          ),
          child: Text(
            SPlay.signShown(sign.sign, sign.kind == null ? null : S.kind[sign.kind], sign.words),
            style: T.d(18, color: C.ink2, height: 1.45),
            maxLines: 1,
            softWrap: false,
          ),
        ),
      );
      signPill = reduced
          ? pill
          : EnterAnim(key: ValueKey(sign.id), animKey: sign.id, duration: const Duration(milliseconds: 240), curve: Curves.easeOut, scale: 0.6, child: pill);
    }
    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 300),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          SizedBox(
            width: double.infinity,
            child: ChDashed(
              radius: 28,
              background: C.panel,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 26),
              child: VStack(
                gap: 10,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Text(trUpper(SPlay.guessCount), style: T.b(14, color: C.text3, weight: FontWeight.w800), textAlign: TextAlign.center),
                  Text('${view.turnStats['correct']}', style: T.d(110, color: C.mint, height: 0.9)),
                  Text(view.role == 'guesser' ? SPlay.guessHint : SPlay.spectator, style: T.b(15, color: C.text2, weight: FontWeight.w700), textAlign: TextAlign.center),
                  if (flash != null)
                    _Keyframes(
                      key: ValueKey(flash.id),
                      duration: const Duration(milliseconds: 1400),
                      frames: const [(0, 0, 0.7), (0.2, 1, 1), (0.7, 1, 1), (1, 0, 1)],
                      child: Text(
                        SPlay.flash[flash.kind] ?? '',
                        style: T.d(22, color: flash.kind == 'foul' ? C.red : (flash.kind == 'pass' ? C.yellow : C.mint), height: 1.45),
                      ),
                    ),
                ],
              ),
            ),
          ),
          if (signPill != null)
            Positioned(top: -30, left: 0, right: 0, child: IgnorePointer(child: Semantics(liveRegion: true, child: Center(child: signPill)))),
        ],
      ),
    );
  }
}

/// Klasik işaretler şeridi: anlatıcı dokunur, herkesin ekranında son işaret yanar. Kenardan kenara kayar.
class _SignStrip extends StatelessWidget {
  const _SignStrip({required this.view, required this.gutter, required this.send});
  final CharadesView view;
  final double gutter;
  final _Send send;

  @override
  Widget build(BuildContext context) {
    final narrator = view.role == 'narrator' && view.card != null;
    final pills = <Widget>[];
    for (final id in signs) {
      final on = view.sign?.sign == id;
      final pill = Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(color: on ? C.yellow : C.panel, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(R.pill)),
        child: Text(SPlay.signsShort[id]!, style: T.b(12, color: on ? C.ink2 : C.text, weight: FontWeight.w800), maxLines: 1, softWrap: false),
      );
      if (pills.isNotEmpty) pills.add(const SizedBox(width: 6));
      pills.add(
        narrator
            ? Semantics(
                hint: SPlay.signsTap,
                child: Pressable(onTap: () => send({'type': 'sign', 'sign': id}), label: SPlay.signsShort[id], selected: on, builder: (context, _) => pill),
              )
            : pill,
      );
    }
    return Semantics(
      container: true,
      label: SPlay.signsLabel,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: EdgeInsets.symmetric(horizontal: gutter),
        child: Row(children: pills),
      ),
    );
  }
}

/// CSS anahtar kareleri (saydamlık + ölçek); her aralık ease-out, sonda kalır (`forwards`).
/// Azaltılmış harekette `animation: none`: öğe olduğu gibi görünür.
class _Keyframes extends StatefulWidget {
  const _Keyframes({super.key, required this.duration, required this.frames, required this.child});
  final Duration duration;

  /// (zaman 0–1, saydamlık, ölçek)
  final List<(double, double, double)> frames;
  final Widget child;

  @override
  State<_Keyframes> createState() => _KeyframesState();
}

class _KeyframesState extends State<_Keyframes> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: widget.duration)..forward();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  (double, double) _at(double t) {
    final f = widget.frames;
    for (var i = 0; i < f.length - 1; i++) {
      final a = f[i];
      final b = f[i + 1];
      if (t <= b.$1) {
        final span = b.$1 - a.$1;
        final k = span <= 0 ? 1.0 : Curves.easeOut.transform(((t - a.$1) / span).clamp(0.0, 1.0));
        return (a.$2 + (b.$2 - a.$2) * k, a.$3 + (b.$3 - a.$3) * k);
      }
    }
    return (f.last.$2, f.last.$3);
  }

  @override
  Widget build(BuildContext context) {
    if (MediaQuery.disableAnimationsOf(context)) return widget.child;
    return AnimatedBuilder(
      animation: _c,
      child: widget.child,
      builder: (context, child) {
        final (o, s) = _at(_c.value);
        return Opacity(opacity: o.clamp(0.0, 1.0), child: Transform.scale(scale: s, child: child));
      },
    );
  }
}

// ---------------------------------------------------------------- Alt bölüm

/// `.ch-box`
class _Box extends StatelessWidget {
  const _Box({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    decoration: BoxDecoration(color: C.panel2, border: Border.all(color: C.ink, width: bw), borderRadius: BorderRadius.circular(20)),
    child: child,
  );
}

class _Rosters extends StatelessWidget {
  const _Rosters({required this.view, required this.members, required this.meId});
  final CharadesView view;
  final Map<String, RoomPlayer> members;
  final String meId;

  @override
  Widget build(BuildContext context) {
    final podium = view.phase == 'podium';
    return Grid2(
      columnGap: 10,
      equalHeight: true,
      children: [
        for (final t in teamIds)
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: C.panel, border: Border.all(color: C.ink, width: bw), borderRadius: BorderRadius.circular(18)),
            child: VStack(
              gap: 8,
              children: [
                // h2: Baloo 13px, takım renginde, büyük harf; oyun sonunda puan gizli
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Flexible(child: Text(trUpper(S.team[t]!), style: T.d(13, color: teamColor(t), height: 1.05))),
                    if (!podium) Text('${view.scores[t]}', style: T.d(13, color: teamColor(t), height: 1.05)),
                  ],
                ),
                VStack(
                  gap: 8,
                  children: [
                    for (final id in view.teams[t] ?? const <String>[])
                      if (members[id] case final m?)
                        Opacity(
                          opacity: m.connected ? 1 : 0.6,
                          child: Row(
                            children: [
                              SAvatar(avatar: m.avatar, nick: m.nick, size: 28, dim: !m.connected),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  '${m.nick}${id == meId ? ' (${SPlay.you})' : ''}',
                                  style: T.b(15, color: C.text, weight: FontWeight.w800),
                                  maxLines: 1,
                                  softWrap: false,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              if (!podium && view.narratorId == id && view.team == t) ...[
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                  decoration: BoxDecoration(color: C.ink2, borderRadius: BorderRadius.circular(6)),
                                  child: Text(SPlay.narrating, style: T.b(10, color: C.yellow, weight: FontWeight.w800)),
                                ),
                              ],
                            ],
                          ),
                        ),
                  ],
                ),
              ],
            ),
          ),
      ],
    );
  }
}

/// `.ch-box.ch-howto`: adımlar ve klasik işaretler.
class _HowTo extends StatelessWidget {
  const _HowTo();

  @override
  Widget build(BuildContext context) => _Box(
    child: VStack(
      gap: 10,
      children: [
        Text(SHowTo.title, style: T.d(18, color: C.text, height: 1.05)),
        VStack(
          gap: 12,
          children: [
            for (var i = 0; i < SHowTo.steps.length; i++)
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 26,
                    height: 26,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(color: C.yellow, border: Border.all(color: C.ink, width: 2), shape: BoxShape.circle),
                    child: Text('${i + 1}', style: T.d(14, color: C.ink2, height: 1.45)),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(SHowTo.steps[i].$1, style: T.d(15, color: C.text, height: 1.05)),
                        const SizedBox(height: 2),
                        Text(SHowTo.steps[i].$2, style: T.b(14, color: C.text2)),
                      ],
                    ),
                  ),
                ],
              ),
          ],
        ),
        Padding(padding: const EdgeInsets.only(top: 6), child: Text(SHowTo.signsTitle, style: T.d(18, color: C.text, height: 1.05))),
        VStack(
          gap: 10,
          children: [
            for (final (title, body) in SHowTo.signs)
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: T.b(14, color: C.yellow, weight: FontWeight.w800)),
                  const SizedBox(height: 2),
                  Text(body, style: T.b(14, color: C.text2)),
                ],
              ),
          ],
        ),
      ],
    ),
  );
}

// ---------------------------------------------------------------- Oyun sonu

class _Podium extends StatefulWidget {
  const _Podium({required this.view, required this.members, required this.meId, required this.code});
  final CharadesView view;
  final Map<String, RoomPlayer> members;
  final String meId;
  final String code;

  @override
  State<_Podium> createState() => _PodiumState();
}

class _PodiumState extends State<_Podium> {
  @override
  void initState() {
    super.initState();
    // Web: useEffect(() => window.scrollTo(0, 0), [])
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final position = Scrollable.maybeOf(context)?.position;
      if (position != null && position.pixels != 0) position.jumpTo(0);
    });
  }

  @override
  Widget build(BuildContext context) {
    final view = widget.view;
    final g = Layout.gutter(context);
    final maxW = Layout.col + 2 * g;
    final vh = viewportHeight(context);
    final a = view.scores['a'] ?? 0;
    final b = view.scores['b'] ?? 0;
    final winner = a == b ? null : (a > b ? 'a' : 'b');
    final order = winner == 'b' ? const ['b', 'a'] : const ['a', 'b'];
    final reduced = MediaQuery.disableAnimationsOf(context);

    Widget card(String t, bool first) {
      final win = winner == t;
      final box = Transform.rotate(
        angle: deg(first ? -3 : 2),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: teamColor(t),
            border: Border.all(color: C.ink, width: 4),
            borderRadius: BorderRadius.circular(26),
            boxShadow: win ? Shadows.lg : null,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (win) SSvg(crownSvg, width: 40, height: 28),
              Padding(
                padding: EdgeInsets.only(top: win ? 0 : 10),
                child: Text('${view.scores[t]}', style: T.d(win ? 64 : 52, color: C.ink2)),
              ),
              Text(S.team[t]!, style: T.b(14, color: C.ink2, weight: FontWeight.w800), textAlign: TextAlign.center),
            ],
          ),
        ),
      );
      return first ? box : Align(alignment: Alignment.bottomCenter, child: box);
    }

    final column = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: _gapped(18, [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(S.name, style: T.b(13, color: C.text3, weight: FontWeight.w800)),
            Text(widget.code, style: T.b(13, color: C.text3, weight: FontWeight.w800, letterSpacing: 2)),
          ],
        ),
        Padding(
          padding: const EdgeInsets.only(top: 18),
          child: Column(
            children: [
              const EndSticker(SPodium.title),
              const SizedBox(height: 6 + 8),
              Text(
                winner != null ? '${S.team[winner]}\n${SPodium.won}' : SPodium.draw,
                style: T.d(48, color: C.text, height: 0.95),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(child: card(order[0], true)),
              const SizedBox(width: 12),
              Center(child: Text('–', style: T.d(30, color: C.text3, height: 1.45))),
              const SizedBox(width: 12),
              Expanded(child: card(order[1], false)),
            ],
          ),
        ),
        _Rosters(view: view, members: widget.members, meId: widget.meId),
        const Spacer(),
        Column(
          children: [
            // `.ch-podium-bar { width: 100% }`: kit EndBar ortalı sütunda kendi dolgusu kadar daralır.
            SizedBox(width: double.infinity, child: reduced ? const _FullBar() : const EndBar(durationMs: _podiumMs)),
            const SizedBox(height: 10),
            Semantics(liveRegion: true, child: Text(SPodium.back, style: T.b(14, color: C.text2, weight: FontWeight.w800))),
          ],
        ),
      ]),
    );

    return ConstrainedBox(
      constraints: BoxConstraints(minHeight: vh),
      child: Stack(
        children: [
          Positioned.fill(
            child: Align(
              alignment: Alignment.topCenter,
              child: ConstrainedBox(constraints: BoxConstraints(maxWidth: maxW), child: const Confetti(top: 102)),
            ),
          ),
          Align(
            alignment: Alignment.topCenter,
            child: ConstrainedBox(
              constraints: BoxConstraints(maxWidth: maxW),
              child: Padding(
                padding: EdgeInsets.fromLTRB(g, 72, g, 24),
                child: ConstrainedBox(
                  constraints: BoxConstraints(minHeight: vh - 72 - 24),
                  child: IntrinsicHeight(child: column),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Azaltılmış hareket: `animation: none` → çubuk dolu.
class _FullBar extends StatelessWidget {
  const _FullBar();
  @override
  Widget build(BuildContext context) => Container(
    height: 12,
    decoration: BoxDecoration(color: C.panel2, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(R.pill)),
    child: ClipRRect(borderRadius: BorderRadius.circular(R.pill), child: const SizedBox.expand(child: ColoredBox(color: C.yellow))),
  );
}
