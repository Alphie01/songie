import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../shared/models.dart';
import '../../shared/text.dart';
import '../../ui/icons.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/game_module.dart';
import '../kit/kit.dart';
import 'models.dart';
import 'settings_panel.dart';
import 'strings.dart';

/// Sunucudaki PODIUM_MS (8 sn); CSS `.tb-end-bar > span { animation: tb-end-bar 8s }`.
const _podiumMs = 8000;

const _checkSvg =
    '<svg width="26" height="26" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" '
    'stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7" /></svg>';

const _banSvg =
    '<svg width="15" height="15" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" '
    'stroke-width="3" stroke-linecap="round"><circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" /></svg>';

/// `.tb-hint`
final _tbHint = T.b(13, color: C.text3, weight: FontWeight.w700);

/// Flex `gap`: boşluk her öğenin arasına girer (`.tb-end-spacer` dahil).
List<Widget> _gapped(double gap, List<Widget> items) {
  final out = <Widget>[];
  for (final w in items) {
    if (out.isNotEmpty) out.add(SizedBox(height: gap));
    out.add(w);
  }
  return out;
}

/// games/taboo/client/PlayView.tsx (tasarım: Tabu.dc.html, Sonuclar.dc.html)
class TabooPlayView extends StatefulWidget {
  const TabooPlayView({super.key, required this.props});
  final PlayViewProps props;

  @override
  State<TabooPlayView> createState() => _TabooPlayViewState();
}

class _TabooPlayViewState extends State<TabooPlayView> {
  String? _error;

  Future<void> _send(Json action) async {
    setState(() => _error = null);
    final res = await widget.props.act(action);
    if (!res.ok && mounted) setState(() => _error = res.error);
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.props;
    final view = TabooView.fromJson(p.view);
    final members = membersOf(p.room);
    String nick(String id) => id == p.meId ? SPlay.you : (members[id]?.nick ?? '?');
    String realNick(String id) => members[id]?.nick ?? '?';
    final isHost = p.room.hostId == p.meId;

    if (view.phase == 'podium') return _Podium(view: view, members: members, meId: p.meId, code: p.room.code);

    final g = Layout.gutter(context);
    // `.tb`: en fazla 440 + 2×gutter, 72px üst / 22px alt, min-height 100dvh, gap 12
    final minContent = viewportHeight(context) - 72 - 22;
    final top = Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Flexible(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
            decoration: BoxDecoration(color: C.yellow, border: Border.all(color: C.ink, width: bw), borderRadius: BorderRadius.circular(R.pill)),
            child: Text(SPlay.pill(SPlay.turn(view.turnNumber, view.totalTurns)), style: T.d(16, color: C.ink2, height: 1.2)),
          ),
        ),
        const SizedBox(width: 8),
        Text(p.room.code, style: T.b(13, color: C.text3, weight: FontWeight.w800, letterSpacing: 2)),
      ],
    );
    final error = _error == null ? null : Semantics(liveRegion: true, child: ErrorText(_error!, center: true));

    Widget main;
    if (view.phase == 'ready') {
      main = ConstrainedBox(
        constraints: BoxConstraints(minHeight: minContent),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: _gapped(12, [
            top,
            _Scores(view: view),
            _Ready(view: view, meId: p.meId, isHost: isHost, nick: nick, members: members, send: _send, props: p),
            ?error,
          ]),
        ),
      );
    } else {
      // `.tb-turn { flex: 1 }` ve `.tb-stage { flex: 1 1 auto }`: sahne ekranın kalanını doldurur.
      main = ConstrainedBox(
        constraints: BoxConstraints(minHeight: minContent),
        child: IntrinsicHeight(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: _gapped(12, [
              top,
              _Scores(view: view),
              Expanded(child: _Turn(view: view, realNick: realNick, send: _send)),
              ?error,
            ]),
          ),
        ),
      );
    }

    return Align(
      alignment: Alignment.topCenter,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: Layout.col + 2 * g),
        child: Padding(padding: EdgeInsets.fromLTRB(g, 72, g, 22), child: main),
      ),
    );
  }
}

// ---------------------------------------------------------------- Skorlar

class _Scores extends StatelessWidget {
  const _Scores({required this.view});
  final TabooView view;

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
              angle: deg(active ? -1 : 0),
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

/// `.tb-btn` ve türleri: basınca 3px iner; gölgeli olanların gölgesi 1px'e düşer.
class _Btn extends StatelessWidget {
  const _Btn({
    required this.label,
    required this.onTap,
    required this.background,
    required this.foreground,
    this.minHeight = 52,
    this.radius = 16,
    this.shadow = 0,
    this.fontSize = 18,
    this.leading,
  });
  final String label;
  final VoidCallback? onTap;
  final Color background;
  final Color foreground;
  final double minHeight;
  final double radius;
  final double shadow;
  final double fontSize;
  final Widget? leading;

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
          transform: Matrix4.translationValues(0, pressed ? 3 : 0, 0),
          constraints: BoxConstraints(minHeight: minHeight),
          padding: const EdgeInsets.symmetric(horizontal: 12),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: background,
            border: Border.all(color: C.ink, width: bw),
            borderRadius: BorderRadius.circular(radius),
            boxShadow: shadow > 0 ? hardShadow(0, pressed ? 1 : shadow) : null,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (leading != null) ...[leading!, const SizedBox(width: 10)],
              Flexible(child: Text(label, style: T.d(fontSize, color: foreground, height: 1.1), textAlign: TextAlign.center)),
            ],
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------- Hazırlık (tur arası)

class _Ready extends StatelessWidget {
  const _Ready({required this.view, required this.meId, required this.isHost, required this.nick, required this.members, required this.send, required this.props});
  final TabooView view;
  final String meId;
  final bool isHost;
  final String Function(String id) nick;
  final Map<String, RoomPlayer> members;
  final Future<void> Function(Json a) send;
  final PlayViewProps props;

  @override
  Widget build(BuildContext context) {
    final mine = view.narratorId == meId;
    final last = view.lastTurn;
    return VStack(
      gap: 12,
      children: [
        // `.tb-next`: margin 6px 0, kesikli mor çerçeve
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: TbDashed(
            radius: 28,
            background: C.panel,
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 22),
            child: Column(
              children: [
                Text(SPlay.nextLabel, style: T.b(14, color: C.text3, weight: FontWeight.w800), textAlign: TextAlign.center),
                const SizedBox(height: 6),
                Text(nick(view.narratorId), style: T.d(48, color: teamColor(view.team), height: 0.95), textAlign: TextAlign.center),
                const SizedBox(height: 6),
                Text(S.team[view.team]!, style: T.b(15, color: C.text2, weight: FontWeight.w700), textAlign: TextAlign.center),
              ],
            ),
          ),
        ),
        if (mine) ...[
          _Btn(
            label: SPlay.startMine,
            leading: const SIcon('play', size: 22, color: C.ink2),
            background: C.mint,
            foreground: C.ink2,
            minHeight: 70,
            radius: 22,
            shadow: 6,
            fontSize: 26,
            onTap: () => send({'type': 'start'}),
          ),
          Text(SPlay.startMineHint, style: _tbHint, textAlign: TextAlign.center),
        ] else ...[
          Text(SPlay.waitNarrator(nick(view.narratorId)), style: _tbHint, textAlign: TextAlign.center),
          if (isHost)
            Grid2(
              columnGap: 8,
              equalHeight: true,
              children: [
                _Btn(
                  label: SPlay.startForThem(nick(view.narratorId)),
                  background: C.paper,
                  foreground: C.ink2,
                  shadow: 4,
                  onTap: () => send({'type': 'start'}),
                ),
                _Btn(label: SPlay.skipNarrator, background: C.panel, foreground: C.text, onTap: () => send({'type': 'skipNarrator'})),
              ],
            ),
        ],
        if (last != null) _LastTurn(summary: last, nick: nick),
        _Rosters(view: view, members: members, meId: meId),
        if (isHost) _SettingsBox(props: props),
      ],
    );
  }
}

class _LastTurn extends StatelessWidget {
  const _LastTurn({required this.summary, required this.nick});
  final TurnSummary summary;
  final String Function(String id) nick;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    decoration: BoxDecoration(color: C.panel2, border: Border.all(color: C.ink, width: bw), borderRadius: BorderRadius.circular(20)),
    child: VStack(
      gap: 8,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Flexible(child: Text(SPlay.lastTurn(S.team[summary.team]!, summary.points), style: T.d(18, color: C.text, height: 1.45))),
            const SizedBox(width: 8),
            Text(nick(summary.narratorId), style: T.b(13, color: C.text3, weight: FontWeight.w800)),
          ],
        ),
        if (summary.cards.isEmpty)
          Text(SPlay.noCards, style: _tbHint, textAlign: TextAlign.center)
        else
          VStack(
            gap: 6,
            children: [
              for (final c in summary.cards)
                Row(
                  children: [
                    Semantics(
                      label: SPlay.stats[c.result],
                      child: Container(
                        width: 24,
                        height: 24,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: c.result == 'correct' ? C.mint : (c.result == 'taboo' ? C.red : C.paper),
                          border: Border.all(color: C.ink, width: 2),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: SIcon(c.result == 'correct' ? 'check' : (c.result == 'taboo' ? 'x' : 'skip'), size: 14, color: C.ink2),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(c.word, style: T.b(14, color: C.text, weight: FontWeight.w800)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        c.taboo.join(', '),
                        style: T.b(12, color: C.text3, weight: FontWeight.w700),
                        maxLines: 1,
                        softWrap: false,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
            ],
          ),
      ],
    ),
  );
}

/// `.tb-settings`: oyun sırasında oda sahibinin açılır ayar kartı.
class _SettingsBox extends StatefulWidget {
  const _SettingsBox({required this.props});
  final PlayViewProps props;

  @override
  State<_SettingsBox> createState() => _SettingsBoxState();
}

class _SettingsBoxState extends State<_SettingsBox> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    final p = widget.props;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
      decoration: BoxDecoration(color: C.panel2, border: Border.all(color: C.ink, width: bw), borderRadius: BorderRadius.circular(20)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Pressable(
            onTap: () => setState(() => _open = !_open),
            label: SPlay.settingsTitle,
            selected: _open,
            builder: (context, _) => Container(
              constraints: const BoxConstraints(minHeight: 44),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(SPlay.settingsTitle, style: T.d(18, color: C.text, height: 1.45)),
                  Transform.rotate(angle: _open ? math.pi : 0, child: const SIcon('chevron', size: 16, color: C.text)),
                ],
              ),
            ),
          ),
          if (_open) ...[
            const SizedBox(height: 10),
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: TabooSettingsPanel(
                props: SettingsPanelProps(
                  settings: p.settings,
                  editable: p.room.hostId == p.meId,
                  api: p.api,
                  players: p.room.players,
                  meId: p.meId,
                  section: 'secondary',
                  onChange: (n) => p.setSettings(n),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------- Tur

class _Turn extends StatelessWidget {
  const _Turn({required this.view, required this.realNick, required this.send});
  final TabooView view;
  final String Function(String id) realNick;
  final Future<void> Function(Json a) send;

  @override
  Widget build(BuildContext context) {
    final card = view.card;
    final narrator = realNick(view.narratorId);
    final headline = switch (view.role) {
      'narrator' => SPlay.headNarrator(narrator),
      'guesser' => SPlay.guess(narrator),
      'watcher' => SPlay.headWatcher(narrator),
      _ => SPlay.headSpectator(narrator),
    };
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: _gapped(12, [
        Remaining(
          serverNow: view.serverNow,
          endsAt: view.endsAt,
          builder: (context, remaining) {
            final secs = (remaining / 1000).ceil();
            return Row(
              children: [
                Semantics(label: SPlay.timeLeft(secs), child: _TimerNum(secs: secs, low: remaining < 10000)),
                const SizedBox(width: 10),
                Expanded(child: _Bar(fraction: view.durationMs > 0 ? remaining / view.durationMs : 0)),
              ],
            );
          },
        ),
        Text(headline, style: T.b(15, color: C.text2, weight: FontWeight.w800), textAlign: TextAlign.center),
        Expanded(child: _Stage(view: view)),
        // `.tb-stats`
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            for (final (i, k) in const ['correct', 'pass', 'taboo'].indexed) ...[
              if (i > 0) const SizedBox(width: 16),
              Text(
                '${SPlay.stats[k]} ${view.turnStats[k]}',
                style: T.b(14, color: k == 'correct' ? C.mint : (k == 'taboo' ? C.red : C.text), weight: FontWeight.w800),
              ),
            ],
          ],
        ),
        if (view.role == 'narrator' && card != null)
          VStack(
            gap: 8,
            children: [
              _Btn(
                label: SPlay.correct,
                leading: SSvg(_checkSvg, width: 26, height: 26, color: C.ink2),
                background: C.mint,
                foreground: C.ink2,
                minHeight: 70,
                radius: 22,
                shadow: 6,
                fontSize: 26,
                onTap: () => send({'type': 'correct', 'cardId': card.id}),
              ),
              Grid2(
                columnGap: 8,
                equalHeight: true,
                children: [
                  _Btn(
                    label: SPlay.pass(view.passesLeft),
                    background: C.paper,
                    foreground: C.ink2,
                    shadow: 4,
                    onTap: view.passesLeft != null && view.passesLeft! <= 0 ? null : () => send({'type': 'pass', 'cardId': card.id}),
                  ),
                  _Btn(label: SPlay.undo, background: C.panel, foreground: C.text, onTap: view.canUndo ? () => send({'type': 'undo'}) : null),
                ],
              ),
            ],
          ),
        if (view.role == 'watcher' && card != null)
          VStack(
            gap: 8,
            children: [
              _Btn(
                label: SPlay.taboo,
                background: C.red,
                foreground: C.ink2,
                minHeight: 92,
                radius: 24,
                shadow: 7,
                fontSize: 40,
                onTap: () => send({'type': 'taboo', 'cardId': card.id}),
              ),
              Text(SPlay.tabooHint, style: _tbHint, textAlign: TextAlign.center),
            ],
          ),
      ]),
    );
  }
}

/// `.tb-timer-num`: 44px, sarı; son 10 sn kırmızı ve saniyenin ikinci yarısında 0.55 saydam (`steps(1)`).
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
      child: Text('${widget.secs}', style: T.d(30, color: widget.low ? C.red : C.yellow), maxLines: 1, softWrap: false),
    );
    if (!widget.low || reduced) return text;
    return AnimatedBuilder(animation: _tick, child: text, builder: (context, child) => Opacity(opacity: _tick.value >= 0.5 ? 0.55 : 1, child: child));
  }
}

/// `.tb-timer-bar`: 14px, 2px çerçeve, içi 200ms doğrusal kayar.
class _Bar extends StatelessWidget {
  const _Bar({required this.fraction});
  final double fraction;

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
          child: const ColoredBox(color: C.yellow),
        ),
      ),
    ),
  );
}

/// Çocuğun ortasını kutunun (fx, fy) oranındaki noktaya koyar; isteğe bağlı sabit genişlik ve oransal yükseklik
/// (CSS `position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%)`).
class _PlaceDelegate extends SingleChildLayoutDelegate {
  const _PlaceDelegate({required this.fx, required this.fy, this.width, this.heightFactor});
  final double fx;
  final double fy;
  final double? width;
  final double? heightFactor;

  @override
  BoxConstraints getConstraintsForChild(BoxConstraints constraints) {
    final h = heightFactor == null ? null : constraints.maxHeight * heightFactor!;
    return BoxConstraints(minWidth: width ?? 0, maxWidth: width ?? double.infinity, minHeight: h ?? 0, maxHeight: h ?? double.infinity);
  }

  @override
  Offset getPositionForChild(Size size, Size childSize) => Offset(size.width * fx - childSize.width / 2, size.height * fy - childSize.height / 2);

  @override
  bool shouldRelayout(_PlaceDelegate old) => old.fx != fx || old.fy != fy || old.width != width || old.heightFactor != heightFactor;
}

/// `.tb-stage`: en az 300px, 34px dikey iç boşluk; kart ortada, arkada pembe ve mavi kartlar, üstte olay damgası.
class _Stage extends StatelessWidget {
  const _Stage({required this.view});
  final TabooView view;

  @override
  Widget build(BuildContext context) {
    final card = view.card;
    final flash = view.flash;
    Widget content;
    if (card != null) {
      content = _CardView(card: card);
    } else if (view.role == 'guesser') {
      content = _GuessBox(
        children: [
          Text(SPlay.guessedLabel, style: T.b(14, color: C.text3, weight: FontWeight.w800), textAlign: TextAlign.center),
          Text('${view.turnStats['correct']}', style: T.d(110, color: C.mint, height: 0.9)),
          Text(SPlay.guessHint, style: T.b(15, color: C.text2, weight: FontWeight.w700), textAlign: TextAlign.center),
        ],
      );
    } else {
      content = _GuessBox(children: [Text(SPlay.spectator, style: T.b(15, color: C.text2, weight: FontWeight.w700), textAlign: TextAlign.center)]);
    }
    Widget back(Color color, double rotate) => Positioned.fill(
      child: CustomSingleChildLayout(
        delegate: const _PlaceDelegate(fx: 0.5, fy: 0.5, width: 290, heightFactor: 0.92),
        child: Transform.rotate(
          angle: deg(rotate),
          child: DecoratedBox(
            decoration: BoxDecoration(color: color, border: Border.all(color: C.ink, width: bw), borderRadius: BorderRadius.circular(28)),
          ),
        ),
      ),
    );
    return ConstrainedBox(
      constraints: const BoxConstraints(minHeight: 300),
      child: Stack(
        alignment: Alignment.center,
        clipBehavior: Clip.none,
        children: [
          if (card != null) ...[back(C.pink, 6), back(C.sky, -5)],
          Padding(padding: const EdgeInsets.symmetric(vertical: 34), child: content),
          if (flash != null)
            Positioned.fill(
              child: IgnorePointer(
                child: CustomSingleChildLayout(
                  delegate: const _PlaceDelegate(fx: 0.5, fy: 0.4),
                  child: Semantics(
                    liveRegion: true,
                    child: _Keyframes(
                      key: ValueKey(flash.id),
                      duration: const Duration(milliseconds: 900),
                      frames: const [(0, 0, 0.8), (0.15, 1, 1), (0.75, 1, 1), (1, 0, 1)],
                      child: Transform.rotate(
                        angle: deg(-8),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                          decoration: BoxDecoration(
                            color: flash.kind == 'pass' ? C.paper : (flash.kind == 'taboo' ? C.red : C.mint),
                            border: Border.all(color: C.ink, width: bw),
                            borderRadius: BorderRadius.circular(18),
                            boxShadow: hardShadow(6, 6),
                          ),
                          child: Text(SPlay.flash[flash.kind] ?? '', style: T.d(38, color: C.ink2, height: 1.45), maxLines: 1, softWrap: false),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// `.tb-guess`: kartı görmeyenler için kesikli mor kutu (300px'e kadar).
class _GuessBox extends StatelessWidget {
  const _GuessBox({required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => ConstrainedBox(
    constraints: const BoxConstraints(maxWidth: 300),
    child: SizedBox(
      width: double.infinity,
      child: TbDashed(
        radius: 28,
        background: C.panel,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 26),
        child: VStack(gap: 10, crossAxisAlignment: CrossAxisAlignment.center, children: children),
      ),
    ),
  );
}

/// Sarı kart: kelime ve yasaklı beş kelime.
class _CardView extends StatelessWidget {
  const _CardView({required this.card});
  final TabooCard card;

  @override
  Widget build(BuildContext context) {
    final body = Transform.rotate(
      angle: deg(-1.5),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 300),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: C.yellow,
            border: Border.all(color: C.ink, width: bw),
            borderRadius: BorderRadius.circular(28),
            boxShadow: hardShadow(8, 8),
          ),
          child: VStack(
            gap: 10,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 14),
                decoration: BoxDecoration(color: C.paper, border: Border.all(color: C.ink, width: bw), borderRadius: BorderRadius.circular(18)),
                child: Text(card.word, style: T.d(40, color: C.ink2), textAlign: TextAlign.center),
              ),
              VStack(
                gap: 10,
                children: [
                  for (final t in card.taboo)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(color: C.ink2, borderRadius: BorderRadius.circular(12)),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          SSvg(_banSvg, width: 15, height: 15, color: tbBan),
                          const SizedBox(width: 8),
                          Flexible(child: Text(t, style: T.b(17, color: C.text, weight: FontWeight.w800), textAlign: TextAlign.center)),
                        ],
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
    if (MediaQuery.disableAnimationsOf(context)) return body;
    // `tb-card-in 220ms ease-out`: saydam, 10px aşağıda, 0.97 ölçekten
    return EnterAnim(
      key: ValueKey(card.id),
      animKey: card.id,
      duration: const Duration(milliseconds: 220),
      curve: Curves.easeOut,
      dy: 10,
      scale: 0.97,
      child: body,
    );
  }
}

/// CSS anahtar kareleri (saydamlık + ölçek); her aralık ease-out, sonda kalır (`forwards`).
/// Azaltılmış harekette `animation: none`: damga olduğu gibi görünür.
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

// ---------------------------------------------------------------- Takım kartları

class _Rosters extends StatelessWidget {
  const _Rosters({required this.view, required this.members, required this.meId, this.end = false});
  final TabooView view;
  final Map<String, RoomPlayer> members;
  final String meId;

  /// Oyun sonunda: mor panel, takım adı renkli ve büyük harf.
  final bool end;

  @override
  Widget build(BuildContext context) => Grid2(
    columnGap: 10,
    equalHeight: true,
    children: [
      for (final t in teamIds)
        Semantics(
          container: true,
          label: S.team[t],
          child: Container(
            padding: EdgeInsets.all(end ? 12 : 10),
            decoration: BoxDecoration(
              color: end ? C.panel : teamColor(t),
              border: Border.all(color: C.ink, width: bw),
              borderRadius: BorderRadius.circular(18),
            ),
            child: VStack(
              gap: end ? 8 : 6,
              children: [
                Text(
                  end ? trUpper(S.team[t]!) : S.team[t]!,
                  style: end ? T.b(13, color: teamColor(t), weight: FontWeight.w800, height: 1.2) : T.d(16, color: C.ink2, height: 1.2),
                ),
                VStack(
                  gap: end ? 8 : 6,
                  children: [
                    for (final id in view.teams[t] ?? const <String>[])
                      if (members[id] case final m?)
                        Opacity(
                          opacity: m.connected ? 1 : 0.6,
                          child: Row(
                            children: [
                              SAvatar(avatar: m.avatar, nick: m.nick, size: end ? 28 : 26),
                              SizedBox(width: end ? 8 : 6),
                              Expanded(
                                child: Text(
                                  '${m.nick}${id == meId ? ' (${SPlay.you})' : ''}',
                                  style: T.b(end ? 15 : 14, color: end ? C.text : C.ink2, weight: FontWeight.w800),
                                  maxLines: 1,
                                  softWrap: false,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              if (!end && view.narratorId == id && view.team == t) ...[
                                const SizedBox(width: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                  decoration: BoxDecoration(color: C.ink2, borderRadius: BorderRadius.circular(6)),
                                  child: Text(SPlay.narrating, style: T.b(10, color: C.yellow, weight: FontWeight.w800), maxLines: 1, softWrap: false),
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
        ),
    ],
  );
}

// ---------------------------------------------------------------- Oyun sonu

class _Podium extends StatelessWidget {
  const _Podium({required this.view, required this.members, required this.meId, required this.code});
  final TabooView view;
  final Map<String, RoomPlayer> members;
  final String meId;
  final String code;

  @override
  Widget build(BuildContext context) {
    final g = Layout.gutter(context);
    final maxW = Layout.col + 2 * g;
    final vh = viewportHeight(context);
    final a = view.scores['a'] ?? 0;
    final b = view.scores['b'] ?? 0;
    final winner = a == b ? null : (a > b ? 'a' : 'b');
    final order = winner == 'b' ? const ['b', 'a'] : const ['a', 'b'];
    final reduced = MediaQuery.disableAnimationsOf(context);

    Widget card(String t, bool first) {
      final box = Transform.rotate(
        angle: deg(first ? -3 : 2),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: teamColor(t),
            border: Border.all(color: C.ink, width: 4),
            borderRadius: BorderRadius.circular(26),
            boxShadow: first ? hardShadow(6, 6) : null,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (first) SSvg(crownSvg, width: 40, height: 28),
              Padding(
                padding: EdgeInsets.only(top: first ? 0 : 10),
                child: Text('${view.scores[t]}', style: T.d(first ? 64 : 52, color: C.ink2)),
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
            Text(code, style: T.b(13, color: C.text3, weight: FontWeight.w800, letterSpacing: 2)),
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
              Expanded(child: card(order[0], winner != null)),
              const SizedBox(width: 12),
              Center(child: Text('–', style: T.d(30, color: C.text3, height: 1.45))),
              const SizedBox(width: 12),
              Expanded(child: card(order[1], false)),
            ],
          ),
        ),
        _Rosters(view: view, members: members, meId: meId, end: true),
        const Spacer(),
        Column(
          children: [
            // `.tb-end-bar { width: 100% }`: kit EndBar ortalı sütunda kendi dolgusu kadar daralır.
            SizedBox(width: double.infinity, child: reduced ? const _FullBar() : const EndBar(durationMs: _podiumMs)),
            const SizedBox(height: 10),
            Text(SPodium.back, style: T.b(14, color: C.text2, weight: FontWeight.w800)),
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
