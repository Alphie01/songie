// games/detective/client/Interviews.tsx karşılığı: sorgu odası (açık sorgular, ortak tutanak,
// soru listesi ve belge gösterme). Ölçüler detective.css "Sorgu odası" bölümünden.
import 'dart:async';

import 'package:flutter/material.dart';

import '../../shared/text.dart';
import '../../ui/icons.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/kit.dart';
import 'audio.dart';
import 'bits.dart';
import 'desk.dart';
import 'models.dart';
import 'strings.dart';

/// `rgb(43 33 22 / 0.3)`: tutanak girdileri arasındaki kesikli çizgi.
const _entryRule = Color(0x4D2B2116);

/// `rgb(192 57 43 / 0.07)`: belge gösterilip savunmanın çöktüğü girdi.
const _confrontBg = Color(0x12C0392B);

/// `rgb(90 184 255 / 0.15)`: seçili belge.
const _pickedBg = Color(0x265AB8FF);

/// Web `<Interviews />`: açık sorgular, kapılar (birden çoksa) ve açık sorgunun odası.
class InterviewsPane extends StatelessWidget {
  const InterviewsPane({super.key});

  @override
  Widget build(BuildContext context) {
    final d = Desk.of(context);
    final view = d.view;
    if (view.interviews.isEmpty) return const DtEmpty(SInterview.empty);
    InterviewView? iv;
    for (final i in view.interviews) {
      if (i.id == d.interview) iv = i;
    }
    return VStack(
      gap: 12,
      children: [
        if (view.interviews.length > 1) _Doors(desk: d),
        if (iv != null) _Room(key: ValueKey(iv.id), iv: iv, c: d.chars[iv.characterId]),
      ],
    );
  }
}

// ---------------------------------------------------------------- Kapılar

/// `.dt-iv-doors`: yatay kayan sorgu seçici (en son açılan solda).
class _Doors extends StatelessWidget {
  const _Doors({required this.desk});
  final Desk desk;

  @override
  Widget build(BuildContext context) {
    final d = desk;
    final doors = <Widget>[];
    for (final x in d.view.interviews.reversed) {
      if (doors.isNotEmpty) doors.add(const SizedBox(width: 8));
      doors.add(_Door(iv: x, c: d.chars[x.characterId], open: x.id == d.interview, unread: d.ivUnread[x.id], onTap: () => d.openInterview(x.id)));
    }
    return Semantics(
      label: SInterview.pick,
      container: true,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.only(bottom: 4),
        child: IntrinsicHeight(child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: doors)),
      ),
    );
  }
}

/// `.dt-iv-door`
class _Door extends StatelessWidget {
  const _Door({required this.iv, required this.c, required this.open, required this.unread, required this.onTap});
  final InterviewView iv;
  final CharacterView? c;
  final bool open;
  final ({int count, bool fresh})? unread;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final fg = open ? C.ink2 : C.text;
    final u = unread;
    Widget? tail;
    if (u != null && u.count > 0 && !open) {
      tail = Semantics(label: SInterview.unread(u.count), child: ExcludeSemantics(child: TabBadge(u.count)));
    } else if (u != null && u.fresh && !open) {
      tail = const NewTag(SInterview.newQ);
    }
    return Pressable(
      onTap: onTap,
      selected: open,
      builder: (context, _) => ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 240, minHeight: 52),
        child: Container(
          padding: const EdgeInsets.fromLTRB(6, 6, 12, 6),
          decoration: BoxDecoration(
            color: open ? C.sky : DtC.card,
            border: Border.all(color: open ? C.ink : DtC.cardLine, width: 2),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              _Face(c: c, large: false),
              const SizedBox(width: 8),
              Flexible(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(c?.name ?? iv.title, maxLines: 1, softWrap: false, overflow: TextOverflow.ellipsis, style: T.b(13, color: fg, weight: FontWeight.w800)),
                    Opacity(
                      opacity: 0.75,
                      child: Text(iv.place, maxLines: 1, softWrap: false, overflow: TextOverflow.ellipsis, style: T.b(11, color: fg, weight: FontWeight.w700)),
                    ),
                  ],
                ),
              ),
              if (tail != null) ...[const SizedBox(width: 8), tail],
            ],
          ),
        ),
      ),
    );
  }
}

/// `.dt-iv-face`: sarı zeminli portre (küçük 36, büyük 72 + çerçeve). Baş harfler her ikisinde 15px
/// (`.dt-portrait-ph` kendi boyunu verir).
class _Face extends StatelessWidget {
  const _Face({required this.c, required this.large});
  final CharacterView? c;
  final bool large;

  @override
  Widget build(BuildContext context) {
    final d = Desk.of(context);
    final size = large ? 72.0 : 36.0;
    final initials = PortraitInitials(c?.name ?? '?', color: C.ink2);
    final url = c?.portraitUrl;
    Widget face = Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: C.yellow,
        border: large ? Border.all(color: C.ink, width: 3) : null,
        borderRadius: BorderRadius.circular(large ? 16 : 10),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(large ? 13 : 10),
        child: url == null
            ? initials
            : DtNetImage(
                url: url,
                cacheKey: '${d.slug}:portrait:${c!.id}',
                fit: BoxFit.cover,
                width: double.infinity,
                height: double.infinity,
                semanticLabel: large ? (c!.portraitAlt ?? c!.name) : null,
                error: initials,
              ),
      ),
    );
    if (!large || url == null) face = ExcludeSemantics(child: face);
    return face;
  }
}

// ---------------------------------------------------------------- Oda

class _Room extends StatefulWidget {
  const _Room({super.key, required this.iv, required this.c});
  final InterviewView iv;
  final CharacterView? c;

  @override
  State<_Room> createState() => _RoomState();
}

class _RoomState extends State<_Room> {
  bool _busy = false;
  bool _picker = false;
  (String tone, String text)? _flash;
  Timer? _flashTimer;
  final _fresh = FreshQuestions();

  @override
  void dispose() {
    _flashTimer?.cancel();
    super.dispose();
  }

  bool _locked(Desk d) => d.view.phase != 'investigate';

  Future<void> _ask(Desk d, String questionId) async {
    if (_busy || _locked(d)) return;
    setState(() => _busy = true);
    await d.send({'type': 'ask', 'interviewId': widget.iv.id, 'questionId': questionId});
    if (mounted) setState(() => _busy = false);
  }

  Future<bool> _confront(Desk d, String evidenceId) async {
    if (_busy || _locked(d)) return false;
    setState(() => _busy = true);
    final res = await d.send({'type': 'confront', 'interviewId': widget.iv.id, 'evidenceId': evidenceId});
    if (!mounted) return false;
    setState(() => _busy = false);
    if (!res.ok) return false;
    if (res['stale'] == true) return true;
    final hit = res['hit'] == true;
    setState(() => _flash = (hit ? 'hit' : 'miss', hit ? SInterview.hit : SInterview.miss));
    _flashTimer?.cancel();
    _flashTimer = Timer(const Duration(milliseconds: 4500), () {
      if (mounted) setState(() => _flash = null);
    });
    return true;
  }

  @override
  Widget build(BuildContext context) {
    final d = Desk.of(context);
    final iv = widget.iv;
    final c = widget.c;
    final locked = _locked(d);
    final name = c?.name ?? iv.title;
    final short = name.split(RegExp(r'\s+')).first;
    final fresh = _fresh.update(d.storage, d.view.sessionId, d.meId, iv.id, [for (final q in iv.questions) q.id]);
    final len = iv.transcript.length;
    final shown = {for (final e in iv.transcript) ?e.evidenceId};

    final head = Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: DtC.card, border: Border.all(color: DtC.cardLine, width: 2), borderRadius: BorderRadius.circular(16)),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _Face(c: c, large: true),
          const SizedBox(width: 12),
          Expanded(
            child: VStack(
              gap: 2,
              children: [
                if (iv.title != name) Text(trUpper(iv.title), style: T.b(11, color: C.text3, weight: FontWeight.w800, letterSpacing: 1.5)),
                Semantics(header: true, child: Text(name, style: T.d(22, color: C.text, height: 1.1))),
                Text.rich(
                  TextSpan(
                    text: iv.place,
                    children: [TextSpan(text: ', ${SInterview.act(iv.act)}', style: const TextStyle(color: C.text3))],
                  ),
                  style: T.b(12, color: C.text2, weight: FontWeight.w700),
                ),
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Paras(iv.intro, gap: 6, style: T.b(13, color: C.text3, height: 1.5)),
                ),
              ],
            ),
          ),
        ],
      ),
    );

    // Tutanak: kâğıt renginde ortak döküm (telefonda kendi kaydırması yok; sayfa uzar).
    final record = Container(
      decoration: BoxDecoration(color: DtC.cream, border: Border.all(color: C.ink, width: 3), borderRadius: BorderRadius.circular(16)),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(13),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              color: DtC.brown,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Flexible(child: Text(trUpper(SInterview.transcript), style: T.b(12, color: DtC.cream, weight: FontWeight.w800, letterSpacing: 1.5))),
                  const SizedBox(width: 10),
                  Text('$len', style: T.b(12, color: DtC.cream, weight: FontWeight.w800)),
                ],
              ),
            ),
            if (len == 0)
              Padding(
                padding: const EdgeInsets.all(14),
                child: Text(SInterview.transcriptEmpty, style: T.b(13, color: DtC.brown, weight: FontWeight.w700)),
              )
            else
              Semantics(
                liveRegion: true,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    for (var i = 0; i < len; i++) _Entry(e: iv.transcript[i], n: i + 1, speaker: short, last: i == len - 1),
                  ],
                ),
              ),
          ],
        ),
      ),
    );

    final flash = _flash;
    return Semantics(
      container: true,
      label: name,
      child: VStack(
        gap: 12,
        children: [
          head,
          record,
          if (flash != null)
            Semantics(
              liveRegion: true,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: flash.$1 == 'hit' ? C.mint : C.panel,
                  border: Border.all(color: C.ink, width: 3),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Text(flash.$2, style: T.b(14, color: flash.$1 == 'hit' ? C.ink2 : C.text, weight: FontWeight.w800)),
              ),
            ),
          if (locked)
            DashedBox(
              color: DtC.cardLine,
              radius: 16,
              width: 2,
              padding: const EdgeInsets.all(14),
              child: SizedBox(width: double.infinity, child: Text(SInterview.closed, style: T.b(13, color: C.text3, weight: FontWeight.w700))),
            )
          else
            VStack(
              gap: 10,
              children: [
                VStack(
                  gap: 4,
                  children: [
                    Semantics(header: true, child: DtLabel(SInterview.questions, count: '${iv.questions.length}')),
                    Text(SInterview.free, style: T.b(12, color: C.text3, weight: FontWeight.w700)),
                  ],
                ),
                if (iv.questions.isEmpty)
                  const DtEmpty(SInterview.noQuestions)
                else
                  VStack(
                    gap: 8,
                    children: [
                      for (final q in iv.questions) _QuestionBtn(text: q.ask, fresh: fresh.contains(q.id), busy: _busy, onTap: () => _ask(d, q.id)),
                    ],
                  ),
                if (_picker)
                  _Picker(name: name, shown: shown, busy: _busy, onClose: () => setState(() => _picker = false), onShow: (id) => _confront(d, id))
                else
                  Align(
                    alignment: Alignment.centerLeft,
                    child: _OutlineBtn(
                      label: SInterview.show,
                      leading: const KindGlyph('photo', size: 16, color: C.text),
                      onTap: _busy || d.view.evidence.isEmpty ? null : () => setState(() => _picker = true),
                    ),
                  ),
              ],
            ),
        ],
      ),
    );
  }
}

/// `.dt-qs .dt-q`: sorulabilecek soru (yeni gelenler pembe çerçeveli).
class _QuestionBtn extends StatelessWidget {
  const _QuestionBtn({required this.text, required this.fresh, required this.busy, required this.onTap});
  final String text;
  final bool fresh;
  final bool busy;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Opacity(
    opacity: busy ? 0.5 : 1,
    child: Pressable(
      onTap: busy ? null : onTap,
      label: text,
      builder: (context, _) => Container(
        constraints: const BoxConstraints(minHeight: 48),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: DtC.card,
          border: Border.all(color: fresh ? C.pink : DtC.cardLine, width: 2),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          children: [
            Expanded(child: Text(text, style: T.b(14, color: C.text, weight: FontWeight.w800, height: 1.35))),
            if (fresh) ...[const SizedBox(width: 8), const NewTag(SInterview.newQ)],
          ],
        ),
      ),
    ),
  );
}

/// `.btn.btn-outline` + önde özel simge (`.dt-room-show`: simge ile yazı arası 8).
class _OutlineBtn extends StatelessWidget {
  const _OutlineBtn({required this.label, required this.leading, required this.onTap});
  final String label;
  final Widget leading;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => Opacity(
    opacity: onTap == null ? 0.5 : 1,
    child: Pressable(
      onTap: onTap,
      label: label,
      builder: (context, pressed) => AnimatedContainer(
        duration: const Duration(milliseconds: 80),
        transform: Matrix4.translationValues(0, pressed ? 3 : 0, 0),
        constraints: const BoxConstraints(minHeight: 48),
        padding: const EdgeInsets.symmetric(horizontal: 18),
        decoration: BoxDecoration(
          color: C.panel,
          border: Border.all(color: C.ink, width: bw),
          borderRadius: BorderRadius.circular(R.md),
          boxShadow: hardShadow(0, pressed ? 1 : 4),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            leading,
            const SizedBox(width: 8),
            Flexible(child: Text(label, maxLines: 1, softWrap: false, style: T.d(17, color: C.text))),
          ],
        ),
      ),
    ),
  );
}

// ---------------------------------------------------------------- Tutanak girdisi

/// `.dt-entry`: numara, soran, soru ya da gösterilen belge, cevap, kayıt, açılan belgeler.
class _Entry extends StatelessWidget {
  const _Entry({required this.e, required this.n, required this.speaker, required this.last});
  final TranscriptEntry e;
  final int n;
  final String speaker;
  final bool last;

  @override
  Widget build(BuildContext context) {
    final d = Desk.of(context);
    final p = d.player(e.by);
    final ev = e.evidenceId == null ? null : d.evidence[e.evidenceId];
    final deflect = e.kind == 'deflect';
    final answerStyle = T.b(14, color: DtC.brown, height: 1.55).copyWith(fontStyle: deflect ? FontStyle.italic : null);

    final body = VStack(
      gap: 4,
      children: [
        Opacity(
          opacity: 0.75,
          child: Row(
            children: [
              if (p != null)
                SAvatar(avatar: p.avatar, nick: p.nick, size: 16)
              else
                Container(width: 20, height: 20, decoration: const BoxDecoration(color: C.panel3, shape: BoxShape.circle)),
              const SizedBox(width: 6),
              Flexible(
                child: Text(
                  e.kind == 'ask' ? SInterview.asked(d.nick(e.by)) : SInterview.showed(d.nick(e.by)),
                  style: T.b(11, color: DtC.brown, weight: FontWeight.w800),
                ),
              ),
            ],
          ),
        ),
        if (e.kind == 'ask')
          Text(e.prompt, style: T.b(14, color: DtC.brown, weight: FontWeight.w800, height: 1.4))
        else
          Align(
            alignment: Alignment.centerLeft,
            child: Pressable(
              onTap: ev == null ? null : () => d.openEvidence(ev.id),
              label: e.prompt,
              builder: (context, _) => Container(
                constraints: const BoxConstraints(minHeight: 32),
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                decoration: BoxDecoration(border: Border.all(color: DtC.brown, width: 2), borderRadius: BorderRadius.circular(8)),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (ev != null) ...[KindGlyph(ev.kind, size: 14, color: DtC.brown), const SizedBox(width: 6)],
                    Flexible(child: Text(e.prompt, style: T.b(13, color: DtC.brown, weight: FontWeight.w800))),
                  ],
                ),
              ),
            ),
          ),
        Padding(
          padding: const EdgeInsets.only(top: 4),
          child: VStack(
            gap: 4,
            children: [
              Row(
                children: [
                  Flexible(child: Text(speaker, style: T.b(12, color: DtC.brown, weight: FontWeight.w800))),
                  if (deflect) ...[
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                      decoration: BoxDecoration(color: C.coral, borderRadius: BorderRadius.circular(6)),
                      child: Text(SInterview.deflect, style: T.b(10, color: C.ink2, weight: FontWeight.w800)),
                    ),
                  ],
                ],
              ),
              Opacity(opacity: deflect ? 0.85 : 1, child: Paras(e.answer, gap: 6, style: answerStyle)),
              if (e.audioUrl != null) Align(alignment: Alignment.centerLeft, child: MiniPlay(url: e.audioUrl!)),
              for (final id in e.unlocked)
                if (d.evidence[id] case final u?)
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Pressable(
                      onTap: () => d.openEvidence(id),
                      label: '${SInterview.unlocked}: ${u.title}',
                      builder: (context, _) => Container(
                        constraints: const BoxConstraints(minHeight: 32),
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(color: DtC.brown, borderRadius: BorderRadius.circular(8)),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            KindGlyph(u.kind, size: 13, color: DtC.cream),
                            const SizedBox(width: 6),
                            Flexible(
                              child: Text.rich(
                                TextSpan(
                                  text: '${SInterview.unlocked}: ',
                                  children: [TextSpan(text: u.title, style: const TextStyle(fontWeight: FontWeight.w800))],
                                ),
                                style: T.b(12, color: DtC.cream, weight: FontWeight.w700),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
            ],
          ),
        ),
      ],
    );

    return Container(
      color: e.kind == 'confront' ? _confrontBg : null,
      child: CustomPaint(
        foregroundPainter: last ? null : const _DashedBottom(),
        child: Stack(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    width: 24,
                    child: Padding(
                      padding: const EdgeInsets.only(top: 1),
                      child: ExcludeSemantics(
                        child: Opacity(opacity: 0.6, child: Text('$n', style: T.b(11, color: DtC.brown, weight: FontWeight.w800))),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(child: body),
                ],
              ),
            ),
            if (e.kind == 'confront')
              Positioned(
                top: 8,
                right: 10,
                child: Semantics(
                  label: SInterview.broke,
                  child: ExcludeSemantics(
                    child: Transform.rotate(
                      angle: deg(6),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(border: Border.all(color: DtC.red, width: 3), borderRadius: BorderRadius.circular(6)),
                        child: Text(trUpper(SInterview.broke), style: T.b(11, color: DtC.red, weight: FontWeight.w800, letterSpacing: 1.5)),
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// `border-bottom: 1px dashed rgb(43 33 22 / 0.3)`.
class _DashedBottom extends CustomPainter {
  const _DashedBottom();

  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()
      ..color = _entryRule
      ..strokeWidth = 1;
    final y = size.height - 0.5;
    for (double x = 0; x < size.width; x += 6) {
      canvas.drawLine(Offset(x, y), Offset((x + 3).clamp(0, size.width), y), p);
    }
  }

  @override
  bool shouldRepaint(_DashedBottom oldDelegate) => false;
}

// ---------------------------------------------------------------- Belge göster

/// `.dt-picker`: karşısına konacak belgeyi seç (arama, liste, seçim, "Göster").
class _Picker extends StatefulWidget {
  const _Picker({required this.name, required this.shown, required this.busy, required this.onClose, required this.onShow});
  final String name;
  final Set<String> shown;
  final bool busy;
  final VoidCallback onClose;
  final Future<bool> Function(String evidenceId) onShow;

  @override
  State<_Picker> createState() => _PickerState();
}

class _PickerState extends State<_Picker> {
  final _q = TextEditingController();
  String? _pick;

  @override
  void initState() {
    super.initState();
    _q.addListener(() => setState(() {}));
    // `scrollIntoView({ block: 'nearest', behavior: 'smooth' })`
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      unawaited(
        Scrollable.ensureVisible(
          context,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeInOut,
          alignmentPolicy: ScrollPositionAlignmentPolicy.keepVisibleAtEnd,
        ),
      );
    });
  }

  @override
  void dispose() {
    _q.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final d = Desk.of(context);
    final needle = foldText(_q.text.trim());
    final list = [
      for (final e in d.view.evidence)
        if (needle.isEmpty || foldText('${e.title} ${e.summary} ${kindName(e.kind)}').contains(needle)) e,
    ]..sort((a, b) {
        final s = (widget.shown.contains(a.id) ? 1 : 0) - (widget.shown.contains(b.id) ? 1 : 0);
        return s != 0 ? s : b.seq - a.seq;
      });
    EvidenceView? picked;
    if (_pick != null) {
      for (final e in d.view.evidence) {
        if (e.id == _pick) picked = e;
      }
    }

    return Semantics(
      container: true,
      label: SInterview.showTo(widget.name),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: DtC.card, border: Border.all(color: C.ink, width: 3), borderRadius: BorderRadius.circular(16)),
        child: VStack(
          gap: 10,
          children: [
            Row(
              children: [
                Expanded(child: Text(SInterview.showTo(widget.name), style: T.b(14, color: C.text, weight: FontWeight.w800))),
                const SizedBox(width: 10),
                DtIconBtn(label: SInterview.cancel, onTap: widget.onClose, child: const SIcon('x', size: 14, color: C.text)),
              ],
            ),
            Semantics(
              label: SInterview.search,
              textField: true,
              child: SInput(
                controller: _q,
                placeholder: SInterview.search,
                autofocus: true,
                keyboardType: TextInputType.text,
                textInputAction: TextInputAction.search,
                textCapitalization: TextCapitalization.none,
              ),
            ),
            if (list.isEmpty)
              const DtEmpty(SInterview.noMatch)
            else
              Semantics(
                label: SCabinet.title,
                container: true,
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxHeight: 320),
                  child: SingleChildScrollView(
                    child: VStack(
                      gap: 6,
                      children: [
                        for (final e in list)
                          _PickerItem(
                            e: e,
                            was: widget.shown.contains(e.id),
                            selected: _pick == e.id,
                            onTap: () => setState(() => _pick = _pick == e.id ? null : e.id),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
            Row(
              children: [
                Expanded(
                  child: Text(
                    picked?.title ?? ' ',
                    maxLines: 1,
                    softWrap: false,
                    overflow: TextOverflow.ellipsis,
                    style: T.b(13, color: C.text, weight: FontWeight.w700),
                  ),
                ),
                const SizedBox(width: 10),
                SButton(
                  label: SInterview.confirm,
                  tone: BtnTone.primary,
                  onPressed: picked == null || widget.busy
                      ? null
                      : () async {
                          final id = picked!.id;
                          if (await widget.onShow(id)) widget.onClose();
                        },
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// `.dt-picker-item`: belge satırı (gösterilmiş olanlar soluk ve seçilemez).
class _PickerItem extends StatelessWidget {
  const _PickerItem({required this.e, required this.was, required this.selected, required this.onTap});
  final EvidenceView e;
  final bool was;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Opacity(
    opacity: was ? 0.5 : 1,
    child: Pressable(
      onTap: was ? null : onTap,
      selected: selected,
      label: e.title,
      builder: (context, _) => Container(
        constraints: const BoxConstraints(minHeight: 48),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? _pickedBg : C.panel2,
          border: Border.all(color: selected ? C.sky : Colors.transparent, width: 2),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              alignment: Alignment.center,
              decoration: BoxDecoration(color: DtC.cream, borderRadius: BorderRadius.circular(8)),
              child: KindGlyph(e.kind, size: 16, color: DtC.brown),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(e.title, style: T.b(13, color: C.text, weight: FontWeight.w800)),
                  Text(kindName(e.kind), style: T.b(11, color: C.text3, weight: FontWeight.w700)),
                ],
              ),
            ),
            if (was) ...[
              const SizedBox(width: 10),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                decoration: BoxDecoration(color: DtC.cell, borderRadius: BorderRadius.circular(6)),
                child: Text(SInterview.shownTag, style: T.b(10, color: C.text, weight: FontWeight.w800)),
              ),
            ],
          ],
        ),
      ),
    ),
  );
}
