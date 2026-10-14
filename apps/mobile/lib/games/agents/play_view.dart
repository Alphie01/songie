import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
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

part 'board.dart';
part 'parts.dart';

/// Tasarımın tarafsız kart rengi (`--ag-neutral`, token'da yok).
const _neutral = Color(0xFFE8E0C8);

/// `.ag-form-hint[data-error]`
const _formError = Color(0xFFC62F2F);

Color _teamColor(String team) => team == 'b' ? C.lilac : C.mint;

/// `[data-color]` → `--c`
Color _cardColor(String color) => switch (color) {
  'a' => C.mint,
  'b' => C.lilac,
  'neutral' => _neutral,
  _ => C.ink2,
};

String _num(int n) => n == unlimited ? '∞' : '$n';

typedef _Send = Future<bool> Function(Json action);

/// `.ag-clue-label`: 11px, 800, 1.5px aralık, büyük harf.
TextStyle _labelStyle([Color color = C.ink2]) => T.b(11, color: color, weight: FontWeight.w800, letterSpacing: 1.5);

/// games/agents/client/PlayView.tsx (telefon düzeni: yan sütunlar `.sg-side` 1100px altında gizli).
class AgentsPlayView extends StatefulWidget {
  const AgentsPlayView({super.key, required this.props});
  final PlayViewProps props;

  @override
  State<AgentsPlayView> createState() => _AgentsPlayViewState();
}

class _AgentsPlayViewState extends State<AgentsPlayView> {
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
    final view = AgentsView.fromJson(p.view);
    final members = membersOf(p.room);
    String nick(String id) => id == p.meId ? SPlay.you : (members[id]?.nick ?? '?');
    final isHost = p.room.hostId == p.meId;
    final over = view.phase == 'over';
    final guessing = view.phase == 'guess' && view.myTeam == view.team && view.role == 'guesser';
    final width = MediaQuery.sizeOf(context).width;

    final teams = _Teams(view: view, members: members, meId: p.meId, isHost: isHost, send: _send);
    final history = _History(view: view);

    final children = <Widget>[
      _Top(view: view, code: p.room.code),
      if (over) ...[_OverHead(view: view), teams] else ...[_Counters(view: view), ..._status(view, nick, members)],
      if (_error != null) ErrorText(_error!, center: true),
      _Board(view: view, meId: p.meId, members: members, send: _send),
      const _Legend(),
      if (over) _OverActions(view: view, isHost: isHost, send: _send) else ...[history, if (guessing) _GuessBar(view: view, send: _send), teams],
      if (over) history,
      const Padding(padding: EdgeInsets.only(top: 20), child: _HowTo()),
    ];

    // `.sg-center` 400px (720px'ten itibaren `.ag .ag-center` 520px), `.sg` alt boşluğu 24px.
    return GameColumn(
      maxWidth: (width >= 720 ? 520 : 400) + 2 * Layout.gutter(context),
      bottom: 24,
      child: VStack(gap: 12, children: children),
    );
  }

  /// `Status`: ipucu kartı ya da lider formu, süre, açıklama satırları (her biri ayrı ızgara öğesi).
  List<Widget> _status(AgentsView view, String Function(String id) nick, Map<String, RoomPlayer> members) {
    final leaderId = view.leaders[view.team] ?? '';
    final leaderOnline = members[leaderId]?.connected ?? false;
    final myLeader = view.role == 'leader' && view.myTeam == view.team;
    final label = myLeader ? SPlay.myClue : SPlay.clueOf(nick(leaderId));
    final timer = view.endsAt > 0
        ? Remaining(
            serverNow: view.serverNow,
            endsAt: view.endsAt,
            tick: const Duration(milliseconds: 250),
            builder: (context, remaining) => _Timer(remaining: remaining, duration: view.durationMs),
          )
        : null;

    if (view.phase == 'clue') {
      if (myLeader) return [_ClueForm(key: ValueKey('clue-${view.board}-${view.turn}'), view: view, send: _send), ?timer];
      return [
        _ClueCard(
          team: view.team,
          label: label,
          word: SPlay.thinking,
          waiting: true,
          right: _TurnTag(team: view.team),
        ),
        ?timer,
        _Hint(view.myTeam == view.team ? SPlay.waitClueMine : SPlay.waitClue(nick(leaderId))),
        if (!leaderOnline) _Hint(SPlay.leaderOffline(nick(leaderId)), dim: true),
      ];
    }

    final clue = view.clue;
    if (clue == null) return [?timer];
    final hint = view.myTeam == view.team && view.role == 'guesser'
        ? SPlay.tapHint[view.revealMode]!
        : myLeader
        ? SPlay.leaderGuessing
        : view.role == 'spectator'
        ? SPlay.spectator
        : SPlay.opponentGuessing(S.team[view.team]!);
    return [
      _ClueCard(
        team: view.team,
        label: label,
        word: trUpper(clue.word),
        right: _ClueRight(team: view.team, number: clue.number, guessesLeft: view.guessesLeft),
      ),
      ?timer,
      _Hint(hint),
    ];
  }
}

/// `.ag-top`: tablo hapı, kazanılan tablolar, oda kodu.
class _Top extends StatelessWidget {
  const _Top({required this.view, required this.code});
  final AgentsView view;
  final String code;

  @override
  Widget build(BuildContext context) {
    final wins = view.wins;
    // Hap kırılmaz (nowrap); dar ekranda kutusu daralır, yazı taşar. Kod `margin-left: auto` ile sağda.
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Flexible(
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Flexible(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                  decoration: BoxDecoration(
                    color: C.yellow,
                    border: Border.all(color: C.ink, width: 3),
                    borderRadius: BorderRadius.circular(R.pill),
                  ),
                  child: Text(
                    SPlay.pill(view.board),
                    style: T.d(16, color: C.ink2, height: 1.2),
                    maxLines: 1,
                    softWrap: false,
                    overflow: TextOverflow.visible,
                  ),
                ),
              ),
              if (wins['a']! > 0 || wins['b']! > 0) ...[
                const SizedBox(width: 10),
                Semantics(
                  label: '${SPlay.wins}: ${wins['a']}–${wins['b']}',
                  excludeSemantics: true,
                  child: Text.rich(
                    TextSpan(
                      children: [
                        TextSpan(
                          text: '${wins['a']}',
                          style: const TextStyle(color: C.mint),
                        ),
                        const TextSpan(text: '–'),
                        TextSpan(
                          text: '${wins['b']}',
                          style: const TextStyle(color: C.lilac),
                        ),
                      ],
                    ),
                    style: T.d(15, color: C.text3, height: 1.45),
                  ),
                ),
              ],
            ],
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
}

/// `.ag-counters`: iki takımın kalan ajanları; sırası gelen takım renkli ve eğik.
class _Counters extends StatelessWidget {
  const _Counters({required this.view});
  final AgentsView view;

  @override
  Widget build(BuildContext context) {
    Widget counter(String t) {
      final active = view.team == t;
      final fg = active ? C.ink2 : C.text;
      final n = view.remaining[t]!;
      return Semantics(
        label: '${S.team[t]}: ${SPlay.left(n)}',
        excludeSemantics: true,
        child: Transform.rotate(
          angle: active ? deg(-1) : 0,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: active ? _teamColor(t) : C.panel,
              border: Border.all(color: C.ink, width: 3),
              borderRadius: BorderRadius.circular(16),
              boxShadow: active ? hardShadow(0, 4) : null,
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    '${S.teamShort[t]}${view.myTeam == t ? ' (${SPlay.you})' : ''}',
                    style: T.b(13, color: fg, weight: FontWeight.w800),
                    maxLines: 1,
                    softWrap: false,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 6),
                Text(SPlay.agents(n), style: T.d(22, color: fg, height: 1.2)),
              ],
            ),
          ),
        ),
      );
    }

    return Row(
      children: [
        Expanded(child: counter('a')),
        const SizedBox(width: 10),
        Expanded(child: counter('b')),
      ],
    );
  }
}

/// `.ag-clue`: beyaz ipucu kartı (etiket + kelime solda, sağda sıra etiketi ya da sayı).
class _ClueCard extends StatelessWidget {
  const _ClueCard({required this.team, required this.label, required this.word, required this.right, this.waiting = false});
  final String team;
  final String label;
  final String word;
  final Widget right;
  final bool waiting;

  @override
  Widget build(BuildContext context) => Semantics(
    liveRegion: true,
    container: true,
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: C.paper,
        border: Border.all(color: C.ink, width: 3),
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
                Text(trUpper(label), style: _labelStyle()),
                Text(word, style: T.d(30, color: waiting ? C.violet : C.ink2)),
              ],
            ),
          ),
          const SizedBox(width: 10),
          right,
        ],
      ),
    ),
  );
}

/// `.ag-clue-turn`
class _TurnTag extends StatelessWidget {
  const _TurnTag({required this.team});
  final String team;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    decoration: BoxDecoration(
      color: _teamColor(team),
      border: Border.all(color: C.ink, width: 2),
      borderRadius: BorderRadius.circular(10),
    ),
    child: Text(
      SPlay.turnShort(S.team[team]!),
      style: T.b(13, color: C.ink2, weight: FontWeight.w800),
    ),
  );
}

/// `.ag-clue-right`: kalan hak + sayı kutusu.
class _ClueRight extends StatelessWidget {
  const _ClueRight({required this.team, required this.number, required this.guessesLeft});
  final String team;
  final int number;
  final int? guessesLeft;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Text(
        SPlay.guessesLeft(guessesLeft),
        style: T.b(13, color: C.ink2, weight: FontWeight.w800),
      ),
      const SizedBox(width: 8),
      Semantics(
        label: '${SPlay.count}: ${number == unlimited ? SPlay.unlimited : number}',
        excludeSemantics: true,
        child: Container(
          width: 48,
          height: 48,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: _teamColor(team),
            border: Border.all(color: C.ink, width: 3),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Text(_num(number), style: T.d(28, color: C.ink2, height: 1.45)),
        ),
      ),
    ],
  );
}

/// `.ag-hint` (`.ag-hint-dim`)
class _Hint extends StatelessWidget {
  const _Hint(this.text, {this.dim = false});
  final String text;
  final bool dim;

  @override
  Widget build(BuildContext context) => Text(
    text,
    style: T.b(13, color: dim ? C.text3 : C.text2, weight: FontWeight.w700),
    textAlign: TextAlign.center,
  );
}

/// `.ag-bar`: 12px, 2px çerçeveli hap çubuk; dolgu çerçevenin içinde kırpılır.
class _Bar extends StatelessWidget {
  const _Bar({required this.fill});
  final Widget fill;

  @override
  Widget build(BuildContext context) => Container(
    height: 12,
    decoration: BoxDecoration(
      color: C.panel2,
      border: Border.all(color: C.ink, width: 2),
      borderRadius: BorderRadius.circular(R.pill),
    ),
    child: ClipRRect(
      borderRadius: BorderRadius.circular(R.pill),
      child: Align(alignment: Alignment.centerLeft, child: fill),
    ),
  );
}

/// `.ag-timer`: kalan süre çubuğu (250ms doğrusal geçiş), 10 sn altında kırmızı.
class _Timer extends StatelessWidget {
  const _Timer({required this.remaining, required this.duration});
  final int remaining;
  final int duration;

  @override
  Widget build(BuildContext context) {
    final low = remaining < 10000;
    final secs = (remaining / 1000).ceil();
    return Row(
      children: [
        Expanded(
          child: _Bar(
            fill: AnimatedFractionallySizedBox(
              duration: MediaQuery.disableAnimationsOf(context) ? Duration.zero : const Duration(milliseconds: 250),
              widthFactor: duration > 0 ? (remaining / duration).clamp(0.0, 1.0) : 0,
              heightFactor: 1,
              child: ColoredBox(color: low ? C.red : C.yellow),
            ),
          ),
        ),
        const SizedBox(width: 10),
        ConstrainedBox(
          constraints: const BoxConstraints(minWidth: 48),
          child: Text(
            '$secs ${SPlay.seconds}',
            style: T.b(13, color: low ? C.red : C.text2, weight: FontWeight.w800),
            textAlign: TextAlign.right,
          ),
        ),
      ],
    );
  }
}

/// Kalın çerçeveli, alttan gölgeli düğme (`.ag-submit`, `.ag-end`, `.ag-again`, `.ag-lobby`). Geçiş yok.
class _PushButton extends StatelessWidget {
  const _PushButton({
    required this.label,
    required this.onTap,
    required this.background,
    this.foreground = C.ink2,
    required this.minHeight,
    required this.radius,
    this.shadowY = 0,
    this.pressY = 0,
    required this.fontSize,
    this.icon,
    this.disabled = false,
  });
  final String label;
  final VoidCallback? onTap;
  final Color background;
  final Color foreground;
  final double minHeight;
  final double radius;
  final double shadowY;
  final double pressY;
  final double fontSize;
  final String? icon;
  final bool disabled;

  @override
  Widget build(BuildContext context) {
    final enabled = !disabled && onTap != null;
    final text = Text(
      label,
      style: T.d(fontSize, color: foreground, height: 1.45),
      textAlign: TextAlign.center,
    );
    return Opacity(
      opacity: disabled ? 0.5 : 1,
      child: Pressable(
        onTap: enabled ? onTap : null,
        label: label,
        builder: (context, pressed) {
          final down = pressed && pressY > 0;
          return Transform.translate(
            offset: Offset(0, down ? pressY : 0),
            child: Container(
              constraints: BoxConstraints(minHeight: minHeight),
              // Tarayıcının düğme iç boşluğu (1px 6px).
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: background,
                border: Border.all(color: C.ink, width: 3),
                borderRadius: BorderRadius.circular(radius),
                boxShadow: shadowY > 0 ? hardShadow(0, down ? 1 : shadowY) : null,
              ),
              child: icon == null
                  ? text
                  : Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        SIcon(icon!, size: 22, color: foreground),
                        const SizedBox(width: 10),
                        Flexible(child: text),
                      ],
                    ),
            ),
          );
        },
      ),
    );
  }
}

/// `.ag-guessbar`: oylama notu + "Sırayı bitir".
class _GuessBar extends StatelessWidget {
  const _GuessBar({required this.view, required this.send});
  final AgentsView view;
  final _Send send;

  @override
  Widget build(BuildContext context) => VStack(
    gap: 8,
    children: [
      if (view.revealMode == 'vote') _Hint(SPlay.votesNeed(view.votesNeeded)),
      _PushButton(
        label: SPlay.endTurn,
        background: C.yellow,
        minHeight: 56,
        radius: 20,
        shadowY: 5,
        pressY: 4,
        fontSize: 20,
        onTap: () => send({'type': 'endTurn', 'turn': view.turn}),
      ),
    ],
  );
}

/// İpucu kutusunu büyük harfle gösterir (CSS `text-transform: uppercase`); değer yazıldığı gibi kalır.
class _UpperController extends TextEditingController {
  @override
  TextSpan buildTextSpan({required BuildContext context, TextStyle? style, required bool withComposing}) {
    final upper = trUpper(text);
    final shown = upper.length == text.length ? upper : text;
    if (!withComposing || !value.isComposingRangeValid) return TextSpan(style: style, text: shown);
    final composing = (style ?? const TextStyle()).merge(const TextStyle(decoration: TextDecoration.underline));
    return TextSpan(
      style: style,
      children: [
        TextSpan(text: value.composing.textBefore(shown)),
        TextSpan(style: composing, text: value.composing.textInside(shown)),
        TextSpan(text: value.composing.textAfter(shown)),
      ],
    );
  }
}

/// `.ag-clueform`: liderin ipucu formu.
class _ClueForm extends StatefulWidget {
  const _ClueForm({super.key, required this.view, required this.send});
  final AgentsView view;
  final _Send send;

  @override
  State<_ClueForm> createState() => _ClueFormState();
}

class _ClueFormState extends State<_ClueForm> {
  final _word = _UpperController();
  final _focus = FocusNode();
  bool _focused = false;
  int _count = 1;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _word.addListener(() => setState(() {}));
    _focus.addListener(() => setState(() => _focused = _focus.hasFocus));
  }

  @override
  void dispose() {
    _word.dispose();
    _focus.dispose();
    super.dispose();
  }

  String? _problem() {
    final hidden = [
      for (final c in widget.view.cards)
        if (!c.revealed) c.word,
    ];
    return _word.text.trim().isNotEmpty ? clueProblem(_word.text, hidden) : null;
  }

  Future<void> _submit() async {
    if (_busy || _problem() != null || _word.text.trim().isEmpty) return;
    setState(() => _busy = true);
    final ok = await widget.send({'type': 'clue', 'word': _word.text.trim(), 'number': _count});
    if (!mounted) return;
    setState(() {
      _busy = false;
      if (ok) _word.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    final team = _teamColor(widget.view.team);
    final problem = _problem();
    final counts = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, unlimited];
    final inputStyle = T.d(26, color: C.ink2, height: 1.2);
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
      decoration: BoxDecoration(
        color: C.paper,
        border: Border.all(color: C.ink, width: 3),
        borderRadius: BorderRadius.circular(18),
      ),
      child: VStack(
        gap: 8,
        children: [
          Text(trUpper(SPlay.yourClue), style: _labelStyle()),
          FocusRing(
            focused: _focused,
            radius: 14,
            color: C.violet,
            child: Container(
              constraints: const BoxConstraints(minHeight: 52),
              alignment: Alignment.centerLeft,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                color: C.paper2,
                border: Border.all(color: problem != null ? C.red : C.ink, width: 3),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Semantics(
                label: SPlay.yourClue,
                child: TextField(
                  controller: _word,
                  focusNode: _focus,
                  maxLength: 24,
                  maxLengthEnforcement: MaxLengthEnforcement.enforced,
                  inputFormatters: [FilteringTextInputFormatter.deny(RegExp(r'\s'))],
                  autocorrect: false,
                  enableSuggestions: false,
                  textCapitalization: TextCapitalization.none,
                  textInputAction: TextInputAction.done,
                  onSubmitted: (_) => _submit(),
                  cursorColor: C.ink2,
                  style: inputStyle,
                  decoration: InputDecoration(
                    isCollapsed: true,
                    border: InputBorder.none,
                    counterText: '',
                    semanticCounterText: '',
                    hintText: SPlay.cluePlaceholder,
                    hintStyle: inputStyle.copyWith(fontSize: 20, color: C.violet),
                  ),
                ),
              ),
            ),
          ),
          Text(trUpper(SPlay.count), style: _labelStyle()),
          Semantics(
            container: true,
            label: SPlay.count,
            child: Grid2(
              columns: 6,
              rowGap: 6,
              columnGap: 6,
              children: [
                for (final n in counts)
                  Pressable(
                    onTap: () => setState(() => _count = n),
                    label: n == unlimited ? SPlay.unlimited : '$n',
                    selected: _count == n,
                    builder: (context, _) => Container(
                      constraints: const BoxConstraints(minHeight: 44),
                      padding: const EdgeInsets.symmetric(horizontal: 6),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: _count == n ? team : C.paper2,
                        border: Border.all(color: C.ink, width: 2),
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: _count == n ? hardShadow(0, 3) : null,
                      ),
                      child: Text(_num(n), style: T.d(18, color: C.ink2, height: 1.45)),
                    ),
                  ),
              ],
            ),
          ),
          Text(
            problem ?? SPlay.clueHint,
            style: T.b(12, color: problem != null ? _formError : C.inkSoft, weight: FontWeight.w700),
          ),
          _PushButton(
            label: SPlay.giveClue,
            background: C.mint,
            minHeight: 56,
            radius: 20,
            shadowY: 5,
            pressY: 4,
            fontSize: 20,
            disabled: _busy || _word.text.trim().isEmpty || problem != null,
            onTap: _submit,
          ),
        ],
      ),
    );
  }
}

/// Lobiye dönüş çubuğu (`.ag-bar-closing`, sunucunun CLOSING_MS'i: 8 sn). Azaltılmış harekette %65'te durur.
class _ClosingBar extends StatefulWidget {
  const _ClosingBar();

  @override
  State<_ClosingBar> createState() => _ClosingBarState();
}

class _ClosingBarState extends State<_ClosingBar> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(seconds: 8))..forward();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reduce = MediaQuery.disableAnimationsOf(context);
    return AnimatedBuilder(
      animation: _c,
      builder: (context, _) => _Bar(
        fill: FractionallySizedBox(
          widthFactor: reduce ? 0.65 : _c.value,
          heightFactor: 1,
          child: const ColoredBox(color: C.yellow),
        ),
      ),
    );
  }
}

/// Satır sonuna yaslanan öğesi olan sarılan flex satırı (`flex-wrap: wrap; gap; margin-left: auto`).
/// [autoIndex] öğesi satırdaki boş alanı soluna alır; [limitIndex] öğesinin genişliği `100% - limitReserve` ile sınırlı.
class _FlexWrap extends MultiChildRenderObjectWidget {
  const _FlexWrap({required super.children, this.columnGap = 0, this.rowGap = 0, this.autoIndex, this.limitIndex, this.limitReserve = 0});
  final double columnGap;
  final double rowGap;
  final int? autoIndex;
  final int? limitIndex;
  final double limitReserve;

  @override
  _RenderFlexWrap createRenderObject(BuildContext context) =>
      _RenderFlexWrap(columnGap: columnGap, rowGap: rowGap, autoIndex: autoIndex, limitIndex: limitIndex, limitReserve: limitReserve);

  @override
  void updateRenderObject(BuildContext context, _RenderFlexWrap renderObject) {
    renderObject
      ..columnGap = columnGap
      ..rowGap = rowGap
      ..autoIndex = autoIndex
      ..limitIndex = limitIndex
      ..limitReserve = limitReserve;
  }
}

class _FlexWrapData extends ContainerBoxParentData<RenderBox> {}

class _RenderFlexWrap extends RenderBox with ContainerRenderObjectMixin<RenderBox, _FlexWrapData>, RenderBoxContainerDefaultsMixin<RenderBox, _FlexWrapData> {
  _RenderFlexWrap({required double columnGap, required double rowGap, int? autoIndex, int? limitIndex, required double limitReserve})
    : _columnGap = columnGap,
      _rowGap = rowGap,
      _autoIndex = autoIndex,
      _limitIndex = limitIndex,
      _limitReserve = limitReserve;

  double _columnGap;
  set columnGap(double v) {
    if (v == _columnGap) return;
    _columnGap = v;
    markNeedsLayout();
  }

  double _rowGap;
  set rowGap(double v) {
    if (v == _rowGap) return;
    _rowGap = v;
    markNeedsLayout();
  }

  int? _autoIndex;
  set autoIndex(int? v) {
    if (v == _autoIndex) return;
    _autoIndex = v;
    markNeedsLayout();
  }

  int? _limitIndex;
  set limitIndex(int? v) {
    if (v == _limitIndex) return;
    _limitIndex = v;
    markNeedsLayout();
  }

  double _limitReserve;
  set limitReserve(double v) {
    if (v == _limitReserve) return;
    _limitReserve = v;
    markNeedsLayout();
  }

  @override
  void setupParentData(RenderBox child) {
    if (child.parentData is! _FlexWrapData) child.parentData = _FlexWrapData();
  }

  List<RenderBox> get _kids {
    final out = <RenderBox>[];
    var c = firstChild;
    while (c != null) {
      out.add(c);
      c = childAfter(c);
    }
    return out;
  }

  BoxConstraints _childConstraints(int i, double maxWidth) => BoxConstraints(maxWidth: i == _limitIndex ? math.max(0, maxWidth - _limitReserve) : maxWidth);

  /// Öğeleri satırlara yerleştirir: konumlar ve toplam yükseklik.
  (List<Offset>, double) _arrange(List<Size> sizes, double maxWidth) {
    final offsets = List<Offset>.filled(sizes.length, Offset.zero);
    var y = 0.0;
    var start = 0;
    while (start < sizes.length) {
      var end = start;
      var used = 0.0;
      while (end < sizes.length) {
        final w = sizes[end].width + (end > start ? _columnGap : 0);
        if (end > start && used + w > maxWidth + 0.01) break;
        used += w;
        end++;
      }
      var lineHeight = 0.0;
      for (var i = start; i < end; i++) {
        lineHeight = math.max(lineHeight, sizes[i].height);
      }
      var x = 0.0;
      for (var i = start; i < end; i++) {
        if (i > start) x += _columnGap;
        if (i == _autoIndex && maxWidth.isFinite) x += math.max(0, maxWidth - used);
        offsets[i] = Offset(x, y + (lineHeight - sizes[i].height) / 2);
        x += sizes[i].width;
      }
      y += lineHeight;
      start = end;
      if (start < sizes.length) y += _rowGap;
    }
    return (offsets, y);
  }

  double _naturalWidth(List<Size> sizes) {
    var w = 0.0;
    for (var i = 0; i < sizes.length; i++) {
      w += sizes[i].width + (i > 0 ? _columnGap : 0);
    }
    return w;
  }

  @override
  void performLayout() {
    final kids = _kids;
    final maxWidth = constraints.maxWidth;
    final sizes = <Size>[];
    for (var i = 0; i < kids.length; i++) {
      kids[i].layout(_childConstraints(i, maxWidth), parentUsesSize: true);
      sizes.add(kids[i].size);
    }
    final (offsets, height) = _arrange(sizes, maxWidth);
    for (var i = 0; i < kids.length; i++) {
      (kids[i].parentData! as _FlexWrapData).offset = offsets[i];
    }
    size = constraints.constrain(Size(maxWidth.isFinite ? maxWidth : _naturalWidth(sizes), height));
  }

  @override
  Size computeDryLayout(covariant BoxConstraints constraints) {
    final kids = _kids;
    final sizes = [for (var i = 0; i < kids.length; i++) kids[i].getDryLayout(_childConstraints(i, constraints.maxWidth))];
    final height = _arrange(sizes, constraints.maxWidth).$2;
    return constraints.constrain(Size(constraints.maxWidth.isFinite ? constraints.maxWidth : _naturalWidth(sizes), height));
  }

  double _heightFor(double width) {
    final kids = _kids;
    final sizes = <Size>[];
    for (var i = 0; i < kids.length; i++) {
      final w = math.min(kids[i].getMaxIntrinsicWidth(double.infinity), _childConstraints(i, width).maxWidth);
      sizes.add(Size(w, kids[i].getMaxIntrinsicHeight(w)));
    }
    return _arrange(sizes, width).$2;
  }

  @override
  double computeMinIntrinsicWidth(double height) {
    var w = 0.0;
    for (final k in _kids) {
      w = math.max(w, k.getMinIntrinsicWidth(double.infinity));
    }
    return w;
  }

  @override
  double computeMaxIntrinsicWidth(double height) {
    final kids = _kids;
    var w = 0.0;
    for (var i = 0; i < kids.length; i++) {
      w += kids[i].getMaxIntrinsicWidth(double.infinity) + (i > 0 ? _columnGap : 0);
    }
    return w;
  }

  @override
  double computeMinIntrinsicHeight(double width) => _heightFor(width);

  @override
  double computeMaxIntrinsicHeight(double width) => _heightFor(width);

  @override
  bool hitTestChildren(BoxHitTestResult result, {required Offset position}) => defaultHitTestChildren(result, position: position);

  @override
  void paint(PaintingContext context, Offset offset) => defaultPaint(context, offset);
}
