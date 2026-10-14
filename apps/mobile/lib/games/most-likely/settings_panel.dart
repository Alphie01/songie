import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../session/api.dart';
import '../../shared/models.dart';
import '../../ui/icons.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/game_module.dart';
import '../kit/kit.dart';
import 'models.dart';
import 'strings.dart';

/// `.ml-set-label` ve `.ml-set-hint`.
final _label = T.b(14, color: C.text2, weight: FontWeight.w700);
final _hint = T.b(12, color: C.text3, height: 1.4);

/// games/most-likely/client/SettingsPanel.tsx
class MostLikelySettingsPanel extends StatefulWidget {
  const MostLikelySettingsPanel({super.key, required this.props});
  final SettingsPanelProps props;

  @override
  State<MostLikelySettingsPanel> createState() => _MostLikelySettingsPanelState();
}

class _MostLikelySettingsPanelState extends State<MostLikelySettingsPanel> {
  List<CategoryInfo>? _categories;

  @override
  void initState() {
    super.initState();
    if (widget.props.showPrimary) _load();
  }

  @override
  void didUpdateWidget(MostLikelySettingsPanel old) {
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
    final s = MostLikelySettings.fromJson(p.settings);
    void set(MostLikelySettings next) {
      if (p.editable) p.onChange(next.toJson());
    }

    final items = <Widget>[];
    if (p.showPrimary) {
      if (!p.editable) items.add(Text(SSettings.readOnly, style: _hint));
      final cats = _categories ?? const <CategoryInfo>[];
      final adultNames = [
        for (final c in cats)
          if (adultCategoryIds.contains(c.id) && s.categories.contains(c.id)) c.name,
      ];
      items.add(
        _Group(
          title: SSettings.categories,
          hint: SSettings.categoriesHint,
          children: [
            SChips(
              children: [
                for (final c in cats)
                  _Chip(
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
            if (adultNames.isNotEmpty) _AdultWarning(SSettings.adultWarning(adultNames.join(', '))),
          ],
        ),
      );
      items.add(
        _Group(
          row: true,
          title: SSettings.rounds,
          hint: SSettings.roundsHint(s.rounds),
          children: [
            SChips(
              children: [
                for (final n in roundOptions)
                  _Chip(
                    label: n == 0 ? SSettings.unlimited : '$n',
                    selected: s.rounds == n,
                    onTap: p.editable ? () => set(s.copyWith(rounds: n)) : null,
                  ),
              ],
            ),
          ],
        ),
      );
      items.add(_AddPrompt(api: p.api, onAdded: _load));
    }
    if (p.showSecondary) {
      items.add(
        _Group(
          row: true,
          title: SSettings.seconds,
          hint: SSettings.secondsHint(s.seconds),
          children: [
            SChips(
              children: [
                for (final n in secondsOptions)
                  _Chip(
                    label: SSettings.sec(n),
                    selected: s.seconds == n,
                    onTap: p.editable ? () => set(s.copyWith(seconds: n)) : null,
                  ),
              ],
            ),
          ],
        ),
      );
      items.add(
        _Toggle(
          on: s.anonymous,
          label: SSettings.anonymous,
          hint: SSettings.anonymousHint(s.anonymous),
          onTap: p.editable ? () => set(s.copyWith(anonymous: !s.anonymous)) : null,
        ),
      );
      items.add(
        _Toggle(
          on: s.selfVote,
          label: SSettings.selfVote,
          hint: SSettings.selfVoteHint,
          onTap: p.editable ? () => set(s.copyWith(selfVote: !s.selfVote)) : null,
        ),
      );
      items.add(
        _Toggle(
          on: s.predict,
          label: SSettings.predict,
          hint: SSettings.predictHint,
          onTap: p.editable ? () => set(s.copyWith(predict: !s.predict)) : null,
        ),
      );
    }
    return VStack(gap: 10, children: items);
  }
}

/// `.ml-set`: başlık satırı (`.ml-set-line`; `row` ise yan yana, sığmazsa alta kayar) + ipucu.
class _Group extends StatelessWidget {
  const _Group({required this.title, required this.children, this.hint, this.row = false});
  final String title;
  final List<Widget> children;
  final String? hint;
  final bool row;

  @override
  Widget build(BuildContext context) {
    final label = Text(title, style: _label);
    final line = row
        ? Wrap(alignment: WrapAlignment.spaceBetween, crossAxisAlignment: WrapCrossAlignment.center, spacing: 8, runSpacing: 8, children: [label, ...children])
        : VStack(gap: 8, children: [label, ...children]);
    return VStack(
      gap: 6,
      children: [
        line,
        if (hint != null) Text(hint!, style: _hint),
      ],
    );
  }
}

/// `.chip`; +18 seçiliyken zemin kırmızı (`.ml-sets .chip[data-bold][aria-pressed='true']`), çerçeve mürekkep kalır.
class _Chip extends StatelessWidget {
  const _Chip({required this.label, required this.selected, this.onTap, this.count, this.adult = false});
  final String label;
  final bool selected;
  final VoidCallback? onTap;
  final String? count;
  final bool adult;

  @override
  Widget build(BuildContext context) {
    final fg = selected ? C.ink2 : C.text;
    return Pressable(
      onTap: onTap,
      label: label,
      selected: selected,
      builder: (context, _) => Container(
        constraints: const BoxConstraints(minHeight: 44, minWidth: 48),
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
          color: selected ? (adult ? C.red : C.yellow) : C.panel,
          border: Border.all(color: C.ink, width: 2),
          borderRadius: BorderRadius.circular(12),
          boxShadow: selected ? hardShadow(0, 3) : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Flexible(
              child: Text(label, style: T.d(15, color: fg, height: 1.45), maxLines: 2),
            ),
            if (count != null) ...[
              const SizedBox(width: 6),
              Opacity(
                opacity: 0.75,
                child: Text(count!, style: T.d(12, color: fg, height: 1.45)),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// `.ml-adult`: seçili +18 kategoriler için uyarı.
class _AdultWarning extends StatelessWidget {
  const _AdultWarning(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(top: 8),
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
    decoration: BoxDecoration(
      border: Border.all(color: C.red, width: 2),
      borderRadius: BorderRadius.circular(10),
    ),
    child: Semantics(
      container: true,
      child: Text(
        text,
        style: T.b(13, color: C.text, weight: FontWeight.w800, height: 1.4),
      ),
    ),
  );
}

/// `.toggle.ml-toggle`: ayar adı solda, durum + anahtar sağda; tüm satır tek düğme.
class _Toggle extends StatelessWidget {
  const _Toggle({required this.on, required this.label, required this.hint, this.onTap});
  final bool on;
  final String label;
  final String hint;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => VStack(
    gap: 6,
    children: [
      Pressable(
        onTap: onTap,
        label: label,
        selected: on,
        builder: (context, _) => Container(
          constraints: const BoxConstraints(minHeight: 44),
          padding: const EdgeInsets.only(left: 14, right: 12),
          decoration: BoxDecoration(
            color: C.panel,
            border: Border.all(color: C.ink, width: 2),
            borderRadius: BorderRadius.circular(R.sm),
          ),
          child: Row(
            children: [
              Expanded(child: Text(label, style: _label)),
              const SizedBox(width: 12),
              Text(
                on ? SSettings.on : SSettings.off,
                style: T.b(13, color: on ? C.mint : C.text3, weight: FontWeight.w800),
              ),
              const SizedBox(width: 12),
              ToggleKnob(on: on),
            ],
          ),
        ),
      ),
      Text(hint, style: _hint),
    ],
  );
}

/// Her oyuncu soru ekleyebilir; "Aramızdaki en … kim?" kalıbının boşluğunu yazar.
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
      final res = await widget.api.post('/prompts', {'text': _text.text});
      if (!mounted) return;
      setState(() {
        _msg = (SSettings.saved(res.str('text')), false);
        _text.clear();
      });
      widget.onAdded();
    } on ApiError catch (e) {
      if (mounted) setState(() => _msg = (e.message.isNotEmpty ? e.message : SSettings.saveFailed, true));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final canSave = !_busy && _text.text.trim().length >= 3;
    final frame = T.b(13, color: C.text2, weight: FontWeight.w700);
    return _Group(
      title: SSettings.addPrompt,
      hint: SSettings.addPromptHint,
      children: [
        // `.ml-set-open`
        Align(
          alignment: Alignment.centerLeft,
          child: Pressable(
            onTap: () => setState(() => _open = !_open),
            label: SSettings.addPrompt,
            selected: _open,
            builder: (context, _) => Container(
              constraints: const BoxConstraints(minHeight: 44),
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(
                border: Border.all(color: C.violet, width: 2),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Transform.rotate(
                    angle: _open ? math.pi : 0,
                    child: const SIcon('chevron', size: 14, color: C.text2),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    SSettings.addPrompt,
                    style: T.b(14, color: C.text2, weight: FontWeight.w800),
                  ),
                ],
              ),
            ),
          ),
        ),
        if (_open)
          VStack(
            gap: 8,
            children: [
              // `.ml-add-frame`: "Aramızdaki en" [boşluk] "kim?"
              VStack(
                gap: 4,
                children: [
                  Text(S.prefix, style: frame),
                  Semantics(
                    label: SSettings.promptLabel,
                    child: SInput(
                      controller: _text,
                      placeholder: SSettings.promptPlaceholder,
                      maxLength: 80,
                      textCapitalization: TextCapitalization.none,
                      onSubmitted: (_) => canSave ? _submit() : null,
                    ),
                  ),
                  Text(S.suffix, style: frame),
                ],
              ),
              SButton(label: _busy ? SSettings.saving : SSettings.save, tone: BtnTone.yellow, block: true, onPressed: canSave ? _submit : null),
              if (_msg != null) _msg!.$2 ? ErrorText(_msg!.$1) : Text(_msg!.$1, style: _hint),
            ],
          ),
      ],
    );
  }
}
