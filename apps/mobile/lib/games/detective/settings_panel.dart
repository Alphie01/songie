import 'package:flutter/material.dart';

import '../../session/api.dart';
import '../../shared/models.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/game_module.dart';
import '../kit/kit.dart';
import 'bits.dart';
import 'desk.dart';
import 'models.dart';
import 'strings.dart';

/// `.dt-legend`: Baloo 16, beyaz (legend satır yüksekliği gövdeninki).
final _legend = T.d(16, color: C.text, height: 1.45);

Widget _group(String title, Widget child, {String? hint}) => SettingsGroup(title: title, legendStyle: _legend, legendGap: 8, hint: hint, child: child);

const _diffColor = <String, Color>{'orta': C.yellow, 'zor': C.orange, 'çok zor': C.red};

/// games/detective/client/SettingsPanel.tsx: vaka rafı, devam eden dosyalar, iz kararı, ipucu.
class DetectiveSettingsPanel extends StatefulWidget {
  const DetectiveSettingsPanel({super.key, required this.props});
  final SettingsPanelProps props;

  @override
  State<DetectiveSettingsPanel> createState() => _DetectiveSettingsPanelState();
}

class _DetectiveSettingsPanelState extends State<DetectiveSettingsPanel> {
  CasesResponse? _data;
  bool _error = false;

  @override
  void initState() {
    super.initState();
    if (widget.props.showPrimary) _load();
  }

  Future<void> _load() async {
    try {
      final r = await widget.props.api.get('/cases');
      if (mounted) setState(() => _data = CasesResponse.fromJson(r));
    } on ApiError {
      if (mounted) setState(() => _error = true);
    } on Object {
      if (mounted) setState(() => _error = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.props;
    final settings = DetectiveSettings.fromJson(p.settings);
    void set(Json patch) {
      if (p.editable) p.onChange({...settings.toJson(), ...patch});
    }

    final items = <Widget>[];
    if (p.showPrimary) {
      if (!p.editable) items.add(const ReadOnlyNote(SSettings.readOnly));
      final Widget shelf;
      if (_error) {
        shelf = const ErrorText(SSettings.loadError);
      } else if (_data == null) {
        shelf = Text(SSettings.loading, style: SettingsGroup.defaultHint());
      } else if (_data!.cases.isEmpty) {
        shelf = Text(SSettings.empty, style: SettingsGroup.defaultHint());
      } else {
        shelf = _Shelf(
          children: [
            for (final c in _data!.cases)
              _CaseCover(
                c: c,
                selected: settings.caseSlug == c.slug && settings.resume == null,
                editable: p.editable,
                onPick: () => set({'caseSlug': c.slug, 'resume': null}),
              ),
          ],
        );
      }
      items.add(_group(SSettings.shelf, shelf, hint: p.editable ? SSettings.shelfHint : null));
      if (_data != null && _data!.sessions.isNotEmpty) {
        items.add(
          _group(
            SSettings.sessions,
            hint: SSettings.sessionsHint,
            VStack(
              gap: 8,
              children: [
                for (final ss in _data!.sessions)
                  _SessionRow(ss: ss, selected: settings.resume == ss.id, editable: p.editable, onPick: () => set({'resume': ss.id, 'caseSlug': ss.slug})),
              ],
            ),
          ),
        );
      }
    }
    if (p.showSecondary) {
      if (!p.showPrimary && !p.editable) items.add(const ReadOnlyNote(SSettings.readOnly));
      items.add(
        _group(
          SSettings.leadMode,
          hint: SSettings.leadModeHint[settings.leadMode],
          SChips(
            children: [
              for (final m in const ['vote', 'host'])
                SettingChip(label: SSettings.leadModes[m]!, selected: settings.leadMode == m, onTap: p.editable ? () => set({'leadMode': m}) : null),
            ],
          ),
        ),
      );
      items.add(
        _group(
          SSettings.hints,
          hint: SSettings.hintsHint,
          SToggle(label: SSettings.hints, value: settings.hints, onChanged: p.editable ? (_) => set({'hints': !settings.hints}) : null),
        ),
      );
    }
    return VStack(gap: 22, children: items);
  }
}

/// `.dt-shelf`: `repeat(auto-fill, minmax(min(100%, 240px), 1fr))`, aralık 12; satırdaki kartlar eşit boy.
class _Shelf extends StatelessWidget {
  const _Shelf({required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, c) {
      final cols = ((c.maxWidth + 12) / (240 + 12)).floor().clamp(1, 99);
      if (cols == 1) return VStack(gap: 12, children: children);
      return Grid2(columns: cols, rowGap: 12, columnGap: 12, equalHeight: true, children: children);
    },
  );
}

class _CaseCover extends StatelessWidget {
  const _CaseCover({required this.c, required this.selected, required this.editable, required this.onPick});
  final CaseCard c;
  final bool selected;
  final bool editable;
  final VoidCallback onPick;

  @override
  Widget build(BuildContext context) {
    final img = c.coverUrl != null;
    final coverFg = img ? C.text : DtC.brown;
    final disabled = !editable && !selected;
    final teaser = paragraphs(c.teaser).firstOrNull ?? '';
    Widget meta(String text, {Color color = C.text, bool mono = false}) => Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(color: selected ? C.ink2 : C.panel2, borderRadius: BorderRadius.circular(8)),
      child: Text(text, style: T.b(12, color: color, weight: FontWeight.w800).copyWith(fontFeatures: mono ? tabular : null)),
    );

    final cover = Container(
      constraints: const BoxConstraints(minHeight: 132),
      decoration: const BoxDecoration(color: DtC.cream, border: Border(bottom: BorderSide(color: C.ink, width: 3))),
      child: Stack(
        children: [
          if (img) ...[
            Positioned.fill(child: DtNetImage(url: c.coverUrl!, cacheKey: '${c.slug}:cover', error: const ColoredBox(color: DtC.cream))),
            const Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Color(0x0D0D0828), Color(0xD90D0828)]),
                ),
              ),
            ),
          ],
          ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 132 - 3),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(14, 36, 14, 12),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.end,
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(c.title, style: T.d(22, color: coverFg, height: 1.05)),
                  const SizedBox(height: 3),
                  Opacity(opacity: 0.85, child: Text(c.subtitle, style: T.b(12, color: coverFg, weight: FontWeight.w700))),
                ],
              ),
            ),
          ),
          Positioned(
            top: 10,
            left: 12,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(color: DtC.cream, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(R.pill)),
              child: Text(capitalize(c.genre), style: T.b(11, color: DtC.brown, weight: FontWeight.w800)),
            ),
          ),
          if (c.solved != null)
            Positioned(
              top: 10,
              right: 10,
              child: Transform.rotate(
                angle: deg(4),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(color: C.mint, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(8)),
                  child: Text(SSettings.solved(c.solved!.rank), style: T.b(11, color: C.ink2, weight: FontWeight.w800)),
                ),
              ),
            ),
        ],
      ),
    );

    final info = Padding(
      padding: const EdgeInsets.fromLTRB(14, 10, 14, 14),
      child: VStack(
        gap: 6,
        children: [
          Wrap(
            spacing: 4,
            runSpacing: 4,
            children: [
              meta(difficultyNames[c.difficulty] ?? c.difficulty, color: _diffColor[c.difficulty] ?? C.text2),
              meta(SSettings.minutes(c.minutes), mono: true),
              meta(SSettings.acts(c.acts)),
              meta(SSettings.evidence(c.evidenceCount)),
            ],
          ),
          Text(
            teaser,
            maxLines: selected ? null : 3,
            overflow: selected ? null : TextOverflow.ellipsis,
            style: T.b(13, color: selected ? C.ink2 : C.text2, weight: FontWeight.w600, height: 1.5),
          ),
        ],
      ),
    );

    return Opacity(
      opacity: disabled ? 0.55 : 1,
      child: Pressable(
        onTap: disabled ? null : () => editable ? onPick() : null,
        label: c.title,
        selected: selected,
        builder: (context, _) => Transform.rotate(
          angle: selected ? deg(-1) : 0,
          child: Container(
            clipBehavior: Clip.antiAlias,
            decoration: BoxDecoration(
              color: selected ? C.yellow : C.panel,
              border: Border.all(color: C.ink, width: 3),
              borderRadius: BorderRadius.circular(18),
              boxShadow: Shadows.md,
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [cover, info]),
          ),
        ),
      ),
    );
  }
}

class _SessionRow extends StatelessWidget {
  const _SessionRow({required this.ss, required this.selected, required this.editable, required this.onPick});
  final SessionCard ss;
  final bool selected;
  final bool editable;
  final VoidCallback onPick;

  @override
  Widget build(BuildContext context) {
    final fg = selected ? C.ink2 : C.text;
    final small = T.b(12, color: fg, weight: FontWeight.w700);
    return Pressable(
      onTap: !editable && !selected ? null : () => editable ? onPick() : null,
      label: ss.title,
      selected: selected,
      builder: (context, _) => Container(
        constraints: const BoxConstraints(minHeight: 52),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(color: selected ? C.yellow : C.panel, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(14)),
        child: VStack(
          gap: 2,
          children: [
            Text(ss.title, style: T.b(14, color: fg, weight: FontWeight.w800)),
            Opacity(
              opacity: 0.8,
              child: Text('${SSettings.sessionAct(ss.act, ss.acts)}, ${SSettings.sessionHours(ss.hoursSpent)}, ${ago(ss.updatedAt)}', style: small),
            ),
            if (ss.members.isNotEmpty) Opacity(opacity: 0.8, child: Text(ss.members.join(', '), style: small)),
          ],
        ),
      ),
    );
  }
}
