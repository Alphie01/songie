import 'package:flutter/material.dart';

import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/game_module.dart';
import 'models.dart';
import 'strings.dart';

/// `.cc-set-label` ve `.cc-set-hint`.
final _label = T.b(14, color: C.text2, weight: FontWeight.w700);
final _hint = T.b(12, color: C.text3, weight: FontWeight.w600, height: 1.4);

/// games/color-cards/client/SettingsPanel.tsx
class ColorCardsSettingsPanel extends StatelessWidget {
  const ColorCardsSettingsPanel({super.key, required this.props});
  final SettingsPanelProps props;

  @override
  Widget build(BuildContext context) {
    final p = props;
    final settings = ColorCardsSettings.fromJson(p.settings);
    void set(ColorCardsSettings next) {
      if (p.editable) p.onChange(next.toJson());
    }

    final items = <Widget>[];
    if (p.showPrimary) {
      if (!p.editable) {
        items.add(
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(color: C.panel, borderRadius: BorderRadius.circular(12)),
            child: Text(SSettings.readOnly, style: T.b(13, color: C.text2, weight: FontWeight.w700)),
          ),
        );
      }
      items.add(
        _Group(
          title: SSettings.mode,
          hint: SSettings.modeHint(settings.mode == 'single'),
          chips: [
            for (final m in const ['single', 'points'])
              _SetChip(
                label: m == 'single' ? SSettings.single : SSettings.points,
                selected: settings.mode == m,
                onTap: p.editable ? () => set(settings.copyWith(mode: m)) : null,
              ),
          ],
        ),
      );
      items.add(
        _Group(
          title: SSettings.turn,
          hint: SSettings.turnHint,
          chips: [
            for (final n in turnOptions)
              _SetChip(
                label: n == 0 ? SSettings.unlimited : SSettings.sec(n),
                selected: settings.turnSeconds == n,
                onTap: p.editable ? () => set(settings.copyWith(turnSeconds: n)) : null,
              ),
          ],
        ),
      );
    }
    if (p.showSecondary) {
      items.add(
        VStack(
          gap: 6,
          children: [
            Text(SSettings.house, style: _label),
            Text(SSettings.houseHint, style: _hint),
            VStack(
              gap: 8,
              children: [
                _Rule(
                  label: SSettings.stacking,
                  hint: SSettings.stackingHint,
                  on: settings.stacking,
                  onTap: p.editable ? () => set(settings.copyWith(stacking: !settings.stacking)) : null,
                ),
                _Rule(
                  label: SSettings.sevenZero,
                  hint: SSettings.sevenZeroHint,
                  on: settings.sevenZero,
                  onTap: p.editable ? () => set(settings.copyWith(sevenZero: !settings.sevenZero)) : null,
                ),
                _Rule(
                  label: SSettings.drawUntil,
                  hint: SSettings.drawUntilHint,
                  on: settings.drawUntilPlayable,
                  onTap: p.editable ? () => set(settings.copyWith(drawUntilPlayable: !settings.drawUntilPlayable)) : null,
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

/// Lobi tasarımındaki ayar satırı: solda ad, sağda seçenekler; altında kısa açıklama (`.cc-set`).
class _Group extends StatelessWidget {
  const _Group({required this.title, required this.chips, this.hint});
  final String title;
  final List<Widget> chips;
  final String? hint;

  @override
  Widget build(BuildContext context) => Semantics(
    container: true,
    label: title,
    child: VStack(
      gap: 6,
      children: [
        Wrap(
          alignment: WrapAlignment.spaceBetween,
          crossAxisAlignment: WrapCrossAlignment.center,
          spacing: 8,
          runSpacing: 8,
          children: [
            Text(title, style: _label),
            Wrap(spacing: 4, runSpacing: 4, children: chips),
          ],
        ),
        if (hint != null) Text(hint!, style: _hint),
      ],
    ),
  );
}

/// `.cc-set-chips .chip`: en az 44 geniş, 0 10 dolgu, 13px.
class _SetChip extends StatelessWidget {
  const _SetChip({required this.label, required this.selected, this.onTap});
  final String label;
  final bool selected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final fg = selected ? C.ink2 : C.text;
    return Pressable(
      onTap: onTap,
      label: label,
      selected: selected,
      builder: (context, _) => Container(
        constraints: const BoxConstraints(minHeight: 44, minWidth: 44),
        padding: const EdgeInsets.symmetric(horizontal: 10),
        decoration: BoxDecoration(
          color: selected ? C.yellow : C.panel,
          border: Border.all(color: C.ink, width: 2),
          borderRadius: BorderRadius.circular(12),
          boxShadow: selected ? hardShadow(0, 3) : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [Flexible(child: Text(label, style: T.d(13, color: fg), maxLines: 1, softWrap: false))],
        ),
      ),
    );
  }
}

/// `.cc-rule`: anahtar + açıklama.
class _Rule extends StatelessWidget {
  const _Rule({required this.label, required this.hint, required this.on, this.onTap});
  final String label;
  final String hint;
  final bool on;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => VStack(
    gap: 4,
    children: [
      SToggle(label: label, value: on, onChanged: onTap == null ? null : (_) => onTap!()),
      Text(hint, style: _hint),
    ],
  );
}
