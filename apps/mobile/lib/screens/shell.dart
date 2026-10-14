import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../audio/player.dart';
import '../games/catalog.dart';
import '../i18n/tr.dart';
import '../session/session.dart';
import '../ui/icons.dart';
import '../ui/tokens.dart';
import '../ui/widgets.dart';
import 'guide.dart';

/// Menüyü açan fonksiyonu sayfalara ulaştırır.
class ShellMenu extends InheritedWidget {
  const ShellMenu({super.key, required this.open, required super.child});
  final VoidCallback open;

  static VoidCallback of(BuildContext context) => context.dependOnInheritedWidgetOfExactType<ShellMenu>()?.open ?? () {};

  @override
  bool updateShouldNotify(ShellMenu oldWidget) => false;
}

/// Sayfaların üst çubuğu: solda menü, ortada logo, sağda sayfanın verdiği düğme.
class TopBar extends StatelessWidget {
  const TopBar({super.key, this.right, this.compact = false});
  final Widget? right;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        SIconButton(icon: 'menu', label: TrShell.open, onPressed: ShellMenu.of(context)),
        const SizedBox(width: 12),
        Brand(compact: compact, onTap: () => context.go('/')),
        const SizedBox(width: 12),
        right ?? const SizedBox(width: 44),
      ],
    );
  }
}

/// Kabuk: çekmece menü + oyun sırasında sol üstte sabit menü düğmesi.
class ShellScaffold extends StatefulWidget {
  const ShellScaffold({super.key, required this.child});
  final Widget child;

  @override
  State<ShellScaffold> createState() => _ShellScaffoldState();
}

class _ShellScaffoldState extends State<ShellScaffold> {
  bool open = false;
  String? _lastPath;

  void _setOpen(bool v) => setState(() => open = v);

  Future<void> _createRoom(String gameId) async {
    final session = context.read<Session>();
    final res = await session.emit('room:create', {'gameId': gameId});
    if (!mounted) return;
    if (res.ok) {
      _setOpen(false);
      context.go('/r/${res['code']}');
    } else {
      session.notify(res.error);
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<Session>();
    final path = GoRouterState.of(context).uri.path;
    // Sayfa değişince menü kapanır.
    if (_lastPath != null && _lastPath != path && open) {
      WidgetsBinding.instance.addPostFrameCallback((_) => mounted ? _setOpen(false) : null);
    }
    _lastPath = path;
    final room = session.room;
    final playing = room != null && room.playing && path == '/r/${room.code}';
    final width = MediaQuery.sizeOf(context).width;
    final drawerWidth = math.min(350.0, width * 0.88);
    final top = MediaQuery.paddingOf(context).top;

    return ShellMenu(
      open: () => _setOpen(true),
      child: PopScope(
        canPop: !open,
        onPopInvokedWithResult: (didPop, _) {
          if (!didPop && open) _setOpen(false);
        },
        child: Stack(
          children: [
            Positioned.fill(child: widget.child),
            if (playing)
              Positioned(
                top: top + 14,
                left: 14,
                child: SIconButton(icon: 'menu', iconSize: 20, shadow: true, label: TrShell.open, onPressed: () => _setOpen(true)),
              ),
            // Arka plan perdesi
            Positioned.fill(
              child: IgnorePointer(
                ignoring: !open,
                child: AnimatedOpacity(
                  duration: const Duration(milliseconds: 180),
                  opacity: open ? 1 : 0,
                  child: GestureDetector(onTap: () => _setOpen(false), child: const ColoredBox(color: C.scrim)),
                ),
              ),
            ),
            // Çekmece
            AnimatedPositioned(
              duration: const Duration(milliseconds: 220),
              curve: const Cubic(0.2, 0.8, 0.2, 1),
              top: 0,
              bottom: 0,
              left: open ? 0 : -drawerWidth * 1.04,
              width: drawerWidth,
              child: IgnorePointer(ignoring: !open, child: _Drawer(onClose: () => _setOpen(false), onCreate: _createRoom)),
            ),
          ],
        ),
      ),
    );
  }
}

class _Drawer extends StatelessWidget {
  const _Drawer({required this.onClose, required this.onCreate});
  final VoidCallback onClose;
  final Future<void> Function(String id) onCreate;

  @override
  Widget build(BuildContext context) {
    final session = context.watch<Session>();
    final player = context.watch<AudioPlayerService>();
    final profile = session.profile;
    final room = session.room;
    final pad = MediaQuery.paddingOf(context);

    return Material(
      type: MaterialType.transparency,
      child: Container(
        decoration: const BoxDecoration(color: C.bg, border: Border(right: BorderSide(color: C.ink, width: bw))),
        child: ListView(
          padding: EdgeInsets.fromLTRB(16, 18 + pad.top, 16, math.max(20, pad.bottom)),
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Brand(onTap: () => context.go('/')),
                SIconButton(icon: 'close', iconSize: 18, label: TrShell.close, onPressed: onClose),
              ],
            ),
            if (profile != null) ...[
              const SizedBox(height: 18),
              Pressable(
                onTap: () => context.go('/profil'),
                label: TrShell.profile,
                builder: (context, _) => Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: C.paper,
                    border: Border.all(color: C.ink, width: bw),
                    borderRadius: BorderRadius.circular(R.lg),
                    boxShadow: Shadows.md,
                  ),
                  child: Row(
                    children: [
                      SAvatar(avatar: profile.avatar, nick: profile.nick, size: 44),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(profile.nick, style: T.d(22, color: C.ink2, height: 1.1), overflow: TextOverflow.ellipsis),
                            Text(TrShell.profile, style: T.b(13, color: C.violet, weight: FontWeight.w800)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
            const SizedBox(height: 18),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(color: C.panel2, border: Border.all(color: C.ink, width: bw), borderRadius: BorderRadius.circular(R.md)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Eyebrow(TrShell.volume),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const SIcon('volume', size: 18, color: C.text2),
                      const SizedBox(width: 10),
                      Expanded(child: VolumeSlider(value: player.volume, onChanged: player.setVolume)),
                    ],
                  ),
                ],
              ),
            ),
            if (room != null) ...[
              const SizedBox(height: 18),
              SButton(label: TrHome.backToRoom(room.code), tone: BtnTone.primary, block: true, onPressed: () => context.go('/r/${room.code}')),
            ],
            const SizedBox(height: 18),
            const Eyebrow(TrShell.games),
            const SizedBox(height: 10),
            for (final g in Catalog.instance.games) ...[
              Pressable(
                onTap: () => onCreate(g.id),
                label: g.name,
                builder: (context, pressed) => Container(
                  constraints: const BoxConstraints(minHeight: 60),
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  decoration: BoxDecoration(
                    color: pressed ? C.panel3 : C.panel,
                    border: Border.all(color: C.ink, width: 2),
                    borderRadius: BorderRadius.circular(R.md),
                  ),
                  child: Row(
                    children: [
                      GameMono(text: g.mono, category: g.category, size: 38, fontSize: 14, radius: 12),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(g.name, style: T.d(17, color: C.text, height: 1.1)),
                            Text(g.pitch, style: T.b(13, color: C.text3), maxLines: 1, overflow: TextOverflow.ellipsis),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 8),
            ],
            const SizedBox(height: 10),
            SGhostButton(
              label: TrTour.replay,
              block: true,
              onPressed: () {
                onClose();
                openTour(context);
              },
            ),
          ],
        ),
      ),
    );
  }
}

/// Ses sürgüsü: 14px yol (sarı dolu), 22px beyaz topuz.
class VolumeSlider extends StatelessWidget {
  const VolumeSlider({super.key, required this.value, required this.onChanged, this.fill = C.yellow});
  final double value;
  final ValueChanged<double> onChanged;

  /// Dolu kısmın rengi.
  final Color fill;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, cons) {
        final w = cons.maxWidth;
        void setFrom(double dx) {
          final v = (dx / w).clamp(0.0, 1.0);
          onChanged((v / 0.05).round() * 0.05);
        }

        return GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTapDown: (d) => setFrom(d.localPosition.dx),
          onHorizontalDragUpdate: (d) => setFrom(d.localPosition.dx),
          child: SizedBox(
            height: 26,
            child: Stack(
              clipBehavior: Clip.none,
              alignment: Alignment.centerLeft,
              children: [
                Container(
                  height: 14,
                  decoration: BoxDecoration(
                    border: Border.all(color: C.ink, width: 2),
                    borderRadius: BorderRadius.circular(R.pill),
                    gradient: LinearGradient(
                      colors: [fill, fill, C.ink2, C.ink2],
                      stops: [0, value, value, 1],
                    ),
                  ),
                ),
                Positioned(
                  left: (w - 22) * value,
                  child: Container(
                    width: 22,
                    height: 22,
                    decoration: BoxDecoration(color: C.paper, shape: BoxShape.circle, border: Border.all(color: C.ink, width: bw)),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
