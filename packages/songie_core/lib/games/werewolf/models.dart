// games/werewolf/shared/index.ts karşılığı (istemcinin kullandığı tipler, sabitler ve yardımcılar).
import '../../shared/models.dart';

const gameId = 'werewolf';
const minPlayers = 5;
const maxPlayers = 16;

const roleSecondsOptions = [20, 30, 45];
const discussSecondsOptions = [60, 120, 180];
const voteSecondsOptions = [30, 45, 60];

const chatMax = 200;

/// wolf | villager | seer | doctor | hunter | witch | cupid | fool
typedef Role = String;

/// Lobide açılıp kapanan roller (köylüler kalan yerleri doldurur).
const specialRoles = ['seer', 'doctor', 'hunter', 'witch', 'cupid', 'fool'];
const allRoles = ['wolf', 'villager', 'seer', 'doctor', 'hunter', 'witch', 'cupid', 'fool'];

/// wolves | village
typedef Side = String;
Side sideOf(Role r) => r == 'wolf' ? 'wolves' : 'village';

/// Gece sırası: aşk okçusu yalnızca ilk gece, sonra kurtlar, kahin, doktor, cadı.
typedef NightStep = String;
const nightOrder = ['cupid', 'wolves', 'seer', 'doctor', 'witch'];
/// sequential | simultaneous — sıralı ya da bütün roller aynı anda.
typedef NightMode = String;
const nightModes = ['sequential', 'simultaneous'];

/// Aynı anda düzenindeki mini oyunda kaç ateşböceği yakalanınca iş biter.
const choresGoal = 6;

const stepRole = <NightStep, Role>{'cupid': 'cupid', 'wolves': 'wolf', 'seer': 'seer', 'doctor': 'doctor', 'witch': 'witch'};

/// `roleCountsSchema.shape.wolf.maxValue`.
const wolfMax = 5;

class RoleCounts {
  const RoleCounts({required this.wolf, required this.seer, required this.doctor, required this.hunter, required this.witch, required this.cupid, required this.fool});
  final int wolf;
  final int seer;
  final int doctor;
  final int hunter;
  final int witch;
  final int cupid;
  final int fool;

  factory RoleCounts.fromJson(Json j) => RoleCounts(
    wolf: j.integer('wolf', 2),
    seer: j.integer('seer', 1),
    doctor: j.integer('doctor', 1),
    hunter: j.integer('hunter', 1),
    witch: j.integer('witch', 1),
    cupid: j.integer('cupid'),
    fool: j.integer('fool'),
  );

  Json toJson() => {'wolf': wolf, 'seer': seer, 'doctor': doctor, 'hunter': hunter, 'witch': witch, 'cupid': cupid, 'fool': fool};

  int operator [](Role r) => switch (r) {
    'wolf' => wolf,
    'seer' => seer,
    'doctor' => doctor,
    'hunter' => hunter,
    'witch' => witch,
    'cupid' => cupid,
    'fool' => fool,
    _ => 0,
  };

  /// Tek rolün sayısı değişmiş kopya.
  RoleCounts withRole(Role r, int n) => RoleCounts.fromJson({...toJson(), r: n});

  @override
  bool operator ==(Object other) =>
      other is RoleCounts &&
      other.wolf == wolf &&
      other.seer == seer &&
      other.doctor == doctor &&
      other.hunter == hunter &&
      other.witch == witch &&
      other.cupid == cupid &&
      other.fool == fool;

  @override
  int get hashCode => Object.hash(wolf, seer, doctor, hunter, witch, cupid, fool);
}

/// Oyuncu sayısına göre önerilen dağılım (kalan yerler köylü).
RoleCounts recommendedRoles(int n) {
  final c = n.clamp(minPlayers, maxPlayers);
  return RoleCounts(
    wolf: c <= 5 ? 1 : (c <= 9 ? 2 : (c <= 13 ? 3 : 4)),
    seer: 1,
    doctor: 1,
    hunter: c >= 7 ? 1 : 0,
    witch: c >= 8 ? 1 : 0,
    cupid: c >= 9 ? 1 : 0,
    fool: c >= 11 ? 1 : 0,
  );
}

int specialCount(RoleCounts r) => specialRoles.fold(0, (sum, k) => sum + r[k]);
int villagerCount(RoleCounts r, int n) => n - r.wolf - specialCount(r);

/// Dağılım bu oyuncu sayısıyla oynanabilir mi; değilse oyuncuya gösterilecek metin.
String? rolesProblem(RoleCounts r, int n) {
  if (n < minPlayers || n > maxPlayers) return 'Kurt Adam $minPlayers–$maxPlayers kişiyle oynanır. Şu an $n kişi var.';
  if (r.wolf * 2 >= n) return '$n kişide en fazla ${(n / 2).ceil() - 1} kurt olabilir. Kurt sayısını azalt.';
  if (villagerCount(r, n) < 0) return 'Roller ${r.wolf + specialCount(r)} kişilik ama odada $n kişi var. Bazı rolleri kapat.';
  return null;
}

class WerewolfSettings {
  const WerewolfSettings({
    required this.roles,
    required this.roleSeconds,
    required this.discussSeconds,
    required this.voteSeconds,
    required this.revealRoles,
    required this.doctorNoRepeat,
    required this.openVotes,
    required this.dayTie,
    required this.wolfTie,
    required this.ghostsSeeRoles,
    this.nightMode = 'sequential',
    this.nightEndsEarly = false,
  });
  final RoleCounts roles;
  final int roleSeconds;
  final int discussSeconds;
  final int voteSeconds;
  final bool revealRoles;
  final bool doctorNoRepeat;
  final bool openVotes;

  /// none | runoff
  final String dayTie;

  /// random | none
  final String wolfTie;
  final bool ghostsSeeRoles;
  final NightMode nightMode;

  /// Gecede yapılacak herkes bitirince adım (ya da tur) süreyi beklemeden biter.
  final bool nightEndsEarly;

  /// Eksik alanlar `defaultSettings` değerleriyle dolar.
  factory WerewolfSettings.fromJson(Json j) => WerewolfSettings(
    roles: j['roles'] is Map ? RoleCounts.fromJson(j.obj('roles')) : recommendedRoles(8),
    roleSeconds: j.integer('roleSeconds', 30),
    discussSeconds: j.integer('discussSeconds', 120),
    voteSeconds: j.integer('voteSeconds', 45),
    revealRoles: j.boolean('revealRoles', true),
    doctorNoRepeat: j.boolean('doctorNoRepeat', true),
    openVotes: j.boolean('openVotes', true),
    dayTie: j.str('dayTie', 'runoff'),
    wolfTie: j.str('wolfTie', 'random'),
    ghostsSeeRoles: j.boolean('ghostsSeeRoles', true),
    nightMode: j.str('nightMode', 'sequential'),
    nightEndsEarly: j.boolean('nightEndsEarly'),
  );

  Json toJson() => {
    'roles': roles.toJson(),
    'roleSeconds': roleSeconds,
    'discussSeconds': discussSeconds,
    'voteSeconds': voteSeconds,
    'revealRoles': revealRoles,
    'doctorNoRepeat': doctorNoRepeat,
    'openVotes': openVotes,
    'dayTie': dayTie,
    'wolfTie': wolfTie,
    'ghostsSeeRoles': ghostsSeeRoles,
    'nightMode': nightMode,
    'nightEndsEarly': nightEndsEarly,
  };
}

/// night | hunter | discuss | vote | verdict | over
typedef Phase = String;

/// village | wolves | fool | lovers
typedef Winner = String;

/// wolvesDead | wolvesParity | foolHanged | loversLast | ended
typedef WinReason = String;

class ChatMsg {
  const ChatMsg({required this.n, required this.from, required this.text});
  final int n;
  final String from;
  final String text;
  factory ChatMsg.fromJson(Json j) => ChatMsg(n: j.integer('n'), from: j.str('from'), text: j.str('text'));
}

class Death {
  const Death({required this.id, this.role});
  final String id;
  final Role? role;
  factory Death.fromJson(Json j) => Death(id: j.str('id'), role: j.strOrNull('role'));
}

/// Açık olay günlüğü (herkese). `k`: start | night | dawn | grief | shot | noShot | nominate | noCandidates | runoff | hanged | spared | over.
class LogEntry {
  const LogEntry(this.k, this.j);
  final String k;
  final Json j;
  factory LogEntry.fromJson(Json j) => LogEntry(j.str('k'), j);

  int get players => j.integer('players');
  int get night => j.integer('night');
  List<Death> get deaths => j.objs('deaths').map(Death.fromJson).toList();
  String get id => j.str('id');
  String get partner => j.str('partner');
  Role? get role => j.strOrNull('role');
  String get hunter => j.str('hunter');
  String get target => j.str('target');
  String get by => j.str('by');
  List<String> get candidates => j.strs('candidates');
  int get votes => j.integer('votes');
  bool get tie => j.boolean('tie');
  Winner? get winner => j.strOrNull('winner');
  WinReason get reason => j.str('reason');
}

/// Gece olanlar. `k`: lovers | wolves | seer | doctor | heal | poison | saved.
class SecretEntry {
  const SecretEntry(this.k, this.j);
  final String k;
  final Json j;
  factory SecretEntry.fromJson(Json j) => SecretEntry(j.str('k'), j);

  int get night => j.integer('night');
  String get a => j.str('a');
  String get b => j.str('b');
  String? get target => j.strOrNull('target');
  String get seer => j.str('seer');
  bool get wolf => j.boolean('wolf');
  String get doctor => j.str('doctor');
  String get witch => j.str('witch');
}

class SeatView {
  const SeatView({required this.id, required this.alive, this.role, required this.ready, required this.voted, required this.nominatedBy});
  final String id;
  final bool alive;

  /// Herkese açık rol (öldüyse ve rol açıklama ayarı açıksa, ya da oyun bittiyse).
  final Role? role;
  final bool ready;
  final bool voted;
  final List<String> nominatedBy;

  factory SeatView.fromJson(Json j) => SeatView(
    id: j.str('id'),
    alive: j.boolean('alive', true),
    role: j.strOrNull('role'),
    ready: j.boolean('ready'),
    voted: j.boolean('voted'),
    nominatedBy: j.strs('nominatedBy'),
  );
}

/// Sıra sende olduğunda (yalnızca kendi görünümünde) eylem paneli. Alanlar adıma göre dolar.
class NightTurn {
  const NightTurn({
    required this.step,
    required this.targets,
    this.pair,
    this.votes = const {},
    this.result,
    this.picked,
    this.blocked,
    this.victim,
    this.canHeal = false,
    this.canPoison = false,
    this.done = false,
    this.healed = false,
    this.poisoned,
  });
  final NightStep step;
  final List<String> targets;

  // cupid
  final (String, String)? pair;

  // wolves: kurt → hedef
  final Map<String, String> votes;

  // seer
  final ({String id, bool wolf})? result;

  // doctor
  final String? picked;
  final String? blocked;

  // witch
  final String? victim;
  final bool canHeal;
  final bool canPoison;
  final bool done;
  final bool healed;
  final String? poisoned;

  factory NightTurn.fromJson(Json j) {
    final pair = j.strs('pair');
    final result = j.objOrNull('result');
    final votes = j.obj('votes');
    return NightTurn(
      step: j.str('step'),
      targets: j.strs('targets'),
      pair: pair.length == 2 ? (pair[0], pair[1]) : null,
      votes: {for (final e in votes.entries) if (e.value is String) e.key: e.value as String},
      result: result == null ? null : (id: result.str('id'), wolf: result.boolean('wolf')),
      picked: j.strOrNull('picked'),
      blocked: j.strOrNull('blocked'),
      victim: j.strOrNull('victim'),
      canHeal: j.boolean('canHeal'),
      canPoison: j.boolean('canPoison'),
      done: j.boolean('done'),
      healed: j.boolean('healed'),
      poisoned: j.strOrNull('poisoned'),
    );
  }
}

/// Yalnızca o oyuncunun kendi görünümünde: rol kartı ve rolüne ait gizli bilgiler.
class MeView {
  const MeView({
    required this.role,
    required this.alive,
    required this.allies,
    this.lover,
    this.cupidPair,
    required this.seerResults,
    this.doctorLast,
    this.potions,
    this.turn,
    this.chores,
    this.wolfChat,
  });
  final Role role;
  final bool alive;
  final List<String> allies;
  final ({String id, Side side})? lover;
  final (String, String)? cupidPair;
  final List<({int night, String id, bool wolf})> seerResults;
  final String? doctorLast;
  final ({bool heal, bool poison})? potions;
  final NightTurn? turn;

  /// Aynı anda düzeninde gece mini oyunu: false = sürüyor, true = bitti; yoksa null.
  final bool? chores;
  final List<ChatMsg>? wolfChat;

  factory MeView.fromJson(Json j) {
    final lover = j.objOrNull('lover');
    final pair = j.strs('cupidPair');
    final potions = j.objOrNull('potions');
    final turn = j.objOrNull('turn');
    return MeView(
      role: j.str('role', 'villager'),
      alive: j.boolean('alive', true),
      allies: j.strs('allies'),
      lover: lover == null ? null : (id: lover.str('id'), side: lover.str('side', 'village')),
      cupidPair: pair.length == 2 ? (pair[0], pair[1]) : null,
      seerResults: [for (final r in j.objs('seerResults')) (night: r.integer('night'), id: r.str('id'), wolf: r.boolean('wolf'))],
      doctorLast: j.strOrNull('doctorLast'),
      potions: potions == null ? null : (heal: potions.boolean('heal'), poison: potions.boolean('poison')),
      turn: turn == null ? null : NightTurn.fromJson(turn),
      chores: j['chores'] is bool ? j['chores'] as bool : null,
      wolfChat: j['wolfChat'] is List ? j.objs('wolfChat').map(ChatMsg.fromJson).toList() : null,
    );
  }
}

Map<String, Role>? _roleMap(Json j, String key) {
  final m = j.objOrNull(key);
  if (m == null) return null;
  return {for (final e in m.entries) if (e.value is String) e.key: e.value as String};
}

(String, String)? _pair(Json j, String key) {
  final p = j.strs(key);
  return p.length == 2 ? (p[0], p[1]) : null;
}

List<SecretEntry>? _secret(Json j, String key) => j[key] is List ? j.objs(key).map(SecretEntry.fromJson).toList() : null;

/// Yalnızca ölen oyunculara.
class GhostView {
  const GhostView({required this.chat, this.roles, this.lovers, this.secret});
  final List<ChatMsg> chat;
  final Map<String, Role>? roles;
  final (String, String)? lovers;
  final List<SecretEntry>? secret;

  factory GhostView.fromJson(Json j) => GhostView(
    chat: j.objs('chat').map(ChatMsg.fromJson).toList(),
    roles: _roleMap(j, 'roles'),
    lovers: _pair(j, 'lovers'),
    secret: _secret(j, 'secret'),
  );
}

class VoteResult {
  const VoteResult({required this.round, required this.tally, this.votes, this.hanged, required this.tie, required this.noCandidates});
  final int round;

  /// Aday başına oy (id null = kimse).
  final List<({String? id, int n})> tally;

  /// Açık oyda kim kime verdi; gizli oyda null.
  final Map<String, String?>? votes;
  final String? hanged;
  final bool tie;
  final bool noCandidates;

  factory VoteResult.fromJson(Json j) {
    final votes = j.objOrNull('votes');
    return VoteResult(
      round: j.integer('round', 1),
      tally: [for (final t in j.objs('tally')) (id: t.strOrNull('id'), n: t.integer('n'))],
      votes: votes == null ? null : {for (final e in votes.entries) e.key: e.value is String ? e.value as String : null},
      hanged: j.strOrNull('hanged'),
      tie: j.boolean('tie'),
      noCandidates: j.boolean('noCandidates'),
    );
  }
}

class WerewolfView {
  const WerewolfView({
    required this.phase,
    required this.day,
    required this.session,
    required this.nightSteps,
    this.nightStages = const [],
    this.nightMode = 'sequential',
    this.stageIndex = -1,
    this.nightStep,
    required this.endsAt,
    required this.serverNow,
    required this.seats,
    required this.roleCounts,
    required this.candidates,
    required this.runoff,
    this.liveVotes,
    this.myVote,
    this.myNomination,
    this.lastNight,
    this.lastVote,
    this.hunter,
    required this.log,
    this.me,
    this.ghost,
    this.winner,
    this.winReason,
    this.roles,
    this.lovers,
    this.secret,
    required this.finishAt,
  });
  final Phase phase;
  final int day;
  final int session;
  final List<NightStep> nightSteps;

  /// Bu gecenin turları: sıralı düzende her adım tek başına, aynı anda düzeninde birlikte.
  final List<List<NightStep>> nightStages;
  final NightMode nightMode;

  /// Şu anki tur (nightStages içinde); gece değilse -1.
  final int stageIndex;
  final NightStep? nightStep;
  final int endsAt;
  final int serverNow;
  final List<SeatView> seats;
  final Map<Role, int> roleCounts;
  final List<String> candidates;
  final bool runoff;

  /// Açık oylamada anlık oylar (oy veren → aday ya da null = kimse).
  final Map<String, String?>? liveVotes;

  /// Bu oylamadaki oyun (null = henüz vermedin; target null = kimse).
  final ({String? target})? myVote;
  final String? myNomination;
  final ({int night, List<Death> deaths})? lastNight;
  final VoteResult? lastVote;
  final String? hunter;
  final List<LogEntry> log;
  final MeView? me;
  final GhostView? ghost;
  final Winner? winner;
  final WinReason? winReason;
  final Map<String, Role>? roles;
  final (String, String)? lovers;
  final List<SecretEntry>? secret;
  final int finishAt;

  factory WerewolfView.fromJson(Json j) {
    final counts = j.obj('roleCounts');
    final live = j.objOrNull('liveVotes');
    final myVote = j.objOrNull('myVote');
    final lastNight = j.objOrNull('lastNight');
    final lastVote = j.objOrNull('lastVote');
    final me = j.objOrNull('me');
    final ghost = j.objOrNull('ghost');
    return WerewolfView(
      phase: j.str('phase', 'night'),
      day: j.integer('day'),
      session: j.integer('session'),
      nightSteps: j.strs('nightSteps'),
      nightStages: [for (final st in j.list('nightStages')) if (st is List) st.whereType<String>().toList()],
      nightMode: j.str('nightMode', 'sequential'),
      stageIndex: j.integer('stageIndex', -1),
      nightStep: j.strOrNull('nightStep'),
      endsAt: j.integer('endsAt'),
      serverNow: j.integer('serverNow'),
      seats: j.objs('seats').map(SeatView.fromJson).toList(),
      roleCounts: {for (final r in allRoles) r: counts.integer(r)},
      candidates: j.strs('candidates'),
      runoff: j.boolean('runoff'),
      liveVotes: live == null ? null : {for (final e in live.entries) e.key: e.value is String ? e.value as String : null},
      myVote: myVote == null ? null : (target: myVote.strOrNull('target')),
      myNomination: j.strOrNull('myNomination'),
      lastNight: lastNight == null ? null : (night: lastNight.integer('night'), deaths: lastNight.objs('deaths').map(Death.fromJson).toList()),
      lastVote: lastVote == null ? null : VoteResult.fromJson(lastVote),
      hunter: j.strOrNull('hunter'),
      log: j.objs('log').map(LogEntry.fromJson).toList(),
      me: me == null ? null : MeView.fromJson(me),
      ghost: ghost == null ? null : GhostView.fromJson(ghost),
      winner: j.strOrNull('winner'),
      winReason: j.strOrNull('winReason'),
      roles: _roleMap(j, 'roles'),
      lovers: _pair(j, 'lovers'),
      secret: _secret(j, 'secret'),
      finishAt: j.integer('finishAt'),
    );
  }
}
