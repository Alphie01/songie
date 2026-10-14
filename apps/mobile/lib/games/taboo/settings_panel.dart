import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';

import '../../session/api.dart';
import '../../shared/models.dart';
import '../../ui/icons.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/game_module.dart';
import '../kit/kit.dart';
import 'models.dart';
import 'strings.dart';

/// `--tb-ban`: yasaklı kelime işareti (tasarımdaki özel ton).
const tbBan = Color(0xFFFF6B8B);

Color teamColor(String team) => team == 'a' ? C.mint : C.lilac;

/// `.tbs-legend`: 14px, 700, text-2.
final _legend = T.b(14, color: C.text2, weight: FontWeight.w700);

/// `.tbs-hint`: 12px, 600, satır 1.45, text-3.
final _hint = T.b(12, color: C.text3);

/// games/taboo/client/SettingsPanel.tsx
class TabooSettingsPanel extends StatefulWidget {
  const TabooSettingsPanel({super.key, required this.props});
  final SettingsPanelProps props;

  @override
  State<TabooSettingsPanel> createState() => _TabooSettingsPanelState();
}

class _TabooSettingsPanelState extends State<TabooSettingsPanel> {
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
    final settings = TabooSettings.fromJson(p.settings);
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

    /// Takımsız → Yeşil → Mor → Takımsız döngüsü.
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
      final fg = none ? C.text3 : C.ink2;
      final content = Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Flexible(child: Text(none ? SSettings.unassigned : S.team[team]!, style: T.d(16, color: fg, height: 1.45))),
              Opacity(opacity: 0.7, child: Text('${ids.length}', style: T.b(12, color: fg, weight: FontWeight.w800))),
            ],
          ),
          if (ids.isEmpty)
            Opacity(opacity: 0.7, child: Text(SSettings.empty, style: T.b(12, color: fg, weight: FontWeight.w700)))
          else
            for (final id in ids)
              if (byId[id] case final pl?)
                Pressable(
                  onTap: p.editable ? () => cycle(id) : null,
                  label: pl.nick,
                  builder: (context, _) => Opacity(
                    opacity: pl.connected ? 1 : 0.6,
                    child: Container(
                      constraints: const BoxConstraints(minHeight: 44),
                      child: Row(
                        children: [
                          SAvatar(avatar: pl.avatar, nick: pl.nick, size: 26),
                          const SizedBox(width: 6),
                          Flexible(
                            child: Text(
                              pl.nick,
                              style: T.b(14, color: none ? C.text : C.ink2, weight: FontWeight.w800),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
        ],
      );
      if (none) return TbDashed(radius: 18, padding: const EdgeInsets.all(10), child: content);
      return Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(color: teamColor(team), border: Border.all(color: C.ink, width: bw), borderRadius: BorderRadius.circular(18)),
        child: content,
      );
    }

    final items = <Widget>[];
    if (p.showPrimary) {
      if (!p.editable) {
        items.add(
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(color: C.panel, borderRadius: BorderRadius.circular(12)),
            child: Text(SSettings.readOnly, style: T.b(13, color: C.text2, weight: FontWeight.w700)),
          ),
        );
      }
      items.add(
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Flexible(child: Text(SSettings.teams, style: _legend)),
            if (p.editable) ...[const SizedBox(width: 8), _SmallButton(icon: SIcon('shuffle', size: 14, color: C.text), label: SSettings.shuffle, onTap: shuffleTeams)],
          ],
        ),
      );
      items.add(
        VStack(
          gap: 10,
          children: [
            Grid2(columnGap: 10, equalHeight: true, children: [teamBox('a', teamA), teamBox('b', teamB)]),
            if (unassigned.isNotEmpty) teamBox(null, unassigned),
          ],
        ),
      );
      items.add(
        Text(teamA.length < 2 || teamB.length < 2 ? '${SSettings.needTwo} ${SSettings.teamsHint}' : SSettings.teamsHint, style: _hint),
      );
      items.add(
        _Group(
          title: SSettings.categories,
          hint: settings.categories.any(isAdultCategory) ? SSettings.adultHint : null,
          child: SChips(
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
                          if (next.isNotEmpty) set({'categories': next});
                        }
                      : null,
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
              for (final n in secondsOptions)
                _RowChip(label: SSettings.sec(n), selected: settings.seconds == n, onTap: p.editable ? () => set({'seconds': n}) : null),
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
                _RowChip(label: n < 0 ? SSettings.unlimited : '$n', selected: settings.passes == n, onTap: p.editable ? () => set({'passes': n}) : null),
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
                _RowChip(label: n == 0 ? SSettings.unlimited : '$n', selected: settings.turns == n, onTap: p.editable ? () => set({'turns': n}) : null),
            ],
          ),
        ),
      );
      items.add(
        _RowGroup(
          title: SSettings.penalty,
          hint: SSettings.penaltyHint,
          child: _RowToggle(
            label: settings.tabooPenalty ? SSettings.on : SSettings.off,
            value: settings.tabooPenalty,
            onTap: p.editable ? () => set({'tabooPenalty': !settings.tabooPenalty}) : null,
          ),
        ),
      );
      items.add(_AddCard(api: p.api));
    }
    // `.sgs.tbs`: gap 12
    return VStack(gap: 12, children: items);
  }
}

/// `.tbs-group`: başlık, gövde (gap 8), ipucu; aralık 6.
class _Group extends StatelessWidget {
  const _Group({required this.title, required this.child, this.hint});
  final String title;
  final Widget child;
  final String? hint;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Text(title, style: _legend),
      const SizedBox(height: 6),
      child,
      if (hint != null) ...[const SizedBox(height: 6), Text(hint!, style: _hint)],
    ],
  );
}

/// `.tbs-group[data-row]`: başlık solda, seçenekler sağda (sığmazsa alt satırda, sağa yaslı); ipucu tam satır.
class _RowGroup extends StatelessWidget {
  const _RowGroup({required this.title, required this.child, this.hint});
  final String title;
  final Widget child;
  final String? hint;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      _SplitRow(gap: 8, runGap: 6, children: [Text(title, style: _legend), child]),
      if (hint != null) ...[const SizedBox(height: 6), Text(hint!, style: _hint)],
    ],
  );
}

/// `.tbs-group[data-row] .chips`: tek satır, aralık 4.
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

/// `.tbs-group[data-row] .chip`: 44×44 en az, 10px iç boşluk, r8, Nunito 13.
class _RowChip extends StatelessWidget {
  const _RowChip({required this.label, required this.selected, this.onTap});
  final String label;
  final bool selected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => Pressable(
    onTap: onTap,
    label: label,
    selected: selected,
    builder: (context, _) => Container(
      constraints: const BoxConstraints(minHeight: 44, minWidth: 44),
      padding: const EdgeInsets.symmetric(horizontal: 10),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: selected ? C.yellow : C.panel,
        border: Border.all(color: C.ink, width: 2),
        borderRadius: BorderRadius.circular(8),
        boxShadow: selected ? hardShadow(0, 3) : null,
      ),
      child: Text(label, style: T.b(13, color: selected ? C.ink2 : C.text, weight: FontWeight.w800), maxLines: 1, softWrap: false),
    ),
  );
}

/// `.tbs-group[data-row] .toggle`: kendi genişliğinde, en az 120px, 13px 800.
class _RowToggle extends StatelessWidget {
  const _RowToggle({required this.label, required this.value, this.onTap});
  final String label;
  final bool value;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => Pressable(
    onTap: onTap,
    label: label,
    selected: value,
    builder: (context, _) => Container(
      constraints: const BoxConstraints(minHeight: 44, minWidth: 120),
      padding: const EdgeInsets.only(left: 14, right: 12),
      decoration: BoxDecoration(color: C.panel, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(R.sm)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: T.b(13, color: C.text2, weight: FontWeight.w800)),
          const SizedBox(width: 12),
          ToggleKnob(on: value),
        ],
      ),
    ),
  );
}

/// `.tbs-shuffle`: küçük çerçeveli düğme (Karıştır, Kart ekle).
class _SmallButton extends StatelessWidget {
  const _SmallButton({required this.icon, required this.label, required this.onTap, this.selected});
  final Widget icon;
  final String label;
  final VoidCallback onTap;
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
        children: [icon, const SizedBox(width: 6), Text(label, style: T.b(13, color: C.text, weight: FontWeight.w800))],
      ),
    ),
  );
}

/// Her oyuncu kart ekleyebilir; kartlar hiçbir ekranda listelenmez (sürpriz bozulmasın).
class _AddCard extends StatefulWidget {
  const _AddCard({required this.api});
  final GameApi api;

  @override
  State<_AddCard> createState() => _AddCardState();
}

class _AddCardState extends State<_AddCard> {
  bool _open = false;
  bool _busy = false;
  final _word = TextEditingController();
  final _taboo = List.generate(5, (_) => TextEditingController());
  (String, bool)? _msg;

  @override
  void initState() {
    super.initState();
    for (final c in [_word, ..._taboo]) {
      c.addListener(_changed);
    }
  }

  void _changed() => setState(() {});

  @override
  void dispose() {
    for (final c in [_word, ..._taboo]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _msg = null;
    });
    try {
      await widget.api.post('/cards', {'word': _word.text, 'taboo': [for (final c in _taboo) c.text]});
      if (!mounted) return;
      setState(() {
        _msg = (SSettings.saved(_word.text.trim()), false);
        _word.clear();
        for (final c in _taboo) {
          c.clear();
        }
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
    final canSave = !_busy && _word.text.trim().isNotEmpty && _taboo.every((c) => c.text.trim().isNotEmpty);
    return _Group(
      title: SSettings.addCard,
      hint: SSettings.addCardHint,
      child: VStack(
        gap: 8,
        children: [
          Align(
            alignment: Alignment.centerLeft,
            child: _SmallButton(
              icon: Transform.rotate(angle: _open ? math.pi : 0, child: const SIcon('chevron', size: 14, color: C.text)),
              label: SSettings.addCard,
              selected: _open,
              onTap: () => setState(() => _open = !_open),
            ),
          ),
          if (_open)
            // `.tb-addcard`: grid, gap 6
            VStack(
              gap: 6,
              children: [
                Semantics(
                  label: SSettings.word,
                  child: SInput(controller: _word, placeholder: SSettings.word, maxLength: 40, minHeight: 44, fontSize: 16),
                ),
                for (var i = 0; i < _taboo.length; i++)
                  Semantics(
                    label: SSettings.taboo(i + 1),
                    child: _TabooInput(controller: _taboo[i], placeholder: SSettings.taboo(i + 1)),
                  ),
                SButton(label: _busy ? SSettings.saving : SSettings.save, tone: BtnTone.yellow, block: true, onPressed: canSave ? _submit : null),
                if (_msg != null)
                  Semantics(liveRegion: true, child: _msg!.$2 ? ErrorText(_msg!.$1) : Text(_msg!.$1, style: _hint)),
              ],
            ),
        ],
      ),
    );
  }
}

/// `.tb-addcard-taboo`: solda içten 4px yasaklı rengi şerit (`box-shadow: inset 4px 0 0`).
class _TabooInput extends StatelessWidget {
  const _TabooInput({required this.controller, required this.placeholder});
  final TextEditingController controller;
  final String placeholder;

  @override
  Widget build(BuildContext context) => Stack(
    clipBehavior: Clip.none,
    children: [
      SInput(controller: controller, placeholder: placeholder, maxLength: 30, minHeight: 44, fontSize: 16, textCapitalization: TextCapitalization.none),
      const Positioned.fill(child: IgnorePointer(child: CustomPaint(painter: _InsetBar()))),
    ],
  );
}

class _InsetBar extends CustomPainter {
  const _InsetBar();

  @override
  void paint(Canvas canvas, Size size) {
    // Gölge, çerçevenin içindeki dolgu kutusunda (r16 − 3 = 13) çizilir.
    final inner = RRect.fromRectAndRadius(Rect.fromLTWH(bw, bw, size.width - 2 * bw, size.height - 2 * bw), const Radius.circular(R.md - bw));
    final path = Path.combine(PathOperation.difference, Path()..addRRect(inner), Path()..addRRect(inner.shift(const Offset(4, 0))));
    canvas.drawPath(path, Paint()..color = tbBan);
  }

  @override
  bool shouldRepaint(_InsetBar old) => false;
}

/// Kesikli çerçeveli kutu (CSS `border: 3px dashed var(--violet)`); zemin çerçevenin altında.
/// Chromium 3px ve üstü kesikli çizgide çizgi 2×, boşluk 1× kalınlık kullanır.
class TbDashed extends StatelessWidget {
  const TbDashed({super.key, required this.child, required this.radius, required this.padding, this.background});
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

/// Esnek satır kaydırma: iki çocuk tek satıra sığıyorsa biri solda biri sağda (dikeyde ortalı),
/// sığmıyorsa ikinci çocuk alt satırda sağa yaslı (`flex-wrap: wrap` + `margin-left: auto`).
class _SplitRow extends MultiChildRenderObjectWidget {
  const _SplitRow({required super.children, required this.gap, required this.runGap});
  final double gap;
  final double runGap;

  @override
  RenderObject createRenderObject(BuildContext context) => _RenderSplitRow(gap, runGap);

  @override
  void updateRenderObject(BuildContext context, _RenderSplitRow renderObject) {
    renderObject
      ..gap = gap
      ..runGap = runGap;
  }
}

class _SplitData extends ContainerBoxParentData<RenderBox> {}

class _RenderSplitRow extends RenderBox
    with ContainerRenderObjectMixin<RenderBox, _SplitData>, RenderBoxContainerDefaultsMixin<RenderBox, _SplitData> {
  _RenderSplitRow(this._gap, this._runGap);

  double _gap;
  set gap(double v) {
    if (v == _gap) return;
    _gap = v;
    markNeedsLayout();
  }

  double _runGap;
  set runGap(double v) {
    if (v == _runGap) return;
    _runGap = v;
    markNeedsLayout();
  }

  @override
  void setupParentData(RenderBox child) {
    if (child.parentData is! _SplitData) child.parentData = _SplitData();
  }

  RenderBox get _first => firstChild!;
  RenderBox get _second => lastChild!;

  bool _fits(double width) => _first.getMaxIntrinsicWidth(double.infinity) + _gap + _second.getMaxIntrinsicWidth(double.infinity) <= width;

  @override
  double computeMinIntrinsicWidth(double height) =>
      math.max(_first.getMinIntrinsicWidth(double.infinity), _second.getMinIntrinsicWidth(double.infinity));

  @override
  double computeMaxIntrinsicWidth(double height) =>
      _first.getMaxIntrinsicWidth(double.infinity) + _gap + _second.getMaxIntrinsicWidth(double.infinity);

  double _height(double width, double Function(RenderBox child, double width) of) =>
      _fits(width) ? math.max(of(_first, width), of(_second, width)) : of(_first, width) + _runGap + of(_second, width);

  @override
  double computeMinIntrinsicHeight(double width) => _height(width, (c, w) => c.getMinIntrinsicHeight(w));

  @override
  double computeMaxIntrinsicHeight(double width) => _height(width, (c, w) => c.getMaxIntrinsicHeight(w));

  (Size, Offset, Offset) _arrange(BoxConstraints constraints, Size a, Size b) {
    final w = constraints.hasBoundedWidth ? constraints.maxWidth : a.width + _gap + b.width;
    if (a.width + _gap + b.width <= w) {
      final h = math.max(a.height, b.height);
      return (constraints.constrain(Size(w, h)), Offset(0, (h - a.height) / 2), Offset(w - b.width, (h - b.height) / 2));
    }
    final h = a.height + _runGap + b.height;
    return (constraints.constrain(Size(w, h)), Offset.zero, Offset(w - b.width, a.height + _runGap));
  }

  @override
  Size computeDryLayout(BoxConstraints constraints) {
    final loose = BoxConstraints(maxWidth: constraints.maxWidth);
    return _arrange(constraints, _first.getDryLayout(loose), _second.getDryLayout(loose)).$1;
  }

  @override
  void performLayout() {
    final loose = BoxConstraints(maxWidth: constraints.maxWidth);
    _first.layout(loose, parentUsesSize: true);
    _second.layout(loose, parentUsesSize: true);
    final (s, a, b) = _arrange(constraints, _first.size, _second.size);
    (_first.parentData! as _SplitData).offset = a;
    (_second.parentData! as _SplitData).offset = b;
    size = s;
  }

  @override
  void paint(PaintingContext context, Offset offset) => defaultPaint(context, offset);

  @override
  bool hitTestChildren(BoxHitTestResult result, {required Offset position}) => defaultHitTestChildren(result, position: position);
}
