import '../flavor.dart';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../i18n/tr.dart';
import '../ui/page.dart';
import '../ui/tokens.dart';
import '../ui/widgets.dart';

/// Sunucu bu sürümü artık desteklemiyorsa (`/api/app/config` → minAppVersion).
class UpdateScreen extends StatelessWidget {
  const UpdateScreen({super.key});

  static Uri get _store {
    final f = AppFlavor.current;
    return Uri.parse(
      Platform.isIOS ? (f.appStoreUrl ?? 'https://apps.apple.com/app/${f.id}') : 'https://play.google.com/store/apps/details?id=${f.storeId}',
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: C.bg,
      body: SPage(
        fill: true,
        padTop: 80,
        child: VStack(
          gap: 22,
          children: [
            const BrandLarge(),
            Container(
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(
                color: C.paper,
                border: Border.all(color: C.ink, width: bw),
                borderRadius: BorderRadius.circular(R.xl),
                boxShadow: hardShadow(8, 8),
              ),
              child: VStack(
                gap: 12,
                children: [
                  Text(TrApp.updateTitle, style: T.d(30, color: C.ink2)),
                  Text(TrApp.updateLead, style: T.b(15, color: C.inkSoft, weight: FontWeight.w700)),
                ],
              ),
            ),
            SButton(
              label: TrApp.update,
              tone: BtnTone.yellow,
              large: true,
              block: true,
              onPressed: () => launchUrl(_store, mode: LaunchMode.externalApplication),
            ),
          ],
        ),
      ),
    );
  }
}
