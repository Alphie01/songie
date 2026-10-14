import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/gestures.dart';
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

part 'dial.dart';
part 'parts.dart';

/// `.fq-timer[data-low]`
const _lowRed = Color(0xFFD63A3A);

/// Tarayıcının varsayılan yer tutucu rengi (`.fq-input` kendi rengini vermiyor).
const _placeholder = Color(0xFFA9A9A9);

Color _teamColor(String team) => team == 'b' ? C.lilac : C.mint;

typedef _Send = Future<bool> Function(Json action);

int _now() => DateTime.now().millisecondsSinceEpoch;

/// `.fq-small`
TextStyle _small({Color color = C.text2}) => T.b(13, color: color, weight: FontWeight.w700, height: 1.4);

/// CSS flex `gap`: öğeler (boşluk dolduran `Spacer` dahil) arasına eşit boşluk.
List<Widget> _gapped(double gap, List<Widget> items) => [
  for (var i = 0; i < items.length; i++) ...[if (i > 0) SizedBox(height: gap), items[i]],
];

/// games/frequency/client/PlayView.tsx (telefon düzeni: yan sütunlar `.sg-side` 1100px altında gizli).
class FrequencyPlayView extends StatefulWidget {
  const FrequencyPlayView({super.key, required this.props});
  final PlayViewProps props;

  @override
  State<FrequencyPlayView> createState() => _FrequencyPlayViewState();
}

class _FrequencyPlayViewState extends State<FrequencyPlayView> {
  String? _error;

  // useLocalDial: sürüklerken anında, sunucuya en fazla ~16/sn gönderir.
  double? _local;
  int _lastLocalAt = 0;
  int _lastSentAt = 0;
  double? _pending;
  Timer? _timer;
  String? _dialKey;
  int _round = 0;

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<bool> _send(Json action) async {
    setState(() => _error = null);
    final res = await widget.props.act(action);
    if (!res.ok && mounted) setState(() => _error = res.error);
    return res.ok;
  }

  void _sendNow(double v) {
    _lastSentAt = _now();
    _pending = null;
    unawaited(widget.props.act({'type': 'dial', 'round': _round, 'value': v}));
  }

  void _change(double v, bool done) {
    setState(() => _local = v);
    _lastLocalAt = _now();
    final wait = 60 - (_now() - _lastSentAt);
    if (done || wait <= 0) {
      _timer?.cancel();
      _timer = null;
      _sendNow(v);
      return;
    }
    _pending = v;
    _timer ??= Timer(Duration(milliseconds: wait), () {
      _timer = null;
      final pending = _pending;
      if (pending != null && mounted) _sendNow(pending);
    });
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.props;
    final view = FrequencyView.fromJson(p.view);
    final members = membersOf(p.room);
    String nick(String? id) => id == null || id.isEmpty ? '?' : (id == p.meId ? SPlay.you : (members[id]?.nick ?? '?'));
    final isHost = p.room.hostId == p.meId;

    // Yeni tur ya da aşamada yerel kadranı bırak.
    final key = '${view.roundId}:${view.phase}';
    if (_dialKey != key) {
      _dialKey = key;
      _local = null;
      _pending = null;
      _timer?.cancel();
      _timer = null;
    }
    _round = view.roundId;

    if (view.phase == 'podium') return _Podium(view: view, members: members, meId: p.meId, code: p.room.code);

    final canDial = view.phase == 'dial' && view.role == 'dialer';
    final mine = _local != null && (view.dialBy == p.meId || _now() - _lastLocalAt < 700);
    final dialValue = canDial && mine ? _local! : view.dial;
    final revealed = view.phase == 'reveal';
    final curtain = revealed ? 'opening' : (view.role == 'psychic' ? 'none' : 'closed');
    final psychic = members[view.psychicId];
    final psychicGone = !(psychic?.connected ?? false);
    final otherTeam = view.team == 'a' ? 'b' : 'a';
    final showClue = view.clue != null || const ['dial', 'side', 'reveal'].contains(view.phase);
    final panel = _phasePanel(view, nick, otherTeam, canDial ? dialValue : null);
    final action = _actionButton(view, p.meId);

    final play = ConstrainedBox(
      // `.fq-play { min-height: calc(100dvh - 72px - 22px) }`: ana düğme altta.
      constraints: BoxConstraints(minHeight: viewportHeight(context) - 72 - 22),
      child: IntrinsicHeight(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: _gapped(12, [
            _Top(view: view, code: p.room.code),
            _Scores(view: view),
            _Who(view: view, psychic: psychic, me: p.meId),
            _Dial(value: dialValue, card: view.card, target: view.target, curtain: curtain, curtainKey: view.roundId, editable: canDial, onChange: _change),
            if (showClue) _Clue(view: view),
            ?panel,
            if (_error != null) ErrorText(_error!, center: true),
            if (isHost && psychicGone && view.phase != 'reveal')
              DashedBox(
                color: C.violet,
                radius: 18,
                width: 3,
                padding: const EdgeInsets.all(12),
                child: Column(
                  children: [
                    Text(SPlay.skipHint(nick(view.psychicId)), style: _small(), textAlign: TextAlign.center),
                    const SizedBox(height: 8),
                    SGhostButton(label: SPlay.skip, onPressed: () => _send({'type': 'skipPsychic', 'round': view.roundId})),
                  ],
                ),
              ),
            const Spacer(),
            ?action,
          ]),
        ),
      ),
    );

    return GameColumn(
      maxWidth: 400 + 2 * Layout.gutter(context),
      bottom: 24,
      child: VStack(
        gap: 22,
        children: [
          play,
          _Rosters(view: view, members: members, meId: p.meId),
          if (view.history.isNotEmpty) _History(view: view, nick: nick),
          const _HowTo(),
        ],
      ),
    );
  }

  /// Ekranın altındaki büyük düğme: kilitle / onayla / sıradaki tur.
  Widget? _actionButton(FrequencyView view, String meId) {
    final r = view.roundId;
    if (view.phase == 'dial' && view.role == 'dialer') {
      final voted = view.lockVotes.contains(meId);
      final majority = view.votesNeeded > 1;
      if (voted) return _Action(label: SPlay.unapprove, dark: true, onTap: () => _send({'type': 'unlock', 'round': r}));
      return _Action(label: majority ? SPlay.approve(view.lockVotes.length, view.votesNeeded) : SPlay.lock, onTap: () => _send({'type': 'lock', 'round': r}));
    }
    if (view.phase == 'dial' && view.role == 'psychic') return const _Action(label: SPlay.dialPsychicBtn, onTap: null);
    final result = view.result;
    if (view.phase == 'reveal' && result != null) {
      return _ResultIn(
        id: result.id,
        child: _Action(label: view.winner != null ? SPlay.toPodium : SPlay.next, onTap: () => _send({'type': 'next', 'round': r})),
      );
    }
    return null;
  }

  Widget? _phasePanel(FrequencyView view, String Function(String? id) nick, String otherTeam, double? dial) {
    final r = view.roundId;
    final teamName = S.team[view.team]!;
    final oppName = S.team[otherTeam]!;
    switch (view.phase) {
      case 'pick':
        final options = view.options;
        if (view.role == 'psychic' && options != null) {
          return VStack(
            gap: 10,
            children: [
              Text(
                SPlay.pickTitle,
                style: T.d(19, color: C.text, height: 1.15),
                textAlign: TextAlign.center,
              ),
              VStack(
                gap: 10,
                children: [
                  for (final c in options) _OptionButton(card: c, onTap: () => _send({'type': 'pick', 'round': r, 'cardId': c.id})),
                ],
              ),
              Text(SPlay.pickHint, style: _small(), textAlign: TextAlign.center),
            ],
          );
        }
        return _Wait(SPlay.pickWait(nick(view.psychicId)));

      case 'clue':
        if (view.role == 'psychic') return _ClueForm(key: ValueKey('clue-$r'), round: r, send: _send);
        return _Wait(SPlay.clueWait(nick(view.psychicId)));

      case 'dial':
        if (view.role == 'dialer' && dial != null) {
          final voted = view.lockVotes.contains(widget.props.meId);
          final hint = [
            voted ? SPlay.approved(view.lockVotes.length, view.votesNeeded) : SPlay.dialYou,
            if (view.dialBy != null) SPlay.movedBy(nick(view.dialBy)),
          ].join(' ');
          final card = view.card;
          return VStack(
            gap: 10,
            children: [
              Text(
                hint,
                style: T.b(13, color: C.text2, weight: FontWeight.w700),
                textAlign: TextAlign.center,
              ),
              _Range(value: dial, label: card != null ? SPlay.dialValue(card.left, card.right, dial) : null, onChange: _change),
            ],
          );
        }
        if (view.role == 'psychic') {
          return const Center(
            child: _PointsPill(text: SPlay.targetHere, tone: 'psychic'),
          );
        }
        return _Wait(view.role == 'opponent' ? SPlay.dialOpp(teamName) : SPlay.dialSpectator);

      case 'side':
        if (view.role == 'opponent') {
          return VStack(
            gap: 10,
            children: [
              Text(
                SPlay.sideTitle,
                style: T.d(19, color: C.text, height: 1.15),
                textAlign: TextAlign.center,
              ),
              Row(
                children: [
                  Expanded(child: _SideButton(left: true, onTap: () => _send({'type': 'side', 'round': r, 'side': 'left'}))),
                  const SizedBox(width: 10),
                  Expanded(child: _SideButton(left: false, onTap: () => _send({'type': 'side', 'round': r, 'side': 'right'}))),
                ],
              ),
              Text(SPlay.sideHint, style: _small(), textAlign: TextAlign.center),
            ],
          );
        }
        return _Wait(SPlay.sideWait(oppName));

      case 'reveal':
        final result = view.result;
        return result == null ? null : _Reveal(view: view, result: result);

      default:
        return null;
    }
  }
}

/// `.fq-top`: tur hapı ve hedef puan (ya da oda kodu).
class _Top extends StatelessWidget {
  const _Top({required this.view, required this.code});
  final FrequencyView view;
  final String code;

  @override
  Widget build(BuildContext context) {
    final done = view.phase == 'reveal' ? math.max(0, view.completed - 1) : view.completed;
    return Row(
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
              '${S.name} · ${SPlay.round(done, view.totalRounds)}',
              style: T.d(16, color: C.ink2, height: 1.2),
              maxLines: 1,
              softWrap: false,
              overflow: TextOverflow.visible,
            ),
          ),
        ),
        const SizedBox(width: 10),
        Flexible(
          child: Text(
            view.targetScore != null ? SPlay.toWin(view.targetScore!) : code,
            style: T.b(12, color: C.text3, weight: FontWeight.w800),
            textAlign: TextAlign.right,
          ),
        ),
      ],
    );
  }
}

/// `.fq-who`: medyum satırı.
class _Who extends StatelessWidget {
  const _Who({required this.view, required this.psychic, required this.me});
  final FrequencyView view;
  final RoomPlayer? psychic;
  final String me;

  @override
  Widget build(BuildContext context) {
    final pl = psychic;
    final gone = !(pl?.connected ?? false);
    return Row(
      children: [
        if (pl != null) ...[SAvatar(avatar: pl.avatar, nick: pl.nick, size: 30, dim: !pl.connected), const SizedBox(width: 8)],
        Flexible(
          child: Text(
            '${SPlay.psychicIs(pl?.nick ?? '?')}${view.psychicId == me ? SPlay.youTag : ''}',
            style: T.b(14, color: C.text, weight: FontWeight.w800),
          ),
        ),
        if (gone) ...[const SizedBox(width: 8), const _Badge(SPlay.offline)],
      ],
    );
  }
}

/// `.fq-off`, `.fq-badge`: koyu hap etiket.
class _Badge extends StatelessWidget {
  const _Badge(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 1),
    decoration: BoxDecoration(color: C.ink2, borderRadius: BorderRadius.circular(R.pill)),
    child: Text(
      text,
      style: T.b(11, color: C.yellow, weight: FontWeight.w800),
      maxLines: 1,
      softWrap: false,
    ),
  );
}

/// `.fq-clue`: verilen ipucu ve süre.
class _Clue extends StatelessWidget {
  const _Clue({required this.view});
  final FrequencyView view;

  @override
  Widget build(BuildContext context) {
    final clue = view.clue;
    final written = clue != null && clue.isNotEmpty;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: C.paper,
        border: Border.all(color: C.ink, width: bw),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Flexible(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  trUpper(SPlay.clueLabel),
                  style: T.b(11, color: C.ink2, weight: FontWeight.w800, letterSpacing: 1.5),
                ),
                Text(written ? '“$clue”' : SPlay.clueSpoken, style: T.d(written ? 26 : 20, color: C.ink2)),
              ],
            ),
          ),
          if (view.endsAt > 0) ...[
            const SizedBox(width: 10),
            Remaining(
              serverNow: view.serverNow,
              endsAt: view.endsAt,
              tick: const Duration(milliseconds: 250),
              builder: (context, remaining) => Text(
                '${(remaining / 1000).ceil()} ${SPlay.seconds}',
                style: T.b(13, color: remaining < 10000 ? _lowRed : C.ink2, weight: FontWeight.w800),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// `.fq-wait`: kesikli mor çerçeveli bekleme notu.
class _Wait extends StatelessWidget {
  const _Wait(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => DashedBox(
    color: C.violet,
    radius: 18,
    width: 3,
    padding: const EdgeInsets.all(10),
    child: Text(
      text,
      style: T.b(14, color: C.text3, weight: FontWeight.w700),
      textAlign: TextAlign.center,
    ),
  );
}

/// Basınca inen kalın çerçeveli düğme kalıbı.
class _Push extends StatelessWidget {
  const _Push({
    required this.onTap,
    required this.label,
    required this.child,
    required this.background,
    required this.minHeight,
    required this.radius,
    required this.shadowY,
    required this.pressY,
    this.padding = const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
    this.transition = Duration.zero,
  });
  final VoidCallback? onTap;
  final String label;
  final Widget child;
  final Color background;
  final double minHeight;
  final double radius;
  final double shadowY;
  final double pressY;
  final EdgeInsets padding;
  final Duration transition;

  @override
  Widget build(BuildContext context) => Pressable(
    onTap: onTap,
    label: label,
    builder: (context, pressed) => AnimatedContainer(
      duration: MediaQuery.disableAnimationsOf(context) ? Duration.zero : transition,
      curve: Curves.ease,
      transform: Matrix4.translationValues(0, pressed ? pressY : 0, 0),
      constraints: BoxConstraints(minHeight: minHeight),
      padding: padding,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: background,
        border: Border.all(color: C.ink, width: bw),
        borderRadius: BorderRadius.circular(radius),
        boxShadow: shadowY > 0 ? hardShadow(0, pressed ? 1 : shadowY) : null,
      ),
      child: child,
    ),
  );
}

/// `.fq-action`: ekranın altındaki ana düğme (80ms geçiş).
class _Action extends StatelessWidget {
  const _Action({required this.label, required this.onTap, this.dark = false});
  final String label;
  final VoidCallback? onTap;
  final bool dark;

  @override
  Widget build(BuildContext context) => _Push(
    onTap: onTap,
    label: label,
    background: dark ? C.ink2 : C.mint,
    minHeight: 60,
    radius: 20,
    shadowY: 6,
    pressY: 5,
    padding: const EdgeInsets.symmetric(horizontal: 16),
    transition: const Duration(milliseconds: 80),
    child: Text(
      label,
      style: T.d(22, color: dark ? C.text : C.ink2, height: 1.1),
      textAlign: TextAlign.center,
    ),
  );
}

/// `.fq-option`: medyumun seçebileceği spektrum kartı.
class _OptionButton extends StatelessWidget {
  const _OptionButton({required this.card, required this.onTap});
  final SpectrumCard card;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => _Push(
    onTap: onTap,
    label: '${card.left} / ${card.right}',
    background: C.panel,
    minHeight: 64,
    radius: 18,
    shadowY: 4,
    pressY: 3,
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
    child: ExcludeSemantics(child: _ShrinkRow(gap: 10, center: true, children: [_End('← ${card.left}', left: true), _End('${card.right} →', left: false)])),
  );
}

/// `.fq-side`: rakibin "solunda / sağında" düğmesi.
class _SideButton extends StatelessWidget {
  const _SideButton({required this.left, required this.onTap});
  final bool left;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final label = left ? '← ${SPlay.sideLeft}' : '${SPlay.sideRight} →';
    return _Push(
      onTap: onTap,
      label: label,
      background: left ? C.sky : C.coral,
      minHeight: 56,
      radius: 16,
      shadowY: 4,
      pressY: 3,
      child: Text(
        label,
        style: T.d(19, color: C.ink2, height: 1.45),
        textAlign: TextAlign.center,
      ),
    );
  }
}

/// `.fq-points-num`: −3° eğik puan hapı (hit nane, miss kırmızı, psychic panel).
class _PointsPill extends StatelessWidget {
  const _PointsPill({required this.text, required this.tone});
  final String text;
  final String tone;

  @override
  Widget build(BuildContext context) => Transform.rotate(
    angle: deg(-3),
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
      decoration: BoxDecoration(
        color: switch (tone) {
          'miss' => C.red,
          'psychic' => C.panel,
          _ => C.mint,
        },
        border: Border.all(color: C.ink, width: bw),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Text(text, style: T.d(26, color: tone == 'psychic' ? C.text : C.ink2, height: 1.2)),
    ),
  );
}

/// `.fq-result`: açıklama sonucu perde açıldıktan sonra belirir (400ms ease-out, 1300ms gecikme).
class _ResultIn extends StatelessWidget {
  const _ResultIn({required this.id, required this.child});
  final int id;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    if (MediaQuery.disableAnimationsOf(context)) return child;
    return EnterAnim(
      animKey: id,
      dy: 6,
      duration: const Duration(milliseconds: 400),
      curve: Curves.easeOut,
      delay: const Duration(milliseconds: 1300),
      child: child,
    );
  }
}

/// Turun sonucu: puan, rakibin tahmini, yetişme kuralı, oyun sonu.
class _Reveal extends StatelessWidget {
  const _Reveal({required this.view, required this.result});
  final FrequencyView view;
  final RoundSummary result;

  @override
  Widget build(BuildContext context) {
    final opp = result.team == 'a' ? 'b' : 'a';
    final winner = view.winner;
    return _ResultIn(
      id: result.id,
      child: VStack(
        gap: 10,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _PointsPill(text: SPlay.points(result.points), tone: result.points > 0 ? 'hit' : 'miss'),
              if (result.points == bullseye) ...[
                const SizedBox(width: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(color: C.yellow, borderRadius: BorderRadius.circular(R.pill)),
                  child: Text(
                    SPlay.bullseye,
                    style: T.b(13, color: C.ink2, weight: FontWeight.w800),
                  ),
                ),
              ],
            ],
          ),
          if (view.mode == 'teams')
            Text(
              result.side != null
                  ? SPlay.sideRes(S.team[opp]!, result.side == 'left' ? SPlay.sideLeft : SPlay.sideRight, result.sidePoint == true)
                  : SPlay.noSide,
              style: _small(),
              textAlign: TextAlign.center,
            ),
          if (result.again)
            Text(
              view.mode == 'coop' ? SPlay.againCoop : SPlay.again(S.team[result.team]!),
              style: _small(color: C.yellow),
              textAlign: TextAlign.center,
            ),
          if (winner != null)
            Text(
              winner == 'coop'
                  ? SPlay.coopDone
                  : (winner == 'a' || winner == 'b')
                  ? SPlay.winner(S.team[winner]!)
                  : SPodium.draw,
              style: T.d(22, color: C.mint, height: 1.45),
              textAlign: TextAlign.center,
            ),
        ],
      ),
    );
  }
}

/// `.fq-range`: erişilebilir kaydırıcı (yerel `input[type=range]`, `accent-color: var(--yellow)`).
class _Range extends StatelessWidget {
  const _Range({required this.value, required this.label, required this.onChange});
  final double value;
  final String? label;
  final void Function(double value, bool done) onChange;

  @override
  Widget build(BuildContext context) => SizedBox(
    height: 40,
    child: Material(
      type: MaterialType.transparency,
      child: SliderTheme(
        data: SliderTheme.of(context).copyWith(
          trackHeight: 4,
          activeTrackColor: C.yellow,
          inactiveTrackColor: const Color(0xFF3B3B3B),
          thumbColor: C.yellow,
          overlayShape: SliderComponentShape.noOverlay,
          thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 8, elevation: 0, pressedElevation: 0),
          trackShape: const RoundedRectSliderTrackShape(),
          tickMarkShape: SliderTickMarkShape.noTickMark,
          showValueIndicator: ShowValueIndicator.never,
        ),
        child: Slider(
          value: value.roundToDouble().clamp(dialMin, dialMax),
          min: dialMin,
          max: dialMax,
          divisions: 100,
          semanticFormatterCallback: label == null ? null : (_) => label!,
          onChanged: (v) => onChange(v, false),
          onChangeEnd: (v) => onChange(v, true),
        ),
      ),
    ),
  );
}

/// `.fq-cluebox`: medyumun sarı "sıra sende" kartı.
class _ClueForm extends StatefulWidget {
  const _ClueForm({super.key, required this.round, required this.send});
  final int round;
  final _Send send;

  @override
  State<_ClueForm> createState() => _ClueFormState();
}

class _ClueFormState extends State<_ClueForm> {
  final _text = TextEditingController();
  final _focus = FocusNode();
  bool _focused = false;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _focus.addListener(() => setState(() => _focused = _focus.hasFocus));
  }

  @override
  void dispose() {
    _text.dispose();
    _focus.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_busy) return;
    setState(() => _busy = true);
    await widget.send({'type': 'clue', 'round': widget.round, 'text': _text.text});
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    final input = T.d(17, color: C.ink2, weight: FontWeight.w700, height: 1.2);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: C.yellow,
        border: Border.all(color: C.ink, width: bw),
        borderRadius: BorderRadius.circular(24),
        boxShadow: hardShadow(6, 6),
      ),
      child: VStack(
        gap: 10,
        children: [
          Text(SPlay.clueTitle, style: T.d(24, color: C.ink2, height: 1.05)),
          Text(
            SPlay.clueHint,
            style: T.b(13, color: C.ink2, weight: FontWeight.w700),
          ),
          FocusRing(
            focused: _focused,
            radius: 14,
            color: C.ink2,
            child: Container(
              constraints: const BoxConstraints(minHeight: 50),
              alignment: Alignment.centerLeft,
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(
                color: C.paper,
                border: Border.all(color: C.ink, width: bw),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Semantics(
                label: SPlay.clueLabel,
                child: TextField(
                  controller: _text,
                  focusNode: _focus,
                  maxLength: 80,
                  textInputAction: TextInputAction.done,
                  onSubmitted: (_) => _submit(),
                  cursorColor: C.ink2,
                  style: input,
                  decoration: InputDecoration(
                    isCollapsed: true,
                    border: InputBorder.none,
                    counterText: '',
                    semanticCounterText: '',
                    hintText: SPlay.cluePlaceholder,
                    hintStyle: input.copyWith(color: _placeholder),
                  ),
                ),
              ),
            ),
          ),
          Opacity(
            opacity: _busy ? 0.6 : 1,
            child: Pressable(
              onTap: _busy ? null : _submit,
              label: SPlay.clueSend,
              builder: (context, _) => Container(
                constraints: const BoxConstraints(minHeight: 52),
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: C.ink2,
                  border: Border.all(color: C.ink, width: bw),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Text(
                  SPlay.clueSend,
                  style: T.d(19, color: C.text, height: 1.45),
                  textAlign: TextAlign.center,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
