// Bits.tsx'teki ses oynatıcılar: ortak anlatıcı (bölüm sahnesi kapansa da çalmaya devam eder),
// belge kayıtları (dalga formlu oynatıcı) ve sorgu kayıtları (MiniPlay). Hiçbiri kendiliğinden çalmaz;
// oynatıcı ilk dokunuşta kurulur. Testte (FLUTTER_TEST) ses yüklenmez.
import 'dart:async';
import 'dart:io' show Platform;
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:just_audio/just_audio.dart';

import '../../config.dart';
import '../../ui/icons.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import 'bits.dart';
import 'desk.dart';
import 'strings.dart';

final bool _inTest = () {
  try {
    return Platform.environment.containsKey('FLUTTER_TEST');
  } on Object {
    return false;
  }
}();

String fmtTime(Duration? d) {
  if (d == null || d.isNegative) return '0:00';
  final sec = d.inSeconds;
  return '${sec ~/ 60}:${(sec % 60).toString().padLeft(2, '0')}';
}

bool _isPlaying(AudioPlayer? p) => p != null && p.playing && p.processingState != ProcessingState.completed;

// ---------------------------------------------------------------- Anlatıcı

/// Web'deki paylaşılan `HTMLAudioElement`: tek anlatıcı, ekranlardan bağımsız.
/// Anahtar vaka + bölümdür (adres sunucu yeniden başlayınca değişir).
class NarrationController extends ChangeNotifier {
  NarrationController._();
  static final instance = NarrationController._();

  AudioPlayer? _player;
  final List<StreamSubscription<Object?>> _subs = [];
  String? _key;
  String? _url;

  /// Masadaki düğmede görünen ad ("Bölüm 2 / 3").
  String label = '';

  /// Yüklenemeyen anlatının anahtarı.
  String? failedKey;

  bool isMine(String key) => _key == key;
  bool get playing => _isPlaying(_player);
  Duration get position => _player?.position ?? Duration.zero;
  Duration get duration => _player?.duration ?? Duration.zero;

  AudioPlayer _ensure() {
    final existing = _player;
    if (existing != null) return existing;
    final p = AudioPlayer();
    _subs
      ..add(p.playerStateStream.listen((_) => notifyListeners(), onError: (Object _) => _fail()))
      ..add(p.positionStream.listen((_) => notifyListeners()))
      ..add(p.durationStream.listen((_) => notifyListeners()))
      ..add(p.playbackEventStream.listen((_) {}, onError: (Object _) => _fail()));
    _player = p;
    return p;
  }

  void _fail() {
    failedKey = _key;
    notifyListeners();
  }

  /// Oynat / duraklat. Başka bir bölümün anlatısı yüklüyse ona geçer. Yüklenemezse false.
  Future<bool> toggle({required String key, required String url, required String label}) async {
    if (_inTest) return false;
    final p = _ensure();
    try {
      if (_key != key) {
        if (p.playing) await p.pause();
        _key = key;
        _url = url;
        this.label = label;
        failedKey = null;
        notifyListeners();
        await p.setUrl(mediaUrl(url));
      } else if (_url != url && !playing) {
        final at = p.position;
        _url = url;
        await p.setUrl(mediaUrl(url));
        await p.seek(at);
      }
      if (playing) {
        await p.pause();
      } else {
        if (p.processingState == ProcessingState.completed) await p.seek(Duration.zero);
        unawaited(p.play().catchError((Object _) => _fail()));
      }
      return true;
    } on Object {
      _fail();
      return false;
    }
  }

  void seek(Duration to) {
    final p = _player;
    final d = p?.duration;
    if (p == null || d == null || d == Duration.zero) return;
    unawaited(p.seek(Duration(milliseconds: to.inMilliseconds.clamp(0, d.inMilliseconds))));
  }

  /// Odadan çıkınca ya da masadaki "Durdur" ile susar (`audio.pause()`).
  void stop() {
    final p = _player;
    if (p != null && p.playing) unawaited(p.pause());
  }
}

// ---------------------------------------------------------------- Cihaz kaydı

/// Tek bir kaydın oynatıcısı (`<audio preload="metadata">`): süre önceden okunur, ilk dokunuşta çalar.
/// Widget kapanınca durur.
class DeviceAudio extends ChangeNotifier {
  DeviceAudio(this._url, {this.preload = true}) {
    if (preload) _preload();
  }

  String? _url;
  final bool preload;
  AudioPlayer? _p;
  final List<StreamSubscription<Object?>> _subs = [];
  bool _loaded = false;
  bool _disposed = false;
  bool failed = false;

  String? get url => _url;
  bool get playing => _isPlaying(_p);
  Duration get position => _p?.position ?? Duration.zero;
  Duration? get duration => _p?.duration;

  set url(String? u) {
    if (u == _url) return;
    _url = u;
    failed = false;
    _loaded = false;
    if (_p != null) unawaited(_p!.stop());
    _notify();
    if (preload) _preload();
  }

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  AudioPlayer _ensure() {
    final existing = _p;
    if (existing != null) return existing;
    final p = AudioPlayer();
    _subs
      ..add(p.playerStateStream.listen((_) => _notify(), onError: (Object _) => _fail()))
      ..add(p.positionStream.listen((_) => _notify()))
      ..add(p.durationStream.listen((_) => _notify()))
      ..add(p.playbackEventStream.listen((_) {}, onError: (Object _) => _fail()));
    _p = p;
    return p;
  }

  void _fail() {
    failed = true;
    _notify();
  }

  void _preload() {
    if (_inTest || _url == null) return;
    unawaited(_load());
  }

  Future<bool> _load() async {
    final u = _url;
    if (u == null || _disposed) return false;
    try {
      await _ensure().setUrl(mediaUrl(u));
      if (u != _url) return false;
      _loaded = true;
      _notify();
      return true;
    } on Object {
      if (u == _url) _fail();
      return false;
    }
  }

  Future<void> toggle() async {
    if (_inTest || failed || _url == null || _disposed) return;
    final p = _ensure();
    if (!_loaded && !await _load()) return;
    if (playing) {
      await p.pause();
    } else {
      if (p.processingState == ProcessingState.completed) await p.seek(Duration.zero);
      unawaited(p.play().catchError((Object _) => _fail()));
    }
  }

  void seek(Duration to) {
    final p = _p;
    final d = p?.duration;
    if (p == null || d == null || d == Duration.zero) return;
    unawaited(p.seek(Duration(milliseconds: to.inMilliseconds.clamp(0, d.inMilliseconds))));
  }

  @override
  void dispose() {
    _disposed = true;
    for (final s in _subs) {
      unawaited(s.cancel());
    }
    unawaited(_p?.dispose());
    super.dispose();
  }
}

// ---------------------------------------------------------------- Dalga formlu oynatıcı

/// Sahte dalga formu (tohumdan kararlı çubuklar).
List<double> waveBars(String seed, int n) {
  var h = hashStr(seed);
  return List.generate(n, (i) {
    h = imul32((h ^ (h >> 15)) & 0xFFFFFFFF, 2246822507);
    final env = 0.55 + 0.45 * math.pow(math.sin((i / 9) * math.pi), 2);
    return math.max(0.12, math.min(1.0, ((h % 1000) / 1000) * env + 0.1));
  });
}

class _WavePainter extends CustomPainter {
  _WavePainter(this.bars, this.progress, this.on);
  final List<double> bars;
  final double progress;
  final Color on;

  @override
  void paint(Canvas canvas, Size size) {
    // `.dt-wave`: çubuklar en az 1px; sığmazsa taşan kısım kesilir (anlatıcıda `overflow: hidden`).
    canvas.clipRect(Offset.zero & size);
    const gap = 2.0;
    final n = bars.length;
    final w = math.max(1.0, (size.width - gap * (n - 1)) / n);
    final off = Paint()..color = const Color(0x2EFFFFFF);
    final onP = Paint()..color = on;
    for (var i = 0; i < n; i++) {
      final h = bars[i] * size.height;
      final x = i * (w + gap);
      final r = RRect.fromRectAndRadius(Rect.fromLTWH(x, (size.height - h) / 2, w, h), const Radius.circular(1));
      canvas.drawRRect(r, i / n < progress ? onP : off);
    }
  }

  @override
  bool shouldRepaint(_WavePainter old) => old.progress != progress || old.bars != bars || old.on != on;
}

/// Bits.tsx `AudioPlayer`: oynat/duraklat, dalga formu (dokununca konum), süre.
/// [narration] ise ortak anlatıcıyı kullanır; oynatıcı kapansa da ses sürer.
/// [fontSize] `em` tabanıdır (belgelerde sahne yazı boyu, anlatıcıda 13).
class AudioPlayerView extends StatefulWidget {
  const AudioPlayerView({
    super.key,
    required this.url,
    required this.audioKey,
    required this.seed,
    required this.playLabel,
    required this.pauseLabel,
    required this.missing,
    this.label = '',
    this.narration = false,
    this.fontSize = 13,
    this.showTime = true,
  });
  final String? url;

  /// Kararlı kimlik: anlatıcıda vaka + bölüm, belgede kanıt kimliği.
  final String audioKey;
  final String seed;
  final String playLabel;
  final String pauseLabel;
  final String missing;
  final String label;
  final bool narration;
  final double fontSize;

  /// `.dt-audio-time` (belge sahnesi 520px'ten darsa gizli).
  final bool showTime;

  @override
  State<AudioPlayerView> createState() => _AudioPlayerViewState();
}

class _AudioPlayerViewState extends State<AudioPlayerView> {
  DeviceAudio? _device;
  bool _failed = false;
  late List<double> _bars = waveBars(widget.seed, widget.narration ? 56 : 72);

  Listenable get _source => widget.narration ? NarrationController.instance : _device!;

  @override
  void initState() {
    super.initState();
    if (!widget.narration) _device = DeviceAudio(widget.url);
  }

  @override
  void didUpdateWidget(AudioPlayerView old) {
    super.didUpdateWidget(old);
    if (old.seed != widget.seed || old.narration != widget.narration) _bars = waveBars(widget.seed, widget.narration ? 56 : 72);
    if (old.url != widget.url) {
      _failed = false;
      if (old.audioKey != widget.audioKey) _device?.url = null;
      _device?.url = widget.url;
    }
  }

  @override
  void dispose() {
    _device?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(listenable: _source, builder: (context, _) => _build(context));
  }

  Widget _build(BuildContext context) {
    final em = widget.fontSize;
    final n = NarrationController.instance;
    final failed = widget.narration ? (_failed || n.failedKey == widget.audioKey && n.isMine(widget.audioKey)) : (_device!.failed);
    final url = widget.url;
    final narr = widget.narration;

    BoxDecoration box() => narr
        ? BoxDecoration(color: C.panel2, border: Border.all(color: C.ink, width: 3), borderRadius: BorderRadius.circular(R.pill))
        : BoxDecoration(color: const Color(0xFF0F1411), borderRadius: BorderRadius.circular(0.8 * em));
    // `box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.07)` (yer kaplamaz)
    final ring = narr ? null : BoxDecoration(borderRadius: BorderRadius.circular(0.8 * em), border: Border.all(color: const Color(0x12FFFFFF)));
    final pad = narr ? const EdgeInsets.fromLTRB(6, 6, 14, 6) : EdgeInsets.symmetric(horizontal: 1.1 * em, vertical: 0.9 * em);

    if (url == null || failed) {
      return Container(
        padding: pad,
        decoration: box(),
        foregroundDecoration: ring,
        alignment: Alignment.center,
        child: Text(failed ? SAudio.loadError : widget.missing, textAlign: TextAlign.center, style: T.b(0.85 * em, color: C.text3)),
      );
    }

    final mine = !narr || n.isMine(widget.audioKey);
    final playing = mine && (narr ? n.playing : _device!.playing);
    final time = mine ? (narr ? n.position : _device!.position) : Duration.zero;
    final dur = mine ? (narr ? n.duration : (_device!.duration ?? Duration.zero)) : Duration.zero;
    final progress = dur.inMilliseconds > 0 ? (time.inMilliseconds / dur.inMilliseconds).clamp(0.0, 1.0) : 0.0;

    Future<void> toggle() async {
      if (narr) {
        final ok = await n.toggle(key: widget.audioKey, url: url, label: widget.label);
        if (!ok && mounted && n.failedKey == widget.audioKey) setState(() => _failed = true);
      } else {
        await _device!.toggle();
      }
    }

    void seek(double fraction) {
      if (!mine || dur == Duration.zero) return;
      final to = Duration(milliseconds: (fraction.clamp(0.0, 1.0) * dur.inMilliseconds).round());
      narr ? n.seek(to) : _device!.seek(to);
    }

    final playBtn = Pressable(
      onTap: toggle,
      label: playing ? widget.pauseLabel : widget.playLabel,
      builder: (context, _) => narr
          ? Container(
              height: 44,
              padding: const EdgeInsets.fromLTRB(12, 0, 16, 0),
              decoration: BoxDecoration(color: C.mint, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(R.pill)),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SIcon(playing ? 'pause' : 'play', size: 18, color: C.ink2),
                  const SizedBox(width: 8),
                  Text(playing ? widget.pauseLabel : widget.playLabel, style: T.b(14, color: C.ink2, weight: FontWeight.w800, height: 1)),
                ],
              ),
            )
          : Container(
              width: 2.9 * em,
              height: 2.9 * em,
              alignment: Alignment.center,
              decoration: const BoxDecoration(color: C.mint, shape: BoxShape.circle),
              child: SIcon(playing ? 'pause' : 'play', size: 20, color: C.ink2),
            ),
    );

    final wave = Semantics(
      slider: true,
      label: SAudio.seek,
      value: '${fmtTime(time)} / ${fmtTime(dur)}',
      child: LayoutBuilder(
        builder: (context, c) => GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTapUp: (e) => seek(c.maxWidth > 0 ? e.localPosition.dx / c.maxWidth : 0),
          child: SizedBox(
            height: narr ? 24 : 2.6 * em,
            width: double.infinity,
            child: CustomPaint(painter: _WavePainter(_bars, progress, C.mint)),
          ),
        ),
      ),
    );

    return Container(
      padding: pad,
      decoration: box(),
      foregroundDecoration: ring,
      child: Row(
        children: [
          playBtn,
          SizedBox(width: 0.9 * em),
          Expanded(child: wave),
          if (widget.showTime) ...[
            SizedBox(width: 0.9 * em + 4),
            Text(
              '${fmtTime(time)} / ${fmtTime(dur)}',
              style: T.d(0.75 * em, color: C.text2, height: 1.45, weight: FontWeight.w600).copyWith(fontFeatures: tabular),
            ),
          ],
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------- Masadaki anlatıcı hapı

/// `NarrationPill`: sahne kapandıktan sonra süren anlatı için masadaki küçük düğme.
class NarrationPill extends StatelessWidget {
  const NarrationPill({super.key, required this.hidden});
  final bool hidden;

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: NarrationController.instance,
    builder: (context, _) {
      final n = NarrationController.instance;
      if (hidden || !n.playing) return const SizedBox.shrink();
      return Semantics(
        liveRegion: true,
        child: Container(
          constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width - 32),
          padding: const EdgeInsets.fromLTRB(14, 6, 6, 6),
          decoration: BoxDecoration(color: C.panel, border: Border.all(color: C.ink, width: 3), borderRadius: BorderRadius.circular(R.pill), boxShadow: Shadows.md),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const _PulseDot(),
              const SizedBox(width: 10),
              Flexible(
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(SScene.narrationNow, style: T.b(13, color: C.text2, weight: FontWeight.w700), maxLines: 1, softWrap: false),
                    if (n.label.isNotEmpty) ...[
                      const SizedBox(width: 6),
                      Flexible(
                        child: Text(n.label, style: T.b(13, color: C.text, weight: FontWeight.w800), maxLines: 1, softWrap: false, overflow: TextOverflow.ellipsis),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 10 + 4),
              Text('${fmtTime(n.position)} / ${fmtTime(n.duration)}', style: T.d(0.75 * 13, color: C.text2, height: 1.45, weight: FontWeight.w700).copyWith(fontFeatures: tabular)),
              const SizedBox(width: 10),
              _GhostSmall(label: SScene.narrationStop, onTap: n.stop),
            ],
          ),
        ),
      );
    },
  );
}

/// `.btn.btn-ghost.dt-narration-stop`: 36 yükseklik, 0 12 dolgu.
class _GhostSmall extends StatelessWidget {
  const _GhostSmall({required this.label, required this.onTap});
  final String label;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Pressable(
    onTap: onTap,
    label: label,
    builder: (context, _) => Container(
      constraints: const BoxConstraints(minHeight: 36),
      padding: const EdgeInsets.symmetric(horizontal: 12),
      alignment: Alignment.center,
      decoration: BoxDecoration(border: Border.all(color: C.line2, width: 2), borderRadius: BorderRadius.circular(14)),
      child: Text(label, style: T.b(14, color: C.text2, weight: FontWeight.w800, height: 1)),
    ),
  );
}

/// `.dt-narration-dot`: 1,4 sn'de bir sönüp yanan nane noktası.
class _PulseDot extends StatefulWidget {
  const _PulseDot();
  @override
  State<_PulseDot> createState() => _PulseDotState();
}

class _PulseDotState extends State<_PulseDot> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1400));

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MediaQuery.disableAnimationsOf(context)) {
      _c.stop();
      _c.value = 0;
    } else if (!_c.isAnimating) {
      _c.repeat();
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: _c,
    builder: (context, child) {
      // keyframes: 50% { opacity: .35 }, ease-in-out
      final t = _c.value < 0.5 ? _c.value * 2 : (1 - _c.value) * 2;
      final o = 1 - 0.65 * Curves.easeInOut.transform(t);
      return Opacity(opacity: o, child: child);
    },
    child: Container(width: 8, height: 8, decoration: const BoxDecoration(color: C.mint, shape: BoxShape.circle)),
  );
}

// ---------------------------------------------------------------- Sorgu kaydı

/// Interviews.tsx `MiniPlay`: tek düğmeli küçük oynatıcı; otomatik çalmaz. Kalan süreyi gösterir.
class MiniPlay extends StatefulWidget {
  const MiniPlay({super.key, required this.url, this.color = DtC.brown, this.activeText = DtC.cream});
  final String url;
  final Color color;
  final Color activeText;

  @override
  State<MiniPlay> createState() => _MiniPlayState();
}

class _MiniPlayState extends State<MiniPlay> {
  late final DeviceAudio _a = DeviceAudio(widget.url);

  @override
  void didUpdateWidget(MiniPlay old) {
    super.didUpdateWidget(old);
    if (old.url != widget.url) _a.url = widget.url;
  }

  @override
  void dispose() {
    _a.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: _a,
    builder: (context, _) {
      final playing = _a.playing;
      final failed = _a.failed;
      final d = _a.duration;
      final left = d == null ? null : d - _a.position;
      final fg = playing ? widget.activeText : widget.color;
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Pressable(
            onTap: failed ? null : _a.toggle,
            label: failed ? SInterview.audioError : (playing ? SInterview.pause : SInterview.listen),
            builder: (context, _) => Container(
              constraints: const BoxConstraints(minHeight: 36),
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                color: playing ? widget.color : null,
                border: Border.all(color: widget.color, width: 2),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SIcon(playing ? 'pause' : 'play', size: 13, color: fg),
                  const SizedBox(width: 6),
                  Text(failed ? SInterview.audioError : (playing ? SInterview.pause : SInterview.listen), style: T.b(12, color: fg, weight: FontWeight.w800)),
                ],
              ),
            ),
          ),
          if (left != null && !failed) ...[
            const SizedBox(width: 8),
            Opacity(opacity: 0.7, child: Text(fmtTime(left.isNegative ? Duration.zero : left), style: T.b(11, color: widget.color, weight: FontWeight.w700))),
          ],
        ],
      );
    },
  );
}
