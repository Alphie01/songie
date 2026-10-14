import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../ui/icons.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/kit.dart';
import 'bits.dart';
import 'desk.dart';
import 'documents.dart';
import 'models.dart';
import 'strings.dart';

const _zooms = [0.8, 1.0, 1.25, 1.5, 2.0];

/// Cabinet.tsx: kanıt dolabı (filtreler, belge sekmeleri) ve belge görüntüleyici.
/// Telefonda aynı anda biri görünür: belge seçiliyse görüntüleyici, değilse dolap.
class Cabinet extends StatefulWidget {
  const Cabinet({super.key, required this.onClose});
  final VoidCallback onClose;

  @override
  State<Cabinet> createState() => _CabinetState();
}

class _CabinetState extends State<Cabinet> {
  /// 'all' | 'pinned' | bölüm (int)
  Object _filter = 'all';

  @override
  Widget build(BuildContext context) {
    final d = Desk.of(context);
    final view = d.view;
    var list = [...view.evidence];
    if (_filter == 'pinned') {
      list = list.where((e) => e.pinned).toList();
    } else if (_filter is int) {
      list = list.where((e) => e.act == _filter).toList();
    }
    final pf = d.personFilter;
    if (pf != null) list = list.where((e) => e.people.contains(pf)).toList();
    list.sort((a, b) {
      final p = (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
      return p != 0 ? p : b.seq - a.seq;
    });
    final acts = {for (final e in view.evidence) e.act}.toList()..sort();
    final person = pf != null ? d.chars[pf] : null;

    if (d.selected != null) {
      return _Viewer(id: d.selected!, list: list, onClose: widget.onClose);
    }

    // Sekme adı zaten "Kanıtlar": dolap başlığı yalnızca ekran okuyucuya.
    return Semantics(
      label: '${SCabinet.title} ${view.evidence.length}',
      container: true,
      child: VStack(
        gap: 10,
        children: [
          VStack(
            gap: 10,
            children: [
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  DtChip(label: SCabinet.all, selected: _filter == 'all', onTap: () => setState(() => _filter = 'all')),
                  DtChip(label: SCabinet.pinned, selected: _filter == 'pinned', onTap: () => setState(() => _filter = 'pinned')),
                  if (acts.length > 1)
                    for (final a in acts) DtChip(label: SCabinet.act(a), selected: _filter == a, onTap: () => setState(() => _filter = a)),
                ],
              ),
              if (person != null)
                Align(
                  alignment: Alignment.centerLeft,
                  child: Pressable(
                    onTap: () => d.setPersonFilter(null),
                    label: SCabinet.clearPerson,
                    builder: (context, _) => Container(
                      constraints: const BoxConstraints(minHeight: 32),
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(color: C.sky, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(R.pill)),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Flexible(child: Text(SCabinet.person(person.name), style: T.b(12, color: C.ink2, weight: FontWeight.w800))),
                          const SizedBox(width: 6),
                          const SIcon('x', size: 12, color: C.ink2),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          ),
          if (list.isEmpty)
            const DtEmpty(SCabinet.empty)
          else
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: VStack(
                gap: 10,
                children: [
                  for (final e in list)
                    _FileTab(key: ValueKey(e.id), e: e, active: d.selected == e.id, isNew: !d.seen.contains(e.id), onOpen: () => d.openEvidence(e.id)),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

/// `.dt-file`: krem dosya sekmesi.
class _FileTab extends StatelessWidget {
  const _FileTab({super.key, required this.e, required this.active, required this.isNew, required this.onOpen});
  final EvidenceView e;
  final bool active;
  final bool isNew;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    const radius = BorderRadius.only(topLeft: Radius.circular(6), topRight: Radius.circular(14), bottomLeft: Radius.circular(14), bottomRight: Radius.circular(14));
    final meta = T.b(12, color: DtC.brown, weight: FontWeight.w700);
    return Pressable(
      onTap: onOpen,
      label: e.title,
      selected: active,
      builder: (context, _) => Stack(
        clipBehavior: Clip.none,
        children: [
          Container(
            width: double.infinity,
            constraints: const BoxConstraints(minHeight: 44),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: DtC.cream,
              border: Border.all(color: C.ink, width: 2),
              borderRadius: radius,
              boxShadow: active ? const [BoxShadow(color: C.sky, spreadRadius: 3)] : null,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(e.title, style: T.b(14, color: DtC.brown, weight: FontWeight.w800, height: 1.3)),
                const SizedBox(height: 2),
                Wrap(
                  spacing: 6,
                  runSpacing: 4,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    KindGlyph(e.kind, size: 12, color: DtC.brown),
                    Text('${kindName(e.kind)} · ${e.source != null ? SCabinet.source(e.source!) : SCabinet.sourceStart}', style: meta.copyWith(height: 1.3)),
                    if (e.pinned) const Tooltip(message: SCabinet.pinned, child: PinIcon(color: DtC.red)),
                    if (e.notes.isNotEmpty)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6),
                        decoration: BoxDecoration(color: C.yellow, borderRadius: BorderRadius.circular(6)),
                        child: Text(SNotes.count(e.notes.length), style: T.b(11, color: C.ink2, weight: FontWeight.w700, height: 1.3)),
                      ),
                  ],
                ),
              ],
            ),
          ),
          // CSS: dolgu kutusuna göre top -8, right 10 (2px çerçeve dahil kutuda -6 / 12)
          if (isNew) const Positioned(top: -6, right: 12, child: NewTag(SCabinet.isNew)),
        ],
      ),
    );
  }
}

class _Viewer extends StatefulWidget {
  const _Viewer({required this.id, required this.list, required this.onClose});
  final String id;
  final List<EvidenceView> list;
  final VoidCallback onClose;

  @override
  State<_Viewer> createState() => _ViewerState();
}

class _ViewerState extends State<_Viewer> {
  double _zoom = 1;
  String? _loadedFor;

  void _ensureLoaded(DocStore docs) {
    // İlk açılışta ve belge değişince getir; önbellek boşalırsa (başka soruşturma) yeniden getir.
    if (_loadedFor != widget.id || docs.get(widget.id) == null) {
      _loadedFor = widget.id;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && docs.get(widget.id) is! DocLoading && docs.get(widget.id) is! DocReady) docs.load(widget.id);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final d = Desk.of(context);
    final e = d.evidence[widget.id];
    if (e == null) return const SizedBox.shrink();
    final list = widget.list;
    final idx = list.indexWhere((x) => x.id == widget.id);
    final prev = idx > 0 ? list[idx - 1] : null;
    final next = idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null;
    final zi = _zooms.indexOf(_zoom);
    final people = [for (final p in e.people) ?d.chars[p]];

    return VStack(
      gap: 12,
      children: [
        // .btn.btn-ghost.dt-viewer-back
        Align(
          alignment: Alignment.centerLeft,
          child: Pressable(
            onTap: widget.onClose,
            label: SCabinet.back,
            builder: (context, _) => Container(
              constraints: const BoxConstraints(minHeight: 44),
              padding: const EdgeInsets.fromLTRB(10, 0, 14, 0),
              decoration: BoxDecoration(border: Border.all(color: DtC.cardLine, width: 2), borderRadius: BorderRadius.circular(12)),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Transform.rotate(angle: math.pi / 2, child: const SIcon('chevron', size: 14, color: C.text)),
                  const SizedBox(width: 8),
                  Text(SCabinet.back, style: T.b(14, color: C.text, weight: FontWeight.w800, height: 1)),
                ],
              ),
            ),
          ),
        ),
        _head(d, e, zi, prev, next),
        _stage(d),
        if (people.isNotEmpty)
          VStack(
            gap: 8,
            children: [
              const DtLabel(SCabinet.people),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  for (final c in people)
                    DtChip(
                      label: c.name,
                      borderColor: c.mark?.mark == 'suspect' ? C.red : (c.mark?.mark == 'clear' ? C.mint : DtC.cardLine),
                      color: c.mark?.mark == 'suspect' ? C.red : (c.mark?.mark == 'clear' ? C.mint : C.text),
                      onTap: () => d.showPerson(c.id),
                    ),
                ],
              ),
            ],
          ),
        NoteList(
          key: ValueKey('notes-${e.id}'),
          notes: e.notes,
          onAdd: (text) async => (await d.send({
            'type': 'note',
            'target': {'kind': 'evidence', 'id': e.id},
            'text': text,
          })).ok,
        ),
      ],
    );
  }

  Widget _head(Desk d, EvidenceView e, int zi, EvidenceView? prev, EvidenceView? next) {
    Widget tool({required Widget child, required VoidCallback? onTap, required String label}) => DtIconBtn(
      size: 40,
      background: DtC.brown,
      borderColor: DtC.brown,
      color: DtC.cream,
      disabledOpacity: 0.3,
      label: label,
      onTap: onTap,
      child: child,
    );

    final zoom = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        tool(label: SCabinet.zoomOut, onTap: zi <= 0 ? null : () => setState(() => _zoom = _zooms[zi - 1]), child: const Text('−')),
        const SizedBox(width: 4),
        Pressable(
          onTap: () => setState(() => _zoom = 1),
          label: SCabinet.zoomReset,
          builder: (context, _) => Container(
            constraints: const BoxConstraints(minWidth: 52),
            height: 40,
            alignment: Alignment.center,
            decoration: BoxDecoration(border: Border.all(color: DtC.brown, width: 2), borderRadius: BorderRadius.circular(12)),
            child: Text('${(_zoom * 100).round()}%', style: T.b(13, color: DtC.brown, weight: FontWeight.w800, height: 1)),
          ),
        ),
        const SizedBox(width: 4),
        tool(label: SCabinet.zoomIn, onTap: zi >= _zooms.length - 1 ? null : () => setState(() => _zoom = _zooms[zi + 1]), child: const Text('+')),
      ],
    );

    final pinLabel = e.pinned ? SCabinet.unpin : SCabinet.pin;
    final pinFg = e.pinned ? C.ink2 : DtC.brown;
    final pin = Pressable(
      onTap: () => d.send({'type': 'pin', 'evidenceId': e.id, 'pinned': !e.pinned}),
      label: pinLabel,
      selected: e.pinned,
      builder: (context, _) => Container(
        constraints: const BoxConstraints(minHeight: 40),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: e.pinned ? C.yellow : null,
          border: Border.all(color: e.pinned ? C.ink : DtC.brown, width: 2),
          borderRadius: BorderRadius.circular(R.pill),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            PinIcon(size: 13, color: pinFg),
            const SizedBox(width: 6),
            Text(pinLabel, style: T.b(12, color: pinFg, weight: FontWeight.w800, height: 1.2)),
          ],
        ),
      ),
    );

    final nav = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        tool(
          label: SCabinet.prev,
          onTap: prev == null ? null : () => d.openEvidence(prev.id),
          child: Transform.rotate(angle: math.pi / 2, child: const SIcon('chevron', size: 16, color: DtC.cream)),
        ),
        const SizedBox(width: 6),
        tool(
          label: SCabinet.next,
          onTap: next == null ? null : () => d.openEvidence(next.id),
          child: Transform.rotate(angle: -math.pi / 2, child: const SIcon('chevron', size: 16, color: DtC.cream)),
        ),
      ],
    );

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: DtC.cream,
        border: Border.all(color: C.ink, width: 3),
        borderRadius: const BorderRadius.only(topLeft: Radius.circular(6), topRight: Radius.circular(20), bottomLeft: Radius.circular(20), bottomRight: Radius.circular(20)),
      ),
      child: VStack(
        gap: 6,
        children: [
          Wrap(
            spacing: 6,
            runSpacing: 6,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              KindGlyph(e.kind, size: 14, color: DtC.brown),
              Text(
                '${kindName(e.kind)}, ${e.source != null ? SCabinet.source(e.source!) : SCabinet.sourceStart}',
                style: T.b(12, color: DtC.brown, weight: FontWeight.w800),
              ),
            ],
          ),
          Semantics(header: true, child: Text(e.title, style: T.d(22, color: DtC.brown, height: 1.15))),
          Text(e.summary, style: T.b(13, color: DtC.brown, weight: FontWeight.w700)),
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: LayoutBuilder(
              builder: (context, c) {
                // flex-wrap; gezinti düğmeleri `margin-left: auto` ile satırın sonunda.
                final pinText = TextPainter(
                  text: TextSpan(text: pinLabel, style: T.b(12, weight: FontWeight.w800, height: 1.2)),
                  textDirection: TextDirection.ltr,
                  textScaler: MediaQuery.textScalerOf(context),
                )..layout();
                final pinW = 2 + 10 + 13 + 6 + pinText.width + 10 + 2;
                const zoomW = 40 + 4 + 52 + 4 + 40;
                const navW = 40 + 6 + 40;
                final oneLine = zoomW + 8 + pinW + 8 + navW <= c.maxWidth;
                if (oneLine) {
                  return Row(children: [zoom, const SizedBox(width: 8), pin, const Spacer(), nav]);
                }
                final first = zoomW + 8 + pinW <= c.maxWidth;
                return VStack(
                  gap: 8,
                  children: [
                    if (first)
                      Row(children: [zoom, const SizedBox(width: 8), pin])
                    else ...[
                      Align(alignment: Alignment.centerLeft, child: zoom),
                      Align(alignment: Alignment.centerLeft, child: pin),
                    ],
                    Align(alignment: Alignment.centerRight, child: nav),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  /// `.dt-stage`: koyu masa üstünde kâğıt; yazı boyu 12,5px (720px'ten itibaren 14px) × yakınlaştırma.
  Widget _stage(Desk d) {
    return ListenableBuilder(
      listenable: d.docs,
      builder: (context, _) {
        _ensureLoaded(d.docs);
        final entry = d.docs.get(widget.id);
        final width = MediaQuery.sizeOf(context).width;
        final base = width >= 720 ? 14.0 : 12.5;
        // padding: clamp(16px, 3vw, 40px) clamp(10px, 2.5vw, 36px)
        final py = (width * 0.03).clamp(16.0, 40.0);
        final px = (width * 0.025).clamp(10.0, 36.0);
        return Container(
          clipBehavior: Clip.antiAlias,
          decoration: BoxDecoration(color: DtC.stage, border: Border.all(color: C.ink, width: 3), borderRadius: BorderRadius.circular(20)),
          child: LayoutBuilder(
            builder: (context, c) {
              final inner = math.max(0.0, c.maxWidth - 2 * px);
              Widget msg(List<Widget> children) => Padding(
                padding: EdgeInsets.symmetric(horizontal: px, vertical: py + 40),
                child: SizedBox(
                  width: inner,
                  child: Column(mainAxisSize: MainAxisSize.min, children: _gap(12, children)),
                ),
              );
              if (entry == null || entry is DocLoading) {
                return Semantics(liveRegion: true, child: msg([Text(SCabinet.loading, textAlign: TextAlign.center, style: T.b(13, color: C.text3))]));
              }
              if (entry is DocFailed) {
                return msg([
                  ErrorText(entry.error, center: true),
                  SButton(label: SCabinet.retry, tone: BtnTone.outline, onPressed: () => d.docs.load(widget.id, force: true)),
                ]);
              }
              final data = (entry as DocReady).data;
              final sheet = math.min(inner, 46 * base) * _zoom;
              return SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: EdgeInsets.symmetric(horizontal: px, vertical: py),
                child: SizedBox(
                  width: math.max(sheet, inner),
                  child: Align(
                    alignment: Alignment.topCenter,
                    child: SizedBox(
                      width: sheet,
                      child: DocumentView(key: ValueKey(data.evidenceId), data: data, em: base * _zoom, narrow: inner <= 520),
                    ),
                  ),
                ),
              );
            },
          ),
        );
      },
    );
  }
}

List<Widget> _gap(double gap, List<Widget> items) => [
  for (var i = 0; i < items.length; i++) ...[if (i > 0) SizedBox(height: gap), items[i]],
];
