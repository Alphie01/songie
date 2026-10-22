// games/agents/client/strings.ts ile birebir.
import '../../shared/text.dart';

/// Türkçe tamlayan eki: Deniz → ’in, Ali → ’nin, Ufuk → ’un.
String _possessive(String name) {
  const vowelSet = 'aeıioöuü';
  final lower = trLower(name);
  final vowels = [for (final r in lower.runes) String.fromCharCode(r)].where(vowelSet.contains).toList();
  final last = vowels.isEmpty ? 'e' : vowels.last;
  final v = 'aı'.contains(last)
      ? 'ı'
      : 'ei'.contains(last)
      ? 'i'
      : 'ou'.contains(last)
      ? 'u'
      : 'ü';
  final endsVowel = vowelSet.contains(lower.isEmpty ? '' : lower[lower.length - 1]);
  return '’${endsVowel ? 'n' : ''}${v}n';
}

abstract final class S {
  static const name = 'Ajanlar';
  static const pitch = 'Tek kelimelik ipucuyla takımına gizli ajanlarını buldur';
  static const team = {'a': 'Yeşil takım', 'b': 'Mor takım'};
  static const teamShort = {'a': 'Yeşil', 'b': 'Mor'};
  static const color = {'a': 'Yeşil ajan', 'b': 'Mor ajan', 'neutral': 'Tarafsız', 'assassin': 'Suikastçı'};
}

abstract final class SSettings {
  static const teams = 'Takımlar';
  static const teamsHint = 'Bir oyuncuya dokunarak takımını değiştir. Takımı seçilmeyenler başlarken dağıtılır.';
  static const unassigned = 'Takımsız';
  static const shuffle = 'Karıştır';
  static const shuffleAria = 'Takımları karıştır';
  static const offline = 'bağlantı yok';
  static const empty = 'Henüz kimse yok';
  static const needTwo = 'Her takımda en az 2 kişi olmalı.';
  static const leaders = 'Liderler';
  static const leaderPick = {'random': 'Başlarken rastgele', 'host': 'Oda sahibi seçer'};
  static const leaderHint = 'Lider ipucunu verir ve gizli anahtarı görür. Her yeni tabloda lider sırayla değişir.';
  static String pickLeader(String team) => '$team lideri';
  static const noLeader = 'Seçilmedi, rastgele olacak';
  static const packs = 'Kelime paketleri';
  static const pack = {'genel': 'Genel', 'kolay': 'Kolay', 'zor': 'Zor'};
  static const packHint = 'Seçili paketlerden 25 kelime çekilir.';
  static const reveal = 'Kart nasıl açılsın';
  static const revealMode = {'first': 'İlk dokunuş açar', 'vote': 'Takım oylaması'};
  static const revealHint = {
    'first': 'Takımdan biri karta dokununca kart açılır.',
    'vote': 'Takımın çoğunluğu aynı karta dokununca açılır. Herkes kimin neye dokunduğunu görür.',
  };
  static const timer = 'Süre';
  static const timerMode = {'off': 'Süresiz', 'split': 'Lider ve takım ayrı', 'total': 'Sıra başına toplam'};
  static const timerHint = {
    'off': 'Acele yok; sıra ipucu ve tahminle ilerler.',
    'split': 'Lider ipucu için, takım tahmin için ayrı ayrı bu süreyi alır.',
    'total': 'İpucu ve tahminler aynı sürenin içine sığmalı.',
  };
  static String sec(int n) => '$n sn';
  static const readOnly = 'Ayarları oda sahibi seçer.';
  static const liveHint = 'Oyun sırasındaki değişiklikler sıradaki sıradan, paket ve takımlar yeni tablodan itibaren geçerli olur.';
}

abstract final class SPlay {
  static String board(int n) => 'Tablo $n';
  static String pill(int n) => 'Ajanlar · Tablo $n';
  static String agents(int n) => '$n ajan';
  static String clueOf(String nick) => 'Lider $nick${_possessive(nick)} ipucu';
  static const myClue = 'Senin ipucun';
  static const thinking = '…';
  static const yourClue = 'İpucun';
  static const legendNeutral = 'Tarafsız: sıra biter';
  static const legendAssassin = 'Suikastçı: oyun biter';
  static String turnShort(String team) => 'Sıra ${trLower(team)}da';
  static const you = 'sen';
  static const leader = 'lider';
  static const nextLeader = 'sıradaki lider';
  static const makeLeader = 'Lider yap';
  static const makeNextLeader = 'Sıradaki tabloda lider yap';
  static const offline = 'bağlantı yok';
  static String left(int n) => n == 1 ? '1 ajan kaldı' : '$n ajan kaldı';
  static String turnOf(String team) => 'Sıra ${trLower(team)}da';
  static String waitClue(String nick) => '$nick ipucu düşünüyor.';
  static const waitClueMine = 'Liderin ipucu düşünüyor. Tabloya bakıp hazırlan.';
  static String leaderOffline(String nick) => '$nick bağlı değil. Oda sahibi takımdan başka birini lider yapabilir.';
  static const clueLabel = 'İpucu';
  static const cluePlaceholder = 'Tek kelime';
  static const count = 'Kaç kart';
  static const unlimited = 'Sınırsız';
  static const giveClue = 'İpucunu ver';
  static const clueHint = 'Tablodaki açılmamış bir kelimeyi ya da onun kökünü kullanamazsın.';
  static String guessesLeft(int? n) => n == null ? 'Sınırsız hak' : (n == 1 ? '1 hak kaldı' : '$n hak kaldı');
  static const tapHint = {'first': 'Takımınla konuş, sonra karta dokun.', 'vote': 'Karta dokunarak oy ver. Tekrar dokunursan oyunu geri çekersin.'};
  static String votes(int n, int need) => '$n/$need oy';
  static String votesNeed(int need) => need == 1 ? 'Kart tek oyla açılır.' : 'Bir kartın açılması için $need oy gerekir.';
  static const endTurn = 'Sırayı bitir';
  static const leaderGuessing = 'Takımın tahmin ediyor. Yüzün bir şey belli etmesin.';
  static String opponentGuessing(String team) => '$team tahmin ediyor.';
  static const spectator = 'Bu tabloyu izliyorsun.';
  static const key = 'Anahtar';
  static const keyHint = 'Yalnızca liderler görür.';
  static const history = 'İpuçları';
  static const historyEmpty = 'Henüz ipucu verilmedi.';
  static const noClue = 'süre doldu';
  static const noPicks = 'kart açılmadı';
  static const wins = 'Kazanılan tablolar';
  static const seconds = 'sn';
}

abstract final class SOver {
  static const kicker = 'Tablo bitti';
  static const kickerFinal = 'Oyun bitti';
  static String won(String team) => '$team kazandı!';
  static String found(String team, int n, int total) => '$team: $total ajandan $n tanesini buldu';
  static const ended = 'Tablo yarıda kaldı';
  static const reason = {'agents': 'Bütün ajanlarını buldular.', 'assassin': 'Rakip suikastçıyı açtı.', 'ended': 'Oda sahibi oyunu bitirdi.'};
  static const keyShown = 'Anahtar artık herkese açık.';
  static const newBoard = 'Yeni tablo';
  static const newBoardHint = 'Aynı takımlarla devam; liderler sırayla değişir.';
  static const toLobby = 'Lobiye dön';
  static const waitHost = 'Oda sahibi yeni tablo açabilir ya da lobiye dönebilir.';
  static const closing = 'Lobiye dönülüyor…';
}

abstract final class SHowto {
  static const title = 'Nasıl oynanır';
  static const steps = <(String, String)>[
    ('Takımlar ve liderler', 'Yeşil ve mor iki takım var. Her takımın bir lideri olur; lider gizli anahtarı görür, diğerleri yalnızca kelimeleri.'),
    ('İpucu', 'Sırası gelen lider tek kelimelik bir ipucu ve bir sayı verir: “deniz 3” üç kartın denizle ilgili olduğunu söyler.'),
    ('Tahmin', 'Takım kartlara dokunur. Kendi ajanınızsa devam edersiniz, en fazla sayının bir fazlası kadar. İstediğiniz an sırayı bitirebilirsiniz.'),
    ('Tuzaklar', 'Tarafsız kart sırayı bitirir. Rakibin ajanı rakibe sayılır. Suikastçıyı açan takım anında kaybeder.'),
    ('Kazanmak', 'Bütün ajanlarını önce bulan takım kazanır. Başlayan takımın 9, diğerinin 8 ajanı var.'),
  ];
}
