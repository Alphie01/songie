// games/who-am-i/shared/index.ts karşılığı.
import '../../shared/models.dart';

/// Oyuncuların eklediği kimlikler bu kategoride toplanır.
const customCategory = 'arkadas';

const answers = ['yes', 'no', 'maybe', 'irrelevant'];

/// `classic`: "Hayır" çıkana kadar sor. `three`: her turda sabit 3 soru.
const turnModes = ['classic', 'three'];
const questionsPerTurn = 3;

const hintOptions = [0, 1, 3];

class WhoAmISettings {
  const WhoAmISettings({required this.categories, required this.turnMode, required this.typedQuestions, required this.groupVerify, required this.hints});
  final List<String> categories;

  /// classic | three
  final String turnMode;
  final bool typedQuestions;
  final bool groupVerify;
  final int hints;

  factory WhoAmISettings.fromJson(Json j) => WhoAmISettings(
    categories: j.strs('categories'),
    turnMode: j.str('turnMode', 'classic'),
    typedQuestions: j.boolean('typedQuestions', true),
    groupVerify: j.boolean('groupVerify'),
    hints: j.integer('hints', 1),
  );
}

class Identity {
  const Identity({required this.name, required this.category});
  final String name;
  final String category;
  factory Identity.fromJson(Json j) => Identity(name: j.str('name'), category: j.str('category'));
}

class PlayerCard {
  const PlayerCard({
    required this.id,
    this.identity,
    required this.finished,
    this.finishRank,
    required this.questions,
    required this.hints,
    required this.left,
  });
  final String id;

  /// Kendi kartın açıklanana kadar `null` gelir: sunucu göndermez.
  final Identity? identity;
  final bool finished;

  /// Bitiriş sırası (0 = ilk bilen).
  final int? finishRank;
  final int questions;
  final int hints;

  /// Oyundan ayrıldı (kartı yine de görünür).
  final bool left;

  factory PlayerCard.fromJson(Json j) => PlayerCard(
    id: j.str('id'),
    identity: j.objOrNull('identity') == null ? null : Identity.fromJson(j.obj('identity')),
    finished: j.boolean('finished'),
    finishRank: j.intOrNull('finishRank'),
    questions: j.integer('questions'),
    hints: j.integer('hints'),
    left: j.boolean('left'),
  );
}

Map<String, int> _counts(Json j) => {for (final a in answers) a: j.integer(a)};

class OpenQuestion {
  const OpenQuestion({
    required this.id,
    required this.askerId,
    this.text,
    required this.counts,
    required this.answered,
    required this.expected,
    this.myAnswer,
  });
  final int id;
  final String askerId;
  final String? text;
  final Map<String, int> counts;
  final List<String> answered;

  /// Cevap vermesi beklenen kişi sayısı (bağlı oyuncular).
  final int expected;
  final String? myAnswer;

  factory OpenQuestion.fromJson(Json j) => OpenQuestion(
    id: j.integer('id'),
    askerId: j.str('askerId'),
    text: j.strOrNull('text'),
    counts: _counts(j.obj('counts')),
    answered: j.strs('answered'),
    expected: j.integer('expected'),
    myAnswer: j.strOrNull('myAnswer'),
  );
}

class PendingGuess {
  const PendingGuess({
    required this.id,
    required this.playerId,
    required this.text,
    required this.correctVotes,
    required this.wrongVotes,
    required this.voted,
    required this.expected,
    this.myVote,
  });
  final int id;
  final String playerId;
  final String text;
  final int correctVotes;
  final int wrongVotes;
  final List<String> voted;
  final int expected;
  final bool? myVote;

  factory PendingGuess.fromJson(Json j) {
    final votes = j.obj('votes');
    return PendingGuess(
      id: j.integer('id'),
      playerId: j.str('playerId'),
      text: j.str('text'),
      correctVotes: votes.integer('correct'),
      wrongVotes: votes.integer('wrong'),
      voted: j.strs('voted'),
      expected: j.integer('expected'),
      myVote: j['myVote'] is bool ? j['myVote'] as bool : null,
    );
  }
}

/// `question` | `guess` | `skip`
class HistoryItem {
  const HistoryItem({
    required this.id,
    required this.kind,
    required this.askerId,
    this.text,
    this.counts = const {},
    this.result = 'maybe',
    this.correct = false,
    this.reveal,
    this.byGroup = false,
    this.byHost = false,
  });
  final int id;
  final String kind;
  final String askerId;

  /// Soru metni (sesli soruda null) ya da tahmin metni.
  final String? text;
  final Map<String, int> counts;

  /// Sorunun çoğunluk cevabı.
  final String result;
  final bool correct;

  /// Doğru bilindiyse kimlik (artık herkes görebilir).
  final String? reveal;
  final bool byGroup;
  final bool byHost;

  factory HistoryItem.fromJson(Json j) => HistoryItem(
    id: j.integer('id'),
    kind: j.str('kind', 'question'),
    askerId: j.str('askerId'),
    text: j.strOrNull('text'),
    counts: _counts(j.obj('counts')),
    result: j.str('result', 'maybe'),
    correct: j.boolean('correct'),
    reveal: j.strOrNull('reveal'),
    byGroup: j.boolean('byGroup'),
    byHost: j.boolean('byHost'),
  );
}

class WhoAmIView {
  const WhoAmIView({
    required this.phase,
    required this.players,
    this.askerId,
    required this.turnNumber,
    required this.turnQuestions,
    required this.turnMode,
    required this.typedQuestions,
    required this.groupVerify,
    this.question,
    this.guess,
    required this.history,
    required this.myHints,
    required this.hintsLeft,
    required this.hintLimit,
    required this.podiumMs,
  });

  /// play | podium
  final String phase;

  /// Sıra düzeninde bütün oyuncular.
  final List<PlayerCard> players;
  final String? askerId;
  final int turnNumber;

  /// Bu turda sorulan soru sayısı.
  final int turnQuestions;
  final String turnMode;
  final bool typedQuestions;
  final bool groupVerify;
  final OpenQuestion? question;
  final PendingGuess? guess;

  /// En yeni en sonda.
  final List<HistoryItem> history;

  /// Yalnızca sana ait ipuçları.
  final List<String> myHints;
  final int hintsLeft;
  final int hintLimit;

  /// Sonuç ekranının süresi (lobiye dönüş çubuğu için).
  final int podiumMs;

  factory WhoAmIView.fromJson(Json j) => WhoAmIView(
    phase: j.str('phase', 'play'),
    players: j.objs('players').map(PlayerCard.fromJson).toList(),
    askerId: j.strOrNull('askerId'),
    turnNumber: j.integer('turnNumber', 1),
    turnQuestions: j.integer('turnQuestions'),
    turnMode: j.str('turnMode', 'classic'),
    typedQuestions: j.boolean('typedQuestions'),
    groupVerify: j.boolean('groupVerify'),
    question: j.objOrNull('question') == null ? null : OpenQuestion.fromJson(j.obj('question')),
    guess: j.objOrNull('guess') == null ? null : PendingGuess.fromJson(j.obj('guess')),
    history: j.objs('history').map(HistoryItem.fromJson).toList(),
    myHints: j.strs('myHints'),
    hintsLeft: j.integer('hintsLeft'),
    hintLimit: j.integer('hintLimit'),
    podiumMs: j.integer('podiumMs', 12000),
  );
}

class CategoryInfo {
  const CategoryInfo({required this.id, required this.name, required this.count});
  final String id;
  final String name;
  final int count;
  factory CategoryInfo.fromJson(Json j) => CategoryInfo(id: j.str('id'), name: j.str('name'), count: j.integer('count'));
}

/// Sıralama: bilenler önde, az soruda bilen daha önde (eşitlikte önce bilen);
/// bilemeyenler sonda, az soruyla. JS'deki gibi kararlı (eşitler sırasını korur).
List<PlayerCard> rankPlayers(List<PlayerCard> players) {
  final indexed = [for (var i = 0; i < players.length; i++) (i, players[i])];
  indexed.sort((x, y) {
    final a = x.$2;
    final b = y.$2;
    if (a.finished != b.finished) return a.finished ? -1 : 1;
    if (a.questions != b.questions) return a.questions - b.questions;
    final r = (a.finishRank ?? 0) - (b.finishRank ?? 0);
    return r != 0 ? r : x.$1 - y.$1;
  });
  return [for (final e in indexed) e.$2];
}
