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

/// Apple hesabıyla Firebase'e giriş (iOS'ta sistemin Apple penceresi) ve Firebase ID token'ı.
/// Apple adı yalnızca ilk girişte verir; sunucu ad gelmezse profil adını korur.
Future<String> appleIdToken() async {
  try {
    final provider = AppleAuthProvider()
      ..addScope('email')
      ..addScope('name');
    final cred = await FirebaseAuth.instance.signInWithProvider(provider);
    final token = await cred.user?.getIdToken();
    if (token == null) throw GoogleAuthError(TrAccount.appleFailed);
    return token;
  } on FirebaseAuthException catch (e) {
    if (_appleCancelled(e)) throw GoogleCancelled();
    if (e.code == 'network-request-failed') throw GoogleAuthError('Apple’a ulaşılamadı. İnternet bağlantını kontrol et.');
    throw GoogleAuthError(TrAccount.appleFailed);
  } on GoogleAuthError {
    rethrow;
  } on Object {
    throw GoogleAuthError(TrAccount.appleFailed);
  }
}

bool _appleCancelled(FirebaseAuthException e) =>
    const ['canceled', 'web-context-canceled', 'popup-closed-by-user', 'user-cancelled'].contains(e.code) ||
    // AuthorizationErrorCode.canceled (1001) bazı sürümlerde "unknown" olarak gelir.
    (e.message ?? '').contains('1001');

/// Hesap silinirken Apple'daki bağlantıyı da iptal eder (App Store kuralı 5.1.1(v)).
/// İptal için taze yetki kodu gerekir: Apple penceresi bir kez daha açılır. Vazgeçilirse silme de durur.
Future<void> appleRevoke() async {
  if (!Platform.isIOS) return;
  try {
    final provider = AppleAuthProvider();
    final user = FirebaseAuth.instance.currentUser;
    final cred = user != null ? await user.reauthenticateWithProvider(provider) : await FirebaseAuth.instance.signInWithProvider(provider);
    final code = cred.additionalUserInfo?.authorizationCode;
    if (code != null) await FirebaseAuth.instance.revokeTokenWithAuthorizationCode(code);
  } on FirebaseAuthException catch (e) {
    if (_appleCancelled(e)) throw GoogleCancelled();
    // İptal edilemese de sunucudaki veriler silinir.
  } on Object {
    // aynı
  }
}

/// Firebase'deki kullanıcı kaydını siler (yeni giriş gerektirirse sessizce geçer; asıl veriler sunucuda).
Future<void> firebaseDeleteUser() async {
  try {
    await FirebaseAuth.instance.currentUser?.delete();
  } on Object {
    // oturum eski ya da yok
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
