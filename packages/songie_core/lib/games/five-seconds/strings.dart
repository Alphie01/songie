// games/five-seconds/client/strings.ts ile birebir.
import 'dart:math' as math;

abstract final class S {
  static const name = '5 Saniye';

  /// `s.team`: a = yeşil, b = mor.
  static String team(String t) => t == 'b' ? 'Mor takım' : 'Yeşil takım';
}

abstract final class SSettings {
  static const readOnly = 'Ayarları oda sahibi seçer.';
  static const categories = 'Kategoriler';
  static const categoriesHint = '+18 kategoriler varsayılan olarak kapalıdır.';
  static const adultHint = '+18 kategoriler açık cinsel içerik içerir; yalnızca yetişkinler içindir.';
  static const coupleHint = 'Çift odası: partnerinle ikiniz için. Pas hakkı her zaman var; durmak isteyen durdurur.';
  static const mode = 'Oyun modu';
  static const solo = 'Herkes kendine';
  static const teams = 'İki takım';
  static const modeHint = 'Takım modunda puanlar takıma yazılır. Her takımda en az 2 kişi olmalı.';
  static const teamsTitle = 'Takımlar';
  static const teamsHint = 'Bir oyuncuya dokunarak takımını değiştir. Takımı seçilmeyenler başlarken dağıtılır.';
  static const unassigned = 'Takımsız';
  static const shuffle = 'Karıştır';
  static const shuffleLabel = 'Takımları karıştır';
  static const empty = 'Henüz kimse yok';
  static const needTwo = 'Her takımda en az 2 kişi olmalı.';
  static const seconds = 'Süre';
  static String sec(int n) => '$n sn';
  static const rounds = 'Oyuncu başına sıra';
  static const unlimited = 'Sınırsız';
  static String roundsHint(int n) => n == 0 ? 'Oda sahibi bitirene kadar sürer.' : 'Herkes $n kez görev alır.';
  static const steal = 'Çalma kuralı';
  static const stealHint = 'Başaramayan oyuncunun görevini sıradaki oyuncu aynı sürede dener; başarırsa puanı o alır.';
  static const on = 'Açık';
  static const off = 'Kapalı';
  static const addPrompt = 'Görev ekle';
  static const addPromptHint = 'Eklediğin görev “Arkadaş görevleri” kategorisine girer ve kimseye listelenmez.';
  static const promptPlaceholder = '3 … söyle';
  static const promptLabel = 'Yeni görev';
  static const save = 'Görevi ekle';
  static const saving = 'Ekleniyor…';
  static const saved = 'Görev eklendi. Sırası gelince sürpriz olacak.';
  static const failed = 'Görev eklenemedi. Tekrar dene.';
}

abstract final class SPlay {
  static String round(int n, int? total) => total != null && total > 0 ? 'Tur ${math.min(n, total)}/$total' : 'Tur $n';
  static const you = 'sen';
  static const youCap = 'Sen';
  static const phaseReady = 'Hazırlık';
  static const phaseMine = 'Sen söylüyorsun';
  static String phaseSpeaking(String nick) => '$nick söylüyor';
  static const phaseVote = 'Oylama';
  static String secs(int n) => '$n sn';
  static String pip(int n) => '$n. şey';
  static const yourTurn = 'Sıra sende';
  static const next = 'Sırada';
  static const ready = 'Hazırım';
  static String readyHint(int sec) => 'Basınca görev herkese açılır ve $sec saniye başlar. Yüksek sesle 3 şey söyle.';
  static String readyFor(String nick) => '$nick yerine başlat';
  static String waiting(String nick) => '$nick hazırlanıyor. Görev herkese aynı anda açılacak.';
  static const stealTitle = 'Çalma şansı';
  static String stealBody(String from, String to) => '$from başaramadı. Aynı görev, aynı süre: $to puanı çalabilir.';
  static const done = 'Söyledim';
  static String speak(String nick) => '$nick söylüyor';
  static const seconds = 'saniye';
  static const counter = 'Saydıkça dokun';
  static String counterLabel(int n) => '$n şey sayıldı';
  static const counterReset = 'Sayacı sıfırla';
  static String voteTitle(String nick) => '$nick 3 şeyi söyleyebildi mi?';
  static const voteYes = 'Başardı';
  static const voteNo = 'Başaramadı';
  static const voteWait = 'Arkadaşların karar veriyor.';
  static String voteCount(int n, int total) => '$n/$total oy verildi';
  static const voteHint = 'Eşitlikte başardı sayılır.';
  static const voteChange = 'Oyunu değiştirebilirsin.';
  static const swap = 'Görevi değiştir';
  static const skip = 'Sırayı atla';
  static String resultSuccess(String nick) => '$nick başardı';
  static String resultStolen(String nick) => '$nick puanı çaldı';
  static String resultFail(String nick) => '$nick başaramadı';
  static String resultSkipped(String nick) => '$nick atlandı';
  static String votes(int yes, int no) => '$yes evet, $no hayır';
  static const points = 'puan';
  static const scoreboard = 'Skorlar';
  static String scoreboardRound(String round) => 'Skorlar · $round';
  static const offline = 'bağlantı yok';
}

abstract final class SPodium {
  static const title = 'En hızlı ağızlar';
  static const gameOver = 'Oyun bitti';
  static String winnerTeam(String team) => '$team kazandı!';
  static String winner(String nick) => '$nick kazandı!';
  static const draw = 'Berabere';
  static const back = 'Lobiye dönülüyor…';
  static String place(int n) => '$n.';
}

abstract final class SHowto {
  static const title = 'Nasıl oynanır';
  static const steps = <(String, String)>[
    ('Hazırım', 'Sıra sana gelince “Hazırım”a bas. Görev herkesin ekranında aynı anda açılır.'),
    ('3 şey söyle', 'Süre bitmeden görevdeki 3 şeyi yüksek sesle söyle. Takılmak serbest, susmak yasak.'),
    ('Oylama', 'Süre bitince diğerleri “Başardı” ya da “Başaramadı” der. Çoğunluk kazanır, eşitlikte başardı sayılır.'),
    ('Puan', 'Başarırsan +1 puan. Çalma kuralı açıksa başaramadığın görevi sıradaki oyuncu deneyip puanı alabilir.'),
  ];
}
