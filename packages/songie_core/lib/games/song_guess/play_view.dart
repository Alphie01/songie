// games/song-guess/client/PlayView.tsx (+ song.css, game-layout.css `.sg*`).
// Masaüstü yan sütunları (`.sg-side`: skor listesi, ikinci ayar paneli, ses) 1100px altında gizli olduğundan taşınmadı;
// telefondaki karşılıkları `.sg-mobile-only` içindeki skor şeridi ve "Seçenekler" panelidir.
import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../audio/player.dart';
import '../../screens/shell.dart' show VolumeSlider;
import '../../shared/models.dart';
import '../../shared/text.dart';
import '../../ui/icons.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/game_module.dart';
import '../kit/kit.dart';
import 'common.dart';
import 'controls.dart';
import 'guess_box.dart';
import 'models.dart';
import 'podium.dart';
import 'pools.dart';
import 'progress_bar.dart';
import 'reveal.dart';
import 'settings_panel.dart';
import 'stage.dart';
import 'strings.dart';

class SongGuessPlayView extends StatefulWidget {
  const SongGuessPlayView({super.key, required this.props});
  final PlayViewProps props;

  @override
  State<SongGuessPlayView> createState() => _SongGuessPlayViewState();
}

class _SongGuessPlayViewState extends State<SongGuessPlayView> {
  /// Platformun ortak ses oynatıcısı (testte ya da sağlayıcı yoksa null: ses kapalı).
  AudioPlayerService? _player;
  late final PoolsLoader _pools = PoolsLoader(api: () => widget.props.api, onChange: () => mounted ? setState(() {}) : null);

  /// (metin, ton): wrong | artist | correct
  (String, String)? _feedback;
  bool _optionsOpen = false;
  final Set<String> _preloaded = {};

  @override
  void initState() {
    super.initState();
    try {
      _player = Provider.of<AudioPlayerService>(context, listen: false);
    } on ProviderNotFoundException {
      _player = null;
    }
    _player?.addListener(_onPlayer);
    _pools.watch(SongSettings.fromJson(widget.props.settings).pools);
    _effects(null, SongView.fromJson(widget.props.view));
  }

  @override
  void didUpdateWidget(SongGuessPlayView old) {
    super.didUpdateWidget(old);
    _pools.watch(SongSettings.fromJson(widget.props.settings).pools);
    _effects(SongView.fromJson(old.props.view), SongView.fromJson(widget.props.view));
  }

  @override
  void dispose() {
    _player?.removeListener(_onPlayer);
    _pools.dispose();
    // Oyundan çıkınca ses durur (web: unmount'ta player.stop()). Ağaç kilitliyken bildirim yapılmasın diye sonraya.
    final player = _player;
    if (player != null) scheduleMicrotask(() => player.stop());
    super.dispose();
  }

  void _onPlayer() {
    if (mounted) setState(() {});
  }

  static String? _stageUrl(SongView? v) => v != null && v.phase == 'stage' && v.stage < v.clips.length ? v.clips[v.stage] : null;
  static String? _previewUrl(SongView? v) => v != null && v.phase == 'reveal' ? v.reveal?.previewUrl : null;

  /// Web'deki effect'ler (çizimden sonra, aynı sırayla):
  /// yeni parça açılınca kendiliğinden çal; sonuçta tam önizlemeyi çal; geri sayım/podyum/yüklemede sus;
  /// tur ya da aşama değişince geri bildirimi sil. Açılmış klipler önceden indirilir (kısa klipler hemen başlasın).
  void _effects(SongView? old, SongView now) {
    final tasks = <void Function()>[];
    final stageUrl = _stageUrl(now);
    if ((old == null || stageUrl != _stageUrl(old)) && stageUrl != null) tasks.add(() => _player?.play(stageUrl));
    final previewUrl = _previewUrl(now);
    if ((old == null || previewUrl != _previewUrl(old)) && previewUrl != null && previewUrl.isNotEmpty) {
      tasks.add(() => _player?.play(previewUrl));
    }
    if ((old == null || old.phase != now.phase) && const {'countdown', 'podium', 'loading'}.contains(now.phase)) {
      tasks.add(() => _player?.stop());
    }
    for (final url in now.clips) {
      if (url != null && _preloaded.add(url)) tasks.add(() => _player?.load(url));
    }
    if (old != null && (old.round != now.round || old.stage != now.stage)) _feedback = null;
    if (tasks.isEmpty) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      for (final t in tasks) {
        t();
      }
    });
  }

  Future<void> _guess(SearchHit hit) async {
    final res = await widget.props.act({'type': 'guess', 'trackId': hit.id});
    if (!mounted) return;
    if (!res.ok) {
      setState(() => _feedback = (res.error, 'wrong'));
      return;
    }
    final verdict = res['verdict'] is String ? res['verdict'] as String : 'wrong';
    setState(() {
      _feedback = (
        verdict == 'correct'
            ? SPlay.verdictCorrect
            : verdict == 'artist'
            ? SPlay.verdictArtist(hit.title)
            : SPlay.verdictWrong('${hit.artist} – ${hit.title}'),
        verdict,
      );
    });
  }

  Future<void> _skip() async {
    final res = await widget.props.act({'type': 'skip'});
    if (!res.ok && mounted) setState(() => _feedback = (res.error, 'wrong'));
  }

  Future<void> _playUrl(String? url) async {
    final player = _player;
    if (url == null || player == null) return;
    if (player.playing?.url == url) return player.stop();
    // Web'de burada `player.unlock()` çağrılır; native'de otomatik oynatma engeli yok.
    await player.play(url);
  }

  static Color _tone(String tone) => switch (tone) {
    'wrong' || 'locked' => C.errorOnDark,
    'correct' => C.mint,
    'artist' => C.yellow,
    _ => C.text2,
  };

  @override
  Widget build(BuildContext context) {
    final p = widget.props;
    final view = SongView.fromJson(p.view);
    final settings = SongSettings.fromJson(p.settings);
    final members = membersOf(p.room);
    final isHost = p.room.hostId == p.meId;
    final player = _player;
    final playing = player?.playing;
    final blocked = player?.blocked ?? false;

    if (view.phase == 'podium') return SgPodium(view: view, room: p.room);

    final playingStage = playing == null ? -1 : view.clips.indexOf(playing.url);
    final unlockedStage = view.clips.lastIndexWhere((u) => u != null);
    final isLastStage = view.stage == view.stageClips.length - 1;
    PlayerLine? me;
    for (final x in view.players) {
      if (x.id == p.meId) me = x;
    }
    final waiting = view.players.where((x) => members[x.id]?.connected == true && x.state == 'listening').length;
    final shownStage = view.phase == 'stage' ? view.stage : view.startStage;
    final shownClip = shownStage >= 0 && shownStage < view.stageClips.length ? view.stageClips[shownStage] : 0.0;
    final hint = view.phase == 'countdown'
        ? SPlay.countdown
        : view.phase == 'loading'
        ? SPlay.loading
        : blocked
        ? SPlay.tapToListen
        : SPlay.stageHint(shownClip);
    final stageUrl = _stageUrl(view);
    final g = Layout.gutter(context);
    Widget pad(Widget w) => Padding(padding: EdgeInsets.symmetric(horizontal: g), child: w);

    // ---------------------------------------------------------------- üst kısım
    final top = <Widget>[
      // `.song-top`: pembe tur hapı + oda kodu.
      Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Flexible(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
              decoration: BoxDecoration(color: C.pink, border: Border.all(color: C.ink, width: bw), borderRadius: BorderRadius.circular(R.pill)),
              child: Text(
                '${SPlay.round(math.max(view.round, 1), view.totalRounds)}${me != null && view.totalRounds == null && me.streak > 1 ? ' ×${me.streak}' : ''}',
                maxLines: 1,
                style: T.d(16, color: C.ink2, height: 1.1),
              ),
            ),
          ),
          Text(p.room.code, style: T.b(13, color: C.text3, weight: FontWeight.w800, letterSpacing: 2)),
        ],
      ),
    ];

    if (view.phase == 'reveal' && view.reveal != null) {
      top.add(
        SgReveal(
          view: view,
          members: members,
          meId: p.meId,
          isHost: isHost,
          act: p.act,
          playing: playing != null && playingStage < 0,
          onTogglePreview: () {
            final pl = _player;
            if (pl == null) return;
            if (pl.playing != null && !view.clips.contains(pl.playing!.url)) {
              pl.stop();
            } else {
              pl.play(view.reveal!.previewUrl);
            }
          },
        ),
      );
    } else {
      top.add(
        SgProgressBar(
          clips: view.stageClips,
          unlocked: unlockedStage,
          current: shownStage,
          playing: playing != null && playingStage >= 0 ? (stage: playingStage, duration: playing.duration.inMicroseconds / 1e6, key: playing.key) : null,
          onPick: (i) => _playUrl(i < view.clips.length ? view.clips[i] : null),
        ),
      );
      top.add(SgStage(view: view, hint: hint, playingStage: playingStage, blocked: blocked, onPlay: () => _playUrl(stageUrl)));

      // `.sg-answer`: arama + pas.
      top.add(
        Row(
          children: [
            Expanded(
              child: SgGuessBox(
                api: p.api,
                disabled: !view.me.canGuess,
                placeholder: view.me.canGuess || view.phase != 'stage' ? SPlay.searchPlaceholder : (SPlay.states[view.me.state] ?? ''),
                pools: view.easySearch ? view.pools : null,
                onPick: _guess,
              ),
            ),
            const SizedBox(width: 8),
            ConstrainedBox(
              constraints: const BoxConstraints(minWidth: 86),
              child: SButton(
                label: isLastStage ? SPlay.giveUp : SPlay.skip,
                tone: BtnTone.yellow,
                minHeight: 58,
                radius: 18,
                shadowY: 5,
                pressY: 4,
                fontSize: 19,
                padding: const EdgeInsets.symmetric(horizontal: 14),
                onPressed: view.me.canGuess ? _skip : null,
              ),
            ),
          ],
        ),
      );

      // `.sg-status` (boşsa hiç yer kaplamaz).
      final status = <Widget>[];
      final fb = _feedback;
      if (fb != null) {
        status.add(Text(fb.$1, textAlign: TextAlign.center, style: T.b(14, color: _tone(fb.$2), weight: FontWeight.w700)));
      } else if (view.phase == 'stage' && !view.me.canGuess) {
        final text = SPlay.states[view.me.state] ?? '';
        status.add(
          text.isEmpty ? const SizedBox.shrink() : Text(text, textAlign: TextAlign.center, style: T.b(14, color: _tone(view.me.state), weight: FontWeight.w700)),
        );
      }
      final waitStyle = T.b(14, color: C.text2, weight: FontWeight.w700);
      if (view.phase == 'stage' && !view.timed && waiting > 0 && !view.me.canGuess) {
        status.add(Text(SPlay.waiting(waiting), textAlign: TextAlign.center, style: waitStyle));
      }
      if (view.phase == 'stage' && !view.me.canGuess && unlockedStage > 0) {
        status.add(Text(SPlay.replayHint, textAlign: TextAlign.center, style: waitStyle));
      }
      if (status.isNotEmpty) top.add(Semantics(liveRegion: true, child: VStack(gap: 4, children: status)));

      // `.sg-history`: bu şarkıdaki tahminlerin.
      if (view.me.guesses.isNotEmpty) {
        final stageStyle = T.b(14, color: C.text3, weight: FontWeight.w800);
        final ch4 = chWidth(context, stageStyle) * 4;
        top.add(
          VStack(
            gap: 6,
            children: [
              for (final guess in view.me.guesses)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(color: C.panel, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(12)),
                  child: Row(
                    children: [
                      SizedBox(
                        width: ch4,
                        child: Text(
                          clipShort(guess.stage >= 0 && guess.stage < view.stageClips.length ? view.stageClips[guess.stage] : 0),
                          maxLines: 1,
                          softWrap: false,
                          overflow: TextOverflow.visible,
                          style: stageStyle,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          '${guess.artist} – ${guess.title}',
                          maxLines: 1,
                          softWrap: false,
                          overflow: TextOverflow.ellipsis,
                          style: T.b(14, color: C.text2, weight: FontWeight.w700),
                        ),
                      ),
                      const SizedBox(width: 10),
                      SIcon(
                        guess.verdict == 'correct' ? 'check' : 'x',
                        size: 14,
                        color: switch (guess.verdict) {
                          'correct' => C.mint,
                          'artist' => C.yellow,
                          _ => C.errorOnDark,
                        },
                      ),
                    ],
                  ),
                ),
            ],
          ),
        );
      }

      if (isHost && view.phase == 'stage' && !view.timed && view.players.length > 1) {
        top.add(Center(child: SgGhost(label: SPlay.advance, onPressed: () => p.act({'type': 'advance'}))));
      }
    }

    if (view.feed.isNotEmpty) top.add(SgFeed(items: view.feed, members: members, clips: view.stageClips, meId: p.meId));

    // ---------------------------------------------------------------- alt kısım
    final pools = _pools.pools ?? const <PoolInfo>[];
    final quick = <Widget>[
      if (pools.isNotEmpty)
        SgPoolStrip(
          pools: pools,
          selected: settings.pools,
          editable: isHost,
          gutter: g,
          onPick: (id) => p.setSettings({
            ...p.settings,
            'pools': [id],
          }),
        ),
      pad(SgDifficultyPills(value: settings.difficulty, editable: isHost, onPick: (d) => p.setSettings({...p.settings, 'difficulty': d}))),
      if (isHost) pad(Text(SSettings.liveHint, textAlign: TextAlign.center, style: T.b(12, color: C.text3, weight: FontWeight.w700))),
    ];

    final bottom = <Widget>[
      pad(_ScoreStrip(view: view, members: members, meId: p.meId)),
      VStack(gap: 10, children: quick),
      pad(
        VStack(
          gap: 12,
          children: [
            Pressable(
              onTap: () => setState(() => _optionsOpen = !_optionsOpen),
              label: SSettings.options,
              selected: _optionsOpen,
              builder: (context, _) => Container(
                constraints: const BoxConstraints(minHeight: 44),
                padding: const EdgeInsets.only(left: 14, right: 12),
                decoration: BoxDecoration(color: C.panel, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(R.sm)),
                child: Row(
                  children: [
                    Expanded(
                      child: DefaultTextStyle.merge(
                        style: T.b(15, color: C.text2, weight: FontWeight.w700),
                        child: const Align(alignment: Alignment.centerLeft, child: SgOptIcon(icon: 'menu', size: 14, label: SSettings.options)),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Transform.rotate(angle: _optionsOpen ? math.pi : 0, child: const SIcon('chevron', size: 14, color: C.text2)),
                  ],
                ),
              ),
            ),
            if (_optionsOpen)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(color: C.panel2, border: Border.all(color: C.ink, width: bw), borderRadius: BorderRadius.circular(20)),
                child: VStack(
                  gap: 18,
                  children: [
                    SongGuessSettingsPanel(
                      props: SettingsPanelProps(
                        settings: p.settings,
                        editable: isHost,
                        api: p.api,
                        players: p.room.players,
                        meId: p.meId,
                        onChange: (n) => p.setSettings(n),
                      ),
                    ),
                    // `.sg-volume`: "SES" + sürgü (kabuktaki ses sürgüsü).
                    VStack(
                      gap: 12,
                      children: [
                        const Eyebrow(SSettings.volume),
                        VolumeSlider(value: player?.volume ?? 0.8, onChanged: (v) => _player?.setVolume(v)),
                      ],
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
      pad(const SgHowTo()),
    ];

    List<Widget> gapped(List<Widget> items) {
      final out = <Widget>[];
      for (final w in items) {
        if (out.isNotEmpty) out.add(const SizedBox(height: 14));
        out.add(w);
      }
      return out;
    }

    // `.sg` + `.song .sg-center`: üstte 72, altta 24, en fazla 440 genişlik, aralık 14, en az ekran boyu;
    // `.song-spacer` (esnek boşluk) üst ve alt kısım arasında, iki yanında da 14 aralıkla.
    return Align(
      alignment: Alignment.topCenter,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: 440 + 2 * g),
        child: Padding(
          padding: const EdgeInsets.only(top: 72, bottom: 24),
          child: ConstrainedBox(
            constraints: BoxConstraints(minHeight: math.max(0, viewportHeight(context) - 96)),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [...gapped(top.map(pad).toList()), const SizedBox(height: 14)]),
                Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [const SizedBox(height: 14), ...gapped(bottom)]),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// `.song-strip`: mobilde alttaki skor şeridi (`repeat(auto-fit, minmax(72px, 1fr))`, aralık 6); lider nane, sen sarı.
class _ScoreStrip extends StatelessWidget {
  const _ScoreStrip({required this.view, required this.members, required this.meId});
  final SongView view;
  final Map<String, RoomPlayer> members;
  final String meId;

  @override
  Widget build(BuildContext context) {
    final lines = stableSorted(view.players, (a, b) => b.score - a.score);
    final cells = <Widget>[];
    for (var i = 0; i < lines.length; i++) {
      final pl = lines[i];
      final m = members[pl.id];
      if (m == null) continue;
      final mine = pl.id == meId;
      final first = i == 0 && pl.score > 0 && !mine;
      final bg = mine ? C.yellow : (first ? C.mint : C.panel);
      final fg = mine || first ? C.ink2 : C.text;
      cells.add(
        Opacity(
          opacity: m.connected ? 1 : 0.6,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 7),
            decoration: BoxDecoration(color: bg, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(12)),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  '${mine ? SPlay.scoreYou : m.nick}${pl.streak > 1 ? ' ×${pl.streak}' : ''}',
                  maxLines: 1,
                  softWrap: false,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                  style: T.b(12, color: fg, weight: FontWeight.w800),
                ),
                Text(trNumber(pl.score), textAlign: TextAlign.center, style: T.d(16, color: fg, height: 1.2)),
              ],
            ),
          ),
        ),
      );
    }
    if (cells.isEmpty) return const SizedBox.shrink();
    return Semantics(
      label: SPlay.scores,
      container: true,
      child: LayoutBuilder(
        builder: (context, cons) {
          const gap = 6.0;
          final w = cons.maxWidth;
          // auto-fit: sığan kadar 72'lik sütun; öğe azsa boş sütunlar kapanır, kalanlar genişler.
          final cols = math.max(1, math.min(cells.length, ((w + gap) / (72 + gap)).floor()));
          final colW = (w - (cols - 1) * gap) / cols;
          final rows = <Widget>[];
          for (var i = 0; i < cells.length; i += cols) {
            final row = <Widget>[];
            for (var c = 0; c < cols; c++) {
              if (c > 0) row.add(const SizedBox(width: gap));
              row.add(SizedBox(width: colW, child: i + c < cells.length ? cells[i + c] : null));
            }
            rows.add(IntrinsicHeight(child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: row)));
          }
          return VStack(gap: gap, children: rows);
        },
      ),
    );
  }
}
