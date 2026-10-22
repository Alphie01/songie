part of 'play_view.dart';

/// Kilit simgesi (gizli soru notu).
const _lockSvg =
    '<svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" '
    'stroke-width="2.6" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>';

/// Küçük, kıpırdamayan zarf (`.pr-env.pr-env-sm`, −4°).
Widget _smallEnvelope() => ExcludeSemantics(
  child: Transform.rotate(angle: deg(-4), child: const _Envelope(small: true)),
);

/// `.pr-wait` / `.pr-closed`: dikeyde ortalı, 12px üst-alt boşluklu sütun.
Widget _centered(double gap, List<Widget> children) => Padding(
  padding: const EdgeInsets.symmetric(vertical: 12),
  child: _FillColumn(gap: gap, cross: CrossAxisAlignment.center, main: MainAxisAlignment.center, children: children),
);

/// CSS `pr-rise` (opaklık 0, 10px aşağıdan): hareket azaltılınca yok.
Widget _rise(BuildContext context, Widget child, {required int ms, int delayMs = 0, double rotate = 0}) {
  if (MediaQuery.disableAnimationsOf(context)) return child;
  return EnterAnim(
    duration: Duration(milliseconds: ms),
    delay: Duration(milliseconds: delayMs),
    curve: Curves.ease,
    dy: 10,
    rotate: rotate,
    child: child,
  );
}

/* ---------- İlk seçim ---------- */

class _PickFirst extends StatefulWidget {
  const _PickFirst({required this.view, required this.isHost, required this.who, required this.send});
  final ParanoiaView view;
  final bool isHost;
  final _Who who;
  final _Send send;

  @override
  State<_PickFirst> createState() => _PickFirstState();
}

class _PickFirstState extends State<_PickFirst> {
  String? _selected;

  @override
  Widget build(BuildContext context) {
    final view = widget.view;
    if (!widget.isHost) {
      return _centered(18, [_smallEnvelope(), const _Big(SPlay.pickFirstWait), const _Sub(SPlay.waitHint)]);
    }
    final selected = _selected;
    return _FillColumn(
      gap: 12,
      children: [
        Text(SPlay.pickFirstTitle, style: _h),
        _Picker(ids: view.choices, choices: view.choices, selected: selected, onSelect: (id) => setState(() => _selected = id), who: widget.who),
        Text(SPlay.pickFirstHint, style: _hint),
        const _Grow(),
        _Confirm(
          on: selected != null,
          onTap: selected == null ? null : () => widget.send({'type': 'pickFirst', 'targetId': selected}),
          child: const Text(SPlay.pickFirstConfirm),
        ),
      ],
    );
  }
}

/* ---------- Sıra sende: kapalı zarf, sonra gizli soru kartı ---------- */

class _MyTurn extends StatefulWidget {
  const _MyTurn({super.key, required this.view, required this.now, required this.meId, required this.settings, required this.who, required this.send});
  final ParanoiaView view;
  final int now;
  final String meId;
  final ParanoiaSettings settings;
  final _Who who;
  final _Send send;

  @override
  State<_MyTurn> createState() => _MyTurnState();
}

class _MyTurnState extends State<_MyTurn> {
  bool _opened = false;
  String? _selected;
  bool _busy = false;

  Future<void> _confirm() async {
    final target = _selected;
    if (target == null) return;
    setState(() => _busy = true);
    final ok = await widget.send({'type': 'choose', 'seq': widget.view.seq, 'targetId': target});
    if (!ok && mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    final view = widget.view;
    final who = widget.who;
    final senderId = view.fromId;
    final endsAt = view.endsAt;

    if (!_opened) {
      return _centered(22, [
        _EnvelopeButton(onOpened: () => setState(() => _opened = true)),
        const _Big(SPlay.envelopeTitle),
        _Sub(senderId != null ? SPlay.envelopeFrom(who.nick(senderId)) : SPlay.envelopeHint),
        if (endsAt != null) _Countdown(endsAt: endsAt, now: widget.now, durationMs: view.durationMs),
      ]);
    }

    final notes = {if (senderId != null) senderId: SPlay.sentYou, widget.meId: S.you};
    final selected = _selected;
    return _FillColumn(
      gap: 12,
      children: [
        _rise(
          context,
          ms: 400,
          _SecretCard(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Flexible(child: _WhoPill(SPlay.yourTurn)),
                  const SizedBox(width: 8),
                  Text(
                    SPlay.revealHead(view.answered + 1, view.total),
                    style: T.b(13, color: C.text3, weight: FontWeight.w800),
                  ),
                ],
              ),
              Text(view.question ?? '', style: T.d(28, color: C.text, height: 1.1)),
              Row(
                children: [
                  SSvg(_lockSvg, width: 16, height: 16, color: C.mint),
                  const SizedBox(width: 6),
                  Flexible(
                    child: Text(
                      SPlay.secretNote,
                      style: T.b(13, color: C.mint, weight: FontWeight.w700),
                    ),
                  ),
                ],
              ),
              if (endsAt != null) _Countdown(endsAt: endsAt, now: widget.now, durationMs: view.durationMs),
            ],
          ),
        ),
        Text(SPlay.pickTitle, style: _h),
        _Picker(
          ids: view.players.where(who.inRoom).toList(),
          choices: view.choices,
          selected: selected,
          onSelect: (id) => setState(() => _selected = id),
          notes: notes,
          who: who,
        ),
        Text(SPlay.pickHint(widget.settings.allowSelf, widget.settings.noReturn), style: _hint),
        const _Grow(),
        _Confirm(
          on: selected != null,
          onTap: selected == null || _busy ? null : _confirm,
          child: Text(_busy ? SPlay.sending : (selected != null ? SPlay.confirmPick(who.nick(selected)) : SPlay.confirm)),
        ),
        if (endsAt != null) Text(widget.settings.onTimeout == 'pass' ? SPlay.timeoutPass : SPlay.timeoutRandom, style: _hint, textAlign: TextAlign.center),
        if (view.mine.isNotEmpty) _Mine(view: view, who: who),
      ],
    );
  }
}

/* ---------- Bekleme ---------- */

class _Waiting extends StatelessWidget {
  const _Waiting({required this.view, required this.now, required this.isHost, required this.who, required this.send});
  final ParanoiaView view;
  final int now;
  final bool isHost;
  final _Who who;
  final _Send send;

  @override
  Widget build(BuildContext context) {
    final endsAt = view.endsAt;
    final holder = view.holderId;
    return _centered(18, [
      _smallEnvelope(),
      Semantics(
        liveRegion: true,
        child: VStack(
          gap: 18,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            _Big(holder != null ? SPlay.waitHolder(who.nick(holder)) : SPlay.waitHidden),
            const _Sub(SPlay.waitHint),
            if (view.pulse > 0) _Pulse(key: ValueKey(view.pulse)),
          ],
        ),
      ),
      if (endsAt != null) _Countdown(endsAt: endsAt, now: now, durationMs: view.durationMs),
      if (isHost && view.holderOffline)
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: C.coral,
            border: Border.all(color: C.ink, width: bw),
            borderRadius: BorderRadius.circular(18),
          ),
          child: VStack(
            gap: 8,
            children: [
              Text(SPlay.stuckTitle, style: T.d(18, color: C.ink2, height: 1.15)),
              Text(SPlay.stuckHint, style: _hint.copyWith(color: C.ink2)),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  SButton(label: SPlay.skipRandom, tone: BtnTone.yellow, onPressed: () => send({'type': 'skip', 'seq': view.seq, 'mode': 'random'})),
                  _InkGhost(label: SPlay.skipReassign, onTap: () => send({'type': 'skip', 'seq': view.seq, 'mode': 'reassign'})),
                ],
              ),
            ],
          ),
        ),
      if (view.mine.isNotEmpty) _Mine(view: view, who: who),
    ]);
  }
}

/// `.pr-pulse`: "Bir soru cevaplandı" 2.6s'de söner (%70'e kadar tam görünür).
class _Pulse extends StatefulWidget {
  const _Pulse({super.key});

  @override
  State<_Pulse> createState() => _PulseState();
}

class _PulseState extends State<_Pulse> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 2600));

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!MediaQuery.disableAnimationsOf(context) && _c.value == 0 && !_c.isAnimating) _c.forward();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reduce = MediaQuery.disableAnimationsOf(context);
    return AnimatedBuilder(
      animation: _c,
      builder: (context, child) {
        final v = _c.value;
        final opacity = reduce || v <= 0.7 ? 1.0 : 1 - Curves.ease.transform(((v - 0.7) / 0.3).clamp(0.0, 1.0));
        return Opacity(opacity: opacity, child: child);
      },
      child: Text(
        SPlay.answeredFlash,
        style: T.b(13, color: C.mint, weight: FontWeight.w800),
      ),
    );
  }
}

/// `.pr-stuck .btn-ghost`: mürekkep çerçeveli şeffaf düğme.
class _InkGhost extends StatelessWidget {
  const _InkGhost({required this.label, required this.onTap});
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Pressable(
    onTap: onTap,
    label: label,
    builder: (context, _) => Container(
      constraints: const BoxConstraints(minHeight: 44),
      padding: const EdgeInsets.symmetric(horizontal: 14),
      decoration: BoxDecoration(
        border: Border.all(color: C.ink, width: 2),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: T.b(14, color: C.ink2, weight: FontWeight.w800, height: 1),
          ),
        ],
      ),
    ),
  );
}

/* ---------- Açıklama: sahne ---------- */

/// Sahnenin animasyonları bitene kadar "Sıradaki" kapalı (`STAGE_MS`).
const _stageMs = 2900;

class _Reveal extends StatefulWidget {
  const _Reveal({required this.view, required this.meId, required this.isHost, required this.settings, required this.who, required this.send});
  final ParanoiaView view;
  final String meId;
  final bool isHost;
  final ParanoiaSettings settings;
  final _Who who;
  final _Send send;

  @override
  State<_Reveal> createState() => _RevealState();
}

class _RevealState extends State<_Reveal> {
  bool _ready = false;
  int? _n;
  Timer? _timer;

  int get _current => widget.view.revealed.last.n;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_n == null) _arm();
  }

  @override
  void didUpdateWidget(_Reveal old) {
    super.didUpdateWidget(old);
    if (_current != _n) _arm();
  }

  void _arm() {
    _n = _current;
    _timer?.cancel();
    if (MediaQuery.disableAnimationsOf(context)) {
      _ready = true;
      return;
    }
    _ready = false;
    _timer = Timer(const Duration(milliseconds: _stageMs), () {
      if (mounted) setState(() => _ready = true);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final view = widget.view;
    final current = view.revealed.last;
    final isLast = view.revealed.length >= view.revealTotal;
    final vote = widget.settings.revealBy == 'vote' && !widget.isHost;
    final history = view.revealed.sublist(0, view.revealed.length - 1).reversed.toList();
    void next() => widget.send({'type': 'next', 'shown': view.revealed.length});

    final Widget action;
    if (widget.isHost) {
      action = _Confirm(
        on: true,
        onTap: _ready ? next : null,
        child: Text.rich(
          TextSpan(
            text: isLast ? SPlay.last : SPlay.next,
            children: [
              if (widget.settings.revealBy == 'vote' && view.votes > 0)
                TextSpan(
                  text: ' ${view.votes}/${view.votesNeeded}',
                  style: T.d(16, color: C.ink2, height: 1.45),
                ),
            ],
          ),
        ),
      );
    } else if (vote) {
      action = _Confirm(
        on: !view.myVote,
        onTap: _ready && !view.myVote ? next : null,
        child: Text(view.myVote ? SPlay.voted(view.votes, view.votesNeeded) : SPlay.vote(view.votes, view.votesNeeded)),
      );
    } else {
      action = Text(SPlay.hostWillOpen, style: _hint, textAlign: TextAlign.center);
    }

    return _FillColumn(
      gap: 12,
      children: [
        _Stage(key: ValueKey(current.n), entry: current, total: view.revealTotal, meId: widget.meId, who: widget.who),
        const _Grow(),
        action,
        if (history.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: VStack(
              gap: 8,
              children: [
                Text(trUpper(SPlay.history), style: _label),
                _EntryList(entries: history, who: widget.who),
              ],
            ),
          ),
      ],
    );
  }
}

/// Sahne: önce soru (500ms), 0.9 sn sonra kime sorulduğu, 1.9 sn sonra cevap kartı düşer.
class _Stage extends StatelessWidget {
  const _Stage({super.key, required this.entry, required this.total, required this.meId, required this.who});
  final RevealedEntry entry;
  final int total;
  final String meId;
  final _Who who;

  @override
  Widget build(BuildContext context) {
    final asked = who.player(entry.askedId);
    final answerId = entry.answerId;
    final answer = answerId != null ? who.player(answerId) : null;
    final note = SPlay.how(entry.how);
    final reduce = MediaQuery.disableAnimationsOf(context);
    final nameStyle = T.d(34, color: C.ink2, height: 1);

    final question = _SecretCard(
      children: [
        Align(alignment: Alignment.centerLeft, child: _WhoPill(SPlay.revealHead(entry.n, total))),
        Text(entry.question, style: T.d(28, color: C.text, height: 1.1)),
        _rise(
          context,
          ms: 400,
          delayMs: 900,
          rotate: -1,
          Row(
            children: [
              SAvatar(avatar: asked.avatar, nick: asked.nick, size: 28),
              const SizedBox(width: 8),
              Flexible(
                child: Text(
                  SPlay.askedTo(asked.nick),
                  style: T.b(15, color: C.text2, weight: FontWeight.w800),
                ),
              ),
            ],
          ),
        ),
      ],
    );

    final card = Transform.rotate(
      angle: deg(1.5),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        decoration: BoxDecoration(
          color: answer == null ? C.paper2 : C.mint,
          border: Border.all(color: C.ink, width: bw),
          borderRadius: BorderRadius.circular(24),
          boxShadow: Shadows.lg,
        ),
        child: VStack(
          gap: 8,
          children: [
            Text(
              SPlay.answerOf(asked.nick),
              style: T.b(13, color: C.ink2, weight: FontWeight.w800),
            ),
            if (answer != null)
              Row(
                children: [
                  SAvatar(avatar: answer.avatar, nick: answer.nick, size: 44),
                  const SizedBox(width: 12),
                  Flexible(
                    child: Text.rich(
                      TextSpan(
                        text: answer.nick,
                        children: [
                          if (answerId == meId)
                            TextSpan(
                              text: ' (${S.you})',
                              style: T.d(18, color: C.ink2, height: 1),
                            ),
                        ],
                      ),
                      style: nameStyle,
                    ),
                  ),
                ],
              )
            else
              Text(SPlay.noAnswer, style: nameStyle),
            if (note != null)
              Text(
                note,
                style: T.b(13, color: C.ink2, weight: FontWeight.w700),
              ),
          ],
        ),
      ),
    );

    return Semantics(
      liveRegion: true,
      child: VStack(
        gap: 14,
        children: [
          _rise(context, question, ms: 500),
          if (reduce)
            card
          else
            // `pr-drop`: yukarıdan (−16px), −4° ve %90'dan, taşan eğriyle düşer.
            EnterAnim(
              duration: const Duration(milliseconds: 500),
              delay: const Duration(milliseconds: 1900),
              curve: const Cubic(0.2, 1.4, 0.4, 1),
              dy: -16,
              rotate: -5.5,
              scale: 0.9,
              child: card,
            ),
        ],
      ),
    );
  }
}
