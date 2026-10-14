import 'dart:io';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:google_sign_in/google_sign_in.dart';

import '../i18n/tr.dart';

/// Kullanıcı Google penceresini kapattı: hata gösterilmez.
class GoogleCancelled implements Exception {}

class GoogleAuthError implements Exception {
  GoogleAuthError(this.message);
  final String message;
  @override
  String toString() => message;
}

bool _initialized = false;

Future<void> _init() async {
  if (_initialized) return;
  // iOS istemci kimliği Firebase'de Google sağlayıcısı açılınca oluşur (flutterfire configure ile gelir).
  // Kimlik yokken Google SDK'sı uygulamayı düşürebileceği için hiç çağrılmaz.
  final iosClientId = Firebase.app().options.iosClientId;
  if (Platform.isIOS && (iosClientId == null || iosClientId.isEmpty)) throw GoogleAuthError('Google ile giriş henüz hazır değil.');
  await GoogleSignIn.instance.initialize(clientId: Platform.isIOS ? iosClientId : null);
  _initialized = true;
}

/// Google hesabı seçtirir, Firebase'e giriş yapar ve sunucuya gönderilecek Firebase ID token'ını döndürür.
Future<String> googleIdToken() async {
  try {
    await _init();
    final account = await GoogleSignIn.instance.authenticate(scopeHint: const ['email', 'profile']);
    final idToken = account.authentication.idToken;
    if (idToken == null) throw GoogleAuthError(TrAccount.failed);
    final cred = await FirebaseAuth.instance.signInWithCredential(GoogleAuthProvider.credential(idToken: idToken));
    final token = await cred.user?.getIdToken();
    if (token == null) throw GoogleAuthError(TrAccount.failed);
    return token;
  } on GoogleSignInException catch (e) {
    if (e.code == GoogleSignInExceptionCode.canceled || e.code == GoogleSignInExceptionCode.interrupted) throw GoogleCancelled();
    throw GoogleAuthError(TrAccount.failed);
  } on FirebaseAuthException catch (e) {
    if (e.code == 'network-request-failed') throw GoogleAuthError('Google’a ulaşılamadı. İnternet bağlantını kontrol et.');
    throw GoogleAuthError(TrAccount.failed);
  } on GoogleAuthError {
    rethrow;
  } on Object {
    throw GoogleAuthError(TrAccount.failed);
  }
}

Future<void> googleSignOut() async {
  try {
    await FirebaseAuth.instance.signOut();
    if (_initialized) await GoogleSignIn.instance.signOut();
  } on Object {
    // oturum zaten kapalı
  }
}
