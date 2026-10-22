// games/taboo/shared/index.ts karşılığı.
import '../../shared/models.dart';

const teamIds = ['a', 'b'];

const secondsOptions = [60, 90, 120];

/// -1 = sınırsız pas.
const passOptions = [3, 5, -1];

/// Takım başına anlatma sayısı; 0 = oda sahibi bitirene kadar.
const turnOptions = [2, 4, 6, 0];

const customCategory = 'arkadas';

/// Varsayılan kapalı, yalnızca yetişkinler için kategoriler.
const adultCategories = ['yatak-odasi', 'sinirsiz'];
bool isAdultCategory(String id) => adultCategories.contains(id);

class TabooSettings {
  const TabooSettings({
    required this.teamA,
    required this.teamB,
    required this.seconds,
    required this.passes,
    required this.turns,
    required this.categories,
    required this.tabooPenalty,
  });

  /// Oyuncu kimlikleri. Takımı seçilmemiş oyuncular başlarken dengeli dağıtılır.
  final List<String> teamA;
  final List<String> teamB;
  final int seconds;
  final int passes;
  final int turns;
  final List<String> categories;

  /// Yasaklı kelime söylenirse anlatan takımdan 1 puan düşülür.
  final bool tabooPenalty;

  factory TabooSettings.fromJson(Json j) {
    final teams = j.obj('teams');
    return TabooSettings(
      teamA: teams.strs('a'),
      teamB: teams.strs('b'),
      seconds: j.integer('seconds', 60),
      passes: j.integer('passes', 3),
      turns: j.integer('turns', 4),
      categories: j.strs('categories'),
      tabooPenalty: j.boolean('tabooPenalty', true),
    );
  }
}

class TabooCard {
  const TabooCard({required this.id, required this.word, required this.taboo, required this.category});
  final String id;
  final String word;
  final List<String> taboo;
  final String category;
  factory TabooCard.fromJson(Json j) => TabooCard(id: j.str('id'), word: j.str('word'), taboo: j.strs('taboo'), category: j.str('category'));
}

class SummaryCard {
  const SummaryCard({required this.word, required this.taboo, required this.result});
  final String word;
  final List<String> taboo;

  /// correct | pass | taboo
  final String result;
  factory SummaryCard.fromJson(Json j) => SummaryCard(word: j.str('word'), taboo: j.strs('taboo'), result: j.str('result', 'pass'));
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
  const Flash({required this.id, required this.kind, this.word});
  final int id;

  /// correct | pass | taboo
  final String kind;
  final String? word;
  factory Flash.fromJson(Json j) => Flash(id: j.integer('id'), kind: j.str('kind', 'correct'), word: j.strOrNull('word'));
}

class TabooView {
  const TabooView({
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
    required this.tabooPenalty,
  });

  /// ready | turn | podium
  final String phase;
  final Map<String, List<String>> teams;
  final Map<String, int> scores;
  final String? myTeam;

  /// narrator | guesser | watcher | spectator
  final String role;

  /// Tamamlanan tur sayısı ve toplam (null = sınırsız).
  final int turnNumber;
  final int? totalTurns;

  /// Sıradaki ya da şu anki anlatan takım.
  final String team;
  final String narratorId;
  final int serverNow;
  final int endsAt;
  final int durationMs;
  final int? passesLeft;

  /// correct | pass | taboo → sayı
  final Map<String, int> turnStats;

  /// Yalnızca anlatıcıya ve rakip takıma gönderilir.
  final TabooCard? card;
  final bool canUndo;

  /// Son olay (animasyon için).
  final Flash? flash;
  final TurnSummary? lastTurn;
  final bool tabooPenalty;

  factory TabooView.fromJson(Json j) {
    final teams = j.obj('teams');
    final scores = j.obj('scores');
    final stats = j.obj('turnStats');
    return TabooView(
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
      durationMs: j.integer('durationMs', 60000),
      passesLeft: j.intOrNull('passesLeft'),
      turnStats: {for (final k in const ['correct', 'pass', 'taboo']) k: stats.integer(k)},
      card: j.objOrNull('card') == null ? null : TabooCard.fromJson(j.obj('card')),
      canUndo: j.boolean('canUndo'),
      flash: j.objOrNull('flash') == null ? null : Flash.fromJson(j.obj('flash')),
      lastTurn: j.objOrNull('lastTurn') == null ? null : TurnSummary.fromJson(j.obj('lastTurn')),
      tabooPenalty: j.boolean('tabooPenalty', true),
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
