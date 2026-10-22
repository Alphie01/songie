// games/song-guess/client/Controls.tsx: liste şeridi, zorluk hapları, canlı akış (nasıl oynanır: common.dart SgHowTo).
import 'package:flutter/material.dart';

import '../../shared/models.dart';
import '../../shared/text.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import 'common.dart';
import 'models.dart';
import 'strings.dart';

/// Songspot'taki tür şeridi: listeler arasında hızlı geçiş (oda sahibi).
/// Şerit sütunun kenar boşluğuna taşar (`margin: 0 -gutter; padding: 2px gutter 6px`); [gutter] o boşluk.
class SgPoolStrip extends StatefulWidget {
  const SgPoolStrip({super.key, required this.pools, required this.selected, required this.editable, required this.onPick, required this.gutter});
  final List<PoolInfo>? pools;
  final List<String> selected;
  final bool editable;
  final void Function(String id) onPick;
  final double gutter;

  @override
  State<SgPoolStrip> createState() => _SgPoolStripState();
}

class _SgPoolStripState extends State<SgPoolStrip> {
  final _scroll = ScrollController();
  final _viewport = GlobalKey();
  final Map<String, GlobalKey> _keys = {};

  @override
  void initState() {
    super.initState();
    _centerSoon();
  }

  @override
  void didUpdateWidget(SgPoolStrip old) {
    super.didUpdateWidget(old);
    final first = widget.selected.isEmpty ? null : widget.selected.first;
    final oldFirst = old.selected.isEmpty ? null : old.selected.first;
    if (first != oldFirst || widget.pools?.length != old.pools?.length) _centerSoon();
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  List<PoolInfo> get _order {
    final pools = widget.pools ?? const <PoolInfo>[];
    return [for (final c in poolCategories) ...pools.where((p) => p.category == c)];
  }

  /// `scrollIntoView({ block: 'nearest', inline: 'center' })`: seçili ilk liste şeridin ortasına gelir.
  void _centerSoon() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !_scroll.hasClients) return;
      final sel = widget.selected.toSet();
      PoolInfo? target;
      for (final p in _order) {
        if (sel.contains(p.id)) {
          target = p;
          break;
        }
      }
      final item = target == null ? null : _keys[target.id]?.currentContext?.findRenderObject();
      final viewport = _viewport.currentContext?.findRenderObject();
      if (item is! RenderBox || viewport is! RenderBox || !item.hasSize || !viewport.hasSize) return;
      final dx = item.localToGlobal(Offset.zero, ancestor: viewport).dx;
      final to = _scroll.offset + dx + item.size.width / 2 - viewport.size.width / 2;
      _scroll.jumpTo(to.clamp(0.0, _scroll.position.maxScrollExtent));
    });
  }

  @override
  Widget build(BuildContext context) {
    final order = _order;
    if (order.isEmpty) return const SizedBox.shrink();
    final sel = widget.selected.toSet();
    final items = <Widget>[];
    for (var i = 0; i < order.length; i++) {
      final p = order[i];
      final pressed = sel.contains(p.id);
      final key = _keys.putIfAbsent(p.id, GlobalKey.new);
      if (i > 0) items.add(const SizedBox(width: 6));
      items.add(
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (i > 0 && order[i - 1].category != p.category)
              Container(
                width: 2,
                height: 18,
                margin: const EdgeInsets.symmetric(horizontal: 4),
                decoration: BoxDecoration(color: C.line2, borderRadius: BorderRadius.circular(2)),
              ),
            Opacity(
              opacity: !widget.editable && !pressed ? 0.6 : 1,
              child: Pressable(
                onTap: widget.editable ? () => widget.onPick(p.id) : null,
                label: p.name,
                selected: pressed,
                builder: (context, _) => Container(
                  key: key,
                  constraints: const BoxConstraints(minHeight: 36),
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(
                    color: pressed ? C.yellow : C.panel,
                    border: Border.all(color: C.ink, width: 2),
                    borderRadius: BorderRadius.circular(10),
                    boxShadow: pressed ? hardShadow(0, 3) : null,
                  ),
                  child: Center(
                    widthFactor: 1,
                    child: Text(p.name, maxLines: 1, softWrap: false, style: T.b(13, color: pressed ? C.ink2 : C.text, weight: FontWeight.w800)),
                  ),
                ),
              ),
            ),
          ],
        ),
      );
    }
    return Semantics(
      label: SSettings.pools,
      container: true,
      child: SingleChildScrollView(
        key: _viewport,
        controller: _scroll,
        scrollDirection: Axis.horizontal,
        padding: EdgeInsets.fromLTRB(widget.gutter, 2, widget.gutter, 6),
        child: Row(crossAxisAlignment: CrossAxisAlignment.center, children: items),
      ),
    );
  }
}

/// `.pills`: zorluk seçimi; her zorluk kendi renginde (`--c`).
class SgDifficultyPills extends StatelessWidget {
  const SgDifficultyPills({super.key, required this.value, required this.editable, required this.onPick});
  final String value;
  final bool editable;
  final void Function(String d) onPick;

  @override
  Widget build(BuildContext context) => Semantics(
    label: SSettings.difficulty,
    container: true,
    child: Wrap(
      alignment: WrapAlignment.center,
      spacing: 6,
      runSpacing: 6,
      children: [
        for (final d in difficulties)
          Builder(
            builder: (context) {
              final pressed = value == d;
              final c = difficultyColor[d] ?? C.text;
              return Opacity(
                opacity: !editable && !pressed ? 0.6 : 1,
                child: Pressable(
                  onTap: editable ? () => onPick(d) : null,
                  label: S.difficulty[d] ?? d,
                  selected: pressed,
                  builder: (context, _) => Container(
                    constraints: const BoxConstraints(minHeight: 36),
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: pressed ? c : C.panel,
                      border: Border.all(color: C.ink, width: 2),
                      borderRadius: BorderRadius.circular(10),
                      boxShadow: pressed ? hardShadow(0, 3) : null,
                    ),
                    child: Center(
                      widthFactor: 1,
                      child: Text(S.difficulty[d] ?? d, style: T.b(13, color: pressed ? C.ink2 : c, weight: FontWeight.w800)),
                    ),
                  ),
                ),
              );
            },
          ),
      ],
    ),
  );
}

/// Akışta gösterilen en yeni olay sayısı.
const _feedMax = 4;

/// `.feed`: canlı akış kartı (yeniden eskiye, en fazla 4 olay).
class SgFeed extends StatelessWidget {
  const SgFeed({super.key, required this.items, required this.members, required this.clips, required this.meId});
  final List<FeedItem> items;
  final Map<String, RoomPlayer> members;
  final List<double> clips;
  final String meId;

  static Color _nameColor(String kind) => switch (kind) {
    'correct' => C.mint,
    'artist' => C.sky,
    'wrong' || 'skip' => C.red,
    'settings' => C.lilac,
    _ => C.text3,
  };

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) return const SizedBox.shrink();
    String name(String id) => id == meId ? SFeed.you : (members[id]?.nick ?? '?');
    final shown = items.reversed.take(_feedMax).toList();
    return Semantics(
      label: SFeed.title,
      liveRegion: true,
      container: true,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: C.panel2, border: Border.all(color: C.ink, width: bw), borderRadius: BorderRadius.circular(18)),
        child: VStack(
          gap: 6,
          children: [
            // h2: Baloo 2 (başlık yazı tipi), 12px, 1.5px aralık, büyük harf.
            Text(trUpper(SFeed.title), style: T.d(12, color: C.text3, height: 1.05, letterSpacing: 1.5)),
            VStack(
              gap: 6,
              children: [
                for (final f in shown)
                  Text.rich(
                    TextSpan(
                      children: [
                        TextSpan(text: name(f.playerId), style: TextStyle(fontWeight: FontWeight.w800, color: _nameColor(f.kind))),
                        TextSpan(text: ' ${SFeed.text(f.kind, clipShort(f.stage >= 0 && f.stage < clips.length ? clips[f.stage] : 0), f.text)}'),
                        if (f.points != null && f.points != 0) TextSpan(text: ' +${trNumber(f.points!)}', style: const TextStyle(color: C.yellow)),
                      ],
                    ),
                    style: T.b(14, color: C.text, weight: FontWeight.w700),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
