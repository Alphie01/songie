import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../i18n/tr.dart';
import '../session/session.dart';
import '../shared/text.dart';
import '../ui/page.dart';
import '../ui/tokens.dart';
import '../ui/widgets.dart';
import 'shell.dart';
import 'welcome.dart';

/// apps/web/src/pages/Profile.tsx: 2×2 istatistik kartı, Google hesabı, profil formu.
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final session = context.watch<Session>();
    final profile = session.profile;
    if (profile == null) return const SizedBox();
    final stats = session.stats;
    final rows = stats == null
        ? const <(String, int)>[]
        : [(TrProfile.games, stats.gamesPlayed), (TrProfile.wins, stats.wins), (TrProfile.best, stats.bestScore), (TrProfile.streak, stats.bestStreak)];
    const colors = [C.yellow, C.mint, C.pink, C.sky];
    const tilts = [-1.2, 1.0, 0.6, -0.8];

    return SPage(
      fill: true,
      padTop: 20,
      padBottom: 28,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const TopBar(),
          const SizedBox(height: 22),
          Expanded(
            child: ProfileForm(
              key: ValueKey(profile.id),
              initialNick: profile.nick,
              initialColor: profile.avatar.color,
              submitLabel: TrProfile.save,
              onSubmit: (nick, avatar) async {
                await session.saveProfile(nick, avatar);
                session.notify(TrProfile.saved);
              },
              before: VStack(
                gap: 22,
                children: [
                  if (rows.isNotEmpty)
                    Grid2(
                      rowGap: 12,
                      columnGap: 12,
                      equalHeight: true,
                      children: [
                        for (var i = 0; i < rows.length; i++)
                          Transform.rotate(
                            angle: deg(tilts[i]),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              decoration: BoxDecoration(
                                color: colors[i],
                                border: Border.all(color: C.ink, width: bw),
                                borderRadius: BorderRadius.circular(18),
                                boxShadow: Shadows.md,
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(trUpper(rows[i].$1), style: T.b(12, color: C.ink2, weight: FontWeight.w800, letterSpacing: 1.5)),
                                  const SizedBox(height: 2),
                                  Text(trNumber(rows[i].$2), style: T.d(34, color: C.ink2)),
                                ],
                              ),
                            ),
                          ),
                      ],
                    ),
                  const AccountCard(),
                ],
              ),
              after: const DeleteAccountSection(),
            ),
          ),
        ],
      ),
    );
  }
}
