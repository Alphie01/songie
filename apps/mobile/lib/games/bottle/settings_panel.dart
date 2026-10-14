import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
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

/// `.bt-group-title` (14px, 700, text-2).
final _title = T.b(14, color: C.text2, weight: FontWeight.w700);

/// `.sgs-hint.bt-hint-text`: 12.5px, 600, üstte 4px.
Widget _hintText(String text) => Padding(
  padding: const EdgeInsets.only(top: 4),
  child: Text(text, style: T.b(12.5, color: C.text3)),
);

/// `.bt-group`: başlık ve içerik; [row] ise yan yana (sığmazsa içerik alt satırda sağa yaslanır).
class _Group extends StatelessWidget {
  const _Group({required this.title, required this.child, this.hint, this.row = false});
  final String title;
  final Widget child;
  final String? hint;
  final bool row;

  @override
  Widget build(BuildContext context) => VStack(
    gap: 6,
    children: [
      if (row)
        _TitleRow(
          gap: 6,
          children: [
            Text(title, style: _title),
            child,
          ],
        )
      else
        VStack(
          gap: 6,
          children: [
            Text(title, style: _title),
            child,
          ],
        ),
      if (hint != null) _hintText(hint!),
    ],
  );
}

/// `.bt-group[data-row] .bt-group-line` (flex-wrap, ortalı, `space-between`) ve `.bt-group-body { margin-left: auto }`:
/// başlık ve içerik bir satıra sığarsa iki uca, sığmazsa içerik alt satırda sağa yaslanır.
class _TitleRow extends MultiChildRenderObjectWidget {
  const _TitleRow({required this.gap, required super.children}) : assert(children.length == 2);
  final double gap;

  @override
  _RenderTitleRow createRenderObject(BuildContext context) => _RenderTitleRow(gap);

  @override
  void updateRenderObject(BuildContext context, _RenderTitleRow renderObject) => renderObject.gap = gap;
}

class _TitleRowParentData extends ContainerBoxParentData<RenderBox> {}

class _RenderTitleRow extends RenderBox
    with ContainerRenderObjectMixin<RenderBox, _TitleRowParentData>, RenderBoxContainerDefaultsMixin<RenderBox, _TitleRowParentData> {
  _RenderTitleRow(this._gap);

  double _gap;
  set gap(double v) {
    if (v == _gap) return;
    _gap = v;
    markNeedsLayout();
  }

  @override
  void setupParentData(RenderBox child) {
    if (child.parentData is! _TitleRowParentData) child.parentData = _TitleRowParentData();
  }

  RenderBox get _head => firstChild!;
  RenderBox get _body => childAfter(firstChild!)!;

  @override
  void performLayout() {
    final width = constraints.maxWidth;
    final loose = BoxConstraints(maxWidth: width);
    _head.layout(loose, parentUsesSize: true);
    _body.layout(loose, parentUsesSize: true);
    final head = _head.size;
    final body = _body.size;
    final headData = _head.parentData! as _TitleRowParentData;
    final bodyData = _body.parentData! as _TitleRowParentData;
    if (head.width + _gap + body.width <= width) {
      final h = math.max(head.height, body.height);
      headData.offset = Offset(0, (h - head.height) / 2);
      bodyData.offset = Offset(width - body.width, (h - body.height) / 2);
      size = constraints.constrain(Size(width, h));
    } else {
      headData.offset = Offset.zero;
      bodyData.offset = Offset(width - body.width, head.height + _gap);
      size = constraints.constrain(Size(width, head.height + _gap + body.height));
    }
  }

  double _height(double width, double Function(RenderBox child, double width) measure) {
    final fits = _head.getMaxIntrinsicWidth(double.infinity) + _gap + _body.getMaxIntrinsicWidth(double.infinity) <= width;
    final h = measure(_head, width);
    final b = measure(_body, width);
    return fits ? math.max(h, b) : h + _gap + b;
  }

  @override
  double computeMinIntrinsicHeight(double width) => _height(width, (c, w) => c.getMinIntrinsicHeight(w));

  @override
  double computeMaxIntrinsicHeight(double width) => _height(width, (c, w) => c.getMaxIntrinsicHeight(w));

  @override
  double computeMinIntrinsicWidth(double height) => math.max(_head.getMinIntrinsicWidth(double.infinity), _body.getMinIntrinsicWidth(double.infinity));

  @override
  double computeMaxIntrinsicWidth(double height) => _head.getMaxIntrinsicWidth(double.infinity) + _gap + _body.getMaxIntrinsicWidth(double.infinity);

  @override
  Size computeDryLayout(covariant BoxConstraints constraints) {
    final width = constraints.maxWidth;
    final loose = BoxConstraints(maxWidth: width);
    final head = _head.getDryLayout(loose);
    final body = _body.getDryLayout(loose);
    final fits = head.width + _gap + body.width <= width;
    return constraints.constrain(Size(width, fits ? math.max(head.height, body.height) : head.height + _gap + body.height));
  }

  @override
  void paint(PaintingContext context, Offset offset) => defaultPaint(context, offset);

  @override
  bool hitTestChildren(BoxHitTestResult result, {required Offset position}) => defaultHitTestChildren(result, position: position);
}

/// `.chips` (`.bt-group-body` içinde 4px aralık).
Widget _chips(List<Widget> chips) => Wrap(spacing: 4, runSpacing: 4, children: chips);

/// `.toggle.bt-toggle`: ad solda, durum (Açık/Kapalı) ve anahtar sağda; altında ipucu.
class _ToggleRow extends StatelessWidget {
  const _ToggleRow({required this.label, required this.on, this.hint, this.onTap});
  final String label;
  final bool on;
  final String? hint;
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
              Expanded(
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    label,
                    style: T.b(14, color: C.text2, weight: FontWeight.w700),
                  ),
                ),
              ),
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
      if (hint != null) _hintText(hint!),
    ],
  );
}

/// `.option.bt-cat`: kategori satırı (seçiliyken sarı; +18 seçiliyken kırmızı), sağda soru sayıları.
class _CategoryOption extends StatelessWidget {
  const _CategoryOption({required this.category, required this.on, this.onTap});
  final CategoryInfo category;
  final bool on;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final fg = on ? C.ink2 : C.text;
    final count = T
        .d(11.5, color: on ? C.ink2.withValues(alpha: 0.75) : C.text3, weight: FontWeight.w700, height: 1.45)
        .copyWith(fontFeatures: const [FontFeature.tabularFigures()]);
    return Opacity(
      opacity: onTap == null && !on ? 0.55 : 1,
      child: Pressable(
        onTap: onTap,
        label: category.name,
        selected: on,
        builder: (context, _) => Container(
          constraints: const BoxConstraints(minHeight: 44),
          padding: const EdgeInsets.symmetric(horizontal: 14),
          decoration: BoxDecoration(
            color: on ? (isAdultCategory(category.id) ? C.red : C.yellow) : C.panel,
            border: Border.all(color: C.ink, width: 2),
            borderRadius: BorderRadius.circular(R.sm),
          ),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  category.name,
                  style: T.b(15, color: fg, weight: FontWeight.w800),
                ),
              ),
              const SizedBox(width: 8),
              Text(SSettings.truthDare(category.truth, category.dare), style: count),
            ],
          ),
        ),
      ),
    );
  }
}

/// games/bottle/client/SettingsPanel.tsx
class BottleSettingsPanel extends StatefulWidget {
  const BottleSettingsPanel({super.key, required this.props});
  final SettingsPanelProps props;

  @override
  State<BottleSettingsPanel> createState() => _BottleSettingsPanelState();
}

class _BottleSettingsPanelState extends State<BottleSettingsPanel> {
  List<CategoryInfo>? _categories;

  @override
  void initState() {
    super.initState();
    if (widget.props.showPrimary) _load();
  }

  @override
  void didUpdateWidget(BottleSettingsPanel old) {
    super.didUpdateWidget(old);
    if (!old.props.showPrimary && widget.props.showPrimary && _categories == null) _load();
  }

  /// Soru eklenince de yeniden yüklenir (sayılar değişir).
  Future<void> _load() async {
    if (!widget.props.showPrimary) return;
    try {
      final r = await widget.props.api.get('/categories');
      if (mounted) setState(() => _categories = r.objs('categories').map(CategoryInfo.fromJson).toList());
    } on ApiError {
      // kategori listesi gelmezse liste boş kalır
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.props;
    final s = BottleSettings.fromJson(p.settings);
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
      final hint = [if (s.categories.any(isAdultCategory)) SSettings.categoriesHint, if (s.categories.contains(coupleCategory)) SSettings.coupleHint].join(' ');
      items.add(
        _Group(
          title: SSettings.categories,
          hint: hint.isEmpty ? null : hint,
          child: VStack(
            gap: 6,
            children: [
              for (final c in _categories ?? const <CategoryInfo>[])
                _CategoryOption(
                  category: c,
                  on: s.categories.contains(c.id),
                  onTap: off
                      ? null
                      : () {
                          final has = s.categories.contains(c.id);
                          final next = has ? s.categories.where((x) => x != c.id).toList() : [...s.categories, c.id];
                          if (next.isNotEmpty) set({'categories': next});
                        },
                ),
            ],
          ),
        ),
      );
      items.add(
        _Group(
          row: true,
          title: SSettings.rounds,
          hint: SSettings.roundsHint(s.rounds),
          child: choice(roundOptions, s.rounds, (n) => n == 0 ? SSettings.unlimited : '$n', 'rounds'),
        ),
      );
    }
    if (p.showSecondary) {
      items.add(
        _Group(
          row: true,
          title: SSettings.choice,
          child: choice(['player', 'random'], s.choice, (c) => c == 'player' ? SSettings.choicePlayer : SSettings.choiceRandom, 'choice'),
        ),
      );
      items.add(
        _Group(
          row: true,
          title: SSettings.order,
          child: choice(['target', 'round'], s.order, (o) => o == 'target' ? SSettings.orderTarget : SSettings.orderRound, 'order'),
        ),
      );
      items.add(_Group(row: true, title: SSettings.passes, child: choice(passOptions, s.passes, (n) => n < 0 ? SSettings.unlimited : '$n', 'passes')));
      items.add(
        _ToggleRow(
          label: SSettings.passPenalty,
          hint: SSettings.passPenaltyHint,
          on: s.passPenalty,
          onTap: off ? null : () => set({'passPenalty': !s.passPenalty}),
        ),
      );
      items.add(_ToggleRow(label: SSettings.vote, hint: SSettings.voteHint, on: s.vote, onTap: off ? null : () => set({'vote': !s.vote})));
      items.add(_ToggleRow(label: SSettings.fair, hint: SSettings.fairHint, on: s.fairSpin, onTap: off ? null : () => set({'fairSpin': !s.fairSpin})));
      items.add(_AddPrompt(api: p.api, onAdded: _load));
    }
    return VStack(gap: 12, children: items);
  }
}

class _AddPrompt extends StatefulWidget {
  const _AddPrompt({required this.api, required this.onAdded});
  final GameApi api;
  final VoidCallback onAdded;

  @override
  State<_AddPrompt> createState() => _AddPromptState();
}

class _AddPromptState extends State<_AddPrompt> {
  bool _open = false;
  String _kind = 'truth';
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
      await widget.api.post('/prompts', {'kind': _kind, 'text': _text.text});
      if (!mounted) return;
      setState(() {
        _msg = (SSettings.saved, false);
        _text.clear();
      });
      widget.onAdded();
    } on ApiError catch (e) {
      if (mounted) setState(() => _msg = (e.message.isNotEmpty ? e.message : SSettings.failed, true));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final canSave = !_busy && _text.text.trim().length >= 8;
    // `.bt-group-body` blok kutu: düğme ile form arasında boşluk yok.
    return _Group(
      title: SSettings.add,
      hint: SSettings.addHint,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Align(
            alignment: Alignment.centerLeft,
            child: _OpenToggle(label: SSettings.add, open: _open, onTap: () => setState(() => _open = !_open)),
          ),
          if (_open)
            VStack(
              gap: 8,
              children: [
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [for (final k in kinds) _KindChip(kind: k, selected: _kind == k, onTap: () => setState(() => _kind = k))],
                ),
                _TextArea(controller: _text, placeholder: SSettings.addPlaceholder(_kind), label: SSettings.add, maxLength: 200),
                SButton(label: _busy ? SSettings.saving : SSettings.save, tone: BtnTone.yellow, block: true, onPressed: canSave ? _submit : null),
                if (_msg != null) _msg!.$2 ? ErrorText(_msg!.$1) : Text(_msg!.$1, style: SettingsGroup.defaultHint()),
              ],
            ),
        ],
      ),
    );
  }
}

/// `.chip[data-kind]`: seçiliyken doğruluk gök mavisi, cesaret kırmızı.
class _KindChip extends StatelessWidget {
  const _KindChip({required this.kind, required this.selected, required this.onTap});
  final String kind;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Pressable(
    onTap: onTap,
    label: S.kind(kind),
    selected: selected,
    builder: (context, _) => Container(
      constraints: const BoxConstraints(minHeight: 44, minWidth: 48),
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: selected ? (kind == 'dare' ? C.red : C.sky) : C.panel,
        border: Border.all(color: C.ink, width: 2),
        borderRadius: BorderRadius.circular(12),
        boxShadow: selected ? hardShadow(0, 3) : null,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [Text(S.kind(kind), style: T.d(15, color: selected ? C.ink2 : C.text))],
      ),
    ),
  );
}

/// `.btn.btn-ghost.bt-add-open`: açılır bölüm düğmesi (chevron + yazı).
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
          Flexible(
            child: Text(
              label,
              style: T.b(14, color: C.text2, weight: FontWeight.w800, height: 1),
            ),
          ),
        ],
      ),
    ),
  );
}

/// `textarea.input.bt-add-text` (rows=3): Baloo 14px, 1.4 satır, üstte 10px, en az 76px.
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
    final style = T.d(14, color: C.ink2, weight: FontWeight.w700, height: 1.4);
    return FocusRing(
      focused: _focused,
      radius: R.md,
      child: Container(
        constraints: const BoxConstraints(minHeight: 76),
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
        alignment: Alignment.topLeft,
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
