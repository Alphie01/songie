import 'package:flutter/material.dart';

import '../../session/api.dart';
import '../../shared/models.dart';
import '../../ui/icons.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/game_module.dart';
import '../kit/kit.dart';
import 'common.dart';
import 'models.dart';
import 'strings.dart';

/// `.cf-legend` / `.cf-set-label` (14px, 700, text-2).
final _label = T.b(14, color: C.text2, weight: FontWeight.w700);

/// games/confessions/client/SettingsPanel.tsx
class ConfessionsSettingsPanel extends StatefulWidget {
  const ConfessionsSettingsPanel({super.key, required this.props});
  final SettingsPanelProps props;

  @override
  State<ConfessionsSettingsPanel> createState() => _ConfessionsSettingsPanelState();
}

class _ConfessionsSettingsPanelState extends State<ConfessionsSettingsPanel> {
  List<CategoryInfo>? _categories;

  @override
  void initState() {
    super.initState();
    if (widget.props.showPrimary) _load();
  }

  @override
  void didUpdateWidget(ConfessionsSettingsPanel old) {
    super.didUpdateWidget(old);
    if (!old.props.showPrimary && widget.props.showPrimary) _load();
  }

  Future<void> _load() async {
    try {
      final r = await widget.props.api.get('/categories');
      if (mounted) setState(() => _categories = r.objs('categories').map(CategoryInfo.fromJson).toList());
    } on ApiError {
      // kategori listesi gelmezse çipler boş kalır
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.props;
    final s = ConfessionsSettings.fromJson(p.settings);
    void set(ConfessionsSettings next) {
      if (p.editable) p.onChange(next.toJson());
    }

    Widget chips(List<Widget> children) => Wrap(alignment: WrapAlignment.end, spacing: 4, runSpacing: 4, children: children);

    final items = <Widget>[];
    if (p.showPrimary) {
      if (!p.editable) items.add(const ReadOnlyNote(SSettings.readOnly));
      items.add(
        SettingsGroup(
          title: SSettings.mode,
          legendStyle: _label,
          hint: SSettings.modeHint[s.mode],
          child: VStack(
            gap: 6,
            children: [
              for (final m in const ['topics', 'free'])
                SOption(
                  selected: s.mode == m,
                  onPressed: p.editable ? () => set(s.copyWith(mode: m)) : null,
                  trailing: s.mode == m ? const SIcon('check', size: 14, color: C.ink2) : null,
                  child: Text(m == 'topics' ? SSettings.modeTopics : SSettings.modeFree),
                ),
            ],
          ),
        ),
      );
      if (s.mode == 'topics') {
        final hint = [if (s.categories.any(isAdultCategory)) SSettings.cesurHint, if (s.categories.contains(coupleCategory)) SSettings.coupleHint].join(' ');
        items.add(
          SettingsGroup(
            title: SSettings.categories,
            legendStyle: _label,
            hint: hint.isEmpty ? null : hint,
            child: SChips(
              children: [
                for (final c in _categories ?? const <CategoryInfo>[])
                  SettingChip(
                    label: c.name,
                    count: '${c.count}',
                    adult: isAdultCategory(c.id),
                    selected: s.categories.contains(c.id),
                    onTap: p.editable
                        ? () {
                            final has = s.categories.contains(c.id);
                            final next = has ? s.categories.where((x) => x != c.id).toList() : [...s.categories, c.id];
                            if (next.isNotEmpty) set(s.copyWith(categories: next));
                          }
                        : null,
                  ),
              ],
            ),
          ),
        );
      }
      items.add(_AddPrompt(api: p.api, onAdded: _load));
    }
    if (p.showSecondary) {
      items.add(
        _Row(
          title: SSettings.write,
          child: chips([
            for (final n in writeOptions)
              SettingChip(
                label: n == 0 ? SSettings.untimed : SSettings.sec(n),
                selected: s.writeSeconds == n,
                onTap: p.editable ? () => set(s.copyWith(writeSeconds: n)) : null,
              ),
          ]),
        ),
      );
      items.add(
        _Row(
          title: SSettings.guess,
          child: chips([
            for (final n in guessOptions)
              SettingChip(
                label: SSettings.sec(n),
                selected: s.guessSeconds == n,
                onTap: p.editable ? () => set(s.copyWith(guessSeconds: n)) : null,
              ),
          ]),
        ),
      );
      items.add(
        _Row(
          title: SSettings.rounds,
          hint: SSettings.roundsHint(s.rounds),
          child: chips([
            for (final n in roundOptions)
              SettingChip(
                label: n == 0 ? SSettings.unlimited : '$n',
                selected: s.rounds == n,
                onTap: p.editable ? () => set(s.copyWith(rounds: n)) : null,
              ),
          ]),
        ),
      );
      items.add(
        _Row(
          title: SSettings.hidden,
          hint: SSettings.hiddenHint,
          child: RowToggle(
            on: s.hiddenAuthor,
            label: SSettings.hidden,
            onTap: p.editable ? () => set(s.copyWith(hiddenAuthor: !s.hiddenAuthor)) : null,
          ),
        ),
      );
    }
    // `.sgs`: ızgara, aralık 22.
    return VStack(gap: 22, children: items);
  }
}

/// `.cf-set-row`: solda ad, sağda küçük seçenekler (sığmazsa alta kayar); ipucu tam satır.
class _Row extends StatelessWidget {
  const _Row({required this.title, required this.child, this.hint});
  final String title;
  final Widget child;
  final String? hint;

  @override
  Widget build(BuildContext context) => Semantics(
    container: true,
    label: title,
    child: VStack(
      gap: 8,
      children: [
        Wrap(
          alignment: WrapAlignment.spaceBetween,
          crossAxisAlignment: WrapCrossAlignment.center,
          spacing: 8,
          runSpacing: 8,
          children: [
            Text(title, style: _label),
            child,
          ],
        ),
        if (hint != null) Text(hint!, style: SettingsGroup.defaultHint()),
      ],
    ),
  );
}

/// Her oyuncu konu ekleyebilir; konular sürpriz kalsın diye listelenmez.
class _AddPrompt extends StatefulWidget {
  const _AddPrompt({required this.api, required this.onAdded});
  final GameApi api;
  final VoidCallback onAdded;

  @override
  State<_AddPrompt> createState() => _AddPromptState();
}

class _AddPromptState extends State<_AddPrompt> {
  bool _open = false;
  bool _busy = false;
  final _text = TextEditingController();
  (String, bool)? _msg;

  @override
  void initState() {
    super.initState();
    _text.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _msg = null;
    });
    try {
      await widget.api.post('/prompts', {'text': _text.text});
      if (!mounted) return;
      setState(() {
        _msg = (SSettings.saved, false);
        _text.clear();
      });
      widget.onAdded();
    } on ApiError catch (e) {
      if (mounted) setState(() => _msg = (e.message, true));
    } on Object {
      if (mounted) setState(() => _msg = (SSettings.saveFailed, true));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final canSave = !_busy && _text.text.trim().length >= promptMin;
    return SettingsGroup(
      title: SSettings.addPrompt,
      legendStyle: _label,
      hint: SSettings.addPromptHint,
      child: VStack(
        gap: 8,
        children: [
          BrowseToggle(label: SSettings.addPrompt, open: _open, onTap: () => setState(() => _open = !_open)),
          if (_open)
            VStack(
              gap: 8,
              children: [
                Semantics(
                  label: SSettings.addPrompt,
                  child: SInput(
                    controller: _text,
                    placeholder: SSettings.promptPlaceholder,
                    maxLength: promptMax,
                    onSubmitted: (_) => canSave ? _submit() : null,
                  ),
                ),
                SButton(label: _busy ? SSettings.saving : SSettings.save, tone: BtnTone.outline, block: true, onPressed: canSave ? _submit : null),
                if (_msg != null) _msg!.$2 ? ErrorText(_msg!.$1) : Text(_msg!.$1, style: SettingsGroup.defaultHint()),
              ],
            ),
        ],
      ),
    );
  }
}
