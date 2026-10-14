// games/agents/shared/index.ts karşılığı.
import '../../shared/models.dart';
import '../../shared/text.dart';

const gameId = 'agents';

/// a = yeşil, b = mor.
const teamIds = ['a', 'b'];

const boardSize = 25;

const packIds = ['genel', 'kolay', 'zor'];

const secondsOptions = [60, 120];

/// İpucu sayısı: 0–9, -1 = sınırsız.
const unlimited = -1;

Map<String, List<String>> _teamLists(Json j) => {'a': j.strs('a'), 'b': j.strs('b')};

class AgentsSettings {
  const AgentsSettings({
    required this.teams,
    required this.leaders,
    required this.leaderPick,
    required this.revealMode,
    required this.timer,
    required this.seconds,
    required this.packs,
  });

  /// Oyuncu kimlikleri. Takımı seçilmemiş oyuncular başlarken dengeli dağıtılır.
  final Map<String, List<String>> teams;

  /// Oda sahibinin seçtiği liderler (`leaderPick: 'host'`).
  final Map<String, String?> leaders;

  /// host | random
  final String leaderPick;

  /// first | vote
  final String revealMode;

  /// off | split | total
  final String timer;
  final int seconds;
  final List<String> packs;

  factory AgentsSettings.fromJson(Json j) {
    final leaders = j.obj('leaders');
    return AgentsSettings(
      teams: _teamLists(j.obj('teams')),
      leaders: {'a': leaders.strOrNull('a'), 'b': leaders.strOrNull('b')},
      leaderPick: j.str('leaderPick', 'random'),
      revealMode: j.str('revealMode', 'first'),
      timer: j.str('timer', 'off'),
      seconds: j.integer('seconds', 120),
      packs: j['packs'] is List ? j.strs('packs') : const ['genel'],
    );
  }
}

class AgentsCard {
  const AgentsCard({required this.word, required this.color, required this.revealed, required this.votes});
  final String word;

  /// a | b | neutral | assassin. Açılmamış kartlarda yalnızca liderlere (ve tablo bitince herkese).
  final String? color;
  final bool revealed;

  /// Oylama modunda bu karta dokunan oyuncular.
  final List<String> votes;

  factory AgentsCard.fromJson(Json j) => AgentsCard(word: j.str('word'), color: j.strOrNull('color'), revealed: j.boolean('revealed'), votes: j.strs('votes'));
}

class ClueEntry {
  const ClueEntry({required this.team, required this.leaderId, required this.word, required this.number, required this.picks});
  final String team;
  final String leaderId;

  /// null = lider süresinde ipucu vermedi.
  final String? word;
  final int number;
  final List<({String word, String color})> picks;

  factory ClueEntry.fromJson(Json j) => ClueEntry(
    team: j.str('team', 'a'),
    leaderId: j.str('leaderId'),
    word: j.strOrNull('word'),
    number: j.integer('number'),
    picks: [for (final p in j.objs('picks')) (word: p.str('word'), color: p.str('color', 'neutral'))],
  );
}

class AgentsView {
  const AgentsView({
    required this.phase,
    required this.board,
    required this.turn,
    required this.cards,
    required this.keyVisible,
    required this.teams,
    required this.leaders,
    required this.nextLeaders,
    required this.myTeam,
    required this.role,
    required this.team,
    required this.startTeam,
    required this.remaining,
    required this.total,
    required this.clue,
    required this.guessesLeft,
    required this.log,
    required this.revealMode,
    required this.votesNeeded,
    required this.serverNow,
    required this.endsAt,
    required this.durationMs,
    required this.winner,
    required this.reason,
    required this.wins,
    required this.closing,
    required this.lastReveal,
  });

  /// clue | guess | over
  final String phase;
  final int board;
  final int turn;
  final List<AgentsCard> cards;
  final bool keyVisible;
  final Map<String, List<String>> teams;
  final Map<String, String> leaders;
  final Map<String, String> nextLeaders;
  final String? myTeam;

  /// leader | guesser | spectator
  final String role;

  /// Sırası gelen takım.
  final String team;
  final String startTeam;
  final Map<String, int> remaining;
  final Map<String, int> total;
  final ({String word, int number})? clue;

  /// Bu sırada kalan açma hakkı; null = sınırsız.
  final int? guessesLeft;
  final List<ClueEntry> log;

  /// first | vote
  final String revealMode;
  final int votesNeeded;
  final int serverNow;
  final int endsAt;
  final int durationMs;
  final String? winner;

  /// agents | assassin | ended
  final String? reason;
  final Map<String, int> wins;
  final bool closing;
  final ({int id, int index, String color})? lastReveal;

  factory AgentsView.fromJson(Json j) {
    Map<String, int> counts(String key) {
      final o = j.obj(key);
      return {'a': o.integer('a'), 'b': o.integer('b')};
    }

    Map<String, String> ids(String key) {
      final o = j.obj(key);
      return {
        for (final t in teamIds)
          if (o.strOrNull(t) case final id?) t: id,
      };
    }

    final clue = j.objOrNull('clue');
    final last = j.objOrNull('lastReveal');
    return AgentsView(
      phase: j.str('phase', 'clue'),
      board: j.integer('board', 1),
      turn: j.integer('turn'),
      cards: j.objs('cards').map(AgentsCard.fromJson).toList(),
      keyVisible: j.boolean('keyVisible'),
      teams: _teamLists(j.obj('teams')),
      leaders: ids('leaders'),
      nextLeaders: ids('nextLeaders'),
      myTeam: j.strOrNull('myTeam'),
      role: j.str('role', 'spectator'),
      team: j.str('team', 'a'),
      startTeam: j.str('startTeam', 'a'),
      remaining: counts('remaining'),
      total: counts('total'),
      clue: clue == null ? null : (word: clue.str('word'), number: clue.integer('number')),
      guessesLeft: j.intOrNull('guessesLeft'),
      log: j.objs('log').map(ClueEntry.fromJson).toList(),
      revealMode: j.str('revealMode', 'first'),
      votesNeeded: j.integer('votesNeeded', 1),
      serverNow: j.integer('serverNow'),
      endsAt: j.integer('endsAt'),
      durationMs: j.integer('durationMs'),
      winner: j.strOrNull('winner'),
      reason: j.strOrNull('reason'),
      wins: counts('wins'),
      closing: j.boolean('closing'),
      lastReveal: last == null ? null : (id: last.integer('id'), index: last.integer('index', -1), color: last.str('color')),
    );
  }
}

/// Türkçe ünsüz yumuşaması: kitap → kitab(ı), kanat → kanad(ı), ırmak → ırmağ(ı).
const _soften = {'p': 'b', 't': 'd', 'k': 'g'};

List<String> _stems(String folded) {
  final out = [folded];
  final last = folded.isEmpty ? '' : folded[folded.length - 1];
  final soft = _soften[last];
  if (soft != null) out.add(folded.substring(0, folded.length - 1) + soft);
  return out;
}

final _space = RegExp(r'\s');
final _letters = RegExp(r'^\p{L}+$', unicode: true);

/// İpucunun neden geçersiz olduğunu söyler (yoksa null). Sunucu ve istemci aynı kuralı kullanır.
/// [hidden]: tablodaki açılmamış kelimeler.
String? clueProblem(String raw, List<String> hidden) {
  final word = raw.trim();
  if (word.isEmpty) return 'İpucu yaz.';
  if (_space.hasMatch(word)) return 'İpucu tek kelime olmalı; boşluk kullanma.';
  if (!_letters.hasMatch(word)) return 'İpucu yalnızca harflerden oluşmalı.';
  if (word.length < 2) return 'İpucu en az 2 harf olmalı.';
  if (word.length > 24) return 'İpucu en fazla 24 harf olabilir.';
  final c = foldText(word);
  for (final w in hidden) {
    final f = foldText(w);
    final same = c == f;
    // İpucu kelimenin kökü (göz → gözlük) ya da kelime ipucunun kökü (kalem → kalemlik, kitap → kitabı).
    final rootOfWord = c.length >= 3 && f.startsWith(c);
    final wordIsRoot = f.length >= 3 && _stems(f).any(c.startsWith);
    // Bileşik kelime: denizyıldızı ↔ yıldız.
    final compound = f.length >= 5 && c.endsWith(f);
    if (same || rootOfWord || wordIsRoot || compound) return '“$word” tablodaki “$w” kelimesine çok yakın. Başka bir kelime seç.';
  }
  return null;
}
