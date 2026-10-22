part of 'play_view.dart';

/// `Village`: oyuncu listesi (bilinen roller, öldü / hazır / oy verdi / aday etiketleri).
class _Village extends StatelessWidget {
  const _Village({required this.g, required this.known});
  final _G g;
  final Map<String, Role> known;

  @override
  Widget build(BuildContext context) {
    final pal = g.pal;
    final aliveN = g.view.seats.where((x) => x.alive).length;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: _gapCol(10, [
        Row(
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _h(SPlay.village, pal),
            const SizedBox(width: 8),
            Flexible(child: Text(SPlay.alive(aliveN), style: _hintStyle(pal))),
          ],
        ),
        Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: _gapCol(6, [for (final seat in g.view.seats) _Seat(g: g, seat: seat, role: known[seat.id])]),
        ),
      ]),
    );
  }
}

/// `.ww-seat`
class _Seat extends StatelessWidget {
  const _Seat({required this.g, required this.seat, required this.role});
  final _G g;
  final SeatView seat;
  final Role? role;

  @override
  Widget build(BuildContext context) {
    final pal = g.pal;
    final m = g.members[seat.id];
    final me = seat.id == g.meId;
    final dead = !seat.alive;
    // `.ww-seat-tags` esnek satırında etiketler en uzun öğeye (rol rozeti: 12px satır + 8) uzar; yazı üstte kalır.
    final stretch = role != null ? 12 * 1.45 + 8 : 0.0;
    Widget tag(String text, {Color? bg, Color color = C.text2}) => Container(
      constraints: BoxConstraints(minHeight: stretch),
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 1),
      decoration: BoxDecoration(color: bg, border: Border.all(color: bg == null ? pal.soft : pal.edge, width: 2), borderRadius: BorderRadius.circular(R.pill)),
      child: Text(text, style: T.b(11, color: color, weight: FontWeight.w800), maxLines: 1, softWrap: false),
    );
    final tags = <Widget>[
      if (role != null) Semantics(label: S.role[role], child: _RoleChip(role: role!, label: S.rolePlural[role] ?? role!, glyph: 12, pal: pal)),
      if (dead) tag(SPlay.dead, color: C.text3),
      if (seat.ready) tag(SPlay.ready, bg: C.mint, color: C.ink2),
      if (seat.voted) tag(SPlay.voted, bg: C.yellow, color: C.ink2),
      if (seat.nominatedBy.isNotEmpty) tag(SPlay.nominated(seat.nominatedBy.length), bg: C.coral, color: C.ink2),
    ];
    final nameStyle = T.b(14, color: dead ? C.text3 : C.text, weight: FontWeight.w800);
    return Container(
      constraints: const BoxConstraints(minHeight: 44),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(color: pal.card, border: Border.all(color: me ? C.yellow : pal.edge, width: 3), borderRadius: BorderRadius.circular(16)),
      child: LayoutBuilder(
        builder: (context, c) => Row(
          children: [
            _Face(member: m, size: 28, dim: dead || m == null || !m.connected),
            const SizedBox(width: 10),
            Expanded(
              child: _Struck(
                TextSpan(
                  text: m?.nick ?? '?',
                  children: [if (me) TextSpan(text: ' (${SPlay.you})', style: const TextStyle(color: C.text3))],
                ),
                style: nameStyle,
                ascent: _nunitoAscent,
                strike: dead,
                maxLines: 1,
                ellipsis: true,
              ),
            ),
            // `.ww-seat-tags` boş olsa da yer tutar (aralık 10).
            const SizedBox(width: 10),
            ConstrainedBox(
              constraints: BoxConstraints(maxWidth: math.max(0, c.maxWidth - 28 - 20)),
              child: Wrap(spacing: 4, runSpacing: 4, children: tags),
            ),
          ],
        ),
      ),
    );
  }
}

/// `InGame`: oyundaki roller ve sayıları.
class _InGame extends StatelessWidget {
  const _InGame({required this.g});
  final _G g;

  @override
  Widget build(BuildContext context) {
    final roles = allRoles.where((r) => (g.view.roleCounts[r] ?? 0) > 0);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: _gapCol(10, [
        _h(SPlay.inGame, g.pal),
        Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: _gapCol(6, [
            for (final r in roles)
              Row(
                children: [
                  RoleGlyph(r, size: 16, color: roleColor(r)),
                  const SizedBox(width: 8),
                  Expanded(child: Text(S.role[r]!, style: T.b(14, color: C.text2, weight: FontWeight.w800))),
                  const SizedBox(width: 8),
                  Text('${g.view.roleCounts[r]}', style: _mono(14, roleColor(r))),
                ],
              ),
          ]),
        ),
      ]),
    );
  }
}

/// `Log`: olay günlüğü, en yenisi üstte (en fazla 420 yükseklik, kendi içinde kayar).
class _Log extends StatelessWidget {
  const _Log({required this.g});
  final _G g;

  @override
  Widget build(BuildContext context) {
    final entries = g.view.log.reversed.toList();
    Color color(String k) => switch (k) {
      'night' => _moon,
      'dawn' || 'hanged' || 'shot' || 'grief' => C.text,
      'over' => C.yellow,
      _ => C.text2,
    };
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: _gapCol(10, [
        _h(SPlay.log, g.pal),
        ConstrainedBox(
          constraints: const BoxConstraints(maxHeight: 420),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: _gapCol(8, [
                for (final e in entries)
                  Text(
                    _logText(e, g.plainNick),
                    style: T.b(13, color: color(e.k), weight: e.k == 'over' ? FontWeight.w800 : FontWeight.w700, height: 1.4),
                  ),
              ]),
            ),
          ),
        ),
      ]),
    );
  }
}

/// `HowTo`: nasıl oynanır + rol tablosu.
class _HowTo extends StatelessWidget {
  const _HowTo({required this.g});
  final _G g;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 32),
    child: CustomPaint(
      painter: const _DashTop(),
      child: Padding(
        // 3px kesikli çerçeve + 28px boşluk
        padding: const EdgeInsets.only(top: 3 + 28),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: _gapCol(16, [
            Text(SHowto.title, style: T.d(22, color: C.text, height: 1.05)),
            Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: _gapCol(16, [
                for (var i = 0; i < SHowto.steps.length; i++)
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Padding(padding: const EdgeInsets.only(top: 2), child: Text('${i + 1}', style: _mono(16, C.yellow))),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(SHowto.steps[i].$1, style: T.d(16, color: C.text, height: 1.05)),
                            const SizedBox(height: 2),
                            Text(SHowto.steps[i].$2, style: T.b(13, color: C.text2)),
                          ],
                        ),
                      ),
                    ],
                  ),
              ]),
            ),
            _h(SHowto.roleTable, g.pal),
            _RoleTable(g: g),
          ]),
        ),
      ),
    ),
  );
}

/// `.howto` üst kenarı: 3px kesikli mor çizgi.
class _DashTop extends CustomPainter {
  const _DashTop();

  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()
      ..color = C.violet
      ..strokeWidth = 3;
    for (double x = 0; x < size.width; x += 12) {
      canvas.drawLine(Offset(x, 1.5), Offset(math.min(x + 8, size.width), 1.5), p);
    }
  }

  @override
  bool shouldRepaint(_DashTop old) => false;
}

/// `.ww-roletable`: rol adı ve açıklaması. Tablo genişliği CSS otomatik tablo düzeniyle bölünür:
/// telefonda (≤420px) ad sütunu en dar ve en geniş içerik genişlikleri arasında orantılı, daha genişte 9.5em ve tek satır.
class _RoleTable extends StatelessWidget {
  const _RoleTable({required this.g});
  final _G g;

  @override
  Widget build(BuildContext context) {
    final narrow = MediaQuery.sizeOf(context).width <= 420;
    final scaler = MediaQuery.textScalerOf(context);
    final base = DefaultTextStyle.of(context).style;
    final th = base.merge(T.b(13, weight: FontWeight.w800));
    final td = base.merge(T.b(13, color: C.text2, weight: FontWeight.w700));
    return LayoutBuilder(
      builder: (context, c) {
        double width(String s, TextStyle st) {
          final tp = TextPainter(text: TextSpan(text: s, style: st), textDirection: TextDirection.ltr, textScaler: scaler, maxLines: 1)..layout();
          final w = tp.width;
          tp.dispose();
          return w;
        }

        double widestWord(String s, TextStyle st) => s.split(' ').fold(0.0, (m, w) => math.max(m, width(w, st)));
        const glyph = 16.0 + 6;
        const pad = 12.0;
        final thMax = allRoles.fold(0.0, (m, r) => math.max(m, glyph + width(S.role[r]!, th))) + pad;
        double col1;
        if (!narrow) {
          col1 = math.max(9.5 * 13, thMax);
        } else {
          final thMin = math.max(glyph, allRoles.fold(0.0, (m, r) => math.max(m, widestWord(S.role[r]!, th)))) + pad;
          final tdMax = allRoles.fold(0.0, (m, r) => math.max(m, width(S.roleBlurb[r]!, td)));
          final tdMin = allRoles.fold(0.0, (m, r) => math.max(m, widestWord(S.roleBlurb[r]!, td)));
          final minSum = thMin + tdMin;
          final maxSum = thMax + tdMax;
          final w = c.maxWidth;
          col1 = w <= minSum ? thMin : (w >= maxSum ? thMax : thMin + (w - minSum) / (maxSum - minSum) * (thMax - thMin));
        }
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (final r in allRoles)
              Container(
                padding: const EdgeInsets.symmetric(vertical: 8),
                decoration: BoxDecoration(border: Border(top: BorderSide(color: g.pal.soft, width: 2))),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(
                      width: col1,
                      child: Padding(
                        padding: const EdgeInsets.only(right: pad),
                        child: Text.rich(
                          TextSpan(
                            children: [
                              WidgetSpan(
                                alignment: PlaceholderAlignment.middle,
                                child: Padding(padding: const EdgeInsets.only(right: 6), child: RoleGlyph(r, size: 16, color: roleColor(r))),
                              ),
                              TextSpan(text: S.role[r]),
                            ],
                          ),
                          style: th.copyWith(color: roleColor(r)),
                          softWrap: narrow,
                        ),
                      ),
                    ),
                    Expanded(child: Text(S.roleBlurb[r]!, style: td)),
                  ],
                ),
              ),
          ],
        );
      },
    );
  }
}

String _roleSuffix(Role? role) => role != null ? ' (${S.role[role] ?? role})' : '';

/// `logText`: açık olay günlüğünün satırları.
String _logText(LogEntry e, String Function(String id) nick) => switch (e.k) {
  'start' => 'Oyun ${e.players} kişiyle başladı. Herkes rolünü öğrendi.',
  'night' => '${e.night}. gece çöktü.',
  'dawn' =>
    e.deaths.isNotEmpty
        ? 'Sabah oldu. Gece ölenler: ${e.deaths.map((d) => nick(d.id) + _roleSuffix(d.role)).join(', ')}.'
        : 'Sabah oldu. Bu gece kimse ölmedi.',
  'grief' => '${nick(e.id)}${_roleSuffix(e.role)}, ${nick(e.partner)} için kalp acısından öldü.',
  'shot' => 'Avcı ${nick(e.hunter)} son atışıyla ${nick(e.target)}${_roleSuffix(e.role)} kişisini vurdu.',
  'noShot' => 'Avcı ${nick(e.hunter)} atış yapmadan öldü.',
  'nominate' => '${nick(e.by)}, ${nick(e.target)} kişisini aday gösterdi.',
  'noCandidates' => 'Kimse aday gösterilmedi; bugün kimse asılmadı.',
  'runoff' => 'Oylar eşit: ${e.candidates.map(nick).join(' ve ')} arasında ikinci tur.',
  'hanged' => '${nick(e.id)}${_roleSuffix(e.role)} ${e.votes} oyla asıldı.',
  'spared' => e.tie ? 'Oylar eşit çıktı; kimse asılmadı.' : 'Köy bugün kimseyi asmadı.',
  'over' => '${e.winner != null ? (SPlay.winner[e.winner] ?? e.winner!) : SPlay.noWinner}. ${SPlay.reason[e.reason] ?? ''}',
  _ => '',
};

/// `secretText`: gece olanlar (hayaletlere ve oyun sonunda herkese).
String _secretText(SecretEntry e, String Function(String id) nick) => switch (e.k) {
  'lovers' => '${e.night}. gece: aşk okçusu ${nick(e.a)} ile ${nick(e.b)} kişisini âşık etti.',
  'wolves' => e.target != null ? '${e.night}. gece: kurtlar ${nick(e.target!)} kişisini seçti.' : '${e.night}. gece: kurtlar kimseyi seçemedi.',
  'seer' => '${e.night}. gece: kahin ${nick(e.seer)}, ${nick(e.target ?? '')} kişisine baktı (${e.wolf ? 'kurt' : 'kurt değil'}).',
  'doctor' => '${e.night}. gece: doktor ${nick(e.doctor)}, ${nick(e.target ?? '')} kişisini korudu.',
  'heal' => '${e.night}. gece: cadı ${nick(e.witch)}, ${nick(e.target ?? '')} kişisini iyileştirdi.',
  'poison' => '${e.night}. gece: cadı ${nick(e.witch)}, ${nick(e.target ?? '')} kişisini zehirledi.',
  'saved' => '${e.night}. gece: ${nick(e.target ?? '')} kurtlardan kurtuldu.',
  _ => '',
};
