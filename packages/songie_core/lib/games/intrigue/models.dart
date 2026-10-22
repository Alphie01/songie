// games/intrigue/shared/index.ts karşılığı.
import '../../shared/models.dart';

const gameId = 'intrigue';

const minPlayers = 2;
const maxPlayers = 10;

/// 2–6 kişide rol başına 3 kart; 7–10 kişide (ya da ayar açıksa) 4 kart.
const smallTableMax = 6;
const startCoins = 2;
const handSize = 2;
const coupCost = 7;
const assassinateCost = 3;
const mustCoupAt = 10;

/// Roller (özgün): hazine, gizli bıçak, koruma, yağma, istihbarat.
const roles = ['treasurer', 'assassin', 'guard', 'pirate', 'spy'];

const actions = ['income', 'aid', 'coup', 'tax', 'assassinate', 'steal', 'exchange'];

/// Eylemin iddia ettiği rol (yoksa null: herkes yapabilir).
const actionRole = <String, String?>{
  'income': null,
  'aid': null,
  'coup': null,
  'tax': 'treasurer',
  'assassinate': 'assassin',
  'steal': 'pirate',
  'exchange': 'spy',
};

/// Eylemi hangi roller engelleyebilir.
const blockRolesOf = <String, List<String>>{
  'income': [],
  'aid': ['treasurer'],
  'coup': [],
  'tax': [],
  'assassinate': ['guard'],
  'steal': ['pirate', 'spy'],
  'exchange': [],
};

const targeted = <String, bool>{
  'income': false,
  'aid': false,
  'coup': true,
  'tax': false,
  'assassinate': true,
  'steal': true,
  'exchange': false,
};

const actionCost = <String, int>{
  'income': 0,
  'aid': 0,
  'coup': coupCost,
  'tax': 0,
  'assassinate': assassinateCost,
  'steal': 0,
  'exchange': 0,
};

const challengeOptions = [5, 8, 12];

/// 0 = süresiz.
const turnOptions = [0, 45, 90];

int cardsPerRole(int players, bool bigDeck) => bigDeck || players > smallTableMax ? 4 : 3;

class IntrigueSettings {
  const IntrigueSettings({required this.challengeSeconds, required this.turnSeconds, required this.bigDeck});

  /// İtiraz/engel penceresi (saniye). Herkes "geç" derse erken kapanır.
  final int challengeSeconds;

  /// Tur süresi (saniye); 0 = süresiz. Süre biterse oyuncu yerine Gelir alınır.
  final int turnSeconds;

  /// Rol başına 4 kart (7–10 kişide kendiliğinden açık).
  final bool bigDeck;

  factory IntrigueSettings.fromJson(Json j) => IntrigueSettings(
    challengeSeconds: j.integer('challengeSeconds', 8),
    turnSeconds: j.integer('turnSeconds', 0),
    bigDeck: j.boolean('bigDeck'),
  );

  Json toJson() => {'challengeSeconds': challengeSeconds, 'turnSeconds': turnSeconds, 'bigDeck': bigDeck};

  IntrigueSettings copyWith({int? challengeSeconds, int? turnSeconds, bool? bigDeck}) => IntrigueSettings(
    challengeSeconds: challengeSeconds ?? this.challengeSeconds,
    turnSeconds: turnSeconds ?? this.turnSeconds,
    bigDeck: bigDeck ?? this.bigDeck,
  );
}

/// `Card`: rol kartı (kimlik rol bilgisi taşımaz).
class IgCard {
  const IgCard({required this.id, required this.role});
  final String id;
  final String role;
  factory IgCard.fromJson(Json j) => IgCard(id: j.str('id'), role: j.str('role', 'treasurer'));
}

class IgPlayer {
  const IgPlayer({required this.id, required this.coins, required this.hidden, required this.revealed, required this.alive, this.out});
  final String id;
  final int coins;

  /// Gizli kart sayısı.
  final int hidden;

  /// Açılmış kartlar (herkese açık).
  final List<String> revealed;
  final bool alive;

  /// Elenme sırası (1 = ilk elenen); oyundaysa null.
  final int? out;

  factory IgPlayer.fromJson(Json j) => IgPlayer(
    id: j.str('id'),
    coins: j.integer('coins'),
    hidden: j.integer('hidden'),
    revealed: j.strs('revealed'),
    alive: j.boolean('alive'),
    out: j.intOrNull('out'),
  );
}

class PendingView {
  const PendingView({required this.actor, required this.action, this.target, this.claim, this.block});
  final String actor;
  final String action;
  final String? target;
  final String? claim;
  final ({String by, String role})? block;

  factory PendingView.fromJson(Json j) {
    final b = j.objOrNull('block');
    return PendingView(
      actor: j.str('actor'),
      action: j.str('action', 'income'),
      target: j.strOrNull('target'),
      claim: j.strOrNull('claim'),
      block: b == null ? null : (by: b.str('by'), role: b.str('role', 'treasurer')),
    );
  }
}

/// `claim` | `block` | `counter`
class WindowView {
  const WindowView({
    required this.id,
    required this.kind,
    required this.claimant,
    this.claimRole,
    required this.eligible,
    required this.passed,
    required this.canChallenge,
    required this.blockers,
    required this.blockRoles,
    required this.endsAt,
  });
  final int id;
  final String kind;

  /// İtiraz edilen ya da edilebilecek kişi.
  final String claimant;
  final String? claimRole;

  /// Bu pencerede söz hakkı olanlar.
  final List<String> eligible;
  final List<String> passed;
  final bool canChallenge;

  /// Engelleyebilecek oyuncular ve roller.
  final List<String> blockers;
  final List<String> blockRoles;
  final int endsAt;

  factory WindowView.fromJson(Json j) => WindowView(
    id: j.integer('id'),
    kind: j.str('kind', 'claim'),
    claimant: j.str('claimant'),
    claimRole: j.strOrNull('claimRole'),
    eligible: j.strs('eligible'),
    passed: j.strs('passed'),
    canChallenge: j.boolean('canChallenge'),
    blockers: j.strs('blockers'),
    blockRoles: j.strs('blockRoles'),
    endsAt: j.integer('endsAt'),
  );
}

class LogEntry {
  const LogEntry({required this.seq, required this.t, this.by, this.to, this.action, this.role, this.ok, this.n});
  final int seq;
  final String t;
  final String? by;
  final String? to;
  final String? action;
  final String? role;

  /// challenge: iddia eden kartı gösterebildi mi.
  final bool? ok;
  final int? n;

  factory LogEntry.fromJson(Json j) => LogEntry(
    seq: j.integer('seq'),
    t: j.str('t'),
    by: j.strOrNull('by'),
    to: j.strOrNull('to'),
    action: j.strOrNull('action'),
    role: j.strOrNull('role'),
    ok: j['ok'] is bool ? j['ok'] as bool : null,
    n: j.intOrNull('n'),
  );
}

/// Son itirazda gösterilen kart (herkese açık).
class FlashView {
  const FlashView({required this.seq, required this.claimant, required this.challenger, required this.role, required this.had});
  final int seq;
  final String claimant;
  final String challenger;
  final String role;
  final bool had;
  factory FlashView.fromJson(Json j) => FlashView(
    seq: j.integer('seq'),
    claimant: j.str('claimant'),
    challenger: j.str('challenger'),
    role: j.str('role', 'treasurer'),
    had: j.boolean('had'),
  );
}

class MeView {
  const MeView({required this.inGame, required this.alive, required this.hand, required this.coins});
  final bool inGame;
  final bool alive;
  final List<IgCard> hand;
  final int coins;
  factory MeView.fromJson(Json j) => MeView(
    inGame: j.boolean('inGame'),
    alive: j.boolean('alive'),
    hand: j.objs('hand').map(IgCard.fromJson).toList(),
    coins: j.integer('coins'),
  );
}

/// action | window | lose | exchange | over
class IntrigueView {
  const IntrigueView({
    required this.phase,
    required this.order,
    required this.players,
    required this.current,
    required this.turn,
    required this.me,
    required this.deckCount,
    required this.cardsPerRole,
    this.pending,
    this.window,
    this.lose,
    this.exchange,
    this.exchanging,
    required this.serverNow,
    required this.endsAt,
    required this.durationMs,
    required this.log,
    this.flash,
    this.winner,
  });

  final String phase;
  final List<String> order;
  final List<IgPlayer> players;
  final String current;
  final int turn;
  final MeView me;
  final int deckCount;
  final int cardsPerRole;
  final PendingView? pending;
  final WindowView? window;

  /// reason: challenge | coup | assassinate | left
  final ({String player, String reason})? lose;

  /// Değiş tokuş: yalnızca oynayana, eldeki + çekilen kartlar ve kaç tane saklanacağı.
  final ({List<IgCard> options, int keep})? exchange;
  final String? exchanging;
  final int serverNow;
  final int endsAt;
  final int durationMs;
  final List<LogEntry> log;
  final FlashView? flash;
  final String? winner;

  IgPlayer? player(String id) {
    for (final p in players) {
      if (p.id == id) return p;
    }
    return null;
  }

  factory IntrigueView.fromJson(Json j) {
    final lose = j.objOrNull('lose');
    final ex = j.objOrNull('exchange');
    final pending = j.objOrNull('pending');
    final window = j.objOrNull('window');
    final flash = j.objOrNull('flash');
    return IntrigueView(
      phase: j.str('phase', 'action'),
      order: j.strs('order'),
      players: j.objs('players').map(IgPlayer.fromJson).toList(),
      current: j.str('current'),
      turn: j.integer('turn'),
      me: MeView.fromJson(j.obj('me')),
      deckCount: j.integer('deckCount'),
      cardsPerRole: j.integer('cardsPerRole', 3),
      pending: pending == null ? null : PendingView.fromJson(pending),
      window: window == null ? null : WindowView.fromJson(window),
      lose: lose == null ? null : (player: lose.str('player'), reason: lose.str('reason', 'left')),
      exchange: ex == null ? null : (options: ex.objs('options').map(IgCard.fromJson).toList(), keep: ex.integer('keep', 2)),
      exchanging: j.strOrNull('exchanging'),
      serverNow: j.integer('serverNow'),
      endsAt: j.integer('endsAt'),
      durationMs: j.integer('durationMs'),
      log: j.objs('log').map(LogEntry.fromJson).toList(),
      flash: flash == null ? null : FlashView.fromJson(flash),
      winner: j.strOrNull('winner'),
    );
  }
}
