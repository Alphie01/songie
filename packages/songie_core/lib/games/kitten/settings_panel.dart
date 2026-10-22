import 'package:flutter/material.dart';

import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/game_module.dart';
import 'card_art.dart';
import 'models.dart';
import 'strings.dart';

/// `.kt-set-label` ve `.kt-set-hint`.
final _label = T.b(14, color: C.text2, weight: FontWeight.w700);
final _hint = T.b(12, color: C.text3, weight: FontWeight.w600, height: 1.4);

/// games/kitten/client/SettingsPanel.tsx
class KittenSettingsPanel extends StatelessWidget {
  const KittenSettingsPanel({super.key, required this.props});
  final SettingsPanelProps props;

  @override
  Widget build(BuildContext context) {
    final p = props;
    final settings = KittenSettings.fromJson(p.settings);
    void set(KittenSettings next) {
      if (p.editable) p.onChange(next.toJson());
    }

    final items = <Widget>[];
    if (p.showPrimary) {
      if (!p.editable) items.add(Text(SSettings.readOnly, style: T.b(13, color: C.text3, weight: FontWeight.w700)));
      items.add(
        _Row(
          title: SSettings.deck,
          hint: SSettings.deckHint(p.players.length),
          children: [
            ExcludeSemantics(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const KtCardBack(small: true),
                  if (p.players.length > singleDeckMax) ...[
                    const SizedBox(width: 4),
                    Transform.rotate(angle: deg(6), child: const KtCardBack(small: true)),
                  ],
                ],
              ),
            ),
          ],
        ),
      );
      items.add(
        _Row(
          title: SSettings.five,
          hint: SSettings.fiveHint,
          children: [
            _Toggle(
              label: settings.fiveCats ? SSettings.on : SSettings.off,
              semantics: SSettings.five,
              on: settings.fiveCats,
              onTap: p.editable ? () => set(settings.copyWith(fiveCats: !settings.fiveCats)) : null,
            ),
          ],
        ),
      );
    }
    if (p.showSecondary) {
      items.add(
        _Row(
          title: SSettings.nope,
          hint: SSettings.nopeHint,
          children: [
            for (final n in nopeOptions)
              _SetChip(
                label: n == nopeOptions.last ? SSettings.sec(n) : '$n',
                semantics: SSettings.sec(n),
                selected: settings.nopeSeconds == n,
                onTap: p.editable ? () => set(settings.copyWith(nopeSeconds: n)) : null,
              ),
          ],
        ),
      );
      items.add(
        _Row(
          title: SSettings.turn,
          hint: SSettings.turnHint,
          children: [
            for (final n in turnOptions)
              _SetChip(
                label: n == 0 ? SSettings.unlimited : (n == turnOptions.last ? SSettings.sec(n) : '$n'),
                semantics: n == 0 ? SSettings.unlimited : SSettings.sec(n),
                selected: settings.turnSeconds == n,
                onTap: p.editable ? () => set(settings.copyWith(turnSeconds: n)) : null,
              ),
          ],
        ),
      );
    }
    return VStack(gap: 12, children: items);
  }
}

/// Lobi tasarımındaki ayar satırı: solda ad, sağda seçenekler; altında kısa açıklama (`.kt-set`).
class _Row extends StatelessWidget {
  const _Row({required this.title, required this.children, this.hint});
  final String title;
  final List<Widget> children;
  final String? hint;

  @override
  Widget build(BuildContext context) => Semantics(
    container: true,
    label: title,
    child: VStack(
      gap: 4,
      children: [
        LayoutBuilder(
          builder: (context, c) => Row(
            children: [
              ConstrainedBox(
                constraints: BoxConstraints(maxWidth: c.maxWidth * .6),
                child: Text(title, style: _label),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Align(
                  alignment: Alignment.centerRight,
                  child: Wrap(alignment: WrapAlignment.end, crossAxisAlignment: WrapCrossAlignment.center, spacing: 4, runSpacing: 4, children: children),
                ),
              ),
            ],
          ),
        ),
        if (hint != null) Text(hint!, style: _hint),
      ],
    ),
  );
}

/// `.kt-set-opts .chip`: en az 44×44, 0 10 dolgu, 13px.
class _SetChip extends StatelessWidget {
  const _SetChip({required this.label, required this.semantics, required this.selected, this.onTap});
  final String label;
  final String semantics;
  final bool selected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final fg = selected ? C.ink2 : C.text;
    return Pressable(
      onTap: onTap,
      label: semantics,
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
          children: [Flexible(child: ExcludeSemantics(child: Text(label, style: T.d(13, color: fg), maxLines: 1, softWrap: false)))],
        ),
      ),
    );
  }
}

/// `.toggle.kt-toggle`: içeriğine göre genişleyen anahtar; açıkken nane.
class _Toggle extends StatelessWidget {
  const _Toggle({required this.label, required this.semantics, required this.on, this.onTap});
  final String label;
  final String semantics;
  final bool on;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => Pressable(
    onTap: onTap,
    label: semantics,
    selected: on,
    builder: (context, _) => Container(
      constraints: const BoxConstraints(minHeight: 44),
      padding: const EdgeInsets.only(left: 14, right: 12),
      decoration: BoxDecoration(color: on ? C.mint : C.panel, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(R.sm)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Flexible(child: ExcludeSemantics(child: Text(label, style: T.b(13, color: on ? C.ink2 : C.text2, weight: FontWeight.w800), maxLines: 1, softWrap: false))),
          const SizedBox(width: 10),
          ToggleKnob(on: on),
        ],
      ),
    ),
  );
}
