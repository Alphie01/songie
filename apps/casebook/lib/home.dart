import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:songie_core/flavor.dart';
import 'package:songie_core/games/catalog.dart';
import 'package:songie_core/games/detective/models.dart';
import 'package:songie_core/screens/shell.dart';
import 'package:songie_core/session/session.dart';
import 'package:songie_core/shared/models.dart';
import 'package:songie_core/shared/text.dart';
import 'package:songie_core/ui/dialog.dart';
import 'package:songie_core/ui/page.dart';
import 'package:songie_core/ui/tokens.dart';
import 'package:songie_core/ui/widgets.dart';

import 'parts.dart';
import 'ranks.dart';
import 'strings.dart';
import 'style.dart';

/// Vaka listesini getirir (testlerde sahtesi verilir).
typedef CasesLoader = Future<CasesResponse> Function(BuildContext context);

Future<CasesResponse> _loadCases(BuildContext context) async =>
    CasesResponse.fromJson(await context.read<Session>().api.get('/api/games/detective/cases'));

const _gameId = 'detective';
const _tilts = [-0.8, 0.6, -0.4, 0.9];
const _memberColors = [K.pink, K.mint, K.yellow, K.lilac];

/// Ayarların tamamı (sunucu şeması: caseSlug, resume, leadMode, hints).
Json _settings({String? caseSlug, String? resume}) => {'caseSlug': caseSlug, 'resume': resume, 'leadMode': 'vote', 'hints': true};

/// Casebook ana ekranı (CasebookHome.dc.html).
class CasebookHome extends StatefulWidget {
  const CasebookHome({super.key, this.loader = _loadCases});
  final CasesLoader loader;

  @override
  State<CasebookHome> createState() => _CasebookHomeState();
}

class _CasebookHomeState extends State<CasebookHome> {
  final _code = TextEditingController();
  CasesResponse? _data;
  bool _loadFailed = false;
  String? _loadedFor;
  String? _error;
  String? _busy;
  String _filter = 'all';

  @override
  void initState() {
    super.initState();
    _code.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loadFailed = false);
    try {
      final r = await widget.loader(context);
      if (mounted) setState(() => _data = r);
    } on Object {
      if (mounted) setState(() => _loadFailed = true);
    }
  }

  Future<void> _join() async {
    final code = _code.text;
    if (code.length != 4) {
      setState(() => _error = TrCb.codeLength);
      return;
    }
    setState(() {
      _busy = 'join';
      _error = null;
    });
    final res = await context.read<Session>().emit('room:join', {'code': code});
    if (!mounted) return;
    setState(() => _busy = null);
    if (res.ok) {
      context.go('/r/$code');
    } else {
      setState(() => _error = res.error);
    }
  }

  /// Dedektif odası kurar; [start] ise lobi beklemeden dosyayı açar (tek başına).
  Future<void> _create(String busy, {Json? settings, bool start = false}) async {
    final session = context.read<Session>();
    setState(() {
      _busy = busy;
      _error = null;
    });
    final res = await session.emit('room:create', {'gameId': _gameId, 'settings': ?settings});
    if (res.ok && start) await session.emit('room:start');
    if (!mounted) return;
    setState(() => _busy = null);
    if (res.ok) {
      context.go('/r/${res['code']}');
    } else {
      setState(() => _error = res.error);
    }
  }

  void _resume(SessionCard s) {
    final room = context.read<Session>().room;
    // Bu soruşturmanın odası zaten açıksa oraya dön.
    if (room != null && room.gameId == _gameId && room.settings is Map && (room.settings as Map)['resume'] == s.id) {
      context.go('/r/${room.code}');
      return;
    }
    // Tek kişilik dosya hemen açılır; ekip dosyası lobide ekibi bekler.
    _create('resume', settings: _settings(caseSlug: s.slug, resume: s.id), start: s.members.length <= 1);
  }

  void _solo() {
    final solo = Catalog.instance.find(_gameId)?.soloSettings;
    if (solo != null) {
      _create('solo', settings: asJson(solo), start: true);
      return;
    }
    final cases = _data?.cases ?? const <CaseCard>[];
    if (cases.isEmpty) {
      _create('solo');
      return;
    }
    showSDialog<void>(
      context,
      builder: (ctx) => _SoloPicker(
        cases: cases,
        onPick: (c) {
          Navigator.of(ctx).pop();
          _create('solo', settings: _settings(caseSlug: c.slug), start: true);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<Session>();
    final profile = session.profile;
    if (profile == null) return const SizedBox();
    // Profil gelince (ya da hesap değişince) dosyaları yeniden getir.
    if (profile.id != _loadedFor) {
      _loadedFor = profile.id;
      WidgetsBinding.instance.addPostFrameCallback((_) => mounted ? _load() : null);
    }
    final data = _data;
    final rank = bestRank(data?.cases ?? const []);
    final active = data == null || data.sessions.isEmpty ? null : (data.sessions.toList()..sort((a, b) => b.updatedAt.compareTo(a.updatedAt))).first;

    return SPage(
      padTop: 20,
      padBottom: 32,
      child: VStack(
        gap: 22,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              CbMenuButton(onTap: ShellMenu.of(context)),
              const SizedBox(width: 12),
              CbLogo(onTap: () => context.go('/')),
              const SizedBox(width: 12),
              Pressable(
                onTap: () => context.go('/profil'),
                label: TrCb.profile,
                builder: (context, _) => SAvatar(avatar: profile.avatar, nick: profile.nick, size: 44, fontSize: 20, borderColor: K.black),
              ),
            ],
          ),
          VStack(
            gap: 4,
            children: [
              Text(trUpper('$rank ${profile.nick}'), style: KT.mono(14, color: K.skyText, letterSpacing: 2)),
              Text(TrCb.headline, style: KT.display(38, color: K.white, height: 0.98)),
            ],
          ),
          if (active != null) _activeCard(active, data!, profile),
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(
                  child: CbBigButton(
                    icon: KIcons.team,
                    title: TrCb.team,
                    sub: TrCb.teamSub,
                    color: K.sky,
                    angle: -1.5,
                    busy: _busy == 'team',
                    onTap: _busy != null ? null : () => _create('team'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: CbBigButton(
                    icon: KIcons.solo,
                    title: TrCb.solo,
                    sub: TrCb.soloSub,
                    color: K.yellow,
                    angle: 1.5,
                    busy: _busy == 'solo',
                    onTap: _busy != null ? null : _solo,
                  ),
                ),
              ],
            ),
          ),
          _joinField(),
          if (data != null) CbRankCard(current: rank, solved: data.cases.where((c) => c.solved != null).length, total: data.cases.length),
          _shelf(data),
          Text(AppFlavor.current.footer ?? '', textAlign: TextAlign.center, style: KT.mono(13, color: K.footer)),
        ],
      ),
    );
  }

  Widget _activeCard(SessionCard s, CasesResponse data, Profile me) {
    final card = data.cases.where((c) => c.slug == s.slug).firstOrNull;
    final place = [if (card != null) placeOf(card.subtitle), if (card != null) capitalizeTr(card.genre)].join(' · ');
    // Üyeler avatar renkleri ve baş harfleriyle; adı gelmeyen üye (eski sunucu) renkli "?" ile.
    final known = {for (final m in s.crew) m.id: m};
    final members = <(Color, String)>[
      for (final (i, id) in s.members.indexed)
        if (known[id] case final m?)
          (avatarColors[m.avatar.color] ?? _memberColors[i % _memberColors.length], _initial(m.nick))
        else if (id == me.id)
          (avatarColors[me.avatar.color] ?? K.mint, _initial(me.nick))
        else
          (_memberColors[i % _memberColors.length], '?'),
    ];
    return CbActiveCard(
      session: s,
      place: place,
      members: members,
      busy: _busy == 'resume',
      onResume: _busy != null ? null : () => _resume(s),
    );
  }

  Widget _joinField() {
    final canJoin = _code.text.length == 4 && _busy == null;
    final field = Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(color: K.paper, border: blackBorder(), borderRadius: BorderRadius.circular(16)),
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Center(
                  child: Semantics(
                    label: TrCb.codeLabel,
                    child: TextField(
                      controller: _code,
                      maxLength: 4,
                      autocorrect: false,
                      enableSuggestions: false,
                      textCapitalization: TextCapitalization.characters,
                      textInputAction: TextInputAction.go,
                      onSubmitted: (_) => _join(),
                      onChanged: (_) => setState(() => _error = null),
                      inputFormatters: [_RoomCodeFormatter()],
                      cursorColor: K.brown,
                      style: KT.mono(20, color: K.brown, letterSpacing: 4),
                      decoration: InputDecoration(
                        isCollapsed: true,
                        border: InputBorder.none,
                        counterText: '',
                        hintText: trUpper(TrCb.codePlaceholder),
                        hintStyle: KT.mono(20, color: K.brown.withValues(alpha: 0.5), letterSpacing: 4),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            Pressable(
              onTap: canJoin ? _join : null,
              label: TrCb.join,
              builder: (context, _) => Container(
                constraints: const BoxConstraints(minHeight: 54),
                padding: const EdgeInsets.symmetric(horizontal: 20),
                alignment: Alignment.center,
                decoration: const BoxDecoration(color: K.brown, border: Border(left: BorderSide(color: K.black, width: bw))),
                child: Text(_busy == 'join' ? TrCb.joining : TrCb.join, style: KT.display(18, color: K.paper)),
              ),
            ),
          ],
        ),
      ),
    );
    return VStack(
      gap: 8,
      children: [
        field,
        if (_error != null) Semantics(liveRegion: true, child: Text(_error!, style: T.b(14, color: C.errorOnDark, weight: FontWeight.w800))),
      ],
    );
  }

  Widget _shelf(CasesResponse? data) {
    final g = Layout.gutter(context);
    final all = data?.cases ?? const <CaseCard>[];
    final openSlugs = {for (final s in data?.sessions ?? const <SessionCard>[]) s.slug};
    final shown = [
      for (final (i, c) in all.indexed)
        if (_filter == 'all' || (_filter == 'cozuldu' ? c.solved != null : c.difficulty == _filter)) (i, c),
    ];
    final Widget list;
    if (_loadFailed) {
      list = Pressable(
        onTap: _load,
        label: TrCb.retry,
        builder: (context, _) => Text.rich(
          TextSpan(
            text: '${TrCb.loadError} ',
            children: [TextSpan(text: TrCb.retry, style: const TextStyle(decoration: TextDecoration.underline))],
          ),
          style: T.b(14, color: C.errorOnDark, weight: FontWeight.w800),
        ),
      );
    } else if (data == null) {
      list = Text(TrCb.loading, style: KT.mono(13, color: K.footer));
    } else if (shown.isEmpty) {
      list = Text(TrCb.empty, style: KT.mono(13, color: K.footer));
    } else {
      list = VStack(
        gap: 14,
        children: [
          for (final (j, (i, c)) in shown.indexed)
            CbCaseCard(
              c: c,
              no: i + 1,
              open: openSlugs.contains(c.slug),
              angle: _tilts[j % 4],
              onTap: _busy != null ? null : () => _create('case:${c.slug}', settings: _settings(caseSlug: c.slug)),
            ),
        ],
      );
    }

    return VStack(
      gap: 14,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          children: [
            Semantics(header: true, child: Text(TrCb.shelf, style: KT.display(30, color: K.white))),
            if (data != null) Text(TrCb.count(shown.length), style: KT.mono(13, color: K.skyText)),
          ],
        ),
        // Kenarlara taşan yatay çip şeridi (margin: 0 -18px; padding: 4px 18px 8px).
        Semantics(
          label: TrCb.filterLabel,
          container: true,
          child: Transform.translate(
            offset: Offset(-g, 0),
            child: SizedBox(
              width: MediaQuery.sizeOf(context).width,
              height: 4 + 44 + 8,
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                clipBehavior: Clip.none,
                padding: EdgeInsets.fromLTRB(g, 4, g, 8),
                child: Row(
                  children: [
                    for (final (i, f) in TrCb.filters.indexed) ...[
                      if (i > 0) const SizedBox(width: 8),
                      CbChip(label: f.$2, selected: _filter == f.$1, onTap: () => setState(() => _filter = f.$1)),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
        list,
      ],
    );
  }
}

String _initial(String nick) {
  final t = nick.trim();
  return t.isEmpty ? '?' : trUpper(String.fromCharCode(t.runes.first));
}

/// Tek başına: hangi dosya açılsın.
class _SoloPicker extends StatelessWidget {
  const _SoloPicker({required this.cases, required this.onPick});
  final List<CaseCard> cases;
  final void Function(CaseCard c) onPick;

  @override
  Widget build(BuildContext context) => SDialog(
    body: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(padding: const EdgeInsets.only(right: 52), child: Text(TrCb.soloPick, style: T.d(30, color: C.ink2, height: 1.05))),
        const SizedBox(height: 6),
        Text(TrCb.soloPickHint, style: T.b(14, color: C.ink2, weight: FontWeight.w700)),
        const SizedBox(height: 14),
        VStack(
          gap: 8,
          children: [
            for (final c in cases)
              Pressable(
                onTap: () => onPick(c),
                label: c.title,
                builder: (context, pressed) => Container(
                  constraints: const BoxConstraints(minHeight: 60),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: pressed ? K.paperSolved : K.paper,
                    border: Border.all(color: K.black, width: 2),
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(4),
                      topRight: Radius.circular(14),
                      bottomLeft: Radius.circular(14),
                      bottomRight: Radius.circular(14),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(placeOf(c.subtitle), style: KT.mono(12, color: K.brown)),
                      Text(c.title, style: KT.display(18, color: K.brown, height: 1.1)),
                      Text('${capitalizeTr(c.difficulty)} · ${TrCb.minutes(c.minutes)}', style: KT.body(11, color: K.brown)),
                    ],
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 12),
      ],
    ),
  );
}

/// Ekip kodu: yalnızca A–Z, büyük harf, 4 harf.
class _RoomCodeFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    final text = newValue.text.toUpperCase().replaceAll(RegExp('[^A-Z]'), '');
    final cut = text.length > 4 ? text.substring(0, 4) : text;
    return TextEditingValue(text: cut, selection: TextSelection.collapsed(offset: cut.length));
  }
}
