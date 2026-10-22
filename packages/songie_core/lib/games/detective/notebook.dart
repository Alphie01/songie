import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import 'bits.dart';
import 'desk.dart';
import 'models.dart';
import 'strings.dart';

const _debounce = Duration(milliseconds: 800);

/// Notebook.tsx: ortak not defteri. Yazarken 800 ms sonra `{ text, base }` gönderilir; `base` son bilinen
/// sunucu sürümüdür. Başkası araya girerse sunucu hata döner: son sürüm yüklenir, kaydedilmeyen metin ayrıca gösterilir.
class Notebook extends StatefulWidget {
  const Notebook({super.key});

  @override
  State<Notebook> createState() => _NotebookState();
}

class _NotebookState extends State<Notebook> {
  final _text = TextEditingController();
  final _focus = FocusNode();
  final _lostText = TextEditingController();

  /// idle | dirty | saving
  String _state = 'idle';
  String? _lost;
  int _base = 0;
  bool _dirty = false;
  String? _inflight;
  Timer? _timer;
  late Desk _desk;
  ({int version, String text, String? by})? _seenNb;

  @override
  void initState() {
    super.initState();
    _focus.addListener(() => setState(() {}));
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _desk = Desk.of(context);
    _syncFromServer();
  }

  /// Sunucudan gelen sürüm (web'deki useEffect [nb.version, nb.text, nb.by, meId]).
  void _syncFromServer() {
    final nb = _desk.view.notebook;
    final key = (version: nb.version, text: nb.text, by: nb.by);
    if (_seenNb == key) return;
    _seenNb = key;
    if (_inflight != null && nb.by == _desk.meId && nb.text == _inflight) {
      _base = nb.version;
      _inflight = null;
      if (_text.text == nb.text) {
        _dirty = false;
        _state = 'idle';
      }
      return;
    }
    if (!_dirty && _inflight == null) {
      _base = nb.version;
      if (_text.text != nb.text) _text.text = nb.text;
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _text.dispose();
    _lostText.dispose();
    _focus.dispose();
    super.dispose();
  }

  void _schedule() {
    _timer?.cancel();
    _timer = Timer(_debounce, () => unawaited(_flush()));
  }

  Future<void> _flush() async {
    _timer = null;
    if (_inflight != null) {
      _schedule();
      return;
    }
    final sending = _text.text;
    _inflight = sending;
    setState(() => _state = 'saving');
    final res = await _desk.send({'type': 'notebook', 'text': sending, 'base': _base});
    if (!mounted) return;
    if (!res.ok) {
      _inflight = null;
      _dirty = false;
      // En güncel sunucu metni
      final nb = _desk.view.notebook;
      _base = nb.version;
      _text.text = nb.text;
      _lostText.text = sending;
      setState(() {
        _lost = sending;
        _state = 'idle';
      });
      return;
    }
    final v = res['version'];
    if (v is num) {
      _base = v.toInt();
      _inflight = null;
      if (_text.text == sending) {
        _dirty = false;
        setState(() => _state = 'idle');
      } else {
        _schedule();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final d = Desk.of(context);
    final nb = d.view.notebook;
    final status = _state == 'saving'
        ? SNotebook.saving
        : _state == 'dirty'
        ? ''
        : (nb.by != null ? SNotebook.lastBy(d.nick(nb.by), ago(nb.at - d.offset)) : '');
    const radius = BorderRadius.only(topLeft: Radius.circular(6), topRight: Radius.circular(20), bottomLeft: Radius.circular(20), bottomRight: Radius.circular(20));
    final style = T.b(15, color: DtC.brown, weight: FontWeight.w600, height: 1.55);

    final field = Container(
      constraints: const BoxConstraints(minHeight: 300),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: DtC.cream, border: Border.all(color: C.ink, width: 3), borderRadius: radius, boxShadow: hardShadow(5, 5)),
      child: TextField(
        controller: _text,
        focusNode: _focus,
        readOnly: d.readOnly,
        maxLength: notebookMax,
        maxLengthEnforcement: MaxLengthEnforcement.enforced,
        keyboardType: TextInputType.multiline,
        maxLines: null,
        minLines: 1,
        autocorrect: false,
        cursorColor: DtC.brown,
        style: style,
        decoration: InputDecoration(
          isCollapsed: true,
          border: InputBorder.none,
          counterText: '',
          hintText: SNotebook.placeholder,
          hintMaxLines: 6,
          hintStyle: style.copyWith(color: const Color(0x8C2B2116)),
        ),
        onChanged: (_) {
          _dirty = true;
          setState(() => _state = 'dirty');
          _schedule();
        },
      ),
    );

    return VStack(
      gap: 8,
      children: [
        Wrap(
          alignment: WrapAlignment.spaceBetween,
          crossAxisAlignment: WrapCrossAlignment.end,
          spacing: 10,
          runSpacing: 4,
          children: [
            const DtLabel(SNotebook.title),
            Semantics(liveRegion: true, child: Text(status, style: T.b(12, color: C.text3, weight: FontWeight.w700))),
          ],
        ),
        // `.dt :focus-visible`: 3px sarı halka, 2px boşluk
        Stack(
          clipBehavior: Clip.none,
          children: [
            field,
            if (_focus.hasFocus)
              Positioned(
                left: -5,
                top: -5,
                right: -5,
                bottom: -5,
                child: IgnorePointer(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      border: Border.all(color: C.yellow, width: 3),
                      borderRadius: const BorderRadius.only(topLeft: Radius.circular(11), topRight: Radius.circular(25), bottomLeft: Radius.circular(25), bottomRight: Radius.circular(25)),
                    ),
                  ),
                ),
              ),
          ],
        ),
        ListenableBuilder(
          listenable: _text,
          builder: (context, _) => Text(SNotebook.chars(_text.text.length, notebookMax), textAlign: TextAlign.right, style: T.b(11, color: C.text3, weight: FontWeight.w700)),
        ),
        if (_lost != null)
          Semantics(
            liveRegion: true,
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: C.coral, border: Border.all(color: C.ink, width: 3), borderRadius: BorderRadius.circular(16)),
              child: VStack(
                gap: 8,
                children: [
                  Text(SNotebook.conflict, style: dtSmall(C.ink2)),
                  Container(
                    constraints: const BoxConstraints(minHeight: 90),
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(color: C.paper, border: Border.all(color: C.ink, width: 2), borderRadius: BorderRadius.circular(12)),
                    child: Semantics(
                      label: SNotebook.lost,
                      child: TextField(
                        controller: _lostText,
                        readOnly: true,
                        maxLines: null,
                        style: T.b(16, color: C.ink2, weight: FontWeight.w600),
                        decoration: const InputDecoration(isCollapsed: true, border: InputBorder.none),
                      ),
                    ),
                  ),
                  Align(alignment: Alignment.centerLeft, child: SGhostButton(label: SNotebook.dismiss, onPressed: () => setState(() => _lost = null))),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

/// Notebook.tsx `Log`: olay akışı (son 40, yeniden eskiye).
class LogList extends StatelessWidget {
  const LogList({super.key});

  @override
  Widget build(BuildContext context) {
    final d = Desk.of(context);
    final items = d.view.log.reversed.take(40).toList();
    return VStack(
      gap: 10,
      children: [
        const DtLabel(SLog.title),
        if (items.isEmpty)
          const DtEmpty(SLog.empty)
        else
          VStack(
            gap: 6,
            children: [
              for (final l in items)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  decoration: BoxDecoration(color: DtC.card, borderRadius: BorderRadius.circular(12)),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      ConstrainedBox(
                        constraints: const BoxConstraints(minWidth: 64),
                        child: Text(ago(l.at - d.offset), style: T.b(11, color: C.sky, weight: FontWeight.w800, height: 1.4)),
                      ),
                      const SizedBox(width: 10),
                      Expanded(child: Text(l.text, style: T.b(13, color: C.text, weight: FontWeight.w600, height: 1.4))),
                    ],
                  ),
                ),
            ],
          ),
      ],
    );
  }
}
