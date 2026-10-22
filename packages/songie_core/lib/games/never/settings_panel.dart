import 'package:flutter/material.dart';

import '../../session/api.dart';
import '../../shared/models.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/game_module.dart';
import '../kit/kit.dart';
import 'models.dart';
import 'strings.dart';

/// `.nv-set` başlık ve ipucu stili.
final _legend = T.b(14, color: C.text2, weight: FontWeight.w700);
final _hint = T.b(12.5, color: C.text3);

Widget _group(String title, Widget child, {String? hint}) =>
    SettingsGroup(title: title, legendStyle: _legend, legendGap: 6, hint: hint, hintStyle: _hint, child: child);

/// games/never/client/SettingsPanel.tsx
class NeverSettingsPanel extends StatefulWidget {
  const NeverSettingsPanel({super.key, required this.props});
  final SettingsPanelProps props;

  @override
  State<NeverSettingsPanel> createState() => _NeverSettingsPanelState();
}

class _NeverSettingsPanelState extends State<NeverSettingsPanel> {
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
      // kategori listesi gelmezse çipler boş kalır
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.props;
    final settings = NeverSettings.fromJson(p.settings);
    void set(NeverSettings next) {
      if (p.editable) p.onChange(next.toJson());
    }

    final items = <Widget>[];
    if (p.showPrimary) {
      if (!p.editable) items.add(const ReadOnlyNote(SSettings.readOnly, dashed: true));
      final adult = settings.categories.any(isAdultCategory);
      items.add(
        _group(
          SSettings.categories,
          hint: adult
              ? SSettings.adultHint + (settings.categories.contains(coupleCategory) ? ' ${SSettings.coupleHint}' : '')
              : SSettings.categoriesHint,
          SChips(
            children: [
              for (final c in _categories ?? const <CategoryInfo>[])
                SettingChip(
                  label: c.name,
                  count: '${c.count}',
                  adult: isAdultCategory(c.id),
                  selected: settings.categories.contains(c.id),
                  onTap: p.editable
                      ? () {
                          final has = settings.categories.contains(c.id);
                          final next = has ? settings.categories.where((x) => x != c.id).toList() : [...settings.categories, c.id];
                          if (next.isNotEmpty) set(settings.copyWith(categories: next));
                        }
                      : null,
                ),
            ],
          ),
        ),
      );
      items.add(
        _group(
          SSettings.lives,
          hint: SSettings.livesHint(settings.lives),
          SChips(
            children: [
              for (final n in livesOptions)
                SettingChip(
                  label: n == 0 ? SSettings.off : '$n',
                  selected: settings.lives == n,
                  onTap: p.editable ? () => set(n > 0 ? settings.copyWith(lives: n, anonymous: false) : settings.copyWith(lives: 0)) : null,
                ),
            ],
          ),
        ),
      );
      items.add(
        _group(
          SSettings.anonymous,
          hint: SSettings.anonymousHint,
          SToggle(
            label: settings.anonymous ? SSettings.on : SSettings.off,
            value: settings.anonymous,
            onChanged: p.editable
                ? (_) => set(settings.anonymous ? settings.copyWith(anonymous: false) : settings.copyWith(anonymous: true, lives: 0))
                : null,
          ),
        ),
      );
    }
    if (p.showSecondary) {
      items.add(
        _group(
          SSettings.seconds,
          hint: SSettings.secondsHint(settings.seconds),
          SChips(
            children: [
              for (final n in secondsOptions)
                SettingChip(
                  label: SSettings.secondsOpt(n),
                  selected: settings.seconds == n,
                  onTap: p.editable ? () => set(settings.copyWith(seconds: n)) : null,
                ),
            ],
          ),
        ),
      );
      items.add(
        _group(
          SSettings.rounds,
          hint: settings.rounds == 0 ? SSettings.unlimitedHint : null,
          SChips(
            children: [
              for (final n in roundOptions)
                SettingChip(
                  label: SSettings.roundsOpt(n),
                  selected: settings.rounds == n,
                  onTap: p.editable ? () => set(settings.copyWith(rounds: n)) : null,
                ),
            ],
          ),
        ),
      );
      items.add(_AddStatement(api: p.api));
    }
    return VStack(gap: 16, children: items);
  }
}

/// Herkes cümle ekleyebilir; "Ben hiç" sabit, oyuncu devamını yazar.
class _AddStatement extends StatefulWidget {
  const _AddStatement({required this.api});
  final GameApi api;

  @override
  State<_AddStatement> createState() => _AddStatementState();
}

class _AddStatementState extends State<_AddStatement> {
  bool _open = false;
  bool _busy = false;
  final _text = TextEditingController();
  final _focus = FocusNode();
  bool _focused = false;
  (String, bool)? _msg;

  @override
  void initState() {
    super.initState();
    _text.addListener(() => setState(() {}));
    _focus.addListener(() => setState(() => _focused = _focus.hasFocus));
  }

  @override
  void dispose() {
    _text.dispose();
    _focus.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _msg = null;
    });
    try {
      final res = await widget.api.post('/statements', {'text': _text.text});
      if (!mounted) return;
      setState(() {
        _msg = (SSettings.saved(res.str('text')), false);
        _text.clear();
      });
    } on ApiError catch (e) {
      if (mounted) setState(() => _msg = (e.message.isNotEmpty ? e.message : SSettings.saveFailed, true));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final canSave = !_busy && _text.text.trim().length >= 5;
    return _group(
      SSettings.addTitle,
      hint: SSettings.addHint,
      VStack(
        gap: 8,
        children: [
          BrowseToggle(label: SSettings.addOpen, open: _open, onTap: () => setState(() => _open = !_open)),
          if (_open) ...[
            FocusRing(
              focused: _focused,
              radius: 14,
              child: Container(
                clipBehavior: Clip.antiAlias,
                decoration: BoxDecoration(color: C.paper, border: Border.all(color: C.ink, width: bw), borderRadius: BorderRadius.circular(14)),
                child: Row(
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(left: 12, right: 4),
                      child: Text(SSettings.prefix, style: T.d(16, color: C.ink2)),
                    ),
                    Expanded(
                      child: Semantics(
                        label: '${SSettings.prefix}…',
                        child: SInput(
                          controller: _text,
                          focusNode: _focus,
                          placeholder: SSettings.placeholder,
                          maxLength: 120,
                          minHeight: 44,
                          fontSize: 16,
                          borderWidth: 0,
                          radius: 0,
                          focusColor: Colors.transparent,
                          padding: const EdgeInsets.only(right: 16),
                          textCapitalization: TextCapitalization.none,
                          onSubmitted: (_) => canSave ? _submit() : null,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            SButton(label: _busy ? SSettings.saving : SSettings.save, tone: BtnTone.yellow, block: true, onPressed: canSave ? _submit : null),
            if (_msg != null)
              Text(
                _msg!.$1,
                style: _msg!.$2 ? T.b(14, color: C.errorOnDark, weight: FontWeight.w800) : _hint,
              ),
          ],
        ],
      ),
    );
  }
}
