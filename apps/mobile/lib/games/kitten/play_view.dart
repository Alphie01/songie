import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart' show OverflowBoxFit;

import '../../shared/models.dart';
import '../../ui/icons.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/game_module.dart';
import '../kit/kit.dart';
import 'card_art.dart';
import 'models.dart';
import 'strings.dart';
import 'ui.dart';

part 'hand.dart';
part 'overlays.dart';
part 'panels.dart';
part 'podium.dart';
part 'stage.dart';

typedef _Send = Future<bool> Function(Json action);
typedef _Nick = String Function(String? id);

/// `.kt-small`, `.kt-status`/`.kt-box` metni, `.kt-box-title`, `.kt-choose-label`.
final _smallStyle = T.b(13, color: C.text2, weight: FontWeight.w700);
final _boxText = T.b(14, color: C.text2, weight: FontWeight.w700);
final _boxTitle = T.d(18, color: C.text, height: 1.15);
final _chooseLabel = T.b(14, color: C.text2, weight: FontWeight.w700);

/// games/kitten/client/PlayView.tsx
class KittenPlayView extends StatefulWidget {
  const KittenPlayView({super.key, required this.props});
  final PlayViewProps props;

  @override
  State<KittenPlayView> createState() => _KittenPlayViewState();
}

class _KittenPlayViewState extends State<KittenPlayView> {
  late KittenView _view;
  String? _error;

  // Bombayı geri koyma: seçilen yer ve kaydırıcı (bileşen hep takılı kaldığı için oyun boyunca hatırlanır).
  String? _spot = 'random';
  int _index = 0;

  // Patlama / etkisiz kılma anı: yalnızca açılıştan sonra gelen yeni olaylar.
  late int _flashSeen;
  ({int seq, String t, String by})? _flash;
  Timer? _flashTimer;

  // Geleceği Gör penceresi.
  int? _futureClosed;
  bool _futureReopen = false;

  @override
  void initState() {
    super.initState();
    _view = KittenView.fromJson(widget.props.view);
    _flashSeen = _view.flash?.seq ?? 0;
  }

  @override
  void didUpdateWidget(KittenPlayView old) {
    super.didUpdateWidget(old);
    if (!identical(old.props.view, widget.props.view)) {
      _view = KittenView.fromJson(widget.props.view);
      final f = _view.flash;
      if (f != null && f.seq > _flashSeen) {
        _flashSeen = f.seq;
        _flash = f;
        _flashTimer?.cancel();
        _flashTimer = Timer(Duration(milliseconds: f.t == 'boom' ? 2800 : 1600), () {
          if (mounted) setState(() => _flash = null);
        });
      }
    }
  }

  @override
  void dispose() {
    _flashTimer?.cancel();
    super.dispose();
  }

  Future<bool> _send(Json action) async {
    setState(() => _error = null);
    try {
      final res = await widget.props.act(action);
      if (!res.ok && mounted) setState(() => _error = res.error);
      return res.ok;
    } catch (_) {
      if (mounted) setState(() => _error = SPlay.error);
      return false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.props;
    final view = _view;
    final members = membersOf(p.room);
    String nick(String? id) => id == null ? '?' : (members[id]?.nick ?? '?');
    final isHost = p.room.hostId == p.meId;

    if (view.phase == 'over') return _Podium(view: view, members: members, room: p.room);

    final mine = view.current == p.meId;
    final headline = view.inGame ? (view.alive ? (mine ? SPlay.yourTurn : SPlay.turnOf(nick(view.current))) : SPlay.left) : SPlay.spectator;
    final g = Layout.gutter(context);

    return Remaining(
      serverNow: view.serverNow,
      endsAt: view.endsAt,
      builder: (context, remaining) {
        final layers = _layers(context, view, p.meId, nick, remaining);
        return GameColumn(
          maxWidth: Layout.col + 2 * g,
          bottom: 24,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              VStack(
                gap: 12,
                children: [
                  _Top(text: headline, mine: mine && view.alive, code: p.room.code),
                  _Seats(view: view, members: members, meId: p.meId),
                  _Table(view: view),
                  _Risk(view: view),
                  _Stage(view: view, meId: p.meId, isHost: isHost, nick: nick, remaining: remaining, send: _send, members: members),
                  if (view.inGame && view.alive) _HandArea(key: ValueKey('hand-${view.turn}'), view: view, meId: p.meId, nick: nick, send: _send),
                  if (_error != null) Semantics(liveRegion: true, child: ErrorText(_error!, center: true)),
                  _Log(view: view, nick: nick),
                  _HowTo(fiveCats: view.fiveCats),
                ],
              ),
              // Ekranı kaplayan katmanlar, web'deki z-index sırasıyla: göz çipi (40) < bildirim (55) < perdeler (60).
              if (layers.isNotEmpty) KtFixed(child: Stack(children: layers)),
            ],
          ),
        );
      },
    );
  }

  List<Widget> _layers(BuildContext context, KittenView view, String meId, _Nick nick, int remaining) {
    final pad = ktScreenPadding(context);
    final g = Layout.gutter(context);
    final out = <Widget>[];
    final peek = view.peek;
    final futureOpen = peek != null && (_futureClosed != peek.seq || _futureReopen);
    void closeFuture() => setState(() {
      _futureClosed = peek?.seq;
      _futureReopen = false;
    });

    if (peek != null && !futureOpen) {
      out.add(
        Positioned(
          key: const ValueKey('peekchip'),
          right: g + pad.right,
          bottom: 20 + pad.bottom,
          child: _PeekChip(onTap: () => setState(() => _futureReopen = true)),
        ),
      );
    }
    final flash = _flash;
    if (flash != null && flash.t == 'defuse') {
      out.add(
        Positioned(
          key: ValueKey('toast-${flash.seq}'),
          left: g,
          right: g,
          bottom: 24 + pad.bottom,
          child: Center(child: _Toast(text: SPlay.defused(nick(flash.by)))),
        ),
      );
    }
    if (view.phase == 'bomb' || view.phase == 'place') {
      out.add(
        _BombOverlay(
          key: const ValueKey('bomb'),
          view: view,
          meId: meId,
          nick: nick,
          remaining: remaining,
          spot: _spot,
          index: _index,
          onSpot: (s) => setState(() => _spot = s),
          onIndex: (i) => setState(() {
            _spot = null;
            _index = i;
          }),
          send: _send,
        ),
      );
    }
    if (flash != null && flash.t == 'boom') {
      out.add(
        _Overlay(
          key: ValueKey('boom-${flash.seq}'),
          tone: _Tone.bomb,
          center: true,
          boom: true,
          onTap: () => setState(() => _flash = null),
          label: flash.by == meId ? SPlay.boomMe : SPlay.boom(nick(flash.by)),
          children: [
            const _BombCard(child: KtBombIcon(size: 90, sparks: true)),
            Text(flash.by == meId ? SPlay.boomMe : SPlay.boom(nick(flash.by)), style: _overlayTitle(44, height: 1), textAlign: TextAlign.center),
            Text(SPlay.boomHint, style: _bombHint, textAlign: TextAlign.center),
          ],
        ),
      );
    }
    if (peek != null && futureOpen) {
      out.add(
        _Overlay(
          key: ValueKey('future-${peek.seq}'),
          tone: _Tone.night,
          onTap: closeFuture,
          stopBody: true,
          label: SPlay.futureTitle,
          children: [
            Text(SPlay.futureTitle, style: _overlayTitle(32)),
            Text(SPlay.futureHint, style: _overlayHint),
            Grid2(
              columns: 3,
              rowGap: 10,
              columnGap: 10,
              children: [
                for (final (i, k) in peek.cards.indexed)
                  Column(
                    children: [
                      Container(
                        height: 130,
                        width: double.infinity,
                        padding: const EdgeInsets.all(6),
                        alignment: Alignment.center,
                        decoration: BoxDecoration(color: ktColor(k), border: Border.all(color: C.ink, width: bw), borderRadius: BorderRadius.circular(14)),
                        child: Text(cardName[k] ?? k, style: T.d(15, color: C.ink2, height: 1.05), textAlign: TextAlign.center),
                      ),
                      const SizedBox(height: 6),
                      Text(SPlay.futureSlot(i), style: T.b(12, color: C.text, weight: FontWeight.w800)),
                    ],
                  ),
              ],
            ),
            SButton(
              label: SPlay.futureClose,
              tone: BtnTone.yellow,
              block: true,
              minHeight: 56,
              radius: 18,
              shadowY: 0,
              pressY: 3,
              fontSize: 20,
              onPressed: closeFuture,
            ),
          ],
        ),
      );
    }
    return out;
  }
}

// ---------- Üst şerit ----------

class _Top extends StatelessWidget {
  const _Top({required this.text, required this.mine, required this.code});
  final String text;
  final bool mine;
  final String code;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisAlignment: MainAxisAlignment.spaceBetween,
    children: [
      Flexible(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
          decoration: BoxDecoration(color: mine ? C.coral : C.panel, border: Border.all(color: C.ink, width: bw), borderRadius: BorderRadius.circular(R.pill)),
          child: Text(text, style: T.d(16, color: mine ? C.ink2 : C.text, height: 1.2), maxLines: 1, softWrap: false, overflow: TextOverflow.ellipsis),
        ),
      ),
      const SizedBox(width: 10),
      Text(code, style: T.b(13, color: C.text3, weight: FontWeight.w800, letterSpacing: 2)),
    ],
  );
}

// ---------- Ortak kutular ----------

/// `.kt-box`: koyu kutu, ortalı metin.
class _Box extends StatelessWidget {
  const _Box({required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    decoration: BoxDecoration(color: C.panel2, border: Border.all(color: C.ink, width: bw), borderRadius: BorderRadius.circular(18)),
    child: DefaultTextStyle.merge(style: _boxText, textAlign: TextAlign.center, child: VStack(gap: 8, children: children)),
  );
}

/// `.kt-bar`: 10px çubuk (risk ve süre). Dolgu 200 ms doğrusal kayar.
class _Bar extends StatelessWidget {
  const _Bar({required this.fraction, this.color = C.red});
  final double fraction;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
    height: 10,
    clipBehavior: Clip.antiAlias,
    decoration: BoxDecoration(color: C.bg, borderRadius: BorderRadius.circular(R.pill)),
    alignment: Alignment.centerLeft,
    child: AnimatedFractionallySizedBox(
      duration: ktMotion(context, const Duration(milliseconds: 200)),
      widthFactor: fraction.clamp(0.0, 1.0),
      heightFactor: 1,
      child: DecoratedBox(decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(R.pill))),
    ),
  );
}

/// `Timer`: süre çubuğu (`.kt-bar.kt-timer`, sarı); süresizde hiç çizilmez.
Widget? _timer(KittenView view, int remaining, {Color color = C.yellow}) =>
    view.durationMs > 0 ? _Bar(fraction: math.min(1, remaining / view.durationMs), color: color) : null;

/// `.btn`: alttan sert gölgeli, basınca 3px inen düğme; solda bir simge alabilir.
class _Btn extends StatelessWidget {
  const _Btn({
    required this.label,
    required this.onTap,
    this.leading,
    this.background = C.panel,
    this.foreground = C.text,
    this.minHeight = 48,
    this.radius = R.md,
    this.shadowY = 4,
    this.fontSize = 17,
  });
  final String label;
  final VoidCallback onTap;
  final Widget? leading;
  final Color background;
  final Color foreground;
  final double minHeight;
  final double radius;
  final double shadowY;
  final double fontSize;

  @override
  Widget build(BuildContext context) => Pressable(
    onTap: onTap,
    label: label,
    builder: (context, pressed) => AnimatedContainer(
      duration: const Duration(milliseconds: 80),
      transform: Matrix4.translationValues(0, pressed ? 3 : 0, 0),
      constraints: BoxConstraints(minHeight: minHeight),
      padding: const EdgeInsets.symmetric(horizontal: 18),
      decoration: BoxDecoration(
        color: background,
        border: Border.all(color: C.ink, width: bw),
        borderRadius: BorderRadius.circular(radius),
        boxShadow: hardShadow(0, pressed ? 1 : shadowY),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (leading != null) ...[leading!, const SizedBox(width: 8)],
          Flexible(child: Text(label, style: T.d(fontSize, color: foreground), maxLines: 1, softWrap: false)),
        ],
      ),
    ),
  );
}

/// CSS `outline: 3px solid …; outline-offset: 2px` (çocuğun boyutunu değiştirmeden).
class _Outline extends StatelessWidget {
  const _Outline({required this.child, required this.on, required this.radius});
  final Widget child;
  final bool on;
  final double radius;

  @override
  Widget build(BuildContext context) => Stack(
    clipBehavior: Clip.none,
    fit: StackFit.passthrough,
    children: [
      child,
      if (on)
        Positioned(
          left: -5,
          top: -5,
          right: -5,
          bottom: -5,
          child: IgnorePointer(
            child: DecoratedBox(
              decoration: BoxDecoration(border: Border.all(color: C.paper, width: 3), borderRadius: BorderRadius.circular(radius + 5)),
            ),
          ),
        ),
    ],
  );
}
