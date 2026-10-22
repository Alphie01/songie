part of 'play_view.dart';

/// Açılmış ajan kartının işareti.
const _agentMarkSvg =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">'
    '<path d="M4 9h16l-2-4H6z" /><circle cx="12" cy="13" r="3" /><path d="M6 21c0-3.5 2.7-5 6-5s6 1.5 6 5z" /></svg>';

/// Açılmış suikastçı kartının işareti.
const _assassinMarkSvg =
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" xmlns="http://www.w3.org/2000/svg">'
    '<circle cx="12" cy="12" r="7" /><path d="M12 2v5M12 17v5M2 12h5M17 12h5" /></svg>';

/// `.ag-board`: 5×5 kelime tablosu.
class _Board extends StatelessWidget {
  const _Board({required this.view, required this.meId, required this.members, required this.send});
  final AgentsView view;
  final String meId;
  final Map<String, RoomPlayer> members;
  final _Send send;

  @override
  Widget build(BuildContext context) {
    final canTouch = view.phase == 'guess' && view.myTeam == view.team && view.role == 'guesser';
    final myVote = view.cards.indexWhere((c) => c.votes.contains(meId));
    final last = view.lastReveal;
    return Grid2(
      columns: 5,
      rowGap: 6,
      columnGap: 6,
      equalHeight: true,
      children: [
        for (var i = 0; i < view.cards.length; i++)
          _CardTile(
            key: ValueKey('${view.board}-$i-${last != null && last.index == i ? last.id : 0}'),
            card: view.cards[i],
            fresh: last != null && last.index == i,
            canTouch: canTouch && !view.cards[i].revealed,
            mine: myVote == i,
            votesNeeded: view.revealMode == 'vote' ? view.votesNeeded : 0,
            members: members,
            onTouch: () => send({'type': 'touch', 'index': i, 'turn': view.turn}),
          ),
      ],
    );
  }
}

/// `.ag-card`: kelime kartı. Açılınca renklenir, 3px iner; yeni açılan kart 420ms'de yukarıdan döner (`ag-flip`).
class _CardTile extends StatefulWidget {
  const _CardTile({
    super.key,
    required this.card,
    required this.fresh,
    required this.canTouch,
    required this.mine,
    required this.votesNeeded,
    required this.members,
    required this.onTouch,
  });
  final AgentsCard card;
  final bool fresh;
  final bool canTouch;
  final bool mine;
  final int votesNeeded;
  final Map<String, RoomPlayer> members;
  final VoidCallback onTouch;

  @override
  State<_CardTile> createState() => _CardTileState();
}

class _CardTileState extends State<_CardTile> with SingleTickerProviderStateMixin {
  static const _curve = Cubic(0.2, 0.8, 0.2, 1);
  late final AnimationController _flip = AnimationController(vsync: this, duration: const Duration(milliseconds: 420));

  @override
  void initState() {
    super.initState();
    if (widget.fresh && widget.card.revealed) {
      _flip.forward(from: 0);
    } else {
      _flip.value = 1;
    }
  }

  @override
  void dispose() {
    _flip.dispose();
    super.dispose();
  }

  /// `.ag-word[data-len]` yazı boyu ve harf aralığı (480 ve 720px kırılımlarıyla).
  (double, double) _wordSize(double screen) {
    final len = widget.card.word.length;
    final step = len >= 12 ? 3 : (len >= 10 ? 2 : (len >= 8 ? 1 : 0));
    const spacing = [0.2, 0.0, -0.1, -0.2];
    final sizes = screen >= 720 ? const [13.0, 12.0, 11.0, 11.0] : (screen >= 480 ? const [12.0, 11.0, 10.0, 9.0] : const [10.0, 9.0, 8.0, 7.0]);
    return (sizes[step], spacing[step]);
  }

  @override
  Widget build(BuildContext context) {
    final card = widget.card;
    final color = card.color;
    final revealed = card.revealed;
    final screen = MediaQuery.sizeOf(context).width;
    final reduce = MediaQuery.disableAnimationsOf(context);
    final c = color == null ? null : _cardColor(color);
    final fg = revealed && color == 'assassin' ? C.red : C.ink2;
    final (fontSize, spacing) = _wordSize(screen);
    final label = revealed && color != null ? '${card.word}, ${S.color[color]}' : (color != null ? '${card.word} (${S.color[color]})' : card.word);

    final content = Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (revealed && (color == 'a' || color == 'b')) ...[SSvg(_agentMarkSvg, width: 20, height: 20, color: fg), const SizedBox(height: 3)],
        if (revealed && color == 'assassin') ...[SSvg(_assassinMarkSvg, width: 22, height: 22, color: fg), const SizedBox(height: 3)],
        Text(
          trUpper(card.word),
          style: T.b(fontSize, color: fg, weight: FontWeight.w800, height: 1.1, letterSpacing: spacing),
          maxLines: 1,
          softWrap: false,
          overflow: TextOverflow.visible,
          textAlign: TextAlign.center,
        ),
      ],
    );

    Widget tile(bool pressed) {
      final down = revealed || pressed;
      // `.ag-card[data-mine]`: 3px sarı dış çizgi, 1px açıkta. Kısıtları değiştirmeden kartın dışına çizilir.
      return CustomPaint(
        foregroundPainter: widget.mine ? const _OutlinePainter() : null,
        child: Container(
          constraints: BoxConstraints(minHeight: screen >= 480 ? 72 : 62),
          decoration: BoxDecoration(
            color: revealed && c != null ? c : C.paper,
            border: Border.all(color: C.ink, width: 2),
            borderRadius: BorderRadius.circular(12),
            boxShadow: hardShadow(0, down ? 1 : 4),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: CustomPaint(
              // Lider (ve tablo sonunda herkes): açılmamış kartın rengi altta 8px şerit.
              painter: !revealed && c != null ? _InsetStripPainter(color: c) : null,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Padding(padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 1), child: content),
                  if (card.votes.isNotEmpty)
                    Positioned(
                      top: 2,
                      right: 2,
                      child: _Votes(votes: card.votes, votesNeeded: widget.votesNeeded, members: widget.members, narrow: screen <= 480),
                    ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    return Pressable(
      onTap: widget.canTouch ? widget.onTouch : null,
      label: label,
      builder: (context, pressed) => ExcludeSemantics(
        child: AnimatedBuilder(
          animation: _flip,
          builder: (context, child) {
            final down = revealed || pressed;
            final transform = Matrix4.translationValues(0, down ? 3 : 0, 0);
            final t = reduce || !(widget.fresh && revealed) ? 1.0 : _curve.transform(_flip.value);
            if (t < 1) {
              // translateY(3px) perspective(400px) rotateX(80deg) → translateY(3px)
              transform
                ..multiply(Matrix4.identity()..setEntry(3, 2, -(1 - t) / 400))
                ..multiply(Matrix4.rotationX(deg(80 * (1 - t))));
            }
            return Transform(alignment: Alignment.center, transform: transform, child: child);
          },
          child: tile(pressed),
        ),
      ),
    );
  }
}

/// CSS `outline: 3px solid var(--yellow); outline-offset: 1px` (kenar yuvarlaklığını izler).
class _OutlinePainter extends CustomPainter {
  const _OutlinePainter();

  @override
  void paint(Canvas canvas, Size size) {
    const inset = 1 + 3 / 2;
    final rect = (Offset.zero & size).inflate(inset);
    canvas.drawRRect(
      RRect.fromRectAndRadius(rect, const Radius.circular(12 + inset)),
      Paint()
        ..color = C.yellow
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3,
    );
  }

  @override
  bool shouldRepaint(_OutlinePainter old) => false;
}

/// `box-shadow: inset 0 -8px 0 var(--c)`: iç kenarın 8px yukarı kaymış kopyasının dışında kalan alt şerit.
class _InsetStripPainter extends CustomPainter {
  _InsetStripPainter({required this.color});
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final box = RRect.fromRectAndRadius(Offset.zero & size, const Radius.circular(10));
    final strip = Path.combine(PathOperation.difference, Path()..addRRect(box), Path()..addRRect(box.shift(const Offset(0, -8))));
    canvas.drawPath(strip, Paint()..color = color);
  }

  @override
  bool shouldRepaint(_InsetStripPainter old) => old.color != color;
}

/// `.ag-votes`: oylayanların avatarları ve oy sayısı (480px ve altında yalnızca ilk avatar).
class _Votes extends StatelessWidget {
  const _Votes({required this.votes, required this.votesNeeded, required this.members, required this.narrow});
  final List<String> votes;
  final int votesNeeded;
  final Map<String, RoomPlayer> members;
  final bool narrow;

  @override
  Widget build(BuildContext context) {
    final avatars = [
      for (final id in votes.take(3))
        if (members[id] case final m?) _MiniAvatar(player: m),
    ];
    final items = <Widget>[
      ...(narrow ? avatars.take(1) : avatars),
      if (votesNeeded > 0)
        Text(
          '${votes.length}/$votesNeeded',
          style: T.b(9, color: C.paper, weight: FontWeight.w800),
        ),
    ];
    return Semantics(
      label: SPlay.votes(votes.length, votesNeeded),
      child: Container(
        padding: const EdgeInsets.fromLTRB(1, 1, 3, 1),
        decoration: BoxDecoration(color: C.ink2, borderRadius: BorderRadius.circular(R.pill)),
        child: HStack(gap: 1, mainAxisSize: MainAxisSize.min, children: items),
      ),
    );
  }
}

/// Oy rozetindeki 16px avatar (`border-width: 1px`).
class _MiniAvatar extends StatelessWidget {
  const _MiniAvatar({required this.player});
  final RoomPlayer player;

  @override
  Widget build(BuildContext context) {
    final nick = player.nick.trim();
    final letter = nick.isEmpty ? '?' : trUpper(String.fromCharCode(nick.runes.first));
    return Container(
      width: 16,
      height: 16,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: avatarColors[player.avatar.color] ?? avatarColors['mint']!,
        shape: BoxShape.circle,
        border: Border.all(color: C.ink, width: 1),
      ),
      child: Text(
        letter,
        style: T.d(16 * 0.46, color: C.ink2),
        textScaler: TextScaler.noScaling,
      ),
    );
  }
}

/// `.ag-legend`: tarafsız ve suikastçı açıklaması.
class _Legend extends StatelessWidget {
  const _Legend();

  @override
  Widget build(BuildContext context) {
    Widget item(BoxDecoration box, String text) => Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(width: 12, height: 12, decoration: box),
        const SizedBox(width: 4),
        Text(
          text,
          style: T.b(12, color: C.text3, weight: FontWeight.w700),
        ),
      ],
    );
    return Wrap(
      alignment: WrapAlignment.center,
      crossAxisAlignment: WrapCrossAlignment.center,
      spacing: 12,
      runSpacing: 12,
      children: [
        item(BoxDecoration(color: _neutral, borderRadius: BorderRadius.circular(3)), SPlay.legendNeutral),
        item(
          BoxDecoration(
            color: C.ink2,
            borderRadius: BorderRadius.circular(3),
            border: Border.all(color: C.red, width: 2),
          ),
          SPlay.legendAssassin,
        ),
      ],
    );
  }
}
