// games/bottle/shared/index.ts karşılığı.
import '../../shared/models.dart';

const gameId = 'bottle';
const minPlayers = 2;
const maxPlayers = 16;

/// Hazır kategoriler (`server/content/<id>.json`) + oyuncuların eklediği sorular.
const builtinCategories = ['eglenceli', 'arkadaslar', 'ask', 'utanc', 'cesur', 'yatak-odasi', 'sarhos-gece', 'sinir-testi', 'sinirsiz', 'cift-odasi'];

/// Yetişkin (+18) kategoriler: varsayılan ayarlarda kapalı, lobide uyarıyla gösterilir.
const adultCategories = ['cesur', 'yatak-odasi', 'sarhos-gece', 'sinir-testi', 'sinirsiz', 'cift-odasi'];

/// Yalnızca partnerler arası görevler içeren kategori.
const coupleCategory = 'cift-odasi';
bool isAdultCategory(String id) => adultCategories.contains(id);
const customCategory = 'oyuncular';

/// truth | dare
const kinds = ['truth', 'dare'];

/// -1 = sınırsız pas.
const passOptions = [1, 2, 3, -1];

/// Çevirme sayısı; 0 = oda sahibi bitirene kadar.
const roundOptions = [10, 20, 0];

/// Oyuncu `i`'nin masadaki açısı (0 = üst, saat yönünde).
double seatAngle(int i, int n) => n > 0 ? i * 360 / n : 0;

class BottleSettings {
  const BottleSettings({
    required this.categories,
    required this.choice,
    required this.passes,
    required this.passPenalty,
    required this.vote,
    required this.order,
    required this.rounds,
    required this.fairSpin,
  });
  final List<String> categories;

  /// player: hedef doğruluk/cesaret seçer; random: sunucu seçer.
  final String choice;

  /// Oyuncu başına pas hakkı; -1 = sınırsız.
  final int passes;

  /// Pas geçen 1 puan kaybeder.
  final bool passPenalty;

  /// "Yaptım" deyince diğerleri "Yaptı mı?" oylar.
  final bool vote;

  /// target: sıradaki çeviren hedef olan kişi (klasik); round: masada sırayla.
  final String order;
  final int rounds;

  /// Son 2 çevirmede seçilenlerin yeniden gelme olasılığı azalır.
  final bool fairSpin;

  factory BottleSettings.fromJson(Json j) => BottleSettings(
    categories: j.strs('categories'),
    choice: j.str('choice', 'player'),
    passes: j.integer('passes', 2),
    passPenalty: j.boolean('passPenalty', true),
    vote: j.boolean('vote', true),
    order: j.str('order', 'target'),
    rounds: j.integer('rounds', 20),
    fairSpin: j.boolean('fairSpin', true),
  );
}

class SpinInfo {
  const SpinInfo({required this.id, required this.startAt, required this.durationMs, required this.fromDeg, required this.toDeg});

  /// Çevirme numarası (animasyonu yeniden başlatmak için anahtar).
  final int id;

  /// Sunucu saatine göre başlangıç.
  final int startAt;
  final int durationMs;
  final double fromDeg;
  final double toDeg;

  factory SpinInfo.fromJson(Json j) =>
      SpinInfo(id: j.integer('id'), startAt: j.integer('startAt'), durationMs: j.integer('durationMs'), fromDeg: j.number('fromDeg'), toDeg: j.number('toDeg'));

  @override
  bool operator ==(Object other) =>
      other is SpinInfo && other.id == id && other.startAt == startAt && other.durationMs == durationMs && other.fromDeg == fromDeg && other.toDeg == toDeg;

  @override
  int get hashCode => Object.hash(id, startAt, durationMs, fromDeg, toDeg);
}

class PlayerScore {
  const PlayerScore({required this.points, required this.done, required this.passes, required this.failed});
  final int points;
  final int done;
  final int passes;
  final int failed;
  factory PlayerScore.fromJson(Json j) =>
      PlayerScore(points: j.integer('points'), done: j.integer('done'), passes: j.integer('passes'), failed: j.integer('failed'));
}

class LastResult {
  const LastResult({required this.targetId, required this.spinnerId, required this.kind, required this.text, required this.outcome, this.votes});
  final String targetId;

  /// O turda şişeyi çeviren.
  final String spinnerId;
  final String kind;
  final String text;

  /// done | pass | failed | skipped
  final String outcome;
  final ({int yes, int no})? votes;

  factory LastResult.fromJson(Json j) {
    final votes = j.objOrNull('votes');
    return LastResult(
      targetId: j.str('targetId'),
      spinnerId: j.str('spinnerId'),
      kind: j.str('kind', 'truth'),
      text: j.str('text'),
      outcome: j.str('outcome', 'done'),
      votes: votes == null ? null : (yes: votes.integer('yes'), no: votes.integer('no')),
    );
  }
}

class BottlePrompt {
  const BottlePrompt({required this.id, required this.text, required this.category});
  final String id;
  final String text;
  final String category;
  factory BottlePrompt.fromJson(Json j) => BottlePrompt(id: j.str('id'), text: j.str('text'), category: j.str('category'));
}

class VoteInfo {
  const VoteInfo({required this.yes, required this.no, required this.voters, this.myVote, required this.canVote, required this.endsAt});
  final int yes;
  final int no;
  final int voters;
  final bool? myVote;
  final bool canVote;
  final int endsAt;

  factory VoteInfo.fromJson(Json j) {
    final my = j['myVote'];
    return VoteInfo(
      yes: j.integer('yes'),
      no: j.integer('no'),
      voters: j.integer('voters'),
      myVote: my is bool ? my : null,
      canVote: j.boolean('canVote'),
      endsAt: j.integer('endsAt'),
    );
  }
}

class BottleView {
  const BottleView({
    required this.phase,
    required this.seats,
    required this.round,
    required this.turnNumber,
    this.totalRounds,
    required this.spinnerId,
    this.targetId,
    this.spin,
    required this.restDeg,
    this.kind,
    this.prompt,
    required this.scores,
    this.passesLeft,
    this.vote,
    this.lastResult,
    required this.serverNow,
    required this.choice,
    required this.passPenalty,
  });

  /// spin | spinning | choose | task | vote | podium
  final String phase;

  /// Masadaki oturma sırası (açılar buradan hesaplanır).
  final List<String> seats;

  /// Şimdiki çevirme numarası; hamleler bununla eşleşir.
  final int round;

  /// Tamamlanan çevirme sayısı ve toplam (null = sınırsız).
  final int turnNumber;
  final int? totalRounds;
  final String spinnerId;

  /// Şişe animasyon bitip sonuç açıklanana kadar null.
  final String? targetId;
  final SpinInfo? spin;

  /// Şişenin durduğu açı (animasyon yokken).
  final double restDeg;
  final String? kind;
  final BottlePrompt? prompt;

  /// Oyuncu → skor (sunucunun gönderdiği sırayla).
  final List<(String, PlayerScore)> scores;

  /// Hedefin kalan pas hakkı (null = sınırsız).
  final int? passesLeft;
  final VoteInfo? vote;
  final LastResult? lastResult;
  final int serverNow;
  final String choice;
  final bool passPenalty;

  factory BottleView.fromJson(Json j) {
    final scores = j.obj('scores');
    return BottleView(
      phase: j.str('phase', 'spin'),
      seats: j.strs('seats'),
      round: j.integer('round'),
      turnNumber: j.integer('turnNumber'),
      totalRounds: j.intOrNull('totalRounds'),
      spinnerId: j.str('spinnerId'),
      targetId: j.strOrNull('targetId'),
      spin: j.objOrNull('spin') == null ? null : SpinInfo.fromJson(j.obj('spin')),
      restDeg: j.number('restDeg'),
      kind: j.strOrNull('kind'),
      prompt: j.objOrNull('prompt') == null ? null : BottlePrompt.fromJson(j.obj('prompt')),
      scores: [
        for (final e in scores.entries)
          if (e.value is Map) (e.key, PlayerScore.fromJson(asJson(e.value))),
      ],
      passesLeft: j.intOrNull('passesLeft'),
      vote: j.objOrNull('vote') == null ? null : VoteInfo.fromJson(j.obj('vote')),
      lastResult: j.objOrNull('lastResult') == null ? null : LastResult.fromJson(j.obj('lastResult')),
      serverNow: j.integer('serverNow'),
      choice: j.str('choice', 'player'),
      passPenalty: j.boolean('passPenalty'),
    );
  }
}

class CategoryInfo {
  const CategoryInfo({required this.id, required this.name, required this.truth, required this.dare});
  final String id;
  final String name;
  final int truth;
  final int dare;
  factory CategoryInfo.fromJson(Json j) => CategoryInfo(id: j.str('id'), name: j.str('name'), truth: j.integer('truth'), dare: j.integer('dare'));
}
