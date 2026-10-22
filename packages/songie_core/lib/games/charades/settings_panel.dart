import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../session/api.dart';
import '../../shared/models.dart';
import '../../ui/icons.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/game_module.dart';
import '../kit/kit.dart';
import 'kind_icon.dart';
import 'models.dart';
import 'strings.dart';

Color teamColor(String team) => team == 'a' ? C.mint : C.lilac;

/// `.ch-set-label`: 14px, 700, text-2.
final _label = T.b(14, color: C.text2, weight: FontWeight.w700);

/// `.ch-set-hint`: 12px, 600, satır 1.4, text-3.
final chHint = T.b(12, color: C.text3, height: 1.4);

/// games/charades/client/SettingsPanel.tsx
class CharadesSettingsPanel extends StatefulWidget {
  const CharadesSettingsPanel({super.key, required this.props});
  final SettingsPanelProps props;

  @override
  State<CharadesSettingsPanel> createState() => _CharadesSettingsPanelState();
}

class _CharadesSettingsPanelState extends State<CharadesSettingsPanel> {
  List<CategoryInfo>? _categories;

  @override
  void initState() {
    super.initState();
    if (widget.props.showPrimary) _load();
  }

  Future<void> _load() async {
    try {
      final r = await widget.props.api.get('/categories');
      if (mounted) setState(() => _categories = r.objs('categories').map(CategoryInfo.fromJson).toList());
    } on ApiError {
      // liste gelmezse çipler boş kalır (web'deki gibi)
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.props;
    final settings = CharadesSettings.fromJson(p.settings);
    // Web: onChange({ ...settings, ...patch })
    void set(Json patch) {
      if (p.editable) p.onChange({...p.settings, ...patch});
    }

    final present = {for (final pl in p.players) pl.id};
    final teamA = settings.teamA.where(present.contains).toList();
    final teamB = settings.teamB.where((id) => present.contains(id) && !teamA.contains(id)).toList();
    final unassigned = [
      for (final pl in p.players)
        if (!teamA.contains(pl.id) && !teamB.contains(pl.id)) pl.id,
    ];
    final byId = {for (final pl in p.players) pl.id: pl};

    /// Takımsız, yeşil, mor, takımsız döngüsü.
    void cycle(String id) {
      final inA = teamA.contains(id);
      final inB = teamB.contains(id);
      final a = teamA.where((x) => x != id).toList();
      final b = teamB.where((x) => x != id).toList();
      if (!inA && !inB) {
        a.add(id);
      } else if (inA) {
        b.add(id);
      }
      set({
        'teams': {'a': a, 'b': b},
      });
    }

    void shuffleTeams() {
      final ids = [for (final pl in p.players) pl.id]..shuffle();
      final half = (ids.length / 2).ceil();
      set({
        'teams': {'a': ids.sublist(0, half), 'b': ids.sublist(half)},
      });
    }

    Widget teamBox(String? team, List<String> ids) {
      final none = team == null;
      final fg = none ? C.text : C.ink2;
      final content = VStack(
        gap: 2,
        children: [
          Padding(
            padding: const EdgeInsets.only(bottom: 2),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Flexible(child: Text(none ? SSettings.unassigned : S.team[team]!, style: T.d(16, color: fg, height: 1.45))),
                const SizedBox(width: 6),
                Opacity(opacity: 0.7, child: Text('${ids.length}', style: T.b(12, color: fg, weight: FontWeight.w800))),
              ],
            ),
          ),
          if (ids.isEmpty)
            Opacity(opacity: 0.7, child: Text(SSettings.empty, style: T.b(13, color: fg, weight: FontWeight.w700)))
          else
            for (final id in ids)
              if (byId[id] case final pl?)
                Pressable(
                  onTap: p.editable ? () => cycle(id) : null,
                  label: pl.nick,
                  builder: (context, _) => Container(
                    constraints: const BoxConstraints(minHeight: 34),
                    child: Row(
                      children: [
                        SAvatar(avatar: pl.avatar, nick: pl.nick, size: 26),
                        const SizedBox(width: 6),
                        Flexible(
                          child: Text(pl.nick, style: T.b(14, color: fg, weight: FontWeight.w800), maxLines: 1, softWrap: false, overflow: TextOverflow.ellipsis),
                        ),
                      ],
                    ),
                  ),
                ),
        ],
      );
      if (none) return ChDashed(radius: 18, padding: const EdgeInsets.all(10), child: content);
      return Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(color: teamColor(team), border: Border.all(color: C.ink, width: bw), borderRadius: BorderRadius.circular(18)),
        child: content,
      );
    }

    final items = <Widget>[];
    if (p.showPrimary) {
      if (!p.editable) items.add(Text(SSettings.readOnly, style: T.b(13, color: C.text3, weight: FontWeight.w700)));
      items.add(
        _Group(
          title: SSettings.teams,
          action: p.editable ? _SmallButton(label: SSettings.shuffle, onTap: shuffleTeams) : null,
          hint: teamA.length < 2 || teamB.length < 2 ? '${SSettings.needTwo} ${SSettings.teamsHint}' : SSettings.teamsHint,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Grid2(columnGap: 10, equalHeight: true, children: [teamBox('a', teamA), teamBox('b', teamB)]),
              if (unassigned.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 8), child: teamBox(null, unassigned)),
            ],
          ),
        ),
      );
      items.add(
        _Group(
          title: SSettings.categories,
          hint: settings.categories.any(isAdultCategory) ? SSettings.adultHint : null,
          child: SChips(
            children: [
              for (final c in _categories ?? const <CategoryInfo>[])
                Builder(
                  builder: (context) {
                    final selected = settings.categories.contains(c.id);
                    return KindChip(
                      label: c.name,
                      kind: categoryKind[c.id],
                      count: '${c.count}',
                      adult: isAdultCategory(c.id),
                      selected: selected,
                      dim: !p.editable && !selected,
                      onTap: p.editable
                          ? () {
                              final next = selected ? settings.categories.where((x) => x != c.id).toList() : [...settings.categories, c.id];
                              if (next.isNotEmpty) set({'categories': next});
                            }
                          : null,
                    );
                  },
                ),
            ],
          ),
        ),
      );
      items.add(
        _RowGroup(
          title: SSettings.difficulty,
          hint: SSettings.difficultyHint[settings.difficulty],
          child: _RowChips(
            children: [
              for (final d in difficulties)
                _RowChip(
                  label: SSettings.difficultyName[d]!,
                  selected: settings.difficulty == d,
                  dim: !p.editable && settings.difficulty != d,
                  onTap: p.editable ? () => set({'difficulty': d}) : null,
                ),
            ],
          ),
        ),
      );
    }
    if (p.showSecondary) {
      items.add(
        _RowGroup(
          title: SSettings.seconds,
          child: _RowChips(
            children: [
              for (var i = 0; i < secondsOptions.length; i++)
                _RowChip(
                  label: i == secondsOptions.length - 1 ? SSettings.sec(secondsOptions[i]) : '${secondsOptions[i]}',
                  selected: settings.seconds == secondsOptions[i],
                  dim: !p.editable && settings.seconds != secondsOptions[i],
                  onTap: p.editable ? () => set({'seconds': secondsOptions[i]}) : null,
                ),
            ],
          ),
        ),
      );
      items.add(
        _RowGroup(
          title: SSettings.passes,
          child: _RowChips(
            children: [
              for (final n in passOptions)
                _RowChip(
                  label: n < 0 ? SSettings.unlimited : '$n',
                  selected: settings.passes == n,
                  dim: !p.editable && settings.passes != n,
                  onTap: p.editable ? () => set({'passes': n}) : null,
                ),
            ],
          ),
        ),
      );
      items.add(
        _RowGroup(
          title: SSettings.turns,
          hint: SSettings.turnsHint(settings.turns),
          child: _RowChips(
            children: [
              for (final n in turnOptions)
                _RowChip(
                  label: n == 0 ? SSettings.unlimited : '$n',
                  selected: settings.turns == n,
                  dim: !p.editable && settings.turns != n,
                  onTap: p.editable ? () => set({'turns': n}) : null,
                ),
            ],
          ),
        ),
      );
      items.add(
        _RowGroup(
          title: SSettings.penalty,
          hint: SSettings.penaltyHint,
          child: _RowToggle(
            label: settings.foulPenalty ? SSettings.on : SSettings.off,
            value: settings.foulPenalty,
            onTap: p.editable ? () => set({'foulPenalty': !settings.foulPenalty}) : null,
          ),
        ),
      );
      items.add(_AddTitle(api: p.api));
    }
    // `.ch-settings`: gap 12
    return VStack(gap: 12, children: items);
  }
}

/// `.ch-set`: başlık satırı (+ isteğe bağlı düğme), gövde, ipucu; aralık 8.
class _Group extends StatelessWidget {
  const _Group({required this.title, required this.child, this.hint, this.action});
  final String title;
  final Widget child;
  final String? hint;
  final Widget? action;

  @override
  Widget build(BuildContext context) => VStack(
    gap: 8,
    children: [
      Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Flexible(child: Text(title, style: _label)),
          if (action != null) ...[const SizedBox(width: 8), action!],
        ],
      ),
      child,
      if (hint != null) Text(hint!, style: chHint),
    ],
  );
}

/// `.ch-set[data-row]`: `grid-template-columns: minmax(0, 1fr) auto`, sütun 8, satır 4; ipucu tam satır.
class _RowGroup extends StatelessWidget {
  const _RowGroup({required this.title, required this.child, this.hint});
  final String title;
  final Widget child;
  final String? hint;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Row(
        children: [
          Expanded(child: Text(title, style: _label)),
          const SizedBox(width: 8),
          child,
        ],
      ),
      if (hint != null) ...[const SizedBox(height: 4), Text(hint!, style: chHint)],
    ],
  );
}

/// `.ch-set[data-row] .chips`: sağa yaslı, aralık 4.
class _RowChips extends StatelessWidget {
  const _RowChips({required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final out = <Widget>[];
    for (final c in children) {
      if (out.isNotEmpty) out.add(const SizedBox(width: 4));
      out.add(c);
    }
    return Row(mainAxisSize: MainAxisSize.min, children: out);
  }
}

/// `.ch-set[data-row] .chip`: 40px, 10px iç boşluk, r10, Nunito 13; salt okunurda seçili olmayan 0.6.
class _RowChip extends StatelessWidget {
  const _RowChip({required this.label, required this.selected, required this.dim, this.onTap});
  final String label;
  final bool selected;
  final bool dim;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => Opacity(
    opacity: dim ? 0.6 : 1,
    child: Pressable(
      onTap: onTap,
      label: label,
      selected: selected,
      builder: (context, _) => Container(
        constraints: const BoxConstraints(minHeight: 40),
        padding: const EdgeInsets.symmetric(horizontal: 10),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: selected ? C.yellow : C.panel,
          border: Border.all(color: C.ink, width: 2),
          borderRadius: BorderRadius.circular(10),
          boxShadow: selected ? hardShadow(0, 3) : null,
        ),
        child: Text(label, style: T.b(13, color: selected ? C.ink2 : C.text, weight: FontWeight.w800), maxLines: 1, softWrap: false),
      ),
    ),
  );
}

/// `.ch-set[data-row] .toggle`: kendi genişliğinde, Baloo 800; açıkken nane zemin.
class _RowToggle extends StatelessWidget {
  const _RowToggle({required this.label, required this.value, this.onTap});
  final String label;
  final bool value;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => Opacity(
    opacity: onTap == null ? 0.6 : 1,
    child: Pressable(
      onTap: onTap,
      label: label,
      selected: value,
      builder: (context, _) => Container(
        constraints: const BoxConstraints(minHeight: 44),
        padding: const EdgeInsets.only(left: 12, right: 8),
        decoration: BoxDecoration(
          color: value ? C.mint : C.panel,
          border: Border.all(color: C.ink, width: 2),
          borderRadius: BorderRadius.circular(R.sm),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(label, style: T.d(15, color: value ? C.ink2 : C.text2, height: 1.45)),
            const SizedBox(width: 8),
            ToggleKnob(on: value),
          ],
        ),
      ),
    ),
  );
}

/// `.chip.ch-kind-chip`: tür simgeli çip; +18 seçiliyken kırmızı; salt okunurda seçili olmayan 0.6.
class KindChip extends StatelessWidget {
  const KindChip({super.key, required this.label, required this.selected, this.kind, this.count, this.adult = false, this.dim = false, this.onTap});
  final String label;
  final bool selected;
  final String? kind;
  final String? count;
  final bool adult;
  final bool dim;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final red = adult && selected;
    final fg = selected ? C.ink2 : C.text;
    return Opacity(
      opacity: dim ? 0.6 : 1,
      child: Pressable(
        onTap: onTap,
        label: label,
        selected: selected,
        builder: (context, _) => Container(
          constraints: const BoxConstraints(minHeight: 44, minWidth: 48),
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: red ? C.red : (selected ? C.yellow : C.panel),
            border: Border.all(color: red ? C.red : C.ink, width: 2),
            borderRadius: BorderRadius.circular(12),
            boxShadow: selected ? hardShadow(0, 3) : null,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (kind != null) ...[KindIcon(kind: kind!, size: 14, color: fg), const SizedBox(width: 6)],
              Flexible(child: Text(label, style: T.d(15, color: fg), maxLines: 2)),
              if (count != null) ...[const SizedBox(width: 6), Opacity(opacity: 0.75, child: Text(count!, style: T.d(12, color: fg)))],
            ],
          ),
        ),
      ),
    );
  }
}

/// `.ch-shuffle`: küçük çerçeveli düğme (Karıştır, Başlık ekle).
class _SmallButton extends StatelessWidget {
  const _SmallButton({required this.label, required this.onTap, this.icon, this.selected});
  final String label;
  final VoidCallback onTap;
  final Widget? icon;
  final bool? selected;

  @override
  Widget build(BuildContext context) => Pressable(
    onTap: onTap,
    label: label,
    selected: selected,
    builder: (context, _) => Container(
      constraints: const BoxConstraints(minHeight: 44),
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(color: C.panel, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(10)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[icon!, const SizedBox(width: 6)],
          Text(label, style: T.b(13, color: C.text, weight: FontWeight.w800)),
        ],
      ),
    ),
  );
}

/// Her oyuncu başlık ekleyebilir; başlıklar hiçbir ekranda listelenmez (sürpriz bozulmasın).
class _AddTitle extends StatefulWidget {
  const _AddTitle({required this.api});
  final GameApi api;

  @override
  State<_AddTitle> createState() => _AddTitleState();
}

class _AddTitleState extends State<_AddTitle> {
  bool _open = false;
  bool _busy = false;
  String _kind = 'film';
  final _title = TextEditingController();
  (String, bool)? _msg;

  @override
  void initState() {
    super.initState();
    _title.addListener(_changed);
  }

  void _changed() => setState(() {});

  @override
  void dispose() {
    _title.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _msg = null;
    });
    try {
      await widget.api.post('/titles', {'title': _title.text, 'kind': _kind});
      if (!mounted) return;
      setState(() {
        _msg = (SSettings.saved(_title.text.trim()), false);
        _title.clear();
      });
    } on ApiError catch (e) {
      if (mounted) setState(() => _msg = (e.message, true));
    } catch (_) {
      if (mounted) setState(() => _msg = (SSettings.saveFailed, true));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final canSave = !_busy && _title.text.trim().length >= 2;
    return _Group(
      title: SSettings.addTitle,
      hint: SSettings.addTitleHint,
      // `.ch-set-body` blok: düğme ile form arasında boşluk yok.
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Align(
            alignment: Alignment.centerLeft,
            child: _SmallButton(
              icon: Transform.rotate(angle: _open ? math.pi : 0, child: const SIcon('chevron', size: 14, color: C.text)),
              label: SSettings.addTitle,
              selected: _open,
              onTap: () => setState(() => _open = !_open),
            ),
          ),
          if (_open)
            // `.ch-addtitle`: sütun, gap 8
            VStack(
              gap: 8,
              children: [
                Semantics(label: SSettings.titleLabel, child: SInput(controller: _title, placeholder: SSettings.titleLabel, maxLength: 80)),
                Semantics(
                  container: true,
                  label: SSettings.kindLabel,
                  child: SChips(
                    children: [
                      for (final k in kinds)
                        KindChip(
                          label: k == 'deyim' ? SSettings.deyimShort : S.kind[k]!,
                          kind: k,
                          selected: _kind == k,
                          onTap: () => setState(() => _kind = k),
                        ),
                    ],
                  ),
                ),
                SButton(label: _busy ? SSettings.saving : SSettings.save, tone: BtnTone.primary, block: true, onPressed: canSave ? _submit : null),
                if (_msg != null) Semantics(liveRegion: true, child: _msg!.$2 ? ErrorText(_msg!.$1) : Text(_msg!.$1, style: chHint)),
              ],
            ),
        ],
      ),
    );
  }
}

/// Kesikli çerçeveli kutu (CSS `border: 3px dashed var(--violet)`); zemin çerçevenin altında.
/// Chromium 3px ve üstü kesikli çizgide çizgi 2×, boşluk 1× kalınlık kullanır.
class ChDashed extends StatelessWidget {
  const ChDashed({super.key, required this.child, required this.radius, required this.padding, this.background});
  final Widget child;
  final double radius;
  final EdgeInsets padding;
  final Color? background;

  @override
  Widget build(BuildContext context) => CustomPaint(
    foregroundPainter: DashedRRectPainter(color: C.violet, radius: radius, strokeWidth: bw, dash: 6, gap: 3),
    child: Container(
      padding: padding + const EdgeInsets.all(bw),
      decoration: background == null ? null : BoxDecoration(color: background, borderRadius: BorderRadius.circular(radius)),
      child: child,
    ),
  );
}
