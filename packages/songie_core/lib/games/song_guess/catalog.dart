// SettingsPanel.tsx `#sgs-catalog`: kategorilere göre liste çipleri, eklenen listeyi çıkarma, Deezer/Spotify linkiyle ekleme.
import 'package:flutter/material.dart';

import '../../ui/icons.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/kit.dart';
import 'common.dart';
import 'models.dart';
import 'strings.dart';

class SgCatalog extends StatelessWidget {
  const SgCatalog({
    super.key,
    required this.pools,
    required this.selected,
    required this.onToggle,
    required this.onRemove,
    required this.url,
    required this.adding,
    required this.addMsg,
    required this.onAdd,
  });
  final List<PoolInfo>? pools;
  final List<String> selected;
  final void Function(String id) onToggle;
  final void Function(PoolInfo pool) onRemove;

  /// Ekleme formu (durumu panelde tutulur; katalog kapanıp açılınca kaybolmaz).
  final TextEditingController url;

  /// null | deezer | spotify
  final String? adding;
  final (String, bool)? addMsg;
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    final sel = selected.toSet();
    final list = pools ?? const <PoolInfo>[];
    final grouped = <(String, List<PoolInfo>)>[
      for (final c in poolCategories)
        if (list.any((p) => p.category == c)) (c, list.where((p) => p.category == c).toList()),
    ];
    final canAdd = url.text.trim().isNotEmpty && adding == null;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: C.panel, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(16)),
      child: VStack(
        gap: 14,
        children: [
          if (list.isEmpty)
            Text(SSettings.poolsLoading, style: sgsHint)
          else
            for (final (cat, items) in grouped)
              VStack(
                gap: 6,
                children: [
                  // h3: Baloo 2, 13px.
                  Text(S.categories[cat] ?? cat, style: T.d(13, color: C.text2, height: 1.05)),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      for (final p in items)
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Flexible(
                              child: SgChip(
                                label: p.name,
                                count: '${p.trackCount}',
                                selected: sel.contains(p.id),
                                minHeight: 40,
                                minWidth: 0,
                                fontSize: 14,
                                background: C.panel2,
                                onTap: () => onToggle(p.id),
                              ),
                            ),
                            if (p.custom && !sel.contains(p.id))
                              // `.sgs-chip-remove`: 32'lik yuvarlak, çipe 2px biner.
                              SizedBox(
                                width: 30,
                                height: 32,
                                child: OverflowBox(
                                  minWidth: 32,
                                  maxWidth: 32,
                                  alignment: Alignment.centerRight,
                                  child: Pressable(
                                    onTap: () => onRemove(p),
                                    label: SSettings.removeMine(p.name),
                                    builder: (context, _) => const SizedBox(
                                      width: 32,
                                      height: 32,
                                      child: Center(child: SIcon('x', size: 12, color: C.text3)),
                                    ),
                                  ),
                                ),
                              ),
                          ],
                        ),
                    ],
                  ),
                ],
              ),
          VStack(
            gap: 6,
            children: [
              Text(SSettings.addPool, style: T.b(13, color: C.text2, weight: FontWeight.w800)),
              Row(
                children: [
                  Expanded(
                    child: SInput(
                      controller: url,
                      placeholder: SSettings.addPoolPlaceholder,
                      minHeight: 40,
                      fontSize: 16,
                      keyboardType: TextInputType.url,
                      textCapitalization: TextCapitalization.none,
                      textInputAction: TextInputAction.go,
                      onSubmitted: (_) => canAdd ? onAdd() : null,
                    ),
                  ),
                  const SizedBox(width: 6),
                  SButton(
                    label: adding != null ? SSettings.adding : SSettings.addPoolButton,
                    tone: BtnTone.outline,
                    minHeight: 40,
                    onPressed: canAdd ? onAdd : null,
                  ),
                ],
              ),
              if (adding == 'spotify') Text(SSettings.addingSpotify, style: sgsHint),
              if (adding == null && addMsg == null) Text(SSettings.mineHint, style: sgsHint),
              if (addMsg != null)
                Semantics(liveRegion: true, child: addMsg!.$2 ? ErrorText(addMsg!.$1) : Text(addMsg!.$1, style: sgsHint)),
            ],
          ),
        ],
      ),
    );
  }
}
