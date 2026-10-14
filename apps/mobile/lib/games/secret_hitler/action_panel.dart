// games/secret-hitler/client/PlayView.tsx: Action (aday gösterme, oylama, yasama, veto, yetkiler), VoteResult, HostBar.
import 'package:flutter/material.dart';

import '../../shared/models.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/kit.dart';
import 'board.dart';
import 'glyphs.dart';
import 'models.dart';
import 'strings.dart';

typedef Send = Future<void> Function(Json action);
typedef Nick = String Function(String id);

final _title = T.d(22, color: C.text, height: 1.1);
final _wait = T.d(19, color: C.text, height: 1.15);

/// `.sh-panel`
Widget _panel(List<Widget> children) => Container(
  padding: const EdgeInsets.all(14),
  decoration: BoxDecoration(color: C.bg, border: Border.all(color: ShC.edge, width: 3), borderRadius: BorderRadius.circular(22)),
  child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: gapped(10, children)),
);

/// `.sh-silence`: yasama sırasında konuşma yasağı.
Widget _silence() => CustomPaint(
  painter: DashedRRectPainter(color: C.violet, radius: 14, strokeWidth: 2, dash: 6, gap: 4),
  child: Padding(
    padding: const EdgeInsets.symmetric(horizontal: 10 + 2, vertical: 8 + 2),
    child: Text(SPlay.silence, style: T.b(12, color: C.text3, weight: FontWeight.w700)),
  ),
);

class ShActionPanel extends StatefulWidget {
  const ShActionPanel({super.key, required this.view, required this.meId, required this.nick, required this.plainNick, required this.send});
  final SecretHitlerView view;
  final String meId;
  final Nick nick;
  final Nick plainNick;
  final Send send;

  @override
  State<ShActionPanel> createState() => _ShActionPanelState();
}

class _ShActionPanelState extends State<ShActionPanel> {
  int? _picked;
  int? _pickedSession;

  SecretHitlerView get view => widget.view;

  Widget _targets(List<String> ids, String Function(String nick) label, void Function(String id) onPick) {
    final narrow = MediaQuery.sizeOf(context).width <= 380;
    return Grid2(
      columns: narrow ? 1 : 2,
      rowGap: 8,
      columnGap: 8,
      equalHeight: true,
      children: [
        for (final id in ids)
          Pressable(
            onTap: () => onPick(id),
            label: label(widget.nick(id)),
            builder: (context, _) => Container(
              constraints: const BoxConstraints(minHeight: 48),
              padding: const EdgeInsets.symmetric(horizontal: 14),
              alignment: Alignment.center,
              decoration: BoxDecoration(color: C.panel, border: Border.all(color: ShC.edge, width: 3), borderRadius: BorderRadius.circular(R.sm)),
              child: Text(widget.nick(id), style: T.d(17, color: C.text, height: 1.45)),
            ),
          ),
      ],
    );
  }

  Widget _hand(List<String> policies, {required int count, bool pickable = false}) {
    final narrow = MediaQuery.sizeOf(context).width <= 380;
    final pad = count == 2 ? EdgeInsets.symmetric(horizontal: narrow ? 8 : 24, vertical: 4) : const EdgeInsets.symmetric(horizontal: 2, vertical: 4);
    return Padding(
      padding: pad,
      child: Grid2(
        columns: count == 2 ? 2 : 3,
        rowGap: 10,
        columnGap: 10,
        equalHeight: true,
        children: [
          for (var i = 0; i < policies.length; i++)
            _PolicyCard(
              policy: policies[i],
              index: i,
              selected: pickable && _picked == i,
              onTap: pickable ? () => setState(() => _picked = i) : null,
            ),
        ],
      ),
    );
  }

  Widget _ballot() {
    Widget btn(String v) {
      final selected = view.myVote == v;
      final dimmed = view.myVote != null && !selected;
      final ja = v == 'ja';
      final label = ja ? SPlay.ja : SPlay.nein;
      return AnimatedOpacity(
        duration: const Duration(milliseconds: 120),
        curve: Curves.ease,
        opacity: dimmed ? 0.45 : 1,
        child: Pressable(
          onTap: () => widget.send({'type': 'vote', 'round': view.voteRound, 'vote': v}),
          label: label,
          selected: selected,
          builder: (context, _) => AnimatedContainer(
            duration: const Duration(milliseconds: 80),
            curve: Curves.ease,
            transformAlignment: Alignment.center,
            transform: Matrix4.rotationZ(deg(ja ? -3 : 3))..translateByDouble(0, selected ? 5 : 0, 0, 1),
            child: FocusRing(
              focused: selected,
              radius: 20,
              color: C.yellow,
              offset: 3,
              width: 4,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 80),
                curve: Curves.ease,
                constraints: const BoxConstraints(minHeight: 100),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: ja ? C.paper : ShC.nein,
                  border: Border.all(color: ShC.edge, width: 3),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: hardShadow(0, selected ? 2 : 7, ShC.edge),
                ),
                child: Text(label, style: T.d(34, color: ja ? C.ink2 : C.text, height: 1.45)),
              ),
            ),
          ),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(2, 4, 2, 8),
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [Expanded(child: btn('ja')), const SizedBox(width: 12), Expanded(child: btn('nein'))],
        ),
      ),
    );
  }

  Widget _voteResult() {
    final v = view.lastVote!;
    final ja = v.votes.values.where((x) => x == 'ja').length;
    final nein = v.votes.length - ja;
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        decoration: BoxDecoration(
          color: v.passed ? C.mint : C.red,
          border: Border.all(color: ShC.edge, width: 2),
          borderRadius: BorderRadius.circular(R.pill),
        ),
        child: Text.rich(
          TextSpan(
            children: [
              TextSpan(text: SPlay.voteResult(v.passed)),
              TextSpan(
                text: ' ${widget.nick(v.president)} / ${widget.nick(v.chancellor)}: $ja ${SPlay.ja}, $nein ${SPlay.nein}',
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
            ],
          ),
          style: T.b(13, color: C.ink2, weight: FontWeight.w800),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Yeni oturumda seçim sıfırlanır (useEffect([view.session])).
    if (_pickedSession != view.session) {
      _pickedSession = view.session;
      _picked = null;
    }
    final meId = widget.meId;
    final nick = widget.nick;
    final amPres = view.president == meId;
    final amChan = view.chancellor == meId;
    final mySeat = view.seat(meId);
    final alive = mySeat?.alive ?? false;
    final send = widget.send;

    switch (view.phase) {
      case 'nominate':
        return _panel([
          if (view.lastVote != null) _voteResult(),
          if (amPres) ...[
            Semantics(header: true, child: Text(SPlay.nominateTitle, style: _title)),
            _targets(view.eligible, SPlay.nominate, (id) => send({'type': 'nominate', 'target': id})),
            Text(view.seats.where((x) => x.alive).length > 5 ? SPlay.nominateHint : SPlay.nominateHint5, style: shHint()),
          ] else
            Text(SPlay.waitNominate(nick(view.president)), style: _wait),
        ]);

      case 'vote':
        final living = view.seats.where((x) => x.alive).toList();
        final done = living.where((x) => x.voted).length;
        final mine = view.myVote != null ? '${SPlay.voteMine(view.myVote == 'ja' ? SPlay.ja : SPlay.nein)} ' : '';
        return _panel([
          Semantics(header: true, child: Text(SPlay.voteTitle(widget.plainNick(view.president), widget.plainNick(view.chancellor ?? '')), style: _title)),
          if (mySeat == null)
            Text(SPlay.spectator, style: _wait)
          else if (!alive)
            Text(SPlay.deadNoVote, style: _wait)
          else
            _ballot(),
          Text('$mine${SPlay.voteProgress(done, living.length)}. ${SPlay.voteHint}', style: shHint()),
        ]);

      case 'presidentLegislate':
        return _panel([
          if (amPres && view.hand != null) ...[
            Semantics(header: true, child: Text(SPlay.presidentTitle, style: _title)),
            _hand(view.hand!, count: 3, pickable: true),
            SButton(
              label: SPlay.discardThis,
              tone: BtnTone.primary,
              large: true,
              block: true,
              onPressed: _picked == null ? null : () => send({'type': 'discard', 'session': view.session, 'index': _picked}),
            ),
            Text(SPlay.presidentHint, style: shHint()),
          ] else
            Text(SPlay.waitPresident(nick(view.president)), style: _wait),
          _silence(),
        ]);

      case 'chancellorLegislate':
        if (view.vetoRequested) {
          return _panel([
            if (amPres) ...[
              Semantics(header: true, child: Text(SPlay.vetoAsk(nick(view.chancellor ?? '')), style: _title)),
              IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Expanded(
                      child: SButton(
                        label: SPlay.vetoAccept,
                        tone: BtnTone.primary,
                        large: true,
                        block: true,
                        fontSize: 18,
                        onPressed: () => send({'type': 'vetoAnswer', 'session': view.session, 'accept': true}),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: SButton(
                        label: SPlay.vetoReject,
                        tone: BtnTone.outline,
                        large: true,
                        block: true,
                        fontSize: 18,
                        onPressed: () => send({'type': 'vetoAnswer', 'session': view.session, 'accept': false}),
                      ),
                    ),
                  ],
                ),
              ),
              Text(SPlay.vetoHint, style: shHint()),
            ] else
              Text(amChan ? SPlay.vetoWait : SPlay.waitVeto(nick(view.president), nick(view.chancellor ?? '')), style: _wait),
          ]);
        }
        return _panel([
          if (amChan && view.hand != null) ...[
            Semantics(header: true, child: Text(SPlay.chancellorTitle, style: _title)),
            _hand(view.hand!, count: 2, pickable: true),
            SButton(
              label: SPlay.enactThis,
              tone: BtnTone.primary,
              large: true,
              block: true,
              onPressed: _picked == null ? null : () => send({'type': 'enact', 'session': view.session, 'index': _picked}),
            ),
            Text(SPlay.chancellorHint, style: shHint()),
            if (view.vetoUnlocked && !view.vetoDenied) ...[
              SButton(label: SPlay.veto, tone: BtnTone.outline, block: true, onPressed: () => send({'type': 'veto', 'session': view.session})),
              Text(SPlay.vetoHint, style: shHint()),
            ],
            if (view.vetoDenied) Text(SPlay.vetoDeniedNote, style: shHint()),
          ] else
            Text(SPlay.waitChancellor(nick(view.chancellor ?? '')), style: _wait),
          _silence(),
        ]);

      case 'power':
        final power = view.power ?? 'execution';
        if (!amPres) {
          return _panel([
            Row(
              children: [
                PowerGlyph(power: power, size: 18, color: ShC.fasInk),
                const SizedBox(width: 8),
                Expanded(child: Text(SPlay.waitPower(nick(view.president), powerNames[power] ?? ''), style: _wait)),
              ],
            ),
            Text(powerHints[power] ?? '', style: shHint()),
          ]);
        }
        if (power == 'peek') {
          return _panel([
            Semantics(header: true, child: Text(SPlay.peekTitle, style: _title)),
            _hand(view.peek ?? const [], count: 3),
            Text(SPlay.peekHint, style: shHint()),
            SButton(
              label: SPlay.peekDone,
              tone: BtnTone.primary,
              large: true,
              block: true,
              onPressed: () => send({'type': 'peekDone', 'session': view.session}),
            ),
          ]);
        }
        final others = [
          for (final x in view.seats)
            if (x.alive && x.id != meId && !(power == 'investigate' && x.investigated)) x.id,
        ];
        final title = power == 'investigate' ? SPlay.investigateTitle : (power == 'specialElection' ? SPlay.specialTitle : SPlay.executionTitle);
        final hint = power == 'investigate' ? SPlay.investigateHint : (power == 'specialElection' ? SPlay.specialHint : SPlay.executionHint);
        return _panel([
          Semantics(
            header: true,
            child: Row(
              children: [
                PowerGlyph(power: power, size: 20, color: ShC.fasInk),
                const SizedBox(width: 8),
                Expanded(child: Text(title, style: _title)),
              ],
            ),
          ),
          _targets(others, SPlay.pick, (id) => send({'type': 'power', 'session': view.session, 'target': id})),
          Text(hint, style: shHint()),
        ]);
    }
    return const SizedBox.shrink();
  }
}

/// `.sh-policy`: yasa kartı (tek sıradakiler −3°, çiftler +3°; seçilince 4px yukarı ve sarı halka).
class _PolicyCard extends StatelessWidget {
  const _PolicyCard({required this.policy, required this.index, required this.selected, required this.onTap});
  final String policy;
  final int index;
  final bool selected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => Pressable(
    onTap: onTap,
    label: '${policyNames[policy]} ${index + 1}',
    selected: selected,
    builder: (context, _) => AnimatedContainer(
      duration: const Duration(milliseconds: 100),
      curve: Curves.ease,
      transformAlignment: Alignment.center,
      transform: selected ? Matrix4.translationValues(0, -4, 0) : Matrix4.rotationZ(deg(index.isEven ? -3 : 3)),
      child: FocusRing(
        focused: selected,
        radius: 18,
        color: C.yellow,
        offset: 3,
        width: 4,
        child: Container(
          constraints: const BoxConstraints(minHeight: 112),
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 10),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: policy == 'fascist' ? C.coral : C.sky,
            border: Border.all(color: ShC.edge, width: 3),
            borderRadius: BorderRadius.circular(18),
            boxShadow: hardShadow(4, 4, ShC.edge),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              PolicyGlyph(policy: policy, size: 30, color: C.ink2),
              const SizedBox(height: 6),
              Text(policyNames[policy] ?? '', style: T.d(18, color: C.ink2), textAlign: TextAlign.center),
            ],
          ),
        ),
      ),
    ),
  );
}

/// `HostBar`: oda sahibi bekleyen oyuncu adına varsayılanı uygular (süre dolunca ya da bağlantısı koptuysa).
class ShHostBar extends StatelessWidget {
  const ShHostBar({super.key, required this.view, required this.room, required this.nick, required this.send});
  final SecretHitlerView view;
  final RoomState room;
  final Nick nick;
  final Send send;

  @override
  Widget build(BuildContext context) {
    final online = {for (final p in room.players) if (p.connected) p.id};
    final offline = view.waitingFor.any((id) => !online.contains(id));
    final names = view.waitingFor.map(nick).join(', ');
    return Remaining(
      serverNow: view.serverNow,
      endsAt: view.skipAt,
      tick: const Duration(milliseconds: 500),
      builder: (context, remaining) {
        final left = (remaining / 1000).ceil();
        final ready = offline || left <= 0;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _GhostButton(
              label: SPlay.skip(view.waitingFor.length > 3 ? SPlay.people(view.waitingFor.length) : names),
              onPressed: ready ? () => send({'type': 'skip', 'session': view.session}) : null,
            ),
            const SizedBox(height: 6),
            Text(ready ? SPlay.skipHint : SPlay.skipIn(left), style: shHint()),
          ],
        );
      },
    );
  }
}

/// `.btn.btn-ghost` (tam genişlik, `.sh-hostbar` esnek sütununda gerilir). `.btn` `white-space: nowrap` olduğundan
/// uzun yazı alta geçmez, iki yana taşar (kit'teki SGhostButton'da yazı esnemediği için burada ayrı çizilir).
class _GhostButton extends StatelessWidget {
  const _GhostButton({required this.label, required this.onPressed});
  final String label;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) => Opacity(
    opacity: onPressed == null ? 0.5 : 1,
    child: Pressable(
      onTap: onPressed,
      label: label,
      builder: (context, _) => Container(
        constraints: const BoxConstraints(minHeight: 44),
        padding: const EdgeInsets.symmetric(horizontal: 14),
        alignment: Alignment.center,
        decoration: BoxDecoration(border: Border.all(color: C.line2, width: 2), borderRadius: BorderRadius.circular(14)),
        child: SizedBox(
          height: 14,
          child: OverflowBox(
            maxWidth: double.infinity,
            child: Text(label, style: T.b(14, color: C.text2, weight: FontWeight.w800, height: 1), softWrap: false),
          ),
        ),
      ),
    ),
  );
}
