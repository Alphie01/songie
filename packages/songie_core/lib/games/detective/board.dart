import 'dart:async';

import 'package:flutter/material.dart';

import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import 'bits.dart';
import 'desk.dart';
import 'floor_plan.dart';
import 'models.dart';
import 'strings.dart';

/// Board.tsx: maktul/mağdur, şüpheliler, diğer kişiler, mekânlar, zaman çizelgesi, bölüm sahneleri.
class Board extends StatelessWidget {
  const Board({super.key});

  @override
  Widget build(BuildContext context) {
    final d = Desk.of(context);
    final view = d.view;
    final victims = view.characters.where((c) => c.victim).toList();
    final suspects = view.characters.where((c) => c.suspect && !c.victim).toList();
    final others = view.characters.where((c) => !c.suspect && !c.victim).toList();

    return VStack(
      gap: 20,
      children: [
        if (victims.isNotEmpty)
          _Sec(
            label: DtLabel(SBoard.victim(view.caseInfo.genre)),
            children: [for (final c in victims) PersonCard(key: ValueKey('p-${c.id}'), c: c, variant: PersonVariant.victim)],
          ),
        _Sec(
          label: DtLabel(SBoard.suspects, count: '${suspects.length}'),
          children: [
            VStack(
              gap: 10,
              children: [for (var i = 0; i < suspects.length; i++) PersonCard(key: ValueKey('p-${suspects[i].id}'), c: suspects[i], variant: PersonVariant.suspect, tone: i)],
            ),
          ],
        ),
        if (others.isNotEmpty)
          _Sec(
            label: const DtLabel(SBoard.others),
            children: [
              VStack(
                gap: 10,
                children: [
                  for (var i = 0; i < others.length; i++)
                    PersonCard(key: ValueKey('p-${others[i].id}'), c: others[i], variant: PersonVariant.other, tone: i + suspects.length),
                ],
              ),
            ],
          ),
        if (view.locations.isNotEmpty) const _Locations(),
        const _Timeline(),
        if (view.acts.isNotEmpty) const _Scenes(),
      ],
    );
  }
}

/// `.dt-sec`: başlık + içerik (aralık 10).
class _Sec extends StatelessWidget {
  const _Sec({required this.label, required this.children});
  final Widget label;
  final List<Widget> children;
  @override
  Widget build(BuildContext context) => VStack(gap: 10, children: [label, ...children]);
}

/// `data-variant`
enum PersonVariant { victim, suspect, other }

const _tones = [C.pink, C.sky, C.yellow, C.mint, C.coral, C.lilac];

class PersonCard extends StatefulWidget {
  const PersonCard({super.key, required this.c, required this.variant, this.tone = 0});
  final CharacterView c;
  final PersonVariant variant;
  final int tone;

  @override
  State<PersonCard> createState() => _PersonCardState();
}

class _PersonCardState extends State<PersonCard> {
  bool _open = false;
  int _handledFocus = -1;

  /// `showPerson`: kart açılır ve ekranın ortasına kaydırılır (web: focus + scrollIntoView).
  void _checkFocus(Desk d) {
    final f = d.focusPerson;
    if (f == null || f.id != widget.c.id || f.seq == _handledFocus) return;
    _handledFocus = f.seq;
    _open = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Timer(const Duration(milliseconds: 60), () {
        if (!mounted) return;
        unawaited(Scrollable.ensureVisible(context, alignment: 0.5, duration: const Duration(milliseconds: 300), curve: Curves.easeInOut));
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    final d = Desk.of(context);
    _checkFocus(d);
    final c = widget.c;
    final victim = widget.variant == PersonVariant.victim;
    final ivs = d.view.interviews.where((i) => i.characterId == c.id).toList();
    final mentions = d.view.evidence.where((e) => e.people.contains(c.id)).length;
    final ivBadge = ivs.fold<int>(0, (n, iv) => n + (d.ivUnread[iv.id]?.count ?? 0));
    final ivFresh = ivs.any((iv) => d.ivUnread[iv.id]?.fresh ?? false);
    final fg = victim ? DtC.brown : C.text;
    final soft = victim ? DtC.brown : C.text3;
    void setMark(String mark) => d.send({'type': 'mark', 'characterId': c.id, 'mark': c.mark?.mark == mark ? null : mark});

    final portraitBg = victim ? DtC.brown : _tones[widget.tone % _tones.length];
    final portraitFg = victim ? DtC.cream : C.ink2;
    final initialsW = PortraitInitials(c.name, color: portraitFg);
    final portrait = Container(
      width: 44,
      height: 44,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(color: portraitBg, borderRadius: BorderRadius.circular(12)),
      child: c.portraitUrl != null
          ? DtNetImage(url: c.portraitUrl!, cacheKey: '${d.slug}:portrait:${c.id}', semanticLabel: c.portraitAlt ?? c.name, error: initialsW, width: 44, height: 44)
          : initialsW,
    );

    final markPill = c.mark == null
        ? null
        : Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(color: c.mark!.mark == 'suspect' ? C.red : C.mint, borderRadius: BorderRadius.circular(8)),
            child: Text(c.mark!.mark == 'suspect' ? SBoard.markSuspect : SBoard.markClear, style: T.b(11, color: C.ink2, weight: FontWeight.w800)),
          );
    final ivPill = ivs.isEmpty
        ? null
        : Pressable(
            onTap: () => d.openInterview(ivs.last.id),
            label: SInterview.open,
            builder: (context, _) => Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(border: Border.all(color: C.violet, width: 2), borderRadius: BorderRadius.circular(8)),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(SInterview.open, style: T.b(11, color: C.text, weight: FontWeight.w800)),
                  if (ivBadge > 0) ...[const SizedBox(width: 4), TabBadge(ivBadge)] else if (ivFresh) ...[const SizedBox(width: 4), const TabDot()],
                ],
              ),
            ),
          );

    final top = LayoutBuilder(
      builder: (context, box) => Row(
        children: [
          portrait,
          const SizedBox(width: 12),
          Expanded(
            child: Pressable(
              onTap: () => setState(() => _open = !_open),
              label: SBoard.details(c.name),
              selected: _open,
              builder: (context, _) => ConstrainedBox(
                constraints: const BoxConstraints(minHeight: 44),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(c.name, style: T.b(16, color: fg, weight: FontWeight.w800, height: 1.25)),
                    Text(c.age != null ? '${c.role}, ${SBoard.age(c.age!)}' : c.role, style: T.b(12, color: soft, weight: FontWeight.w700, height: 1.35)),
                    if (!_open && c.notes.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Text(SNotes.count(c.notes.length), style: T.b(11, color: C.yellow, weight: FontWeight.w800)),
                      ),
                  ],
                ),
              ),
            ),
          ),
          if (markPill != null || ivPill != null) ...[
            const SizedBox(width: 12),
            ConstrainedBox(
              constraints: BoxConstraints(maxWidth: box.maxWidth * 0.45),
              child: Wrap(
                alignment: WrapAlignment.end,
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: 6,
                runSpacing: 6,
                children: [?markPill, ?ivPill],
              ),
            ),
          ],
        ],
      ),
    );

    final more = <Widget>[];
    if (_open) {
      more.add(Text(c.relation, style: T.b(12, color: victim ? DtC.brown : C.text2, weight: FontWeight.w800, height: 1.4)));
      more.add(Paras(c.summary, style: T.b(13, color: victim ? DtC.brown : C.text2, weight: FontWeight.w600, height: 1.55), gap: 6));
      if (widget.variant == PersonVariant.suspect) {
        Widget seg(String tone, String label) {
          final pressed = c.mark?.mark == tone;
          return Expanded(
            child: Pressable(
              onTap: d.readOnly ? null : () => setMark(tone),
              label: label,
              selected: pressed,
              builder: (context, _) => Container(
                constraints: const BoxConstraints(minHeight: 44),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: pressed ? (tone == 'suspect' ? C.red : C.mint) : C.panel,
                  border: Border.all(color: C.ink, width: 2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(label, style: T.b(14, color: pressed ? C.ink2 : C.text, weight: FontWeight.w800)),
              ),
            ),
          );
        }

        more.add(
          VStack(
            gap: 6,
            children: [
              Row(children: [seg('suspect', SBoard.markSuspect), const SizedBox(width: 8), seg('clear', SBoard.markClear)]),
              if (c.mark != null)
                Text(
                  SBoard.markedBy(c.mark!.mark == 'suspect' ? SBoard.markSuspect : SBoard.markClear, d.nick(c.mark!.by)),
                  style: T.b(11, color: C.text3, weight: FontWeight.w700),
                ),
            ],
          ),
        );
      }
      if (ivs.length > 1) {
        for (final iv in ivs) {
          final u = d.ivUnread[iv.id];
          more.add(
            Pressable(
              onTap: () => d.openInterview(iv.id),
              label: '${SInterview.open}, ${iv.place}',
              builder: (context, _) => Container(
                constraints: const BoxConstraints(minHeight: 44),
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(border: Border.all(color: C.violet, width: 2), borderRadius: BorderRadius.circular(12)),
                child: Row(
                  children: [
                    const IvGlyph(color: C.text),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text.rich(
                        TextSpan(children: [const TextSpan(text: SInterview.open), TextSpan(text: ', ${iv.place}', style: const TextStyle(color: C.text3))]),
                        style: T.b(13, color: C.text, weight: FontWeight.w800),
                      ),
                    ),
                    if (u != null && u.count > 0) ...[const SizedBox(width: 8), TabBadge(u.count)] else if (u?.fresh ?? false) ...[
                      const SizedBox(width: 8),
                      const NewTag(SInterview.newQ),
                    ],
                  ],
                ),
              ),
            ),
          );
        }
      }
      more.add(
        Align(
          alignment: Alignment.centerLeft,
          child: Pressable(
            onTap: mentions == 0
                ? null
                : () {
                    d.setPersonFilter(c.id);
                    d.setTab(DtTab.cabinet);
                  },
            label: SBoard.mentions(mentions),
            builder: (context, _) => ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 32),
              child: Align(
                alignment: Alignment.centerLeft,
                widthFactor: 1,
                heightFactor: 1,
                child: Text(
                  SBoard.mentions(mentions),
                  style: T.b(13, color: victim ? DtC.brown : (mentions == 0 ? C.text3 : C.sky), weight: FontWeight.w800).copyWith(
                    decoration: victim ? TextDecoration.underline : null,
                    decorationColor: DtC.brown,
                  ),
                ),
              ),
            ),
          ),
        ),
      );
      more.add(
        NoteList(
          compact: true,
          notes: c.notes,
          onAdd: (text) async => (await d.send({
            'type': 'note',
            'target': {'kind': 'character', 'id': c.id},
            'text': text,
          })).ok,
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: victim ? DtC.cream : DtC.card,
        border: Border.all(color: victim ? C.ink : DtC.cardLine, width: victim ? 3 : 2),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          top,
          if (_open)
            Container(
              margin: const EdgeInsets.only(top: 10),
              padding: const EdgeInsets.only(top: 10),
              decoration: BoxDecoration(
                border: Border(top: BorderSide(color: victim ? const Color(0x402B2116) : DtC.cardLine, width: 2)),
              ),
              child: VStack(gap: 10, children: more),
            ),
        ],
      ),
    );
  }
}

class _Locations extends StatelessWidget {
  const _Locations();

  @override
  Widget build(BuildContext context) {
    final d = Desk.of(context);
    return _Sec(
      label: const DtLabel(SBoard.locations),
      children: [
        for (final l in d.view.locations)
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: DtC.card, border: Border.all(color: DtC.cardLine, width: 2), borderRadius: BorderRadius.circular(16)),
            child: VStack(
              gap: 10,
              children: [
                Text(l.name, style: T.d(15, color: C.text, height: 1.05)),
                // `.dt-loc-pic`: 16/10, 2px mürekkep çerçeve, r12, 12px yazı (yer tutucuda da)
                Container(
                  clipBehavior: Clip.antiAlias,
                  foregroundDecoration: BoxDecoration(border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(12)),
                  decoration: BoxDecoration(borderRadius: BorderRadius.circular(12)),
                  child: Picture(
                    url: l.imageUrl,
                    alt: l.imageAlt ?? l.name,
                    tone: PicTone.dark,
                    cacheKey: '${d.slug}:loc:${l.id}',
                    aspectRatio: 16 / 10,
                    fontSize: 12,
                    phBorder: false,
                    phPadding: const EdgeInsets.all(1.4 * 12 + 2),
                  ),
                ),
                Paras(l.description, style: T.b(13, color: C.text3, weight: FontWeight.w600, height: 1.55)),
                if (l.plan != null)
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(color: C.panel2, borderRadius: BorderRadius.circular(12)),
                    child: FloorPlanView(plan: l.plan!, title: l.name, compact: true, fontSize: 12),
                  ),
              ],
            ),
          ),
      ],
    );
  }
}

class _Timeline extends StatelessWidget {
  const _Timeline();

  @override
  Widget build(BuildContext context) {
    final d = Desk.of(context);
    final sorted = [...d.view.timeline]..sort((a, b) => a.at.compareTo(b.at));
    final days = <({String day, List<TimelineItem> items})>[];
    for (final e in sorted) {
      final day = splitAt(e.at).$1;
      if (days.isNotEmpty && days.last.day == day) {
        days.last.items.add(e);
      } else {
        days.add((day: day, items: [e]));
      }
    }

    return _Sec(
      label: const DtLabel(SBoard.timeline),
      children: [
        if (days.isEmpty)
          const DtEmpty(SBoard.timelineEmpty)
        else
          VStack(
            gap: 14,
            children: [
              for (final day in days)
                Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: Text(day.day, style: T.b(12, color: C.text2, weight: FontWeight.w800)),
                    ),
                    TimelineList(
                      children: [
                        for (final e in day.items)
                          TimelineItemRow(
                            time: splitAt(e.at).$2,
                            text: e.text,
                            onTap: e.evidenceId == null ? null : () => d.openEvidence(e.evidenceId!),
                            source: e.evidenceId != null ? d.evidence[e.evidenceId] : null,
                          ),
                      ],
                    ),
                  ],
                ),
            ],
          ),
      ],
    );
  }
}

/// `.dt-tl-list`: solda 2px çizgi, öğeler arası 2px.
class TimelineList extends StatelessWidget {
  const TimelineList({super.key, required this.children});
  final List<Widget> children;
  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(left: 4),
    decoration: const BoxDecoration(border: Border(left: BorderSide(color: DtC.cardLine, width: 2))),
    child: VStack(gap: 2, children: children),
  );
}

/// `.dt-tl-item`: saat sütunu (46px), metin ve kaynak belge; solda çizginin üstünde nokta.
class TimelineItemRow extends StatelessWidget {
  const TimelineItemRow({super.key, required this.time, required this.text, this.onTap, this.source});
  final String time;
  final String text;
  final VoidCallback? onTap;
  final EvidenceView? source;

  @override
  Widget build(BuildContext context) {
    final row = Container(
      constraints: const BoxConstraints(minHeight: 40),
      padding: const EdgeInsets.fromLTRB(12, 8, 8, 8),
      decoration: BoxDecoration(borderRadius: BorderRadius.circular(10)),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 46, child: Text(time, style: T.d(13, color: C.sky, height: 1.45))),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(text, style: T.b(13, color: C.text, weight: FontWeight.w600)),
                if (source != null) ...[
                  const SizedBox(height: 2),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      KindGlyph(source!.kind, size: 12, color: C.text3),
                      const SizedBox(width: 4),
                      Flexible(child: Text(source!.title, style: T.b(11, color: C.text3, weight: FontWeight.w700))),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
    return Stack(
      clipBehavior: Clip.none,
      children: [
        onTap == null ? row : Pressable(onTap: onTap, label: text, builder: (context, _) => row),
        Positioned(
          top: 14,
          left: -6,
          child: IgnorePointer(
            child: Container(
              width: 10,
              height: 10,
              decoration: BoxDecoration(color: C.sky, shape: BoxShape.circle, border: Border.all(color: C.ink, width: 2)),
            ),
          ),
        ),
      ],
    );
  }
}

class _Scenes extends StatelessWidget {
  const _Scenes();

  @override
  Widget build(BuildContext context) {
    final d = Desk.of(context);
    return _Sec(
      label: const DtLabel(SScene.replay),
      children: [
        VStack(
          gap: 8,
          children: [
            for (final a in d.view.acts)
              DtOption(
                onTap: () => d.replayAct(a.index),
                child: Text.rich(
                  TextSpan(
                    children: [
                      TextSpan(text: '${a.index + 1}', style: const TextStyle(color: C.text3, fontFeatures: tabular)),
                      TextSpan(text: ' ${a.title}'),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ],
    );
  }
}
