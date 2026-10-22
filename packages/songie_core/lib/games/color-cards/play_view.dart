import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../shared/models.dart';
import '../../ui/icons.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../catalog.dart';
import '../kit/game_module.dart';
import '../kit/kit.dart';
import 'card_art.dart';
import 'models.dart';
import 'strings.dart';
import 'ui.dart';

part 'hand.dart';
part 'overlays.dart';
part 'panels.dart';
part 'podium.dart';

typedef _Send = Future<bool> Function(Json action);
typedef _Nick = String Function(String? id);

/// `.cc-hint`, `.cc-small`
final _hintStyle = T.b(14, color: C.text2, weight: FontWeight.w700);
final _smallStyle = T.b(13, color: C.text3, weight: FontWeight.w700);

/// games/color-cards/client/PlayView.tsx
class ColorCardsPlayView extends StatefulWidget {
  const ColorCardsPlayView({super.key, required this.props});
  final PlayViewProps props;

  @override
  State<ColorCardsPlayView> createState() => _ColorCardsPlayViewState();
}

class _ColorCardsPlayViewState extends State<ColorCardsPlayView> {
  String? _error;

  Future<bool> _send(Json action) async {
    setState(() => _error = null);
    try {
      final res = await widget.props.act(action);
      if (!res.ok && mounted) setState(() => _error = res.error);
      return res.ok;
    } catch (_) {
      if (mounted) setState(() => _error = SPlay.error);
      return false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.props;
    final view = ColorCardsView.fromJson(p.view);
    final members = membersOf(p.room);
    String nick(String? id) => id == null ? '?' : (members[id]?.nick ?? '?');
    final isHost = p.room.hostId == p.meId;

    if (view.phase == 'over') return _Podium(view: view, members: members, room: p.room);

    final mine = view.current == p.meId && view.inGame;
    final turnText = !view.inGame ? SPlay.spectator : (mine ? SPlay.yourTurn : SPlay.turnOf(nick(view.current)));
    final g = Layout.gutter(context);

    return Remaining(
      serverNow: view.serverNow,
      endsAt: view.endsAt,
      tick: const Duration(milliseconds: 250),
      builder: (context, remaining) {
        final catcher = _catch(view, p.meId, nick);
        return GameColumn(
          maxWidth: Layout.col + 2 * g,
          bottom: 24,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              VStack(
                gap: 12,
                children: [
                  _Top(text: turnText, mine: mine && view.phase != 'roundOver', round: view.mode == 'points' ? SPlay.round(view.round) : null, code: p.room.code),
                  _Seats(view: view, members: members, meId: p.meId),
                  _Table(view: view),
                  ?catcher,
                  if (view.phase == 'roundOver')
                    ...[if (view.roundResult != null) _RoundOver(view: view, result: view.roundResult!, nick: nick, remaining: remaining)]
                  else
                    _Status(view: view, meId: p.meId, isHost: isHost, nick: nick, members: members, remaining: remaining, send: _send),
                  if (view.inGame) _HandArea(view: view, meId: p.meId, nick: nick, send: _send),
                  if (_error != null) Semantics(liveRegion: true, child: ErrorText(_error!, center: true)),
                  VStack(
                    gap: 22,
                    children: [
                      if (view.mode == 'points') _Scores(view: view, members: members),
                      _Log(view: view, nick: nick),
                      _Rules(view: view),
                    ],
                  ),
                  const _HowTo(),
                ],
              ),
              _ChallengeDialog(view: view, meId: p.meId, nick: nick, send: _send, remaining: remaining),
              _RevealDialog(view: view, nick: nick),
            ],
          ),
        );
      },
    );
  }

  /// Yakalama şeridi: söylemediysen uyarı, başkası söylemediyse "Yakaladım!".
  Widget? _catch(ColorCardsView view, String meId, _Nick nick) {
    final exposed = view.exposed;
    if (exposed == null || view.phase == 'roundOver') return null;
    if (exposed == meId) {
      return Semantics(
        liveRegion: true,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(color: C.pink, border: Border.all(color: C.ink, width: bw), borderRadius: BorderRadius.circular(18)),
          child: Row(
            children: [
              Expanded(child: Text(SPlay.exposedMe, style: T.b(14, color: C.ink2, weight: FontWeight.w800))),
              const SizedBox(width: 12),
              _LastBtn(label: SPlay.lastCard, btn: true, onTap: () => _send({'type': 'callLast'})),
            ],
          ),
        ),
      );
    }
    if (!view.inGame) return null;
    return _CatchBtn(label: SPlay.catchBtn(nick(exposed)), onTap: () => _send({'type': 'catch', 'target': exposed}));
  }
}

// ---------- Üst şerit ----------

class _Top extends StatelessWidget {
  const _Top({required this.text, required this.mine, required this.round, required this.code});
  final String text;
  final bool mine;
  final String? round;
  final String code;

  @override
  Widget build(BuildContext context) => Row(
    children: [
      Expanded(
        child: Row(
          children: [
            Flexible(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                decoration: BoxDecoration(
                  color: mine ? C.coral : C.panel,
                  border: Border.all(color: C.ink, width: bw),
                  borderRadius: BorderRadius.circular(R.pill),
                ),
                child: Text(
                  text,
                  style: T.d(16, color: mine ? C.ink2 : C.text, height: 1.2),
                  maxLines: 1,
                  softWrap: false,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ),
            if (round != null) ...[
              const SizedBox(width: 10),
              Text(round!, style: T.b(13, color: C.text2, weight: FontWeight.w800), maxLines: 1, softWrap: false),
            ],
          ],
        ),
      ),
      const SizedBox(width: 10),
      Text(code, style: T.b(13, color: C.text3, weight: FontWeight.w800, letterSpacing: 2)),
    ],
  );
}

// ---------- Oyuncular ----------

class _Seats extends StatelessWidget {
  const _Seats({required this.view, required this.members, required this.meId});
  final ColorCardsView view;
  final Map<String, RoomPlayer> members;
  final String meId;

  @override
  Widget build(BuildContext context) => Semantics(
    container: true,
    label: 'Oyuncular',
    child: Grid2(
      columns: 3,
      rowGap: 12,
      columnGap: 8,
      equalHeight: true,
      children: [for (final pl in view.players) _Seat(view: view, player: pl, member: members[pl.id], me: pl.id == meId)],
    ),
  );
}

class _Seat extends StatelessWidget {
  const _Seat({required this.view, required this.player, required this.member, required this.me});
  final ColorCardsView view;
  final CcPlayer player;
  final RoomPlayer? member;
  final bool me;

  @override
  Widget build(BuildContext context) {
    final current = view.current == player.id && view.phase != 'roundOver';
    final exposed = view.exposed == player.id;
    final off = member?.connected == false;
    final fg = current ? C.ink2 : C.text;
    final border = current ? bw : 2.0;
    Widget seat = Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: current ? C.yellow : C.panel,
        border: Border.all(color: C.ink, width: border),
        borderRadius: BorderRadius.circular(14),
        boxShadow: exposed ? const [BoxShadow(color: C.red, spreadRadius: 3)] : null,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text.rich(
            TextSpan(
              text: member?.nick ?? '?',
              children: [
                if (me) TextSpan(text: ' (${SPlay.you})', style: TextStyle(fontWeight: FontWeight.w700, color: fg.withValues(alpha: .75))),
              ],
            ),
            style: T.b(14, color: fg, weight: FontWeight.w800),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.center,
          ),
          Text(SPlay.cardCount(player.cards), style: T.d(18, color: current ? C.ink2 : C.yellow, height: 1.3), textAlign: TextAlign.center),
        ],
      ),
    );
    if (player.called && player.cards <= 2) {
      seat = Stack(
        clipBehavior: Clip.none,
        fit: StackFit.passthrough,
        children: [
          seat,
          // `top: -10px` iç kenara göre; `left: 50%` + `translateX(-50%)`.
          Positioned(
            top: border - 10,
            left: 0,
            right: 0,
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 1),
                decoration: BoxDecoration(color: C.red, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(R.pill)),
                child: Text(SPlay.calledBadge, style: T.b(10, color: C.ink2, weight: FontWeight.w800), maxLines: 1, softWrap: false),
              ),
            ),
          ),
        ],
      );
    }
    if (current) seat = Transform.rotate(angle: deg(-2), child: seat);
    if (off) seat = Opacity(opacity: .6, child: seat);
    return Semantics(selected: current, child: seat);
  }
}

// ---------- Masa: deste, açık kart, etkin renk, yön ----------

class _Table extends StatelessWidget {
  const _Table({required this.view});
  final ColorCardsView view;

  @override
  Widget build(BuildContext context) {
    final lastSeq = view.lastPlay?.seq ?? 0;
    final top = view.top;
    Widget discard = top == null ? const SizedBox() : CcCardFace(color: top.color, value: top.value, size: CcSize.lg);
    if (lastSeq > 0) {
      discard = EnterAnim(
        key: ValueKey(lastSeq),
        dy: -24,
        scale: 1.08,
        duration: ccMotion(context, const Duration(milliseconds: 260)),
        curve: const Cubic(0.2, 0.9, 0.3, 1.2),
        child: discard,
      );
    }
    final active = view.activeColor;
    return Semantics(
      container: true,
      label: 'Masa',
      child: Padding(
        padding: const EdgeInsets.fromLTRB(0, 10, 0, 4),
        child: Column(
          children: [
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const CcCardBack(),
                    const SizedBox(height: 6),
                    Text('${SPlay.deck} ${view.deckCount}', style: T.b(13, color: C.text3, weight: FontWeight.w800)),
                  ],
                ),
                const SizedBox(width: 28),
                // `.cc-ring`: 5px renkli çerçeve + dışında 3px mürekkep halkası (box-shadow).
                FocusRing(
                  focused: true,
                  radius: 26,
                  color: C.ink,
                  offset: 0,
                  width: 3,
                  child: AnimatedContainer(
                    duration: ccMotion(context, const Duration(milliseconds: 250)),
                    curve: Curves.ease,
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      border: Border.all(color: active == null ? C.paper : ccColor(active), width: 5),
                      borderRadius: BorderRadius.circular(26),
                    ),
                    child: discard,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                CcSwatch(color: active),
                const SizedBox(width: 8),
                Flexible(
                  child: Text(
                    '${SPlay.activeColor} ${active != null ? colorName[active] : '—'} · ${view.dir == 1 ? SPlay.dirCw : SPlay.dirCcw}',
                    style: T.b(14, color: C.text, weight: FontWeight.w800),
                    textAlign: TextAlign.center,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// `.cc-timer`: 8px sarı çubuk; [track]/[fill]/[border] el sonu ve pencere sürümleri için.
class _Timer extends StatelessWidget {
  const _Timer({required this.remaining, required this.total, this.track = C.ink2, this.fill = C.yellow, this.border = false});
  final int remaining;
  final int total;
  final Color track;
  final Color fill;
  final bool border;

  @override
  Widget build(BuildContext context) => Container(
    height: 8,
    decoration: BoxDecoration(
      color: track,
      borderRadius: BorderRadius.circular(R.pill),
      border: border ? Border.all(color: C.ink, width: 2) : null,
    ),
    child: ClipRRect(
      borderRadius: BorderRadius.circular(R.pill),
      child: Align(
        alignment: Alignment.centerLeft,
        child: AnimatedFractionallySizedBox(
          duration: ccMotion(context, const Duration(milliseconds: 250)),
          widthFactor: total > 0 ? (remaining / total).clamp(0.0, 1.0) : 0,
          heightFactor: 1,
          child: ColoredBox(color: fill),
        ),
      ),
    ),
  );
}

// ---------- Düğmeler ----------

/// `.cc-last-btn`: kırmızı, −3° eğik "Son kart!". [btn]: `.btn` sınıfı da var (basınca 3px iner, eğim kalkar).
class _LastBtn extends StatelessWidget {
  const _LastBtn({required this.label, required this.onTap, this.btn = false, this.dim = false, this.done = false, this.hint});
  final String label;
  final VoidCallback onTap;
  final bool btn;
  final bool dim;
  final bool done;
  final String? hint;

  @override
  Widget build(BuildContext context) => Semantics(
    hint: hint,
    child: Opacity(
      opacity: dim && !done ? .5 : 1,
      child: Pressable(
        onTap: onTap,
        label: label,
        builder: (context, pressed) {
          final down = btn && pressed;
          return AnimatedContainer(
            duration: btn ? const Duration(milliseconds: 80) : Duration.zero,
            transformAlignment: Alignment.center,
            transform: down ? Matrix4.translationValues(0, 3, 0) : Matrix4.rotationZ(deg(-3)),
            constraints: const BoxConstraints(minHeight: 44),
            padding: const EdgeInsets.symmetric(horizontal: 14),
            decoration: BoxDecoration(
              color: done ? C.mint : C.red,
              border: Border.all(color: C.ink, width: bw),
              borderRadius: BorderRadius.circular(12),
              boxShadow: hardShadow(0, down ? 1 : 4),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [Flexible(child: Text(label, style: T.d(16, color: C.ink2), maxLines: 1, softWrap: false))],
            ),
          );
        },
      ),
    ),
  );
}

/// `.cc-catch-btn`: kırmızı, 1.2 sn'de bir %2 büyüyüp küçülen "Yakaladım!" (animasyon `transform`u ezdiği için basınca inmez).
class _CatchBtn extends StatefulWidget {
  const _CatchBtn({required this.label, required this.onTap});
  final String label;
  final VoidCallback onTap;

  @override
  State<_CatchBtn> createState() => _CatchBtnState();
}

class _CatchBtnState extends State<_CatchBtn> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1200));

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MediaQuery.disableAnimationsOf(context)) {
      _c.stop();
      _c.value = 0;
    } else if (!_c.isAnimating) {
      _c.repeat();
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
    builder: (context, child) {
      final t = _c.value;
      final k = t < .5 ? Curves.easeInOut.transform(t / .5) : 1 - Curves.easeInOut.transform((t - .5) / .5);
      return Transform.scale(scale: 1 + .02 * k, child: child);
    },
    child: SButton(
      label: widget.label,
      background: C.red,
      foreground: C.ink2,
      block: true,
      minHeight: 56,
      radius: 18,
      fontSize: 20,
      pressY: 0,
      onPressed: widget.onTap,
    ),
  );
}

// ---------- Durum ----------

class _Status extends StatelessWidget {
  const _Status({
    required this.view,
    required this.meId,
    required this.isHost,
    required this.nick,
    required this.members,
    required this.remaining,
    required this.send,
  });
  final ColorCardsView view;
  final String meId;
  final bool isHost;
  final _Nick nick;
  final Map<String, RoomPlayer> members;
  final int remaining;
  final _Send send;

  @override
  Widget build(BuildContext context) {
    final mine = view.current == meId && view.inGame;
    final disconnected = members[view.current]?.connected == false;
    final challenge = view.challenge;
    final String text;
    if (view.phase == 'color') {
      text = mine ? SPlay.startColorMe : SPlay.startColorOther(nick(view.current));
    } else if (view.phase == 'challenge' && challenge != null) {
      text = SPlay.challengeOther(nick(challenge.victim), nick(challenge.by));
    } else if (mine) {
      text = view.drew ? SPlay.afterDraw : (view.penalty > 0 ? SPlay.myTurnPenalty(view.penalty) : SPlay.myTurn);
    } else {
      text = view.penalty > 0 ? SPlay.otherPenalty(nick(view.current), view.penalty) : SPlay.otherTurn(nick(view.current));
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Semantics(
          liveRegion: true,
          child: VStack(
            gap: 12,
            children: [
              Text(text, style: _hintStyle, textAlign: TextAlign.center),
              if (view.durationMs > 0) _Timer(remaining: remaining, total: view.durationMs),
              if (isHost && !mine && disconnected)
                VStack(
                  gap: 8,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Text(SPlay.hostSkipHint, style: _smallStyle, textAlign: TextAlign.center),
                    SButton(label: SPlay.hostSkip(nick(view.current)), tone: BtnTone.outline, onPressed: () => send({'type': 'skipTurn'})),
                  ],
                ),
            ],
          ),
        ),
        if (view.phase == 'color' && mine)
          _Modal(
            label: SPlay.chooseColor,
            children: [
              Text(SPlay.startColorMe, style: _modalTitle),
              _ColorGrid(onPick: (c) => send({'type': 'pickColor', 'color': c})),
            ],
          ),
      ],
    );
  }
}

// ---------- El sonu ----------

class _RoundOver extends StatelessWidget {
  const _RoundOver({required this.view, required this.result, required this.nick, required this.remaining});
  final ColorCardsView view;
  final CcRoundResult result;
  final _Nick nick;
  final int remaining;

  @override
  Widget build(BuildContext context) {
    final row = T.b(14, color: C.ink2, weight: FontWeight.w800);
    return Semantics(
      liveRegion: true,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: C.yellow,
          border: Border.all(color: C.ink, width: bw),
          borderRadius: BorderRadius.circular(22),
          boxShadow: Shadows.lg,
        ),
        child: VStack(
          gap: 10,
          children: [
            Text(SPlay.roundOverTitle(nick(result.winner)), style: T.d(26, color: C.ink2, height: 1.05), textAlign: TextAlign.center),
            Text(SPlay.roundOverPoints(result.points), style: T.b(15, color: C.ink2, weight: FontWeight.w800), textAlign: TextAlign.center),
            VStack(
              gap: 6,
              children: [
                for (final x in result.hands.where((x) => x.id != result.winner))
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(color: C.paper, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(12)),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Flexible(child: Text(nick(x.id), style: row)),
                        Text('${SPlay.cardCount(x.cards)}, ${x.points} p', style: row),
                      ],
                    ),
                  ),
              ],
            ),
            Text(SPlay.nextRound((remaining / 1000).ceil()), style: T.b(13, color: C.ink2, weight: FontWeight.w700), textAlign: TextAlign.center),
            if (view.durationMs > 0) _Timer(remaining: remaining, total: view.durationMs, track: C.paper, fill: C.ink2, border: true),
          ],
        ),
      ),
    );
  }
}
