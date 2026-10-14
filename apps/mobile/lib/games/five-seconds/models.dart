// games/five-seconds/shared/index.ts karşılığı.
import '../../shared/models.dart';

const gameId = 'five-seconds';
const teamIds = ['a', 'b'];

const secondsOptions = [5, 7, 10];

/// Oyuncu başına sıra sayısı; 0 = oda sahibi bitirene kadar.
const roundOptions = [3, 5, 0];

const customCategory = 'arkadas';
const categoryIds = ['genel', 'ask', 'is-okul', 'yemek', 'turkiye', 'pop-kultur', 'sacma', 'cesur', 'yatak-odasi', 'sarhos-gece', 'sinirsiz', 'cift-odasi'];

/// Varsayılan kapalı, yalnızca yetişkinler için kategoriler.
const adultCategories = ['cesur', 'yatak-odasi', 'sarhos-gece', 'sinirsiz', 'cift-odasi'];

/// Yalnızca partnerle ikili oynanır; görevler partnere yöneliktir.
const coupleCategory = 'cift-odasi';
bool isAdultCategory(String id) => adultCategories.contains(id);

/// PlayView.tsx `CATEGORY_LABEL`: görev kartındaki kategori etiketi.
const categoryLabel = <String, String>{
  'genel': 'Genel',
  'ask': 'Aşk ve ilk buluşma',
  'is-okul': 'İş ve okul',
  'yemek': 'Yemek',
  'turkiye': 'Türkiye',
  'pop-kultur': 'Pop kültür',
  'sacma': 'Saçma sapan',
  'cesur': 'Cesur',
  'yatak-odasi': 'Yatak odası',
  'sarhos-gece': 'Sarhoş gece',
  'sinirsiz': 'Sınırsız',
  'cift-odasi': 'Çift odası',
  'arkadas': 'Arkadaş görevi',
};

class FiveSecondsSettings {
  const FiveSecondsSettings({
    required this.seconds,
    required this.rounds,
    required this.steal,
    required this.teamMode,
    required this.teamA,
    required this.teamB,
    required this.categories,
  });
  final int seconds;

  /// Oyuncu başına sıra; 0 = sınırsız.
  final int rounds;

  /// Başaramazsa sıradaki oyuncu aynı görevi dener.
  final bool steal;
  final bool teamMode;

  /// Takım modu için oyuncu kimlikleri; seçilmeyenler başlarken dağıtılır.
  final List<String> teamA;
  final List<String> teamB;
  final List<String> categories;

  factory FiveSecondsSettings.fromJson(Json j) {
    final teams = j.obj('teams');
    return FiveSecondsSettings(
      seconds: j.integer('seconds', 5),
      rounds: j.integer('rounds', 3),
      steal: j.boolean('steal'),
      teamMode: j.boolean('teamMode'),
      teamA: teams.strs('a'),
      teamB: teams.strs('b'),
      categories: j.strs('categories'),
    );
  }
}

class FivePrompt {
  const FivePrompt({required this.id, required this.text, required this.category});
  final String id;
  final String text;
  final String category;
  factory FivePrompt.fromJson(Json j) => FivePrompt(id: j.str('id'), text: j.str('text'), category: j.str('category'));
}

class AttemptResult {
  const AttemptResult({
    required this.attemptId,
    required this.performerId,
    required this.prompt,
    required this.success,
    required this.yes,
    required this.no,
    required this.steal,
    this.scorerId,
    required this.skipped,
  });
  final String attemptId;
  final String performerId;
  final String prompt;
  final bool success;
  final int yes;
  final int no;

  /// Çalma denemesiydi.
  final bool steal;

  /// Puan kimin hanesine yazıldı (başarısızsa null).
  final String? scorerId;
  final bool skipped;

  factory AttemptResult.fromJson(Json j) => AttemptResult(
    attemptId: j.str('attemptId'),
    performerId: j.str('performerId'),
    prompt: j.str('prompt'),
    success: j.boolean('success'),
    yes: j.integer('yes'),
    no: j.integer('no'),
    steal: j.boolean('steal'),
    scorerId: j.strOrNull('scorerId'),
    skipped: j.boolean('skipped'),
  );
}

class FiveSecondsView {
  const FiveSecondsView({
    required this.phase,
    required this.order,
    required this.scores,
    required this.teamMode,
    this.teams,
    this.teamScores,
    this.myTeam,
    required this.round,
    this.totalRounds,
    required this.attemptId,
    required this.performerId,
    this.stealFrom,
    this.prompt,
    required this.serverNow,
    required this.endsAt,
    required this.durationMs,
    required this.voteEndsAt,
    required this.voteMs,
    required this.voted,
    required this.voters,
    this.myVote,
    this.tally,
    this.lastResult,
    required this.steal,
  });

  /// ready | countdown | vote | podium
  final String phase;

  /// Sıra düzeni (oyuncu kimlikleri).
  final List<String> order;
  final Map<String, int> scores;
  final bool teamMode;

  /// Takım → oyuncular (`a`, `b`); takım modu değilse null.
  final Map<String, List<String>>? teams;
  final Map<String, int>? teamScores;
  final String? myTeam;

  /// 1'den başlar.
  final int round;
  final int? totalRounds;
  final String attemptId;
  final String performerId;

  /// Çalma denemesi: asıl oyuncu kimdi.
  final String? stealFrom;

  /// Hazırım'dan önce null (çalma denemesi hariç: görev zaten açılmıştır).
  final FivePrompt? prompt;
  final int serverNow;
  final int endsAt;
  final int durationMs;
  final int voteEndsAt;
  final int voteMs;

  /// Oy verenler (ne verdikleri gizli).
  final List<String> voted;

  /// Oy vermesi beklenen bağlı oyuncular.
  final List<String> voters;
  final bool? myVote;

  /// Oylamada anlık toplam; oylama dışında null.
  final ({int yes, int no})? tally;
  final AttemptResult? lastResult;
  final bool steal;

  int score(String id) => scores[id] ?? 0;

  static Map<String, int> _ints(Json j) => {
    for (final e in j.entries)
      if (e.value is num) e.key: (e.value as num).toInt(),
  };

  factory FiveSecondsView.fromJson(Json j) {
    final teams = j.objOrNull('teams');
    final teamScores = j.objOrNull('teamScores');
    final tally = j.objOrNull('tally');
    final myVote = j['myVote'];
    return FiveSecondsView(
      phase: j.str('phase', 'ready'),
      order: j.strs('order'),
      scores: _ints(j.obj('scores')),
      teamMode: j.boolean('teamMode'),
      teams: teams == null ? null : {for (final t in teamIds) t: teams.strs(t)},
      teamScores: teamScores == null ? null : _ints(teamScores),
      myTeam: j.strOrNull('myTeam'),
      round: j.integer('round', 1),
      totalRounds: j.intOrNull('totalRounds'),
      attemptId: j.str('attemptId'),
      performerId: j.str('performerId'),
      stealFrom: j.strOrNull('stealFrom'),
      prompt: j.objOrNull('prompt') == null ? null : FivePrompt.fromJson(j.obj('prompt')),
      serverNow: j.integer('serverNow'),
      endsAt: j.integer('endsAt'),
      durationMs: j.integer('durationMs'),
      voteEndsAt: j.integer('voteEndsAt'),
      voteMs: j.integer('voteMs'),
      voted: j.strs('voted'),
      voters: j.strs('voters'),
      myVote: myVote is bool ? myVote : null,
      tally: tally == null ? null : (yes: tally.integer('yes'), no: tally.integer('no')),
      lastResult: j.objOrNull('lastResult') == null ? null : AttemptResult.fromJson(j.obj('lastResult')),
      steal: j.boolean('steal'),
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
