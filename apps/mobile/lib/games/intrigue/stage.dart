// games/intrigue/client/PlayView.tsx: orta panel (Stage, ActionPanel, ChallengeWindow, LosePicker, ExchangePicker).
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../shared/models.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import 'models.dart';
import 'role_art.dart';
import 'strings.dart';

typedef Send = Future<bool> Function(Json action);
typedef Nick = String Function(String? id);

/// İtiraz penceresindeki koyu kırmızı geri sayım (`--ig-alarm`).
const igAlarm = Color(0xFFE2335C);

/// Süre çubuğunun zemini (`--ig-track`).
const igTrack = Color(0xFFEEE8FF);

/// CSS `transition` varsayılan eğrisi (`ease`).
const _ease = Curves.ease;

/// Flex sütun `gap`: her öğenin arasına boşluk (Spacer dahil, CSS'teki `.ig-fill` gibi).
List<Widget> gapped(double gap, List<Widget> items) {
  final out = <Widget>[];
  for (final w in items) {
    if (out.isNotEmpty) out.add(SizedBox(height: gap));
    out.add(w);
  }
  return out;
}

/// `.ig-bar`: kalan süre çubuğu (`total` 0 ise web'de hiç çizilmez; çağıran kontrol eder).
class IgBar extends StatelessWidget {
  const IgBar({super.key, required this.remaining, required this.total, this.red = false, this.track = igTrack});
  final int remaining;
  final int total;
  final bool red;
  final Color track;

  @override
  Widget build(BuildContext context) {
    final f = total <= 0 ? 0.0 : math.min(1.0, remaining / total);
    return ExcludeSemantics(
      child: Container(
        height: red ? 10 : 8,
        clipBehavior: Clip.antiAlias,
        alignment: Alignment.centerLeft,
        decoration: BoxDecoration(color: track, borderRadius: BorderRadius.circular(R.pill)),
        child: AnimatedFractionallySizedBox(
          duration: const Duration(milliseconds: 200),
          widthFactor: f,
          heightFactor: 1,
          child: ColoredBox(color: red ? igAlarm : C.yellow),
        ),
      ),
    );
  }
}

/// `.ig-sheet`: beyaz kart (eylem, itiraz, kart seçimi).
class _Sheet extends StatelessWidget {
  const _Sheet({required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: C.paper,
      border: Border.all(color: C.ink, width: 3),
      borderRadius: BorderRadius.circular(24),
      boxShadow: Shadows.lg,
    ),
    child: DefaultTextStyle.merge(
      style: const TextStyle(color: C.ink2),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: gapped(10, children)),
    ),
  );
}

final _sheetHint = T.b(13, color: C.inkSoft, weight: FontWeight.w700);
TextStyle _sheetTitle({Color color = C.ink2}) => T.d(22, color: color, height: 1.1);

/// `.ig-status`: sıra başkasındayken.
class IgStatus extends StatelessWidget {
  const IgStatus({super.key, required this.text, required this.remaining, required this.total});
  final String text;
  final int remaining;
  final int total;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(color: C.panel, border: Border.all(color: C.ink, width: 3), borderRadius: BorderRadius.circular(22)),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: gapped(10, [
        Text(text, style: T.d(19, color: C.text, height: 1.15)),
        if (total > 0) IgBar(remaining: remaining, total: total, track: C.panel2),
      ]),
    ),
  );
}

/// `Stage`: fazına göre orta panel.
Widget buildStage({required IntrigueView view, required String meId, required Nick nick, required int remaining, required Send send}) {
  if (view.phase == 'window' && view.window != null && view.pending != null) {
    return ChallengeWindow(view: view, meId: meId, nick: nick, remaining: remaining, send: send);
  }
  if (view.phase == 'lose' && view.lose != null) {
    if (view.lose!.player == meId) return LosePicker(view: view, remaining: remaining, send: send);
    return IgStatus(text: SPlay.loseOther(nick(view.lose!.player)), remaining: remaining, total: view.durationMs);
  }
  if (view.phase == 'exchange') {
    if (view.exchange != null) return ExchangePicker(view: view, remaining: remaining, send: send);
    return IgStatus(text: SPlay.exOther(nick(view.exchanging)), remaining: remaining, total: view.durationMs);
  }
  if (view.phase == 'action' && view.current == meId && view.me.alive) {
    return ActionPanel(view: view, meId: meId, nick: nick, remaining: remaining, send: send);
  }
  return IgStatus(text: SPlay.thinking(nick(view.current)), remaining: remaining, total: view.durationMs);
}

/// Tasarımdaki sıra: herkesin yapabildikleri, rol eylemleri, en sonda Darbe.
const _actionOrder = ['income', 'aid', 'tax', 'assassinate', 'steal', 'exchange', 'coup'];

Color _actionColor(String a) => switch (a) {
  'tax' => C.yellow,
  'assassinate' => C.red,
  'steal' => C.coral,
  'exchange' => C.mint,
  'coup' => C.lilac,
  _ => C.paper,
};

class ActionPanel extends StatefulWidget {
  const ActionPanel({super.key, required this.view, required this.meId, required this.nick, required this.remaining, required this.send});
  final IntrigueView view;
  final String meId;
  final Nick nick;
  final int remaining;
  final Send send;

  @override
  State<ActionPanel> createState() => _ActionPanelState();
}

class _ActionPanelState extends State<ActionPanel> {
  String? _chosen;
  String? _target;

  IntrigueView get view => widget.view;

  List<IgPlayer> get _targets => view.players.where((p) => p.alive && p.id != widget.meId).toList();

  String? _reason(String a) {
    final coins = view.me.coins;
    if (coins >= mustCoupAt && a != 'coup') return SPlay.mustCoupReason;
    if (coins < (actionCost[a] ?? 0)) return SPlay.needCoins(actionCost[a] ?? 0);
    return null;
  }

  void _pick(String a) {
    if (targeted[a] == true) {
      if (_chosen == a) {
        setState(() => _chosen = null);
        return;
      }
      final targets = _targets;
      setState(() {
        _chosen = a;
        _target = targets.length == 1 ? targets[0].id : null;
      });
      return;
    }
    setState(() => _chosen = null);
    widget.send({'type': 'act', 'turn': view.turn, 'action': a});
  }

  Widget _actionButton(String a) {
    final why = _reason(a);
    final selected = _chosen == a;
    return Opacity(
      opacity: why != null ? 0.45 : 1,
      child: Pressable(
        onTap: why == null ? () => _pick(a) : null,
        label: actionName[a],
        selected: selected,
        builder: (context, _) => AnimatedContainer(
          duration: const Duration(milliseconds: 80),
          curve: _ease,
          transform: Matrix4.translationValues(0, selected ? 3 : 0, 0),
          child: FocusRing(
            focused: selected,
            radius: 14,
            color: C.ink2,
            offset: 2,
            width: 3,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 80),
              curve: _ease,
              constraints: const BoxConstraints(minHeight: 58),
              padding: const EdgeInsets.all(4),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: _actionColor(a),
                border: Border.all(color: C.ink, width: 3),
                borderRadius: BorderRadius.circular(14),
                boxShadow: hardShadow(0, selected ? 1 : 4),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(actionName[a] ?? a, style: T.d(17, color: C.ink2), textAlign: TextAlign.center),
                  const SizedBox(height: 3),
                  Text(why ?? actionFx[a] ?? '', style: T.b(11, color: C.ink2, weight: FontWeight.w800, height: 1.2), textAlign: TextAlign.center),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final secs = (widget.remaining / 1000).ceil();
    final mustCoup = view.me.coins >= mustCoupAt;
    final targets = _targets;
    final chosen = _chosen;

    return _Sheet(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Flexible(child: Semantics(header: true, child: Text(SPlay.chooseAction, style: _sheetTitle()))),
            const SizedBox(width: 8),
            Text(view.durationMs > 0 ? SPlay.yourTurnLeft(secs) : SPlay.yourTurn, style: T.b(13, color: C.ink2, weight: FontWeight.w800)),
          ],
        ),
        if (view.durationMs > 0) IgBar(remaining: widget.remaining, total: view.durationMs),
        if (mustCoup) Text(SPlay.mustCoup, style: T.b(13, color: igAlarm, weight: FontWeight.w800)),
        Grid2(rowGap: 8, columnGap: 8, children: [for (final a in _actionOrder) _actionButton(a)]),
        if (chosen != null)
          Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: gapped(6, [
              Text(SPlay.chooseTarget, style: T.b(13, color: C.ink2, weight: FontWeight.w800)),
              // `.ig-target-btn`: flex 1 1 28% → satırda en fazla 3 düğme, eşit genişlik.
              Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: gapped(6, [
                  for (var i = 0; i < targets.length; i += 3)
                    IntrinsicHeight(
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          for (var k = i; k < math.min(i + 3, targets.length); k++) ...[
                            if (k > i) const SizedBox(width: 6),
                            Expanded(child: _targetButton(targets[k])),
                          ],
                        ],
                      ),
                    ),
                ]),
              ),
              IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Expanded(
                      child: Opacity(
                        opacity: _target == null ? 0.5 : 1,
                        child: Pressable(
                          onTap: _target == null ? null : () => widget.send({'type': 'act', 'turn': view.turn, 'action': chosen, 'target': _target}),
                          label: _target != null ? SPlay.confirm(actionName[chosen] ?? chosen, widget.nick(_target)) : SPlay.chooseTarget,
                          builder: (context, _) => Container(
                            constraints: const BoxConstraints(minHeight: 46),
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                            alignment: Alignment.center,
                            decoration: BoxDecoration(color: C.ink2, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(14)),
                            child: Text(
                              _target != null ? SPlay.confirm(actionName[chosen] ?? chosen, widget.nick(_target)) : SPlay.chooseTarget,
                              style: T.d(17, color: C.text, height: 1.45),
                              textAlign: TextAlign.center,
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Pressable(
                      onTap: () => setState(() => _chosen = null),
                      label: SPlay.cancel,
                      builder: (context, _) => Container(
                        constraints: const BoxConstraints(minHeight: 46),
                        padding: const EdgeInsets.symmetric(horizontal: 14),
                        alignment: Alignment.center,
                        decoration: BoxDecoration(color: C.paper2, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(14)),
                        child: Text(SPlay.cancel, style: T.d(15, color: C.ink2, height: 1.45)),
                      ),
                    ),
                  ],
                ),
              ),
            ]),
          ),
      ],
    );
  }

  Widget _targetButton(IgPlayer p) {
    final selected = _target == p.id;
    final label = '${widget.nick(p.id)} · ${p.coins}';
    return Pressable(
      onTap: () => setState(() => _target = p.id),
      label: label,
      selected: selected,
      builder: (context, _) => Container(
        constraints: const BoxConstraints(minHeight: 44),
        padding: const EdgeInsets.symmetric(horizontal: 6),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: selected ? C.yellow : C.paper2,
          border: Border.all(color: C.ink, width: 2),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(label, style: T.b(13, color: C.ink2, weight: FontWeight.w800), textAlign: TextAlign.center),
      ),
    );
  }
}

/// `.ig-resp`: itiraz/engel düğmesi (basınca 3px iner).
class _Resp extends StatelessWidget {
  const _Resp({required this.label, required this.color, required this.style, required this.onTap});
  final String label;
  final Color color;
  final TextStyle style;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Pressable(
    onTap: onTap,
    label: label,
    builder: (context, pressed) => AnimatedContainer(
      duration: const Duration(milliseconds: 80),
      curve: _ease,
      transform: Matrix4.translationValues(0, pressed ? 3 : 0, 0),
      constraints: const BoxConstraints(minHeight: 56),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: color,
        border: Border.all(color: C.ink, width: 3),
        borderRadius: BorderRadius.circular(16),
        boxShadow: hardShadow(0, pressed ? 1 : 4),
      ),
      child: Text(label, style: style, textAlign: TextAlign.center),
    ),
  );
}

class ChallengeWindow extends StatelessWidget {
  const ChallengeWindow({super.key, required this.view, required this.meId, required this.nick, required this.remaining, required this.send});
  final IntrigueView view;
  final String meId;
  final Nick nick;
  final int remaining;
  final Send send;

  @override
  Widget build(BuildContext context) {
    final w = view.window!;
    final p = view.pending!;
    final secs = (remaining / 1000).ceil();
    final eligible = w.eligible.contains(meId);
    final passed = w.passed.contains(meId);
    final canLie = w.canChallenge && eligible && !passed && w.claimant != meId;
    final canBlock = w.blockers.contains(meId) && !passed;
    final target = p.target != null ? nick(p.target) : null;

    String title;
    String hint;
    if (w.kind == 'counter' && p.block != null) {
      title = SPlay.windowCounter(nick(p.block!.by), roleName[p.block!.role] ?? '');
      hint = SPlay.windowCounterHint;
    } else if (w.kind == 'block' && p.action == 'aid') {
      title = SPlay.windowAid(nick(p.actor));
      hint = SPlay.windowAidHint;
    } else if (w.kind == 'block') {
      title = SPlay.windowClaim(nick(p.actor), actionName[p.action] ?? '', target);
      hint = SPlay.windowBlockOnly(target ?? '?');
    } else {
      title = SPlay.windowClaim(nick(p.actor), actionName[p.action] ?? '', target);
      hint = p.claim != null ? SPlay.windowClaimRole(roleName[p.claim] ?? '') : '';
    }

    final status = !eligible ? (w.claimant == meId ? SPlay.waiting : SPlay.noSay) : (passed ? SPlay.passed : SPlay.waiting);
    final total = view.durationMs > 0 ? view.durationMs : 1;

    final buttons = <Widget>[
      if (canLie) _Resp(label: SPlay.lie, color: C.red, style: T.d(22, color: C.ink2, height: 1.45), onTap: () => send({'type': 'challenge', 'windowId': w.id})),
      if (canBlock)
        for (final r in w.blockRoles)
          _Resp(
            label: SPlay.blockAs(roleName[r] ?? r),
            color: roleColor(r),
            style: T.d(15, color: C.ink2, height: 1.1),
            onTap: () => send({'type': 'block', 'windowId': w.id, 'role': r}),
          ),
    ];

    return Semantics(
      liveRegion: true,
      child: _Sheet(
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Semantics(
                label: '$secs saniye',
                child: ExcludeSemantics(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(minWidth: 34),
                    child: Text(
                      SPlay.secs(secs),
                      style: T.d(46, color: igAlarm, height: 0.9).copyWith(fontFeatures: const [FontFeature.tabularFigures()]),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: T.d(19, color: C.ink2, height: 1.1)),
                    if (hint.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(hint, style: T.b(13, color: C.ink2, weight: FontWeight.w700)),
                    ],
                  ],
                ),
              ),
            ],
          ),
          Row(
            children: [
              if (w.claimRole != null) ...[
                Padding(padding: const EdgeInsets.only(top: 10, right: 10), child: _ClaimCard(role: w.claimRole!)),
                const SizedBox(width: 10),
              ],
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: gapped(6, [
                    IgBar(remaining: remaining, total: total, red: true),
                    Text(SPlay.passedList(w.passed.length, w.eligible.length), style: T.b(13, color: C.ink2, weight: FontWeight.w800)),
                    Text(status, style: T.b(12, color: C.inkSoft, weight: FontWeight.w700)),
                  ]),
                ),
              ),
            ],
          ),
          if (eligible && !passed)
            Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: gapped(8, [
                if (buttons.isNotEmpty)
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: gapped(8, [
                      // Tek kalan (ya da tek) düğme iki sütunu kaplar.
                      for (var i = 0; i < buttons.length; i += 2)
                        if (i + 1 < buttons.length)
                          IntrinsicHeight(
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [Expanded(child: buttons[i]), const SizedBox(width: 8), Expanded(child: buttons[i + 1])],
                            ),
                          )
                        else
                          buttons[i],
                    ]),
                  ),
                Pressable(
                  onTap: () => send({'type': 'pass', 'windowId': w.id}),
                  label: SPlay.pass,
                  builder: (context, _) => Container(
                    constraints: const BoxConstraints(minHeight: 46),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(color: C.paper2, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(14)),
                    child: Text(SPlay.pass, style: T.d(18, color: C.ink2, height: 1.45)),
                  ),
                ),
              ]),
            ),
        ],
      ),
    );
  }
}

/// `.ig-claimcard`: iddia edilen rol (−4°, sağ üstte "?").
class _ClaimCard extends StatelessWidget {
  const _ClaimCard({required this.role});
  final String role;

  @override
  Widget build(BuildContext context) => Transform.rotate(
    angle: deg(-4),
    child: Container(
      width: 64,
      height: 84,
      decoration: BoxDecoration(color: roleColor(role), border: Border.all(color: C.ink, width: 3), borderRadius: BorderRadius.circular(12)),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Positioned.fill(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Glyph(role: role, size: 28, color: C.ink2),
                const SizedBox(height: 2),
                // Tek satır; sığmazsa iki yana taşar (CSS'teki gibi).
                SizedBox(
                  height: 12 * 1.45,
                  child: OverflowBox(
                    maxWidth: double.infinity,
                    child: Text(roleName[role] ?? role, style: T.b(12, color: C.ink2, weight: FontWeight.w800), softWrap: false),
                  ),
                ),
              ],
            ),
          ),
          Positioned(
            top: -10,
            right: -10,
            child: ExcludeSemantics(
              child: Container(
                width: 26,
                height: 26,
                alignment: Alignment.center,
                decoration: BoxDecoration(color: C.yellow, shape: BoxShape.circle, border: Border.all(color: C.ink, width: 2)),
                child: Text('?', style: T.d(16, color: C.ink2)),
              ),
            ),
          ),
        ],
      ),
    ),
  );
}

/// `.ig-cardbtn`: seçilebilir rol kartı (tek sıradakiler −3°, çiftler +3°; seçilince 4px yukarı ve halka).
class _CardButton extends StatelessWidget {
  const _CardButton({required this.card, required this.index, required this.selected, required this.onTap, this.tag});
  final IgCard card;
  final int index;
  final bool selected;
  final VoidCallback onTap;
  final String? tag;

  @override
  Widget build(BuildContext context) => Pressable(
    onTap: onTap,
    label: roleName[card.role],
    selected: selected,
    builder: (context, _) => AnimatedContainer(
      duration: const Duration(milliseconds: 100),
      curve: _ease,
      transformAlignment: Alignment.center,
      transform: selected ? Matrix4.translationValues(0, -4, 0) : Matrix4.rotationZ(deg(index.isEven ? -3 : 3)),
      child: FocusRing(
        focused: selected,
        radius: 18,
        color: C.ink2,
        offset: 3,
        width: 3,
        child: RoleCard(role: card.role, tag: tag),
      ),
    ),
  );
}

class LosePicker extends StatefulWidget {
  const LosePicker({super.key, required this.view, required this.remaining, required this.send});
  final IntrigueView view;
  final int remaining;
  final Send send;

  @override
  State<LosePicker> createState() => _LosePickerState();
}

class _LosePickerState extends State<LosePicker> {
  String? _pick;

  @override
  Widget build(BuildContext context) {
    final view = widget.view;
    IgCard? card;
    for (final c in view.me.hand) {
      if (c.id == _pick) card = c;
    }
    final hand = view.me.hand;
    return _Sheet(
      children: [
        Semantics(header: true, child: Text(loseReason[view.lose!.reason] ?? '', style: _sheetTitle(color: igAlarm))),
        Text(SPlay.loseMeHint, style: _sheetHint),
        if (view.durationMs > 0) IgBar(remaining: widget.remaining, total: view.durationMs),
        Padding(
          padding: const EdgeInsets.all(4),
          child: Grid2(
            rowGap: 12,
            columnGap: 12,
            children: [
              for (var i = 0; i < hand.length; i++)
                _CardButton(card: hand[i], index: i, selected: _pick == hand[i].id, onTap: () => setState(() => _pick = hand[i].id)),
            ],
          ),
        ),
        SButton(
          label: card != null ? SPlay.loseBtn(roleName[card.role] ?? '') : SPlay.loseMeTitle,
          tone: BtnTone.primary,
          large: true,
          block: true,
          onPressed: card == null ? null : () => widget.send({'type': 'lose', 'cardId': card!.id}),
        ),
      ],
    );
  }
}

class ExchangePicker extends StatefulWidget {
  const ExchangePicker({super.key, required this.view, required this.remaining, required this.send});
  final IntrigueView view;
  final int remaining;
  final Send send;

  @override
  State<ExchangePicker> createState() => _ExchangePickerState();
}

class _ExchangePickerState extends State<ExchangePicker> {
  List<String> _keep = const [];

  void _toggle(String id, int max) {
    setState(() {
      final cur = _keep;
      _keep = cur.contains(id) ? cur.where((x) => x != id).toList() : (cur.length >= max ? [...cur.skip(1), id] : [...cur, id]);
    });
  }

  @override
  Widget build(BuildContext context) {
    final view = widget.view;
    final ex = view.exchange!;
    final mine = {for (final c in view.me.hand) c.id};
    return _Sheet(
      children: [
        Semantics(header: true, child: Text(SPlay.exMeTitle, style: _sheetTitle())),
        Text(SPlay.exMeHint(ex.keep), style: _sheetHint),
        if (view.durationMs > 0) IgBar(remaining: widget.remaining, total: view.durationMs),
        Padding(
          padding: const EdgeInsets.all(4),
          child: Grid2(
            rowGap: 12,
            columnGap: 12,
            children: [
              for (var i = 0; i < ex.options.length; i++)
                _CardButton(
                  card: ex.options[i],
                  index: i,
                  selected: _keep.contains(ex.options[i].id),
                  tag: mine.contains(ex.options[i].id) ? null : SPlay.drawn,
                  onTap: () => _toggle(ex.options[i].id, ex.keep),
                ),
            ],
          ),
        ),
        SButton(
          label: SPlay.exBtn(ex.keep, _keep.length),
          tone: BtnTone.primary,
          large: true,
          block: true,
          onPressed: _keep.length != ex.keep ? null : () => widget.send({'type': 'exchange', 'keep': _keep}),
        ),
      ],
    );
  }
}
