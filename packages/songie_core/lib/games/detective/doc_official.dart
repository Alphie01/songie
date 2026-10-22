// Resmî belgeler: ifade tutanağı, rapor, HTS, banka dökümü, geçiş kaydı, liste, kroki.
part of 'documents.dart';

// ---------------------------------------------------------------- İfade tutanağı

class _Statement extends StatelessWidget {
  const _Statement(this.c);
  final _Doc c;

  @override
  Widget build(BuildContext context) {
    final d = c.doc;
    final personId = d.str('person');
    final ch = c.desk.chars[personId];
    final name = ch?.name ?? personId;
    final capKey = d.str('capacity');
    final cap = SDoc.capacity[capKey] ?? capKey;
    final datetime = d.str('datetime');
    final year = _yearOf(datetime);
    final place = d.str('place');
    final takenBy = d.str('takenBy');
    final qa = d.objs('qa');
    final body = d.strOrNull('body');
    final hasBody = body != null && body.trim().isNotEmpty;
    final pad = _paperPad(c.narrow);
    final f = _F(family: DtFont.serif, size: c.em);
    final title = _heading(f, 1.22, weight: FontWeight.w700);
    final tf = f(k: 0.92);

    final header = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('T.C.', textAlign: TextAlign.center, style: f(weight: FontWeight.w700, spacing: f.em(0.1)).s),
        Text(upper(place), textAlign: TextAlign.center, style: f(k: 0.9).s),
        SizedBox(height: title.em(0.9)),
        Text(
          upper('$cap ${SDoc.statementTitle}'),
          textAlign: TextAlign.center,
          style: title(spacing: title.em(0.06)).s.copyWith(decoration: TextDecoration.underline, decorationColor: f.color),
        ),
        SizedBox(height: title.em(0.3)),
        Text('${SDoc.fNo}: ${year.isNotEmpty ? '$year/' : ''}${c.serial(5)}', textAlign: TextAlign.right, style: f(k: 0.78, family: DtFont.sans).s),
      ],
    );

    final cellPad = EdgeInsets.symmetric(horizontal: tf.em(0.6), vertical: tf.em(0.35));
    const rule = BorderSide(color: DtC.rule);
    final th = tf(weight: FontWeight.w700);
    _TRow row(String k, String v, {Widget? child}) => _TRow(
      [_Cell(k, th.s, background: const Color(0x09000000)), _Cell(v, tf.s, child: child)],
      cellBorder: rule,
      padding: cellPad,
      valignTop: true,
    );
    final idblock = _DocTable(
      columns: 2,
      scaler: c.scaler,
      fixedFractions: const [0.34, 0.66],
      rows: [
        row(SDoc.fName, upper(name), child: Align(alignment: Alignment.topLeft, child: _plink(upper(name), tf.s, () => c.person(personId)))),
        if (ch?.age != null) row(SDoc.fAge, '${ch!.age}'),
        if (ch != null && ch.role.isNotEmpty) row(SDoc.fRole, ch.role),
        row(SDoc.fCapacity, cap),
        row(SDoc.fPlace, place),
        row(SDoc.fDatetime, datetime),
        row(SDoc.fTakenBy, takenBy),
      ],
    );

    final kf = f(weight: FontWeight.w700, spacing: f.em(0.04));
    Widget qaLine(String k, String v) => Text.rich(
      TextSpan(children: [TextSpan(text: '${upper(k)}:', style: kf.s), TextSpan(text: ' $v')]),
      style: f.s,
      textAlign: TextAlign.justify,
    );
    final bodyItems = <Widget>[];
    for (var i = 0; i < qa.length; i++) {
      if (i > 0) bodyItems.add(SizedBox(height: f.em(1)));
      bodyItems
        ..add(qaLine(SDoc.asked, qa[i].str('q')))
        ..add(SizedBox(height: f.em(0.7)))
        ..add(qaLine(SDoc.answered, qa[i].str('a')));
    }
    if (hasBody) {
      if (qa.isNotEmpty) bodyItems.add(SizedBox(height: f.em(1)));
      bodyItems.add(Paras(body, style: f.s, gap: f.em(0.7), textAlign: TextAlign.justify));
    }

    final sealColor = const Color.fromRGBO(38, 58, 160, 0.7);
    final seal = Positioned(
      top: -f.em(1.6),
      right: -f.em(0.6),
      child: IgnorePointer(
        child: Transform.rotate(
          angle: deg(-14),
          child: _InkMask(child: _Seal(text: place, center: 'T.C.', color: sealColor, size: f.em(6.6))),
        ),
      ),
    );
    final last = takenBy.split(' ').last;

    return _Paper(
      f: f,
      px: pad.px,
      py: pad.py,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          header,
          SizedBox(height: f.em(1.6)),
          idblock,
          if (bodyItems.isNotEmpty) ...[
            SizedBox(height: tf.em(1.6)),
            ...bodyItems,
            SizedBox(height: math.max(f.em(hasBody ? 0.7 : 1), f.em(1.4))),
          ] else
            SizedBox(height: math.max(tf.em(1.6), f.em(1.4))),
          Text(SDoc.statementClose, style: f(italic: true).s),
          SizedBox(height: f.em(2.4)),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: _Sign(f: f, role: SDoc.signGiver, scribble: name, name: name)),
              SizedBox(width: f.em(2)),
              Expanded(
                child: SizedBox(
                  width: double.infinity,
                  child: _Sign(f: f, role: SDoc.signTaker, scribble: last, name: takenBy, seal: seal),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------- Rapor

const _official = {'scene', 'autopsy', 'lab', 'police', 'expert'};
const _navy = Color(0xFF1F3A5F);

class _Report extends StatelessWidget {
  const _Report(this.c);
  final _Doc c;

  @override
  Widget build(BuildContext context) {
    final d = c.doc;
    final variant = d.str('variant', 'police');
    final agency = d.str('agency');
    final parts = agency.split(RegExp(r'\s*[·|]\s*|\s+—\s+')).where((p) => p.isNotEmpty).toList();
    final official = _official.contains(variant);
    final memo = variant == 'internal';
    final insurance = variant == 'insurance';
    final lab = variant == 'lab';
    final sans = insurance || memo || variant == 'medical';
    final f = _F(family: sans ? DtFont.sans : DtFont.serif, size: c.em);
    final pad = _paperPad(c.narrow);
    final head0 = parts.isNotEmpty ? parts.first : agency;

    // Antet
    final hf = insurance ? f(color: Colors.white) : f;
    final af = hf(k: 0.85, height: 1.35);
    final align = insurance || memo ? TextAlign.left : TextAlign.center;
    final Widget logo = official
        ? _Seal(text: head0, center: 'T.C.', color: const Color(0xFF3B3D39), size: f.em(4.2))
        : Container(
            width: f.em(2.8),
            height: f.em(2.8),
            alignment: Alignment.center,
            decoration: BoxDecoration(color: insurance ? Colors.white : (memo ? DtC.ink : _navy), borderRadius: BorderRadius.circular(f.em(0.3))),
            child: Text(initials(head0), style: f(family: DtFont.sans, weight: FontWeight.w800, color: insurance ? _navy : Colors.white).s),
          );
    final vf = hf(k: 0.66, family: DtFont.sans, height: 1.3, color: insurance ? const Color(0xB3FFFFFF) : DtC.ink2);
    final headRow = Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        logo,
        SizedBox(width: f.em(1)),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (official) Text('T.C.', textAlign: align, style: af(weight: FontWeight.w700).s),
              for (var i = 0; i < parts.length; i++)
                Text(official ? upper(parts[i]) : parts[i], textAlign: align, style: (i == 0 ? af(weight: FontWeight.w700) : af).s),
            ],
          ),
        ),
        SizedBox(width: f.em(1)),
        SizedBox(width: vf.em(5.6), child: Text(SDoc.report[variant] ?? variant, textAlign: TextAlign.right, style: vf.s)),
      ],
    );
    Widget? fullBleed;
    final top = <Widget>[];
    if (insurance) {
      fullBleed = Container(
        color: _navy,
        padding: EdgeInsets.symmetric(vertical: f.em(1.1), horizontal: f.em(pad.px)),
        child: headRow,
      );
      top.add(SizedBox(height: f.em(1.5)));
    } else {
      final double = variant == 'autopsy' || variant == 'medical';
      top
        ..add(headRow)
        ..add(SizedBox(height: f.em(0.9)))
        ..add(double ? const _DoubleLine(color: DtC.ink, width: 4) : Container(height: memo ? 1 : 2, color: DtC.ink))
        ..add(SizedBox(height: f.em(1.2)));
    }

    if (memo) {
      final mf = f(k: 1.5, family: DtFont.sans, weight: FontWeight.w800);
      top
        ..add(Text(upper(SDoc.report['internal']!), style: mf(spacing: mf.em(0.18)).s))
        ..add(SizedBox(height: mf.em(0.6)));
    }

    // Künye
    final mf = f(k: 0.92, family: lab ? DtFont.type : null);
    Widget metaRow(String k, String v) => Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(width: mf.em(4.6), child: Text('$k :', style: mf(weight: FontWeight.w700).s)),
        Expanded(child: Text(v, style: mf.s)),
      ],
    );
    Widget meta = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: _gapped(mf.em(0.15), [
        metaRow(SDoc.fNo, d.str('docNo')),
        metaRow(SDoc.fDate, d.str('datetime')),
        metaRow(SDoc.fSubject, d.str('heading')),
      ]),
    );
    if (lab) {
      meta = Container(
        padding: EdgeInsets.symmetric(vertical: mf.em(0.6), horizontal: mf.em(0.8)),
        decoration: BoxDecoration(border: Border.all(color: DtC.ink)),
        child: meta,
      );
    } else if (memo) {
      meta = Container(
        padding: EdgeInsets.symmetric(vertical: mf.em(0.5)),
        decoration: const BoxDecoration(border: Border(top: BorderSide(color: DtC.rule), bottom: BorderSide(color: DtC.rule))),
        child: meta,
      );
    }

    final expert = variant == 'expert';
    final tf = _heading(f, expert ? 1.3 : 1.12);
    final sf = _heading(f, 1, weight: FontWeight.w700);
    final sections = d.objs('sections');
    final sig = d.str('signature');

    return _Paper(
      f: f,
      px: pad.px,
      py: pad.py,
      header: fullBleed,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ...top,
          meta,
          if (!memo) ...[
            SizedBox(height: math.max(mf.em(1.2), tf.em(0.4))),
            Text(upper(d.str('heading')), textAlign: TextAlign.center, style: tf(spacing: tf.em(expert ? 0.1 : 0.04)).s),
            SizedBox(height: tf.em(1.2)),
          ] else
            SizedBox(height: mf.em(1.2)),
          for (var i = 0; i < sections.length; i++) ...[
            if (i > 0) SizedBox(height: f.em(1)),
            Text('${i + 1}. ${sections[i].str('title')}', style: sf.s),
            SizedBox(height: sf.em(0.3)),
            Paras(sections[i].str('text'), style: f.s, gap: f.em(0.7), textAlign: TextAlign.justify),
          ],
          SizedBox(height: f.em(2.4)),
          Wrap(
            alignment: WrapAlignment.end,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: f.em(1.5),
            runSpacing: f.em(1.5),
            children: [
              _Stamp(text: SDoc.reportStamp[variant] ?? '', f: f, blue: !(insurance || memo)),
              _Sign(f: f, scribble: sig.split(' ').last, name: sig),
            ],
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------- HTS

/// HTS sürekli formunun kenar delikleri (`.dt-hts::before/::after`).
class _SprocketPainter extends CustomPainter {
  _SprocketPainter({required this.left, required this.em});
  final bool left;
  final double em;
  @override
  void paint(Canvas canvas, Size size) {
    final hole = Paint()..color = DtC.stage;
    for (double y = 0.8 * em; y - 0.34 * em < size.height; y += 1.6 * em) {
      canvas.drawCircle(Offset(size.width / 2, y), 0.32 * em, hole);
    }
    final dash = Paint()
      ..color = const Color(0x24000000)
      ..strokeWidth = 1;
    final x = left ? size.width - 0.5 : 0.5;
    for (double y = 0; y < size.height; y += 6) {
      canvas.drawLine(Offset(x, y), Offset(x, math.min(y + 3, size.height)), dash);
    }
  }

  @override
  bool shouldRepaint(_SprocketPainter old) => old.em != em || old.left != left;
}

class _PhoneLog extends StatelessWidget {
  const _PhoneLog(this.c);
  final _Doc c;

  @override
  Widget build(BuildContext context) {
    final d = c.doc;
    final f = _F(family: DtFont.type, size: c.em, color: const Color(0xFF2B2D2A), shadows: const [Shadow(color: Color(0x8C000000), blurRadius: 0.4)]);
    final px = c.narrow ? 2.8 : 3.4;
    final py = c.narrow ? 2.0 : 3.0;
    final mf = f(k: 0.85);
    Widget dl(String k, String v) => _dlInline(k, v, dtStyle: mf.s, ddStyle: mf(weight: FontWeight.w700).s, gap: mf.em(0.4), suffix: ':');
    final tf = f(k: 0.84);
    final thPad = EdgeInsets.symmetric(horizontal: tf.em(0.6), vertical: tf.em(0.3));
    final tdPad = EdgeInsets.symmetric(horizontal: tf.em(0.6), vertical: tf.em(0.32));
    final rows = d.objs('rows');
    final table = _DocTable(
      columns: 6,
      scaler: c.scaler,
      rows: [
        _TRow(
          [
            for (final h in ['#', SDoc.htsDatetime, SDoc.htsType, SDoc.htsOther, SDoc.htsDuration, SDoc.htsTower]) _Cell(h, tf(weight: FontWeight.w700).s, nowrap: true),
          ],
          bottom: const BorderSide(color: Color(0xFF444444)),
          padding: thPad,
        ),
        for (var i = 0; i < rows.length; i++)
          () {
            final r = rows[i];
            final cf = r.str('type') == 'cevapsız' ? tf(color: const Color(0xFF8A2A1E)) : tf;
            return _TRow(
              [
                _Cell((i + 1).toString().padLeft(3, '0'), cf.s, nowrap: true),
                _Cell(r.str('datetime'), cf.s, nowrap: true),
                _Cell(upper(r.str('type')), cf.s, nowrap: true),
                _Cell(r.str('other'), cf.s, nowrap: true),
                _Cell(r.strOrNull('duration') ?? '—', cf.s, nowrap: true),
                _Cell(r.strOrNull('tower') ?? '—', cf.s, nowrap: true),
              ],
              background: i % 4 < 2 ? const Color.fromRGBO(120, 180, 130, 0.22) : null,
              padding: tdPad,
            );
          }(),
      ],
    );
    final ff = f(k: 0.75);
    return _Paper(
      f: f,
      px: px,
      py: py,
      background: const Color(0xFFFBFBF6),
      overlay: [
        Positioned(left: 0, top: 0, bottom: 0, width: f.em(2.2), child: CustomPaint(painter: _SprocketPainter(left: true, em: f.size))),
        Positioned(right: 0, top: 0, bottom: 0, width: f.em(2.2), child: CustomPaint(painter: _SprocketPainter(left: false, em: f.size))),
      ],
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(upper(SDoc.htsTitle), textAlign: TextAlign.center, style: f(weight: FontWeight.w700, spacing: f.em(0.08)).s),
          SizedBox(height: f.em(0.8)),
          const _Dashed(color: Color(0xFF777777)),
          Padding(
            padding: EdgeInsets.symmetric(vertical: mf.em(0.5)),
            child: _AutoGrid(
              minWidth: mf.em(12),
              rowGap: mf.em(0.3),
              columnGap: mf.em(1.2),
              children: [dl(SDoc.fSubscriber, d.str('subscriber')), dl(SDoc.fNumber, d.str('number')), dl(SDoc.fPeriod, d.str('period'))],
            ),
          ),
          const _Dashed(color: Color(0xFF777777)),
          SizedBox(height: f.em(1)),
          table,
          SizedBox(height: ff.em(1)),
          Text(SDoc.page(1, 1), textAlign: TextAlign.right, style: ff.s),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------- Banka dökümü

class _Bank extends StatelessWidget {
  const _Bank(this.c);
  final _Doc c;

  @override
  Widget build(BuildContext context) {
    final d = c.doc;
    final f = _F(family: DtFont.sans, size: c.em * 0.92);
    final pad = _paperPad(c.narrow);
    const blue = Color(0xFF1D4E89);
    final bank = d.str('bank');
    final rows = d.objs('rows');
    final totalIn = rows.map((r) => r.number('amount')).where((a) => a > 0).fold<double>(0, (t, a) => t + a);
    final totalOut = rows.map((r) => r.number('amount')).where((a) => a < 0).fold<double>(0, (t, a) => t + a);

    final head = Container(
      padding: EdgeInsets.only(bottom: f.em(1)),
      decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: blue, width: 3))),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            width: f.em(2.8),
            height: f.em(2.8),
            alignment: Alignment.center,
            decoration: BoxDecoration(color: blue, borderRadius: BorderRadius.circular(f.em(0.5))),
            child: Text(initials(bank), style: f(weight: FontWeight.w800, color: Colors.white).s),
          ),
          SizedBox(width: f.em(0.9)),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(bank, style: f(k: 1.15, weight: FontWeight.w700, color: blue).s),
                Text(SDoc.bankTitle, style: f(k: 0.9, color: const Color(0xFF5B6066)).s),
              ],
            ),
          ),
        ],
      ),
    );

    final dtS = f(k: 0.75, color: const Color(0xFF6B7076)).s;
    final ddS = f.s.copyWith(fontWeight: FontWeight.w600);
    final meta = _AutoGrid(
      minWidth: f.em(13),
      rowGap: f.em(0.6),
      columnGap: f.em(1.4),
      children: [
        _dlStack(SDoc.fHolder, d.str('holder'), dtStyle: dtS, ddStyle: ddS),
        _dlStack(SDoc.fIban, d.str('iban'), dtStyle: dtS, ddStyle: ddS.copyWith(fontFeatures: tabular)),
        _dlStack(SDoc.fPeriod, d.str('period'), dtStyle: dtS, ddStyle: ddS),
      ],
    );

    final tf = f(k: 0.92);
    final pad6 = EdgeInsets.symmetric(horizontal: tf.em(0.6), vertical: tf.em(0.5));
    final th = tf(weight: FontWeight.w700, color: const Color(0xFF33404D));
    final num = tf.s.copyWith(fontFeatures: tabular);
    const pos = Color(0xFF1E7A3C);
    const neg = Color(0xFFB3261E);
    const line = BorderSide(color: Color(0xFFE1E4E8));
    const foot = BorderSide(color: Color(0xFFC9D1DA), width: 2);
    final fb = tf(weight: FontWeight.w700);
    final table = _DocTable(
      columns: 4,
      scaler: c.scaler,
      rows: [
        _TRow(
          [
            _Cell(SDoc.bankDate, th.s, nowrap: true),
            _Cell(SDoc.bankDesc, th.s, nowrap: true),
            _Cell(SDoc.bankAmount, th.s, nowrap: true, align: TextAlign.right),
            _Cell(SDoc.bankBalance, th.s, nowrap: true, align: TextAlign.right),
          ],
          background: const Color(0xFFE8EDF3),
          padding: pad6,
        ),
        for (var i = 0; i < rows.length; i++)
          () {
            final r = rows[i];
            final a = r.number('amount');
            final bal = r.numOrNull('balance');
            return _TRow(
              [
                _Cell(r.str('date'), num, nowrap: true),
                _Cell(r.str('desc'), tf.s),
                _Cell('${a > 0 ? '+' : (a < 0 ? '−' : '')}${money(a.abs())}', num.copyWith(color: a < 0 ? neg : pos), nowrap: true, align: TextAlign.right),
                _Cell(bal != null ? money(bal) : '', num, nowrap: true, align: TextAlign.right),
              ],
              background: i.isOdd ? const Color(0xFFF6F8FA) : null,
              bottom: line,
              padding: pad6,
            );
          }(),
        _TRow(
          [
            _Cell(SDoc.bankIn, fb.s, span: 2),
            _Cell('+${money(totalIn)}', fb.s.copyWith(color: pos, fontFeatures: tabular), nowrap: true, align: TextAlign.right),
            _Cell('', fb.s),
          ],
          top: foot,
          padding: pad6,
        ),
        _TRow(
          [
            _Cell(SDoc.bankOut, fb.s, span: 2),
            _Cell('−${money(totalOut.abs())}', fb.s.copyWith(color: neg, fontFeatures: tabular), nowrap: true, align: TextAlign.right),
            _Cell('', fb.s),
          ],
          top: foot,
          padding: pad6,
        ),
      ],
    );

    return _Paper(
      f: f,
      px: pad.px,
      py: pad.py,
      background: const Color(0xFFFDFDFC),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [head, SizedBox(height: f.em(1.2)), meta, SizedBox(height: f.em(1.2)), table],
      ),
    );
  }
}

// ---------------------------------------------------------------- Kartlı geçiş

class _AccessLog extends StatelessWidget {
  const _AccessLog(this.c);
  final _Doc c;

  @override
  Widget build(BuildContext context) {
    final d = c.doc;
    final f = _F(family: DtFont.sans, size: c.em * 0.9);
    final pad = _paperPad(c.narrow);
    final rows = d.objs('rows');
    final rej = rows.where((r) => r.str('result') == 'RET').length;
    final alarm = rows.where((r) => r.str('result') == 'ALARM').length;
    final mf = f(k: 0.85);
    Widget dl(String k, String v) =>
        _dlInline(k, v, dtStyle: mf(color: const Color(0xFF666666)).s, ddStyle: mf.s.copyWith(fontWeight: FontWeight.w600), gap: mf.em(0.4));

    final head = Container(
      padding: EdgeInsets.symmetric(vertical: f.em(0.7), horizontal: f.em(0.9)),
      decoration: BoxDecoration(border: Border.all(color: const Color(0xFF333333), width: 1.5)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(d.str('system'), style: f(k: 0.75, family: DtFont.type, color: const Color(0xFF555555)).s),
          SizedBox(height: f.em(0.1)),
          Text(upper(SDoc.accessTitle), style: f(weight: FontWeight.w800, spacing: f.em(0.06)).s),
          SizedBox(height: f.em(0.5)),
          Wrap(
            spacing: mf.em(1.6),
            runSpacing: mf.em(0.3),
            children: [dl(SDoc.fSite, d.str('site')), dl(SDoc.fPeriod, d.str('period')), dl(SDoc.fNo, 'RPR-${c.serial(6)}')],
          ),
        ],
      ),
    );

    final tf = f(k: 0.88, family: DtFont.type);
    final thf = tf(k: 0.85, family: DtFont.sans, weight: FontWeight.w700);
    final table = _DocTable(
      columns: 5,
      scaler: c.scaler,
      rows: [
        _TRow(
          [
            for (final h in [SDoc.accessTime, SDoc.accessCard, SDoc.accessHolder, SDoc.accessDoor, SDoc.accessResult]) _Cell(h, thf.s, nowrap: true),
          ],
          bottom: const BorderSide(color: Color(0xFF333333), width: 1.5),
          padding: EdgeInsets.symmetric(horizontal: thf.em(0.6), vertical: thf.em(0.35)),
        ),
        for (final r in rows)
          () {
            final res = r.str('result');
            final cf = switch (res) {
              'RET' => tf(color: const Color(0xFFA3241A)),
              'ALARM' => tf(color: const Color(0xFF8B0F06), weight: FontWeight.w700),
              'ÇIKIŞ' => tf(color: const Color(0xFF666666)),
              _ => tf,
            };
            final bf = cf(k: 0.85);
            return _TRow(
              [
                _Cell(r.str('time'), cf.s, nowrap: true),
                _Cell(r.str('card'), cf.s, nowrap: true),
                _Cell(r.str('holder'), cf.s, nowrap: true),
                _Cell(r.str('door'), cf.s, nowrap: true),
                _Cell(
                  res,
                  bf.s,
                  nowrap: true,
                  childWidth: bf.em(0.9) + 2,
                  child: Container(
                    padding: EdgeInsets.symmetric(horizontal: bf.em(0.45), vertical: bf.em(0.05)),
                    decoration: BoxDecoration(border: Border.all(color: cf.color), borderRadius: BorderRadius.circular(bf.em(0.2))),
                    child: Text(res, style: bf.s, softWrap: false),
                  ),
                ),
              ],
              background: switch (res) {
                'RET' => const Color.fromRGBO(220, 60, 40, 0.08),
                'ALARM' => const Color.fromRGBO(220, 60, 40, 0.18),
                _ => null,
              },
              bottom: const BorderSide(color: Color(0xFFE2E2DE)),
              padding: EdgeInsets.symmetric(horizontal: tf.em(0.6), vertical: tf.em(0.35)),
            );
          }(),
      ],
    );
    final ff = f(k: 0.75, family: DtFont.type, color: const Color(0xFF666666));
    return _Paper(
      f: f,
      px: pad.px,
      py: pad.py,
      background: const Color(0xFFFCFCFA),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          head,
          SizedBox(height: f.em(1)),
          table,
          SizedBox(height: ff.em(0.8)),
          Text(SDoc.accessSummary(rows.length, rej, alarm), style: ff.s),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------- Resmî liste

class _ListTable extends StatelessWidget {
  const _ListTable(this.c);
  final _Doc c;

  @override
  Widget build(BuildContext context) {
    final d = c.doc;
    final f = _F(family: DtFont.serif, size: c.em);
    final pad = _paperPad(c.narrow);
    final hf = _heading(f, 1.15, weight: FontWeight.w700);
    final note = d.strOrNull('note');
    final nf = f(k: 0.88, italic: true, color: DtC.ink2);
    final columns = d.strs('columns');
    final rows = [for (final r in d.list('rows')) if (r is List) r.map((e) => e?.toString() ?? '').toList()];
    final tf = f(k: 0.92);
    final cellPad = EdgeInsets.symmetric(horizontal: tf.em(0.6), vertical: tf.em(0.4));
    const border = BorderSide(color: Color(0xFF6D6D66));
    final table = _DocTable(
      columns: math.max(1, columns.length),
      scaler: c.scaler,
      rows: [
        _TRow([for (final h in columns) _Cell(h, tf(weight: FontWeight.w700).s)], background: const Color(0x0F000000), cellBorder: border, padding: cellPad, valignTop: true),
        for (final r in rows)
          _TRow([for (var j = 0; j < columns.length; j++) _Cell(j < r.length ? r[j] : '', tf.s)], cellBorder: border, padding: cellPad, valignTop: true),
      ],
    );
    return _Paper(
      f: f,
      px: pad.px,
      py: pad.py,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(d.str('heading'), textAlign: TextAlign.center, style: hf.s),
          SizedBox(height: hf.em(0.4)),
          if (note != null && note.isNotEmpty) ...[
            Text(note, textAlign: TextAlign.center, style: nf.s),
            SizedBox(height: nf.em(1)),
          ],
          table,
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------- Kroki

class _Floor extends StatelessWidget {
  const _Floor(this.c);
  final _Doc c;

  @override
  Widget build(BuildContext context) {
    final d = c.doc;
    final f = _F(family: DtFont.sans, size: c.em);
    final pad = _paperPad(c.narrow);
    final locId = d.str('location');
    LocationView? loc;
    for (final l in c.desk.view.locations) {
      if (l.id == locId) loc = l;
    }
    final plan = loc?.plan;
    final cf = f(k: 0.9, italic: true, color: DtC.ink2);
    return _Paper(
      f: f,
      px: pad.px,
      py: pad.py,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: EdgeInsets.only(bottom: f.em(0.4)),
            decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: DtC.ink, width: 1.5))),
            child: Wrap(
              alignment: WrapAlignment.spaceBetween,
              crossAxisAlignment: WrapCrossAlignment.end,
              spacing: f.em(1),
              runSpacing: f.em(0.4),
              children: [
                Text(upper(SDoc.floorplanTitle), style: f(weight: FontWeight.w800, spacing: f.em(0.12)).s),
                Text(loc?.name ?? locId, style: f(k: 0.9).s),
              ],
            ),
          ),
          SizedBox(height: f.em(1)),
          if (plan != null)
            FloorPlanView(plan: plan, title: loc!.name, fontSize: f.size)
          else
            Text(SDoc.planMissing, style: f(color: DtC.ink2).s),
          SizedBox(height: plan != null ? cf.em(1) : math.max(f.em(0.7), cf.em(1))),
          Text(d.str('caption'), style: cf.s),
          SizedBox(height: cf.em(0.7)),
        ],
      ),
    );
  }
}
