import 'package:flutter/material.dart';

import '../../shared/models.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/game_module.dart';
import '../kit/kit.dart';
import 'glyphs.dart';
import 'models.dart';
import 'strings.dart';

/// `.ww-set-label` ve `.ww-set-hint`.
final _label = T.b(14, color: C.text2, weight: FontWeight.w700);
final _hint = T.b(12, color: C.text3, weight: FontWeight.w700, height: 1.4);

/// games/werewolf/client/SettingsPanel.tsx
class WerewolfSettingsPanel extends StatelessWidget {
  const WerewolfSettingsPanel({super.key, required this.props});
  final SettingsPanelProps props;

  @override
  Widget build(BuildContext context) {
    final p = props;
    final settings = WerewolfSettings.fromJson(p.settings);
    final n = p.players.where((x) => x.connected).length;
    void set(Json patch) {
      if (p.editable) p.onChange({...p.settings, ...patch});
    }

    void setRoles(Json patch) => set({
      'roles': {...settings.roles.toJson(), ...patch},
    });
    final villagers = villagerCount(settings.roles, n);
    final problem = rolesProblem(settings.roles, n);
    final rec = recommendedRoles(n);
    final isRec = rec == settings.roles;

    final items = <Widget>[];
    if (p.showPrimary) {
      if (!p.editable) items.add(const ReadOnlyNote(SSettings.readOnly));
      items.add(
        _Stack(
          title: SSettings.roles,
          hint: SSettings.rolesHint,
          children: [
            VStack(
              gap: 6,
              children: [
                _RoleRow(
                  role: 'wolf',
                  name: S.role['wolf']!,
                  trailing: _Stepper(
                    value: settings.roles.wolf,
                    onLess: p.editable && settings.roles.wolf > 1 ? () => setRoles({'wolf': settings.roles.wolf - 1}) : null,
                    onMore: p.editable && settings.roles.wolf < wolfMax ? () => setRoles({'wolf': settings.roles.wolf + 1}) : null,
                  ),
                ),
                for (final r in specialRoles)
                  _RoleToggle(role: r, on: settings.roles[r] > 0, onTap: p.editable ? () => setRoles({r: settings.roles[r] > 0 ? 0 : 1}) : null),
                _RoleRow(role: 'villager', name: SSettings.villagers(villagers), off: villagers < 1),
              ],
            ),
            if (problem != null && n > 0) Text(problem, style: T.b(13, color: C.errorOnDark, weight: FontWeight.w800)),
            if (p.editable)
              _RecButton(
                label: n >= 5 ? SSettings.recommend(n) : SSettings.recommendShort,
                onPressed: isRec ? null : () => set({'roles': rec.toJson()}),
              ),
          ],
        ),
      );
    }
    if (p.showSecondary) {
      Widget chips<V>(List<V> options, V value, String Function(V v) label, void Function(V v) pick) => SChips(
        children: [
          for (final v in options) SChip(label: label(v), selected: value == v, onPressed: p.editable ? () => pick(v) : null),
        ],
      );
      Widget toggle(String label, bool on, String key) => SToggle(label: label, value: on, onChanged: p.editable ? (v) => set({key: v}) : null);

      items.addAll([
        _Group(
          title: SSettings.roleSeconds,
          hint: SSettings.roleSecondsHint,
          child: chips<int>(roleSecondsOptions, settings.roleSeconds, SSettings.sec, (v) => set({'roleSeconds': v})),
        ),
        _Group(
          title: SSettings.discussSeconds,
          hint: SSettings.discussHint,
          child: chips<int>(discussSecondsOptions, settings.discussSeconds, SSettings.sec, (v) => set({'discussSeconds': v})),
        ),
        _Group(
          title: SSettings.voteSeconds,
          child: chips<int>(voteSecondsOptions, settings.voteSeconds, SSettings.sec, (v) => set({'voteSeconds': v})),
        ),
        _Group(
          title: SSettings.dayTie,
          child: chips<String>(const ['runoff', 'none'], settings.dayTie, (v) => SSettings.dayTieOpts[v]!, (v) => set({'dayTie': v})),
        ),
        _Group(
          title: SSettings.wolfTie,
          child: chips<String>(const ['random', 'none'], settings.wolfTie, (v) => SSettings.wolfTieOpts[v]!, (v) => set({'wolfTie': v})),
        ),
        _Stack(
          title: SSettings.rules,
          children: [
            VStack(
              gap: 6,
              children: [
                toggle(SSettings.revealRoles, settings.revealRoles, 'revealRoles'),
                toggle(SSettings.openVotes, settings.openVotes, 'openVotes'),
                toggle(SSettings.doctorNoRepeat, settings.doctorNoRepeat, 'doctorNoRepeat'),
                toggle(SSettings.ghostsSeeRoles, settings.ghostsSeeRoles, 'ghostsSeeRoles'),
              ],
            ),
          ],
        ),
      ]);
    }
    return VStack(gap: 12, children: items);
  }
}

/// `.ww-set` + `.ww-set-row`: başlık ve seçenekler aynı satırda (sığmazsa alt satıra geçer).
class _Group extends StatelessWidget {
  const _Group({required this.title, required this.child, this.hint});
  final String title;
  final Widget child;
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
          children: [Text(title, style: _label), child],
        ),
        if (hint != null) Text(hint!, style: _hint),
      ],
    ),
  );
}

/// Roller gibi geniş içerik: başlık üstte, içerik altta.
class _Stack extends StatelessWidget {
  const _Stack({required this.title, required this.children, this.hint});
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
        Text(title, style: _label),
        ...children,
        if (hint != null) Text(hint!, style: _hint),
      ],
    ),
  );
}

/// `.ww-rolerow-icon`: 30'luk renkli kare içinde rol simgesi.
class _RoleIcon extends StatelessWidget {
  const _RoleIcon({required this.role, this.on = true});
  final Role role;
  final bool on;

  @override
  Widget build(BuildContext context) => Container(
    width: 30,
    height: 30,
    alignment: Alignment.center,
    decoration: BoxDecoration(
      color: on ? roleColor(role) : C.panel2,
      border: Border.all(color: C.ink, width: 2),
      borderRadius: BorderRadius.circular(9),
    ),
    child: RoleGlyph(role, size: 18, color: on ? C.ink2 : C.text3),
  );
}

BoxDecoration get _rowBox => BoxDecoration(color: C.panel, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(12));

/// `.ww-rolerow` (kurt: sayaçlı; köylü: kalan yer sayısı).
class _RoleRow extends StatelessWidget {
  const _RoleRow({required this.role, required this.name, this.trailing, this.off = false});
  final Role role;
  final String name;
  final Widget? trailing;
  final bool off;

  @override
  Widget build(BuildContext context) => Container(
    constraints: const BoxConstraints(minHeight: 48),
    padding: const EdgeInsets.symmetric(horizontal: 12),
    decoration: _rowBox,
    child: Row(
      children: [
        _RoleIcon(role: role),
        const SizedBox(width: 10),
        Expanded(child: Text(name, style: T.b(15, color: off ? C.red : C.text, weight: FontWeight.w800))),
        if (trailing != null) ...[const SizedBox(width: 10), trailing!],
      ],
    ),
  );
}

/// `.ww-rolerow-toggle`: aç/kapa rol satırı.
class _RoleToggle extends StatelessWidget {
  const _RoleToggle({required this.role, required this.on, this.onTap});
  final Role role;
  final bool on;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => Pressable(
    onTap: onTap,
    label: S.role[role],
    selected: on,
    builder: (context, _) => Container(
      constraints: const BoxConstraints(minHeight: 48),
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: _rowBox,
      child: Row(
        children: [
          _RoleIcon(role: role, on: on),
          const SizedBox(width: 10),
          Expanded(child: Text(S.role[role]!, style: T.b(15, color: on ? C.text : C.text3, weight: FontWeight.w800))),
          const SizedBox(width: 10),
          ToggleKnob(on: on),
        ],
      ),
    ),
  );
}

/// `.ww-stepper`: − sayı +
class _Stepper extends StatelessWidget {
  const _Stepper({required this.value, this.onLess, this.onMore});
  final int value;
  final VoidCallback? onLess;
  final VoidCallback? onMore;

  Widget _btn(String text, String label, VoidCallback? onTap) => Opacity(
    opacity: onTap == null ? 0.35 : 1,
    child: Pressable(
      onTap: onTap,
      label: label,
      builder: (context, _) => Container(
        width: 44,
        height: 36,
        alignment: Alignment.center,
        decoration: BoxDecoration(color: C.panel2, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(10)),
        child: Text(text, style: T.d(20, color: C.text)),
      ),
    ),
  );

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      _btn('−', SSettings.less(S.role['wolf']!), onLess),
      const SizedBox(width: 4),
      Container(
        constraints: const BoxConstraints(minWidth: 34),
        padding: const EdgeInsets.symmetric(vertical: 4),
        decoration: BoxDecoration(color: C.yellow, borderRadius: BorderRadius.circular(8)),
        child: Text('$value', style: T.d(17, color: C.ink2, height: 1.45), textAlign: TextAlign.center),
      ),
      const SizedBox(width: 4),
      _btn('+', SSettings.more(S.role['wolf']!), onMore),
    ],
  );
}

/// `.btn.btn-outline.btn-block.ww-rec`: 44 yükseklik, r12, 0 3 gölge, 15px; uzun metin alt satıra geçer.
class _RecButton extends StatelessWidget {
  const _RecButton({required this.label, this.onPressed});
  final String label;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) => Opacity(
    opacity: onPressed == null ? 0.5 : 1,
    child: Pressable(
      onTap: onPressed,
      label: label,
      builder: (context, pressed) => AnimatedContainer(
        duration: const Duration(milliseconds: 80),
        transform: Matrix4.translationValues(0, pressed ? 3 : 0, 0),
        constraints: const BoxConstraints(minHeight: 44, minWidth: double.infinity),
        padding: const EdgeInsets.symmetric(horizontal: 18),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: C.panel,
          border: Border.all(color: C.ink, width: bw),
          borderRadius: BorderRadius.circular(12),
          boxShadow: hardShadow(0, pressed ? 1 : 3),
        ),
        child: Text(label, style: T.d(15, color: C.text), textAlign: TextAlign.center),
      ),
    ),
  );
}
