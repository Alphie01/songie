import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../shared/models.dart';
import '../../ui/tokens.dart';
import '../../ui/widgets.dart';
import 'common.dart';
import 'models.dart';
import 'strings.dart';

/// `.cf-write`: konu, yapışkan not üzerine itiraf, yazanlar, oda sahibinin "Yazmayı bitir"i.
class CfWrite extends StatefulWidget {
  const CfWrite({super.key, required this.view, required this.meId, required this.isHost, required this.members, required this.send});
  final ConfessionsView view;
  final String meId;
  final bool isHost;
  final Map<String, RoomPlayer> members;
  final Future<bool> Function(Json action) send;

  @override
  State<CfWrite> createState() => _CfWriteState();
}

class _CfWriteState extends State<CfWrite> {
  late final TextEditingController _text = TextEditingController(text: widget.view.myConfession ?? '');
  final _focus = FocusNode();
  bool _focused = false;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _text.addListener(() => setState(() {}));
    _focus.addListener(() => setState(() => _focused = _focus.hasFocus));
  }

  @override
  void didUpdateWidget(CfWrite old) {
    super.didUpdateWidget(old);
    // Yeni turda (itiraf yoksa) kutu boşalır.
    if (old.view.round != widget.view.round && widget.view.myConfession == null) _text.clear();
  }

  @override
  void dispose() {
    _text.dispose();
    _focus.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _busy = true);
    await widget.send({'type': 'write', 'text': _text.text});
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    final v = widget.view;
    final len = _text.text.trim().length;
    final sent = v.myConfession != null;
    final dirty = _text.text.trim() != (v.myConfession ?? '');
    final canSend = !(_busy || len < confessionMin || (sent && !dirty));
    final players = widget.members.values.toList();
    final online = players.where((p) => p.connected).length;
    final style = const TextStyle(
      fontFamily: T.display,
      fontWeight: FontWeight.w700,
      fontSize: 20,
      height: 1.25,
      color: noteInk,
      leadingDistribution: TextLeadingDistribution.even,
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: gapped(12, [
        BoxTitle(v.topic != null ? SPlay.topicLabel : SPlay.freeTopic),
        Text(v.topic?.text ?? SPlay.freeTopicHint, style: T.d(32, color: C.text, height: 1.05)),
        // `.cf-form`
        VStack(
          gap: 12,
          children: [
            // `.cf-note-wrap`: −1° eğik sarı not; sayaç sağ altta (eğilmez).
            Stack(
              children: [
                Transform.rotate(
                  angle: deg(-1),
                  child: Container(
                    height: 170,
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 30),
                    decoration: BoxDecoration(
                      color: noteColor,
                      border: Border.all(color: C.ink, width: bw),
                      borderRadius: BorderRadius.circular(6),
                      boxShadow: [
                        if (_focused) const BoxShadow(color: C.yellow, spreadRadius: 3),
                        ...hardShadow(6, 6),
                      ],
                    ),
                    child: Semantics(
                      label: SPlay.placeholder,
                      child: TextField(
                        controller: _text,
                        focusNode: _focus,
                        expands: true,
                        minLines: null,
                        maxLines: null,
                        maxLength: confessionMax,
                        maxLengthEnforcement: MaxLengthEnforcement.enforced,
                        textAlignVertical: TextAlignVertical.top,
                        keyboardType: TextInputType.multiline,
                        textCapitalization: TextCapitalization.sentences,
                        cursorColor: noteInk,
                        style: style,
                        decoration: InputDecoration(
                          isCollapsed: true,
                          border: InputBorder.none,
                          counterText: '',
                          hintText: SPlay.placeholder,
                          hintMaxLines: 4,
                          hintStyle: style.copyWith(color: noteInk.withValues(alpha: 0.55)),
                        ),
                      ),
                    ),
                  ),
                ),
                Positioned(
                  right: 12,
                  bottom: 10,
                  child: IgnorePointer(
                    child: Text(
                      '$len/$confessionMax',
                      style: T.b(12, color: len > 0 && len < confessionMin ? const Color(0xFFB3261E) : noteInk, weight: FontWeight.w800),
                    ),
                  ),
                ),
              ],
            ),
            CfBig(label: sent ? SPlay.update : SPlay.send, onTap: canSend ? _submit : null),
          ],
        ),
        Text(
          sent ? SPlay.sent : (v.hiddenAuthor ? SPlay.privacyHidden : SPlay.privacy),
          style: T.b(13, color: C.text3, weight: FontWeight.w700),
        ),
        // `.cf-box`: yazanlar
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: C.panel2,
            border: Border.all(color: C.ink, width: 2),
            borderRadius: BorderRadius.circular(R.md),
          ),
          child: VStack(
            gap: 6,
            children: [
              BoxTitle('${SPlay.wroteTitle} ${v.written.length}/$online'),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  for (final p in players)
                    Builder(
                      builder: (context) {
                        final done = v.written.contains(p.id);
                        return Opacity(
                          opacity: p.connected ? 1 : 0.6,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                            decoration: BoxDecoration(
                              color: done ? C.mint : null,
                              border: Border.all(color: done ? C.mint : C.violet, width: 2),
                              borderRadius: BorderRadius.circular(R.pill),
                            ),
                            child: Text(
                              '${p.nick} ${done ? '✓ ${SPlay.wrote}' : SPlay.waiting}',
                              style: T.b(13, color: done ? C.ink2 : C.text, weight: FontWeight.w800),
                            ),
                          ),
                        );
                      },
                    ),
                ],
              ),
            ],
          ),
        ),
        if (widget.isHost && v.written.isNotEmpty)
          HostBox(
            buttons: [
              SGhostButton(label: SPlay.closeWriting, onPressed: () => widget.send({'type': 'next'})),
            ],
            hint: SPlay.closeWritingHint,
          ),
      ]),
    );
  }
}
