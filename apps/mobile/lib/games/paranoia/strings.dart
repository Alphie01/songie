// games/paranoia/client/strings.ts ile birebir.
import '../../shared/text.dart';

const _vowels = 'aıoueiöü';
final _letter = RegExp(r'\p{L}', unicode: true);

/// Türkçe isim ekleri: "Ayşe'ye", "Barış'ın". Ünlüsü olmayan ya da harfle bitmeyen adlarda null.
String? _suffix(String nick, {required bool dative}) {
  final name = nick.trim();
  final lower = trLower(name);
  final last = lower.isEmpty ? '' : lower[lower.length - 1];
  if (!_letter.hasMatch(last)) return null;
  String? v;
  for (final r in lower.runes) {
    final c = String.fromCharCode(r);
    if (_vowels.contains(c)) v = c;
  }
  if (v == null) return null;
  final endsVowel = _vowels.contains(last);
  if (dative) {
    final e = 'aıou'.contains(v) ? 'a' : 'e';
    return "$name'${endsVowel ? 'y' : ''}$e";
  }
  final i = 'aı'.contains(v)
      ? 'ı'
      : 'ou'.contains(v)
      ? 'u'
      : 'ei'.contains(v)
      ? 'i'
      : 'ü';
  return "$name'${endsVowel ? 'n' : ''}${i}n";
}

abstract final class S {
  static const name = 'Gizlilik Esas';
  static const you = 'sen';
}

abstract final class SSettings {
  static const readOnly = 'Ayarları oda sahibi seçer.';
  static const count = 'Soru sayısı';
  static String countHint(int n) => '$n soru sorulduktan sonra hepsi teker teker açılır.';
  static const categories = 'Kategoriler';
  static const categoriesHint = '+18 kategoriler varsayılan olarak kapalıdır.';
  static const adultHint = '+18 kategoriler açık cinsel içerik içerir; yalnızca yetişkinler içindir.';
  static const think = 'Düşünme süresi';
  static const unlimited = 'Süresiz';
  static String sec(int n) => '$n sn';
  static const onTimeout = 'Süre bitince';
  static const timeoutRandom = 'Rastgele seçilir';
  static const timeoutPass = 'Pas geçilir';
  static const allowSelf = 'Kendini seçebilir';
  static const allowSelfHint = 'Açıkken soruyu alan kişi cevap olarak kendini de seçebilir.';
  static const noReturn = 'Geri seçim yok';
  static const noReturnHint = 'Soruyu sana gönderen kişiyi seçemezsin; böylece soru iki kişi arasında gidip gelmez.';
  static const hideHolder = 'Kime sorulduğu gizli';
  static const hideHolderHint = 'Açıkken sıranın kimde olduğunu bile yalnızca o kişi bilir.';
  static const first = 'İlk soruyu kim alır';
  static const firstRandom = 'Rastgele';
  static const firstHost = 'Oda sahibi seçer';
  static const revealBy = 'Açıklamada sıradaki soru';
  static const revealHost = 'Oda sahibi açar';
  static const revealVote = 'Çoğunluk oylar';
  static const on = 'Açık';
  static const off = 'Kapalı';
  static const add = 'Soru ekle';
  static const addHint = 'Eklediğin sorular “Sizin sorularınız” kategorisine girer ve kimseye listelenmez.';
  static const addPlaceholder = 'Aramızda kim…';
  static const addLabel = 'Yeni soru';
  static const save = 'Soruyu ekle';
  static const saving = 'Ekleniyor…';
  static const saved = 'Soru eklendi. Oyunda sürpriz olarak çıkacak.';
  static const addFailed = 'Soru eklenemedi. Tekrar dene.';
}

abstract final class SPlay {
  static String progress(int n, int total) => '$n/$total soru';
  static const players = 'Oyuncular';
  static const thinking = 'düşünüyor';
  static const offline = 'bağlantı yok';
  // İlk seçim
  static const pickFirstTitle = 'İlk soruyu kim alsın?';
  static const pickFirstHint = 'Seçtiğin kişi ilk gizli soruyu alır. Kimse kimi seçtiğini görmez.';
  static const pickFirstConfirm = 'İlk soruyu ver';
  static const pickFirstWait = 'Oda sahibi ilk soruyu kime vereceğini seçiyor.';
  // Zarf
  static const envelopeTitle = 'Sana gizli bir soru geldi!';
  static String envelopeFrom(String nick) => '$nick sana gönderdi. Kimse görmesin, sonra zarfa dokun.';
  static const envelopeHint = 'Kimse görmesin, sonra zarfa dokun.';
  static const openEnvelope = 'Zarfı aç';
  static const sentYou = 'sana gönderdi';
  // Sıra sende
  static const yourTurn = 'Sıra sende';
  static const secretNote = 'Bu soruyu yalnızca sen görüyorsun.';
  static const pickTitle = 'Cevabın kim?';
  static String pickHint(bool allowSelf, bool noReturn) => [
    if (!allowSelf && noReturn)
      'Kendini ve soruyu sana gönderen kişiyi seçemezsin.'
    else if (!allowSelf)
      'Kendini seçemezsin.'
    else if (noReturn)
      'Soruyu sana gönderen kişiyi seçemezsin.',
    'Seçtiğin kişi sıradaki soruyu alır.',
  ].join(' ');
  static const confirm = 'Seçimi onayla';
  static String confirmPick(String nick) => '$nick seçimini onayla';
  static const sending = 'Gönderiliyor…';
  static String secondsLeft(int n) => '$n sn';
  static const timeoutRandom = 'Süre bitince rastgele biri seçilir.';
  static const timeoutPass = 'Süre bitince soru pas geçilir.';
  // Bekleme
  static const waitHidden = 'Şu an birine soru soruldu, düşünüyor…';
  static String waitHolder(String nick) => '$nick düşünüyor…';
  static const waitHint = 'Sorular ve cevaplar en sonda teker teker açılacak.';
  static const answeredFlash = 'Bir soru cevaplandı';
  static const mine = 'Senin gizli cevapların';
  static const mineHint = 'Bunları yalnızca sen görüyorsun; açıklamaya kadar sır.';
  static const passed = 'pas geçildi';
  // Oda sahibi: takılan oyuncu
  static const stuckTitle = 'Sırası gelen oyuncunun bağlantısı koptu';
  static const stuckHint = 'Beklemek istemezsen onun yerine rastgele seç ya da soruyu başka birine ver.';
  static const skipRandom = 'Onun yerine rastgele seç';
  static const skipReassign = 'Soruyu başkasına ver';
  // Açıklama
  static String revealHead(int n, int total) => 'Soru $n/$total';
  static String askedTo(String nick) {
    final s = _suffix(nick, dative: true);
    return s != null ? '$s soruldu' : 'Soruldu: $nick';
  }

  static String answerOf(String nick) {
    final s = _suffix(nick, dative: false);
    return s != null ? '$s cevabı' : '$nick cevap verdi';
  }

  static const noAnswer = 'Cevap vermedi';
  static String? how(String how) => switch (how) {
    'random' => 'Süre bitti, rastgele seçildi',
    'pass' => 'Süre bitti, pas geçildi',
    'host' => 'Oda sahibi onun yerine rastgele seçti',
    _ => null,
  };
  static const next = 'Sıradaki soruyu aç';
  static const last = 'Özeti göster';
  static String vote(int votes, int needed) => 'Sıradakine geç ($votes/$needed)';
  static String voted(int votes, int needed) => 'Oyun verildi ($votes/$needed)';
  static const hostWillOpen = 'Sıradaki soruyu oda sahibi açacak.';
  static const history = 'Açılan sorular';
  // Özet
  static const gameOver = 'Oyun bitti';
  static const summaryTitle = 'Bütün sorular açıldı';
  static String mostPicked(String nick) => '$nick en çok seçilen oldu!';
  static const tie = 'En çok seçilenler berabere';
  static const backToLobby = 'Lobiye dönülüyor…';
  static const statsTitle = 'Kim kaç kez seçildi';
  static String times(int n) => n == 0 ? 'hiç' : '$n kez';
  static const allTitle = 'Bütün sorular';
  static const finish = 'Oyunu bitir ve lobiye dön';
  static String closes(int secs) => 'Oda $secs sn içinde lobiye dönecek.';
  static const waitHostFinish = 'Oda sahibi oyunu bitirince lobiye dönülecek.';
}

/// `s.howto`: web'deki PlayView göstermiyor; metinler eşlik için burada.
abstract final class SHowto {
  static const title = 'Nasıl oynanır';
  static const steps = <(String, String)>[
    ('Gizli soru', 'Sıra sana gelince ekranında yalnızca senin gördüğün bir soru çıkar: “Aramızda kim en kıskanç?” gibi.'),
    ('Birini seç', 'Cevap olarak odadaki oyunculardan birini seç ve onayla. Kimi seçtiğini kimse görmez.'),
    ('Zincir', 'Seçtiğin kişi sıradaki soruyu alır. Belirlenen soru sayısına ulaşana kadar böyle devam eder.'),
    ('Açıklama', 'Sorular bitince hepsi sırayla açılır: önce soru, sonra kime sorulduğu, en sonda cevap.'),
  ];
}
