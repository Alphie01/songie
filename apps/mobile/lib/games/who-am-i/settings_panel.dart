import 'package:flutter/material.dart';

import '../../session/api.dart';
import '../../shared/models.dart';
import '../../ui/widgets.dart';
import '../kit/game_module.dart';
import '../kit/kit.dart';
import 'models.dart';
import 'strings.dart';

/// `.sgs-legend.wa-legend`: cümle düzeninde başlık (14px, 700, text-2), altında 8px.
Widget _group(String title, Widget child, {String? hint}) =>
    SettingsGroup(title: title, legendStyle: SettingsGroup.plainLegend(), legendGap: 8, hint: hint, child: child);

/// games/who-am-i/client/SettingsPanel.tsx
class WhoAmISettingsPanel extends StatefulWidget {
  const WhoAmISettingsPanel({super.key, required this.props});
  final SettingsPanelProps props;

  @override
  State<WhoAmISettingsPanel> createState() => _WhoAmISettingsPanelState();
}

class _WhoAmISettingsPanelState extends State<WhoAmISettingsPanel> {
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
    final settings = WhoAmISettings.fromJson(p.settings);
    // Web: onChange({ ...settings, ...patch })
    void set(Json patch) {
      if (p.editable) p.onChange({...p.settings, ...patch});
    }

    final items = <Widget>[];
    if (p.showPrimary) {
      if (!p.editable) items.add(const ReadOnlyNote(SSettings.readOnly));
      items.add(
        _group(
          SSettings.categories,
          hint: SSettings.categoriesHint,
          SChips(
            children: [
              for (final c in _categories ?? const <CategoryInfo>[])
                SettingChip(
                  label: c.name,
                  count: '${c.count}',
                  selected: settings.categories.contains(c.id),
                  onTap: p.editable
                      ? () {
                          final has = settings.categories.contains(c.id);
                          final next = has ? settings.categories.where((x) => x != c.id).toList() : [...settings.categories, c.id];
                          if (next.isNotEmpty) set({'categories': next});
                        }
                      : null,
                ),
            ],
          ),
        ),
      );
      items.add(_AddCard(api: p.api));
    }
    if (p.showSecondary) {
      items.add(
        _group(
          SSettings.turnMode,
          hint: settings.turnMode == 'classic' ? SSettings.classicHint : SSettings.threeHint,
          VStack(
            gap: 6,
            children: [
              for (final m in turnModes)
                SOption(
                  selected: settings.turnMode == m,
                  onPressed: p.editable ? () => set({'turnMode': m}) : null,
                  child: Text(m == 'classic' ? SSettings.classic : SSettings.three),
                ),
            ],
          ),
        ),
      );
      items.add(
        _group(
          SSettings.verify,
          hint: settings.groupVerify ? SSettings.groupHint : SSettings.autoHint,
          VStack(
            gap: 6,
            children: [
              for (final g in const [false, true])
                SOption(
                  selected: settings.groupVerify == g,
                  onPressed: p.editable ? () => set({'groupVerify': g}) : null,
                  child: Text(g ? SSettings.group : SSettings.auto),
                ),
            ],
          ),
        ),
      );
      items.add(
        _group(
          SSettings.hints,
          hint: SSettings.hintsHint(settings.hints),
          SChips(
            children: [
              for (final n in hintOptions)
                SettingChip(label: '$n', selected: settings.hints == n, onTap: p.editable ? () => set({'hints': n}) : null),
            ],
          ),
        ),
      );
      items.add(
        _group(
          SSettings.typed,
          hint: SSettings.typedHint,
          SToggle(
            label: settings.typedQuestions ? SSettings.on : SSettings.off,
            value: settings.typedQuestions,
            onChanged: p.editable ? (_) => set({'typedQuestions': !settings.typedQuestions}) : null,
          ),
        ),
      );
    }
    // `.sgs`: grid, gap 22
    return VStack(gap: 22, children: items);
  }
}

/// Herkes kimlik ekleyebilir; eklenenler hiçbir ekranda listelenmez (sürpriz bozulmasın).
class _AddCard extends StatefulWidget {
  const _AddCard({required this.api});
  final GameApi api;

  @override
  State<_AddCard> createState() => _AddCardState();
}

class _AddCardState extends State<_AddCard> {
  bool _open = false;
  bool _busy = false;
  final _name = TextEditingController();
  final _aliases = TextEditingController();
  (String, bool)? _msg;

  @override
  void initState() {
    super.initState();
    _name.addListener(_changed);
  }

  void _changed() => setState(() {});

  @override
  void dispose() {
    _name.dispose();
    _aliases.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _msg = null;
    });
    try {
      final list = _aliases.text.split(',').map((a) => a.trim()).where((a) => a.isNotEmpty).toList();
      await widget.api.post('/cards', {'name': _name.text, 'aliases': list});
      if (!mounted) return;
      setState(() {
        _msg = (SSettings.saved(_name.text.trim()), false);
        _name.clear();
        _aliases.clear();
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
    final canSave = !_busy && _name.text.trim().length >= 2;
    return _group(
      SSettings.add,
      hint: SSettings.addHint,
      VStack(
        gap: 8,
        children: [
          BrowseToggle(label: SSettings.add, open: _open, onTap: () => setState(() => _open = !_open)),
          if (_open)
            // `.wa-addcard`: grid, gap 6; kutular 44px, 16px yazı
            VStack(
              gap: 6,
              children: [
                Semantics(
                  label: SSettings.addName,
                  child: SInput(
                    controller: _name,
                    placeholder: SSettings.addName,
                    maxLength: 40,
                    minHeight: 44,
                    fontSize: 16,
                    onSubmitted: (_) => canSave ? _submit() : null,
                  ),
                ),
                Semantics(
                  label: SSettings.addAliases,
                  child: SInput(
                    controller: _aliases,
                    placeholder: SSettings.addAliases,
                    maxLength: 200,
                    minHeight: 44,
                    fontSize: 16,
                    textCapitalization: TextCapitalization.none,
                    onSubmitted: (_) => canSave ? _submit() : null,
                  ),
                ),
                SButton(label: _busy ? SSettings.saving : SSettings.save, tone: BtnTone.outline, block: true, onPressed: canSave ? _submit : null),
                if (_msg != null)
                  Semantics(
                    liveRegion: true,
                    child: _msg!.$2 ? ErrorText(_msg!.$1) : Text(_msg!.$1, style: SettingsGroup.defaultHint()),
                  ),
              ],
            ),
        ],
      ),
    );
  }
}
