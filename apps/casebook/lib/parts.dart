import 'package:flutter/material.dart';
import 'package:songie_core/flavor.dart';
import 'package:songie_core/games/detective/models.dart';
import 'package:songie_core/screens/guide.dart' show DashedRRectPainter;
import 'package:songie_core/ui/icons.dart';
import 'package:songie_core/ui/tokens.dart';
import 'package:songie_core/ui/widgets.dart';

import 'ranks.dart';
import 'strings.dart';
import 'style.dart';

/// Üst çubuk menü düğmesi: 44×44, #221A4D, 3px siyah çerçeve, 14 köşe.
class CbMenuButton extends StatelessWidget {
  const CbMenuButton({super.key, required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Pressable(
    onTap: onTap,
    label: TrCb.menu,
    builder: (context, _) => Container(
      width: 44,
      height: 44,
      alignment: Alignment.center,
      decoration: BoxDecoration(color: K.panel, border: blackBorder(), borderRadius: BorderRadius.circular(14)),
      child: SSvg(KIcons.menu, width: 22, height: 22, color: K.white),
    ),
  );
}

/// Logo: kâğıt dosya rozeti (büyüteç) + "Casebook".
class CbLogo extends StatelessWidget {
  const CbLogo({super.key, this.onTap});
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final f = AppFlavor.current;
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Transform.rotate(
            angle: deg(-6),
            child: Container(
              width: 38,
              height: 44,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: f.badgeColor,
                border: blackBorder(),
                borderRadius: f.badgeRadius ?? BorderRadius.circular(12),
                boxShadow: hardShadow(3, 3, K.black),
              ),
              child: SSvg(KIcons.search, width: 22, height: 22, color: K.brown),
            ),
          ),
          const SizedBox(width: 8),
          Text(f.brandText, style: KT.display(30, color: K.white, letterSpacing: -0.5), textScaler: TextScaler.noScaling),
        ],
      ),
    );
  }
}

/// Kauçuk damga ("AÇIK", "ÇÖZÜLDÜ\nKomiser").
class CbStamp extends StatelessWidget {
  const CbStamp({super.key, required this.text, required this.color, this.fontSize = 11, this.letterSpacing = 1, this.angle = 6, this.padding = const EdgeInsets.symmetric(horizontal: 8, vertical: 2), this.height});
  final String text;
  final Color color;
  final double fontSize;
  final double letterSpacing;
  final double angle;
  final EdgeInsets padding;
  final double? height;

  @override
  Widget build(BuildContext context) => Transform.rotate(
    angle: deg(angle),
    child: Container(
      padding: padding,
      decoration: BoxDecoration(border: Border.all(color: color, width: bw), borderRadius: BorderRadius.circular(6)),
      child: Text(text, textAlign: TextAlign.center, style: KT.mono(fontSize, color: color, letterSpacing: letterSpacing, height: height)),
    ),
  );
}

/// Dosya sekmesi (kartın üst kenarına oturur, alt çizgisi yok).
class CbTab extends StatelessWidget {
  const CbTab({super.key, required this.text, required this.color, required this.padding, required this.fontSize, required this.letterSpacing});
  final String text;
  final Color color;
  final EdgeInsets padding;
  final double fontSize;
  final double letterSpacing;

  @override
  Widget build(BuildContext context) => Container(
    padding: padding,
    decoration: BoxDecoration(
      color: color,
      border: tabBorder,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(6)),
    ),
    child: Text(text, style: KT.mono(fontSize, color: K.brown, letterSpacing: letterSpacing)),
  );
}

/// "Devam eden dosya" kartındaki üye yuvarlakları (30px, -8 üst üste).
class CbMembers extends StatelessWidget {
  const CbMembers({super.key, required this.members});

  /// (renk, harf)
  final List<(Color, String)> members;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      for (final (i, m) in members.indexed)
        Transform.translate(
          offset: Offset(-8.0 * i, 0),
          child: Container(
            width: 30,
            height: 30,
            alignment: Alignment.center,
            decoration: BoxDecoration(color: m.$1, shape: BoxShape.circle, border: blackBorder(2)),
            child: Text(m.$2, style: KT.body(13, color: K.white), textScaler: TextScaler.noScaling),
          ),
        ),
    ],
  );
}

/// DEVAM EDEN DOSYA kartı.
class CbActiveCard extends StatelessWidget {
  const CbActiveCard({super.key, required this.session, required this.place, required this.members, required this.onResume, this.busy = false});
  final SessionCard session;
  final String place;
  final List<(Color, String)> members;
  final VoidCallback? onResume;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    final s = session;
    return Transform.rotate(
      angle: deg(-1),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(18, 20, 18, 18),
            decoration: BoxDecoration(
              color: K.paper,
              border: blackBorder(),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(6),
                topRight: Radius.circular(24),
                bottomLeft: Radius.circular(24),
                bottomRight: Radius.circular(24),
              ),
              boxShadow: hardShadow(7, 7, K.black),
            ),
            child: VStack(
              gap: 12,
              children: [
                Text(place, style: KT.mono(13, color: K.brown)),
                Text(s.title, style: KT.display(32, color: K.brown)),
                Row(
                  children: [
                    Expanded(
                      child: Row(
                        children: [
                          for (var i = 0; i < s.acts; i++) ...[
                            if (i > 0) const SizedBox(width: 4),
                            Expanded(
                              child: Container(
                                height: 10,
                                decoration: BoxDecoration(color: i < s.act ? K.brown : K.barOff, borderRadius: BorderRadius.circular(3)),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(width: 10),
                    Text(TrCb.progress(s.act, s.acts, s.hoursSpent, s.hoursBudget), style: KT.body(13, color: K.brown)),
                  ],
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    CbMembers(members: members),
                    const SizedBox(width: 10),
                    Flexible(
                      child: Text(
                        s.members.length > 1 ? TrCb.withTeam : TrCb.alone,
                        textAlign: TextAlign.right,
                        style: KT.body(12, color: K.brown, weight: FontWeight.w700),
                      ),
                    ),
                  ],
                ),
                Opacity(
                  opacity: onResume == null && !busy ? 0.5 : 1,
                  child: Pressable(
                    onTap: onResume,
                    label: TrCb.resume,
                    builder: (context, _) => Container(
                      constraints: const BoxConstraints(minHeight: 58),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: K.brown,
                        border: blackBorder(),
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: hardShadow(0, 5, K.black),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(busy ? '…' : TrCb.resume, style: KT.display(21, color: K.paper)),
                          const SizedBox(width: 10),
                          SSvg(KIcons.arrow, width: 20, height: 20, color: K.paper),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const Positioned(
            top: -14,
            left: 18,
            child: CbTab(text: TrCb.activeTab, color: K.paper, padding: EdgeInsets.symmetric(horizontal: 12, vertical: 3), fontSize: 12, letterSpacing: 2),
          ),
          const Positioned(
            top: 14,
            right: 14,
            child: CbStamp(text: TrCb.open, color: K.stampRed, fontSize: 13, letterSpacing: 2, angle: 8, padding: EdgeInsets.symmetric(horizontal: 10, vertical: 2)),
          ),
        ],
      ),
    );
  }
}

/// "Ekip kur" / "Tek başına" büyük düğmesi.
class CbBigButton extends StatelessWidget {
  const CbBigButton({super.key, required this.icon, required this.title, required this.sub, required this.color, required this.angle, required this.onTap, this.busy = false});
  final String icon;
  final String title;
  final String sub;
  final Color color;
  final double angle;
  final VoidCallback? onTap;
  final bool busy;

  @override
  Widget build(BuildContext context) => Opacity(
    opacity: onTap == null && !busy ? 0.5 : 1,
    child: Pressable(
      onTap: onTap,
      label: '$title, $sub',
      builder: (context, _) => Transform.rotate(
        angle: deg(angle),
        child: Container(
          constraints: const BoxConstraints(minHeight: 120),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: color,
            border: blackBorder(),
            borderRadius: BorderRadius.circular(22),
            boxShadow: hardShadow(0, 6, K.black),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              SSvg(icon, width: 30, height: 30, color: K.ink),
              const SizedBox(height: 8),
              Text.rich(
                TextSpan(
                  text: busy ? '…\n' : '$title\n',
                  style: KT.display(21, color: K.ink, height: 1.05),
                  children: [TextSpan(text: sub, style: KT.body(12, color: K.ink, weight: FontWeight.w700, height: 1.05))],
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

/// Rütbe kartı.
class CbRankCard extends StatelessWidget {
  const CbRankCard({super.key, required this.current, required this.solved, required this.total});
  final String current;
  final int solved;
  final int total;

  @override
  Widget build(BuildContext context) {
    final cur = rankIndex(current);
    final next = nextRank(current);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: K.panel, border: blackBorder(), borderRadius: BorderRadius.circular(22)),
      child: VStack(
        gap: 12,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(TrCb.rankTitle, style: KT.display(22, color: K.white)),
              Text(TrCb.solvedCount(solved, total), style: KT.body(13, color: K.skyText)),
            ],
          ),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (var i = 0; i < rankOrder.length; i++) ...[
                if (i > 0) const SizedBox(width: 6),
                Expanded(child: _RankStep(name: rankOrder[i], state: i < cur ? _Step.done : (i == cur ? _Step.current : _Step.locked))),
              ],
            ],
          ),
          Text(next == null ? TrCb.topRank : TrCb.nextRank(next.percent, next.rank), style: KT.body(13, color: K.hint, weight: FontWeight.w700)),
        ],
      ),
    );
  }
}

enum _Step { done, current, locked }

class _RankStep extends StatelessWidget {
  const _RankStep({required this.name, required this.state});
  final String name;
  final _Step state;

  @override
  Widget build(BuildContext context) {
    final Widget badge = switch (state) {
      _Step.done => Container(
        width: 40,
        height: 40,
        alignment: Alignment.center,
        decoration: BoxDecoration(color: K.sky, shape: BoxShape.circle, border: blackBorder()),
        child: SSvg(KIcons.check, width: 18, height: 18, color: K.ink),
      ),
      // margin-top: -3px; halka: 0 0 0 4px zemin, 0 0 0 6px sarı.
      _Step.current => Transform.translate(
        offset: const Offset(0, -3),
        child: Container(
          width: 46,
          height: 46,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: K.yellow,
            shape: BoxShape.circle,
            border: blackBorder(),
            boxShadow: const [BoxShadow(color: K.yellow, spreadRadius: 6), BoxShadow(color: K.bg, spreadRadius: 4)],
          ),
          // ★: Baloo'da bu karakter yok; çizimle.
          child: const SSvg(_starSvg, width: 20, height: 20, color: K.ink),
        ),
      ),
      _Step.locked => CustomPaint(
        foregroundPainter: DashedRRectPainter(color: K.lockedLine, radius: 20, strokeWidth: 3, dash: 7, gap: 5),
        child: Container(width: 40, height: 40, decoration: const BoxDecoration(color: K.lockedBg, shape: BoxShape.circle)),
      ),
    };
    final col = Column(
      children: [
        // Şimdiki rütbenin 46px rozeti -3px yukarı kayar; satır yüksekliği 43.
        SizedBox(height: state == _Step.current ? 43 : 40, child: OverflowBox(maxHeight: 46, alignment: Alignment.topCenter, child: badge)),
        const SizedBox(height: 6),
        Text(
          name,
          textAlign: TextAlign.center,
          style: KT.body(11, color: state == _Step.current ? K.yellow : K.white, height: 1.15),
        ),
      ],
    );
    return state == _Step.locked ? Opacity(opacity: 0.55, child: col) : col;
  }
}

/// Raf filtresi çipi.
class CbChip extends StatelessWidget {
  const CbChip({super.key, required this.label, required this.selected, required this.onTap});
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Pressable(
    onTap: onTap,
    label: label,
    selected: selected,
    builder: (context, _) => Transform.rotate(
      angle: deg(selected ? -2 : 0),
      child: Container(
        constraints: const BoxConstraints(minHeight: 44),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: selected ? K.paper : K.panel,
          border: blackBorder(),
          borderRadius: BorderRadius.circular(R.pill),
          boxShadow: selected ? hardShadow(0, 4, K.black) : null,
        ),
        child: Text(label, style: KT.display(16, color: selected ? K.brown : K.white)),
      ),
    ),
  );
}

const _diffColor = {'orta': K.mint, 'zor': K.yellow, 'çok zor': K.red};

/// Raftaki dosya kartı.
class CbCaseCard extends StatelessWidget {
  const CbCaseCard({super.key, required this.c, required this.no, required this.open, required this.angle, required this.onTap});
  final CaseCard c;
  final int no;
  final bool open;
  final double angle;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final solved = c.solved != null && !open;
    final bg = solved ? K.paperSolved : K.paper;
    final chip = KT.body(11, color: K.brown);
    Widget pill(String text, {Color? fill, bool outline = true, Color? color}) => Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: fill,
        border: outline ? Border.all(color: K.brown, width: 2) : null,
        borderRadius: BorderRadius.circular(R.pill),
      ),
      child: Text(text, style: color == null ? chip : chip.copyWith(color: color)),
    );

    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Pressable(
        onTap: onTap,
        label: c.title,
        builder: (context, _) => Transform.rotate(
          angle: deg(angle),
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                padding: const EdgeInsets.fromLTRB(14, 16, 14, 14),
                decoration: BoxDecoration(
                  color: bg,
                  border: blackBorder(),
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(4),
                    topRight: Radius.circular(18),
                    bottomLeft: Radius.circular(18),
                    bottomRight: Radius.circular(18),
                  ),
                  boxShadow: hardShadow(5, 5, K.black),
                ),
                child: VStack(
                  gap: 10,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: VStack(
                            gap: 2,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(placeOf(c.subtitle), style: KT.mono(12, color: K.brown)),
                              Text(c.title, style: KT.display(22, color: K.brown, height: 1.05)),
                            ],
                          ),
                        ),
                        if (solved) ...[
                          const SizedBox(width: 8),
                          CbStamp(text: '${TrCb.solved}\n${c.solved!.rank}', color: K.stampGreen, height: 1.2),
                        ] else if (open) ...[
                          const SizedBox(width: 8),
                          const CbStamp(text: TrCb.open, color: K.stampRed),
                        ],
                      ],
                    ),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        pill(capitalizeTr(c.genre), fill: K.brown, outline: false, color: K.paper),
                        pill(capitalizeTr(c.difficulty), fill: _diffColor[c.difficulty] ?? K.paper),
                        pill(TrCb.minutes(c.minutes)),
                        pill(TrCb.actsDocs(c.acts, c.evidenceCount)),
                      ],
                    ),
                  ],
                ),
              ),
              Positioned(
                top: -13,
                left: 14,
                child: CbTab(text: TrCb.fileNo(no), color: bg, padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 1), fontSize: 11, letterSpacing: 1.5),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

const _starSvg =
    '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"/></svg>';
