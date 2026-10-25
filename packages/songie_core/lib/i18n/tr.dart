// Platform metinleri: apps/web/src/i18n/tr.ts ile birebir. Oyunlar kendi metinlerini kendi klasöründe tutar.
// ignore_for_file: constant_identifier_names

import '../flavor.dart';

abstract final class TrGuide {
  static const open = 'Nasıl oynanır?';
  static const back = 'Geri';
  static const next = 'İleri';
  static const done = 'Anladım';
  static const players = 'Oyuncu';
  static const duration = 'Süre';
}

abstract final class TrTour {
  static String get kicker => AppFlavor.current.brandText;
  static const title = 'Arkadaşlarla oyun gecesi, tek linkle';
  static const steps = <(String, String)>[
    ('Oyun seç', 'Ana sayfadan bir oyun seç ve “Oda kur”a bas. Her oyunun “Nasıl oynanır?” rehberi var.'),
    ('Arkadaşlarını çağır', 'Odanın 4 harfli kodunu ya da davet linkini paylaş. Gelenler adını yazıp doğrudan odaya girer.'),
    ('Ayarları seç', 'Oda sahibi lobide süreyi, tur sayısını, kategorileri ve takımları seçer; herkes ayarları görür.'),
    ('Oyna', 'Her şey telefondan oynanır. Gizli bilgiler (roller, kartlar, cevaplar) yalnızca görmesi gerekenin ekranına gelir.'),
    ('Menü', 'Sol üstteki menüden ses seviyesini değiştirir, başka bir oyuna geçer ya da profilini düzenlersin.'),
  ];
  static const toGames = 'Oyunlara bak';
  static String gamesTitle(int n) => '$n oyun';
  static const gamesLead = 'Birine dokun, nasıl oynandığını anlatalım.';
  static const start = 'Başla';
  static const replay = 'Oyunları tanı';
}

abstract final class TrShell {
  static const open = 'Menüyü aç';
  static const close = 'Menüyü kapat';
  static const subtitle = 'Oyunlar ve ayarlar';
  static const volume = 'Ses';
  static const games = 'Oyun seç';
  static const moreSoon = 'Yeni oyunlar bu listeye eklenecek.';
  static const profile = 'Profili düzenle';
}

abstract final class TrWelcome {
  static const title = 'Adın ne?';
  static const sub = 'Arkadaşların seni bu adla görecek.';
  static const note = 'Şifre yok; profilin bu cihazda saklanır.';
  static const tagline = 'Arkadaşlarla oyun gecesi, tek linkle';
  static const nick = 'Takma ad';
  static const nickPlaceholder = 'Takma adını yaz';
  static const color = 'Renk';
  static const save = 'Devam et';
  static const saving = 'Kaydediliyor…';
}

abstract final class TrHome {
  static String hello(String nick) => 'Selam, $nick!';
  static const helloSub = 'Bu akşam ne oynuyoruz?';
  static const heroTitle = 'Arkadaşlarını topla, oyun başlasın!';
  static const heroLead = 'Odanı kur, linki gruba at. Herkes kendi telefonundan katılır.';
  static const createRoom = 'Oda Oluştur';
  static String get badgesLabel => '${AppFlavor.current.name} hakkında';
  static const badges = ['Üyelik yok', 'İndirme yok', '%100 Türkçe'];
  static const joinSticker = '4 harf yeter';
  static const joinTitle = 'Odaya katıl';
  static const join = 'Katıl';
  static const joining = 'Katılıyor…';
  static const codeLabel = 'Oda kodu';
  static const codeLength = 'Oda kodu 4 harften oluşur.';
  static const codePlaceholder = 'ABCD';
  static const joinHint = 'Arkadaşının paylaştığı 4 harfli kodu yaz.';
  static const featureTag = 'UZUN SOLUKLU MACERA';
  static const featureName = 'Dedektif Masası';
  static const featureLead = 'İstanbul’dan Mardin’e 15 polisiye vaka. Ekibinle çöz, kaldığın yerden devam et.';
  static const create = 'Oda kur';
  static const solo = 'Tek başına oyna';
  static const games = 'Oyunlar';
  static const filterLabel = 'Kategori filtresi';
  static const stepsTitle = '3 adımda oyundasın';
  static const steps = <(String, String)>[
    ('Odanı kur', 'Tek dokunuş, kayıt yok.'),
    ('Linki paylaş', 'Gruba at ya da 4 harfli kodu sesli söyle.'),
    ('Oyunu seç, başla', 'Kurallar her oyunda bir dokunuş uzakta.'),
  ];
  static String get footer => '${AppFlavor.current.brandText} · arkadaşlarınla eğlencenin yeni adresi';
  static String backToRoom(String code) => '$code odasına dön';
}

abstract final class TrPicker {
  static const createTitle = 'Hangi oyunu oynuyoruz?';
  static const changeTitle = 'Oyunu değiştir';
  static const current = 'Şu an seçili';
}

abstract final class TrRoom {
  static String otherApp(String game, String app) => 'Bu odada $game oynanıyor. $game, $app uygulamasında.';
  static const otherAppUnknown = 'Bu odadaki oyun bu uygulamada yok.';
  static const copyLink = 'Davet linkini kopyala';
  static const copyDone = 'Kopyalandı!';
  static const share = 'Paylaş';
  static String shareText(String game) => '$game oynuyoruz, gel!';
  static const selectedGame = 'Seçilen oyun';
  static const change = 'Değiştir';
  static String readyCount(int n) => '$n kişi hazır';
  static const waiting = 'Arkadaşların bekleniyor… linki gruba at!';
  static const settings = 'Oyun ayarları';
  static const gameOver = 'Oyun bitti';
  static String winner(String nick) => '$nick kazandı!';
  static const draw = 'Berabere!';
  static const points = 'puan';
  static const rematch = 'Rövanş!';
  static const otherGame = 'Başka oyun seç';
  static const saved = 'Skorlar kaydedildi';
  static const backToLobby = 'Lobiye dönülüyor…';
  static const toLobby = 'Lobiye dön';
  static const copied = 'Link kopyalandı. Arkadaşlarına gönder.';
  static const codeLabel = 'Oda kodu';
  static const players = 'Oyuncular';
  static const host = 'oda sahibi';
  static const you = 'sen';
  static const offline = 'bağlantı yok';
  static const ready = 'hazır';
  static const kick = 'Çıkar';
  static const start = 'Oyunu başlat';
  static const starting = 'Şarkılar hazırlanıyor…';
  static String needPlayers(int n) => 'Başlamak için en az $n kişi gerekiyor.';
  static const imReady = 'Hazırım';
  static const notReady = 'Hazır değilim';
  static const waitHost = 'Oda sahibi oyunu başlatınca oyun açılacak.';
  static const leave = 'Odadan çık';
  static const lastGame = 'Son oyun';
  static const chat = 'Sohbet';
  static const chatPlaceholder = 'Mesaj yaz';
  static const send = 'Gönder';
  static const chatEmpty = 'Henüz mesaj yok.';
  static const notFound = 'Bu kodla açık bir oda yok.';
  static const home = 'Ana sayfaya dön';
  static const connecting = 'Odaya bağlanıyor…';
  static const end = 'Oyunu bitir';
  static const endConfirm = 'Oyun bitsin mi? Skorlar kaydedilir.';
  static const reconnecting = 'Bağlantı koptu, yeniden bağlanıyor…';
  static const leaveGameConfirm = 'Oyundan çıkılsın mı?';
}

abstract final class TrAccount {
  static const or = 'ya da';
  static const continueWithGoogle = 'Google ile devam et';
  static const continueWithApple = 'Apple ile devam et';
  static const continueHint = 'Başka cihazda açtığın profilin geri gelir.';
  static const sticker = 'Her cihazda';
  static const linkTitle = 'Profilini Google’a bağla';
  static const linkTitleAny = 'Profilini bir hesaba bağla';
  static const linkLead = 'Profilin ve istatistiklerin telefonda da bilgisayarda da aynı kalsın.';
  static const link = 'Google ile bağla';
  static const linkApple = 'Apple ile bağla';
  static const linked = 'Google’a bağlı';
  static const linkedApple = 'Apple’a bağlı';
  static const signOut = 'Çıkış yap';
  static const signingIn = 'Google açılıyor…';
  static const signingInApple = 'Apple açılıyor…';
  static const failed = 'Google ile giriş yapılamadı. Tekrar dene.';
  static const appleFailed = 'Apple ile giriş yapılamadı. Tekrar dene.';
  static const linkedToast = 'Profilin Google hesabına bağlandı.';
  static const linkedToastApple = 'Profilin Apple hesabına bağlandı.';
  static const deleteTitle = 'Hesabımı ve verilerimi sil';
  static const deleteText = 'Profilin, oyun sonuçların, istatistiklerin ve hesap bağlantın kalıcı olarak silinir. Bu işlem geri alınamaz.';
  static const deleteTextApple = 'Apple bağlantını kaldırmak için Apple penceresi bir kez daha açılır.';
  static const delete = 'Hesabımı sil';
  static const deleteConfirm = 'Hesabın ve bütün verilerin kalıcı olarak silinsin mi?';
  static const deleteOk = 'Evet, sil';
  static const deleting = 'Siliniyor…';
  static const deleted = 'Hesabın ve bütün verilerin silindi.';
  static const deleteFailed = 'Silinemedi. Tekrar dene ya da info@monolithyazilim.com adresine yaz.';
}

abstract final class TrProfile {
  static const title = 'Profil';
  static const games = 'Oyun';
  static const wins = 'Galibiyet';
  static const best = 'En yüksek skor';
  static const streak = 'En uzun seri';
  static const save = 'Kaydet';
  static const saved = 'Profil kaydedildi.';
}

abstract final class TrApp {
  static const unreachable = 'Sunucuya ulaşılamıyor. İnternet bağlantını kontrol et.';
  static const generic = 'Bir şeyler ters gitti. Tekrar dene.';
  static const disconnected = 'Bağlantı koptu. Yeniden bağlanıyor…';
  static const noAnswer = 'Sunucu cevap vermedi. Tekrar dene.';
  static const updateTitle = 'Yeni sürüm hazır';
  static String get updateLead => '${AppFlavor.current.name} uygulamasının bu sürümü artık desteklenmiyor. Oynamaya devam etmek için uygulamayı güncelle.';
  static const update = 'Güncelle';
}

/// Avatar rengi adları (ProfileForm).
const colorNames = <String, String>{'mint': 'Yeşil', 'signal': 'Sarı', 'label': 'Kırmızı', 'sky': 'Mavi', 'paper': 'Mor'};
const colorOrder = ['mint', 'signal', 'label', 'sky', 'paper'];
