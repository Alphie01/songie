// games/detective/client/Final.tsx karşılığı: suçlama formu, ekip cevabı (karşılaştırma) ve sonuç.
// Ölçüler detective.css "Suçlama, karşılaştırma" ve "Sonuç" bölümlerinden.
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import '../../shared/text.dart';
import '../../ui/icons.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/kit.dart';
import 'bits.dart';
import 'desk.dart';
import 'models.dart';
import 'strings.dart';

// ---------------------------------------------------------------- Ortak

class _Opt {
  const _Opt(this.id, this.text, [this.kind]);
  final String id;
  final String text;
  final String? kind;
}

/// `optionsFor`: soru seçenekleri; yoksa şüpheliler ya da açılmış belgeler (dosyaya giriş sırasıyla).
List<_Opt> _optionsFor(QuestionView q, DetectiveView view) {
  if (q.options.isNotEmpty) return [for (final o in q.options) _Opt(o.id, o.text)];
  if (q.kind == 'suspect') return [for (final c in view.characters) if (c.suspect) _Opt(c.id, c.name)];
  if (q.kind == 'evidence') {
    final list = [...view.evidence]..sort((a, b) => a.seq - b.seq);
    return [for (final e in list) _Opt(e.id, e.title, e.kind)];
  }
  return const [];
}

/// `useLabel`: cevap kimliğinin okunur adı.
String _label(Desk d, String questionId, String? answer) {
  if (answer == null || answer.isEmpty) return SResult.noAnswer;
  for (final q in d.view.questions) {
    if (q.id != questionId) continue;
    for (final o in q.options) {
      if (o.id == answer) return o.text;
    }
  }
  return d.chars[answer]?.name ?? d.evidence[answer]?.title ?? answer;
}

/// JS `Array.prototype.sort` gibi kararlı sıralama (eşitlerde ilk sıra korunur).
List<E> _stableSorted<E>(List<E> list, int Function(E a, E b) compare) {
  final indexed = [for (var i = 0; i < list.length; i++) (i, list[i])];
  indexed.sort((a, b) {
    final c = compare(a.$2, b.$2);
    return c != 0 ? c : a.$1 - b.$1;
  });
  return [for (final e in indexed) e.$2];
}

/// CSS `box-shadow` bulanıklığı (σ = B/2) → Flutter `blurRadius`.
double _blur(double b) => (b / 2 - 0.5) / 0.57735;

/// `.dt-final`: en fazla 760 genişlik, ortada; 16 0 48 dolgu, 16 aralık.
class _FinalFrame extends StatelessWidget {
  const _FinalFrame({required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Align(
    alignment: Alignment.topCenter,
    child: ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 760),
      child: Padding(
        padding: const EdgeInsets.only(top: 16, bottom: 48),
        child: VStack(gap: 16, children: children),
      ),
    ),
  );
}

/// `.dt-final-case`: vaka adı hapı (krem, kahve yazı).
class _CasePill extends StatelessWidget {
  const _CasePill(this.text);
  final String text;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 3),
    decoration: BoxDecoration(color: DtC.cream, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(R.pill)),
    child: Text(text, style: T.b(12, color: DtC.brown, weight: FontWeight.w800)),
  );
}

/// `.dt-final-head`: vaka, başlık, açıklama, "Dosyayı incele".
class _FinalHead extends StatelessWidget {
  const _FinalHead({required this.caseTitle, required this.title, required this.lead, required this.onBrowse});
  final String caseTitle;
  final String title;
  final String lead;
  final VoidCallback onBrowse;

  @override
  Widget build(BuildContext context) => VStack(
    gap: 8,
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      _CasePill(caseTitle),
      Text(title, style: T.d(34, color: C.text)),
      Text(lead, style: T.b(14, color: C.text2, height: 1.5)),
      SGhostButton(label: SAccuse.browse, onPressed: onBrowse),
    ],
  );
}

/// `fieldset.dt-q`: numara, soru, puan; altında içerik (ilk öğe 12, sonrakiler 10 aralıkla).
class _QuestionBox extends StatelessWidget {
  const _QuestionBox({required this.index, required this.q, required this.children});
  final int index;
  final QuestionView q;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final items = <Widget>[
      Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 28,
            height: 28,
            alignment: Alignment.center,
            decoration: BoxDecoration(color: C.yellow, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(10)),
            child: Text('${index + 1}', style: T.b(14, color: C.ink2, weight: FontWeight.w800, height: 1)),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(top: 3),
              child: Text(q.prompt, style: T.b(15, color: C.text, weight: FontWeight.w800, height: 1.35)),
            ),
          ),
          const SizedBox(width: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(color: C.sky, borderRadius: BorderRadius.circular(8)),
            child: Text(SAccuse.points(q.points), style: T.b(12, color: C.ink2, weight: FontWeight.w800)),
          ),
        ],
      ),
    ];
    for (var i = 0; i < children.length; i++) {
      items.add(SizedBox(height: i == 0 ? 12 : 10));
      items.add(children[i]);
    }
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: DtC.card, border: Border.all(color: DtC.cardLine, width: 2), borderRadius: BorderRadius.circular(20)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: items),
    );
  }
}

/// `.dt-q-opt-text`: (simge) + metin, 8 0 dolgu, satır 1.3.
class _OptText extends StatelessWidget {
  const _OptText(this.o);
  final _Opt o;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 8),
    child: Row(
      children: [
        if (o.kind != null) ...[KindGlyph(o.kind!, size: 14), const SizedBox(width: 8)],
        Flexible(child: Text(o.text, style: const TextStyle(height: 1.3))),
      ],
    ),
  );
}

/// `.dt-q-opts`: 8 aralıklı seçenekler; şüpheli sorusunda 720px'ten itibaren iki sütun.
Widget _optsGrid(BuildContext context, List<Widget> rows, {bool twoCols = false}) {
  if (twoCols && MediaQuery.sizeOf(context).width >= 720) return Grid2(rowGap: 8, columnGap: 8, equalHeight: true, children: rows);
  return VStack(gap: 8, children: rows);
}

// ---------------------------------------------------------------- Suçlama

/// `Accuse`: herkes formu kendisi doldurur; oda sahibi formları toplar.
class AccuseScreen extends StatefulWidget {
  const AccuseScreen({super.key, required this.onBrowse});
  final VoidCallback onBrowse;

  @override
  State<AccuseScreen> createState() => _AccuseScreenState();
}

class _AccuseScreenState extends State<AccuseScreen> {
  Map<String, String> _answers = {};
  bool _busy = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // useState(mine) + useEffect([mine]): gelen form yerel seçimlerin altına katılır.
    final mine = Desk.of(context).view.accuse?.mine;
    if (mine != null) _answers = {...mine, ..._answers};
  }

  Future<void> _submit(Desk d) async {
    setState(() => _busy = true);
    await d.send({'type': 'answer', 'answers': Map<String, String>.of(_answers)});
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    final d = Desk.of(context);
    final view = d.view;
    final mine = view.accuse?.mine;
    final missing = view.questions.where((q) => (_answers[q.id] ?? '').isEmpty).length;
    final submitted = view.accuse?.submitted ?? const <String>[];
    final changed = mine == null || view.questions.any((q) => mine[q.id] != _answers[q.id]);
    final players = d.room.players;

    final form = VStack(
      gap: 14,
      children: [
        for (var i = 0; i < view.questions.length; i++)
          Builder(
            builder: (context) {
              final q = view.questions[i];
              return _QuestionBox(
                index: i,
                q: q,
                children: [
                  if (q.kind != 'choice') Text(q.kind == 'suspect' ? SAccuse.pickSuspect : SAccuse.pickEvidence, style: dtSmall(C.text3)),
                  _optsGrid(
                    context,
                    twoCols: q.kind == 'suspect',
                    [
                      for (final o in _optionsFor(q, view))
                        DtOption(
                          selected: _answers[q.id] == o.id,
                          onTap: () => setState(() => _answers = {..._answers, q.id: o.id}),
                          trailing: _answers[q.id] == o.id ? const SIcon('check', size: 14, color: C.ink2) : null,
                          child: _OptText(o),
                        ),
                    ],
                  ),
                ],
              );
            },
          ),
        VStack(
          gap: 8,
          children: [
            if (mine != null && !changed)
              Text(SAccuse.sent, style: dtSmall(C.mint))
            else if (missing > 0)
              Text(SAccuse.incomplete(missing), style: dtSmall(C.text3)),
            SButton(
              label: mine != null ? SAccuse.update : SAccuse.submit,
              tone: BtnTone.primary,
              large: true,
              block: true,
              onPressed: _busy || !changed || _answers.isEmpty ? null : () => _submit(d),
            ),
          ],
        ),
      ],
    );

    final status = Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: DtC.card, border: Border.all(color: DtC.cardLine, width: 2), borderRadius: BorderRadius.circular(20)),
      child: VStack(
        gap: 10,
        children: [
          DtLabel(SAccuse.submitted, count: '${submitted.length}/${players.length}'),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final p in players)
                Builder(
                  builder: (context) {
                    final done = submitted.contains(p.id);
                    final fg = done ? C.ink2 : C.text;
                    return Container(
                      padding: const EdgeInsets.fromLTRB(4, 4, 10, 4),
                      decoration: BoxDecoration(
                        color: done ? C.mint : C.panel2,
                        border: Border.all(color: C.ink, width: 2),
                        borderRadius: BorderRadius.circular(R.pill),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          SAvatar(avatar: p.avatar, nick: p.nick, size: 28, dim: !done),
                          const SizedBox(width: 6),
                          Flexible(child: Text(p.nick, style: T.b(13, color: fg, weight: FontWeight.w800))),
                          if (done) ...[const SizedBox(width: 6), SIcon('check', size: 14, color: fg)],
                        ],
                      ),
                    );
                  },
                ),
            ],
          ),
          if (d.isHost)
            VStack(
              gap: 8,
              children: [
                Text(SAccuse.collectHint(submitted.length, players.length), style: dtSmall(C.text3)),
                SButton(label: SAccuse.collect, tone: BtnTone.primary, block: true, onPressed: submitted.isEmpty ? null : () => d.send({'type': 'collect'})),
                SGhostButton(label: SAccuse.reopen, block: true, onPressed: () => d.send({'type': 'reopen'})),
              ],
            )
          else
            Text(SAccuse.waitHost, style: dtSmall(C.text3)),
        ],
      ),
    );

    return _FinalFrame(
      children: [
        _FinalHead(caseTitle: view.caseInfo.title, title: SAccuse.title, lead: SAccuse.lead, onBrowse: widget.onBrowse),
        form,
        status,
      ],
    );
  }
}

// ---------------------------------------------------------------- Karşılaştırma

/// `Reconcile`: formlar yan yana; oda sahibi ekip cevabını seçip teslim eder.
class ReconcileScreen extends StatelessWidget {
  const ReconcileScreen({super.key, required this.onBrowse});
  final VoidCallback onBrowse;

  @override
  Widget build(BuildContext context) {
    final d = Desk.of(context);
    final view = d.view;
    final rec = view.reconcile;
    if (rec == null) return const SizedBox.shrink();
    final missing = view.questions.any((q) => (rec.finals[q.id] ?? '').isEmpty);

    Widget question(int i, QuestionView q) {
      final tally = rec.tallies[q.id] ?? const <String, List<String>>{};
      final fin = rec.finals[q.id];
      final total = tally.values.fold<int>(0, (t, v) => t + v.length);
      final opts = _optionsFor(q, view);
      int votes(String id) => tally[id]?.length ?? 0;
      // Oylanan seçenekler önce (çoktan aza, eşitlikte sıra korunur), sonra (oda sahibi için) diğerleri.
      final indexed = [for (var k = 0; k < opts.length; k++) (k, opts[k])];
      final voted = indexed.where((e) => votes(e.$2.id) > 0).toList()
        ..sort((a, b) {
          final c = votes(b.$2.id) - votes(a.$2.id);
          return c != 0 ? c : a.$1 - b.$1;
        });
      final extra = tally.keys.where((k) => !opts.any((o) => o.id == k)).map((id) => _Opt(id, id));
      final rest = d.isHost ? opts.where((o) => votes(o.id) == 0) : const <_Opt>[];
      final rows = [...voted.map((e) => e.$2), ...extra, ...rest];

      return _QuestionBox(
        index: i,
        q: q,
        children: [
          if (total == 0) Text(SReconcile.noVotes, style: dtSmall(C.text3)),
          VStack(
            gap: 8,
            children: [
              for (final o in rows)
                Builder(
                  builder: (context) {
                    final voters = tally[o.id] ?? const <String>[];
                    final isFinal = fin == o.id;
                    final option = DtOption(
                      selected: isFinal,
                      onTap: d.isHost ? () => d.send({'type': 'final', 'questionId': q.id, 'answer': o.id}) : null,
                      trailing: isFinal
                          ? Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(color: C.yellow, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(8)),
                              child: Text(SReconcile.teamAnswer, style: T.b(11, color: C.ink2, weight: FontWeight.w800)),
                            )
                          : null,
                      child: _OptText(o),
                    );
                    return VStack(
                      gap: 6,
                      children: [
                        d.isHost ? Semantics(hint: SReconcile.hostPick, child: option) : option,
                        if (voters.isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(left: 4),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Container(
                                    height: 10,
                                    clipBehavior: Clip.antiAlias,
                                    alignment: Alignment.centerLeft,
                                    decoration: BoxDecoration(color: C.panel2, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(R.pill)),
                                    child: FractionallySizedBox(
                                      widthFactor: (voters.length / (total < 1 ? 1 : total)).clamp(0.0, 1.0),
                                      heightFactor: 1,
                                      child: const ColoredBox(color: C.yellow),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    for (var k = 0; k < voters.length; k++) ...[
                                      if (k > 0) const SizedBox(width: 4),
                                      if (d.player(voters[k]) case final p?)
                                        SAvatar(avatar: p.avatar, nick: p.nick, size: 20)
                                      else
                                        Text(d.nick(voters[k]), style: T.b(16, color: C.text)),
                                    ],
                                  ],
                                ),
                              ],
                            ),
                          ),
                      ],
                    );
                  },
                ),
            ],
          ),
        ],
      );
    }

    return _FinalFrame(
      children: [
        _FinalHead(caseTitle: view.caseInfo.title, title: SReconcile.title, lead: SReconcile.lead, onBrowse: onBrowse),
        VStack(
          gap: 14,
          children: [
            for (var i = 0; i < view.questions.length; i++) question(i, view.questions[i]),
            VStack(
              gap: 8,
              children: d.isHost
                  ? [
                      if (missing) Text(SReconcile.missing, style: dtSmall(C.text3)),
                      SButton(
                        label: SReconcile.submit,
                        tone: BtnTone.primary,
                        large: true,
                        block: true,
                        onPressed: missing ? null : () => d.send({'type': 'submit'}),
                      ),
                      SGhostButton(label: SAccuse.reopen, block: true, onPressed: () => d.send({'type': 'reopen'})),
                    ]
                  : [Text(SReconcile.waitHost, style: dtSmall(C.text3))],
            ),
          ],
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------- Sonuç

/// `.dt-sec` + `.dt-sec-title`.
class _Sec extends StatelessWidget {
  const _Sec({required this.title, required this.child});
  final String title;
  final Widget child;
  @override
  Widget build(BuildContext context) => VStack(gap: 10, children: [DtLabel(title), child]);
}

/// `.dt-r-q`, `.dt-breakdown`, `.dt-chain-step`, `.dt-secret` vb. kart zemini.
BoxDecoration _cardBox({Color border = DtC.cardLine, double radius = 16}) =>
    BoxDecoration(color: DtC.card, border: Border.all(color: border, width: 2), borderRadius: BorderRadius.circular(radius));

/// `Result`: puan, derece, sorular, döküm, gerçek hikâye ve kanıt zinciri.
class ResultScreen extends StatelessWidget {
  const ResultScreen({super.key});

  static const _scoreTones = [C.mint, C.sky, C.pink, C.yellow, C.lilac];

  @override
  Widget build(BuildContext context) {
    final d = Desk.of(context);
    final view = d.view;
    final r = view.result;
    if (r == null) return const SizedBox.shrink();
    final timeline = _stableSorted(r.timeline, (a, b) => a.at.compareTo(b.at));
    final culprits = r.culprits.map((c) => d.chars[c]?.name ?? c).toList();
    final wide = MediaQuery.sizeOf(context).width >= 720;

    final head = Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Column(
        children: [
          SizedBox(
            width: double.infinity,
            child: Text(view.caseInfo.title, style: T.b(13, color: C.text3, weight: FontWeight.w800)),
          ),
          const SizedBox(height: 10 + 12),
          Transform.rotate(
            angle: deg(-3),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
              decoration: BoxDecoration(color: C.yellow, border: Border.all(color: C.ink, width: 3), borderRadius: BorderRadius.circular(R.pill)),
              child: Text(trUpper(SResult.stamp), style: T.b(13, color: C.ink2, weight: FontWeight.w800, letterSpacing: 2)),
            ),
          ),
          const SizedBox(height: 10 + 8),
          Text(r.solved ? SResult.solved : SResult.unsolved, style: T.d(48, color: C.text, height: 0.95), textAlign: TextAlign.center),
          const SizedBox(height: 10 + 8),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(
                    child: Transform.rotate(
                      angle: deg(-3),
                      child: Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: C.mint,
                          border: Border.all(color: C.ink, width: 4),
                          borderRadius: BorderRadius.circular(26),
                          boxShadow: Shadows.lg,
                        ),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            // Satır içi SVG: altında Nunito 16/1.45 satırının iniş payı kalır.
                            Padding(padding: const EdgeInsets.only(bottom: 6.3), child: SSvg(crownSvg, width: 40, height: 28)),
                            Text.rich(
                              TextSpan(
                                children: [
                                  TextSpan(text: '${r.score}'),
                                  const WidgetSpan(child: SizedBox(width: 2)),
                                  TextSpan(text: '/ ${r.maxScore}', style: T.d(20, color: C.ink2.withValues(alpha: 0.7))),
                                ],
                              ),
                              style: T.d(64, color: C.ink2),
                              textAlign: TextAlign.center,
                            ),
                            Text(SResult.score, style: T.b(14, color: C.ink2, weight: FontWeight.w800), textAlign: TextAlign.center),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Align(
                      alignment: Alignment.bottomCenter,
                      child: Transform.rotate(
                        angle: deg(2),
                        child: Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(color: C.lilac, border: Border.all(color: C.ink, width: 4), borderRadius: BorderRadius.circular(26)),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const SizedBox(height: 10),
                              Text(r.rank, style: T.d(30, color: C.ink2, height: 1.05), textAlign: TextAlign.center),
                              Text(SResult.rank, style: T.b(14, color: C.ink2, weight: FontWeight.w800), textAlign: TextAlign.center),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (culprits.isNotEmpty) ...[
            const SizedBox(height: 10 + 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(color: C.red, border: Border.all(color: C.ink, width: 3), borderRadius: BorderRadius.circular(14)),
              child: Text.rich(
                TextSpan(
                  children: [
                    TextSpan(text: trUpper(SResult.culprits), style: T.b(12, color: C.ink2, weight: FontWeight.w800, letterSpacing: 1.5)),
                    const WidgetSpan(child: SizedBox(width: 6)),
                    TextSpan(text: ' ${culprits.join(', ')}'),
                  ],
                ),
                style: T.b(15, color: C.ink2, weight: FontWeight.w800),
                textAlign: TextAlign.center,
              ),
            ),
          ],
          const SizedBox(height: 10),
          Text(d.isHost ? SResult.endHost : SResult.endGuest, style: T.b(14, color: C.text2, weight: FontWeight.w800), textAlign: TextAlign.center),
        ],
      ),
    );

    final questions = _Sec(
      title: SResult.questions,
      child: VStack(
        gap: 10,
        children: [
          for (final q in r.questions)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: _cardBox(border: q.ok ? C.mint : DtC.cardLine),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Semantics(
                        label: q.ok ? SResult.ok : SResult.wrong,
                        child: Container(
                          width: 28,
                          height: 28,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(color: q.ok ? C.mint : C.red, shape: BoxShape.circle, border: Border.all(color: C.ink, width: 2)),
                          child: SIcon(q.ok ? 'check' : 'x', size: 14, color: C.ink2),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.only(top: 3),
                          child: Text(q.prompt, style: T.b(14, color: C.text, weight: FontWeight.w800, height: 1.35)),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Padding(
                        padding: const EdgeInsets.only(top: 3),
                        child: Text(SResult.pts(q.points), style: T.b(13, color: C.sky, weight: FontWeight.w800)),
                      ),
                    ],
                  ),
                  Padding(
                    padding: const EdgeInsets.only(top: 10, left: 38),
                    child: VStack(
                      gap: 6,
                      children: [
                        _AnswerLine(term: SResult.team, value: _label(d, q.id, q.team)),
                        if (!q.ok) _AnswerLine(term: SResult.correct, value: q.correct.map((c) => _label(d, q.id, c)).join(' / ')),
                      ],
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );

    final breakdown = _Sec(
      title: SResult.breakdown,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
        decoration: _cardBox(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (final b in r.breakdown) _BreakdownRow(label: b.label, value: SResult.pts(b.points), negative: b.points < 0),
            _BreakdownRow(label: SResult.score, value: '${r.score}', total: true),
          ],
        ),
      ),
    );

    final individual = r.individual.length > 1
        ? _Sec(
            title: SResult.individual,
            child: VStack(
              gap: 6,
              children: [
                for (final (i, p) in _stableSorted(r.individual, (a, b) => b.correct - a.correct).indexed)
                  Container(
                    constraints: const BoxConstraints(minHeight: 44),
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: _scoreTones[i % _scoreTones.length],
                      border: Border.all(color: C.ink, width: 3),
                      borderRadius: BorderRadius.circular(R.md),
                    ),
                    child: Row(
                      children: [
                        if (d.player(p.playerId) case final pl?) ...[SAvatar(avatar: pl.avatar, nick: pl.nick, size: 26), const SizedBox(width: 10)],
                        Expanded(
                          child: Text(
                            d.nick(p.playerId),
                            style: T.b(14, color: C.ink2, weight: FontWeight.w800),
                            maxLines: 1,
                            softWrap: false,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Text(SResult.individualOf(p.correct, p.total), style: T.b(13, color: C.ink2, weight: FontWeight.w700).copyWith(fontFeatures: tabular)),
                      ],
                    ),
                  ),
              ],
            ),
          )
        : null;

    // `.dt-result-grid`: 720px'ten itibaren iki eşit sütun (tek öğe de yarım genişlikte kalır).
    final grid = wide
        ? Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [Expanded(child: breakdown), const SizedBox(width: 16), Expanded(child: individual ?? const SizedBox.shrink())],
          )
        : VStack(gap: 16, children: [breakdown, ?individual]);

    final story = _Sec(title: SResult.story, child: _StoryPaper(text: r.story));

    final realTimeline = _Sec(
      title: SResult.timeline,
      child: Container(
        margin: const EdgeInsets.only(left: 4),
        decoration: const BoxDecoration(border: Border(left: BorderSide(color: DtC.cardLine, width: 2))),
        child: VStack(
          gap: 2,
          children: [
            for (var i = 0; i < timeline.length; i++)
              Builder(
                builder: (context) {
                  final (day, time) = splitAt(timeline[i].at);
                  final prevDay = i > 0 ? splitAt(timeline[i - 1].at).$1 : null;
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      if (day != prevDay)
                        Padding(
                          // margin: 10px 0 4px -4px; padding-left: 12px
                          padding: const EdgeInsets.only(top: 10, bottom: 4, left: 8),
                          child: Text(day, style: T.b(12, color: C.text2, weight: FontWeight.w800)),
                        ),
                      _TimelineRow(time: time, text: timeline[i].text),
                    ],
                  );
                },
              ),
          ],
        ),
      ),
    );

    final chain = _Sec(
      title: SResult.chain,
      child: VStack(
        gap: 10,
        children: [
          for (var i = 0; i < r.chain.length; i++)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: _cardBox(),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 28,
                    height: 28,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(color: C.yellow, shape: BoxShape.circle, border: Border.all(color: C.ink, width: 2)),
                    child: Text('${i + 1}', style: T.b(13, color: C.ink2, weight: FontWeight.w800, height: 1)),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Padding(
                          padding: const EdgeInsets.only(top: 3),
                          child: Text(r.chain[i].step, style: T.b(14, color: C.text, weight: FontWeight.w700)),
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            for (final e in r.chain[i].evidence)
                              Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Flexible(
                                    child: _ChainChip(
                                      title: e.title,
                                      found: e.found,
                                      onTap: e.found && d.evidence.containsKey(e.id) ? () => d.openEvidence(e.id) : null,
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Text(e.found ? SResult.found : SResult.missed, style: T.b(11, color: C.text3, weight: FontWeight.w700)),
                                ],
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );

    final herrings = r.redHerrings.isEmpty
        ? null
        : _Sec(
            title: SResult.herrings,
            child: VStack(
              gap: 10,
              children: [
                for (final h in r.redHerrings)
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: _cardBox(),
                    child: VStack(
                      gap: 6,
                      children: [
                        Text(h.title, style: T.b(14, color: C.text, weight: FontWeight.w800)),
                        Text(h.explanation, style: T.b(13, color: C.text2, height: 1.5)),
                      ],
                    ),
                  ),
              ],
            ),
          );

    final secrets = r.characters.isEmpty
        ? null
        : _Sec(
            title: SResult.characters,
            child: wide
                ? Grid2(rowGap: 10, columnGap: 10, equalHeight: true, children: [for (final c in r.characters) _Secret(c)])
                : VStack(gap: 10, children: [for (final c in r.characters) _Secret(c)]),
          );

    return _FinalFrame(children: [head, questions, grid, story, realTimeline, chain, ?herrings, ?secrets]);
  }
}

/// `.dt-r-q-ans div`: terim (en az 96) + değer, sığmazsa alt satıra.
class _AnswerLine extends StatelessWidget {
  const _AnswerLine({required this.term, required this.value});
  final String term;
  final String value;
  @override
  Widget build(BuildContext context) => Wrap(
    spacing: 8,
    runSpacing: 2,
    children: [
      ConstrainedBox(
        constraints: const BoxConstraints(minWidth: 96),
        child: Text(term, style: T.b(12, color: C.text3, weight: FontWeight.w800)),
      ),
      Text(value, style: T.b(13, color: C.text, weight: FontWeight.w700)),
    ],
  );
}

/// `.dt-breakdown li` (+ `.dt-breakdown-total`).
class _BreakdownRow extends StatelessWidget {
  const _BreakdownRow({required this.label, required this.value, this.negative = false, this.total = false});
  final String label;
  final String value;
  final bool negative;
  final bool total;

  @override
  Widget build(BuildContext context) {
    final style = total ? T.b(15, color: C.yellow, weight: FontWeight.w800) : T.b(13, color: C.text, weight: FontWeight.w700);
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: total ? null : const BoxDecoration(border: Border(bottom: BorderSide(color: DtC.cardLine, width: 2))),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Flexible(child: Text(label, style: style)),
          const SizedBox(width: 10),
          Text(value, style: style.copyWith(color: negative ? C.red : null, fontFeatures: tabular)),
        ],
      ),
    );
  }
}

/// `.dt-tl-item.dt-tl-static`: 46'lık saat sütunu, solda çizgi üstünde gök mavisi nokta.
class _TimelineRow extends StatelessWidget {
  const _TimelineRow({required this.time, required this.text});
  final String time;
  final String text;

  @override
  Widget build(BuildContext context) => Stack(
    clipBehavior: Clip.none,
    children: [
      Container(
        constraints: const BoxConstraints(minHeight: 40),
        padding: const EdgeInsets.fromLTRB(12, 8, 8, 8),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(width: 46, child: Text(time, style: T.d(13, color: C.sky, height: 1.45))),
            const SizedBox(width: 8),
            Expanded(child: Text(text, style: T.b(13, color: C.text))),
          ],
        ),
      ),
      Positioned(
        left: -6,
        top: 14,
        child: Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(color: C.sky, shape: BoxShape.circle, border: Border.all(color: C.ink, width: 2)),
        ),
      ),
    ],
  );
}

/// `.dt-chain-chip`: bulunan kanıt nane (dokununca belge açılır), kaçırılan kesikli çerçeveli.
class _ChainChip extends StatelessWidget {
  const _ChainChip({required this.title, required this.found, this.onTap});
  final String title;
  final bool found;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final text = Text(title, style: T.b(12, color: found ? C.ink2 : C.text3, weight: FontWeight.w800));
    final Widget chip = found
        ? Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
            decoration: BoxDecoration(color: C.mint, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(R.pill)),
            child: text,
          )
        : DashedBox(color: DtC.cardLine, radius: R.pill, width: 2, padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3), child: text);
    if (onTap == null) return chip;
    return Pressable(
      onTap: onTap,
      label: title,
      builder: (context, _) => ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 32),
        child: Align(alignment: Alignment.centerLeft, widthFactor: 1, heightFactor: 1, child: chip),
      ),
    );
  }
}

/// `.dt-secret`: herkesin sırrı, o saatte nerede olduğu, yalanları.
class _Secret extends StatelessWidget {
  const _Secret(this.c);
  final SecretView c;

  @override
  Widget build(BuildContext context) {
    final body = T.b(13, color: C.text2, height: 1.5);
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: _cardBox(),
      child: VStack(
        gap: 6,
        children: [
          Text(c.name, style: T.d(18, color: C.text, height: 1.05)),
          Text(c.secret, style: body),
          // `.dt-label` blok düzeyinde (display: flex): metin alt satırda başlar.
          Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [const DtLabel(SResult.whereabouts), Text(c.whereabouts, style: body)]),
          if (c.lies.isNotEmpty)
            VStack(
              gap: 4,
              children: [
                const DtLabel(SResult.lies),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    for (final l in c.lies)
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SizedBox(
                            width: 18,
                            child: Align(
                              alignment: Alignment.topRight,
                              child: Padding(padding: const EdgeInsets.only(right: 4), child: Text('•', style: T.b(13, color: C.text, height: 1.5))),
                            ),
                          ),
                          Expanded(child: Text(l, style: T.b(13, color: C.text, height: 1.5))),
                        ],
                      ),
                  ],
                ),
              ],
            ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------- Kâğıt (gerçek hikâye)

/// `.dt-paper.dt-story`: kâğıt, Tinos 14 / 1.5, 3em × 3.2em dolgu (konteyner sorgusu yok), dokulu zemin.
class _StoryPaper extends StatelessWidget {
  const _StoryPaper({required this.text});
  final String text;

  static const _em = 14.0;

  @override
  Widget build(BuildContext context) {
    _Grain.ensure();
    return Container(
      decoration: BoxDecoration(
        color: DtC.paper,
        boxShadow: [
          BoxShadow(color: const Color(0x8C000000), offset: const Offset(0, 18), blurRadius: _blur(40)),
          BoxShadow(color: const Color(0x66000000), offset: const Offset(0, 2), blurRadius: _blur(6)),
        ],
      ),
      child: CustomPaint(
        painter: _GrainPainter(),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 3.2 * _em, vertical: 3 * _em),
          child: Paras(
            text,
            bottom: 0.7 * _em,
            style: const TextStyle(
              fontFamily: DtFont.serif,
              fontSize: _em,
              fontWeight: FontWeight.w600,
              height: 1.5,
              color: DtC.ink,
              leadingDistribution: TextLeadingDistribution.even,
            ),
          ),
        ),
      ),
    );
  }
}

/// `--grain`: 220×220 karo, kahverengi ince gürültü (feTurbulence 0.9, 3 oktav yaklaşığı).
abstract final class _Grain {
  static ui.Image? image;
  static bool _started = false;
  static final ready = ValueNotifier<int>(0);

  static void ensure() {
    if (_started) return;
    _started = true;
    const n = 220;
    final px = Uint8List(n * n * 4);
    var seed = 0x2545F491;
    double rnd() {
      seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF;
      return seed / 0x7FFFFFFF * 2 - 1;
    }

    for (var i = 0; i < n * n; i++) {
      final v = 0.5 + 0.25 * (rnd() + rnd() / 2 + rnd() / 4);
      final a = (0.42 * v - 0.16).clamp(0.0, 1.0);
      final o = i * 4;
      // Önceden çarpılmış alfa (premultiplied).
      px[o] = (0.32 * 255 * a).round();
      px[o + 1] = (0.28 * 255 * a).round();
      px[o + 2] = (0.2 * 255 * a).round();
      px[o + 3] = (255 * a).round();
    }
    try {
      ui.decodeImageFromPixels(px, n, n, ui.PixelFormat.rgba8888, (img) {
        image = img;
        ready.value++;
      });
    } on Object {
      // doku yoksa düz kâğıt
    }
  }
}

class _GrainPainter extends CustomPainter {
  _GrainPainter() : super(repaint: _Grain.ready);

  @override
  void paint(Canvas canvas, Size size) {
    final img = _Grain.image;
    if (img == null) return;
    final paint = Paint()..shader = ImageShader(img, TileMode.repeated, TileMode.repeated, Matrix4.identity().storage);
    canvas.drawRect(Offset.zero & size, paint);
  }

  @override
  bool shouldRepaint(_GrainPainter oldDelegate) => false;
}
