// games/song-guess/client/GuessBox.tsx (+ song.css `.guess*`).
import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../session/api.dart';
import '../../shared/models.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import 'models.dart';
import 'strings.dart';

/// Öneri satırlarının ayırıcı çizgisi (`--song-row-line`).
const _rowLine = Color(0xFFEEE8FF);

class SgGuessBox extends StatefulWidget {
  const SgGuessBox({super.key, required this.api, required this.disabled, required this.placeholder, this.pools, required this.onPick});
  final GameApi api;
  final bool disabled;
  final String placeholder;

  /// Kolay arama açıksa öneriler yalnızca bu listelerden gelir.
  final List<String>? pools;
  final Future<void> Function(SearchHit hit) onPick;

  @override
  State<SgGuessBox> createState() => _SgGuessBoxState();
}

class _SgGuessBoxState extends State<SgGuessBox> {
  final _q = TextEditingController();
  final _focus = FocusNode();
  final _link = LayerLink();
  final _portal = OverlayPortalController();
  final _boxKey = GlobalKey();
  List<SearchHit> _hits = const [];
  int _active = 0;
  bool _loading = false;
  bool _open = false;
  bool _focused = false;
  int _seq = 0;
  Timer? _debounce;
  Timer? _blur;

  /// Kilitlenirken odak kutudaysa, kilit açılınca odak geri verilir.
  bool _refocus = false;

  // Görünüm her güncellendiğinde dizi yeniden oluşur; aramayı yalnızca içerik değişince tekrarla.
  String get _scopeKey => widget.pools?.join(',') ?? '';

  @override
  void initState() {
    super.initState();
    _focus.addListener(_onFocus);
    // Öneri listesi her zaman katmanda durur; kapalıyken boş çizilir.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _portal.show();
    });
  }

  @override
  void didUpdateWidget(SgGuessBox old) {
    super.didUpdateWidget(old);
    if ((old.pools?.join(',') ?? '') != _scopeKey) _search();
    if (!old.disabled && widget.disabled) {
      _refocus = _focus.hasFocus;
    } else if (old.disabled && !widget.disabled) {
      // Kilit açılınca odağı geri ver.
      if (_refocus) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted && !widget.disabled) _focus.requestFocus();
        });
      }
      _refocus = false;
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _blur?.cancel();
    _focus.removeListener(_onFocus);
    _focus.dispose();
    _q.dispose();
    super.dispose();
  }

  void _onFocus() {
    if (!mounted) return;
    final has = _focus.hasFocus;
    setState(() {
      _focused = has;
      if (has) _open = true;
    });
    if (!has) {
      _blur?.cancel();
      _blur = Timer(const Duration(milliseconds: 150), () {
        if (mounted && !_focus.hasFocus) setState(() => _open = false);
      });
    }
  }

  /// Web'deki `[q, api, scopeKey]` effect'i: 2 harften kısaysa temizler, değilse 200ms sonra arar.
  void _search() {
    _debounce?.cancel();
    final query = _q.text.trim();
    if (query.length < 2) {
      setState(() {
        _hits = const [];
        _loading = false;
      });
      return;
    }
    final mine = ++_seq;
    setState(() => _loading = true);
    final scope = _scopeKey;
    _debounce = Timer(const Duration(milliseconds: 200), () async {
      try {
        final res = await widget.api.get('/search?q=${Uri.encodeComponent(query)}${scope.isNotEmpty ? '&pools=${Uri.encodeComponent(scope)}' : ''}');
        if (mine == _seq && mounted) {
          setState(() {
            _hits = res.objs('hits').map(SearchHit.fromJson).toList();
            _active = 0;
          });
        }
      } on Object {
        if (mine == _seq && mounted) setState(() => _hits = const []);
      } finally {
        if (mine == _seq && mounted) setState(() => _loading = false);
      }
    });
  }

  Future<void> _pick(SearchHit hit) async {
    setState(() => _open = false);
    _q.clear();
    _search();
    setState(() => _hits = const []);
    await widget.onPick(hit);
  }

  bool get _showList => _open && _q.text.trim().length >= 2 && !widget.disabled;

  Widget _list(BuildContext context) {
    if (!_showList) return const SizedBox.shrink();
    final box = _boxKey.currentContext?.findRenderObject();
    final width = box is RenderBox && box.hasSize ? box.size.width : 0.0;
    if (width <= 0) return const SizedBox.shrink();
    final maxHeight = math.min(320.0, MediaQuery.sizeOf(context).height * 0.45);
    final Widget content;
    if (_hits.isEmpty) {
      content = Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        child: Text(_loading ? SPlay.searching : SPlay.noHits, style: T.b(15, color: C.inkSoft, weight: FontWeight.w700)),
      );
    } else {
      content = SingleChildScrollView(
        padding: EdgeInsets.zero,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (var i = 0; i < _hits.length; i++)
              Pressable(
                onTap: () => _pick(_hits[i]),
                label: '${_hits[i].artist} – ${_hits[i].title}',
                selected: i == _active,
                builder: (context, pressed) => Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: i == _active || pressed ? C.cream : null,
                    border: i < _hits.length - 1 ? const Border(bottom: BorderSide(color: _rowLine, width: 2)) : null,
                  ),
                  child: Text(
                    '${_hits[i].artist} – ${_hits[i].title}',
                    maxLines: 1,
                    softWrap: false,
                    overflow: TextOverflow.ellipsis,
                    style: T.b(15, color: C.ink2, weight: FontWeight.w800),
                  ),
                ),
              ),
          ],
        ),
      );
    }
    // `.guess-list`: kutunun 64px yukarısından açılır (klavye altta kalır).
    return Align(
      alignment: Alignment.topLeft,
      child: CompositedTransformFollower(
        link: _link,
        showWhenUnlinked: false,
        targetAnchor: Alignment.bottomLeft,
        followerAnchor: Alignment.bottomLeft,
        offset: const Offset(0, -64),
        child: Semantics(
          label: SPlay.guessLabel,
          child: Container(
            width: width,
            constraints: BoxConstraints(maxHeight: maxHeight),
            decoration: BoxDecoration(
              color: C.paper,
              border: Border.all(color: C.ink, width: bw),
              borderRadius: BorderRadius.circular(16),
              boxShadow: hardShadow(0, 6),
            ),
            child: ClipRRect(borderRadius: BorderRadius.circular(16 - bw), child: content),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final style = TextStyle(fontFamily: T.display, fontWeight: FontWeight.w700, fontSize: 19, color: C.ink2, height: 1.2);
    final enabled = !widget.disabled;
    return OverlayPortal(
      controller: _portal,
      overlayChildBuilder: _list,
      child: CompositedTransformTarget(
        link: _link,
        child: Opacity(
          opacity: enabled ? 1 : 0.6,
          child: FocusRing(
            focused: _focused && enabled,
            radius: 18,
            child: Container(
              key: _boxKey,
              constraints: const BoxConstraints(minHeight: 58),
              alignment: Alignment.centerLeft,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(color: C.paper, border: Border.all(color: C.ink, width: bw), borderRadius: BorderRadius.circular(18)),
              child: Semantics(
                label: SPlay.guessLabel,
                child: TextField(
                  controller: _q,
                  focusNode: _focus,
                  enabled: enabled,
                  autocorrect: false,
                  enableSuggestions: false,
                  smartDashesType: SmartDashesType.disabled,
                  smartQuotesType: SmartQuotesType.disabled,
                  textCapitalization: TextCapitalization.none,
                  keyboardType: TextInputType.text,
                  textInputAction: TextInputAction.send,
                  maxLines: 1,
                  cursorColor: C.ink2,
                  style: style,
                  onChanged: (_) {
                    setState(() => _open = true);
                    _search();
                  },
                  // Enter: öneri varsa seçili olanı gönder; odak kutuda kalır (web: preventDefault).
                  onEditingComplete: () {},
                  onSubmitted: (_) {
                    if (_hits.isEmpty) return;
                    final i = _active.clamp(0, _hits.length - 1);
                    _pick(_hits[i]);
                  },
                  decoration: InputDecoration(
                    isCollapsed: true,
                    border: InputBorder.none,
                    // Yer tutucu tek satır, sığmayan kısmı kesilir (web'deki input gibi).
                    hint: Text(widget.placeholder, maxLines: 1, softWrap: false, overflow: TextOverflow.clip, style: style.copyWith(color: C.placeholder)),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
