// games/kitten/shared/index.ts karşılığı.
import '../../shared/models.dart';

const gameId = 'kitten';
const minPlayers = 2;

/// Tek deste 2–5 kişi; 6–10 kişide otomatik olarak iki deste kullanılır.
const singleDeckMax = 5;
const maxPlayers = 10;
const handSize = 7;

const catKinds = ['sarman', 'tekir', 'pamuk', 'kara', 'benek'];
const cardKinds = ['bomb', 'defuse', 'attack', 'skip', 'future', 'shuffle', 'favor', 'nope', ...catKinds];

bool isCat(String kind) => catKinds.contains(kind);

/// Tek destedeki adetler (bomba ve etkisiz kıl oyuncu sayısına göre ayrıca eklenir).
const baseCounts = <String, int>{
  'attack': 4,
  'skip': 4,
  'future': 5,
  'shuffle': 4,
  'favor': 4,
  'nope': 5,
  'sarman': 4,
  'tekir': 4,
  'pamuk': 4,
  'kara': 4,
  'benek': 4,
};

const nopeOptions = [3, 5, 8];

/// 0 = süresiz.
const turnOptions = [0, 30, 60];

class KittenSettings {
  const KittenSettings({required this.nopeSeconds, required this.turnSeconds, required this.fiveCats});

  /// "Hayır" penceresi (saniye). Her Hayır ile yeniden başlar.
  final int nopeSeconds;

  /// Tur süresi (saniye); 0 = süresiz.
  final int turnSeconds;

  /// 5 farklı kedi kartı ile ıskartadan istediğin kartı al.
  final bool fiveCats;

  factory KittenSettings.fromJson(Json j) =>
      KittenSettings(nopeSeconds: j.integer('nopeSeconds', 5), turnSeconds: j.integer('turnSeconds'), fiveCats: j.boolean('fiveCats', true));

  Json toJson() => {'nopeSeconds': nopeSeconds, 'turnSeconds': turnSeconds, 'fiveCats': fiveCats};

  KittenSettings copyWith({int? nopeSeconds, int? turnSeconds, bool? fiveCats}) => KittenSettings(
    nopeSeconds: nopeSeconds ?? this.nopeSeconds,
    turnSeconds: turnSeconds ?? this.turnSeconds,
    fiveCats: fiveCats ?? this.fiveCats,
  );
}

const defaultSettings = KittenSettings(nopeSeconds: 5, turnSeconds: 0, fiveCats: true);

class KtCard {
  const KtCard({required this.id, required this.kind});
  final String id;
  final String kind;
  factory KtCard.fromJson(Json j) => KtCard(id: j.str('id'), kind: j.str('kind', 'nope'));
}

class KtLogEntry {
  const KtLogEntry({required this.seq, required this.t, this.by, this.to, this.action, this.kind, this.n, this.ok});
  final int seq;
  final String t;
  final String? by;
  final String? to;

  /// Oynanan eylem (play/cancelled).
  final String? action;

  /// İlgili kart. Gizli olaylarda yalnızca taraflara gönderilir, diğerlerine null.
  final String? kind;
  final int? n;
  final bool? ok;

  factory KtLogEntry.fromJson(Json j) => KtLogEntry(
    seq: j.integer('seq'),
    t: j.str('t'),
    by: j.strOrNull('by'),
    to: j.strOrNull('to'),
    action: j.strOrNull('action'),
    kind: j.strOrNull('kind'),
    n: j.intOrNull('n'),
    ok: j['ok'] is bool ? j['ok'] as bool : null,
  );
}

class KtPlayer {
  const KtPlayer({required this.id, required this.alive, required this.cards, this.out});
  final String id;
  final bool alive;
  final int cards;

  /// Patlama sırası (1 = ilk patlayan); hayattaysa null.
  final int? out;

  factory KtPlayer.fromJson(Json j) => KtPlayer(id: j.str('id'), alive: j.boolean('alive'), cards: j.integer('cards'), out: j.intOrNull('out'));
}

class KtPending {
  const KtPending({
    required this.id,
    required this.by,
    required this.kind,
    required this.cards,
    this.target,
    this.named,
    required this.nopes,
    required this.willHappen,
    required this.endsAt,
  });
  final int id;
  final String by;

  /// attack | skip | future | shuffle | favor | pair | triple | five
  final String kind;
  final List<String> cards;
  final String? target;
  final String? named;
  final List<String> nopes;

  /// Pencere şimdi kapansa eylem uygulanır mı (Hayır sayısı çift mi).
  final bool willHappen;
  final int endsAt;

  factory KtPending.fromJson(Json j) => KtPending(
    id: j.integer('id'),
    by: j.str('by'),
    kind: j.str('kind'),
    cards: j.strs('cards'),
    target: j.strOrNull('target'),
    named: j.strOrNull('named'),
    nopes: j.strs('nopes'),
    willHappen: j.boolean('willHappen'),
    endsAt: j.integer('endsAt'),
  );
}

class KittenView {
  const KittenView({
    required this.phase,
    required this.order,
    required this.players,
    required this.current,
    required this.turnsLeft,
    required this.turn,
    required this.inGame,
    required this.alive,
    required this.hand,
    required this.deckCount,
    required this.deckBombs,
    required this.discardTop,
    required this.discardCount,
    required this.pending,
    required this.favor,
    required this.peek,
    required this.myBomb,
    required this.discardPick,
    required this.serverNow,
    required this.endsAt,
    required this.durationMs,
    required this.log,
    required this.flash,
    required this.winner,
    required this.fiveCats,
  });

  /// play | nope | favor | bomb | place | pick | over
  final String phase;
  final List<String> order;
  final List<KtPlayer> players;
  final String current;
  final int turnsLeft;

  /// Her tur başında artar; `draw` hamlesine eklenir.
  final int turn;

  /// `me.inGame`, `me.alive`, `me.hand`.
  final bool inGame;
  final bool alive;
  final List<KtCard> hand;
  final int deckCount;

  /// Destedeki bomba sayısı (eski sunucu göndermezse null).
  final int? deckBombs;
  final String? discardTop;
  final int discardCount;
  final KtPending? pending;
  final ({String from, String to})? favor;

  /// Geleceği Gör: yalnızca oynayana, üstten alta.
  final ({int seq, List<String> cards})? peek;

  /// Bombayı geri koyduysan şu anki konumu (0 = en üst); yalnızca koyana.
  final int? myBomb;

  /// 5 farklı kedi: yalnızca seçen oyuncuya ıskarta.
  final List<KtCard>? discardPick;
  final int serverNow;

  /// Aşamanın (ya da tur süresinin) bitiş anı; 0 = süresiz.
  final int endsAt;
  final int durationMs;
  final List<KtLogEntry> log;

  /// Son dramatik olay (patlama / etkisiz kılma).
  final ({int seq, String t, String by})? flash;
  final String? winner;
  final bool fiveCats;

  factory KittenView.fromJson(Json j) {
    final me = j.obj('me');
    final favor = j.objOrNull('favor');
    final peek = j.objOrNull('peek');
    final flash = j.objOrNull('flash');
    return KittenView(
      phase: j.str('phase', 'play'),
      order: j.strs('order'),
      players: j.objs('players').map(KtPlayer.fromJson).toList(),
      current: j.str('current'),
      turnsLeft: j.integer('turnsLeft', 1),
      turn: j.integer('turn'),
      inGame: me.boolean('inGame'),
      alive: me.boolean('alive'),
      hand: me.objs('hand').map(KtCard.fromJson).toList(),
      deckCount: j.integer('deckCount'),
      deckBombs: j.intOrNull('deckBombs'),
      discardTop: j.strOrNull('discardTop'),
      discardCount: j.integer('discardCount'),
      pending: j.objOrNull('pending') == null ? null : KtPending.fromJson(j.obj('pending')),
      favor: favor == null ? null : (from: favor.str('from'), to: favor.str('to')),
      peek: peek == null ? null : (seq: peek.integer('seq'), cards: peek.strs('cards')),
      myBomb: j.intOrNull('myBomb'),
      discardPick: j['discardPick'] is List ? j.objs('discardPick').map(KtCard.fromJson).toList() : null,
      serverNow: j.integer('serverNow'),
      endsAt: j.integer('endsAt'),
      durationMs: j.integer('durationMs'),
      log: j.objs('log').map(KtLogEntry.fromJson).toList(),
      flash: flash == null ? null : (seq: flash.integer('seq'), t: flash.str('t'), by: flash.str('by')),
      winner: j.strOrNull('winner'),
      fiveCats: j.boolean('fiveCats', true),
    );
  }
}

/// JS `Array.prototype.sort` gibi kararlı sıralama (eşitler yerinde kalır).
List<T> stableSorted<T>(Iterable<T> items, int Function(T a, T b) compare) {
  final indexed = [for (final (i, e) in items.indexed) (i, e)];
  indexed.sort((a, b) {
    final c = compare(a.$2, b.$2);
    return c != 0 ? c : a.$1 - b.$1;
  });
  return [for (final e in indexed) e.$2];
}

/// PlayView.tsx `sortHand`: kart türü sırası.
List<KtCard> sortHand(List<KtCard> hand) => stableSorted(hand, (a, b) => cardKinds.indexOf(a.kind) - cardKinds.indexOf(b.kind));

/// Seçili kartlar hangi eylem olur? (PlayView.tsx `detect`)
String? detectCombo(List<KtCard> cards, bool fiveCats) {
  final kinds = cards.map((c) => c.kind).toList();
  if (kinds.isEmpty) return null;
  final first = kinds.first;
  if (cards.length == 1) return const ['attack', 'skip', 'future', 'shuffle', 'favor'].contains(first) ? first : null;
  final same = kinds.every((k) => k == first) && isCat(first);
  if (same && cards.length == 2) return 'pair';
  if (same && cards.length == 3) return 'triple';
  if (fiveCats && cards.length == 5 && catKinds.every(kinds.contains)) return 'five';
  return null;
}
