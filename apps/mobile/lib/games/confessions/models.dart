// games/confessions/shared/index.ts karşılığı.
import '../../shared/models.dart';

const gameId = 'confessions';

const minPlayers = 3;
const maxPlayers = 16;

const confessionMin = 10;
const confessionMax = 240;
const promptMin = 10;
const promptMax = 140;

/// Yazma süresi (sn); 0 = süresiz (oda sahibi bitirir ya da herkes yazınca).
const writeOptions = [60, 120, 0];

/// Bir itiraf için tahmin süresi (sn).
const guessOptions = [30, 45, 60];

/// Tur sayısı; 0 = sınırsız (oda sahibi bitirir).
const roundOptions = [3, 5, 0];

const customCategory = 'arkadas';
const categoryIds = [
  'genel',
  'cocukluk',
  'okul-is',
  'ask',
  'utanc',
  'aliskanliklar',
  'cesur',
  'yatak-odasi',
  'fantezi',
  'sinir-testi',
  'sinirsiz',
  'cift-odasi',
  customCategory,
];

/// Yetişkin (+18) kategoriler: varsayılan ayarlarda kapalı, lobide uyarıyla gösterilir.
const adultCategories = ['cesur', 'yatak-odasi', 'fantezi', 'sinir-testi', 'sinirsiz', 'cift-odasi'];

/// Yalnızca partnerlerden oluşan masalar için kategori.
const coupleCategory = 'cift-odasi';
bool isAdultCategory(String id) => adultCategories.contains(id);

/// yok | bende | efsane | olamaz
const reactions = ['yok', 'bende', 'efsane', 'olamaz'];

const _defaultCategories = ['genel', 'cocukluk', 'okul-is', 'ask', 'utanc', 'aliskanliklar', customCategory];

class ConfessionsSettings {
  const ConfessionsSettings({
    required this.mode,
    required this.categories,
    required this.writeSeconds,
    required this.guessSeconds,
    required this.rounds,
    required this.hiddenAuthor,
  });

  /// `topics`: her tur bir konu; `free`: serbest itiraf.
  final String mode;
  final List<String> categories;
  final int writeSeconds;
  final int guessSeconds;
  final int rounds;

  /// Yazar hiç açıklanmaz; yalnızca tahmin dağılımı gösterilir, puan yok.
  final bool hiddenAuthor;

  static const defaults = ConfessionsSettings(
    mode: 'topics',
    categories: _defaultCategories,
    writeSeconds: 120,
    guessSeconds: 45,
    rounds: 3,
    hiddenAuthor: false,
  );

  factory ConfessionsSettings.fromJson(Json j) => ConfessionsSettings(
    mode: j.str('mode', defaults.mode),
    categories: j['categories'] is List ? j.strs('categories') : defaults.categories,
    writeSeconds: j.integer('writeSeconds', defaults.writeSeconds),
    guessSeconds: j.integer('guessSeconds', defaults.guessSeconds),
    rounds: j.integer('rounds', defaults.rounds),
    hiddenAuthor: j.boolean('hiddenAuthor', defaults.hiddenAuthor),
  );

  Json toJson() => {
    'mode': mode,
    'categories': categories,
    'writeSeconds': writeSeconds,
    'guessSeconds': guessSeconds,
    'rounds': rounds,
    'hiddenAuthor': hiddenAuthor,
  };

  ConfessionsSettings copyWith({String? mode, List<String>? categories, int? writeSeconds, int? guessSeconds, int? rounds, bool? hiddenAuthor}) =>
      ConfessionsSettings(
        mode: mode ?? this.mode,
        categories: categories ?? this.categories,
        writeSeconds: writeSeconds ?? this.writeSeconds,
        guessSeconds: guessSeconds ?? this.guessSeconds,
        rounds: rounds ?? this.rounds,
        hiddenAuthor: hiddenAuthor ?? this.hiddenAuthor,
      );
}

class Topic {
  const Topic({required this.text, required this.category});
  final String text;
  final String category;
  factory Topic.fromJson(Json j) => Topic(text: j.str('text'), category: j.str('category'));
}

Map<String, int> _counts(Json j) => {for (final r in reactions) r: j.integer(r)};

class CurrentConfession {
  const CurrentConfession({required this.id, this.text, required this.hidden, required this.candidates, required this.reactions, required this.myReactions});
  final String id;

  /// Gizlendiyse null.
  final String? text;
  final bool hidden;

  /// Bu turda itiraf yazan herkes (sen dahil, oyuncu sırasıyla).
  final List<String> candidates;
  final Map<String, int> reactions;
  final List<String> myReactions;

  factory CurrentConfession.fromJson(Json j) => CurrentConfession(
    id: j.str('id'),
    text: j.strOrNull('text'),
    hidden: j.boolean('hidden'),
    candidates: j.strs('candidates'),
    reactions: _counts(j.obj('reactions')),
    myReactions: j.strs('myReactions'),
  );
}

class Pick {
  const Pick({required this.playerId, required this.targetId});
  final String playerId;
  final String targetId;
  factory Pick.fromJson(Json j) => Pick(playerId: j.str('playerId'), targetId: j.str('targetId'));
}

class PointDelta {
  const PointDelta({required this.playerId, required this.delta});
  final String playerId;
  final int delta;
  factory PointDelta.fromJson(Json j) => PointDelta(playerId: j.str('playerId'), delta: j.integer('delta'));
}

class Reveal {
  const Reveal({this.authorId, required this.correct, this.picks, required this.tally, required this.points});

  /// Gizli yazar modunda null.
  final String? authorId;

  /// Doğru bilenler (gizli yazar modunda boş).
  final List<String> correct;

  /// Kim kimi seçti (gizli yazar modunda null). Yazarın kendi seçimi hiç yer almaz.
  final List<Pick>? picks;

  /// Aday başına seçim sayısı.
  final Map<String, int> tally;

  /// Bu itiraftan kazanılan puanlar.
  final List<PointDelta> points;

  factory Reveal.fromJson(Json j) {
    final tally = j.obj('tally');
    return Reveal(
      authorId: j.strOrNull('authorId'),
      correct: j.strs('correct'),
      picks: j['picks'] is List ? j.objs('picks').map(Pick.fromJson).toList() : null,
      tally: {for (final k in tally.keys) k: tally.integer(k)},
      points: j.objs('points').map(PointDelta.fromJson).toList(),
    );
  }
}

class RecapItem {
  const RecapItem({required this.id, required this.text, this.authorId, required this.reactions});
  final String id;
  final String text;
  final String? authorId;
  final Map<String, int> reactions;
  factory RecapItem.fromJson(Json j) =>
      RecapItem(id: j.str('id'), text: j.str('text'), authorId: j.strOrNull('authorId'), reactions: _counts(j.obj('reactions')));
}

class PlayerStat {
  const PlayerStat({required this.score, required this.correct, required this.fooled});
  final int score;

  /// Doğru tahmin sayısı (dedektiflik).
  final int correct;

  /// Yanılttığı oyuncu sayısı.
  final int fooled;
  factory PlayerStat.fromJson(Json j) => PlayerStat(score: j.integer('score'), correct: j.integer('correct'), fooled: j.integer('fooled'));
}

class AwardInfo {
  const AwardInfo({required this.playerId, required this.value});
  final String playerId;
  final int value;
  static AwardInfo? fromJson(Json? j) => j == null ? null : AwardInfo(playerId: j.str('playerId'), value: j.integer('value'));
}

class PodiumInfo {
  const PodiumInfo({this.detective, this.trickster, required this.confessions});
  final AwardInfo? detective;
  final AwardInfo? trickster;
  final int confessions;
  factory PodiumInfo.fromJson(Json j) => PodiumInfo(
    detective: AwardInfo.fromJson(j.objOrNull('detective')),
    trickster: AwardInfo.fromJson(j.objOrNull('trickster')),
    confessions: j.integer('confessions'),
  );
}

class ConfessionsView {
  const ConfessionsView({
    required this.phase,
    required this.round,
    this.totalRounds,
    this.topic,
    required this.hiddenAuthor,
    required this.serverNow,
    required this.endsAt,
    required this.durationMs,
    required this.stats,
    required this.written,
    this.myConfession,
    required this.index,
    required this.count,
    this.current,
    required this.picked,
    this.myPick,
    this.reveal,
    this.recap,
    this.podium,
  });

  /// write | guess | reveal | summary | podium
  final String phase;
  final int round;
  final int? totalRounds;

  /// Serbest modda null.
  final Topic? topic;
  final bool hiddenAuthor;
  final int serverNow;

  /// 0 = süresiz.
  final int endsAt;
  final int durationMs;

  /// Oyuncu sırasıyla skorlar.
  final Map<String, PlayerStat> stats;

  /// Bu tur itiraf yazanlar (oyuncu sırasıyla). Kimin hangisini yazdığı yok.
  final List<String> written;

  /// Yalnızca senin itirafın (yazma aşamasında).
  final String? myConfession;

  /// Sıradaki itiraf (1'den başlar) ve bu turdaki itiraf sayısı.
  final int index;
  final int count;
  final CurrentConfession? current;

  /// Seçimini yapanlar (herkes, yazar dahil).
  final List<String> picked;
  final String? myPick;
  final Reveal? reveal;
  final List<RecapItem>? recap;
  final PodiumInfo? podium;

  factory ConfessionsView.fromJson(Json j) {
    final stats = j.obj('stats');
    return ConfessionsView(
      phase: j.str('phase', 'write'),
      round: j.integer('round', 1),
      totalRounds: j.intOrNull('totalRounds'),
      topic: j.objOrNull('topic') == null ? null : Topic.fromJson(j.obj('topic')),
      hiddenAuthor: j.boolean('hiddenAuthor'),
      serverNow: j.integer('serverNow'),
      endsAt: j.integer('endsAt'),
      durationMs: j.integer('durationMs'),
      stats: {for (final k in stats.keys) k: PlayerStat.fromJson(stats.obj(k))},
      written: j.strs('written'),
      myConfession: j.strOrNull('myConfession'),
      index: j.integer('index'),
      count: j.integer('count'),
      current: j.objOrNull('current') == null ? null : CurrentConfession.fromJson(j.obj('current')),
      picked: j.strs('picked'),
      myPick: j.strOrNull('myPick'),
      reveal: j.objOrNull('reveal') == null ? null : Reveal.fromJson(j.obj('reveal')),
      recap: j['recap'] is List ? j.objs('recap').map(RecapItem.fromJson).toList() : null,
      podium: j.objOrNull('podium') == null ? null : PodiumInfo.fromJson(j.obj('podium')),
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
