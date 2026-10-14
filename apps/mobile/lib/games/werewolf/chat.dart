part of 'play_view.dart';

/// `Chat`: kurtların gizli sohbeti ya da hayaletler kanalı. Yeni mesajda liste en alta kayar.
class _Chat extends StatefulWidget {
  const _Chat({required this.g, required this.title, required this.hint, required this.ghost, required this.messages, required this.onSend});
  final _G g;
  final String title;
  final String hint;

  /// Hayaletler: kesikli çerçeve; kurtlar: kırmızı başlık.
  final bool ghost;
  final List<ChatMsg> messages;
  final Future<bool> Function(String text) onSend;

  @override
  State<_Chat> createState() => _ChatState();
}

class _ChatState extends State<_Chat> {
  final _text = TextEditingController();
  final _scroll = ScrollController();

  @override
  void initState() {
    super.initState();
    _text.addListener(_onText);
    _toBottom();
  }

  void _onText() => setState(() {});

  @override
  void didUpdateWidget(_Chat old) {
    super.didUpdateWidget(old);
    if (old.messages.length != widget.messages.length) _toBottom();
  }

  void _toBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && _scroll.hasClients) _scroll.jumpTo(_scroll.position.maxScrollExtent);
    });
  }

  @override
  void dispose() {
    _text.removeListener(_onText);
    _text.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final t = _text.text.trim();
    if (t.isEmpty) return;
    if (await widget.onSend(t) && mounted) _text.clear();
  }

  @override
  Widget build(BuildContext context) {
    final g = widget.g;
    final pal = g.pal;
    final body = T.b(14, color: C.text, weight: FontWeight.w700);
    final head = Text.rich(
      TextSpan(children: [TextSpan(text: trUpper(widget.title)), TextSpan(text: ' · ${widget.hint}')]),
      style: _labelStyle(pal, color: widget.ghost ? pal.dim : C.red),
    );
    final list = ConstrainedBox(
      constraints: const BoxConstraints(maxHeight: 160),
      child: SingleChildScrollView(
        controller: _scroll,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: _gapCol(4, [
            if (widget.messages.isEmpty) Text(SPlay.chatEmpty, style: body.copyWith(color: C.text3)),
            for (final m in widget.messages)
              Text.rich(
                TextSpan(
                  children: [
                    TextSpan(
                      text: '${g.plainNick(m.from)}:',
                      style: TextStyle(fontWeight: FontWeight.w800, color: m.from == g.meId ? pal.ring : null),
                    ),
                    TextSpan(text: ' ${m.text}'),
                  ],
                ),
                style: body,
              ),
          ]),
        ),
      ),
    );
    final form = Row(
      children: [
        Expanded(
          child: SInput(
            controller: _text,
            placeholder: SPlay.chatPlaceholder,
            label: SPlay.chatPlaceholder,
            maxLength: chatMax,
            minHeight: 44,
            fontSize: 16,
            textInputAction: TextInputAction.send,
            onSubmitted: (_) => _submit(),
          ),
        ),
        const SizedBox(width: 6),
        SButton(label: SPlay.send, tone: BtnTone.outline, minHeight: 44, fontSize: 15, onPressed: _text.text.trim().isEmpty ? null : _submit),
      ],
    );
    final content = Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: _gapCol(6, [head, list, form]));
    const padding = EdgeInsets.symmetric(horizontal: 12, vertical: 10);
    if (widget.ghost) {
      return _Dashed(color: pal.soft, radius: 14, width: 2, padding: padding, background: pal.card, child: content);
    }
    return Container(
      padding: padding,
      decoration: BoxDecoration(color: pal.card, border: Border.all(color: pal.soft, width: 2), borderRadius: BorderRadius.circular(14)),
      child: content,
    );
  }
}

/// `Ghosts`: hayaletler kanalı + (ayar açıksa) gece olanlar.
class _Ghosts extends StatelessWidget {
  const _Ghosts({required this.g});
  final _G g;

  @override
  Widget build(BuildContext context) {
    final ghost = g.view.ghost!;
    final secret = ghost.secret;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: _gapCol(10, [
        _Chat(
          g: g,
          title: SPlay.ghosts,
          hint: SPlay.ghostHint,
          ghost: true,
          messages: ghost.chat,
          onSend: (text) => g.send({'type': 'ghostChat', 'text': text}),
        ),
        if (secret != null && secret.isNotEmpty) _Details(summary: SPlay.ghostSecret, items: [for (final e in secret) _secretText(e, g.plainNick)]),
      ]),
    );
  }
}
