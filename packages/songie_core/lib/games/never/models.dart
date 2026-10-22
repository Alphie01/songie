// games/never/shared/index.ts karşılığı.
import '../../shared/models.dart';

const livesOptions = [3, 5, 10, 0];
const secondsOptions = [0, 15, 30];
const roundOptions = [10, 20, 0];
const customCategory = 'arkadas';

const categoryNames = <String, String>{
  'genel': 'Genel',
  'okul-is': 'Okul ve iş',
  'ask-iliski': 'Aşk ve ilişki',
  'seyahat': 'Seyahat',
  'utanc': 'Utanç',
  'teknoloji': 'Teknoloji',
  'yemek': 'Yemek',
  'cesur': 'Cesur (+18)',
  'yatak-odasi': 'Yatak odası (+18)',
  'fantezi': 'Fantezi (+18)',
  'sinirsiz': 'Sınırsız (+18)',
  'sinir-testi': 'Sınır testi (+18)',
  'cift-odasi': 'Çift odası (+18)',
  customCategory: 'Arkadaş cümleleri',
};

const adultCategories = ['cesur', 'yatak-odasi', 'fantezi', 'sinirsiz', 'sinir-testi', 'cift-odasi'];
const coupleCategory = 'cift-odasi';
bool isAdultCategory(String id) => adultCategories.contains(id);

class NeverSettings {
  const NeverSettings({required this.categories, required this.lives, required this.anonymous, required this.seconds, required this.rounds});
  final List<String> categories;
  final int lives;
  final bool anonymous;
  final int seconds;
  final int rounds;

  factory NeverSettings.fromJson(Json j) => NeverSettings(
    categories: j.strs('categories'),
    lives: j.integer('lives', 5),
    anonymous: j.boolean('anonymous'),
    seconds: j.integer('seconds', 30),
    rounds: j.integer('rounds', 20),
  );

  Json toJson() => {'categories': categories, 'lives': lives, 'anonymous': anonymous, 'seconds': seconds, 'rounds': rounds};

  NeverSettings copyWith({List<String>? categories, int? lives, bool? anonymous, int? seconds, int? rounds}) => NeverSettings(
    categories: categories ?? this.categories,
    lives: lives ?? this.lives,
    anonymous: anonymous ?? this.anonymous,
    seconds: seconds ?? this.seconds,
    rounds: rounds ?? this.rounds,
  );
}

class Statement {
  const Statement({required this.id, required this.text, required this.category});
  final String id;
  final String text;
  final String category;
  factory Statement.fromJson(Json j) => Statement(id: j.str('id'), text: j.str('text'), category: j.str('category'));
}

class PlayerInfo {
  const PlayerInfo({required this.id, this.lives, required this.eliminated, required this.answered, required this.active, this.didCount});
  final String id;
  final int? lives;
  final bool eliminated;
  final bool answered;
  final bool active;
  final int? didCount;
  factory PlayerInfo.fromJson(Json j) => PlayerInfo(
    id: j.str('id'),
    lives: j.intOrNull('lives'),
    eliminated: j.boolean('eliminated'),
    answered: j.boolean('answered'),
    active: j.boolean('active'),
    didCount: j.intOrNull('didCount'),
  );
}

class RoundSummary {
  const RoundSummary({
    required this.round,
    required this.text,
    required this.didCount,
    required this.answered,
    required this.total,
    this.didIds,
    this.eliminatedIds,
    this.storytellerId,
  });
  final int round;
  final String text;
  final int didCount;
  final int answered;
  final int total;
  final List<String>? didIds;
  final List<String>? eliminatedIds;
  final String? storytellerId;
  factory RoundSummary.fromJson(Json j) => RoundSummary(
    round: j.integer('round'),
    text: j.str('text'),
    didCount: j.integer('didCount'),
    answered: j.integer('answered'),
    total: j.integer('total'),
    didIds: j['didIds'] is List ? j.strs('didIds') : null,
    eliminatedIds: j['eliminatedIds'] is List ? j.strs('eliminatedIds') : null,
    storytellerId: j.strOrNull('storytellerId'),
  );
}

class PodiumPlayer {
  const PodiumPlayer({required this.id, required this.did, required this.didNot, this.lives, required this.eliminated});
  final String id;
  final int did;
  final int didNot;
  final int? lives;
  final bool eliminated;
  factory PodiumPlayer.fromJson(Json j) =>
      PodiumPlayer(id: j.str('id'), did: j.integer('did'), didNot: j.integer('didNot'), lives: j.intOrNull('lives'), eliminated: j.boolean('eliminated'));
}

class PodiumStats {
  const PodiumStats({required this.rounds, this.players, this.hottest, this.winners, this.me});
  final int rounds;
  final List<PodiumPlayer>? players;
  final ({String text, int didCount, int total})? hottest;
  final List<String>? winners;
  final ({int did, int didNot})? me;

  factory PodiumStats.fromJson(Json j) {
    final hot = j.objOrNull('hottest');
    final me = j.objOrNull('me');
    return PodiumStats(
      rounds: j.integer('rounds'),
      players: j['players'] is List ? j.objs('players').map(PodiumPlayer.fromJson).toList() : null,
      hottest: hot == null ? null : (text: hot.str('text'), didCount: hot.integer('didCount'), total: hot.integer('total')),
      winners: j['winners'] is List ? j.strs('winners') : null,
      me: me == null ? null : (did: me.integer('did'), didNot: me.integer('didNot')),
    );
  }
}

class NeverView {
  const NeverView({
    required this.phase,
    required this.round,
    this.totalRounds,
    this.statement,
    required this.serverNow,
    required this.endsAt,
    required this.durationMs,
    required this.anonymous,
    this.maxLives,
    required this.players,
    this.myAnswer,
    required this.canAnswer,
    required this.skipVotes,
    required this.skipNeeded,
    required this.skipMine,
    this.reveal,
    required this.history,
    required this.isFinal,
    this.podium,
  });

  /// question | reveal | podium
  final String phase;
  final int round;
  final int? totalRounds;
  final Statement? statement;
  final int serverNow;
  final int endsAt;
  final int durationMs;
  final bool anonymous;
  final int? maxLives;
  final List<PlayerInfo> players;

  /// did | didNot
  final String? myAnswer;
  final bool canAnswer;
  final int skipVotes;
  final int skipNeeded;
  final bool skipMine;
  final RoundSummary? reveal;
  final List<RoundSummary> history;
  final bool isFinal;
  final PodiumStats? podium;

  factory NeverView.fromJson(Json j) {
    final skip = j.obj('skip');
    return NeverView(
      phase: j.str('phase', 'question'),
      round: j.integer('round', 1),
      totalRounds: j.intOrNull('totalRounds'),
      statement: j.objOrNull('statement') == null ? null : Statement.fromJson(j.obj('statement')),
      serverNow: j.integer('serverNow'),
      endsAt: j.integer('endsAt'),
      durationMs: j.integer('durationMs'),
      anonymous: j.boolean('anonymous'),
      maxLives: j.intOrNull('maxLives'),
      players: j.objs('players').map(PlayerInfo.fromJson).toList(),
      myAnswer: j.strOrNull('myAnswer'),
      canAnswer: j.boolean('canAnswer'),
      skipVotes: skip.integer('votes'),
      skipNeeded: skip.integer('needed'),
      skipMine: skip.boolean('mine'),
      reveal: j.objOrNull('reveal') == null ? null : RoundSummary.fromJson(j.obj('reveal')),
      history: j.objs('history').map(RoundSummary.fromJson).toList(),
      isFinal: j.boolean('final'),
      podium: j.objOrNull('podium') == null ? null : PodiumStats.fromJson(j.obj('podium')),
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
