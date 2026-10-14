import 'dart:math' as math;

import 'package:flutter/material.dart';

import 'icons.dart';
import 'tokens.dart';
import 'widgets.dart';

/// apps/web/src/components/Dialog.tsx: beyaz kart, kalın çerçeve, alttan sert gölge.
/// Telefonda (≤520px) koyu zemin, üstte 60px boşluk, kart ekranı doldurur.
Future<Result?> showSDialog<Result>(BuildContext context, {required WidgetBuilder builder}) {
  return showGeneralDialog<Result>(
    context: context,
    barrierDismissible: false,
    barrierColor: Colors.transparent,
    transitionDuration: Duration.zero,
    pageBuilder: (ctx, _, _) => builder(ctx),
  );
}

class SDialog extends StatelessWidget {
  const SDialog({super.key, required this.body, this.footer, this.onClose, this.bodyPadding = const EdgeInsets.fromLTRB(20, 22, 20, 8)});

  /// Kaydırılabilir içerik.
  final Widget body;
  final Widget? footer;

  /// Verilmezse pencereyi kapatır.
  final VoidCallback? onClose;
  final EdgeInsets bodyPadding;

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    final pad = MediaQuery.paddingOf(context);
    final phone = size.width <= 520;
    void close() => onClose != null ? onClose!() : Navigator.of(context).maybePop();

    final card = Container(
      decoration: BoxDecoration(
        color: C.paper,
        border: Border.all(color: C.ink, width: bw),
        borderRadius: BorderRadius.circular(30),
        boxShadow: hardShadow(0, 10),
      ),
      child: Stack(
        children: [
          Column(
            mainAxisSize: phone ? MainAxisSize.max : MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Flexible(
                fit: phone ? FlexFit.tight : FlexFit.loose,
                child: ClipRRect(
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(27)),
                  child: SingleChildScrollView(
                    padding: bodyPadding,
                    child: DefaultTextStyle.merge(
                      style: T.b(16, color: C.ink2),
                      child: body,
                    ),
                  ),
                ),
              ),
              ?footer,
            ],
          ),
          Positioned(
            top: 14,
            right: 14,
            child: Pressable(
              onTap: close,
              label: 'Kapat',
              builder: (context, _) => Container(
                width: 44,
                height: 44,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: C.paper2,
                  border: Border.all(color: C.ink, width: 2),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const SIcon('close', size: 16, color: C.ink2),
              ),
            ),
          ),
        ],
      ),
    );

    return PopScope(
      canPop: true,
      child: Material(
        type: MaterialType.transparency,
        child: Stack(
          children: [
            Positioned.fill(
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: close,
                child: ColoredBox(color: phone ? C.bgDeep : C.dialogScrim),
              ),
            ),
            if (phone)
              Positioned.fill(
                child: Padding(padding: EdgeInsets.fromLTRB(14, 60 + pad.top, 14, 20 + pad.bottom), child: card),
              )
            else
              Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 24),
                  child: ConstrainedBox(
                    constraints: BoxConstraints(maxWidth: 460, maxHeight: math.min(820, size.height - 48)),
                    child: card,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// Sayfalı pencerelerin alt kısmı: noktalar + "1/5", Geri / İleri.
class DialogPager extends StatelessWidget {
  const DialogPager({
    super.key,
    required this.total,
    required this.page,
    required this.onBack,
    required this.onNext,
    required this.backLabel,
    required this.nextLabel,
  });
  final int total;
  final int page;
  final VoidCallback? onBack;
  final VoidCallback onNext;
  final String backLabel;
  final String nextLabel;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 18),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              for (var i = 0; i < total; i++) ...[
                if (i > 0) const SizedBox(width: 6),
                AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  width: i == page ? 22 : 9,
                  height: 9,
                  decoration: BoxDecoration(color: i == page ? C.violet : C.paper3, borderRadius: BorderRadius.circular(R.pill)),
                ),
              ],
              const SizedBox(width: 6 + 8),
              Text(
                '${page + 1}/$total',
                style: T.b(13, color: C.violet, weight: FontWeight.w800),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: SButton(
                  label: backLabel,
                  tone: BtnTone.light,
                  block: true,
                  minHeight: 56,
                  radius: 18,
                  fontSize: 20,
                  shadowY: 0,
                  disabledOpacity: 0.4,
                  onPressed: onBack,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: SButton(label: nextLabel, tone: BtnTone.yellow, block: true, minHeight: 56, radius: 18, fontSize: 20, shadowY: 5, onPressed: onNext),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// `confirm()` karşılığı: Songie görünümünde onay penceresi.
Future<bool> confirmDialog(BuildContext context, String message, {String ok = 'Evet', String cancel = 'Vazgeç'}) async {
  final res = await showSDialog<bool>(
    context,
    builder: (ctx) => _ConfirmBox(message: message, ok: ok, cancel: cancel),
  );
  return res == true;
}

class _ConfirmBox extends StatelessWidget {
  const _ConfirmBox({required this.message, required this.ok, required this.cancel});
  final String message;
  final String ok;
  final String cancel;

  @override
  Widget build(BuildContext context) {
    return Material(
      type: MaterialType.transparency,
      child: Stack(
        children: [
          const Positioned.fill(child: ColoredBox(color: C.dialogScrim)),
          Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 400),
                child: Container(
                  padding: const EdgeInsets.fromLTRB(20, 22, 20, 18),
                  decoration: BoxDecoration(
                    color: C.paper,
                    border: Border.all(color: C.ink, width: bw),
                    borderRadius: BorderRadius.circular(30),
                    boxShadow: hardShadow(0, 10),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(message, style: T.d(24, color: C.ink2, height: 1.1)),
                      const SizedBox(height: 18),
                      Row(
                        children: [
                          Expanded(
                            child: SButton(
                              label: cancel,
                              tone: BtnTone.light,
                              block: true,
                              minHeight: 56,
                              radius: 18,
                              fontSize: 20,
                              shadowY: 0,
                              onPressed: () => Navigator.of(context).pop(false),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: SButton(
                              label: ok,
                              tone: BtnTone.yellow,
                              block: true,
                              minHeight: 56,
                              radius: 18,
                              fontSize: 20,
                              shadowY: 5,
                              onPressed: () => Navigator.of(context).pop(true),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
