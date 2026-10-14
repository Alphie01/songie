// games/charades/shared/index.ts karşılığı.
import '../../shared/models.dart';

const teamIds = ['a', 'b'];

const secondsOptions = [60, 90, 120, 180];

/// -1 = sınırsız pas.
const passOptions = [1, 3, -1];

/// Takım başına anlatma sayısı; 0 = oda sahibi bitirene kadar.
const turnOptions = [2, 4, 6, 0];

const difficulties = ['kolay', 'karisik', 'zor'];

/// Başlığın türü: anlatıcının ilk işareti (film çevirmek, kitap açmak…).
const kinds = ['film', 'dizi', 'kitap', 'sarki', 'deyim', 'ifade'];

/// Hazır kategoriler ve türleri. Arkadaş başlıkları kendi türünü taşır.
const categoryKind = <String, String>{
  'film-turk': 'film',
  'film-yabanci': 'film',
  'dizi-turk': 'dizi',
  'dizi-yabanci': 'dizi',
  'kitap': 'kitap',
  'sarki': 'sarki',
  'atasozu-deyim': 'deyim',
  'yatak-odasi': 'ifade',
  'sinirsiz': 'ifade',
};

/// Varsayılan kapalı, yalnızca yetişkinler için kategoriler.
const adultCategories = ['yatak-odasi', 'sinirsiz'];
bool isAdultCategory(String id) => adultCategories.contains(id);

const customCategory = 'arkadas';

/// Klasik işaretler: anlatıcı dokununca takımına (ve rakibe) kısa süre gösterilir.
const signs = ['tur', 'kelime', 'hece', 'benzer', 'bildin'];

class CharadesSettings {
  const CharadesSettings({
    required this.teamA,
    required this.teamB,
    required this.seconds,
    required this.passes,
    required this.turns,
    required this.categories,
    required this.difficulty,
    required this.foulPenalty,
  });

  /// Oyuncu kimlikleri. Takımı seçilmemiş oyuncular başlarken dengeli dağıtılır.
  final List<String> teamA;
  final List<String> teamB;
  final int seconds;
  final int passes;
  final int turns;
  final List<String> categories;

  /// kolay | karisik | zor
  final String difficulty;

  /// "Konuştu!" denirse anlatan takımdan 1 puan düşülür.
  final bool foulPenalty;

  factory CharadesSettings.fromJson(Json j) {
    final teams = j.obj('teams');
    return CharadesSettings(
      teamA: teams.strs('a'),
      teamB: teams.strs('b'),
      seconds: j.integer('seconds', 90),
      passes: j.integer('passes', 3),
      turns: j.integer('turns', 4),
      categories: j.strs('categories'),
      difficulty: j.str('difficulty', 'karisik'),
      foulPenalty: j.boolean('foulPenalty', true),
    );
  }
}

class CharadesCard {
  const CharadesCard({required this.id, required this.title, required this.kind, required this.words, required this.category});
  final String id;
  final String title;
  final String kind;

  /// Başlıktaki kelime sayısı (anlatıcının ikinci işareti).
  final int words;
  final String category;
  factory CharadesCard.fromJson(Json j) =>
      CharadesCard(id: j.str('id'), title: j.str('title'), kind: j.str('kind', 'film'), words: j.integer('words'), category: j.str('category'));
}

class SummaryCard {
  const SummaryCard({required this.title, required this.kind, required this.result});
  final String title;
  final String kind;

  /// correct | pass | foul
  final String result;
  factory SummaryCard.fromJson(Json j) => SummaryCard(title: j.str('title'), kind: j.str('kind', 'film'), result: j.str('result', 'pass'));
}

class TurnSummary {
  const TurnSummary({required this.team, required this.narratorId, required this.points, required this.cards});
  final String team;
  final String narratorId;
  final int points;
  final List<SummaryCard> cards;
  factory TurnSummary.fromJson(Json j) => TurnSummary(
    team: j.str('team', 'a'),
    narratorId: j.str('narratorId'),
    points: j.integer('points'),
    cards: j.objs('cards').map(SummaryCard.fromJson).toList(),
  );
}

class Flash {
  const Flash({required this.id, required this.kind, this.title});
  final int id;

  /// correct | pass | foul
  final String kind;

  /// Yalnızca kartı görenlere gider.
  final String? title;
  factory Flash.fromJson(Json j) => Flash(id: j.integer('id'), kind: j.str('kind', 'correct'), title: j.strOrNull('title'));
}

class SignShown {
  const SignShown({required this.id, required this.sign, this.kind, this.words});
  final int id;
  final String sign;

  /// Yalnızca "tur" işaretinde dolu.
  final String? kind;

  /// Yalnızca "kelime" işaretinde dolu.
  final int? words;
  factory SignShown.fromJson(Json j) => SignShown(id: j.integer('id'), sign: j.str('sign', 'tur'), kind: j.strOrNull('kind'), words: j.intOrNull('words'));
}

class CharadesView {
  const CharadesView({
    required this.phase,
    required this.teams,
    required this.scores,
    this.myTeam,
    required this.role,
    required this.turnNumber,
    this.totalTurns,
    required this.team,
    required this.narratorId,
    required this.serverNow,
    required this.endsAt,
    required this.durationMs,
    this.passesLeft,
    required this.turnStats,
    this.card,
    required this.canUndo,
    this.flash,
    this.lastTurn,
    required this.foulPenalty,
    this.sign,
  });

  /// ready | turn | podium
  final String phase;
  final Map<String, List<String>> teams;
  final Map<String, int> scores;
  final String? myTeam;

  /// narrator | guesser | watcher | spectator
  final String role;
  final int turnNumber;
  final int? totalTurns;
  final String team;
  final String narratorId;
  final int serverNow;
  final int endsAt;
  final int durationMs;
  final int? passesLeft;

  /// correct | pass | foul → sayı
  final Map<String, int> turnStats;
  final CharadesCard? card;
  final bool canUndo;
  final Flash? flash;
  final TurnSummary? lastTurn;
  final bool foulPenalty;

  /// Anlatıcının son gösterdiği işaret (yalnızca tur sırasında, aynı kart için).
  final SignShown? sign;

  factory CharadesView.fromJson(Json j) {
    final teams = j.obj('teams');
    final scores = j.obj('scores');
    final stats = j.obj('turnStats');
    return CharadesView(
      phase: j.str('phase', 'ready'),
      teams: {for (final t in teamIds) t: teams.strs(t)},
      scores: {for (final t in teamIds) t: scores.integer(t)},
      myTeam: j.strOrNull('myTeam'),
      role: j.str('role', 'spectator'),
      turnNumber: j.integer('turnNumber'),
      totalTurns: j.intOrNull('totalTurns'),
      team: j.str('team', 'a'),
      narratorId: j.str('narratorId'),
      serverNow: j.integer('serverNow'),
      endsAt: j.integer('endsAt'),
      durationMs: j.integer('durationMs', 90000),
      passesLeft: j.intOrNull('passesLeft'),
      turnStats: {for (final k in const ['correct', 'pass', 'foul']) k: stats.integer(k)},
      card: j.objOrNull('card') == null ? null : CharadesCard.fromJson(j.obj('card')),
      canUndo: j.boolean('canUndo'),
      flash: j.objOrNull('flash') == null ? null : Flash.fromJson(j.obj('flash')),
      lastTurn: j.objOrNull('lastTurn') == null ? null : TurnSummary.fromJson(j.obj('lastTurn')),
      foulPenalty: j.boolean('foulPenalty', true),
      sign: j.objOrNull('sign') == null ? null : SignShown.fromJson(j.obj('sign')),
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

final _wordChar = RegExp(r'[\p{L}\p{N}]', unicode: true);

/// Kelime sayılır mı (noktalama tek başına sayılmaz).
bool countsAsWord(String w) => _wordChar.hasMatch(w);

int countWords(String title) => title.split(RegExp(r'\s+')).where(countsAsWord).length;
