part of 'play_view.dart';

/// `.ww-dawn`: gecenin sabahı; ölenler (rolü açıksa rozetle).
class _Dawn extends StatelessWidget {
  const _Dawn({required this.g});
  final _G g;

  @override
  Widget build(BuildContext context) {
    final n = g.view.lastNight!;
    return Transform.rotate(
      angle: deg(-1),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: C.yellow,
          border: Border.all(color: C.ink, width: 3),
          borderRadius: BorderRadius.circular(22),
          boxShadow: hardShadow(6, 6),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: _gapCol(8, [
            Text(trUpper(SPlay.dawnTitle(n.night)), style: _labelStyle(g.pal, size: 12, color: C.ink2)),
            if (n.deaths.isEmpty)
              Text(SPlay.dawnNone, style: T.d(24, color: C.ink2, height: 1.05))
            else
              Semantics(
                label: SPlay.dawnDied,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: _gapCol(6, [
                    for (final d in n.deaths)
                      Wrap(
                        crossAxisAlignment: WrapCrossAlignment.center,
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          _Struck(TextSpan(text: g.plainNick(d.id)), style: T.d(26, color: C.ink2, height: 1.05), ascent: _balooAscent, thickness: 3),
                          if (d.role != null) _RoleChip(role: d.role!, label: S.role[d.role]!, glyph: 14, pal: g.pal),
                        ],
                      ),
                  ]),
                ),
              ),
          ]),
        ),
      ),
    );
  }
}

/// Font yükseklikleri (hhea ascender / em): üstü çizili çizginin yeri için.
const _balooAscent = 1.078;
const _nunitoAscent = 1.011;

/// Üstü çizili yazı. Chrome'daki gibi çizgi taban çizgisinin `ascent / 3` üstünde ortalanır;
/// kalınlık piksel olarak verilir (CSS `text-decoration-thickness`, `auto` = max(1, boyut / 10)).
class _Struck extends StatelessWidget {
  const _Struck(this.span, {required this.style, required this.ascent, this.thickness, this.strike = true, this.maxLines, this.ellipsis = false});
  final InlineSpan span;
  final TextStyle style;
  final double ascent;
  final double? thickness;
  final bool strike;
  final int? maxLines;
  final bool ellipsis;

  @override
  Widget build(BuildContext context) {
    final text = Text.rich(span, style: style, maxLines: maxLines, overflow: ellipsis ? TextOverflow.ellipsis : null);
    if (!strike) return text;
    return CustomPaint(
      foregroundPainter: _StrikePainter(
        span: TextSpan(style: DefaultTextStyle.of(context).style.merge(style), children: [span]),
        ascent: ascent,
        thickness: thickness,
        scaler: MediaQuery.textScalerOf(context),
        maxLines: maxLines,
        ellipsis: ellipsis,
      ),
      child: text,
    );
  }
}

class _StrikePainter extends CustomPainter {
  _StrikePainter({required this.span, required this.ascent, required this.thickness, required this.scaler, this.maxLines, this.ellipsis = false});
  final TextSpan span;
  final double ascent;
  final double? thickness;
  final TextScaler scaler;
  final int? maxLines;
  final bool ellipsis;

  @override
  void paint(Canvas canvas, Size size) {
    final tp = TextPainter(text: span, textDirection: TextDirection.ltr, textScaler: scaler, maxLines: maxLines, ellipsis: ellipsis ? '…' : null)
      ..layout(maxWidth: size.width);
    final fontSize = scaler.scale(span.style?.fontSize ?? 14);
    final t = thickness ?? math.max(1.0, fontSize / 10);
    final paint = Paint()..color = span.style?.color ?? C.text;
    for (final line in tp.computeLineMetrics()) {
      final y = line.baseline - fontSize * ascent / 3;
      canvas.drawRect(Rect.fromLTWH(line.left, y - t / 2, line.width, t), paint);
    }
    tp.dispose();
  }

  @override
  bool shouldRepaint(_StrikePainter old) => old.span != span || old.thickness != thickness || old.ascent != ascent;
}

/// `Hunter`: ölen avcı son atışını seçer; diğerleri bekler.
class _Hunter extends StatelessWidget {
  const _Hunter({required this.g});
  final _G g;

  @override
  Widget build(BuildContext context) {
    final view = g.view;
    if (view.hunter != g.meId) return _Panel(children: [_Note(SPlay.hunterWait(g.plainNick(view.hunter ?? '')), pal: g.pal)]);
    final targets = [for (final x in view.seats) if (x.alive && x.id != g.meId) x.id];
    return _Panel(
      children: [
        _title(SPlay.hunterTitle),
        _PlayerGrid(
          g: g,
          ids: targets,
          tone: 'wolf',
          label: (n) => n,
          onPick: (id) => g.send({'type': 'shoot', 'session': view.session, 'target': id}),
        ),
        _hint(SPlay.hunterHint, g.pal),
      ],
    );
  }
}

/// `Discuss`: adaylar, aday gösterme, hazırım.
class _Discuss extends StatelessWidget {
  const _Discuss({required this.g});
  final _G g;

  @override
  Widget build(BuildContext context) {
    final view = g.view;
    final pal = g.pal;
    final mySeat = g.seat(g.meId);
    final alive = g.alive;
    final readyN = alive.where((x) => x.ready).length;
    final amReady = mySeat?.ready ?? false;
    final canAct = mySeat?.alive ?? false;

    return _Panel(
      children: [
        _Dashed(
          color: C.violet,
          radius: 18,
          width: 3,
          padding: const EdgeInsets.all(10),
          child: Text(SPlay.discussRule, style: T.b(14, color: C.text3, weight: FontWeight.w700), textAlign: TextAlign.center),
        ),
        Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: _gapCol(8, [
            _h(SPlay.candidates, pal),
            if (view.candidates.isEmpty)
              _hint(SPlay.noCandidates, pal)
            else
              Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: _gapCol(6, [
                  for (final id in view.candidates)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      decoration: BoxDecoration(color: C.panel, border: Border.all(color: C.ink, width: 3), borderRadius: BorderRadius.circular(16)),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(g.plainNick(id), style: T.b(15, color: C.text, weight: FontWeight.w800)),
                          const SizedBox(height: 2),
                          Text(
                            SPlay.nominatedBy((g.seat(id)?.nominatedBy ?? const []).map(g.plainNick).join(', ')),
                            style: T.b(12, color: C.text3, weight: FontWeight.w700),
                          ),
                        ],
                      ),
                    ),
                ]),
              ),
          ]),
        ),
        if (mySeat == null)
          _Note(SPlay.spectator, pal: pal)
        else if (!canAct)
          _Note(SPlay.deadDiscuss, pal: pal)
        else ...[
          _sub(SPlay.discussPick),
          _PlayerGrid(
            g: g,
            ids: [for (final x in alive) if (x.id != g.meId) x.id],
            tone: 'day',
            picked: (id) => view.myNomination == id,
            label: SPlay.nominate,
            badge: (id) {
              final n = g.seat(id)?.nominatedBy.length ?? 0;
              return n > 0 ? _Count(n, pal: pal) : null;
            },
            onPick: (id) => g.send({'type': 'nominate', 'session': view.session, 'target': view.myNomination == id ? null : id}),
          ),
          if (view.myNomination != null) _hint(SPlay.myNomination(g.plainNick(view.myNomination!)), pal),
          SButton(
            label: amReady ? SPlay.unready : SPlay.readyBtn,
            tone: amReady ? BtnTone.outline : BtnTone.primary,
            large: true,
            block: true,
            onPressed: () => g.send({'type': 'ready', 'session': view.session, 'ready': !amReady}),
          ),
        ],
        _hint(SPlay.readyCount(readyN, alive.length), pal, center: true),
        if (g.isHost) SGhostButton(label: SPlay.endDiscuss, block: true, onPressed: () => g.send({'type': 'hostSkip', 'session': view.session})),
      ],
    );
  }
}
