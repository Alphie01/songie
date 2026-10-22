// games/charades/client/strings.ts ile birebir.
import '../../shared/text.dart';

abstract final class S {
  static const name = 'Sessiz Sinema';
  static const team = <String, String>{'a': 'Yeşil takım', 'b': 'Mor takım'};
  static const kind = <String, String>{
    'film': 'Film',
    'dizi': 'Dizi',
    'kitap': 'Kitap',
    'sarki': 'Şarkı',
    'deyim': 'Atasözü ya da deyim',
    'ifade': 'İfade',
  };
  static const kindGesture = <String, String>{
    'film': 'Eski kamera kolu çevir',
    'dizi': 'Havaya ekran çiz',
    'kitap': 'Ellerini kitap gibi aç',
    'sarki': 'Elini ağzına götürüp şarkı söyler gibi yap',
    'deyim': 'İki elinle tırnak işareti yap',
    'ifade': 'Elini ağzının önünde açıp kapat, konuşur gibi yap',
  };
  static String words(int n) => '$n kelime';
}

abstract final class SSettings {
  static const teams = 'Takımlar';
  static const teamsHint = 'Bir oyuncuya dokunarak takımını değiştir. Takımı seçilmeyenler başlarken dağıtılır.';
  static const unassigned = 'Takımsız';
  static const shuffle = 'Karıştır';
  static const empty = 'Henüz kimse yok';
  static const categories = 'Türler';
  static const adultHint = '+18 kategoriler açık cinsel içerik içerir; yalnızca yetişkinler içindir.';
  static const difficulty = 'Zorluk';
  static const difficultyName = <String, String>{'kolay': 'Kolay', 'karisik': 'Karışık', 'zor': 'Zor'};
  static const difficultyHint = <String, String>{
    'kolay': 'Herkesin bildiği başlıklar.',
    'karisik': 'Kolay ve zor başlıklar karışık gelir.',
    'zor': 'Daha az bilinen, uzun başlıklar.',
  };
  static const seconds = 'Tur süresi';
  static String sec(int n) => '$n sn';
  static const passes = 'Pas hakkı';
  static const unlimited = 'Sınırsız';
  static const turns = 'Takım başına anlatma';
  static String turnsHint(int n) => n == 0 ? 'Oda sahibi bitirene kadar sürer.' : 'Toplam ${n * 2} tur.';
  static const penalty = 'Konuşma cezası';
  static const penaltyHint = 'Rakip takım “Konuştu!” derse kart geçer; ceza açıksa anlatan takımdan 1 puan da düşer.';
  static const on = 'Açık';
  static const off = 'Kapalı';
  static const readOnly = 'Ayarları oda sahibi seçer.';
  static const addTitle = 'Başlık ekle';
  static const addTitleHint = 'Eklediğin başlık “Arkadaş başlıkları” türüne girer ve kimseye listelenmez.';
  static const titleLabel = 'Film, dizi, kitap, şarkı, deyim ya da ifade';
  static const kindLabel = 'Türü';
  static const save = 'Başlığı ekle';
  static const saving = 'Ekleniyor…';
  static String saved(String t) => '“$t” eklendi.';
  static const needTwo = 'Her takımda en az 2 kişi olmalı.';

  /// SettingsPanel.tsx içindeki sabit metinler.
  static const saveFailed = 'Başlık eklenemedi. Tekrar dene.';
  static const deyimShort = 'Deyim';
}

abstract final class SPlay {
  static String turn(int n, int? total) => total != null && total > 0 ? 'Tur ${n + 1 < total ? n + 1 : total}/$total' : 'Tur ${n + 1}';
  static const you = 'sen';
  static const narrating = 'anlatıyor';
  static const next = 'Sıradaki anlatıcı';
  static const startMine = 'Anlatmaya başla';
  static const startMineHint = 'Başlayınca başlığı yalnızca sen ve rakip takım göreceksiniz. Konuşmak yok.';
  static String startForThem(String nick) => '$nick yerine başlat';
  static const skipNarrator = 'Anlatıcıyı atla';
  static String waitNarrator(String nick) => '$nick turu başlatınca süre işlemeye başlayacak.';
  static const correct = 'Doğru';
  static String pass(int? left) => left == null ? 'Pas' : 'Pas ($left)';
  static const undo = 'Geri al';
  static const foul = 'Konuştu!';
  static String foulHint(bool penalty) => penalty
      ? 'Anlatıcı ses çıkarır ya da dudaklarıyla söylerse bas: kart geçer, takımı 1 puan kaybeder.'
      : 'Anlatıcı ses çıkarır ya da dudaklarıyla söylerse bas: kart geçer.';
  static const watchHint = 'Başlığı sen de görüyorsun. Sakın söyleme.';
  static String guess(String nick) => '$nick anlatıyor, tahmin et!';
  static const guessHint = 'Başlığı göremezsin. İşaretleri izle, tahminini yüksek sesle söyle.';
  static const guessCount = 'Bu turda bilinen';
  static const headlineNarrator = 'Sen anlatıyorsun · konuşmak yok!';
  static const headlineWatcher = 'Başlığı sen de görüyorsun. Sakın söyleme.';

  /// `İşaret: ${g.charAt(0).toLocaleLowerCase('tr')}${g.slice(1)}`
  static String gesture(String g) => g.isEmpty ? 'İşaret: ' : 'İşaret: ${trLower(g.substring(0, 1))}${g.substring(1)}';
  static const signsLabel = 'Klasik işaretler';
  static const signsShort = <String, String>{
    'tur': 'Tür',
    'kelime': 'Kelime sayısı: parmak',
    'hece': 'Hece: kola dokun',
    'benzer': 'Benzer ses: kulak',
    'bildin': 'Bildin: buruna dokun',
  };
  static const signsTap = 'İşarete dokun, takımın ekranında görsün.';
  static String signShown(String sign, String? kind, int? words) => switch (sign) {
    'tur' => kind != null && kind.isNotEmpty ? 'Tür: $kind' : 'Tür',
    'kelime' => words != null && words != 0 ? '$words kelime' : 'Kelime sayısı',
    'hece' => 'Heceye bölüyor',
    'benzer' => 'Benzer ses',
    _ => 'Bildin!',
  };
  static const spectator = 'Bu tur izliyorsun.';
  static const narratorNote = 'Takımın başlığın tamamını söyleyince “Doğru”ya bas.';
  static const stats = <String, String>{'correct': 'Doğru', 'pass': 'Pas', 'foul': 'Konuştu'};
  static const flash = <String, String>{'correct': 'Doğru! +1', 'pass': 'Pas', 'foul': 'Konuştu!'};
  static String lastTurn(String team, int pts) => '$team bu turda ${pts > 0 ? '+' : ''}$pts';
  static const noCards = 'Bu turda kart geçmedi.';
  static String wordN(int i) => '$i. kelime';
}

abstract final class SPodium {
  static const title = 'Oyun bitti';
  static const won = 'kazandı!';
  static const draw = 'Berabere';
  static const back = 'Lobiye dönülüyor…';
}

abstract final class SHowTo {
  static const title = 'Nasıl oynanır';
  static const steps = <(String, String)>[
    ('Takımlar', 'İki takım sırayla anlatır. Her turda anlatan takımdan bir kişi anlatıcı olur.'),
    ('Anlat', 'Anlatıcı başlığı, türünü ve kelime sayısını görür. Konuşmadan, ses çıkarmadan, yalnızca hareketle anlatır.'),
    ('Kontrol', 'Rakip takım da başlığı görür. Anlatıcı konuşursa “Konuştu!”ya basar; kart geçer.'),
    ('Puan', 'Her doğru +1. Konuşma cezası açıksa her “Konuştu!” −1. Pas hakkı ayarlardan seçilir.'),
  ];
  static const signsTitle = 'Klasik işaretler';
  static const signs = <(String, String)>[
    (
      'Tür',
      'Önce türü göster: film için kamera kolu çevir, dizi için ekran çiz, kitap için ellerini aç, şarkı için şarkı söyler gibi yap, deyim için tırnak işareti, ifade için elini ağzının önünde açıp kapat.',
    ),
    ('Kelime sayısı', 'Kaç kelime olduğunu parmaklarınla göster.'),
    ('Kaçıncı kelime', 'Hangi kelimeyi anlattığını yine parmakla göster; sıra karışmasın.'),
    ('Hece', 'Kelimeyi heceye bölmek için parmaklarını ön koluna koy: kaç parmak, o kadar hece.'),
    ('Bütün başlık', 'Kollarınla büyük bir daire çiz: başlığın tamamını bir kerede anlatacaksın.'),
    ('Benzer ses', 'Kulağını çek: “buna benzer bir kelime” demek.'),
    ('Bildin', 'Burnuna dokunup tahmin edeni göster: “tam olarak bu”.'),
  ];
}
