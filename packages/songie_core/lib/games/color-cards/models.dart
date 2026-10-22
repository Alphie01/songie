// games/color-cards/shared/index.ts karşılığı.
import '../../shared/models.dart';

const gameId = 'color-cards';
const minPlayers = 2;
const maxPlayers = 10;
const handSize = 7;

/// Puan modunda oyunu kazanmak için gereken puan.
const pointTarget = 500;

/// Dört renk (tokens.css): yeşil, sarı, kırmızı, mor.
const ccColors = ['green', 'yellow', 'red', 'purple'];

const ccNumbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const ccActions = ['skip', 'reverse', 'draw2'];
const ccWilds = ['wild', 'wild4'];
const ccValues = [...ccNumbers, ...ccActions, ...ccWilds];

bool isWildValue(String v) => v == 'wild' || v == 'wild4';
bool isNumberValue(String v) => ccNumbers.contains(v);

/// Resmî puan değerleri: sayı kendi değeri, Atla/Yön/+2 20, jokerler 50.
int cardPoints(String value) {
  if (isWildValue(value)) return 50;
  if (isNumberValue(value)) return int.parse(value);
  return 20;
}

/// 0 = süresiz.
const turnOptions = [0, 20, 40];

class ColorCardsSettings {
  const ColorCardsSettings({
    required this.mode,
    required this.turnSeconds,
    required this.stacking,
    required this.sevenZero,
    required this.drawUntilPlayable,
  });

  /// single | points
  final String mode;
  final int turnSeconds;
  final bool stacking;
  final bool sevenZero;
  final bool drawUntilPlayable;

  factory ColorCardsSettings.fromJson(Json j) => ColorCardsSettings(
    mode: j.str('mode', 'single'),
    turnSeconds: j.integer('turnSeconds'),
    stacking: j.boolean('stacking'),
    sevenZero: j.boolean('sevenZero'),
    drawUntilPlayable: j.boolean('drawUntilPlayable'),
  );

  Json toJson() => {'mode': mode, 'turnSeconds': turnSeconds, 'stacking': stacking, 'sevenZero': sevenZero, 'drawUntilPlayable': drawUntilPlayable};

  ColorCardsSettings copyWith({String? mode, int? turnSeconds, bool? stacking, bool? sevenZero, bool? drawUntilPlayable}) => ColorCardsSettings(
    mode: mode ?? this.mode,
    turnSeconds: turnSeconds ?? this.turnSeconds,
    stacking: stacking ?? this.stacking,
    sevenZero: sevenZero ?? this.sevenZero,
    drawUntilPlayable: drawUntilPlayable ?? this.drawUntilPlayable,
  );
}

const defaultSettings = ColorCardsSettings(mode: 'single', turnSeconds: 0, stacking: false, sevenZero: false, drawUntilPlayable: false);

class CcCard {
  const CcCard({this.id = '', required this.color, required this.value});
  final String id;

  /// Jokerlerde null.
  final String? color;
  final String value;

  factory CcCard.fromJson(Json j) => CcCard(id: j.str('id'), color: j.strOrNull('color'), value: j.str('value', '0'));
}

class CcLogEntry {
  const CcLogEntry({required this.seq, required this.t, this.by, this.to, this.card, this.color, this.n});
  final int seq;
  final String t;
  final String? by;
  final String? to;
  final CcCard? card;
  final String? color;
  final int? n;

  factory CcLogEntry.fromJson(Json j) => CcLogEntry(
    seq: j.integer('seq'),
    t: j.str('t'),
    by: j.strOrNull('by'),
    to: j.strOrNull('to'),
    card: j.objOrNull('card') == null ? null : CcCard.fromJson(j.obj('card')),
    color: j.strOrNull('color'),
    n: j.intOrNull('n'),
  );
}

class CcPlayer {
  const CcPlayer({required this.id, required this.cards, required this.score, required this.called});
  final String id;
  final int cards;
  final int score;

  /// "Son kart!" dedi (eli 1–2 kartken).
  final bool called;

  factory CcPlayer.fromJson(Json j) => CcPlayer(id: j.str('id'), cards: j.integer('cards'), score: j.integer('score'), called: j.boolean('called'));
}

class CcRoundResult {
  const CcRoundResult({required this.winner, required this.points, required this.hands});
  final String winner;

  /// Kazananın bu elde topladığı puan (puan modu).
  final int points;
  final List<({String id, int cards, int points})> hands;

  factory CcRoundResult.fromJson(Json j) => CcRoundResult(
    winner: j.str('winner'),
    points: j.integer('points'),
    hands: [for (final h in j.objs('hands')) (id: h.str('id'), cards: h.integer('cards'), points: h.integer('points'))],
  );
}

class CcRules {
  const CcRules({required this.stacking, required this.sevenZero, required this.drawUntilPlayable, required this.turnSeconds});
  final bool stacking;
  final bool sevenZero;
  final bool drawUntilPlayable;
  final int turnSeconds;

  factory CcRules.fromJson(Json j) => CcRules(
    stacking: j.boolean('stacking'),
    sevenZero: j.boolean('sevenZero'),
    drawUntilPlayable: j.boolean('drawUntilPlayable'),
    turnSeconds: j.integer('turnSeconds'),
  );
}

class ColorCardsView {
  const ColorCardsView({
    required this.phase,
    required this.mode,
    required this.target,
    required this.round,
    required this.order,
    required this.players,
    required this.current,
    required this.dir,
    required this.step,
    required this.top,
    required this.activeColor,
    required this.deckCount,
    required this.discardCount,
    required this.penalty,
    required this.drew,
    required this.drawnId,
    required this.inGame,
    required this.hand,
    required this.playable,
    required this.challenge,
    required this.reveal,
    required this.exposed,
    required this.lastPlay,
    required this.serverNow,
    required this.endsAt,
    required this.durationMs,
    required this.log,
    required this.roundResult,
    required this.winner,
    required this.rules,
  });

  /// play | color | challenge | roundOver | over
  final String phase;

  /// single | points
  final String mode;
  final int target;
  final int round;
  final List<String> order;
  final List<CcPlayer> players;
  final String current;

  /// 1 = saat yönü (listede ileri), -1 = ters.
  final int dir;

  /// Her hamlede artar; `draw`/`pass`/`challenge`/`accept` hamlelerine eklenir.
  final int step;
  final CcCard? top;
  final String? activeColor;
  final int deckCount;
  final int discardCount;

  /// Biriken çekme cezası (yığma kuralı).
  final int penalty;
  final bool drew;
  final String? drawnId;

  /// `me.inGame`, `me.hand`, `me.playable`.
  final bool inGame;
  final List<CcCard> hand;
  final List<String> playable;

  /// +4 itiraz penceresi: kimin oynadığı, kimin karar vereceği.
  final ({String by, String victim, int penalty})? challenge;

  /// İtiraz edildiyse oynayanın eli yalnızca itiraz edene.
  final ({int seq, String of, List<CcCard> cards, bool guilty})? reveal;

  /// Son kart demeden 1 karta inen ve henüz yakalanmamış oyuncu.
  final String? exposed;
  final ({int seq, String by, CcCard card})? lastPlay;
  final int serverNow;
  final int endsAt;
  final int durationMs;
  final List<CcLogEntry> log;
  final CcRoundResult? roundResult;
  final String? winner;
  final CcRules rules;

  factory ColorCardsView.fromJson(Json j) {
    final me = j.obj('me');
    final ch = j.objOrNull('challenge');
    final rv = j.objOrNull('reveal');
    final lp = j.objOrNull('lastPlay');
    final dir = j.integer('dir', 1);
    return ColorCardsView(
      phase: j.str('phase', 'play'),
      mode: j.str('mode', 'single'),
      target: j.integer('target', pointTarget),
      round: j.integer('round', 1),
      order: j.strs('order'),
      players: j.objs('players').map(CcPlayer.fromJson).toList(),
      current: j.str('current'),
      dir: dir == -1 ? -1 : 1,
      step: j.integer('step'),
      top: j.objOrNull('top') == null ? null : CcCard.fromJson(j.obj('top')),
      activeColor: j.strOrNull('activeColor'),
      deckCount: j.integer('deckCount'),
      discardCount: j.integer('discardCount'),
      penalty: j.integer('penalty'),
      drew: j.boolean('drew'),
      drawnId: j.strOrNull('drawnId'),
      inGame: me.boolean('inGame'),
      hand: me.objs('hand').map(CcCard.fromJson).toList(),
      playable: me.strs('playable'),
      challenge: ch == null ? null : (by: ch.str('by'), victim: ch.str('victim'), penalty: ch.integer('penalty')),
      reveal: rv == null
          ? null
          : (seq: rv.integer('seq'), of: rv.str('of'), cards: rv.objs('cards').map(CcCard.fromJson).toList(), guilty: rv.boolean('guilty')),
      exposed: j.strOrNull('exposed'),
      lastPlay: lp == null ? null : (seq: lp.integer('seq'), by: lp.str('by'), card: CcCard.fromJson(lp.obj('card'))),
      serverNow: j.integer('serverNow'),
      endsAt: j.integer('endsAt'),
      durationMs: j.integer('durationMs'),
      log: j.objs('log').map(CcLogEntry.fromJson).toList(),
      roundResult: j.objOrNull('roundResult') == null ? null : CcRoundResult.fromJson(j.obj('roundResult')),
      winner: j.strOrNull('winner'),
      rules: CcRules.fromJson(j.obj('rules')),
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

/// PlayView.tsx `sortHand`: renk (yeşil, sarı, kırmızı, mor, joker), sonra değer sırası.
List<CcCard> sortHand(List<CcCard> hand) {
  int colorRank(String? c) => c == null ? 9 : ccColors.indexOf(c);
  int valueRank(String v) => ccValues.indexOf(v);
  return stableSorted(hand, (a, b) {
    final c = colorRank(a.color) - colorRank(b.color);
    return c != 0 ? c : valueRank(a.value) - valueRank(b.value);
  });
}
