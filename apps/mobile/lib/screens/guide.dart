import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../games/catalog.dart';
import '../i18n/tr.dart';
import '../session/storage.dart';
import '../ui/dialog.dart';
import '../ui/icons.dart';
import '../ui/tokens.dart';
import '../ui/widgets.dart';

/// apps/web/src/lib/guide.tsx: oyun rehberi ve platform tanıtımı; görülenler cihazda hatırlanır.
const _tourKey = 'songie.tour.seen';
String _gameKey(String id) => 'songie.guide.seen.$id';

void openGuide(BuildContext context, String gameId) {
  final game = Catalog.instance.find(gameId);
  if (game == null) return;
  context.read<Storage>().markSeen(_gameKey(gameId));
  showSDialog<void>(context, builder: (_) => GuideDialog(game: game));
}

void openTour(BuildContext context) {
  context.read<Storage>().markSeen(_tourKey);
  showSDialog<void>(context, builder: (ctx) => WelcomeTour(onOpenGame: (id) => openGuide(context, id)));
}

/// İlk kez girilen oyunda rehberi bir kez açar.
void showGuideOnce(BuildContext context, String gameId) {
  final storage = context.read<Storage>();
  if (!storage.seen(_gameKey(gameId)) && Catalog.instance.find(gameId)?.guide != null) openGuide(context, gameId);
}

void showTourOnce(BuildContext context) {
  if (!context.read<Storage>().seen(_tourKey)) openTour(context);
}

/// Rehber metinleri: kicker (12px, 2px aralık, büyük harf, menekşe).
TextStyle _kicker() => T.b(12, weight: FontWeight.w800, color: C.violet, letterSpacing: 2);

/// Oyunun adım adım tanıtımı: ilk sayfa özet, sonra rehber bölümleri.
class GuideDialog extends StatefulWidget {
  const GuideDialog({super.key, required this.game});
  final GameInfo game;

  @override
  State<GuideDialog> createState() => _GuideDialogState();
}

class _GuideDialogState extends State<GuideDialog> {
  int page = 0;

  @override
  Widget build(BuildContext context) {
    final game = widget.game;
    final guide = game.guide;
    final sections = guide?.sections ?? const <GuideSection>[];
    final total = sections.length + 1;
    final last = page == total - 1;
    final section = page > 0 ? sections[page - 1] : null;

    return SDialog(
      footer: DialogPager(
        total: total,
        page: page,
        backLabel: TrGuide.back,
        nextLabel: last ? TrGuide.done : TrGuide.next,
        onBack: page == 0 ? null : () => setState(() => page--),
        onNext: last ? () => Navigator.of(context).pop() : () => setState(() => page++),
      ),
      body: page == 0
          ? VStack(
              gap: 14,
              children: [
                Align(
                  alignment: Alignment.centerLeft,
                  child: Transform.rotate(
                    angle: deg(-6),
                    child: Container(
                      width: 76,
                      height: 76,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: C.yellow,
                        border: Border.all(color: C.ink, width: bw),
                        borderRadius: BorderRadius.circular(22),
                        boxShadow: Shadows.md,
                      ),
                      child: SIcon(game.icon, size: 40, color: C.ink2),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.only(right: 48),
                  child: Text(game.name, style: T.d(44, color: C.ink2, height: 0.95)),
                ),
                Text(guide?.summary ?? game.pitch, style: T.b(16, color: C.ink2, weight: FontWeight.w700)),
                if (guide != null)
                  Grid2(
                    columnGap: 8,
                    rowGap: 8,
                    equalHeight: true,
                    children: [_Fact(TrGuide.players, guide.players), _Fact(TrGuide.duration, guide.duration)],
                  ),
                if (sections.isNotEmpty)
                  VStack(
                    gap: 6,
                    children: [
                      for (var i = 0; i < sections.length; i++)
                        Pressable(
                          onTap: () => setState(() => page = i + 1),
                          builder: (context, _) => CustomPaint(
                            painter: const _DashedBottomPainter(),
                            child: Container(
                            constraints: const BoxConstraints(minHeight: 44),
                            padding: const EdgeInsets.only(bottom: 2),
                            child: Row(
                              children: [
                                SizedBox(
                                  width: 26,
                                  child: Text((i + 1).toString().padLeft(2, '0'), style: T.d(16, color: C.violet, height: 1.45)),
                                ),
                                const SizedBox(width: 10),
                                Expanded(child: Text(sections[i].title, style: T.b(16, color: C.ink2, weight: FontWeight.w800))),
                              ],
                            ),
                          ),
                          ),
                        ),
                    ],
                  ),
              ],
            )
          : _GuidePage(game: game, page: page, section: section!),
    );
  }
}

/// `.guide-toc button { border-bottom: 2px dashed var(--paper-3) }`
class _DashedBottomPainter extends CustomPainter {
  const _DashedBottomPainter();
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = C.paper3
      ..strokeWidth = 2;
    final y = size.height - 1;
    for (double x = 0; x < size.width; x += 10) {
      canvas.drawLine(Offset(x, y), Offset((x + 6).clamp(0, size.width), y), paint);
    }
  }

  @override
  bool shouldRepaint(_DashedBottomPainter old) => false;
}

class _Fact extends StatelessWidget {
  const _Fact(this.label, this.value);
  final String label;
  final String value;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(10),
    decoration: BoxDecoration(color: C.paper2, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(14)),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label.toUpperCase(), style: T.b(11, color: C.ink2, weight: FontWeight.w800, letterSpacing: 1.5)),
        Text(value, style: T.b(14, color: C.ink2, weight: FontWeight.w800)),
      ],
    ),
  );
}

Color? toneColor(String? tone) => switch (tone) {
  'green' => C.mint,
  'yellow' => C.yellow,
  'orange' => C.coral,
  'red' => C.red,
  'purple' => C.lilac,
  _ => null,
};

class _GuidePage extends StatelessWidget {
  const _GuidePage({required this.game, required this.page, required this.section});
  final GameInfo game;
  final int page;
  final GuideSection section;

  @override
  Widget build(BuildContext context) {
    final paragraphs = (section.body ?? '').split(RegExp(r'\n\s*\n')).where((p) => p.trim().isNotEmpty).toList();
    const tilts = [-1.0, 1.0, -0.5];
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: VStack(
        gap: 12,
        children: [
          Padding(padding: const EdgeInsets.only(right: 48), child: Text('${game.name} · $page'.toUpperCase(), style: _kicker())),
          Text(section.title, style: T.d(34, color: C.ink2)),
          for (final p in paragraphs) Text(p, style: T.b(16, color: C.ink2, height: 1.55)),
          if (section.items.isNotEmpty)
            VStack(
              gap: 12,
              children: [
                for (var i = 0; i < section.items.length; i++)
                  Transform.rotate(
                    angle: deg(tilts[i % 3]),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: toneColor(section.items[i].tone) ?? C.paper2,
                        border: Border.all(color: C.ink, width: bw),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(section.items[i].term, style: T.d(19, color: C.ink2, height: 1.1)),
                          const SizedBox(height: 2),
                          Text(section.items[i].text, style: T.b(14, color: C.ink2, weight: FontWeight.w700)),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          if (section.tip != null) TipBox(section.tip!),
        ],
      ),
    );
  }
}

/// `.guide-tip`: kesikli çerçeveli krem ipucu kutusu.
class TipBox extends StatelessWidget {
  const TipBox(this.text, {super.key});
  final String text;
  @override
  Widget build(BuildContext context) => CustomPaint(
    painter: DashedRRectPainter(color: C.ink, radius: 14, strokeWidth: 2),
    child: Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: C.cream, borderRadius: BorderRadius.circular(14)),
      child: Text(text, style: T.b(14, color: C.ink2, weight: FontWeight.w800)),
    ),
  );
}

/// Kesikli yuvarlak köşeli çerçeve (CSS `border: Npx dashed`).
class DashedRRectPainter extends CustomPainter {
  DashedRRectPainter({required this.color, required this.radius, this.strokeWidth = 2, this.dash = 6, this.gap = 4, this.foreground = true});
  final Color color;
  final double radius;
  final double strokeWidth;
  final double dash;
  final double gap;
  final bool foreground;

  @override
  void paint(Canvas canvas, Size size) {
    final inset = strokeWidth / 2;
    final rrect = RRect.fromRectAndRadius(Rect.fromLTWH(inset, inset, size.width - strokeWidth, size.height - strokeWidth), Radius.circular(radius - inset));
    final path = Path()..addRRect(rrect);
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth;
    for (final metric in path.computeMetrics()) {
      double d = 0;
      while (d < metric.length) {
        canvas.drawPath(metric.extractPath(d, (d + dash).clamp(0, metric.length)), paint);
        d += dash + gap;
      }
    }
  }

  @override
  bool shouldRepaint(DashedRRectPainter old) => old.color != color || old.radius != radius;
}

/// İlk girişte: platform nasıl çalışır + bütün oyunların kısa tanıtımı.
class WelcomeTour extends StatefulWidget {
  const WelcomeTour({super.key, required this.onOpenGame});
  final void Function(String id) onOpenGame;

  @override
  State<WelcomeTour> createState() => _WelcomeTourState();
}

class _WelcomeTourState extends State<WelcomeTour> {
  int page = 0;

  @override
  Widget build(BuildContext context) {
    final games = Catalog.instance.games;
    const stepColors = [C.yellow, C.pink, C.mint, C.pink, C.yellow];
    return SDialog(
      footer: DialogPager(
        total: 2,
        page: page,
        backLabel: TrGuide.back,
        nextLabel: page == 0 ? TrTour.toGames : TrTour.start,
        onBack: page == 0 ? null : () => setState(() => page = 0),
        onNext: page == 0 ? () => setState(() => page = 1) : () => Navigator.of(context).pop(),
      ),
      body: Padding(
        padding: const EdgeInsets.only(top: 4),
        child: page == 0
            ? VStack(
                gap: 12,
                children: [
                  Text(TrTour.kicker.toUpperCase(), style: _kicker()),
                  Text(TrTour.title, style: T.d(34, color: C.ink2)),
                  VStack(
                    gap: 14,
                    children: [
                      for (var i = 0; i < TrTour.steps.length; i++)
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              width: 40,
                              height: 40,
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                // :nth-child(2n) pembe, (3n) nane; 6. öğe yok.
                                color: stepColors[i],
                                border: Border.all(color: C.ink, width: bw),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text('${i + 1}', style: T.d(20, color: C.ink2)),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(TrTour.steps[i].$1, style: T.d(19, color: C.ink2, height: 1.05)),
                                  Text(TrTour.steps[i].$2, style: T.b(14, color: C.inkSoft)),
                                ],
                              ),
                            ),
                          ],
                        ),
                    ],
                  ),
                ],
              )
            : VStack(
                gap: 12,
                children: [
                  Text(TrTour.kicker.toUpperCase(), style: _kicker()),
                  Text(TrTour.gamesTitle(games.length), style: T.d(34, color: C.ink2)),
                  Text(TrTour.gamesLead, style: T.b(16, color: C.ink2, height: 1.55)),
                  VStack(
                    gap: 8,
                    children: [
                      for (final g in games)
                        Pressable(
                          onTap: () => widget.onOpenGame(g.id),
                          label: g.name,
                          builder: (context, pressed) => Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: pressed ? const Color(0xFFE6DEFC) : C.paper2,
                              border: Border.all(color: C.ink, width: 2),
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Row(
                              children: [
                                GameMono(text: g.mono, category: g.category, size: 40, fontSize: 15),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(g.name, style: T.d(18, color: C.ink2, height: 1.1)),
                                      Text(g.guide?.summary ?? g.pitch, style: T.b(13, color: C.inkSoft)),
                                      Text(
                                        g.guide?.players ?? '${g.minPlayers}–${g.maxPlayers} oyuncu',
                                        style: T.b(12, color: C.violet, weight: FontWeight.w800),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Transform.rotate(angle: deg(-90), child: const SIcon('chevron', size: 14, color: C.ink2)),
                              ],
                            ),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
      ),
    );
  }
}

/// Oyun seçme penceresi: yeni oda kurarken ya da lobide oyunu değiştirirken.
class GamePicker extends StatelessWidget {
  const GamePicker({super.key, required this.title, required this.onPick, this.current, this.busy = false});
  final String title;
  final String? current;
  final bool busy;
  final void Function(String id) onPick;

  @override
  Widget build(BuildContext context) {
    return SDialog(
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(padding: const EdgeInsets.only(right: 52), child: Text(title, style: T.d(30, color: C.ink2, height: 1.05))),
          const SizedBox(height: 16),
          VStack(
            gap: 8,
            children: [
              for (final g in Catalog.instance.games)
                Pressable(
                  onTap: busy ? null : () => onPick(g.id),
                  label: g.name,
                  builder: (context, pressed) {
                    final on = g.id == current;
                    return Container(
                      constraints: const BoxConstraints(minHeight: 60),
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      decoration: BoxDecoration(
                        color: on || pressed ? catColor(g.category) : C.paper2,
                        border: Border.all(color: C.ink, width: 2),
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: on ? Shadows.sm : null,
                      ),
                      child: Row(
                        children: [
                          GameMono(text: g.mono, category: g.category, size: 40, fontSize: 15),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(g.name, style: T.d(18, color: C.ink2, height: 1.1)),
                                Opacity(
                                  opacity: 0.75,
                                  child: Text(on ? TrPicker.current : g.playersLabel, style: T.b(12, color: C.ink2, weight: FontWeight.w800)),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
            ],
          ),
          const SizedBox(height: 12),
        ],
      ),
    );
  }
}
