// games/red-flag/shared/index.ts karşılığı.
import '../../shared/models.dart';

const gameId = 'red-flag';

const customCategory = 'arkadas';

/// Hazır kategoriler (dosya adları `server/content/<id>.json`) ve arkadaşların eklediği durumlar.
const categoryIds = [
  'iliski',
  'ilk-bulusma',
  'arkadaslik',
  'ev-arkadasi',
  'is',
  'aile',
  'sosyal-medya',
  'aliskanliklar',
  'cesur',
  'yatak-odasi',
  'fantezi',
  'sinir-testi',
  'sinirsiz',
  customCategory,
];

/// Yetişkin kategoriler: varsayılan kapalı, seçilince lobide uyarı çıkar.
const adultCategoryIds = ['cesur', 'yatak-odasi', 'fantezi', 'sinir-testi', 'sinirsiz'];

/// Sınır testi: seçenekler Varım / Hayır / Sınırım olarak gösterilir, üçüncü seçenek hep açık.
const limitCategory = 'sinir-testi';

/// 0 = süresiz (herkes oy verince açılır).
const secondsOptions = [0, 15, 30];

/// Açıklamadan sonra tartışma süresi (sn); 0 = süresiz (hazırım / oda sahibi).
const discussOptions = [15, 30, 0];

/// 0 = oda sahibi bitirene kadar.
const roundOptions = [10, 20, 0];

/// green | red | never
const votes = ['green', 'red', 'never'];

const _defaultCategories = ['iliski', 'ilk-bulusma', 'arkadaslik', 'ev-arkadasi', 'is', 'aile', 'sosyal-medya', 'aliskanliklar', customCategory];

class RedFlagSettings {
  const RedFlagSettings({
    required this.categories,
    required this.dealBreaker,
    required this.anonymous,
    required this.predict,
    required this.seconds,
    required this.discuss,
    required this.rounds,
  });
  final List<String> categories;

  /// Üçüncü seçenek: "Asla olmaz".
  final bool dealBreaker;

  /// true: açıklamada yalnızca sayılar gider, kimin ne dediği hiç gönderilmez.
  final bool anonymous;

  /// Oyuncular "Çoğunluk ne diyecek?" tahmini de yapar; doğru tahmin +1 puan.
  final bool predict;
  final int seconds;

  /// Açıklamadan sonra tartışma süresi (sn); 0 = süresiz.
  final int discuss;
  final int rounds;

  static const defaults = RedFlagSettings(
    categories: _defaultCategories,
    dealBreaker: false,
    anonymous: false,
    predict: true,
    seconds: 30,
    discuss: 30,
    rounds: 10,
  );

  factory RedFlagSettings.fromJson(Json j) => RedFlagSettings(
    categories: j['categories'] is List ? j.strs('categories') : defaults.categories,
    dealBreaker: j.boolean('dealBreaker', defaults.dealBreaker),
    anonymous: j.boolean('anonymous', defaults.anonymous),
    predict: j.boolean('predict', defaults.predict),
    seconds: j.integer('seconds', defaults.seconds),
    discuss: j.integer('discuss', defaults.discuss),
    rounds: j.integer('rounds', defaults.rounds),
  );

  Json toJson() => {
    'categories': categories,
    'dealBreaker': dealBreaker,
    'anonymous': anonymous,
    'predict': predict,
    'seconds': seconds,
    'discuss': discuss,
    'rounds': rounds,
  };

  RedFlagSettings copyWith({List<String>? categories, bool? dealBreaker, bool? anonymous, bool? predict, int? seconds, int? discuss, int? rounds}) =>
      RedFlagSettings(
        categories: categories ?? this.categories,
        dealBreaker: dealBreaker ?? this.dealBreaker,
        anonymous: anonymous ?? this.anonymous,
        predict: predict ?? this.predict,
        seconds: seconds ?? this.seconds,
        discuss: discuss ?? this.discuss,
        rounds: rounds ?? this.rounds,
      );
}

class Situation {
  const Situation({required this.id, required this.text, required this.category});
  final String id;
  final String text;
  final String category;
  factory Situation.fromJson(Json j) => Situation(id: j.str('id'), text: j.str('text'), category: j.str('category'));
}

/// Seçenek başına oy sayısı.
class Counts {
  const Counts({this.green = 0, this.red = 0, this.never = 0});
  final int green;
  final int red;
  final int never;

  int operator [](String vote) => switch (vote) {
    'green' => green,
    'red' => red,
    'never' => never,
    _ => 0,
  };

  factory Counts.fromJson(Json j) => Counts(green: j.integer('green'), red: j.integer('red'), never: j.integer('never'));
}

class VoteEntry {
  const VoteEntry({required this.playerId, required this.vote});
  final String playerId;
  final String vote;
  factory VoteEntry.fromJson(Json j) => VoteEntry(playerId: j.str('playerId'), vote: j.str('vote'));
}

class RevealInfo {
  const RevealInfo({required this.counts, required this.total, required this.majority, this.votes, required this.correct, this.myVote, this.myGuess});
  final Counts counts;
  final int total;

  /// En çok oy alan seçenek(ler). Beraberlikte birden fazla.
  final List<String> majority;

  /// Açık modda kimin ne dediği; isimsiz modda null (sunucu kimlik göndermez).
  final List<VoteEntry>? votes;

  /// Tahmin modunda doğru tahmin edenler.
  final List<String> correct;

  /// İzleyenin kendi oyu ve tahmini.
  final String? myVote;
  final String? myGuess;

  factory RevealInfo.fromJson(Json j) => RevealInfo(
    counts: Counts.fromJson(j.obj('counts')),
    total: j.integer('total'),
    majority: j.strs('majority'),
    votes: j['votes'] is List ? j.objs('votes').map(VoteEntry.fromJson).toList() : null,
    correct: j.strs('correct'),
    myVote: j.strOrNull('myVote'),
    myGuess: j.strOrNull('myGuess'),
  );
}

class PlayerProfile {
  const PlayerProfile({required this.playerId, required this.green, required this.red, required this.never, required this.minority, required this.tolerance});
  final String playerId;
  final int green;
  final int red;
  final int never;

  /// Azınlıkta kaldığı tur sayısı.
  final int minority;

  /// 0–100: oylarının yüzde kaçı green.
  final int tolerance;

  factory PlayerProfile.fromJson(Json j) => PlayerProfile(
    playerId: j.str('playerId'),
    green: j.integer('green'),
    red: j.integer('red'),
    never: j.integer('never'),
    minority: j.integer('minority'),
    tolerance: j.integer('tolerance'),
  );
}

class DivisiveItem {
  const DivisiveItem({required this.text, required this.counts});
  final String text;
  final Counts counts;
  factory DivisiveItem.fromJson(Json j) => DivisiveItem(text: j.str('text'), counts: Counts.fromJson(j.obj('counts')));
}

class Summary {
  const Summary({required this.rounds, required this.profiles, this.mostGreen, this.strictest, this.rebel, required this.divisive, required this.totals});
  final int rounds;

  /// Açık modda herkesin profili; isimsiz modda yalnızca izleyenin kendisi.
  final List<PlayerProfile> profiles;
  final String? mostGreen;
  final String? strictest;
  final String? rebel;
  final List<DivisiveItem> divisive;
  final Counts totals;

  factory Summary.fromJson(Json j) => Summary(
    rounds: j.integer('rounds'),
    profiles: j.objs('profiles').map(PlayerProfile.fromJson).toList(),
    mostGreen: j.strOrNull('mostGreen'),
    strictest: j.strOrNull('strictest'),
    rebel: j.strOrNull('rebel'),
    divisive: j.objs('divisive').map(DivisiveItem.fromJson).toList(),
    totals: Counts.fromJson(j.obj('totals')),
  );
}

class RedFlagView {
  const RedFlagView({
    required this.phase,
    required this.round,
    this.totalRounds,
    this.item,
    required this.categoryName,
    required this.dealBreaker,
    required this.anonymous,
    required this.predict,
    required this.voters,
    required this.done,
    required this.ready,
    this.myVote,
    this.myGuess,
    required this.serverNow,
    required this.endsAt,
    required this.durationMs,
    required this.nextAt,
    required this.discussEndsAt,
    required this.discussMs,
    this.reveal,
    required this.scores,
    this.summary,
  });

  /// vote | reveal | podium
  final String phase;

  /// Tamamlanan (açılan) durum sayısı ve toplam (null = sınırsız).
  final int round;
  final int? totalRounds;
  final Situation? item;
  final String categoryName;
  final bool dealBreaker;
  final bool anonymous;
  final bool predict;

  /// Bu turda oy verebilenler (katılımcılar).
  final List<String> voters;

  /// Oyunu (ve tahmin modunda tahminini) tamamlayanlar. Ne dedikleri gitmez.
  final List<String> done;

  /// Açıklamada "hazırım" diyenler.
  final List<String> ready;
  final String? myVote;
  final String? myGuess;
  final int serverNow;

  /// 0 = süresiz.
  final int endsAt;
  final int durationMs;

  /// Açıklamadan sonra "Sonraki" bu andan itibaren çalışır.
  final int nextAt;

  /// Tartışma bu anda biter ve sıradaki duruma geçilir; 0 = süresiz.
  final int discussEndsAt;
  final int discussMs;
  final RevealInfo? reveal;
  final Map<String, int> scores;
  final Summary? summary;

  factory RedFlagView.fromJson(Json j) {
    final scores = j.obj('scores');
    return RedFlagView(
      phase: j.str('phase', 'vote'),
      round: j.integer('round'),
      totalRounds: j.intOrNull('totalRounds'),
      item: j.objOrNull('item') == null ? null : Situation.fromJson(j.obj('item')),
      categoryName: j.str('categoryName'),
      dealBreaker: j.boolean('dealBreaker'),
      anonymous: j.boolean('anonymous'),
      predict: j.boolean('predict'),
      voters: j.strs('voters'),
      done: j.strs('done'),
      ready: j.strs('ready'),
      myVote: j.strOrNull('myVote'),
      myGuess: j.strOrNull('myGuess'),
      serverNow: j.integer('serverNow'),
      endsAt: j.integer('endsAt'),
      durationMs: j.integer('durationMs'),
      nextAt: j.integer('nextAt'),
      discussEndsAt: j.integer('discussEndsAt'),
      discussMs: j.integer('discussMs'),
      reveal: j.objOrNull('reveal') == null ? null : RevealInfo.fromJson(j.obj('reveal')),
      scores: {for (final k in scores.keys) k: scores.integer(k)},
      summary: j.objOrNull('summary') == null ? null : Summary.fromJson(j.obj('summary')),
    );
  }
}

class CategoryInfo {
  const CategoryInfo({required this.id, required this.name, required this.count});
  final String id;
  final String name;
  final int count;
  factory CategoryInfo.fromJson(Json j) => CategoryInfo(id: j.str('id'), name: j.str('name'), count: j.integer('count'));
}
