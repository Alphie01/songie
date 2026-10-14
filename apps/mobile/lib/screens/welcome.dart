import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';

import '../i18n/tr.dart';
import '../session/api.dart';
import '../session/google_auth.dart';
import '../session/session.dart';
import '../shared/models.dart';
import '../shared/text.dart';
import '../ui/page.dart';
import '../ui/tokens.dart';
import '../ui/widgets.dart';

/// apps/web/src/pages/Welcome.tsx: dekor şekilleri, büyük logo, profil formu, Google ile devam.
class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final session = context.read<Session>();
    final width = MediaQuery.sizeOf(context).width;
    final g = Layout.gutter(context);
    final colWidth = math.min(width, Layout.col + 2 * g);
    final left = (width - colWidth) / 2;
    return ClipRect(
      child: Stack(
        children: [
          // `.welcome` sütununa göre konumlanır, taşan kısmı kırpılır.
          Positioned(
            top: MediaQuery.paddingOf(context).top + 120,
            right: left - 30,
            child: Transform.rotate(
              angle: deg(18),
              child: Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(color: C.pink, border: Border.all(color: C.ink, width: bw), borderRadius: BorderRadius.circular(30)),
              ),
            ),
          ),
          Positioned(
            top: MediaQuery.paddingOf(context).top + 60,
            left: left - 40,
            child: Container(
              width: 90,
              height: 90,
              decoration: BoxDecoration(color: C.sky, shape: BoxShape.circle, border: Border.all(color: C.ink, width: bw)),
            ),
          ),
          SPage(
            fill: true,
            padTop: 40,
            padBottom: 28,
            child: ProfileForm(
              submitLabel: TrWelcome.save,
              onSubmit: (nick, avatar) => session.saveProfile(nick, avatar),
              before: Padding(
                padding: const EdgeInsets.only(top: 40),
                child: Column(
                  children: [
                    const BrandLarge(),
                    const SizedBox(height: 10),
                    Text(TrWelcome.tagline, style: T.b(16, color: C.text2, weight: FontWeight.w700), textAlign: TextAlign.center),
                  ],
                ),
              ),
              after: const WelcomeGoogle(),
            ),
          ),
        ],
      ),
    );
  }
}

/// Ad + renk kartı (tasarım: İlk giriş). Gönder butonu kartın altında, ekranın dibinde durur.
class ProfileForm extends StatefulWidget {
  const ProfileForm({super.key, required this.submitLabel, required this.onSubmit, this.initialNick, this.initialColor, this.before, this.after});
  final String submitLabel;
  final Future<void> Function(String nick, Avatar avatar) onSubmit;
  final String? initialNick;
  final String? initialColor;
  final Widget? before;
  final Widget? after;

  @override
  State<ProfileForm> createState() => _ProfileFormState();
}

class _ProfileFormState extends State<ProfileForm> {
  late final TextEditingController _nick = TextEditingController(text: widget.initialNick ?? '');
  late String _color = widget.initialColor ?? colorOrder[math.Random().nextInt(colorOrder.length)];
  String? _error;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _nick.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _nick.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final err = nickError(_nick.text);
    if (err != null) {
      setState(() => _error = err);
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await widget.onSubmit(_nick.text.trim(), Avatar(color: _color));
    } on ApiError catch (e) {
      if (mounted) setState(() => _error = e.message);
    } on Object {
      if (mounted) setState(() => _error = 'Kaydedilemedi. Tekrar dene.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final nick = _nick.text;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (widget.before != null) ...[widget.before!, const SizedBox(height: 22)],
        Container(
          padding: const EdgeInsets.all(22),
          decoration: BoxDecoration(
            color: C.paper,
            border: Border.all(color: C.ink, width: bw),
            borderRadius: BorderRadius.circular(R.xl),
            boxShadow: hardShadow(8, 8),
          ),
          child: VStack(
            gap: 16,
            children: [
              Row(
                children: [
                  SAvatar(avatar: Avatar(color: _color), nick: nick.isEmpty ? '?' : nick, size: 64),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(TrWelcome.title, style: T.d(30, color: C.ink2)),
                        Text(TrWelcome.sub, style: T.b(13, color: C.inkSoft, weight: FontWeight.w700)),
                      ],
                    ),
                  ),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Semantics(
                    label: TrWelcome.nick,
                    child: SInput(
                      controller: _nick,
                      placeholder: TrWelcome.nickPlaceholder,
                      maxLength: 16,
                      minHeight: 56,
                      fontSize: 22,
                      focusColor: C.violet,
                      textCapitalization: TextCapitalization.words,
                      textInputAction: TextInputAction.done,
                      onSubmitted: (_) => _submit(),
                    ),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 10),
                    Text(_error!, style: T.b(14, color: C.errorOnPaper, weight: FontWeight.w800)),
                  ],
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(trUpper(TrWelcome.color), style: T.b(13, color: C.ink2, weight: FontWeight.w800, letterSpacing: 1.5)),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      for (final c in colorOrder) ...[
                        if (c != colorOrder.first) const SizedBox(width: 10),
                        _Swatch(color: c, selected: c == _color, onTap: () => setState(() => _color = c)),
                      ],
                    ],
                  ),
                ],
              ),
              Text(TrWelcome.note, style: T.b(13, color: C.inkSoft, weight: FontWeight.w700)),
            ],
          ),
        ),
        const SizedBox(height: 22),
        const Spacer(),
        const SizedBox(height: 22),
        Opacity(
          opacity: _busy ? 0.5 : 1,
          child: Pressable(
            onTap: _busy ? null : _submit,
            label: widget.submitLabel,
            builder: (context, pressed) => AnimatedContainer(
              duration: const Duration(milliseconds: 80),
              transform: Matrix4.translationValues(0, pressed ? 5 : 0, 0),
              constraints: const BoxConstraints(minHeight: 66),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: C.yellow,
                border: Border.all(color: C.ink, width: bw),
                borderRadius: BorderRadius.circular(R.lg),
                boxShadow: hardShadow(0, pressed ? 2 : 7),
              ),
              child: Text(_busy ? TrWelcome.saving : widget.submitLabel, style: T.d(24, color: C.ink2)),
            ),
          ),
        ),
        if (widget.after != null) ...[const SizedBox(height: 22), widget.after!],
      ],
    );
  }
}

class _Swatch extends StatelessWidget {
  const _Swatch({required this.color, required this.selected, required this.onTap});
  final String color;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final dot = Container(
      width: 48,
      height: 48,
      decoration: BoxDecoration(color: avatarColors[color], shape: BoxShape.circle, border: Border.all(color: C.ink, width: bw)),
    );
    return Pressable(
      onTap: onTap,
      label: colorNames[color],
      selected: selected,
      builder: (context, _) => Transform.scale(
        scale: selected ? 1.05 : 1,
        child: selected
            ? Container(
                // box-shadow: 0 0 0 4px paper, 0 0 0 7px ink
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  boxShadow: [BoxShadow(color: C.ink, spreadRadius: 7), BoxShadow(color: C.paper, spreadRadius: 4)],
                ),
                child: dot,
              )
            : dot,
      ),
    );
  }
}

/// Google'ın çok renkli "G" logosu (marka kuralı: renkleri değiştirilmez).
class GoogleMark extends StatelessWidget {
  const GoogleMark({super.key, this.size = 22});
  final double size;
  static const _svg =
      '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">'
      '<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>'
      '<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>'
      '<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>'
      '<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>'
      '</svg>';

  @override
  Widget build(BuildContext context) => SvgPicture.string(_svg, width: size, height: size);
}

/// Beyaz "Google ile …" butonu. Hata olursa alttaki bildirim şeridinde gösterilir.
class GoogleButton extends StatefulWidget {
  const GoogleButton({super.key, required this.label, this.onDone});
  final String label;
  final VoidCallback? onDone;

  @override
  State<GoogleButton> createState() => _GoogleButtonState();
}

class _GoogleButtonState extends State<GoogleButton> {
  bool busy = false;

  Future<void> _click() async {
    final session = context.read<Session>();
    setState(() => busy = true);
    try {
      await session.signInWithGoogle();
      widget.onDone?.call();
    } on GoogleCancelled {
      // kullanıcı vazgeçti
    } on GoogleAuthError catch (e) {
      session.notify(e.message);
    } on ApiError catch (e) {
      session.notify(e.message);
    } on Object {
      session.notify(TrAccount.failed);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: busy ? 0.5 : 1,
      child: Pressable(
        onTap: busy ? null : _click,
        label: widget.label,
        builder: (context, pressed) => AnimatedContainer(
          duration: const Duration(milliseconds: 80),
          transform: Matrix4.translationValues(0, pressed ? 3 : 0, 0),
          constraints: const BoxConstraints(minHeight: 56, minWidth: double.infinity),
          padding: const EdgeInsets.symmetric(horizontal: 18),
          decoration: BoxDecoration(
            color: C.paper,
            border: Border.all(color: C.ink, width: bw),
            borderRadius: BorderRadius.circular(18),
            boxShadow: hardShadow(0, pressed ? 1 : 4),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const GoogleMark(),
              const SizedBox(width: 12),
              Flexible(child: Text(busy ? TrAccount.signingIn : widget.label, style: T.d(19, color: C.ink2))),
            ],
          ),
        ),
      ),
    );
  }
}

/// Giriş ekranı: "ya da" ayırıcısı + Google ile devam.
class WelcomeGoogle extends StatelessWidget {
  const WelcomeGoogle({super.key});

  @override
  Widget build(BuildContext context) {
    Widget line() => Expanded(
      child: Container(height: 3, decoration: BoxDecoration(color: C.line2, borderRadius: BorderRadius.circular(2))),
    );
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: VStack(
        gap: 12,
        children: [
          Row(children: [line(), const SizedBox(width: 12), Text(trUpper(TrAccount.or), style: T.eyebrow()), const SizedBox(width: 12), line()]),
          const GoogleButton(label: TrAccount.continueWithGoogle),
          Text(TrAccount.continueHint, style: T.b(13, color: C.text3, weight: FontWeight.w700), textAlign: TextAlign.center),
        ],
      ),
    );
  }
}

/// Profil sayfasındaki hesap kartı: bağlı değilse bağla, bağlıysa e-posta ve çıkış.
class AccountCard extends StatelessWidget {
  const AccountCard({super.key});

  @override
  Widget build(BuildContext context) {
    final session = context.watch<Session>();
    final account = session.account;
    if (account != null) {
      return Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: C.panel2,
          border: Border.all(color: C.ink, width: bw),
          borderRadius: BorderRadius.circular(R.lg),
          boxShadow: Shadows.md,
        ),
        child: Row(
          children: [
            Transform.rotate(
              angle: deg(-6),
              child: Container(
                width: 44,
                height: 44,
                alignment: Alignment.center,
                decoration: BoxDecoration(color: C.paper, border: Border.all(color: C.ink, width: bw), borderRadius: BorderRadius.circular(14)),
                child: const GoogleMark(size: 24),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(TrAccount.linked, style: T.d(19, color: C.text)),
                  if (account.email != null)
                    Text(account.email!, style: T.b(13, color: C.text3, weight: FontWeight.w700), maxLines: 1, overflow: TextOverflow.ellipsis),
                ],
              ),
            ),
            const SizedBox(width: 12),
            SGhostButton(label: TrAccount.signOut, onPressed: () => session.signOut()),
          ],
        ),
      );
    }
    return Transform.rotate(
      angle: deg(-0.6),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(18, 20, 18, 18),
            decoration: BoxDecoration(
              color: C.panel2,
              border: Border.all(color: C.ink, width: bw),
              borderRadius: BorderRadius.circular(R.lg),
              boxShadow: Shadows.lg,
            ),
            child: VStack(
              gap: 10,
              children: [
                Text(TrAccount.linkTitle, style: T.d(24, color: C.text)),
                Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Text(TrAccount.linkLead, style: T.b(14, color: C.text2, weight: FontWeight.w700)),
                ),
                GoogleButton(label: TrAccount.link, onDone: () => session.notify(TrAccount.linkedToast)),
              ],
            ),
          ),
          const Positioned(top: -14, right: 16, child: Sticker(TrAccount.sticker, color: C.mint, rotate: 4)),
        ],
      ),
    );
  }
}
