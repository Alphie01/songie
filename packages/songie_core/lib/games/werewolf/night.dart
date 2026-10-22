part of 'play_view.dart';

/// `Night`: izleyici, ölü ya da sırası gelmeyen uyur; sırası gelen rol eylem panelini görür.
class _Night extends StatelessWidget {
  const _Night({required this.g});
  final _G g;

  @override
  Widget build(BuildContext context) {
    final me = g.view.me;
    if (me == null) return _Sleep(g: g, note: SPlay.spectator);
    if (!me.alive) return _Sleep(g: g, note: SPlay.deadNight);
    // Aynı anda düzeni: herkesin ekranında ateşböcekleri; rolü olan önce eylemini yapar.
    if (me.chores != null) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: _gapCol(14, [
          if (me.turn != null) _Turn(key: ValueKey(g.view.session), g: g, turn: me.turn!),
          _Chores(key: ValueKey('chores-${g.view.session}'), g: g, done: me.chores!),
        ]),
      );
    }
    if (me.turn == null) return _Sleep(g: g);
    return _Turn(key: ValueKey(g.view.session), g: g, turn: me.turn!);
  }
}

const _flyCells = 9;
const _flyHop = Duration(milliseconds: 1300);

/// `Chores` (`.ww-chores`): aynı anda düzeninin mini oyunu — yanan ateşböceğine dokun.
/// Hedef sayıya ulaşınca sunucuya bildirilir.
class _Chores extends StatefulWidget {
  const _Chores({super.key, required this.g, required this.done});
  final _G g;
  final bool done;

  @override
  State<_Chores> createState() => _ChoresState();
}

class _ChoresState extends State<_Chores> {
  final _rnd = math.Random();
  late int _lit = _rnd.nextInt(_flyCells);
  int _hits = 0;
  bool _sent = false;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _restart();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _restart() {
    _timer?.cancel();
    _timer = Timer.periodic(_flyHop, (_) => setState(_hop));
  }

  void _hop() => _lit = (_lit + 1 + _rnd.nextInt(_flyCells - 1)) % _flyCells;

  void _tap(int i) {
    if (i != _lit) return;
    setState(() {
      _hits++;
      _hop();
    });
    _restart();
    if (_hits >= choresGoal && !widget.done && !_sent) {
      _sent = true;
      widget.g.send({'type': 'chores', 'session': widget.g.view.session}).then((ok) {
        if (!ok) _sent = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final pal = widget.g.pal;
    final finished = widget.done || _hits >= choresGoal;
    final left = math.max(0, choresGoal - _hits);
    return _Panel(
      children: [
        _title(SPlay.choresTitle),
        Grid2(
          columns: 3,
          rowGap: 10,
          columnGap: 10,
          children: [for (var i = 0; i < _flyCells; i++) _FlyTile(lit: i == _lit, pal: pal, onTap: () => _tap(i))],
        ),
        Semantics(liveRegion: true, child: _hint(finished ? SPlay.choresDone : SPlay.choresHint(left), pal)),
        Text(SPlay.choresCaught(_hits), style: T.b(12, color: pal.dim, weight: FontWeight.w800), textAlign: TextAlign.center),
      ],
    );
  }
}

/// `.ww-fly`: boş çalı ya da yanan ateşböceği (`.ww-fly-dot`, ay renginde parıltı).
class _FlyTile extends StatelessWidget {
  const _FlyTile({required this.lit, required this.pal, required this.onTap});
  final bool lit;
  final _Pal pal;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Pressable(
    onTap: onTap,
    label: lit ? SPlay.firefly : SPlay.fireflyOff,
    builder: (context, pressed) => AnimatedScale(
      scale: pressed ? 0.96 : 1,
      duration: const Duration(milliseconds: 100),
      child: Container(
        height: 74,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: pal.card,
          border: Border.all(color: lit ? pal.ring : pal.edge, width: 3),
          borderRadius: BorderRadius.circular(18),
        ),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 160),
          width: lit ? 19 : 14,
          height: lit ? 19 : 14,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: lit ? _moon : pal.soft,
            boxShadow: lit
                ? [
                    BoxShadow(color: _moon.withValues(alpha: 0.25), spreadRadius: 6),
                    BoxShadow(color: _moon.withValues(alpha: 0.55), blurRadius: 22, spreadRadius: 6),
                  ]
                : const [],
          ),
        ),
      ),
    ),
  );
}

/// `.ww-sleep`: ay, "köy uyuyor" ve hayattakilerin yüzleri.
class _Sleep extends StatelessWidget {
  const _Sleep({required this.g, this.note});
  final _G g;
  final String? note;

  @override
  Widget build(BuildContext context) {
    final alive = g.alive;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 26),
      child: Column(
        children: [
          const SizedBox(width: 110, height: 110, child: CustomPaint(painter: _MoonPainter())),
          const SizedBox(height: 12),
          Text(SPlay.sleepTitle, style: T.d(30, color: C.text, height: 1.05), textAlign: TextAlign.center),
          const SizedBox(height: 12),
          _MaxWidth(
            maxWidth: 300,
            child: Text(note ?? SPlay.sleepBody, style: T.b(15, color: C.text3, weight: FontWeight.w700), textAlign: TextAlign.center),
          ),
          const SizedBox(height: 12 + 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(trUpper('${SPlay.aliveNow} · ${alive.length}'), style: _labelStyle(g.pal, size: 12, color: C.text3)),
              const SizedBox(height: 8),
              _Faces(g: g, ids: [for (final x in alive) x.id]),
            ],
          ),
        ],
      ),
    );
  }
}

/// `.ww-sleep-faces`: `repeat(auto-fit, 46px)`, `justify-content: space-between`, aralık 10.
/// Sütun genişliği ekrandan hesaplanır (bu bölüm tam boy ekranın içinde, LayoutBuilder kullanılamaz).
class _Faces extends StatelessWidget {
  const _Faces({required this.g, required this.ids});
  final _G g;
  final List<String> ids;

  @override
  Widget build(BuildContext context) {
    if (ids.isEmpty) return const SizedBox();
    final w = math.min(440.0, MediaQuery.sizeOf(context).width - 2 * Layout.gutter(context));
    final cols = math.max(1, ((w + 10) / 56).floor());
    final used = math.min(cols, ids.length);
    final step = used > 1 ? (w - 46) / (used - 1) : 0.0;
    final rows = <Widget>[];
    for (var i = 0; i < ids.length; i += cols) {
      final row = ids.sublist(i, math.min(i + cols, ids.length));
      rows.add(
        SizedBox(
          width: w,
          height: 46,
          child: Stack(
            children: [
              for (var c = 0; c < row.length; c++)
                Positioned(
                  left: c * step,
                  top: 0,
                  child: Semantics(
                    label: g.members[row[c]]?.nick ?? '?',
                    child: _Face(
                      member: g.members[row[c]],
                      size: 46,
                      borderWidth: 3,
                      borderColor: const Color(0xFF000000),
                      fontSize: 19,
                      dim: !(g.members[row[c]]?.connected ?? false),
                    ),
                  ),
                ),
            ],
          ),
        ),
      );
    }
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: _gapCol(10, rows));
  }
}

/// `.ww-moon`: 110'luk ay, siyah çerçeve, sağ-altta iç gölge (`inset -24px -10px 0`).
class _MoonPainter extends CustomPainter {
  const _MoonPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final c = size.center(Offset.zero);
    const outer = 55.0;
    const inner = outer - 3;
    canvas.drawCircle(c, inner, Paint()..color = _moon);
    final shade = Path.combine(
      PathOperation.difference,
      Path()..addOval(Rect.fromCircle(center: c, radius: inner)),
      Path()..addOval(Rect.fromCircle(center: c + const Offset(-24, -10), radius: inner)),
    );
    canvas.drawPath(shade, Paint()..color = _moonShade);
    canvas.drawCircle(
      c,
      outer - 1.5,
      Paint()
        ..color = const Color(0xFF000000)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3,
    );
  }

  @override
  bool shouldRepaint(_MoonPainter old) => false;
}

/// `Turn`: gece sırası sende. Oturum değişince (yeni adım) yerel seçimler sıfırlanır.
class _Turn extends StatefulWidget {
  const _Turn({super.key, required this.g, required this.turn});
  final _G g;
  final NightTurn turn;

  @override
  State<_Turn> createState() => _TurnState();
}

class _TurnState extends State<_Turn> {
  List<String> _local = const [];
  bool _heal = false;
  bool _busy = false;
  (String, String)? _sentPair;

  Future<void> _go(Json action, [List<String>? optimistic]) async {
    setState(() => _busy = true);
    final ok = await widget.g.send(action);
    if (!mounted) return;
    setState(() {
      _busy = false;
      if (ok && optimistic != null) _local = optimistic;
    });
  }

  @override
  Widget build(BuildContext context) {
    final g = widget.g;
    final turn = widget.turn;
    final pal = g.pal;
    final session = g.view.session;
    String? first() => _local.isEmpty ? null : _local.first;

    switch (turn.step) {
      case 'cupid':
        final done = turn.pair ?? _sentPair;
        if (done != null) return _Panel(children: [_Note(SPlay.cupidDone(g.nick(done.$1), g.nick(done.$2)), pal: pal, done: true)]);
        final two = _local.length == 2;
        return _Panel(
          children: [
            _title(SPlay.cupidTitle),
            _PlayerGrid(
              g: g,
              ids: turn.targets,
              tone: 'love',
              picked: (id) => _local.contains(id),
              label: (n) => n,
              onPick: (id) => setState(() {
                if (_local.contains(id)) {
                  _local = _local.where((x) => x != id).toList();
                } else {
                  final next = [..._local, id];
                  _local = next.sublist(math.max(0, next.length - 2));
                }
              }),
            ),
            SButton(
              label: two ? SPlay.cupidConfirm(g.plainNick(_local[0]), g.plainNick(_local[1])) : SPlay.cupidPick,
              tone: BtnTone.primary,
              large: true,
              block: true,
              onPressed: !two || _busy
                  ? null
                  : () {
                      final pair = (_local[0], _local[1]);
                      g.send({'type': 'cupid', 'session': session, 'a': pair.$1, 'b': pair.$2}).then((ok) {
                        if (ok && mounted) setState(() => _sentPair = pair);
                      });
                    },
            ),
            _hint(SPlay.cupidHint, pal),
          ],
        );

      case 'wolves':
        final mine = first() ?? turn.votes[g.meId];
        final votes = {...turn.votes, if (first() != null) g.meId: first()!};
        final tally = <String, List<String>>{};
        for (final e in votes.entries) {
          (tally[e.value] ??= []).add(e.key);
        }
        return _Panel(
          children: [
            _title(SPlay.wolvesTitle),
            _PlayerGrid(
              g: g,
              ids: turn.targets,
              tone: 'wolf',
              picked: (id) => id == mine,
              label: (n) => n,
              badge: (id) {
                final by = tally[id];
                return by == null || by.isEmpty ? null : Semantics(label: by.map(g.plainNick).join(', '), child: _Claw(SPlay.wolfVotes(by.length), pal: pal));
              },
              onPick: (id) => _go({'type': 'wolfVote', 'session': session, 'target': id}, [id]),
            ),
            if (mine != null)
              SGhostButton(label: SPlay.wolvesWithdraw, block: true, onPressed: () => _go({'type': 'wolfVote', 'session': session, 'target': null}, [])),
            _hint(SPlay.wolvesHint, pal),
          ],
        );

      case 'seer':
        final result = turn.result;
        if (result != null) {
          return _Panel(
            children: [
              Transform.rotate(
                angle: deg(-2),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
                  decoration: BoxDecoration(
                    color: result.wolf ? C.red : C.mint,
                    border: Border.all(color: pal.edge, width: 3),
                    borderRadius: BorderRadius.circular(22),
                    boxShadow: hardShadow(6, 6, pal.edge),
                  ),
                  child: Column(
                    children: [
                      RoleGlyph(result.wolf ? 'wolf' : 'villager', size: 34, color: C.ink2),
                      const SizedBox(height: 8),
                      Text(
                        result.wolf ? SPlay.seerIsWolf(g.plainNick(result.id)) : SPlay.seerNotWolf(g.plainNick(result.id)),
                        style: T.d(24, color: C.ink2, height: 1.05),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              ),
              _hint(SPlay.stepDone, pal),
            ],
          );
        }
        return _Panel(
          children: [
            _title(SPlay.seerTitle),
            _PlayerGrid(
              g: g,
              ids: turn.targets,
              tone: 'seer',
              picked: (id) => _local.contains(id),
              label: (n) => n,
              onPick: _busy || _local.isNotEmpty ? null : (id) => _go({'type': 'seer', 'session': session, 'target': id}, [id]),
            ),
            _hint(_local.isNotEmpty ? SPlay.pending : SPlay.seerHint, pal),
          ],
        );

      case 'doctor':
        final picked = turn.picked ?? first();
        if (picked != null) {
          return _Panel(children: [_Note(SPlay.doctorDone(g.nick(picked)), pal: pal, done: true), _hint(SPlay.stepDone, pal)]);
        }
        return _Panel(
          children: [
            _title(SPlay.doctorTitle),
            _PlayerGrid(
              g: g,
              ids: turn.targets,
              tone: 'heal',
              label: (n) => n,
              disabled: (id) => id == turn.blocked ? SPlay.doctorBlocked : null,
              onPick: _busy ? null : (id) => _go({'type': 'doctor', 'session': session, 'target': id}, [id]),
            ),
            _hint(SPlay.doctorHint, pal),
          ],
        );

      case 'witch':
        if (turn.done || first() == 'done') return _Panel(children: [_Note(SPlay.witchDone, pal: pal, done: true)]);
        final poison = first();
        return _Panel(
          children: [
            _title(SPlay.witchTitle),
            Text(
              turn.victim != null ? SPlay.witchVictim(g.plainNick(turn.victim!)) : SPlay.witchNoVictim,
              style: T.d(19, color: C.text, height: 1.15),
            ),
            if (turn.victim != null)
              turn.canHeal
                  ? SToggle(label: SPlay.witchHeal(g.plainNick(turn.victim!)), value: _heal, onChanged: (v) => setState(() => _heal = v))
                  : _hint(SPlay.witchHealUsed, pal),
            if (turn.canPoison) ...[
              _sub(SPlay.witchPoison),
              _PlayerGrid(
                g: g,
                ids: turn.targets,
                tone: 'poison',
                label: (n) => n,
                picked: (id) => id == poison,
                onPick: (id) => setState(() => _local = id == poison ? const [] : [id]),
              ),
            ] else
              _hint(SPlay.witchPoisonUsed, pal),
            SButton(
              label: SPlay.witchConfirm,
              tone: BtnTone.primary,
              large: true,
              block: true,
              onPressed: _busy ? null : () => _go({'type': 'witch', 'session': session, 'heal': _heal, 'poison': poison}, ['done']),
            ),
            _hint(SPlay.witchHint, pal),
          ],
        );
    }
    return const SizedBox();
  }
}
