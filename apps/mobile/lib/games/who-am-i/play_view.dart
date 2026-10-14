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
import 'strings.dart';

// who-am-i.css sabitleri
const _noteMine = Color(0xFFFFE680);
const _noteInk = Color(0xFF2B2116);
const _irrelevant = Color(0xFFE8E0C8);
const _track = Color(0xFFEEE8FF);

/// Not kâğıtları hafif eğik dursun; her oyuncunun açısı ve rengi sabit (tasarım: -4, 3, -2, 4).
const _tilts = <double>[-4, 3, -2, 4, -3, 2, -4, 3, -2, 4, -3, 2];
const _noteColors = [C.pink, C.sky, C.mint, C.yellow, C.lilac, C.coral];

/// `[data-answer]` → `--a`
Color _answerColor(String a) => switch (a) {
  'yes' => C.mint,
  'no' => C.red,
  'maybe' => C.yellow,
  _ => _irrelevant,
};

typedef _Send = Future<bool> Function(Json action);

/// `.wa-box-title` (h2): Nunito 12, 800, 1.5px aralık, büyük harf, text-3, satır 1.05.
final _boxTitle = T.b(12, color: C.text3, weight: FontWeight.w800, letterSpacing: 1.5, height: 1.05);

/// Flex `gap`: boşluk her öğenin arasına (`.wa-spacer` dahil) girer.
List<Widget> _gapped(double gap, List<Widget> items) {
  final out = <Widget>[];
  for (final w in items) {
    if (out.isNotEmpty) out.add(SizedBox(height: gap));
    out.add(w);
  }
  return out;
}

/// games/who-am-i/client/PlayView.tsx
class WhoAmIPlayView extends StatefulWidget {
  const WhoAmIPlayView({super.key, required this.props});
  final PlayViewProps props;

  @override
  State<WhoAmIPlayView> createState() => _WhoAmIPlayViewState();
}

class _WhoAmIPlayViewState extends State<WhoAmIPlayView> {
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
    final view = WhoAmIView.fromJson(p.view);
    final members = membersOf(p.room);
    String nick(String id) => id == p.meId ? SPlay.you : (members[id]?.nick ?? '?');
    final isHost = p.room.hostId == p.meId;

    if (view.phase == 'podium') return _Podium(view: view, members: members, meId: p.meId, code: p.room.code);

    PlayerCard? me;
    for (final c in view.players) {
      if (c.id == p.meId) me = c;
    }

    final stage = _stage(view: view, meId: p.meId, isHost: isHost, nick: nick, members: members);
    final corner = me == null ? null : _myCorner(view, me);

    // `.wa-play`: flex sütun, gap 12, min-height calc(100dvh - 72px - 22px); `.wa-spacer` kalan boşluğu alır.
    final play = ConstrainedBox(
      constraints: BoxConstraints(minHeight: viewportHeight(context) - 72 - 22),
      child: IntrinsicHeight(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: _gapped(12, [
            _Top(turn: view.turnNumber, code: p.room.code),
            _Foreheads(view: view, members: members, meId: p.meId),
            ?stage,
            if (_error != null) Semantics(liveRegion: true, child: ErrorText(_error!, center: true)),
            _History(key: const ValueKey('wa-history'), view: view, meId: p.meId, nick: nick),
            const Spacer(),
            ?corner,
          ]),
        ),
      ),
    );

    // `.sg` (72px üst, 24px alt, gutter) + `.sg-center` (en fazla 400px, gap 22). Yan sütunlar (oyuncular ve
    // oyun içi ayarlar) telefonda gizli (`.sg-side { display: none }`; yalnızca ≥1100px).
    final g = Layout.gutter(context);
    return GameColumn(
      maxWidth: 400 + 2 * g,
      bottom: 24,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [play, const SizedBox(height: 22), const _HowTo()]),
    );
  }

  /// Ortadaki sahne: kimin ne yapacağı.
  Widget? _stage({
    required WhoAmIView view,
    required String meId,
    required bool isHost,
    required String Function(String id) nick,
    required Map<String, RoomPlayer> members,
  }) {
    final asker = view.askerId;
    if (asker == null) return null;
    PlayerCard? askerCard;
    for (final c in view.players) {
      if (c.id == asker) askerCard = c;
    }
    final mine = asker == meId;
    final iPlay = view.players.any((c) => c.id == meId && !c.left);
    final askerOffline = !(members[asker]?.connected ?? false);

    // Grup onayı bekleyen tahmin
    final g = view.guess;
    if (g != null) {
      if (g.playerId == meId) {
        return _WaCard(
          children: [
            Text(SPlay.guessPendingMineHint, style: _kickerStyle),
            _quote(SPlay.guessPendingMine(g.text)),
            _count(SPlay.voted(g.voted.length, g.expected)),
          ],
        );
      }
      return _WaCard(
        children: [
          _Kicker(text: SPlay.guessPending(nick(g.playerId)), card: askerCard),
          _quote('“${g.text}”'),
          if (iPlay)
            Grid2(
              rowGap: 8,
              columnGap: 8,
              children: [
                _AnswerButton(
                  label: SPlay.correct,
                  color: _answerColor('yes'),
                  pressed: g.myVote == true,
                  onTap: () => _send({'type': 'verify', 'guessId': g.id, 'correct': true}),
                ),
                _AnswerButton(
                  label: SPlay.wrong,
                  color: _answerColor('no'),
                  pressed: g.myVote == false,
                  onTap: () => _send({'type': 'verify', 'guessId': g.id, 'correct': false}),
                ),
              ],
            ),
          _count('${SPlay.votes(g.correctVotes, g.wrongVotes)}. ${SPlay.voted(g.voted.length, g.expected)}'),
          if (isHost && g.voted.isNotEmpty) _CardButton(label: SPlay.closeVote, onTap: () => _send({'type': 'close', 'guessId': g.id})),
        ],
      );
    }

    // Açık soru
    final q = view.question;
    if (q != null) {
      if (mine) {
        return _WaCard(
          children: [
            Text(SPlay.myQuestion, style: _kickerStyle),
            _quote(q.text != null ? '“${q.text}”' : SPlay.myQuestionVoice),
            _Tally(counts: q.counts, expected: q.expected),
            _count(SPlay.answered(q.answered.length, q.expected)),
            if (q.answered.isNotEmpty) _CardButton(label: SPlay.closeNow, onTap: () => _send({'type': 'close', 'questionId': q.id})),
          ],
        );
      }
      return _WaCard(
        children: [
          _Kicker(text: SPlay.answerTitle(nick(asker)), card: askerCard),
          _quote(q.text != null ? '“${q.text}”' : SPlay.voiceQuestion),
          if (iPlay)
            Grid2(
              rowGap: 8,
              columnGap: 8,
              children: [
                for (final a in answers)
                  _AnswerButton(
                    label: S.answers[a]!,
                    color: _answerColor(a),
                    pressed: q.myAnswer == a,
                    onTap: () => _send({'type': 'answer', 'questionId': q.id, 'answer': a}),
                  ),
              ],
            ),
          _Tally(counts: q.counts, expected: q.expected),
          _count(SPlay.answered(q.answered.length, q.expected)),
          if (isHost && q.answered.isNotEmpty) _CardButton(label: SPlay.closeNow, onTap: () => _send({'type': 'close', 'questionId': q.id})),
        ],
      );
    }

    // Sıra bende: soru sor ya da tahmin et
    if (mine) return _MyTurn(key: const ValueKey('wa-myturn'), view: view, send: _send);

    // Başkası soracak
    final last = _lastResult(view);
    return _WaCard(
      children: [
        _Kicker(text: SPlay.nextUp(nick(asker)), card: askerCard),
        _quote(SPlay.waitAsk(nick(asker)), small: true),
        ?last,
        if (isHost) _CardButton(label: SPlay.skip(nick(asker)), icon: 'skip', strong: askerOffline, onTap: () => _send({'type': 'pass'})),
      ],
    );
  }

  /// Bana özel: ipuçları ya da "bildin".
  Widget? _myCorner(WhoAmIView view, PlayerCard me) {
    if (me.finished && me.identity != null) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(color: C.mint, border: Border.all(color: C.ink, width: bw), borderRadius: BorderRadius.circular(18)),
        child: VStack(
          gap: 2,
          children: [
            Text(SPlay.done((me.finishRank ?? 0) + 1), style: T.d(22, color: C.ink2, height: 1.05)),
            Text(me.identity!.name, style: T.b(15, color: C.ink2, weight: FontWeight.w800)),
            Text(SPlay.doneHint, style: T.b(12, color: C.ink2, weight: FontWeight.w700)),
          ],
        ),
      );
    }
    if (view.hintLimit == 0) return null;
    return Semantics(
      container: true,
      label: SPlay.hintsTitle,
      child: VStack(
        gap: 8,
        children: [
          if (view.myHints.isNotEmpty)
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                for (final h in view.myHints)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(color: C.yellow, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(10)),
                    child: Text(h, style: T.b(13, color: C.ink2, weight: FontWeight.w800)),
                  ),
              ],
            ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Flexible(child: Text(SPlay.hintNote, style: T.b(12, color: C.text3, weight: FontWeight.w700))),
              if (view.hintsLeft > 0) ...[
                const SizedBox(width: 10),
                Pressable(
                  onTap: () => _send({'type': 'hint'}),
                  label: SPlay.hintButton(view.hintsLeft),
                  builder: (context, _) => Container(
                    constraints: const BoxConstraints(minHeight: 46),
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(border: Border.all(color: C.yellow, width: 2), borderRadius: BorderRadius.circular(14)),
                    child: Text(SPlay.hintButton(view.hintsLeft), style: T.b(14, color: C.text, weight: FontWeight.w800)),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------- Üst şerit

class _Top extends StatelessWidget {
  const _Top({required this.turn, required this.code});
  final int turn;
  final String code;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisAlignment: MainAxisAlignment.spaceBetween,
    children: [
      Flexible(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
          decoration: BoxDecoration(color: C.yellow, border: Border.all(color: C.ink, width: bw), borderRadius: BorderRadius.circular(R.pill)),
          child: Text('${S.name} · ${SPlay.turn(turn)}', style: T.d(16, color: C.ink2, height: 1.2), maxLines: 1, softWrap: false),
        ),
      ),
      const SizedBox(width: 10),
      Text(code, style: T.b(13, color: C.text3, weight: FontWeight.w800, letterSpacing: 2)),
    ],
  );
}

// ---------------------------------------------------------------- Alın kartları

class _Note extends StatelessWidget {
  const _Note({required this.card, required this.mine, required this.index});
  final PlayerCard card;
  final bool mine;
  final int index;

  @override
  Widget build(BuildContext context) {
    final identity = card.identity;
    final hidden = identity == null;
    final fg = hidden ? _noteInk : C.ink2;
    return Semantics(
      label: hidden ? SPlay.yourCard : identity.name,
      child: Transform.rotate(
        angle: deg(_tilts[index % _tilts.length]),
        child: Container(
          width: double.infinity,
          constraints: const BoxConstraints(minHeight: 62),
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
          decoration: BoxDecoration(
            color: hidden ? _noteMine : _noteColors[index % _noteColors.length],
            border: Border.all(color: C.ink, width: 2),
            borderRadius: BorderRadius.circular(4),
            boxShadow: hardShadow(3, 3),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: hidden
                ? [ExcludeSemantics(child: Text(SPlay.unknown, style: T.d(34, color: fg)))]
                : [
                    Text(identity.name, style: T.d(14, color: fg), textAlign: TextAlign.center),
                    if (!mine) Text(identity.category, style: T.b(9, color: fg, weight: FontWeight.w800), textAlign: TextAlign.center),
                  ],
          ),
        ),
      ),
    );
  }
}

class _Foreheads extends StatelessWidget {
  const _Foreheads({required this.view, required this.members, required this.meId});
  final WhoAmIView view;
  final Map<String, RoomPlayer> members;
  final String meId;

  @override
  Widget build(BuildContext context) {
    final faces = <Widget>[];
    for (var i = 0; i < view.players.length; i++) {
      final c = view.players[i];
      final m = members[c.id];
      final asking = view.askerId == c.id;
      final offline = !c.left && m != null && !m.connected;
      final meta = asking
          ? SPlay.asking
          : c.finished
          ? '✓ ${SPlay.finished((c.finishRank ?? 0) + 1)}'
          : c.left
          ? SPlay.left
          : offline
          ? SPlay.offline
          : SPlay.questions(c.questions);
      final metaColor = asking ? C.yellow : (c.finished ? C.mint : C.text3);
      faces.add(
        Opacity(
          opacity: c.left || offline ? 0.55 : 1,
          child: Column(
            children: [
              _Note(card: c, mine: c.id == meId, index: i),
              const SizedBox(height: 4),
              Text(
                c.id == meId ? SPlay.you : (m?.nick ?? '?'),
                style: T.b(12, color: C.text, weight: FontWeight.w800),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
              ),
              // gap 4 + margin-top -4
              Text(meta, style: T.b(10, color: metaColor, weight: FontWeight.w700), textAlign: TextAlign.center),
            ],
          ),
        ),
      );
    }
    // `.wa-faces`: 4 sütun, satır 12 / sütun 8, üstte 4px
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Semantics(
        container: true,
        label: SPlay.progressTitle,
        child: Grid2(columns: 4, rowGap: 12, columnGap: 8, children: faces),
      ),
    );
  }
}

// ---------------------------------------------------------------- Sahne parçaları

final _kickerStyle = T.b(13, color: C.ink2, weight: FontWeight.w800);

Widget _quote(String text, {bool small = false}) => Text(text, style: T.d(small ? 22 : 28, color: C.ink2, height: 1.05));

Widget _count(String text) => Text(text, style: T.b(12, color: C.inkSoft, weight: FontWeight.w800));

/// `.wa-card`: beyaz kart.
class _WaCard extends StatelessWidget {
  const _WaCard({required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: C.paper,
      border: Border.all(color: C.ink, width: bw),
      borderRadius: BorderRadius.circular(24),
      boxShadow: hardShadow(6, 6),
    ),
    child: VStack(gap: 12, children: children),
  );
}

/// "Mert soruyor · kartı: Zürafa"
class _Kicker extends StatelessWidget {
  const _Kicker({required this.text, required this.card});
  final String text;
  final PlayerCard? card;

  @override
  Widget build(BuildContext context) {
    final identity = card?.identity;
    return Text.rich(
      TextSpan(
        text: text,
        children: [
          if (identity != null) ...[
            const TextSpan(text: ' · ${SPlay.cardIs} '),
            // <strong>: 800'den kalını yüklü değil, web'de de 800 çizilir.
            TextSpan(text: identity.name),
          ],
        ],
      ),
      style: _kickerStyle,
    );
  }
}

/// `.wa-answer`: renkli cevap düğmesi; seçiliyken aşağı iner ve koyu halka alır.
class _AnswerButton extends StatelessWidget {
  const _AnswerButton({required this.label, required this.color, required this.pressed, required this.onTap});
  final String label;
  final Color color;
  final bool pressed;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final duration = MediaQuery.disableAnimationsOf(context) ? Duration.zero : const Duration(milliseconds: 80);
    return Pressable(
      onTap: onTap,
      label: label,
      selected: pressed,
      builder: (context, _) => AnimatedContainer(
        duration: duration,
        transform: Matrix4.translationValues(0, pressed ? 3 : 0, 0),
        child: FocusRing(
          focused: pressed,
          radius: 14,
          color: C.ink2,
          child: AnimatedContainer(
            duration: duration,
            constraints: const BoxConstraints(minHeight: 50),
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: color,
              border: Border.all(color: C.ink, width: bw),
              borderRadius: BorderRadius.circular(14),
              boxShadow: hardShadow(0, pressed ? 1 : 4),
            ),
            child: Text(label, style: T.d(18, color: C.ink2, height: 1.45), textAlign: TextAlign.center),
          ),
        ),
      ),
    );
  }
}

class _Tally extends StatelessWidget {
  const _Tally({required this.counts, required this.expected});
  final Map<String, int> counts;
  final int expected;

  @override
  Widget build(BuildContext context) {
    final sum = answers.fold<int>(0, (n, a) => n + (counts[a] ?? 0));
    final total = math.max(expected, math.max(sum, 1));
    final style = T.b(12, color: C.ink2, weight: FontWeight.w800);
    final duration = MediaQuery.disableAnimationsOf(context) ? Duration.zero : const Duration(milliseconds: 300);
    return VStack(
      gap: 4,
      children: [
        for (final a in answers)
          Row(
            children: [
              SizedBox(width: 62, child: Text(S.answers[a]!, style: style)),
              const SizedBox(width: 8),
              Expanded(
                child: Container(
                  height: 10,
                  clipBehavior: Clip.antiAlias,
                  alignment: Alignment.centerLeft,
                  decoration: BoxDecoration(color: _track, borderRadius: BorderRadius.circular(R.pill)),
                  child: AnimatedFractionallySizedBox(
                    duration: duration,
                    curve: Curves.easeOut,
                    widthFactor: ((counts[a] ?? 0) / total).clamp(0.0, 1.0),
                    heightFactor: 1,
                    child: DecoratedBox(
                      decoration: BoxDecoration(color: _answerColor(a), borderRadius: BorderRadius.circular(R.pill)),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              SizedBox(width: 14, child: Text('${counts[a] ?? 0}', style: style, maxLines: 1, softWrap: false)),
            ],
          ),
      ],
    );
  }
}

/// `.wa-card-btn`: kartın ortasında ince çerçeveli düğme; `data-strong` koyu.
class _CardButton extends StatelessWidget {
  const _CardButton({required this.label, required this.onTap, this.icon, this.strong = false});
  final String label;
  final VoidCallback onTap;
  final String? icon;
  final bool strong;

  @override
  Widget build(BuildContext context) {
    final fg = strong ? C.text : C.ink2;
    return Align(
      alignment: Alignment.center,
      child: Pressable(
        onTap: onTap,
        label: label,
        builder: (context, _) => Container(
          constraints: const BoxConstraints(minHeight: 44),
          padding: const EdgeInsets.symmetric(horizontal: 14),
          decoration: BoxDecoration(
            color: strong ? C.ink2 : null,
            border: Border.all(color: C.ink, width: 2),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[SIcon(icon!, size: 14, color: fg), const SizedBox(width: 6)],
              Flexible(child: Text(label, style: T.b(14, color: fg, weight: FontWeight.w800), textAlign: TextAlign.center)),
            ],
          ),
        ),
      ),
    );
  }
}

/// `.wa-pill`: cevap hapı.
class _Pill extends StatelessWidget {
  const _Pill({required this.color, required this.label, required this.size, this.bordered = false});
  final Color color;
  final String label;
  final double size;
  final bool bordered;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8),
    decoration: BoxDecoration(
      color: color,
      borderRadius: BorderRadius.circular(R.pill),
      border: bordered ? Border.all(color: C.ink, width: 2) : null,
    ),
    child: Text(label, style: T.b(size, color: C.ink2, weight: FontWeight.w800)),
  );
}

/// Son sorunun çoğunluk cevabı (sıra aynı kişide devam ederken bağlam verir).
Widget? _lastResult(WhoAmIView view) {
  final last = view.history.isEmpty ? null : view.history.last;
  if (last == null || last.kind != 'question' || last.askerId != view.askerId || view.turnQuestions == 0) return null;
  final style = T.b(13, color: C.ink2, weight: FontWeight.w800);
  return Text.rich(
    TextSpan(
      children: [
        TextSpan(text: '${SPlay.lastAnswer} ${last.text != null ? '“${last.text}”' : SPlay.voice} '),
        WidgetSpan(
          alignment: PlaceholderAlignment.baseline,
          baseline: TextBaseline.alphabetic,
          child: _Pill(color: _answerColor(last.result), label: S.answers[last.result] ?? last.result, size: 13, bordered: true),
        ),
      ],
    ),
    style: style,
  );
}

// ---------------------------------------------------------------- Sıra sende

class _MyTurn extends StatefulWidget {
  const _MyTurn({super.key, required this.view, required this.send});
  final WhoAmIView view;
  final _Send send;

  @override
  State<_MyTurn> createState() => _MyTurnState();
}

class _MyTurnState extends State<_MyTurn> {
  final _question = TextEditingController();
  final _guess = TextEditingController();

  @override
  void initState() {
    super.initState();
    _question.addListener(_changed);
    _guess.addListener(_changed);
  }

  void _changed() => setState(() {});

  @override
  void dispose() {
    _question.dispose();
    _guess.dispose();
    super.dispose();
  }

  Future<void> _ask() async {
    final text = _question.text.trim();
    if (await widget.send({'type': 'ask', if (text.isNotEmpty) 'text': text}) && mounted) _question.clear();
  }

  Future<void> _submitGuess() async {
    final text = _guess.text.trim();
    if (text.isEmpty) return;
    if (await widget.send({'type': 'guess', 'text': text}) && mounted) _guess.clear();
  }

  @override
  Widget build(BuildContext context) {
    final view = widget.view;
    final left = math.max(0, questionsPerTurn - view.turnQuestions);
    final last = _lastResult(view);
    final canGuess = _guess.text.trim().isNotEmpty;
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
          Text(SPlay.myTurn, style: T.d(28, color: C.ink2)),
          Text(SPlay.myTurnHint(view.turnMode, left), style: T.b(13, color: C.ink2, weight: FontWeight.w700)),
          // `.wa-form`
          VStack(
            gap: 10,
            children: [
              if (view.typedQuestions)
                _WaInput(controller: _question, placeholder: SPlay.questionPlaceholder, maxLength: 140, onSubmitted: _ask),
              Pressable(
                onTap: _ask,
                label: _question.text.trim().isNotEmpty ? SPlay.askTyped : SPlay.askedAloud,
                builder: (context, _) => Container(
                  constraints: const BoxConstraints(minHeight: 52),
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                  alignment: Alignment.center,
                  decoration: BoxDecoration(color: C.ink2, border: Border.all(color: C.ink, width: bw), borderRadius: BorderRadius.circular(16)),
                  child: Text(
                    _question.text.trim().isNotEmpty ? SPlay.askTyped : SPlay.askedAloud,
                    style: T.d(19, color: C.text, height: 1.45),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
            ],
          ),
          ?last,
          // `.wa-guess`
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: _WaInput(controller: _guess, placeholder: SPlay.guessPlaceholder, maxLength: 60, small: true, onSubmitted: _submitGuess),
              ),
              const SizedBox(width: 8),
              Opacity(
                opacity: canGuess ? 1 : 0.6,
                child: Pressable(
                  onTap: canGuess ? _submitGuess : null,
                  label: SPlay.guess,
                  builder: (context, _) => Container(
                    constraints: const BoxConstraints(minHeight: 48),
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(color: C.pink, border: Border.all(color: C.ink, width: bw), borderRadius: BorderRadius.circular(14)),
                    child: Text(SPlay.guess, style: T.d(16, color: C.ink2, height: 1.45)),
                  ),
                ),
              ),
            ],
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Flexible(child: Text(SPlay.guessHint, style: T.b(12, color: C.ink2, weight: FontWeight.w700))),
              const SizedBox(width: 10),
              Pressable(
                onTap: () => widget.send({'type': 'pass'}),
                label: SPlay.passMine,
                builder: (context, _) => Container(
                  constraints: const BoxConstraints(minHeight: 44),
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  alignment: Alignment.center,
                  decoration: BoxDecoration(border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(12)),
                  child: Text(SPlay.passMine, style: T.b(13, color: C.ink2, weight: FontWeight.w800)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// `.wa-input`: beyaz kutu; odakta mor halka (`box-shadow: 0 0 0 3px var(--violet)`, aralıksız).
class _WaInput extends StatefulWidget {
  const _WaInput({required this.controller, required this.placeholder, required this.maxLength, required this.onSubmitted, this.small = false});
  final TextEditingController controller;
  final String placeholder;
  final int maxLength;
  final VoidCallback onSubmitted;

  /// `.wa-input-sm`: 48px, 12px iç boşluk, 16px yazı.
  final bool small;

  @override
  State<_WaInput> createState() => _WaInputState();
}

class _WaInputState extends State<_WaInput> {
  final _focus = FocusNode();
  bool _focused = false;

  @override
  void initState() {
    super.initState();
    _focus.addListener(_onFocus);
  }

  void _onFocus() => setState(() => _focused = _focus.hasFocus);

  @override
  void dispose() {
    _focus.removeListener(_onFocus);
    _focus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => FocusRing(
    focused: _focused,
    radius: 14,
    color: C.violet,
    offset: 0,
    child: Semantics(
      label: widget.placeholder,
      child: SInput(
        controller: widget.controller,
        focusNode: _focus,
        placeholder: widget.placeholder,
        maxLength: widget.maxLength,
        minHeight: widget.small ? 48 : 50,
        fontSize: widget.small ? 16 : 17,
        radius: 14,
        focusColor: Colors.transparent,
        padding: EdgeInsets.symmetric(horizontal: widget.small ? 12 : 14),
        onSubmitted: (_) => widget.onSubmitted(),
      ),
    ),
  );
}

// ---------------------------------------------------------------- Soru geçmişi

class _History extends StatefulWidget {
  const _History({super.key, required this.view, required this.meId, required this.nick});
  final WhoAmIView view;
  final String meId;
  final String Function(String id) nick;

  @override
  State<_History> createState() => _HistoryState();
}

class _HistoryState extends State<_History> {
  bool _onlyMine = false;

  Widget _filter(String label, bool pressed, bool value) => Pressable(
    onTap: () => setState(() => _onlyMine = value),
    label: label,
    selected: pressed,
    builder: (context, _) => Container(
      constraints: const BoxConstraints(minHeight: 32),
      padding: const EdgeInsets.symmetric(horizontal: 9),
      alignment: Alignment.center,
      decoration: BoxDecoration(color: pressed ? C.yellow : C.panel, borderRadius: BorderRadius.circular(8)),
      child: Text(label, style: T.b(12, color: pressed ? C.ink2 : C.text, weight: FontWeight.w800)),
    ),
  );

  @override
  Widget build(BuildContext context) {
    final items = widget.view.history.reversed.where((h) => !_onlyMine || h.askerId == widget.meId).toList();
    return Semantics(
      container: true,
      label: SPlay.historyTitle,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(color: C.panel2, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(16)),
        child: VStack(
          gap: 6,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Flexible(child: Text(trUpper(SPlay.historyTitle), style: _boxTitle)),
                const SizedBox(width: 8),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [_filter(SPlay.all, !_onlyMine, false), const SizedBox(width: 4), _filter(SPlay.mine, _onlyMine, true)],
                ),
              ],
            ),
            if (items.isEmpty)
              Text(SPlay.historyEmpty, style: T.b(13, color: C.text3, weight: FontWeight.w700))
            else
              ConstrainedBox(
                constraints: const BoxConstraints(maxHeight: 220),
                child: SingleChildScrollView(
                  child: VStack(gap: 6, children: [for (final h in items) _HistoryRow(item: h, name: widget.nick(h.askerId))]),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _HistoryRow extends StatelessWidget {
  const _HistoryRow({required this.item, required this.name});
  final HistoryItem item;
  final String name;

  @override
  Widget build(BuildContext context) {
    final who = name.isEmpty ? name : trUpper(name.substring(0, 1)) + name.substring(1);
    final faint = T.b(13, color: C.text3, weight: FontWeight.w700);
    final spans = <InlineSpan>[
      // <strong>: 800 (yüklü en kalın yüz)
      TextSpan(text: '$who:', style: T.b(13, color: C.text, weight: FontWeight.w800)),
      const TextSpan(text: ' '),
      if (item.kind == 'question') item.text != null ? TextSpan(text: item.text) : TextSpan(text: SPlay.voice, style: faint),
      if (item.kind == 'guess') ...[
        TextSpan(text: SPlay.guessed(item.text ?? '')),
        if (item.byGroup) TextSpan(text: ' (${SPlay.byGroup})', style: faint),
      ],
      if (item.kind == 'skip') TextSpan(text: item.byHost ? SPlay.skippedHost : SPlay.skipped, style: faint),
    ];
    Widget? pill;
    if (item.kind == 'question') pill = _Pill(color: _answerColor(item.result), label: S.answers[item.result] ?? item.result, size: 13);
    if (item.kind == 'guess') {
      pill = _Pill(color: _answerColor(item.correct ? 'yes' : 'no'), label: item.correct ? SPlay.correct : SPlay.wrong, size: 13);
    }
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(child: Text.rich(TextSpan(children: spans), style: T.b(13, color: C.text, weight: FontWeight.w700))),
        if (pill != null) ...[const SizedBox(width: 8), pill],
      ],
    );
  }
}

// ---------------------------------------------------------------- Nasıl oynanır

/// `.howto`: üstte 32px boşluk, 3px kesikli mor çizgi, 28px iç boşluk; başlık h2 (22px, satır 1.05).
class _HowTo extends StatelessWidget {
  const _HowTo();

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 32),
    child: CustomPaint(
      painter: const _DashedTop(),
      child: Padding(
        padding: const EdgeInsets.only(top: 3 + 28),
        child: VStack(
          gap: 16,
          children: [
            Text(SHowTo.title, style: T.d(22, color: C.text, height: 1.05)),
            VStack(
              gap: 16,
              children: [
                for (var i = 0; i < SHowTo.steps.length; i++)
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Padding(padding: const EdgeInsets.only(top: 2), child: Text('${i + 1}', style: T.d(16, color: C.yellow, height: 1.45))),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(SHowTo.steps[i].$1, style: T.d(16, color: C.text, height: 1.05)),
                            const SizedBox(height: 2),
                            Text(SHowTo.steps[i].$2, style: T.b(13, color: C.text2)),
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

/// `border-top: 3px dashed`: Chromium'da 3px ve üstü için çizgi 2×, boşluk 1× kalınlık.
class _DashedTop extends CustomPainter {
  const _DashedTop();

  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()
      ..color = C.violet
      ..strokeWidth = 3;
    for (double x = 0; x < size.width; x += 9) {
      canvas.drawLine(Offset(x, 1.5), Offset(math.min(x + 6, size.width), 1.5), p);
    }
  }

  @override
  bool shouldRepaint(_DashedTop old) => false;
}

// ---------------------------------------------------------------- Oyun sonu

class _Podium extends StatelessWidget {
  const _Podium({required this.view, required this.members, required this.meId, required this.code});
  final WhoAmIView view;
  final Map<String, RoomPlayer> members;
  final String meId;
  final String code;

  @override
  Widget build(BuildContext context) {
    final g = Layout.gutter(context);
    // `.col`: en fazla 440 + 2×gutter
    final maxW = Layout.col + 2 * g;
    final vh = viewportHeight(context);
    final ranked = rankPlayers(view.players.where((c) => !c.left).toList());
    final finished = ranked.where((c) => c.finished).toList();
    final winner = finished.isEmpty ? null : finished.first;
    final top = finished.take(2).toList();
    String nickOf(String id) => members[id]?.nick ?? '?';
    final reduced = MediaQuery.disableAnimationsOf(context);

    Widget endCard(PlayerCard c, int i) {
      final first = i == 0;
      final box = Transform.rotate(
        angle: deg(first ? -3 : 2),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: first ? C.mint : C.lilac,
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
                child: Text('${c.questions}', style: T.d(first ? 64 : 52, color: C.ink2)),
              ),
              Text(nickOf(c.id), style: T.b(14, color: C.ink2, weight: FontWeight.w800), maxLines: 1, overflow: TextOverflow.ellipsis),
              Opacity(
                opacity: 0.75,
                child: Text(SPodium.asked(c.questions), style: T.b(11, color: C.ink2, weight: FontWeight.w800), textAlign: TextAlign.center),
              ),
            ],
          ),
        ),
      );
      return ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 220),
        child: first ? box : Align(alignment: Alignment.bottomCenter, child: box),
      );
    }

    final board = Semantics(
      container: true,
      label: SPodium.ranking,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: C.panel, border: Border.all(color: C.ink, width: bw), borderRadius: BorderRadius.circular(18)),
        child: VStack(
          gap: 8,
          children: [
            Text(trUpper(SPodium.ranking), style: _boxTitle),
            VStack(
              gap: 8,
              children: [
                for (var i = 0; i < ranked.length; i++)
                  Builder(
                    builder: (context) {
                      final c = ranked[i];
                      final m = members[c.id];
                      return Row(
                        children: [
                          SizedBox(width: 22, child: Text(c.finished ? SPodium.place(i + 1) : '', style: T.d(15, color: C.yellow, height: 1.45))),
                          const SizedBox(width: 8),
                          if (m != null) ...[SAvatar(avatar: m.avatar, nick: m.nick, size: 28), const SizedBox(width: 8)],
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(m?.nick ?? '?', style: T.b(15, color: C.text, weight: FontWeight.w800), maxLines: 1, overflow: TextOverflow.ellipsis),
                                if (c.identity != null)
                                  Text(c.identity!.name, style: T.b(12, color: C.text3, weight: FontWeight.w700), maxLines: 1, overflow: TextOverflow.ellipsis),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            c.finished ? SPodium.questions(c.questions) : SPodium.notFound,
                            style: T.b(12, color: c.finished ? C.mint : C.text3, weight: FontWeight.w800),
                          ),
                        ],
                      );
                    },
                  ),
              ],
            ),
          ],
        ),
      ),
    );

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
              Text(winner != null ? SPodium.winner(nickOf(winner.id)) : SPodium.none, style: T.d(48, color: C.text, height: 0.95), textAlign: TextAlign.center),
            ],
          ),
        ),
        if (top.isNotEmpty)
          IntrinsicHeight(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (var i = 0; i < top.length; i++) ...[if (i > 0) const SizedBox(width: 12), Flexible(child: endCard(top[i], i))],
              ],
            ),
          ),
        board,
        const Spacer(),
        Column(
          children: [
            // `.wa-end-bar { width: 100% }`: kit EndBar ortalı sütunda kendi dolgusu kadar daralır.
            SizedBox(width: double.infinity, child: reduced ? const _FullBar() : EndBar(durationMs: view.podiumMs)),
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

/// Azaltılmış hareket: `.wa-end-bar span { animation: none }` → çubuk dolu.
class _FullBar extends StatelessWidget {
  const _FullBar();
  @override
  Widget build(BuildContext context) => Container(
    height: 12,
    clipBehavior: Clip.antiAlias,
    decoration: BoxDecoration(color: C.panel2, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(R.pill)),
    child: const SizedBox.expand(child: ColoredBox(color: C.yellow)),
  );
}
