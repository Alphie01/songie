// games/frequency/shared/index.ts karşılığı.
import '../../shared/models.dart';

const gameId = 'frequency';
const teamIds = ['a', 'b'];
const modes = ['teams', 'coop'];

/// Takımlı mod: hedef puan.
const targetScoreOptions = [10, 15];

/// Birlikte modu: tur sayısı.
const roundOptions = [7, 10, 13];

/// Kadran süresi; 0 = süresiz.
const secondsOptions = [0, 60, 90];

/// Süreli oyunda rakibin "sağda mı, solda mı" süresi.
const sideSeconds = 30;

const minTeam = 2;

/* ---------- Kadran ve puan bantları ----------
 * Kadran 0 (sol uç) ile 100 (sağ uç) arasında. Hedef bölgesi 5 banttan oluşur: 2-3-4-3-2.
 * Her bant kadranın %4'ü genişliğinde; hedef bölgesi toplam %20.
 * Sınırlar dahildir: merkezden tam 2 uzaklık hâlâ 4 puandır.
 */
const dialMin = 0.0;
const dialMax = 100.0;
const dialStart = 50.0;
const bandWidth = 4.0;
const bands = <({int points, double maxDistance})>[
  (points: 4, maxDistance: bandWidth / 2),
  (points: 3, maxDistance: bandWidth * 1.5),
  (points: 2, maxDistance: bandWidth * 2.5),
];

/// Hedef merkezi bu aralıktan seçilir.
const targetMin = 3;
const targetMax = 97;
const bullseye = 4;

int scoreFor(double dial, double target) {
  final d = (dial - target).abs();
  for (final b in bands) {
    if (d <= b.maxDistance + 1e-9) return b.points;
  }
  return 0;
}

/// Kadrandaki konum hedefin neresinde? Eşitse ikisi de değil.
String? sideOf(double dial, double target) {
  if (target < dial) return 'left';
  if (target > dial) return 'right';
  return null;
}

/// Birlikte modu derecesi: 0 (en kötü) – 4 (en iyi).
const ratingThresholds = [0.25, 0.45, 0.6, 0.75];
int ratingFor(int score, int rounds) {
  final ratio = rounds > 0 ? score / (rounds * bullseye) : 0;
  var r = 0;
  for (final t in ratingThresholds) {
    if (ratio >= t) r++;
  }
  return r;
}

class FrequencySettings {
  const FrequencySettings({
    required this.mode,
    required this.teams,
    required this.targetScore,
    required this.rounds,
    required this.seconds,
    required this.cardChoice,
    required this.majorityLock,
    required this.catchUp,
    required this.friendCards,
  });

  /// teams | coop
  final String mode;
  final Map<String, List<String>> teams;
  final int targetScore;
  final int rounds;
  final int seconds;
  final bool cardChoice;
  final bool majorityLock;
  final bool catchUp;
  final bool friendCards;

  factory FrequencySettings.fromJson(Json j) {
    final teams = j.obj('teams');
    return FrequencySettings(
      mode: j.str('mode', 'teams'),
      teams: {'a': teams.strs('a'), 'b': teams.strs('b')},
      targetScore: j.integer('targetScore', 10),
      rounds: j.integer('rounds', 7),
      seconds: j.integer('seconds', 0),
      cardChoice: j.boolean('cardChoice', true),
      majorityLock: j.boolean('majorityLock'),
      catchUp: j.boolean('catchUp', true),
      friendCards: j.boolean('friendCards', true),
    );
  }
}

class SpectrumCard {
  const SpectrumCard({required this.id, required this.left, required this.right});
  final String id;
  final String left;
  final String right;
  factory SpectrumCard.fromJson(Json j) => SpectrumCard(id: j.str('id'), left: j.str('left'), right: j.str('right'));
}

class RoundSummary {
  const RoundSummary({
    required this.id,
    required this.team,
    required this.psychicId,
    required this.card,
    required this.clue,
    required this.target,
    required this.dial,
    required this.points,
    required this.side,
    required this.sidePoint,
    required this.again,
  });
  final int id;
  final String team;
  final String psychicId;
  final SpectrumCard card;
  final String? clue;
  final double target;
  final double dial;
  final int points;

  /// left | right | null
  final String? side;

  /// Rakip tahmini puan getirdi mi (null = tahmin yok).
  final bool? sidePoint;

  /// Yetişme kuralı işledi: aynı takım tekrar oynar / birlikte modunda +1 tur.
  final bool again;

  factory RoundSummary.fromJson(Json j) => RoundSummary(
    id: j.integer('id'),
    team: j.str('team', 'a'),
    psychicId: j.str('psychicId'),
    card: SpectrumCard.fromJson(j.obj('card')),
    clue: j.strOrNull('clue'),
    target: j.number('target'),
    dial: j.number('dial'),
    points: j.integer('points'),
    side: j.strOrNull('side'),
    sidePoint: j['sidePoint'] is bool ? j['sidePoint'] as bool : null,
    again: j.boolean('again'),
  );
}

class FrequencyView {
  const FrequencyView({
    required this.phase,
    required this.mode,
    required this.teams,
    required this.scores,
    required this.myTeam,
    required this.role,
    required this.roundId,
    required this.completed,
    required this.totalRounds,
    required this.targetScore,
    required this.team,
    required this.psychicId,
    required this.options,
    required this.card,
    required this.target,
    required this.clue,
    required this.dial,
    required this.dialBy,
    required this.lockVotes,
    required this.votesNeeded,
    required this.side,
    required this.sideBy,
    required this.result,
    required this.history,
    required this.winner,
    required this.rating,
    required this.serverNow,
    required this.endsAt,
    required this.durationMs,
    required this.podiumMs,
  });

  /// pick | clue | dial | side | reveal | podium
  final String phase;

  /// teams | coop
  final String mode;
  final Map<String, List<String>> teams;
  final Map<String, int> scores;
  final String? myTeam;

  /// psychic | dialer | opponent | spectator
  final String role;

  /// Tur kimliği; hamleler bununla eşleşir.
  final int roundId;

  /// Tamamlanan tur sayısı.
  final int completed;
  final int? totalRounds;
  final int? targetScore;
  final String team;
  final String psychicId;
  final List<SpectrumCard>? options;
  final SpectrumCard? card;

  /// Yalnızca medyuma (açıklamaya kadar).
  final double? target;
  final String? clue;
  final double dial;
  final String? dialBy;
  final List<String> lockVotes;
  final int votesNeeded;
  final String? side;
  final String? sideBy;
  final RoundSummary? result;
  final List<RoundSummary> history;

  /// a | b | coop | draw | null
  final String? winner;
  final int? rating;
  final int serverNow;
  final int endsAt;
  final int durationMs;
  final int podiumMs;

  factory FrequencyView.fromJson(Json j) {
    final teams = j.obj('teams');
    final scores = j.obj('scores');
    return FrequencyView(
      phase: j.str('phase', 'pick'),
      mode: j.str('mode', 'teams'),
      teams: {'a': teams.strs('a'), 'b': teams.strs('b')},
      scores: {'a': scores.integer('a'), 'b': scores.integer('b')},
      myTeam: j.strOrNull('myTeam'),
      role: j.str('role', 'spectator'),
      roundId: j.integer('roundId'),
      completed: j.integer('completed'),
      totalRounds: j.intOrNull('totalRounds'),
      targetScore: j.intOrNull('targetScore'),
      team: j.str('team', 'a'),
      psychicId: j.str('psychicId'),
      options: j['options'] is List ? j.objs('options').map(SpectrumCard.fromJson).toList() : null,
      card: j.objOrNull('card') == null ? null : SpectrumCard.fromJson(j.obj('card')),
      target: j.numOrNull('target'),
      clue: j.strOrNull('clue'),
      dial: j.number('dial', dialStart),
      dialBy: j.strOrNull('dialBy'),
      lockVotes: j.strs('lockVotes'),
      votesNeeded: j.integer('votesNeeded', 1),
      side: j.strOrNull('side'),
      sideBy: j.strOrNull('sideBy'),
      result: j.objOrNull('result') == null ? null : RoundSummary.fromJson(j.obj('result')),
      history: j.objs('history').map(RoundSummary.fromJson).toList(),
      winner: j.strOrNull('winner'),
      rating: j.intOrNull('rating'),
      serverNow: j.integer('serverNow'),
      endsAt: j.integer('endsAt'),
      durationMs: j.integer('durationMs'),
      podiumMs: j.integer('podiumMs', 9000),
    );
  }
}
