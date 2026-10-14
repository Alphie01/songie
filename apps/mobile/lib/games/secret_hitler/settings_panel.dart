import 'package:flutter/material.dart';

import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/game_module.dart';
import '../kit/kit.dart';
import 'glyphs.dart';
import 'models.dart';
import 'strings.dart';

/// `.sh-set`: başlık, içerik, ipucu (aralık 6). Bu oyunda bütün gruplar alt alta (`stack`).
class _Group extends StatelessWidget {
  const _Group({required this.title, required this.children, this.hint});
  final String title;
  final List<Widget> children;
  final String? hint;

  @override
  Widget build(BuildContext context) => Semantics(
    container: true,
    label: title,
    child: VStack(
      gap: 6,
      children: [
        Text(title, style: T.b(14, color: C.text2, weight: FontWeight.w700)),
        ...children,
        if (hint != null) Text(hint!, style: T.b(12, color: C.text3, weight: FontWeight.w700, height: 1.4)),
      ],
    ),
  );
}

const _counts = [5, 6, 7, 8, 9, 10];

/// `.sh-roles-table`: kişi sayısına göre rol dağılımı; odadaki sayı sarı satır.
class _RolesTable extends StatelessWidget {
  const _RolesTable({required this.n});
  final int n;

  @override
  Widget build(BuildContext context) {
    final heads = [SSettings.players, roleNames['liberal']!, roleNames['fascist']!, roleNames['hitler']!];
    final headColors = [C.text3, C.sky, C.coral, C.coral];
    final rows = [
      for (final c in _counts) ['$c', '${roleCounts[c]!.liberal}', '${roleCounts[c]!.fascist}', '1'],
    ];
    final headStyle = T.b(12, weight: FontWeight.w800);
    final cellStyle = T.b(13, weight: FontWeight.w800);
    const padX = 12.0;
    final widths = [
      for (var i = 0; i < 4; i++)
        [measureText(context, heads[i], headStyle), for (final r in rows) measureText(context, r[i], cellStyle)].reduce((a, b) => a > b ? a : b) + padX,
    ];
    Widget cell(String text, TextStyle style) => Padding(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
      child: Text(text, style: style, textAlign: TextAlign.center),
    );
    // border-spacing: 0 3px → satırların arasında (ve üstte/altta) 3px.
    final gap = TableRow(children: List.filled(4, const SizedBox(height: 3)));
    return Table(
      columnWidths: {for (var i = 0; i < 4; i++) i: CssAutoColumn(i, widths, widths)},
      defaultVerticalAlignment: TableCellVerticalAlignment.middle,
      children: [
        gap,
        TableRow(children: [for (var i = 0; i < 4; i++) cell(heads[i], headStyle.copyWith(color: headColors[i]))]),
        gap,
        for (var k = 0; k < rows.length; k++) ...[
          TableRow(
            decoration: _counts[k] == n ? BoxDecoration(color: C.yellow, borderRadius: BorderRadius.circular(8)) : null,
            children: [for (final t in rows[k]) cell(t, cellStyle.copyWith(color: _counts[k] == n ? C.ink2 : C.text2))],
          ),
          gap,
        ],
      ],
    );
  }
}

/// `.sh-track-mini`: oyuncu sayısına göre faşist pistindeki yetkiler.
class _TrackMini extends StatelessWidget {
  const _TrackMini({required this.label, required this.track, required this.current});
  final String label;
  final List<String?> track;
  final bool current;

  @override
  Widget build(BuildContext context) => Row(
    children: [
      SizedBox(width: 40, child: Text(label, style: T.b(13, color: current ? C.text : C.text3, weight: FontWeight.w800))),
      const SizedBox(width: 10),
      for (var k = 0; k < track.length; k++) ...[
        if (k > 0) const SizedBox(width: 4),
        _slot(track[k]),
      ],
    ],
  );

  Widget _slot(String? power) {
    final glyph = power == null ? null : Center(child: PowerGlyph(power: power, size: 12, color: current ? C.ink2 : C.coral));
    final semantics = power == null ? null : powerNames[power];
    if (current) {
      return Semantics(
        label: semantics,
        child: Container(
          width: 24,
          height: 28,
          decoration: BoxDecoration(color: C.coral, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(6)),
          child: glyph,
        ),
      );
    }
    return Semantics(
      label: semantics,
      child: CustomPaint(
        painter: DashedRRectPainter(color: C.coral, radius: 6, strokeWidth: 2, dash: 6, gap: 4),
        child: SizedBox(width: 24, height: 28, child: glyph),
      ),
    );
  }
}

/// games/secret-hitler/client/SettingsPanel.tsx
class SecretHitlerSettingsPanel extends StatelessWidget {
  const SecretHitlerSettingsPanel({super.key, required this.props});
  final SettingsPanelProps props;

  @override
  Widget build(BuildContext context) {
    final p = props;
    final settings = SecretHitlerSettings.fromJson(p.settings);
    final n = p.players.where((x) => x.connected).length;
    final items = <Widget>[];

    if (p.showPrimary) {
      if (!p.editable) items.add(const ReadOnlyNote(SSettings.readOnly));
      items.add(_Group(title: SSettings.roles, hint: SSettings.rolesHint(n), children: [_RolesTable(n: n)]));
      final currentRow = n <= 6 ? 0 : (n <= 8 ? 1 : 2);
      items.add(
        _Group(
          title: SSettings.track,
          children: [
            VStack(
              gap: 6,
              children: [
                for (var i = 0; i < 3; i++)
                  _TrackMini(label: const ['5–6', '7–8', '9–10'][i], track: fascistTrack(const [5, 7, 9][i]), current: currentRow == i),
              ],
            ),
          ],
        ),
      );
    }

    if (p.showSecondary) {
      items.add(
        _Group(
          title: SSettings.skipAfter,
          hint: SSettings.skipHint,
          children: [
            SChips(
              children: [
                for (final v in skipAfterOptions)
                  SettingChip(
                    label: SSettings.sec(v),
                    selected: settings.skipAfter == v,
                    onTap: p.editable ? () => p.onChange(settings.copyWith(skipAfter: v).toJson()) : null,
                  ),
              ],
            ),
          ],
        ),
      );
    }

    return VStack(gap: 12, children: items);
  }
}
