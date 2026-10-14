import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../shared/text.dart';
import '../../ui/icons.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import 'bits.dart';
import 'desk.dart';
import 'models.dart';
import 'strings.dart';

/// Leads.tsx: soruşturma saati, bekleyen öneri, açılabilir izler, amirden ipucu, dosyayı kapat, açılan izler.
class Leads extends StatelessWidget {
  const Leads({super.key});

  @override
  Widget build(BuildContext context) {
    final d = Desk.of(context);
    final view = d.view;
    final active = view.phase == 'investigate';
    return VStack(
      gap: 12,
      children: [
        const _Hours(),
        if (active && view.proposal != null) const _Proposal(),
        if (active) const _Available(),
        if (active && view.hints.enabled) const _Hint(),
        if (active) const _Close(),
        if (view.opened.isNotEmpty) const _Opened(),
      ],
    );
  }
}

class _Hours extends StatelessWidget {
  const _Hours();

  @override
  Widget build(BuildContext context) {
    final h = Desk.of(context).view.hours;
    final out = h.spent >= h.budget;
    final over = math.max(0, h.spent - h.budget);
    final cells = math.max(h.budget, h.spent);
    final note = T.b(12, color: C.text3, weight: FontWeight.w700);
    return VStack(
      gap: 6,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: Text(SLeads.hours, style: T.d(13, color: C.text, height: 1.05))),
            const SizedBox(width: 10),
            Text(SLeads.hoursOf(h.spent, h.budget), style: T.b(13, color: out ? C.red : C.sky, weight: FontWeight.w800)),
          ],
        ),
        Semantics(
          label: SLeads.hoursOf(h.spent, h.budget),
          value: '${h.spent}',
          // grid-template-columns: repeat(15, minmax(0, 1fr)); gap: 3px
          child: VStack(
            gap: 3,
            children: [
              for (var r = 0; r * 15 < cells; r++)
                Row(
                  children: [
                    for (var k = 0; k < 15; k++) ...[
                      if (k > 0) const SizedBox(width: 3),
                      Expanded(child: r * 15 + k < cells ? _cell(r * 15 + k, h) : const SizedBox(height: 12)),
                    ],
                  ],
                ),
            ],
          ),
        ),
        Text.rich(
          TextSpan(
            children: [
              if (over > 0) TextSpan(text: '${SLeads.overBy(over)}. ', style: const TextStyle(color: C.red)),
              TextSpan(text: '${out ? SLeads.budgetOut : SLeads.target(h.target)} ${SLeads.actSpent(h.actSpent, h.actLimit)}.'),
            ],
          ),
          style: note,
        ),
      ],
    );
  }
}

Widget _cell(int i, HoursView h) => Container(
  height: 12,
  decoration: BoxDecoration(color: i < h.spent ? (i >= h.budget ? C.red : C.sky) : DtC.cell, borderRadius: BorderRadius.circular(3)),
  // data-target: `inset 0 0 0 2px` sarı
  foregroundDecoration: i == h.target - 1 ? BoxDecoration(border: Border.all(color: C.yellow, width: 2), borderRadius: BorderRadius.circular(3)) : null,
);

class _Proposal extends StatelessWidget {
  const _Proposal();

  @override
  Widget build(BuildContext context) {
    final d = Desk.of(context);
    final view = d.view;
    final p = view.proposal!;
    LeadView? lead;
    if (p.leadId != null) {
      for (final l in view.leads) {
        if (l.id == p.leadId) lead = l;
      }
    }
    final yes = p.votes.values.where((v) => v).length;
    final mine = p.votes[d.meId];
    final voting = view.leadMode == 'vote';
    final mineP = p.by == d.meId;
    final by = p.kind == 'lead' ? (mineP ? SProposal.leadMine : SProposal.lead(d.nick(p.by))) : (mineP ? SProposal.closeMine : SProposal.close(d.nick(p.by)));
    final desc = T.b(13, color: C.ink2, weight: FontWeight.w700);

    Widget vote(bool yesTone, String label) {
      final pressed = mine == yesTone;
      return Expanded(
        child: Pressable(
          onTap: () => d.send({'type': 'vote', 'yes': yesTone}),
          label: label,
          selected: pressed,
          builder: (context, down) => AnimatedContainer(
            duration: Duration.zero,
            transform: Matrix4.translationValues(0, down ? 2 : 0, 0),
            constraints: const BoxConstraints(minHeight: 46),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: yesTone ? C.mint : C.paper,
              border: Border.all(color: C.ink, width: 3),
              borderRadius: BorderRadius.circular(12),
              // aria-pressed: 0 0 0 3px kâğıt halka; değilse 0 4px 0 mürekkep gölge
              boxShadow: pressed ? const [BoxShadow(color: C.paper, spreadRadius: 3)] : hardShadow(0, 4),
            ),
            child: Text(label, style: T.d(18, color: C.ink2)),
          ),
        ),
      );
    }

    Widget btn(String label, VoidCallback onTap, {bool ghost = false}) => Pressable(
      onTap: onTap,
      label: label,
      builder: (context, _) => Container(
        constraints: const BoxConstraints(minHeight: 44),
        padding: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(color: ghost ? Colors.transparent : C.ink2, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(12)),
        child: Row(mainAxisSize: MainAxisSize.min, children: [Text(label, style: T.b(14, color: ghost ? C.ink2 : C.text, weight: FontWeight.w800, height: 1))]),
      ),
    );

    return Semantics(
      liveRegion: true,
      child: Transform.rotate(
        angle: deg(-1),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: C.yellow, border: Border.all(color: C.ink, width: 3), borderRadius: BorderRadius.circular(20), boxShadow: hardShadow(5, 5)),
          child: VStack(
            gap: 8,
            children: [
              Text(trUpper(voting ? '$by · ${SProposal.tally(yes, p.needed)}' : by), style: T.b(12, color: C.ink2, weight: FontWeight.w800, letterSpacing: 1.5)),
              if (lead != null) ...[
                Text(lead.title, style: T.d(20, color: C.ink2, height: 1.1)),
                Text('${lead.description} · ${SLeads.cost(lead.hours)}', style: desc),
              ] else ...[
                Text(SClose.direct, style: T.d(20, color: C.ink2, height: 1.1)),
                Text(SClose.hint, style: desc),
              ],
              if (voting) ...[
                if (p.votes.isNotEmpty)
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      for (final v in p.votes.entries)
                        Tooltip(
                          message: d.nick(v.key),
                          child: Stack(
                            clipBehavior: Clip.none,
                            children: [
                              if (d.player(v.key) case final pl?) SAvatar(avatar: pl.avatar, nick: pl.nick, size: 26) else const SizedBox(width: 26, height: 26),
                              Positioned(
                                right: -3,
                                bottom: -3,
                                child: Container(
                                  width: 14,
                                  height: 14,
                                  alignment: Alignment.center,
                                  decoration: BoxDecoration(color: v.value ? C.mint : C.red, shape: BoxShape.circle, border: Border.all(color: C.ink, width: 2)),
                                  child: SIcon(v.value ? 'check' : 'x', size: 10, color: C.ink2),
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                Row(children: [vote(true, SProposal.yes), const SizedBox(width: 8), vote(false, SProposal.no)]),
              ] else if (!d.isHost)
                Text(SProposal.waitHost, style: desc),
              if (d.isHost || p.by == d.meId)
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    if (d.isHost && p.kind == 'lead' && p.leadId != null) btn(SProposal.hostOpen, () => d.send({'type': 'open', 'leadId': p.leadId})),
                    if (d.isHost && p.kind == 'close') btn(SProposal.hostClose, () => d.send({'type': 'close'})),
                    btn(p.by == d.meId ? SProposal.cancel : SProposal.reject, () => d.send({'type': 'cancelProposal'}), ghost: true),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Available extends StatelessWidget {
  const _Available();

  @override
  Widget build(BuildContext context) {
    final view = Desk.of(context).view;
    return VStack(
      gap: 10,
      children: [
        DtLabel(SLeads.available, count: '${view.leads.length}'),
        if (view.leadMode == 'host') Text(SLeads.hostOnly, style: dtSmall(C.text3)),
        if (view.leads.isEmpty)
          const DtEmpty(SLeads.none)
        else
          VStack(gap: 12, children: [for (final l in view.leads) _LeadCard(key: ValueKey(l.id), l: l)]),
      ],
    );
  }
}

/// `.dt-lead-btn`
class _LeadBtn extends StatelessWidget {
  const _LeadBtn({required this.label, required this.onTap, this.ghost = false});
  final String label;
  final VoidCallback? onTap;
  final bool ghost;
  @override
  Widget build(BuildContext context) => Opacity(
    opacity: onTap == null ? 0.45 : 1,
    child: Pressable(
      onTap: onTap,
      label: label,
      builder: (context, _) => Container(
        constraints: const BoxConstraints(minHeight: 44),
        padding: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(
          color: ghost ? Colors.transparent : C.panel,
          border: Border.all(color: ghost ? C.violet : C.ink, width: 2),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [Text(label, style: T.b(14, color: ghost ? C.text2 : C.text, weight: FontWeight.w800, height: 1))]),
      ),
    ),
  );
}

/// `.dt-cost`: saat etiketi.
class _Cost extends StatelessWidget {
  const _Cost(this.hours, {this.off = false, this.spent = false});
  final int hours;
  final bool off;
  final bool spent;
  @override
  Widget build(BuildContext context) => Container(
    height: 22,
    padding: const EdgeInsets.symmetric(horizontal: 8),
    alignment: Alignment.center,
    decoration: BoxDecoration(color: spent ? DtC.cell : (off ? C.red : C.sky), borderRadius: BorderRadius.circular(8)),
    child: Text(SLeads.cost(hours), style: T.b(12, color: spent ? C.text2 : C.ink2, weight: FontWeight.w800, height: 18 / 12)),
  );
}

class _LeadCard extends StatelessWidget {
  const _LeadCard({super.key, required this.l});
  final LeadView l;

  @override
  Widget build(BuildContext context) {
    final d = Desk.of(context);
    final view = d.view;
    final left = view.hours.budget - view.hours.spent;
    final tooMuch = l.hours > left;
    final busy = view.proposal != null;
    final proposed = view.proposal?.leadId == l.id;
    final voting = view.leadMode == 'vote';
    final busyLabel = busy && !proposed ? SProposal.busy : null;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: DtC.card, border: Border.all(color: proposed ? C.yellow : DtC.cardLine, width: 2), borderRadius: BorderRadius.circular(16)),
      child: VStack(
        gap: 8,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: Text(l.title, style: T.d(15, color: C.text, height: 1.3))),
              const SizedBox(width: 10),
              _Cost(l.hours, off: tooMuch),
            ],
          ),
          Text(l.description, style: T.b(13, color: C.text3, weight: FontWeight.w600)),
          if (l.from != null)
            Align(
              alignment: Alignment.centerLeft,
              child: Pressable(
                onTap: () => d.openEvidence(l.from!.id),
                label: SLeads.from(l.from!.title),
                builder: (context, _) => Text(
                  SLeads.from(l.from!.title),
                  style: T.b(12, color: C.sky, weight: FontWeight.w800).copyWith(decoration: TextDecoration.underline, decorationColor: C.sky),
                ),
              ),
            ),
          if (tooMuch) Text(SLeads.tooExpensive, style: dtSmall(C.coral)),
          if (!proposed)
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (d.isHost && !voting)
                  _LeadBtn(label: SLeads.open, onTap: () => d.send({'type': 'open', 'leadId': l.id}))
                else if (busyLabel != null)
                  // `title`: bekleyen öneri varken neden kapalı olduğu (uzun basınca)
                  Tooltip(message: busyLabel, child: const _LeadBtn(label: SLeads.propose, onTap: null))
                else
                  _LeadBtn(label: SLeads.propose, onTap: busy ? null : () => d.send({'type': 'propose', 'leadId': l.id})),
                if (d.isHost && voting) _LeadBtn(label: SLeads.openNow, ghost: true, onTap: () => d.send({'type': 'open', 'leadId': l.id})),
              ],
            ),
        ],
      ),
    );
  }
}

class _Opened extends StatelessWidget {
  const _Opened();

  @override
  Widget build(BuildContext context) {
    final d = Desk.of(context);
    final list = d.view.opened.reversed.toList();
    return VStack(
      gap: 10,
      children: [
        DtLabel(SLeads.opened, count: '${d.view.opened.length}'),
        VStack(
          gap: 12,
          children: [
            for (final o in list)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: DtC.card, border: Border.all(color: DtC.cardLine, width: 2), borderRadius: BorderRadius.circular(16)),
                child: VStack(
                  gap: 8,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(child: Text(o.title, style: T.d(15, color: C.text, height: 1.3))),
                        const SizedBox(width: 10),
                        _Cost(o.hours, spent: true),
                      ],
                    ),
                    Text(o.outcome, style: T.b(13, color: C.text2, weight: FontWeight.w600)),
                    Text(SLeads.openedMeta(o.act, o.by != null ? d.nick(o.by) : null), style: T.b(11, color: C.text3, weight: FontWeight.w700)),
                    if (o.evidence.isNotEmpty)
                      Semantics(
                        label: SLeads.brought,
                        child: Wrap(
                          spacing: 12,
                          runSpacing: 4,
                          children: [for (final id in o.evidence) DtLink(d.evidence[id]?.title ?? id, onTap: () => d.openEvidence(id))],
                        ),
                      ),
                  ],
                ),
              ),
          ],
        ),
      ],
    );
  }
}

class _Hint extends StatelessWidget {
  const _Hint();

  @override
  Widget build(BuildContext context) {
    final d = Desk.of(context);
    final h = d.view.hints;
    final id = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(SHint.title, style: T.d(15, color: C.text, height: 1.05)),
        Text(SHint.left(h.left), style: T.b(12, color: C.text3, weight: FontWeight.w700)),
      ],
    );
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: DtC.card, border: Border.all(color: DtC.cardLine, width: 2), borderRadius: BorderRadius.circular(16)),
      child: VStack(
        gap: 10,
        children: [
          ConfirmButton(
            confirm: SHint.confirm,
            yes: SHint.confirmYes,
            disabled: h.left <= 0 || d.view.phase != 'investigate',
            onConfirm: () => d.send({'type': 'hint'}),
            trigger: (onTap) => Opacity(
              opacity: onTap == null ? 0.45 : 1,
              child: Pressable(
                onTap: onTap,
                label: SHint.askCost(hintPenalty),
                builder: (context, _) => Container(
                  constraints: const BoxConstraints(minHeight: 44),
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(color: C.coral, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(12)),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [Text(SHint.askCost(hintPenalty), style: T.b(13, color: C.ink2, weight: FontWeight.w800, height: 1))]),
                ),
              ),
            ),
            // .dt-hint-row: flex-wrap, iki uç; onay kutusu tam satır
            frame: (child, asking) => asking
                ? VStack(gap: 10, children: [Align(alignment: Alignment.centerLeft, child: id), child])
                : Wrap(
                    alignment: WrapAlignment.spaceBetween,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: 10,
                    runSpacing: 10,
                    children: [id, child],
                  ),
          ),
          if (h.used.isNotEmpty)
            VStack(
              gap: 8,
              children: [
                for (final u in h.used)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    decoration: BoxDecoration(color: C.panel2, borderRadius: BorderRadius.circular(12)),
                    child: VStack(
                      gap: 4,
                      children: [
                        Text(trUpper(SHint.used(u.act)), style: T.b(11, color: C.coral, weight: FontWeight.w800, letterSpacing: 1.5)),
                        Text(u.text, style: T.b(13, color: C.text, weight: FontWeight.w600, height: 1.5)),
                      ],
                    ),
                  ),
              ],
            ),
        ],
      ),
    );
  }
}

class _Close extends StatelessWidget {
  const _Close();

  @override
  Widget build(BuildContext context) {
    final d = Desk.of(context);
    final view = d.view;
    final voting = view.leadMode == 'vote';

    Widget solve(String text, VoidCallback? onTap, {bool long = false}) => Opacity(
      opacity: onTap == null ? 0.5 : 1,
      child: Pressable(
        onTap: onTap,
        label: '$text, ${SClose.tag}',
        builder: (context, down) => AnimatedContainer(
          duration: const Duration(milliseconds: 80),
          transform: Matrix4.translationValues(0, down ? 3 : 0, 0),
          constraints: const BoxConstraints(minHeight: 54),
          padding: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(
            color: C.sky,
            border: Border.all(color: C.ink, width: 3),
            borderRadius: BorderRadius.circular(18),
            boxShadow: hardShadow(0, down ? 2 : 5),
          ),
          child: Row(
            children: [
              Expanded(child: Text(text, style: T.d(long ? 18 : 20, color: C.ink2))),
              const SizedBox(width: 10),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                decoration: BoxDecoration(color: C.ink2, borderRadius: BorderRadius.circular(R.pill)),
                child: Text(SClose.tag, style: T.b(12, color: C.text, weight: FontWeight.w800)),
              ),
            ],
          ),
        ),
      ),
    );

    final note = !view.canClose ? SClose.notYet : (d.isHost || voting ? SClose.hint : SClose.hostOnly);
    return Semantics(
      label: SClose.direct,
      container: true,
      child: VStack(
        gap: 8,
        children: [
          if (d.isHost)
            ConfirmButton(
              disabled: !view.canClose,
              confirm: SClose.confirm,
              yes: SClose.confirmYes,
              onConfirm: () => d.send({'type': 'close'}),
              trigger: (onTap) => solve(SClose.direct, onTap),
            )
          else if (voting)
            solve(SClose.propose, !view.canClose || view.proposal != null ? null : () => d.send({'type': 'proposeClose'}), long: true),
          Text(note, style: T.b(12, color: C.text3, weight: FontWeight.w700)),
        ],
      ),
    );
  }
}
