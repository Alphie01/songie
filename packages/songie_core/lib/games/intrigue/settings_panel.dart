import 'package:flutter/material.dart';

import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/game_module.dart';
import '../kit/kit.dart';
import 'models.dart';
import 'role_art.dart';
import 'strings.dart';

/// `.ig-set-label` / `.ig-set-hint`
final _label = T.b(14, color: C.text2, weight: FontWeight.w700);
final _hint = T.b(12, color: C.text3, weight: FontWeight.w700, height: 1.4);

/// `.ig-set`: başlık + içerik (+ ipucu), aralık 6. `stack` değilse başlık ve içerik aynı satırda (`.ig-set-row`).
class _Group extends StatelessWidget {
  const _Group({required this.title, required this.children, this.hint, this.stack = false});
  final String title;
  final List<Widget> children;
  final String? hint;
  final bool stack;

  @override
  Widget build(BuildContext context) {
    final label = Text(title, style: _label);
    return Semantics(
      container: true,
      label: title,
      child: VStack(
        gap: 6,
        children: [
          if (stack) ...[label, ...children]
          else
            Wrap(
              alignment: WrapAlignment.spaceBetween,
              crossAxisAlignment: WrapCrossAlignment.center,
              spacing: 8,
              runSpacing: 8,
              children: [label, ...children],
            ),
          if (hint != null) Text(hint!, style: _hint),
        ],
      ),
    );
  }
}

/// games/intrigue/client/SettingsPanel.tsx
class IntrigueSettingsPanel extends StatelessWidget {
  const IntrigueSettingsPanel({super.key, required this.props});
  final SettingsPanelProps props;

  @override
  Widget build(BuildContext context) {
    final p = props;
    final settings = IntrigueSettings.fromJson(p.settings);
    void set(IntrigueSettings next) {
      if (p.editable) p.onChange(next.toJson());
    }

    final n = p.players.length;
    final forced = n > smallTableMax;
    final items = <Widget>[];

    if (p.showPrimary) {
      if (!p.editable) items.add(const ReadOnlyNote(SSettings.readOnly));
      items.add(
        _Group(
          stack: true,
          title: SSettings.deck,
          hint: SSettings.deckHint(n, settings.bigDeck),
          children: [
            ExcludeSemantics(
              child: Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  for (final r in roles)
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        RoleCard(role: r, size: CardSize.mini, outlined: true),
                        const SizedBox(width: 5),
                        Text('×${cardsPerRole(n, settings.bigDeck)}', style: T.b(13, color: C.text2, weight: FontWeight.w800)),
                      ],
                    ),
                ],
              ),
            ),
            SToggle(
              label: SSettings.bigDeck,
              value: settings.bigDeck || forced,
              onChanged: p.editable && !forced ? (_) => set(settings.copyWith(bigDeck: !settings.bigDeck)) : null,
            ),
          ],
        ),
      );
    }

    if (p.showSecondary) {
      items.add(
        _Group(
          title: SSettings.challenge,
          hint: SSettings.challengeHint,
          children: [
            SChips(
              children: [
                for (final v in challengeOptions)
                  SettingChip(
                    label: SSettings.sec(v),
                    selected: settings.challengeSeconds == v,
                    onTap: p.editable ? () => set(settings.copyWith(challengeSeconds: v)) : null,
                  ),
              ],
            ),
          ],
        ),
      );
      items.add(
        _Group(
          title: SSettings.turn,
          hint: SSettings.turnHint,
          children: [
            SChips(
              children: [
                for (final v in turnOptions)
                  SettingChip(
                    label: v == 0 ? SSettings.unlimited : SSettings.sec(v),
                    selected: settings.turnSeconds == v,
                    onTap: p.editable ? () => set(settings.copyWith(turnSeconds: v)) : null,
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
