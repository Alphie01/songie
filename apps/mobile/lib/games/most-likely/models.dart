// games/most-likely/shared/index.ts karşılığı.
import '../../shared/models.dart';

const gameId = 'most-likely';
const minPlayers = 3;
const maxPlayers = 16;

/// Oy süresi (sn); 0 = süresiz.
const secondsOptions = [0, 15, 30];

/// Tur sayısı; 0 = sınırsız (oda sahibi bitirene kadar).
const roundOptions = [10, 20, 0];

const customCategory = 'arkadas';
const categoryIds = [
  'genel',
  'arkadaslik',
  'ask',
  'is-okul',
  'gelecek',
  'utanc',
  'aliskanliklar',
  'cesur',
  'yatak-odasi',
  'sarhos-gece',
  'sinir-testi',
  'sinirsiz',
];

/// Yetişkin kategoriler: varsayılan kapalı, seçilince lobide uyarı çıkar.
const adultCategoryIds = ['cesur', 'yatak-odasi', 'sarhos-gece', 'sinir-testi', 'sinirsiz'];

const _defaultCategories = ['genel', 'arkadaslik', 'ask', 'is-okul', 'gelecek', 'aliskanliklar', customCategory];

class MostLikelySettings {
  const MostLikelySettings({
    required this.categories,
    required this.selfVote,
    required this.anonymous,
    required this.predict,
    required this.seconds,
    required this.rounds,
  });
  final List<String> categories;

  /// Oyuncu kendine oy verebilir mi.
  final bool selfVote;

  /// true: kim kime verdi hiç gönderilmez; false: açıklamada gösterilir.
  final bool anonymous;

  /// Oy verirken "Sence kim kazanacak?" tahmini; doğru tahmin +1 puan.
  final bool predict;
  final int seconds;
  final int rounds;

  static const defaults = MostLikelySettings(categories: _defaultCategories, selfVote: true, anonymous: true, predict: false, seconds: 30, rounds: 10);

  factory MostLikelySettings.fromJson(Json j) => MostLikelySettings(
    categories: j['categories'] is List ? j.strs('categories') : defaults.categories,
    selfVote: j.boolean('selfVote', defaults.selfVote),
    anonymous: j.boolean('anonymous', defaults.anonymous),
    predict: j.boolean('predict', defaults.predict),
    seconds: j.integer('seconds', defaults.seconds),
    rounds: j.integer('rounds', defaults.rounds),
  );

  Json toJson() => {'categories': categories, 'selfVote': selfVote, 'anonymous': anonymous, 'predict': predict, 'seconds': seconds, 'rounds': rounds};

  MostLikelySettings copyWith({List<String>? categories, bool? selfVote, bool? anonymous, bool? predict, int? seconds, int? rounds}) => MostLikelySettings(
    categories: categories ?? this.categories,
    selfVote: selfVote ?? this.selfVote,
    anonymous: anonymous ?? this.anonymous,
    predict: predict ?? this.predict,
    seconds: seconds ?? this.seconds,
    rounds: rounds ?? this.rounds,
  );
}

class Prompt {
  const Prompt({required this.id, required this.text, required this.category});
  final String id;

  /// "Aramızdaki en … kim?" kalıbındaki boşluk, ör. "geç kalan".
  final String text;
  final String category;
  factory Prompt.fromJson(Json j) => Prompt(id: j.str('id'), text: j.str('text'), category: j.str('category'));
}

class Person {
  const Person({required this.id, required this.nick, required this.avatar, required this.connected, required this.present});
  final String id;
  final String nick;
  final Avatar avatar;
  final bool connected;

  /// Odadan ayrıldıysa false (oy alamaz, beklenmez).
  final bool present;
  factory Person.fromJson(Json j) => Person(
    id: j.str('id'),
    nick: j.str('nick'),
    avatar: Avatar.fromJson(j['avatar']),
    connected: j.boolean('connected'),
    present: j.boolean('present', true),
  );
}

class VoteCount {
  const VoteCount({required this.id, required this.votes});
  final String id;
  final int votes;
  factory VoteCount.fromJson(Json j) => VoteCount(id: j.str('id'), votes: j.integer('votes'));
}

class Ballot {
  const Ballot({required this.voter, required this.target});
  final String voter;
  final String target;
  factory Ballot.fromJson(Json j) => Ballot(voter: j.str('voter'), target: j.str('target'));
}

class RoundResult {
  const RoundResult({required this.counts, required this.winners, required this.total, this.ballots, this.correctGuessers});

  /// Oy alan herkes, çoktan aza.
  final List<VoteCount> counts;

  /// Unvan sahipleri (beraberlikte hepsi). Hiç oy yoksa boş.
  final List<String> winners;
  final int total;

  /// Yalnızca açık oylarda: kim kime verdi. İsimsiz modda null.
  final List<Ballot>? ballots;

  /// Tahmin modunda doğru tahmin edenler; kapalıysa null.
  final List<String>? correctGuessers;

  factory RoundResult.fromJson(Json j) => RoundResult(
    counts: j.objs('counts').map(VoteCount.fromJson).toList(),
    winners: j.strs('winners'),
    total: j.integer('total'),
    ballots: j['ballots'] is List ? j.objs('ballots').map(Ballot.fromJson).toList() : null,
    correctGuessers: j['correctGuessers'] is List ? j.strs('correctGuessers') : null,
  );
}

class TitleEntry {
  const TitleEntry({required this.round, required this.text, required this.winners, required this.votes});
  final int round;
  final String text;
  final List<String> winners;
  final int votes;
  factory TitleEntry.fromJson(Json j) => TitleEntry(round: j.integer('round'), text: j.str('text'), winners: j.strs('winners'), votes: j.integer('votes'));
}

class MostLikelyView {
  const MostLikelyView({
    required this.phase,
    required this.round,
    this.totalRounds,
    required this.prompt,
    required this.people,
    required this.selfVote,
    required this.anonymous,
    required this.predict,
    required this.voted,
    required this.guessed,
    required this.waitingFor,
    this.myVote,
    this.myGuess,
    required this.serverNow,
    required this.endsAt,
    required this.durationMs,
    this.result,
    required this.history,
    required this.guessScores,
  });

  /// vote | reveal | podium
  final String phase;
  final int round;
  final int? totalRounds;
  final Prompt prompt;
  final List<Person> people;

  /// Bu turun kuralları (ayar değişikliği sıradaki turdan itibaren).
  final bool selfVote;
  final bool anonymous;
  final bool predict;

  /// Oyunu vermiş olanlar (kime verdiği gizli).
  final List<String> voted;

  /// Tahmin modunda tahminini yapmış olanlar.
  final List<String> guessed;

  /// Hâlâ beklenen bağlı oyuncular.
  final List<String> waitingFor;
  final String? myVote;
  final String? myGuess;
  final int serverNow;

  /// 0 = süresiz.
  final int endsAt;
  final int durationMs;

  /// Yalnızca açıklama aşamasında.
  final RoundResult? result;

  /// Açılmış turların unvanları, eskiden yeniye.
  final List<TitleEntry> history;

  /// Tahmin puanları.
  final Map<String, int> guessScores;

  factory MostLikelyView.fromJson(Json j) {
    final scores = j.obj('guessScores');
    return MostLikelyView(
      phase: j.str('phase', 'vote'),
      round: j.integer('round', 1),
      totalRounds: j.intOrNull('totalRounds'),
      prompt: Prompt.fromJson(j.obj('prompt')),
      people: j.objs('people').map(Person.fromJson).toList(),
      selfVote: j.boolean('selfVote', true),
      anonymous: j.boolean('anonymous', true),
      predict: j.boolean('predict'),
      voted: j.strs('voted'),
      guessed: j.strs('guessed'),
      waitingFor: j.strs('waitingFor'),
      myVote: j.strOrNull('myVote'),
      myGuess: j.strOrNull('myGuess'),
      serverNow: j.integer('serverNow'),
      endsAt: j.integer('endsAt'),
      durationMs: j.integer('durationMs'),
      result: j.objOrNull('result') == null ? null : RoundResult.fromJson(j.obj('result')),
      history: j.objs('history').map(TitleEntry.fromJson).toList(),
      guessScores: {for (final k in scores.keys) k: scores.integer(k)},
    );
  }
}

/// Oyuncunun kazandığı unvanlar (geçmişte kazanan olduğu sorular).
List<String> titlesOf(MostLikelyView view, String id) => [
  for (final h in view.history)
    if (h.winners.contains(id)) h.text,
];

class CategoryInfo {
  const CategoryInfo({required this.id, required this.name, required this.count});
  final String id;
  final String name;
  final int count;
  factory CategoryInfo.fromJson(Json j) => CategoryInfo(id: j.str('id'), name: j.str('name'), count: j.integer('count'));
}

/// "Aramızdaki en … kim?" kalıbını temizler: baştaki "aramızdaki en"/"en", sondaki "kim?" atılır.
String cleanPromptText(String raw) {
  var t = raw.trim().replaceAll(RegExp(r'\s+'), ' ');
  t = t
      .replaceFirst(RegExp(r'^aramızdaki\s+', caseSensitive: false, unicode: true), '')
      .replaceFirst(RegExp(r'^en\s+', caseSensitive: false, unicode: true), '');
  t = t.replaceFirst(RegExp(r'\s*kim\s*\??\s*$', caseSensitive: false, unicode: true), '').replaceFirst(RegExp(r'[?.!…]+$', unicode: true), '').trim();
  return t;
}
