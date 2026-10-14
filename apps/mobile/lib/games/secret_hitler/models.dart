// games/secret-hitler/shared/index.ts karşılığı.
import '../../shared/models.dart';

const gameId = 'secret-hitler';
const minPlayers = 5;
const maxPlayers = 10;

/// Oda sahibinin bekleyen oyuncu adına "atla" diyebilmesi için geçmesi gereken süre (sn).
const skipAfterOptions = [15, 30, 60, 120];

class SecretHitlerSettings {
  const SecretHitlerSettings({required this.skipAfter});
  final int skipAfter;

  factory SecretHitlerSettings.fromJson(Json j) => SecretHitlerSettings(skipAfter: j.integer('skipAfter', 30));
  Json toJson() => {'skipAfter': skipAfter};
  SecretHitlerSettings copyWith({int? skipAfter}) => SecretHitlerSettings(skipAfter: skipAfter ?? this.skipAfter);
}

// Role: liberal | fascist | hitler. Party ve Policy: liberal | fascist.
// Power: peek | investigate | specialElection | execution. Vote: ja | nein.
// Phase: nominate | vote | presidentLegislate | chancellorLegislate | power | over.

/// Oyuncu sayısına göre rol dağılımı (liberal, faşist; Hitler her zaman 1).
const roleCounts = <int, ({int liberal, int fascist})>{
  5: (liberal: 3, fascist: 1),
  6: (liberal: 4, fascist: 1),
  7: (liberal: 4, fascist: 2),
  8: (liberal: 5, fascist: 2),
  9: (liberal: 5, fascist: 3),
  10: (liberal: 6, fascist: 3),
};

const liberalToWin = 5;
const fascistToWin = 6;
const vetoAt = 5;
const hitlerZone = 3;
const deckLiberal = 6;
const deckFascist = 11;

/// Faşist pistindeki yetkiler: dizideki i. eleman, i+1. faşist yasa çıkınca.
List<String?> fascistTrack(int playerCount) {
  if (playerCount <= 6) return [null, null, 'peek', 'execution', 'execution', null];
  if (playerCount <= 8) return [null, 'investigate', 'specialElection', 'execution', 'execution', null];
  return ['investigate', 'investigate', 'specialElection', 'execution', 'execution', null];
}

/// 5–6 kişide Hitler faşisti tanır; 7+ kişide tanımaz.
bool hitlerKnowsFascists(int playerCount) => playerCount <= 6;

String roleParty(String role) => role == 'liberal' ? 'liberal' : 'fascist';

class SeatView {
  const SeatView({required this.id, required this.alive, required this.voted, required this.investigated});
  final String id;
  final bool alive;

  /// Bu oylamada oy verdi mi (ne verdiği gizli).
  final bool voted;

  /// Sadakati sorgulandı mı (sonuç yalnızca sorgulayan başkanda).
  final bool investigated;

  factory SeatView.fromJson(Json j) =>
      SeatView(id: j.str('id'), alive: j.boolean('alive'), voted: j.boolean('voted'), investigated: j.boolean('investigated'));
}

class MeView {
  const MeView({required this.role, required this.known, required this.investigations});
  final String role;

  /// Bu oyuncunun bildiği diğer gizli roller (faşistler; 5–6 kişide Hitler için faşist).
  final List<({String id, String role})> known;

  /// Başkanken yaptığın sadakat sorgulamaları.
  final List<({String target, String party})> investigations;

  factory MeView.fromJson(Json j) => MeView(
    role: j.str('role', 'liberal'),
    known: [for (final k in j.objs('known')) (id: k.str('id'), role: k.str('role', 'fascist'))],
    investigations: [for (final r in j.objs('investigations')) (target: r.str('target'), party: r.str('party', 'liberal'))],
  );
}

class LastVote {
  const LastVote({required this.president, required this.chancellor, required this.votes, required this.passed});
  final String president;
  final String chancellor;

  /// id → ja | nein
  final Map<String, String> votes;
  final bool passed;

  factory LastVote.fromJson(Json j) => LastVote(
    president: j.str('president'),
    chancellor: j.str('chancellor'),
    votes: {for (final e in j.obj('votes').entries) if (e.value is String) e.key: e.value as String},
    passed: j.boolean('passed'),
  );
}

/// `LogEntry`: `k` türüne göre alanlar dolu gelir.
class ShLogEntry {
  const ShLogEntry({
    required this.k,
    this.president,
    this.chancellor,
    this.ja = const [],
    this.nein = const [],
    this.passed,
    this.count,
    this.policy,
    this.chaos,
    this.deck,
    this.target,
    this.power,
    this.who = const [],
    this.phase,
    this.winner,
    this.reason,
  });
  final String k;
  final String? president;
  final String? chancellor;
  final List<String> ja;
  final List<String> nein;
  final bool? passed;
  final int? count;
  final String? policy;
  final bool? chaos;
  final int? deck;
  final String? target;
  final String? power;
  final List<String> who;
  final String? phase;
  final String? winner;
  final String? reason;

  factory ShLogEntry.fromJson(Json j) => ShLogEntry(
    k: j.str('k'),
    president: j.strOrNull('president'),
    chancellor: j.strOrNull('chancellor'),
    ja: j.strs('ja'),
    nein: j.strs('nein'),
    passed: j['passed'] is bool ? j['passed'] as bool : null,
    count: j.intOrNull('count'),
    policy: j.strOrNull('policy'),
    chaos: j['chaos'] is bool ? j['chaos'] as bool : null,
    deck: j.intOrNull('deck'),
    target: j.strOrNull('target'),
    power: j.strOrNull('power'),
    who: j.strs('who'),
    phase: j.strOrNull('phase'),
    winner: j.strOrNull('winner'),
    reason: j.strOrNull('reason'),
  );
}

class SecretHitlerView {
  const SecretHitlerView({
    required this.phase,
    required this.playerCount,
    required this.seats,
    this.me,
    required this.president,
    this.chancellor,
    this.lastElected,
    required this.eligible,
    required this.liberal,
    required this.fascist,
    required this.track,
    required this.electionTracker,
    required this.deckCount,
    required this.discardCount,
    required this.vetoUnlocked,
    required this.session,
    required this.voteRound,
    this.myVote,
    this.hand,
    required this.vetoRequested,
    required this.vetoDenied,
    this.power,
    this.peek,
    this.lastVote,
    required this.log,
    required this.waitingFor,
    required this.skipAt,
    required this.serverNow,
    this.winner,
    this.winReason,
    this.roles,
    required this.finishAt,
  });

  final String phase;
  final int playerCount;
  final List<SeatView> seats;

  /// Oyuncu değilse (sonradan katılan) null.
  final MeView? me;
  final String president;

  /// Aday ya da seçilmiş şansölye.
  final String? chancellor;
  final ({String president, String chancellor})? lastElected;

  /// Şu an aday gösterilebilecek oyuncular (herkese açık bilgi).
  final List<String> eligible;
  final int liberal;
  final int fascist;
  final List<String?> track;
  final int electionTracker;
  final int deckCount;
  final int discardCount;
  final bool vetoUnlocked;

  /// Oturum numarası: hamleler buna göre eşlenir, gecikmiş tıklamalar yutulur.
  final int session;
  final int voteRound;
  final String? myVote;

  /// Yalnızca elinde kart olan başkana/şansölyeye.
  final List<String>? hand;
  final bool vetoRequested;
  final bool vetoDenied;
  final String? power;

  /// Yalnızca önizleme yapan başkana.
  final List<String>? peek;

  /// Bir önceki oylamanın açılmış oyları.
  final LastVote? lastVote;
  final List<ShLogEntry> log;
  final List<String> waitingFor;

  /// Oda sahibi bu andan sonra "atla" diyebilir (bağlantısı kopan varsa hemen).
  final int skipAt;
  final int serverNow;
  final String? winner;
  final String? winReason;

  /// Yalnızca oyun bitince: herkesin rolü.
  final Map<String, String>? roles;
  final int finishAt;

  SeatView? seat(String id) {
    for (final s in seats) {
      if (s.id == id) return s;
    }
    return null;
  }

  factory SecretHitlerView.fromJson(Json j) {
    final me = j.objOrNull('me');
    final le = j.objOrNull('lastElected');
    final lv = j.objOrNull('lastVote');
    final roles = j.objOrNull('roles');
    return SecretHitlerView(
      phase: j.str('phase', 'nominate'),
      playerCount: j.integer('playerCount'),
      seats: j.objs('seats').map(SeatView.fromJson).toList(),
      me: me == null ? null : MeView.fromJson(me),
      president: j.str('president'),
      chancellor: j.strOrNull('chancellor'),
      lastElected: le == null ? null : (president: le.str('president'), chancellor: le.str('chancellor')),
      eligible: j.strs('eligible'),
      liberal: j.integer('liberal'),
      fascist: j.integer('fascist'),
      track: [for (final p in j.list('track')) p is String ? p : null],
      electionTracker: j.integer('electionTracker'),
      deckCount: j.integer('deckCount'),
      discardCount: j.integer('discardCount'),
      vetoUnlocked: j.boolean('vetoUnlocked'),
      session: j.integer('session'),
      voteRound: j.integer('voteRound'),
      myVote: j.strOrNull('myVote'),
      hand: j['hand'] is List ? j.strs('hand') : null,
      vetoRequested: j.boolean('vetoRequested'),
      vetoDenied: j.boolean('vetoDenied'),
      power: j.strOrNull('power'),
      peek: j['peek'] is List ? j.strs('peek') : null,
      lastVote: lv == null ? null : LastVote.fromJson(lv),
      log: j.objs('log').map(ShLogEntry.fromJson).toList(),
      waitingFor: j.strs('waitingFor'),
      skipAt: j.integer('skipAt'),
      serverNow: j.integer('serverNow'),
      winner: j.strOrNull('winner'),
      winReason: j.strOrNull('winReason'),
      roles: roles == null ? null : {for (final e in roles.entries) if (e.value is String) e.key: e.value as String},
      finishAt: j.integer('finishAt'),
    );
  }
}
