import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../session/api.dart';
import '../../shared/models.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/game_module.dart';
import '../kit/kit.dart';
import 'common.dart';
import 'models.dart';
import 'strings.dart';

/// `.rf-legend` / `.rf-set-label` (14px, 700, text-2).
final _label = T.b(14, color: C.text2, weight: FontWeight.w700);

/// games/red-flag/client/SettingsPanel.tsx
class RedFlagSettingsPanel extends StatefulWidget {
  const RedFlagSettingsPanel({super.key, required this.props});
  final SettingsPanelProps props;

  @override
  State<RedFlagSettingsPanel> createState() => _RedFlagSettingsPanelState();
}

class _RedFlagSettingsPanelState extends State<RedFlagSettingsPanel> {
  List<CategoryInfo>? _categories;

  @override
  void initState() {
    super.initState();
    if (widget.props.showPrimary) _load();
  }

  @override
  void didUpdateWidget(RedFlagSettingsPanel old) {
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
    final s = RedFlagSettings.fromJson(p.settings);
    void set(RedFlagSettings next) {
      if (p.editable) p.onChange(next.toJson());
    }

    Widget chips(List<Widget> children) => Wrap(alignment: WrapAlignment.end, spacing: 4, runSpacing: 4, children: children);

    final items = <Widget>[];
    if (p.showPrimary) {
      if (!p.editable) items.add(const ReadOnlyNote(SSettings.readOnly));
      final cats = _categories ?? const <CategoryInfo>[];
      final adultNames = [
        for (final c in cats)
          if (adultCategoryIds.contains(c.id) && s.categories.contains(c.id)) c.name,
      ];
      items.add(
        SettingsGroup(
          title: SSettings.categories,
          legendStyle: _label,
          hint: SSettings.categoriesHint,
          child: VStack(
            children: [
              SChips(
                children: [
                  for (final c in cats)
                    RfChip(
                      label: c.name,
                      count: '${c.count}',
                      adult: adultCategoryIds.contains(c.id),
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
              // `.rf-adult`: margin-top 8 + ızgara aralığı 8.
              if (adultNames.isNotEmpty)
                Container(
                  margin: const EdgeInsets.only(top: 16),
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  decoration: BoxDecoration(
                    border: Border.all(color: C.red, width: 2),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    SSettings.adultWarning(adultNames.join(', ')),
                    style: T.b(13, color: C.text, weight: FontWeight.w800, height: 1.4),
                  ),
                ),
            ],
          ),
        ),
      );
      items.add(_AddItem(api: p.api));
    }
    if (p.showSecondary) {
      items.add(
        _Row(
          title: SSettings.dealBreaker,
          hint: SSettings.dealBreakerHint,
          child: RowToggle(
            on: s.dealBreaker,
            label: SSettings.dealBreaker,
            onTap: p.editable ? () => set(s.copyWith(dealBreaker: !s.dealBreaker)) : null,
          ),
        ),
      );
      items.add(
        _Row(
          title: SSettings.names,
          hint: SSettings.namesHint(s.anonymous),
          child: chips([
            RfChip(label: SSettings.open, selected: !s.anonymous, onTap: p.editable ? () => set(s.copyWith(anonymous: false)) : null),
            RfChip(label: SSettings.anonymous, selected: s.anonymous, onTap: p.editable ? () => set(s.copyWith(anonymous: true)) : null),
          ]),
        ),
      );
      items.add(
        _Row(
          title: SSettings.predict,
          hint: SSettings.predictHint,
          child: RowToggle(
            on: s.predict,
            label: SSettings.predict,
            onTap: p.editable ? () => set(s.copyWith(predict: !s.predict)) : null,
          ),
        ),
      );
      items.add(
        _Row(
          title: SSettings.seconds,
          hint: SSettings.secondsHint(s.seconds),
          child: chips([
            for (final n in secondsOptions)
              RfChip(
                label: SSettings.sec(n),
                selected: s.seconds == n,
                onTap: p.editable ? () => set(s.copyWith(seconds: n)) : null,
              ),
          ]),
        ),
      );
      items.add(
        _Row(
          title: SSettings.discuss,
          hint: SSettings.discussHint(s.discuss),
          child: chips([
            for (final n in discussOptions)
              RfChip(
                label: SSettings.sec(n),
                selected: s.discuss == n,
                onTap: p.editable ? () => set(s.copyWith(discuss: n)) : null,
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
              RfChip(
                label: n == 0 ? SSettings.unlimited : '$n',
                selected: s.rounds == n,
                onTap: p.editable ? () => set(s.copyWith(rounds: n)) : null,
              ),
          ]),
        ),
      );
    }
    // `.sgs`: ızgara, aralık 22.
    return VStack(gap: 22, children: items);
  }
}

/// `.rf-set-row`: solda ad, sağda seçenekler (sığmazsa alta kayar); ipucu tam satır.
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

/// Her oyuncu durum ekleyebilir; eklenenler hiçbir ekranda listelenmez.
class _AddItem extends StatefulWidget {
  const _AddItem({required this.api});
  final GameApi api;

  @override
  State<_AddItem> createState() => _AddItemState();
}

class _AddItemState extends State<_AddItem> {
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
      await widget.api.post('/items', {'text': _text.text});
      if (!mounted) return;
      setState(() {
        _msg = (SSettings.addSaved, false);
        _text.clear();
      });
    } on ApiError catch (e) {
      if (mounted) setState(() => _msg = (e.message.isNotEmpty ? e.message : SSettings.addFailed, true));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final len = _text.text.trim().length;
    final canSave = !_busy && len >= 10;
    // `.input.rf-add-text`: Baloo 16/700, satır 1.3, 3 satır.
    final style = const TextStyle(
      fontFamily: T.display,
      fontWeight: FontWeight.w700,
      fontSize: 16,
      height: 1.3,
      color: C.ink2,
      leadingDistribution: TextLeadingDistribution.even,
    );
    // `.mono.dim.rf-small`: Baloo 2, 13px, rakamlar eşit genişlikte.
    final counter = T.d(13, color: C.text3, weight: FontWeight.w600, height: 1.45).copyWith(fontFeatures: const [FontFeature.tabularFigures()]);
    return SettingsGroup(
      title: SSettings.add,
      legendStyle: _label,
      hint: SSettings.addHint,
      child: VStack(
        gap: 8,
        children: [
          BrowseToggle(label: SSettings.add, open: _open, onTap: () => setState(() => _open = !_open)),
          if (_open)
            VStack(
              gap: 8,
              children: [
                FocusRing(
                  focused: _focused,
                  radius: R.md,
                  child: Container(
                    constraints: const BoxConstraints(minHeight: 84),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    decoration: BoxDecoration(
                      color: C.paper,
                      border: Border.all(color: C.ink, width: bw),
                      borderRadius: BorderRadius.circular(R.md),
                    ),
                    child: Semantics(
                      label: SSettings.add,
                      child: TextField(
                        controller: _text,
                        focusNode: _focus,
                        maxLength: 160,
                        maxLengthEnforcement: MaxLengthEnforcement.enforced,
                        minLines: 3,
                        maxLines: 3,
                        keyboardType: TextInputType.multiline,
                        textCapitalization: TextCapitalization.sentences,
                        cursorColor: C.ink2,
                        style: style,
                        decoration: InputDecoration(
                          isCollapsed: true,
                          border: InputBorder.none,
                          counterText: '',
                          hintText: SSettings.addPlaceholder,
                          hintMaxLines: 3,
                          hintStyle: style.copyWith(color: C.placeholder),
                        ),
                      ),
                    ),
                  ),
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('$len/160', style: counter),
                    const SizedBox(width: 8),
                    Flexible(
                      child: SButton(label: _busy ? SSettings.addSaving : SSettings.addSave, tone: BtnTone.outline, onPressed: canSave ? _submit : null),
                    ),
                  ],
                ),
                if (_msg != null) _msg!.$2 ? ErrorText(_msg!.$1) : Text(_msg!.$1, style: SettingsGroup.defaultHint()),
              ],
            ),
        ],
      ),
    );
  }
}
