import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'audio/player.dart';
import 'flavor.dart';
import 'screens/home.dart';
import 'screens/profile.dart';
import 'screens/room/room_screen.dart';
import 'screens/shell.dart';
import 'screens/update.dart';
import 'screens/welcome.dart';
import 'session/session.dart';
import 'session/storage.dart';
import 'ui/tokens.dart';
import 'ui/toast.dart';

class SongieApp extends StatefulWidget {
  const SongieApp({super.key, required this.session, required this.storage, required this.player, required this.updateRequired, this.initialLocation = '/'});
  final Session session;
  final Storage storage;
  final AudioPlayerService player;
  final ValueListenable<bool> updateRequired;

  /// Açılış adresi (ekran görüntüsü düzeneği için).
  final String initialLocation;

  @override
  State<SongieApp> createState() => _SongieAppState();
}

class _SongieAppState extends State<SongieApp> {
  late final GoRouter _router = GoRouter(
    initialLocation: widget.initialLocation,
    routes: [
      ShellRoute(
        builder: (context, state, child) => _Gate(child: child),
        routes: [
          GoRoute(path: '/', builder: (context, state) => AppFlavor.current.home?.call(context) ?? const HomeScreen()),
          GoRoute(path: '/r/:code', builder: (context, state) => RoomScreen(code: (state.pathParameters['code'] ?? '').toUpperCase())),
          GoRoute(path: '/profil', builder: (context, state) => const ProfileScreen()),
        ],
      ),
    ],
    // Bilinmeyen adres ana sayfaya (web: <Navigate to="/" />).
    errorBuilder: (context, state) => _Gate(child: AppFlavor.current.home?.call(context) ?? const HomeScreen()),
  );

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: widget.session),
        Provider.value(value: widget.storage),
        ChangeNotifierProvider.value(value: widget.player),
      ],
      child: AnnotatedRegion<SystemUiOverlayStyle>(
        value: SystemUiOverlayStyle.light.copyWith(statusBarColor: Colors.transparent, systemNavigationBarColor: AppFlavor.current.background),
        child: MaterialApp.router(
          title: AppFlavor.current.name,
          debugShowCheckedModeBanner: false,
          theme: songieTheme(),
          routerConfig: _router,
          locale: const Locale('tr', 'TR'),
          builder: (context, child) => ValueListenableBuilder<bool>(
            valueListenable: widget.updateRequired,
            builder: (context, update, _) => update ? const UpdateScreen() : ToastHost(child: child ?? const SizedBox()),
          ),
        ),
      ),
    );
  }
}

/// Profil yoksa her adreste giriş ekranı (davet linkiyle gelen önce adını yazar, sonra aynı adreste odaya girer).
class _Gate extends StatelessWidget {
  const _Gate({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final status = context.select<Session, SessionStatus>((s) => s.status);
    return Scaffold(
      backgroundColor: AppFlavor.current.background,
      resizeToAvoidBottomInset: true,
      body: switch (status) {
        SessionStatus.loading => const SizedBox.expand(),
        SessionStatus.anonymous => const WelcomeScreen(),
        SessionStatus.ready => ShellScaffold(child: child),
      },
    );
  }
}
