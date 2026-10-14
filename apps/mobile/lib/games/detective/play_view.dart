import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../session/storage.dart';
import '../../shared/models.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import '../kit/game_module.dart';
import '../kit/kit.dart';
import 'audio.dart';
import 'bits.dart';
import 'board.dart';
import 'cabinet.dart';
import 'desk.dart';
import 'final.dart';
import 'fixed.dart';
import 'interviews.dart';
import 'leads.dart';
import 'models.dart';
import 'notebook.dart';
import 'scene.dart';
import 'strings.dart';

/// games/detective/client/PlayView.tsx: vaka şeridi, masa (beş sekme), sahne, anlatıcı hapı, uyarı.
class DetectivePlayView extends StatefulWidget {
  const DetectivePlayView({super.key, required this.props});
  final PlayViewProps props;

  @override
  State<DetectivePlayView> createState() => _DetectivePlayViewState();
}

class _DetectivePlayViewState extends State<DetectivePlayView> {
  DtTab _tab = DtTab.cabinet;
  String? _selected;
  String? _personFilter;
  int? _replay;
  bool _browse = false;
  String? _error;
  Timer? _errTimer;
  String? _interview;
  late final DocStore _docs = DocStore(widget.props.act);
  Storage? _storage;
  bool _storageRead = false;

  // Görünüme bağlı yerel durumun anahtarları (web'deki useEffect bağımlılıkları).
  String? _seenKey;
  Set<String> _seen = {};
  Map<String, int> _ivSeen = {};
  String? _phase;
  String? _ivIds;
  ({String id, int seq})? _focusPerson;
  int _focusSeq = 0;
  int? _serverNow;
  int _offset = 0;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_storageRead) {
      _storageRead = true;
      try {
        _storage = context.read<Storage>();
      } on Object {
        _storage = null;
      }
    }
  }

  @override
  void dispose() {
    _errTimer?.cancel();
    _docs.dispose();
    // Masadan çıkınca (lobi, başka oyun) anlatı da sussun.
    NarrationController.instance.stop();
    super.dispose();
  }

  void _showError(String msg) {
    if (!mounted) return;
    setState(() => _error = msg);
    _errTimer?.cancel();
    _errTimer = Timer(const Duration(milliseconds: 5000), () {
      if (mounted) setState(() => _error = null);
    });
  }

  Future<Ack> _send(Json action) async {
    try {
      final res = await widget.props.act(action);
      if (!res.ok) _showError(res.error);
      return res;
    } on Object {
      _showError(SErrors.generic);
      return Ack.fail(SErrors.generic);
    }
  }

  void _scrollTop() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final pos = Scrollable.maybeOf(context)?.position;
      if (pos != null && pos.hasPixels) pos.jumpTo(0);
    });
  }

  void _markSeen(String id) {
    if (_seen.contains(id)) return;
    _seen = {..._seen, id};
    writeIdSet(_storage, 'dt-seen:$_seenKey', _seen);
  }

  bool get _final => _phase == 'accuse' || _phase == 'reconcile' || _phase == 'result';

  void _setTab(DtTab t) {
    setState(() => _tab = t);
    _scrollTop();
  }

  void _openEvidence(String id) {
    setState(() {
      _selected = id;
      _markSeen(id);
      if (_final) _browse = true;
      _tab = DtTab.cabinet;
    });
    _scrollTop();
  }

  void _showPerson(String id) {
    setState(() {
      if (_final) _browse = true;
      _tab = DtTab.board;
      _focusPerson = (id: id, seq: ++_focusSeq);
    });
  }

  void _openInterview(String id) {
    setState(() {
      _interview = id;
      if (_final) _browse = true;
      _tab = DtTab.interviews;
    });
    _scrollTop();
  }

  /// Sunucu yeniden başlarsa medya adresleri değişir: belge önbelleği (içindeki adreslerle) yenilenir.
  String _mediaScope(DetectiveView v) {
    String? sig = v.caseInfo.coverUrl;
    for (final c in v.characters) {
      sig ??= c.portraitUrl;
    }
    for (final l in v.locations) {
      sig ??= l.imageUrl;
    }
    if (v.acts.isNotEmpty) sig ??= v.acts.first.imageUrl ?? v.acts.first.narrationUrl;
    return '${v.sessionId}|${sig ?? ''}';
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.props;
    final view = DetectiveView.fromJson(p.view);
    final room = p.room;
    final meId = p.meId;
    final isHost = room.hostId == meId;

    // Belge önbelleği: başka soruşturma (ya da yeni medya adresleri) → boşalt.
    _docs.act = p.act;
    _docs.reset(_mediaScope(view));

    // Cihazda tutulanlar (`dt-seen`, `dt-ivseen`), soruşturma + oyuncu başına.
    final seenKey = '${view.sessionId}:$meId';
    if (seenKey != _seenKey) {
      _seenKey = seenKey;
      _seen = readIdSet(_storage, 'dt-seen:$seenKey');
      _ivSeen = readCountMap(_storage, 'dt-ivseen:$seenKey');
    }

    final isFinal = view.isFinal;
    // Aşama değişince inceleme modundan çık.
    if (_phase != view.phase) {
      _phase = view.phase;
      _browse = false;
    }

    // Açık sorgu yoksa ya da düştüyse en son açılanı seç.
    final ivIds = view.interviews.map((i) => i.id).join('|');
    if (ivIds != _ivIds) {
      _ivIds = ivIds;
      if (_interview == null || !view.interviews.any((i) => i.id == _interview)) {
        _interview = view.interviews.isNotEmpty ? view.interviews.last.id : null;
      }
    }

    // Seçili kanıt görünümden düştüyse temizle.
    if (_selected != null && !view.evidence.any((e) => e.id == _selected)) _selected = null;

    // Sorgu odası ekrandayken açık sorgunun tutanağı okunmuş sayılır.
    final ivVisible = _tab == DtTab.interviews && (!isFinal || _browse);
    InterviewView? curIv;
    for (final iv in view.interviews) {
      if (iv.id == _interview) curIv = iv;
    }
    if (ivVisible && curIv != null && _ivSeen[curIv.id] != curIv.transcript.length) {
      _ivSeen = {..._ivSeen, curIv.id: curIv.transcript.length};
      writeCountMap(_storage, 'dt-ivseen:$seenKey', _ivSeen);
    }

    final ivUnread = <String, ({int count, bool fresh})>{};
    for (final iv in view.interviews) {
      final read = _ivSeen[iv.id];
      final from = math.min(read ?? 0, iv.transcript.length);
      final count = iv.transcript.skip(from).where((e) => e.by != meId).length;
      ivUnread[iv.id] = (count: count, fresh: read == null);
    }

    // useMemo(() => view.serverNow - Date.now(), [view.serverNow])
    if (_serverNow != view.serverNow) {
      _serverNow = view.serverNow;
      _offset = view.serverNow - DateTime.now().millisecondsSinceEpoch;
    }

    final members = membersOf(room);
    final desk = Desk(
      view: view,
      room: room,
      meId: meId,
      isHost: isHost,
      send: _send,
      members: members,
      chars: {for (final c in view.characters) c.id: c},
      evidence: {for (final e in view.evidence) e.id: e},
      offset: _offset,
      selected: _selected,
      openEvidence: _openEvidence,
      showPerson: _showPerson,
      personFilter: _personFilter,
      setPersonFilter: (id) => setState(() => _personFilter = id),
      seen: _seen,
      docs: _docs,
      setTab: _setTab,
      interview: _interview,
      openInterview: _openInterview,
      ivUnread: ivUnread,
      replayAct: (i) => setState(() => _replay = i),
      readOnly: view.phase == 'result',
      storage: _storage,
      focusPerson: _focusPerson,
    );

    final newCount = view.evidence.where((e) => !_seen.contains(e.id)).length;
    var ivCount = 0;
    var ivFresh = false;
    for (final e in ivUnread.entries) {
      if (e.key == _interview && ivVisible) continue;
      ivCount += e.value.count;
      if (e.value.fresh) ivFresh = true;
    }

    final g = Layout.gutter(context);
    final pos = Scrollable.maybeOf(context)?.position;
    final vh = pos != null && pos.hasViewportDimension ? pos.viewportDimension : viewportHeight(context);
    if (pos != null && !pos.hasViewportDimension) {
      // İlk karede görünen yükseklik henüz ölçülmedi: ölçülünce yeniden çiz (min-height: 100dvh).
      WidgetsBinding.instance.addPostFrameCallback((_) => mounted && pos.hasViewportDimension ? setState(() {}) : null);
    }
    final safeBottom = MediaQuery.paddingOf(context).bottom;
    final showDesk = !isFinal || _browse;
    final double tabsHeight = 3 + 8 + 52 + math.max(14.0, safeBottom);

    final Widget body;
    if (!showDesk) {
      body = switch (view.phase) {
        'accuse' => AccuseScreen(onBrowse: () => setState(() => _browse = true)),
        'reconcile' => ReconcileScreen(onBrowse: () => setState(() => _browse = true)),
        _ => const ResultScreen(),
      };
    } else {
      body = Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (isFinal) _Banner(phase: view.phase, onBack: () => setState(() => _browse = false)),
          Padding(padding: const EdgeInsets.only(top: 16), child: _pane()),
        ],
      );
    }

    final online = room.players.where((x) => x.connected).length;

    return DeskScope(
      desk: desk,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          // .dt::before: masa zemini görünen alanın tamamını kaplar.
          Positioned.fill(
            child: ViewportLayer(position: pos, fallbackHeight: vh, hitTestable: false, child: const ColoredBox(color: C.ink2)),
          ),
          ConstrainedBox(
            constraints: BoxConstraints(minHeight: vh),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 72),
                _Top(view: view, roomCode: room.code, online: online),
                Padding(padding: EdgeInsets.symmetric(horizontal: g), child: body),
                if (showDesk) SizedBox(height: 24 + tabsHeight),
              ],
            ),
          ),
          if (showDesk)
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: StickyBottom(
                position: pos,
                child: _Tabs(
                  tab: _tab,
                  onTab: _setTab,
                  newCount: newCount,
                  ivCount: ivCount,
                  ivFresh: ivFresh,
                  proposal: view.proposal != null,
                  bottom: math.max(14.0, safeBottom),
                ),
              ),
            ),
          Positioned.fill(
            child: ViewportLayer(
              position: pos,
              fallbackHeight: vh,
              child: Stack(
                children: [
                  Positioned(
                    left: 16,
                    right: 16,
                    bottom: 92 + safeBottom,
                    child: Center(child: NarrationPill(hidden: view.phase == 'scene' || _replay != null)),
                  ),
                  if (view.phase == 'scene') const Positioned.fill(child: SceneOverlay()),
                  if (_replay != null && view.phase != 'scene')
                    Positioned.fill(child: SceneOverlay(key: ValueKey('replay-$_replay'), replay: _replay, onClose: () => setState(() => _replay = null))),
                  if (_error != null)
                    Positioned(
                      left: g,
                      right: g,
                      bottom: math.max(88.0, safeBottom + 80),
                      child: Center(child: _Toast(text: _error!)),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Telefonda aynı anda tek bölme (`.dt-desk[data-tab]`). Web'de gizli bölmeler `display: none` ile
  /// sayfada kalır (defterin kaydı, filtreler, açık kartlar sürer); burada da kurulu kalırlar.
  Widget _pane() {
    Widget pane(DtTab t, Widget child) => Visibility(visible: _tab == t, maintainState: true, child: child);
    // Boş `<span id="dt-*-anchor">` da bir ızgara öğesidir: bölmede içerikten önce 12px boşluk bırakır.
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        pane(DtTab.board, const Board()),
        pane(
          DtTab.cabinet,
          Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [const SizedBox(height: 12), Cabinet(onClose: () => setState(() => _selected = null))],
          ),
        ),
        pane(DtTab.interviews, const Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [SizedBox(height: 12), InterviewsPane()])),
        pane(DtTab.leads, const Leads()),
        pane(DtTab.notes, const Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [Notebook(), SizedBox(height: 12), LogList()])),
      ],
    );
  }
}

/// `.dt-top`: kâğıt renginde vaka şeridi, GİZLİ damgalı.
class _Top extends StatelessWidget {
  const _Top({required this.view, required this.roomCode, required this.online});
  final DetectiveView view;
  final String roomCode;
  final int online;

  @override
  Widget build(BuildContext context) {
    final genre = view.caseInfo.genre.isNotEmpty ? capitalize(view.caseInfo.genre) : '';
    // Yer: alt başlığın tarihten önceki kısmı ("Uludağ, Bursa — Aralık 2025")
    final place = view.caseInfo.subtitle.split(RegExp(r'\s+[—–-]\s+')).first.trim();
    final sub = view.phase == 'investigate' || view.phase == 'scene'
        ? '${STop.act(view.act.index, view.act.total)}: ${view.act.title}'
        : (STop.phase[view.phase] ?? '');
    final b = T.b(13, color: DtC.brown, weight: FontWeight.w800);
    Widget chip(Widget child, {bool online = false}) => Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: online ? DtC.brown : null,
        border: Border.all(color: DtC.brown, width: 2),
        borderRadius: BorderRadius.circular(R.pill),
      ),
      child: child,
    );
    final chipText = T.b(11, color: DtC.brown, weight: FontWeight.w800);

    return Container(
      padding: const EdgeInsets.fromLTRB(18, 16, 18, 12),
      decoration: const BoxDecoration(
        color: DtC.cream,
        border: Border(top: BorderSide(color: C.ink, width: 3), bottom: BorderSide(color: C.ink, width: 3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Text(view.caseInfo.title, style: T.d(24, color: DtC.brown), maxLines: 1, softWrap: false, overflow: TextOverflow.ellipsis),
                ),
              ),
              const SizedBox(width: 10),
              Semantics(
                label: '${STop.code}: $roomCode',
                child: ExcludeSemantics(
                  child: Opacity(
                    opacity: 0.75,
                    child: Text(roomCode, style: T.b(11, color: DtC.brown, weight: FontWeight.w800, letterSpacing: 11 * 0.15)),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              ExcludeSemantics(
                child: Transform.rotate(
                  angle: deg(6),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                    decoration: BoxDecoration(border: Border.all(color: DtC.red, width: 3), borderRadius: BorderRadius.circular(6)),
                    child: Text(STop.secret, style: T.b(11, color: DtC.red, weight: FontWeight.w800, letterSpacing: 2)),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(child: Text(sub, style: b, maxLines: 1, softWrap: false, overflow: TextOverflow.ellipsis)),
              const SizedBox(width: 10),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(color: DtC.brown, borderRadius: BorderRadius.circular(6)),
                child: Text(SLeads.hoursOf(view.hours.spent, view.hours.budget), style: T.b(13, color: DtC.cream, weight: FontWeight.w800)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              chip(
                online: true,
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(width: 7, height: 7, decoration: const BoxDecoration(color: C.mint, shape: BoxShape.circle)),
                    const SizedBox(width: 4),
                    Text(STop.online(online), style: chipText.copyWith(color: DtC.cream)),
                  ],
                ),
              ),
              if (genre.isNotEmpty) chip(Text(genre, style: chipText)),
              if (place.isNotEmpty) chip(Text(place, style: chipText)),
            ],
          ),
        ],
      ),
    );
  }
}

/// `.dt-banner`: suçlama/sonuç sırasında dosyaya göz atılırken.
class _Banner extends StatelessWidget {
  const _Banner({required this.phase, required this.onBack});
  final String phase;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) => Semantics(
    liveRegion: true,
    child: Container(
      margin: const EdgeInsets.only(top: 16),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(color: C.yellow, border: Border.all(color: C.ink, width: 3), borderRadius: BorderRadius.circular(16), boxShadow: Shadows.md),
      child: Wrap(
        alignment: WrapAlignment.spaceBetween,
        crossAxisAlignment: WrapCrossAlignment.center,
        spacing: 16,
        runSpacing: 10,
        children: [
          Text(SAccuse.browsing, style: T.b(13, color: C.ink2, weight: FontWeight.w800)),
          SButton(label: phase == 'result' ? SResult.stamp : SAccuse.backToForm, tone: BtnTone.primary, onPressed: onBack),
        ],
      ),
    ),
  );
}

/// `.dt-tabs`: alt sekme çubuğu.
class _Tabs extends StatelessWidget {
  const _Tabs({required this.tab, required this.onTab, required this.newCount, required this.ivCount, required this.ivFresh, required this.proposal, required this.bottom});
  final DtTab tab;
  final void Function(DtTab) onTab;
  final int newCount;
  final int ivCount;
  final bool ivFresh;
  final bool proposal;
  final double bottom;

  static const _labels = {
    DtTab.board: STabs.board,
    DtTab.cabinet: STabs.cabinet,
    DtTab.interviews: STabs.interviews,
    DtTab.leads: STabs.leads,
    DtTab.notes: STabs.notes,
  };

  @override
  Widget build(BuildContext context) {
    Widget item(DtTab t) {
      final current = tab == t;
      Widget? badge;
      if (!current && t == DtTab.cabinet && newCount > 0) {
        badge = Positioned(top: 2, right: 4, child: TabBadge(newCount));
      } else if (!current && t == DtTab.interviews) {
        if (ivCount > 0) {
          badge = Positioned(top: 2, right: 4, child: TabBadge(ivCount));
        } else if (ivFresh) {
          badge = const Positioned(top: 6, right: 8, child: TabDot());
        }
      } else if (!current && t == DtTab.leads && proposal) {
        badge = const Positioned(top: 2, right: 4, child: TabBadge(1));
      }
      return Expanded(
        child: Pressable(
          onTap: () => onTab(t),
          label: _labels[t],
          selected: current,
          builder: (context, _) => Container(
            height: 52,
            padding: const EdgeInsets.symmetric(horizontal: 2),
            decoration: BoxDecoration(
              color: current ? C.sky : Colors.transparent,
              border: Border.all(color: current ? C.ink : Colors.transparent, width: 2),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Stack(
              clipBehavior: Clip.none,
              fit: StackFit.expand,
              children: [
                Center(
                  child: Text(
                    _labels[t]!,
                    style: T.b(12, color: current ? C.ink2 : C.text3, weight: FontWeight.w800),
                    maxLines: 1,
                    softWrap: false,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                // Rozet: CSS'te dolgu kutusuna göre (top 2, right 6); burada 2px yatay dolgunun içi.
                ?badge,
              ],
            ),
          ),
        ),
      );
    }

    return Container(
      padding: EdgeInsets.fromLTRB(8, 8, 8, bottom),
      decoration: const BoxDecoration(color: DtC.nav, border: Border(top: BorderSide(color: C.ink, width: 3))),
      child: Row(
        children: [
          for (final t in DtTab.values) ...[if (t != DtTab.board) const SizedBox(width: 4), item(t)],
        ],
      ),
    );
  }
}

/// `.toast.dt-toast`
class _Toast extends StatelessWidget {
  const _Toast({required this.text});
  final String text;
  @override
  Widget build(BuildContext context) => Semantics(
    liveRegion: true,
    child: ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 440),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
        decoration: BoxDecoration(color: C.yellow, border: Border.all(color: C.ink, width: bw), borderRadius: BorderRadius.circular(R.md), boxShadow: Shadows.md),
        child: Text(text, style: T.b(15, color: C.ink2, weight: FontWeight.w800)),
      ),
    ),
  );
}
