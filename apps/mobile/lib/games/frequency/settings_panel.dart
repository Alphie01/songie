import 'package:flutter/material.dart';

import '../../session/api.dart';
import '../../shared/models.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/game_module.dart';
import '../kit/kit.dart';
import 'models.dart';
import 'strings.dart';

Color _teamColor(String team) => team == 'b' ? C.lilac : C.mint;

/// `div.sgs-group` + `.fq-group-head`: sade başlık (14px, 700) ve isteğe bağlı sağ düğme; öğeler arasında 8px.
Widget _group(String title, List<Widget> children, {String? hint, Widget? action}) => Semantics(
  container: true,
  child: VStack(
    gap: 8,
    children: [
      Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Flexible(
            child: Text(
              title,
              style: T.b(14, color: C.text2, weight: FontWeight.w700),
            ),
          ),
          if (action != null) ...[const SizedBox(width: 8), action],
        ],
      ),
      ...children,
      if (hint != null) Text(hint, style: SettingsGroup.defaultHint()),
    ],
  ),
);

/// games/frequency/client/SettingsPanel.tsx
class FrequencySettingsPanel extends StatelessWidget {
  const FrequencySettingsPanel({super.key, required this.props});
  final SettingsPanelProps props;

  @override
  Widget build(BuildContext context) {
    final p = props;
    final settings = FrequencySettings.fromJson(p.settings);
    void set(Json patch) {
      if (p.editable) p.onChange({...p.settings, ...patch});
    }

    final present = {for (final pl in p.players) pl.id};
    final teamA = settings.teams['a']!.where(present.contains).toList();
    final teamB = settings.teams['b']!.where((id) => present.contains(id) && !teamA.contains(id)).toList();
    final unassigned = [
      for (final pl in p.players)
        if (!teamA.contains(pl.id) && !teamB.contains(pl.id)) pl.id,
    ];
    final byId = {for (final pl in p.players) pl.id: pl};
    final teams = settings.mode == 'teams';

    /// Takımsız, Yeşil, Mor döngüsü.
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
      });
    }

    void shuffleTeams() {
      final ids = [for (final pl in p.players) pl.id]..shuffle();
      final half = (ids.length / 2).ceil();
      set({
        'teams': {'a': ids.sublist(0, half), 'b': ids.sublist(half)},
      });
    }

    Widget box(String? team, List<String> ids) => _TeamBox(team: team, ids: ids, byId: byId, onTap: p.editable ? cycle : null);

    Widget toggle(bool on, String key) => SToggle(label: on ? SSettings.on : SSettings.off, value: on, onChanged: p.editable ? (_) => set({key: !on}) : null);

    final items = <Widget>[];
    if (p.showPrimary) {
      if (!p.editable) items.add(const ReadOnlyNote(SSettings.readOnly));
      items.add(
        _group(SSettings.mode, hint: teams ? SSettings.modeTeamsHint : SSettings.modeCoopHint, [
          VStack(
            gap: 6,
            children: [
              SOption(selected: teams, onPressed: p.editable ? () => set({'mode': 'teams'}) : null, child: const Text(SSettings.modeTeams)),
              SOption(selected: !teams, onPressed: p.editable ? () => set({'mode': 'coop'}) : null, child: const Text(SSettings.modeCoop)),
            ],
          ),
        ]),
      );
      if (teams) {
        items.add(
          _group(
            SSettings.teams,
            hint: teamA.length < minTeam || teamB.length < minTeam ? '${SSettings.needTwo} ${SSettings.teamsHint}' : SSettings.teamsHint,
            action: p.editable ? _ShuffleButton(onTap: shuffleTeams) : null,
            [
              Grid2(columnGap: 10, rowGap: 10, equalHeight: true, children: [box('a', teamA), box('b', teamB)]),
              if (unassigned.isNotEmpty) box(null, unassigned),
            ],
          ),
        );
      }
      items.add(
        teams
            ? _group(SSettings.targetScore, [
                SChips(
                  children: [
                    for (final n in targetScoreOptions)
                      SChip(label: '$n', selected: settings.targetScore == n, onPressed: p.editable ? () => set({'targetScore': n}) : null),
                  ],
                ),
              ])
            : _group(SSettings.rounds, [
                SChips(
                  children: [
                    for (final n in roundOptions) SChip(label: '$n', selected: settings.rounds == n, onPressed: p.editable ? () => set({'rounds': n}) : null),
                  ],
                ),
              ]),
      );
    }

    if (p.showSecondary) {
      items.addAll([
        _group(SSettings.seconds, hint: SSettings.secondsHint, [
          SChips(
            children: [
              for (final n in secondsOptions)
                SChip(
                  label: n == 0 ? SSettings.untimed : SSettings.sec(n),
                  selected: settings.seconds == n,
                  onPressed: p.editable ? () => set({'seconds': n}) : null,
                ),
            ],
          ),
        ]),
        _group(SSettings.cardChoice, hint: SSettings.cardChoiceHint, [toggle(settings.cardChoice, 'cardChoice')]),
        _group(SSettings.majorityLock, hint: SSettings.majorityLockHint, [toggle(settings.majorityLock, 'majorityLock')]),
        _group(SSettings.catchUp, hint: SSettings.catchUpHint, [toggle(settings.catchUp, 'catchUp')]),
        _group(SSettings.friendCards, hint: SSettings.friendCardsHint, [toggle(settings.friendCards, 'friendCards')]),
        _AddCard(api: p.api),
      ]);
    }
    return VStack(gap: 22, children: items);
  }
}

/// `.fq-shuffle`
class _ShuffleButton extends StatelessWidget {
  const _ShuffleButton({required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Pressable(
    onTap: onTap,
    label: SSettings.shuffleLabel,
    builder: (context, _) => Container(
      constraints: const BoxConstraints(minHeight: 44),
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: C.panel,
        border: Border.all(color: C.ink, width: 2),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Align(
        widthFactor: 1,
        child: ExcludeSemantics(
          child: Text(
            SSettings.shuffle,
            style: T.b(13, color: C.text, weight: FontWeight.w800),
          ),
        ),
      ),
    ),
  );
}

/// `.fq-teambox`: takım kartı; takımsızlar kesikli mor çerçevede.
class _TeamBox extends StatelessWidget {
  const _TeamBox({required this.team, required this.ids, required this.byId, required this.onTap});
  final String? team;
  final List<String> ids;
  final Map<String, RoomPlayer> byId;
  final void Function(String id)? onTap;

  @override
  Widget build(BuildContext context) {
    final fg = team == null ? C.text3 : C.ink2;
    final inner = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Flexible(
              child: Text(team == null ? SSettings.unassigned : S.team[team]!, style: T.d(16, color: fg, height: 1.45)),
            ),
            Opacity(
              opacity: 0.7,
              child: Text('${ids.length}', style: T.d(13, color: fg, height: 1.45)),
            ),
          ],
        ),
        if (ids.isEmpty)
          Opacity(
            opacity: 0.75,
            child: Text(
              SSettings.empty,
              style: T.b(12, color: fg, weight: FontWeight.w700),
            ),
          )
        else
          for (final id in ids)
            if (byId[id] case final pl?)
              Pressable(
                onTap: onTap == null ? null : () => onTap!(id),
                label: pl.nick,
                builder: (context, _) => ConstrainedBox(
                  constraints: const BoxConstraints(minHeight: 44),
                  child: Row(
                    children: [
                      SAvatar(avatar: pl.avatar, nick: pl.nick, size: 26, dim: !pl.connected),
                      const SizedBox(width: 6),
                      Flexible(
                        child: Text(
                          pl.nick,
                          style: T.b(14, color: team == null ? C.text : C.ink2, weight: FontWeight.w800),
                          maxLines: 1,
                          softWrap: false,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
      ],
    );
    if (team == null) return DashedBox(color: C.violet, radius: 18, width: 3, padding: const EdgeInsets.all(10), child: inner);
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: _teamColor(team!),
        border: Border.all(color: C.ink, width: bw),
        borderRadius: BorderRadius.circular(18),
      ),
      child: inner,
    );
  }
}

/// Her oyuncu kart ekleyebilir; kartlar hiçbir ekranda listelenmez.
class _AddCard extends StatefulWidget {
  const _AddCard({required this.api});
  final GameApi api;

  @override
  State<_AddCard> createState() => _AddCardState();
}

class _AddCardState extends State<_AddCard> {
  bool _open = false;
  bool _busy = false;
  final _left = TextEditingController();
  final _right = TextEditingController();
  (String, bool)? _msg;

  @override
  void initState() {
    super.initState();
    _left.addListener(() => setState(() {}));
    _right.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _left.dispose();
    _right.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _msg = null;
    });
    try {
      final left = _left.text;
      final right = _right.text;
      await widget.api.post('/cards', {'left': left, 'right': right});
      if (!mounted) return;
      setState(() {
        _msg = (SSettings.saved(left.trim(), right.trim()), false);
        _left.clear();
        _right.clear();
      });
    } on ApiError catch (e) {
      if (mounted) setState(() => _msg = (e.message.isNotEmpty ? e.message : SSettings.failed, true));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final canSave = !_busy && _left.text.trim().length >= 2 && _right.text.trim().length >= 2;
    Widget input(TextEditingController c, String label) => Semantics(
      label: label,
      child: SInput(controller: c, placeholder: label, maxLength: 40, minHeight: 44, fontSize: 16),
    );
    return _group(SSettings.addCard, hint: SSettings.addCardHint, [
      BrowseToggle(label: SSettings.addCard, open: _open, onTap: () => setState(() => _open = !_open)),
      if (_open)
        VStack(
          gap: 6,
          children: [
            input(_left, SSettings.left),
            input(_right, SSettings.right),
            SButton(label: _busy ? SSettings.saving : SSettings.save, tone: BtnTone.outline, block: true, onPressed: canSave ? _submit : null),
            if (_msg != null) Semantics(liveRegion: true, child: _msg!.$2 ? ErrorText(_msg!.$1) : Text(_msg!.$1, style: SettingsGroup.defaultHint())),
          ],
        ),
    ]);
  }
}
