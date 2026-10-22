import 'package:flutter/material.dart';

import '../../shared/models.dart';
import '../../shared/text.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/game_module.dart';
import '../kit/kit.dart';
import 'models.dart';
import 'strings.dart';

Color _teamColor(String team) => team == 'b' ? C.lilac : C.mint;

/// `fieldset.sgs-group`: büyük harfli başlık (8px boşluk), içerik öğeleri arasında 8px, ipucu.
Widget _group(String title, List<Widget> children, {String? hint}) => SettingsGroup(
  title: title,
  hint: hint,
  child: VStack(gap: 8, children: children),
);

/// Satırdaki inline öğeler için gövde metninin satır kutusu (16px, 1.45).
const _bodyStrut = StrutStyle(fontFamily: T.font, fontSize: 16, height: 1.45, leadingDistribution: TextLeadingDistribution.even, forceStrutHeight: false);

/// games/agents/client/SettingsPanel.tsx
class AgentsSettingsPanel extends StatelessWidget {
  const AgentsSettingsPanel({super.key, required this.props});
  final SettingsPanelProps props;

  @override
  Widget build(BuildContext context) {
    final p = props;
    final settings = AgentsSettings.fromJson(p.settings);
    void set(Json patch) {
      if (p.editable) p.onChange({...p.settings, ...patch});
    }

    final present = {for (final pl in p.players) pl.id};
    final teamA = settings.teams['a']!.where(present.contains).toList();
    final teamB = settings.teams['b']!.where((id) => present.contains(id) && !teamA.contains(id)).toList();
    final teams = {'a': teamA, 'b': teamB};
    final unassigned = [
      for (final pl in p.players)
        if (!teamA.contains(pl.id) && !teamB.contains(pl.id)) pl.id,
    ];
    final byId = {for (final pl in p.players) pl.id: pl};

    /// Takımsız → Yeşil → Mor → Takımsız. Takım değişince liderlik düşer.
    void cycle(String id) {
      final inA = teamA.contains(id);
      final inB = teamB.contains(id);
      final a = teamA.where((x) => x != id).toList();
      final b = teamB.where((x) => x != id).toList();
      if (!inA && !inB) {
        a.add(id);
      } else if (inA) {
        b.add(id);
      }
      set({
        'teams': {'a': a, 'b': b},
        'leaders': {'a': settings.leaders['a'] == id ? null : settings.leaders['a'], 'b': settings.leaders['b'] == id ? null : settings.leaders['b']},
      });
    }

    void shuffleTeams() {
      final ids = [for (final pl in p.players) pl.id]..shuffle();
      final half = (ids.length / 2).ceil();
      set({
        'teams': {'a': ids.sublist(0, half), 'b': ids.sublist(half)},
        'leaders': {'a': null, 'b': null},
      });
    }

    Widget box(String? team, List<String> ids) => _TeamBox(team: team, ids: ids, byId: byId, meId: p.meId, onTap: p.editable ? cycle : null);

    final items = <Widget>[];
    if (p.showPrimary) {
      if (!p.editable) items.add(const ReadOnlyNote(SSettings.readOnly));
      items.add(
        Semantics(
          container: true,
          label: SSettings.teams,
          child: VStack(
            gap: 10,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // h3.eyebrow: satır yüksekliği başlık kuralından (1.05).
                  Flexible(child: Text(trUpper(SSettings.teams), style: T.eyebrow().copyWith(height: 1.05))),
                  if (p.editable) ...[const SizedBox(width: 8), _ShuffleButton(onTap: shuffleTeams)],
                ],
              ),
              Grid2(columnGap: 10, rowGap: 10, equalHeight: true, children: [box('a', teamA), box('b', teamB)]),
              if (unassigned.isNotEmpty) box(null, unassigned),
              Text(
                teamA.length < 2 || teamB.length < 2 ? '${SSettings.needTwo} ${SSettings.teamsHint}' : SSettings.teamsHint,
                style: SettingsGroup.defaultHint(),
              ),
            ],
          ),
        ),
      );
      items.add(
        _group(SSettings.leaders, hint: SSettings.leaderHint, [
          VStack(
            gap: 6,
            children: [
              for (final m in const ['random', 'host'])
                SOption(selected: settings.leaderPick == m, onPressed: p.editable ? () => set({'leaderPick': m}) : null, child: Text(SSettings.leaderPick[m]!)),
            ],
          ),
          if (settings.leaderPick == 'host')
            for (final t in teamIds)
              _LeaderPick(
                team: t,
                ids: teams[t]!,
                byId: byId,
                selected: settings.leaders[t],
                onPick: p.editable
                    ? (id) => set({
                        'leaders': {...settings.leaders, t: settings.leaders[t] == id ? null : id},
                      })
                    : null,
              ),
        ]),
      );
      items.add(
        _group(SSettings.packs, hint: SSettings.packHint, [
          SChips(
            children: [
              for (final pk in packIds)
                SChip(
                  label: SSettings.pack[pk]!,
                  selected: settings.packs.contains(pk),
                  onPressed: p.editable
                      ? () {
                          final has = settings.packs.contains(pk);
                          final next = has ? settings.packs.where((x) => x != pk).toList() : [...settings.packs, pk];
                          if (next.isNotEmpty) set({'packs': next});
                        }
                      : null,
                ),
            ],
          ),
        ]),
      );
    }

    if (p.showSecondary) {
      items.add(
        _group(SSettings.reveal, hint: SSettings.revealHint[settings.revealMode], [
          VStack(
            gap: 6,
            children: [
              for (final m in const ['first', 'vote'])
                SOption(selected: settings.revealMode == m, onPressed: p.editable ? () => set({'revealMode': m}) : null, child: Text(SSettings.revealMode[m]!)),
            ],
          ),
        ]),
      );
      items.add(
        _group(SSettings.timer, hint: SSettings.timerHint[settings.timer], [
          VStack(
            gap: 6,
            children: [
              for (final m in const ['off', 'split', 'total'])
                SOption(selected: settings.timer == m, onPressed: p.editable ? () => set({'timer': m}) : null, child: Text(SSettings.timerMode[m]!)),
            ],
          ),
          if (settings.timer != 'off')
            SChips(
              children: [
                for (final n in secondsOptions)
                  SChip(label: SSettings.sec(n), selected: settings.seconds == n, onPressed: p.editable ? () => set({'seconds': n}) : null),
              ],
            ),
        ]),
      );
    }

    final panel = VStack(gap: 22, children: items);
    // `.sgs[data-section='secondary'] { margin-top: 12px }`
    return p.section == 'secondary' ? Padding(padding: const EdgeInsets.only(top: 12), child: panel) : panel;
  }
}

/// `.ag-shuffle`
class _ShuffleButton extends StatelessWidget {
  const _ShuffleButton({required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Semantics(
    label: SSettings.shuffleAria,
    excludeSemantics: true,
    child: Pressable(
      onTap: onTap,
      label: SSettings.shuffleAria,
      builder: (context, _) => Container(
        constraints: const BoxConstraints(minHeight: 36),
        padding: const EdgeInsets.symmetric(horizontal: 12),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: C.panel,
          border: Border.all(color: C.ink, width: 2),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Text(
          SSettings.shuffle,
          style: T.b(13, color: C.text, weight: FontWeight.w800),
        ),
      ),
    ),
  );
}

/// `.ag-teambox`: takım kutusu; oyuncuya dokununca takımı değişir.
class _TeamBox extends StatelessWidget {
  const _TeamBox({required this.team, required this.ids, required this.byId, required this.meId, required this.onTap});
  final String? team;
  final List<String> ids;
  final Map<String, RoomPlayer> byId;
  final String meId;
  final void Function(String id)? onTap;

  @override
  Widget build(BuildContext context) {
    final fg = team == null ? C.text : C.ink2;
    final rows = <Widget>[
      Row(
        crossAxisAlignment: CrossAxisAlignment.baseline,
        textBaseline: TextBaseline.alphabetic,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Flexible(
            child: Text(team == null ? SSettings.unassigned : S.team[team]!, style: T.d(16, color: fg, height: 1.45)),
          ),
          const SizedBox(width: 6),
          Opacity(
            opacity: 0.7,
            child: Text('${ids.length}', style: T.d(13, color: fg, height: 1.45)),
          ),
        ],
      ),
      if (ids.isEmpty)
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Opacity(
            opacity: 0.75,
            child: Text(
              SSettings.empty,
              style: T.b(13, color: fg, weight: FontWeight.w700),
            ),
          ),
        )
      else
        for (final id in ids)
          if (byId[id] case final pl?) _PlayerButton(player: pl, me: pl.id == meId, color: fg, onTap: onTap == null ? null : () => onTap!(id)),
    ];
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: team == null ? C.panel : _teamColor(team!),
        border: Border.all(color: C.ink, width: 3),
        borderRadius: BorderRadius.circular(18),
      ),
      child: VStack(gap: 2, children: rows),
    );
  }
}

/// `.ag-player`: kutudaki oyuncu satırı (düğme).
class _PlayerButton extends StatelessWidget {
  const _PlayerButton({required this.player, required this.me, required this.color, required this.onTap});
  final RoomPlayer player;
  final bool me;
  final Color color;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final name = '${player.nick}${me ? ' (${SPlay.you})' : ''}';
    return Opacity(
      opacity: player.connected ? 1 : 0.6,
      child: Pressable(
        onTap: onTap,
        label: name,
        builder: (context, _) => ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 44),
          child: Row(
            children: [
              SAvatar(avatar: player.avatar, nick: player.nick, size: 26),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  name,
                  style: T.b(14, color: color, weight: FontWeight.w800),
                  maxLines: 1,
                  softWrap: false,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if (!player.connected) ...[
                const SizedBox(width: 6),
                Text(
                  SSettings.offline,
                  style: T.b(10, color: color, weight: FontWeight.w800),
                  maxLines: 1,
                  softWrap: false,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// `.ag-leaderpick`: biçimsiz blok; ad satırı, altında yan yana (boşluksuz) çipler.
class _LeaderPick extends StatelessWidget {
  const _LeaderPick({required this.team, required this.ids, required this.byId, required this.selected, required this.onPick});
  final String team;
  final List<String> ids;
  final Map<String, RoomPlayer> byId;
  final String? selected;
  final void Function(String id)? onPick;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(SSettings.pickLeader(S.teamShort[team]!), style: T.b(16, color: C.text)),
        if (ids.isEmpty)
          Text(SSettings.noLeader, style: SettingsGroup.defaultHint())
        else
          // inline-flex çipler, gövde metninin satır kutusunda taban çizgisine oturur.
          Text.rich(
            TextSpan(
              children: [
                for (final id in ids)
                  WidgetSpan(
                    alignment: PlaceholderAlignment.baseline,
                    baseline: TextBaseline.alphabetic,
                    child: SChip(label: byId[id]?.nick ?? '?', selected: selected == id, onPressed: onPick == null ? null : () => onPick!(id)),
                  ),
              ],
            ),
            strutStyle: _bodyStrut,
            style: T.b(16, color: C.text),
          ),
      ],
    );
  }
}
