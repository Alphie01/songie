import 'package:flutter/material.dart';

import '../../session/api.dart';
import '../../shared/models.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/game_module.dart';
import '../kit/kit.dart';
import 'models.dart';
import 'strings.dart';

/// `.sgs-legend.fs-legend` (14px, 700, text-2; alt boşluk 8).
final _legend = SettingsGroup.plainLegend();
final _hint = SettingsGroup.defaultHint();

Widget _group(String title, Widget child, {String? hint}) => SettingsGroup(title: title, legendStyle: _legend, legendGap: 8, hint: hint, child: child);

/// `.fs-set-row`: solda ad, sağda seçenekler (sığmazsa alt satıra iner); ipucu tam satır.
class _SetRow extends StatelessWidget {
  const _SetRow({required this.title, required this.child, this.hint});
  final String title;
  final Widget child;
  final String? hint;

  @override
  Widget build(BuildContext context) => VStack(
    gap: 8,
    children: [
      Semantics(
        container: true,
        label: title,
        child: Wrap(
          alignment: WrapAlignment.spaceBetween,
          crossAxisAlignment: WrapCrossAlignment.center,
          spacing: 8,
          runSpacing: 8,
          children: [
            Text(title, style: _legend),
            child,
          ],
        ),
      ),
      if (hint != null) Text(hint!, style: _hint),
    ],
  );
}

/// `.fs-set-opts .chips`: sağa yaslı, 4px aralık.
Widget _opts(List<Widget> chips) => Wrap(alignment: WrapAlignment.end, spacing: 4, runSpacing: 4, children: chips);

/// `.toggle` (`.fs-set-row .toggle`: genişlik içeriğe göre, en az 120px).
class _InlineToggle extends StatelessWidget {
  const _InlineToggle({required this.on, required this.label, this.onTap});
  final bool on;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => Pressable(
    onTap: onTap,
    label: label,
    selected: on,
    builder: (context, _) => ConstrainedBox(
      constraints: const BoxConstraints(minWidth: 120),
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

/// games/five-seconds/client/SettingsPanel.tsx
class FiveSecondsSettingsPanel extends StatefulWidget {
  const FiveSecondsSettingsPanel({super.key, required this.props});
  final SettingsPanelProps props;

  @override
  State<FiveSecondsSettingsPanel> createState() => _FiveSecondsSettingsPanelState();
}

class _FiveSecondsSettingsPanelState extends State<FiveSecondsSettingsPanel> {
  List<CategoryInfo>? _categories;

  @override
  void initState() {
    super.initState();
    if (widget.props.showPrimary) _load();
  }

  @override
  void didUpdateWidget(FiveSecondsSettingsPanel old) {
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
    final s = FiveSecondsSettings.fromJson(p.settings);
    void set(Json patch) {
      if (p.editable) p.onChange({...p.settings, ...patch});
    }

    final items = <Widget>[];
    if (p.showPrimary) {
      if (!p.editable) items.add(const ReadOnlyNote(SSettings.readOnly));
      items.add(
        _group(
          SSettings.mode,
          hint: s.teamMode ? null : SSettings.modeHint,
          SChips(
            children: [
              SettingChip(label: SSettings.solo, selected: !s.teamMode, onTap: p.editable ? () => set({'teamMode': false}) : null),
              SettingChip(label: SSettings.teams, selected: s.teamMode, onTap: p.editable ? () => set({'teamMode': true}) : null),
            ],
          ),
        ),
      );
      if (s.teamMode) items.add(_TeamsEditor(props: p, settings: s, set: set));
      final adult = s.categories.any(isAdultCategory);
      items.add(
        _group(
          SSettings.categories,
          hint: adult
              ? (s.categories.contains(coupleCategory) ? '${SSettings.adultHint} ${SSettings.coupleHint}' : SSettings.adultHint)
              : SSettings.categoriesHint,
          SChips(
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
        _SetRow(
          title: SSettings.seconds,
          child: _opts([
            for (final n in secondsOptions)
              SettingChip(label: SSettings.sec(n), selected: s.seconds == n, onTap: p.editable ? () => set({'seconds': n}) : null),
          ]),
        ),
      );
      items.add(
        _SetRow(
          title: SSettings.rounds,
          hint: SSettings.roundsHint(s.rounds),
          child: _opts([
            for (final n in roundOptions)
              SettingChip(label: n == 0 ? SSettings.unlimited : '$n', selected: s.rounds == n, onTap: p.editable ? () => set({'rounds': n}) : null),
          ]),
        ),
      );
      items.add(
        _SetRow(
          title: SSettings.steal,
          hint: SSettings.stealHint,
          child: _InlineToggle(on: s.steal, label: SSettings.steal, onTap: p.editable ? () => set({'steal': !s.steal}) : null),
        ),
      );
      items.add(_AddPrompt(api: p.api));
    }
    return VStack(gap: 22, children: items);
  }
}

/// Takım modu: yeşil, mor ve takımsız kutuları; oyuncuya dokununca takımı değişir.
class _TeamsEditor extends StatelessWidget {
  const _TeamsEditor({required this.props, required this.settings, required this.set});
  final SettingsPanelProps props;
  final FiveSecondsSettings settings;
  final void Function(Json patch) set;

  @override
  Widget build(BuildContext context) {
    final p = props;
    final present = {for (final pl in p.players) pl.id};
    final teamA = settings.teamA.where(present.contains).toList();
    final teamB = settings.teamB.where((id) => present.contains(id) && !teamA.contains(id)).toList();
    final unassigned = [
      for (final pl in p.players)
        if (!teamA.contains(pl.id) && !teamB.contains(pl.id)) pl.id,
    ];
    final byId = {for (final pl in p.players) pl.id: pl};

    // Takımsız → yeşil → mor → takımsız döngüsü.
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

    Widget box(String? team, List<String> ids) {
      final fg = team == null ? C.text : C.ink2;
      final content = VStack(
        gap: 6,
        children: [
          Text.rich(
            TextSpan(
              text: '${team == null ? SSettings.unassigned : S.team(team)} ',
              children: [
                TextSpan(
                  text: '${ids.length}',
                  style: T.b(13, color: fg.withValues(alpha: 0.7), weight: FontWeight.w800),
                ),
              ],
            ),
            style: T.d(16, color: fg, height: 1.45),
          ),
          if (ids.isEmpty)
            Opacity(
              opacity: 0.75,
              child: Text(
                SSettings.empty,
                style: T.b(13, color: fg, weight: FontWeight.w700),
              ),
            )
          else
            for (final id in ids)
              if (byId[id] case final pl?) _TeamPlayer(player: pl, isMe: id == p.meId, color: fg, onTap: p.editable ? () => cycle(id) : null),
        ],
      );
      if (team == null) return DashedBox(color: C.violet, radius: 18, width: 3, padding: const EdgeInsets.all(10), child: content);
      return Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: team == 'b' ? C.lilac : C.mint,
          border: Border.all(color: C.ink, width: bw),
          borderRadius: BorderRadius.circular(18),
        ),
        child: content,
      );
    }

    final enough = teamA.length >= 2 && teamB.length >= 2;
    return VStack(
      gap: 8,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Flexible(child: Text(SSettings.teamsTitle, style: _legend)),
            if (p.editable) ...[const SizedBox(width: 8), _ShuffleButton(onTap: shuffleTeams)],
          ],
        ),
        Grid2(columnGap: 10, rowGap: 10, equalHeight: true, children: [box('a', teamA), box('b', teamB)]),
        if (unassigned.isNotEmpty) box(null, unassigned),
        Text(enough ? SSettings.teamsHint : '${SSettings.needTwo} ${SSettings.teamsHint}', style: _hint),
      ],
    );
  }
}

/// `.fs-shuffle`: görünen 36px düğme.
class _ShuffleButton extends StatelessWidget {
  const _ShuffleButton({required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Pressable(
    onTap: onTap,
    label: SSettings.shuffleLabel,
    builder: (context, _) => Container(
      constraints: const BoxConstraints(minHeight: 36),
      padding: const EdgeInsets.symmetric(horizontal: 12),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: C.panel,
        border: Border.all(color: C.ink, width: 2),
        borderRadius: BorderRadius.circular(10),
      ),
      child: ExcludeSemantics(
        child: Text(
          SSettings.shuffle,
          style: T.b(13, color: C.text, weight: FontWeight.w800),
        ),
      ),
    ),
  );
}

/// `.fs-player`: 44px dokunma alanı, üst ve alttan −5px taşar (görünen satır 34px yer kaplar).
class _TeamPlayer extends StatelessWidget {
  const _TeamPlayer({required this.player, required this.isMe, required this.color, this.onTap});
  final RoomPlayer player;
  final bool isMe;
  final Color color;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final name = isMe ? '${player.nick} (sen)' : player.nick;
    return SizedBox(
      height: 34,
      child: OverflowBox(
        minHeight: 44,
        maxHeight: 44,
        child: Pressable(
          onTap: onTap,
          label: name,
          builder: (context, _) => Opacity(
            opacity: player.connected ? 1 : 0.6,
            child: SizedBox(
              height: 44,
              child: Row(
                children: [
                  SAvatar(avatar: player.avatar, nick: player.nick, size: 26),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        name,
                        style: T.b(14, color: color, weight: FontWeight.w800),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ),
                  if (!player.connected) ...[
                    const SizedBox(width: 6),
                    Text(
                      SPlay.offline,
                      style: T.b(10, color: color, weight: FontWeight.w800),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Her oyuncu görev ekleyebilir; eklenen görevler hiçbir ekranda listelenmez.
class _AddPrompt extends StatefulWidget {
  const _AddPrompt({required this.api});
  final GameApi api;

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
    } on ApiError catch (e) {
      if (mounted) setState(() => _msg = (e.message.isNotEmpty ? e.message : SSettings.failed, true));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final canSave = !_busy && _text.text.trim().length >= 8;
    return _group(
      SSettings.addPrompt,
      hint: SSettings.addPromptHint,
      VStack(
        gap: 8,
        children: [
          BrowseToggle(label: SSettings.addPrompt, open: _open, onTap: () => setState(() => _open = !_open)),
          if (_open) ...[
            SInput(
              controller: _text,
              placeholder: SSettings.promptPlaceholder,
              label: SSettings.promptLabel,
              maxLength: 120,
              onSubmitted: (_) => canSave ? _submit() : null,
            ),
            SButton(label: _busy ? SSettings.saving : SSettings.save, tone: BtnTone.outline, block: true, onPressed: canSave ? _submit : null),
            if (_msg != null) _msg!.$2 ? ErrorText(_msg!.$1) : Text(_msg!.$1, style: _hint),
          ],
        ],
      ),
    );
  }
}
