import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../session/api.dart';
import '../../shared/models.dart';
import '../../ui/icons.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/game_module.dart';
import '../kit/kit.dart';
import 'models.dart';
import 'strings.dart';

/// `.pr-set-label` (14px, 700, text-2).
final _label = T.b(14, color: C.text2, weight: FontWeight.w700);

/// `.pr-set-hint` (12px, 600, 1.4 satır).
final _hint = T.b(12, color: C.text3, height: 1.4);

/// `.pr-set`: solda etiket, sağda seçenekler (sığmazsa alt satıra iner); [stack] seçenekleri hep alta indirir.
class _Group extends StatelessWidget {
  const _Group({required this.title, required this.child, this.hint, this.stack = false});
  final String title;
  final Widget child;
  final String? hint;
  final bool stack;

  @override
  Widget build(BuildContext context) => VStack(
    gap: 4,
    children: [
      if (stack)
        VStack(
          gap: 6,
          children: [
            Text(title, style: _label),
            child,
          ],
        )
      else
        Wrap(
          alignment: WrapAlignment.spaceBetween,
          crossAxisAlignment: WrapCrossAlignment.center,
          spacing: 8,
          runSpacing: 6,
          children: [
            Text(title, style: _label),
            child,
          ],
        ),
      if (hint != null) Text(hint!, style: _hint),
    ],
  );
}

/// `.chips` (`.pr-set` içinde 4px aralık; yan yana satırda sağa yaslı).
Widget _chips(List<Widget> chips, {bool end = true}) =>
    Wrap(alignment: end ? WrapAlignment.end : WrapAlignment.start, spacing: 4, runSpacing: 4, children: chips);

/// `.toggle.pr-toggle`: genişlik içeriğe göre, en az 112px.
class _Toggle extends StatelessWidget {
  const _Toggle({required this.on, required this.label, this.onTap});
  final bool on;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => Pressable(
    onTap: onTap,
    label: label,
    selected: on,
    builder: (context, _) => ConstrainedBox(
      constraints: const BoxConstraints(minWidth: 112),
      child: IntrinsicWidth(
        child: Container(
          constraints: const BoxConstraints(minHeight: 44),
          padding: const EdgeInsets.only(left: 14, right: 12),
          decoration: BoxDecoration(
            color: C.panel,
            border: Border.all(color: C.ink, width: 2),
            borderRadius: BorderRadius.circular(R.sm),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                on ? SSettings.on : SSettings.off,
                style: T.b(15, color: C.text2, weight: FontWeight.w700),
              ),
              const SizedBox(width: 12),
              ToggleKnob(on: on),
            ],
          ),
        ),
      ),
    ),
  );
}

/// games/paranoia/client/SettingsPanel.tsx
class ParanoiaSettingsPanel extends StatefulWidget {
  const ParanoiaSettingsPanel({super.key, required this.props});
  final SettingsPanelProps props;

  @override
  State<ParanoiaSettingsPanel> createState() => _ParanoiaSettingsPanelState();
}

class _ParanoiaSettingsPanelState extends State<ParanoiaSettingsPanel> {
  List<CategoryInfo>? _categories;

  @override
  void initState() {
    super.initState();
    if (widget.props.showPrimary) _load();
  }

  @override
  void didUpdateWidget(ParanoiaSettingsPanel old) {
    super.didUpdateWidget(old);
    if (!old.props.showPrimary && widget.props.showPrimary && _categories == null) _load();
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
    final s = ParanoiaSettings.fromJson(p.settings);
    final off = !p.editable;
    void set(Json patch) {
      if (p.editable) p.onChange({...p.settings, ...patch});
    }

    Widget choice<V>(List<V> options, V value, String Function(V v) label, String key) => _chips([
      for (final o in options) SettingChip(label: label(o), selected: value == o, onTap: off ? null : () => set({key: o})),
    ]);

    final items = <Widget>[];
    if (p.showPrimary) {
      if (!p.editable) items.add(const ReadOnlyNote(SSettings.readOnly));
      items.add(
        _Group(
          title: SSettings.count,
          hint: SSettings.countHint(s.questionCount),
          child: choice(questionCountOptions, s.questionCount, (n) => '$n', 'questionCount'),
        ),
      );
      items.add(
        _Group(
          title: SSettings.categories,
          hint: s.categories.any(isAdultCategory) ? SSettings.adultHint : SSettings.categoriesHint,
          stack: true,
          child: _chips(end: false, [
            for (final c in _categories ?? const <CategoryInfo>[])
              SettingChip(
                label: c.name,
                count: '${c.count}',
                adult: isAdultCategory(c.id),
                selected: s.categories.contains(c.id),
                onTap: off
                    ? null
                    : () {
                        final has = s.categories.contains(c.id);
                        final next = has ? s.categories.where((x) => x != c.id).toList() : [...s.categories, c.id];
                        if (next.isNotEmpty) set({'categories': next});
                      },
              ),
          ]),
        ),
      );
    }
    if (p.showSecondary) {
      items.add(
        _Group(title: SSettings.think, child: choice(thinkOptions, s.thinkSeconds, (n) => n == 0 ? SSettings.unlimited : SSettings.sec(n), 'thinkSeconds')),
      );
      if (s.thinkSeconds > 0) {
        items.add(
          _Group(
            title: SSettings.onTimeout,
            child: choice(['random', 'pass'], s.onTimeout, (v) => v == 'random' ? SSettings.timeoutRandom : SSettings.timeoutPass, 'onTimeout'),
          ),
        );
      }
      items.add(
        _Group(
          title: SSettings.hideHolder,
          hint: SSettings.hideHolderHint,
          child: _Toggle(on: s.hideHolder, label: SSettings.hideHolder, onTap: off ? null : () => set({'hideHolder': !s.hideHolder})),
        ),
      );
      items.add(
        _Group(
          title: SSettings.noReturn,
          hint: SSettings.noReturnHint,
          child: _Toggle(on: s.noReturn, label: SSettings.noReturn, onTap: off ? null : () => set({'noReturn': !s.noReturn})),
        ),
      );
      items.add(
        _Group(
          title: SSettings.allowSelf,
          hint: SSettings.allowSelfHint,
          child: _Toggle(on: s.allowSelf, label: SSettings.allowSelf, onTap: off ? null : () => set({'allowSelf': !s.allowSelf})),
        ),
      );
      items.add(
        _Group(
          title: SSettings.first,
          child: choice(['random', 'host'], s.firstHolder, (v) => v == 'random' ? SSettings.firstRandom : SSettings.firstHost, 'firstHolder'),
        ),
      );
      items.add(
        _Group(
          title: SSettings.revealBy,
          child: choice(['host', 'vote'], s.revealBy, (v) => v == 'host' ? SSettings.revealHost : SSettings.revealVote, 'revealBy'),
        ),
      );
      items.add(_AddQuestion(api: p.api));
    }
    return VStack(gap: 10, children: items);
  }
}

/// Herkes soru ekleyebilir; sorular hiçbir yerde listelenmez (sürpriz bozulmasın).
class _AddQuestion extends StatefulWidget {
  const _AddQuestion({required this.api});
  final GameApi api;

  @override
  State<_AddQuestion> createState() => _AddQuestionState();
}

class _AddQuestionState extends State<_AddQuestion> {
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
      await widget.api.post('/questions', {'text': _text.text});
      if (!mounted) return;
      setState(() {
        _msg = (SSettings.saved, false);
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
    final canSave = !_busy && _text.text.trim().length >= 8;
    return _Group(
      title: SSettings.add,
      hint: SSettings.addHint,
      stack: true,
      child: VStack(
        gap: 6,
        children: [
          Align(
            alignment: Alignment.centerLeft,
            child: _OpenToggle(label: SSettings.add, open: _open, onTap: () => setState(() => _open = !_open)),
          ),
          if (_open)
            VStack(
              gap: 8,
              children: [
                _TextArea(controller: _text, placeholder: SSettings.addPlaceholder, label: SSettings.addLabel, maxLength: 140),
                SButton(label: _busy ? SSettings.saving : SSettings.save, tone: BtnTone.yellow, block: true, onPressed: canSave ? _submit : null),
                if (_msg != null) _msg!.$2 ? ErrorText(_msg!.$1) : Text(_msg!.$1, style: SettingsGroup.defaultHint()),
              ],
            ),
        ],
      ),
    );
  }
}

/// `.btn.btn-ghost.pr-add-open`: açılır bölüm düğmesi (chevron + yazı, 14px yan boşluk).
class _OpenToggle extends StatelessWidget {
  const _OpenToggle({required this.label, required this.open, required this.onTap});
  final String label;
  final bool open;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Pressable(
    onTap: onTap,
    label: label,
    selected: open,
    builder: (context, _) => Container(
      constraints: const BoxConstraints(minHeight: 44),
      padding: const EdgeInsets.symmetric(horizontal: 14),
      decoration: BoxDecoration(
        border: Border.all(color: C.line2, width: 2),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Transform.rotate(
            angle: open ? math.pi : 0,
            child: const SIcon('chevron', size: 14, color: C.text2),
          ),
          const SizedBox(width: 8),
          Text(
            label,
            style: T.b(14, color: C.text2, weight: FontWeight.w800, height: 1),
          ),
        ],
      ),
    ),
  );
}

/// `textarea.input.pr-add-text` (rows=3): Baloo 19px, dikey boşluk yok, odakta sarı halka.
class _TextArea extends StatefulWidget {
  const _TextArea({required this.controller, required this.placeholder, required this.label, required this.maxLength});
  final TextEditingController controller;
  final String placeholder;
  final String label;
  final int maxLength;

  @override
  State<_TextArea> createState() => _TextAreaState();
}

class _TextAreaState extends State<_TextArea> {
  final _focus = FocusNode();
  bool _focused = false;

  @override
  void initState() {
    super.initState();
    _focus.addListener(() => setState(() => _focused = _focus.hasFocus));
  }

  @override
  void dispose() {
    _focus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final style = T.d(19, color: C.ink2, weight: FontWeight.w700, height: 1.45);
    return FocusRing(
      focused: _focused,
      radius: R.md,
      child: Container(
        constraints: const BoxConstraints(minHeight: 84),
        padding: const EdgeInsets.symmetric(horizontal: 16),
        decoration: BoxDecoration(
          color: C.paper,
          border: Border.all(color: C.ink, width: bw),
          borderRadius: BorderRadius.circular(R.md),
        ),
        child: Semantics(
          label: widget.label,
          child: TextField(
            controller: widget.controller,
            focusNode: _focus,
            minLines: 3,
            maxLines: 3,
            maxLength: widget.maxLength,
            maxLengthEnforcement: MaxLengthEnforcement.enforced,
            keyboardType: TextInputType.multiline,
            textCapitalization: TextCapitalization.sentences,
            cursorColor: C.ink2,
            style: style,
            decoration: InputDecoration(
              isCollapsed: true,
              border: InputBorder.none,
              counterText: '',
              hintText: widget.placeholder,
              hintStyle: style.copyWith(color: C.placeholder),
            ),
          ),
        ),
      ),
    );
  }
}
