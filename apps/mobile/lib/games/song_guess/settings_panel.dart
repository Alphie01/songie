// games/song-guess/client/SettingsPanel.tsx (+ song.css `.song-sgs`, game-layout.css `.sgs*`).
import 'package:flutter/material.dart';

import '../../session/api.dart';
import '../../shared/models.dart';
import '../../ui/icons.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/game_module.dart';
import '../kit/kit.dart';
import 'catalog.dart';
import 'common.dart';
import 'models.dart';
import 'pools.dart';
import 'strings.dart';

class SongGuessSettingsPanel extends StatefulWidget {
  const SongGuessSettingsPanel({super.key, required this.props});
  final SettingsPanelProps props;

  @override
  State<SongGuessSettingsPanel> createState() => _SongGuessSettingsPanelState();
}

class _SongGuessSettingsPanelState extends State<SongGuessSettingsPanel> {
  late final PoolsLoader _pools = PoolsLoader(api: () => widget.props.api, onChange: () => mounted ? setState(() {}) : null);
  bool _browsing = false;
  final _url = TextEditingController();

  /// null | deezer | spotify
  String? _adding;
  (String, bool)? _addMsg;

  @override
  void initState() {
    super.initState();
    _url.addListener(() => setState(() {}));
    _watchPools();
  }

  @override
  void didUpdateWidget(SongGuessSettingsPanel old) {
    super.didUpdateWidget(old);
    _watchPools();
  }

  void _watchPools() {
    if (widget.props.showPrimary) _pools.watch(SongSettings.fromJson(widget.props.settings).pools);
  }

  @override
  void dispose() {
    _pools.dispose();
    _url.dispose();
    super.dispose();
  }

  /// `set(patch)`: yalnızca oda sahibi; mevcut ayarların üstüne yazar.
  void _set(Json patch) {
    final p = widget.props;
    if (p.editable) p.onChange({...p.settings, ...patch});
  }

  void _togglePool(SongSettings s, String id) {
    final next = s.pools.contains(id) ? s.pools.where((x) => x != id).toList() : [...s.pools, id];
    if (next.isNotEmpty) _set({'pools': next});
  }

  /// Deezer ya da Spotify playlist linkiyle liste ekler; eklenen liste tek başına seçilir.
  Future<void> _addPool() async {
    final url = _url.text;
    final spotify = RegExp('spotify', caseSensitive: false).hasMatch(url);
    setState(() {
      _adding = spotify ? 'spotify' : 'deezer';
      _addMsg = null;
    });
    try {
      final res = await widget.props.api.post('/pools', {'url': url});
      if (!mounted) return;
      final pool = PoolInfo.fromJson(res.obj('pool'));
      _pools.update((ps) => [...(ps ?? const <PoolInfo>[]).where((x) => x.id != pool.id), pool]);
      // Yeni eklenen liste tek başına seçilir; diğer listeler istenirse katalogdan yeniden eklenir.
      _set({
        'pools': [pool.id],
      });
      final total = res.intOrNull('total');
      setState(() {
        _addMsg = (
          total != null ? SSettings.addedSpotify(pool.name, res.intOrNull('matched') ?? pool.trackCount, total) : SSettings.added(pool.name, pool.trackCount),
          false,
        );
      });
      _url.clear();
    } on ApiError catch (e) {
      if (mounted) setState(() => _addMsg = (e.message, true));
    } on Object {
      if (mounted) setState(() => _addMsg = (SSettings.addFailed, true));
    } finally {
      if (mounted) setState(() => _adding = null);
    }
  }

  /// Eklediğin listeyi kendi listelerinden çıkarır (web: hata olursa sessizce kalır).
  Future<void> _removePool(PoolInfo pool) async {
    try {
      await widget.props.api.post('/pools/${Uri.encodeComponent(pool.id)}/remove', <String, dynamic>{});
      _pools.update((ps) => (ps ?? const <PoolInfo>[]).where((x) => x.id != pool.id).toList());
    } on Object {
      // web'de de yakalanmaz; liste olduğu gibi kalır
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.props;
    final s = SongSettings.fromJson(p.settings);
    final byId = {for (final x in _pools.pools ?? const <PoolInfo>[]) x.id: x};
    final editable = p.editable;
    final items = <Widget>[];

    if (p.showPrimary) {
      if (!editable) items.add(const SgReadOnly(SSettings.readOnly));
      items.add(
        sgGroup(
          SSettings.pools,
          VStack(
            gap: 8,
            children: [
              VStack(
                gap: 6,
                children: [
                  for (final id in s.pools)
                    Semantics(
                      hint: editable && s.pools.length > 1 ? SSettings.removePool : null,
                      child: SOption(
                        selected: true,
                        onPressed: !editable || s.pools.length == 1 ? null : () => _togglePool(s, id),
                        trailing: editable && s.pools.length > 1 ? const SIcon('x', size: 14) : null,
                        child: Text(byId[id]?.name ?? id, maxLines: 1, softWrap: false, overflow: TextOverflow.ellipsis),
                      ),
                    ),
                ],
              ),
              if (editable)
                BrowseToggle(
                  label: _browsing ? SSettings.closeCatalog : SSettings.openCatalog,
                  open: _browsing,
                  onTap: () => setState(() => _browsing = !_browsing),
                ),
              if (editable && _browsing)
                SgCatalog(
                  pools: _pools.pools,
                  selected: s.pools,
                  onToggle: (id) => _togglePool(s, id),
                  onRemove: _removePool,
                  url: _url,
                  adding: _adding,
                  addMsg: _addMsg,
                  onAdd: _addPool,
                ),
            ],
          ),
        ),
      );
      items.add(
        sgGroup(
          SSettings.difficulty,
          hint: S.difficultyHint[s.difficulty],
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              for (final d in difficulties)
                SgChip(
                  label: S.difficulty[d] ?? d,
                  selected: s.difficulty == d,
                  // Zorluk: seçili olan kendi renginde dolu, diğerlerinin yazısı o renkte.
                  foreground: difficultyColor[d] ?? C.text,
                  selectedBackground: difficultyColor[d] ?? C.yellow,
                  onTap: editable ? () => _set({'difficulty': d}) : null,
                ),
            ],
          ),
        ),
      );
      items.add(
        sgGroup(
          SSettings.rounds,
          hint: s.rounds == 0 ? SSettings.unlimitedHint : null,
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              for (final n in roundOptions)
                SgChip(label: n == 0 ? SSettings.unlimited : '$n', selected: s.rounds == n, onTap: editable ? () => _set({'rounds': n}) : null),
            ],
          ),
        ),
      );
    }

    if (p.showSecondary) {
      items.add(
        sgGroup(
          SSettings.timer,
          hint: s.timer == 0 ? SSettings.timerHintOff : SSettings.timerHintOn(s.timer),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              for (final n in timerOptions)
                SgChip(
                  label: n == 0 ? SSettings.timerOff : SSettings.timerSec(n),
                  selected: s.timer == n,
                  onTap: editable ? () => _set({'timer': n}) : null,
                ),
            ],
          ),
        ),
      );
      items.add(
        sgGroup(
          SSettings.playback,
          VStack(
            gap: 6,
            children: [
              SOption(
                selected: s.startAt == 'start',
                onPressed: editable ? () => _set({'startAt': 'start'}) : null,
                child: const SgOptIcon(icon: 'play', size: 12, label: SSettings.startBeginning),
              ),
              SOption(
                selected: s.startAt == 'random',
                onPressed: editable ? () => _set({'startAt': 'random'}) : null,
                child: const SgOptIcon(icon: 'music', size: 13, label: SSettings.startRandom),
              ),
            ],
          ),
        ),
      );
      items.add(
        sgGroup(
          SSettings.search,
          hint: SSettings.easySearchHint,
          SgToggle(
            label: SSettings.easySearch,
            value: s.easySearch,
            onChanged: editable ? (_) => _set({'easySearch': !s.easySearch}) : null,
            child: const SgOptIcon(icon: 'search', size: 13, label: SSettings.easySearch),
          ),
        ),
      );
      items.add(
        sgGroup(
          SSettings.guessAfter,
          Row(
            children: [
              for (var i = 0; i < stageClipsDefault.length; i++) ...[
                if (i > 0) const SizedBox(width: 6),
                Expanded(
                  child: SgChip(
                    label: clipShort(stageClipsDefault[i]),
                    selected: s.startStage == i,
                    minWidth: 0,
                    mono: true,
                    expand: true,
                    onTap: editable ? () => _set({'startStage': i}) : null,
                  ),
                ),
              ],
            ],
          ),
        ),
      );
      items.add(
        sgGroup(
          SSettings.artist,
          hint: SSettings.artistHint,
          SToggle(
            label: s.artistCredit ? SSettings.on : SSettings.off,
            value: s.artistCredit,
            onChanged: editable ? (_) => _set({'artistCredit': !s.artistCredit}) : null,
          ),
        ),
      );
    }

    return VStack(gap: 16, children: items);
  }
}
