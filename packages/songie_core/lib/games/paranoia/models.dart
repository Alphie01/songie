// games/paranoia/shared/index.ts karşılığı.
import '../../shared/models.dart';

const gameId = 'paranoia';
const minPlayers = 3;
const maxPlayers = 16;

const questionCountOptions = [5, 10, 15, 20];

/// 0 = süresiz.
const thinkOptions = [0, 20, 40];

/// Oyuncuların eklediği sorular bu kategoride toplanır.
const customCategory = 'eklenen';

const builtInCategories = ['genel', 'arkadaslik', 'ask', 'gelecek', 'utanc', 'yetenek', 'cesur', 'yatak-odasi', 'sarhos-gece', 'sinirsiz', 'sinir-testi'];

/// +18 kategoriler: varsayılan ayarlarda yoktur, oda sahibi bilerek açar.
const adultCategories = ['cesur', 'yatak-odasi', 'sarhos-gece', 'sinirsiz', 'sinir-testi'];
bool isAdultCategory(String id) => adultCategories.contains(id);

class ParanoiaSettings {
  const ParanoiaSettings({
    required this.questionCount,
    required this.categories,
    required this.thinkSeconds,
    required this.onTimeout,
    required this.allowSelf,
    required this.noReturn,
    required this.hideHolder,
    required this.firstHolder,
    required this.revealBy,
  });
  final int questionCount;
  final List<String> categories;

  /// Düşünme süresi (saniye). 0 = süresiz.
  final int thinkSeconds;

  /// random | pass: süre dolunca rastgele bir oyuncu seçilir ya da soru pas geçilir.
  final String onTimeout;

  /// Soruyu alan kişi kendini seçebilir mi?
  final bool allowSelf;

  /// Soruyu sana gönderen kişiyi (bir önceki soruyu alanı) seçemezsin.
  final bool noReturn;

  /// Açıkken soruyu kimin aldığı da diğerlerinden gizlenir.
  final bool hideHolder;

  /// random | host: ilk soruyu kim alır.
  final String firstHolder;

  /// host | vote: açıklamada "Sonraki"ye oda sahibi basar ya da çoğunluk oy verir.
  final String revealBy;

  factory ParanoiaSettings.fromJson(Json j) => ParanoiaSettings(
    questionCount: j.integer('questionCount', 10),
    categories: j.strs('categories'),
    thinkSeconds: j.integer('thinkSeconds', 40),
    onTimeout: j.str('onTimeout', 'random'),
    allowSelf: j.boolean('allowSelf'),
    noReturn: j.boolean('noReturn', true),
    hideHolder: j.boolean('hideHolder', true),
    firstHolder: j.str('firstHolder', 'random'),
    revealBy: j.str('revealBy', 'host'),
  );
}

/// Bir sorunun nasıl sonuçlandığı: chosen | random | pass | host.
class RevealedEntry {
  const RevealedEntry({required this.n, required this.question, required this.askedId, this.answerId, required this.how});

  /// 1'den başlayan sıra.
  final int n;
  final String question;

  /// Soruyu alan (cevaplayan) kişi.
  final String askedId;

  /// Cevap olarak seçilen kişi; pas geçildiyse null.
  final String? answerId;
  final String how;

  factory RevealedEntry.fromJson(Json j) =>
      RevealedEntry(n: j.integer('n'), question: j.str('question'), askedId: j.str('askedId'), answerId: j.strOrNull('answerId'), how: j.str('how', 'chosen'));
}

/// Kendi aldığın ve cevapladığın soru (yalnızca sana).
class MineEntry {
  const MineEntry({required this.question, this.answerId, required this.how});
  final String question;
  final String? answerId;
  final String how;
  factory MineEntry.fromJson(Json j) => MineEntry(question: j.str('question'), answerId: j.strOrNull('answerId'), how: j.str('how', 'chosen'));
}

class StatEntry {
  const StatEntry({required this.playerId, required this.picked, required this.asked});
  final String playerId;
  final int picked;
  final int asked;
  factory StatEntry.fromJson(Json j) => StatEntry(playerId: j.str('playerId'), picked: j.integer('picked'), asked: j.integer('asked'));
}

class ParanoiaView {
  const ParanoiaView({
    required this.phase,
    required this.players,
    required this.names,
    required this.total,
    required this.answered,
    required this.serverNow,
    this.endsAt,
    required this.durationMs,
    required this.seq,
    required this.myTurn,
    this.question,
    this.fromId,
    required this.choices,
    this.holderId,
    required this.holderOffline,
    required this.pulse,
    required this.mine,
    required this.revealed,
    required this.revealTotal,
    required this.votes,
    required this.votesNeeded,
    required this.myVote,
    required this.stats,
    required this.closesAt,
  });

  /// pickFirst | asking | reveal | summary
  final String phase;

  /// Oyundaki oyuncular (katılma sırasıyla).
  final List<String> players;

  /// Oyuncu adları (ayrılanlar dahil).
  final Map<String, String> names;
  final int total;

  /// Cevaplanan soru sayısı.
  final int answered;
  final int serverNow;

  /// Düşünme süresinin bittiği an; süresizse null.
  final int? endsAt;
  final int durationMs;

  /// Toplama aşamasındaki sorunun sıra numarası (hamlelerde gönderilir).
  final int seq;

  /// Soru sende mi?
  final bool myTurn;

  /// Yalnızca soruyu alan kişiye gider.
  final String? question;

  /// Soruyu sana gönderen kişi (yalnızca soruyu alana, "geri seçim yok" açıkken).
  final String? fromId;

  /// Seçilebilecek oyuncular: soruyu alana (ya da ilk seçimde oda sahibine) gider.
  final List<String> choices;

  /// Soruyu kimin aldığı; "kime sorulduğu gizli" açıkken başkalarına null.
  final String? holderId;

  /// Yalnızca oda sahibine: soruyu alan kişinin bağlantısı koptu.
  final bool holderOffline;

  /// Bir soru cevaplanınca artar.
  final int pulse;
  final List<MineEntry> mine;

  /// Açıklama: şimdiye kadar açılanlar (sonuncusu sahnede).
  final List<RevealedEntry> revealed;
  final int revealTotal;
  final int votes;
  final int votesNeeded;
  final bool myVote;

  /// Özet: kim kaç kez cevap olarak seçildi (çoktan aza).
  final List<StatEntry> stats;

  /// Özet ekranının kendiliğinden kapanacağı an.
  final int closesAt;

  factory ParanoiaView.fromJson(Json j) => ParanoiaView(
    phase: j.str('phase', 'pickFirst'),
    players: j.strs('players'),
    names: {
      for (final e in j.obj('names').entries)
        if (e.value is String) e.key: e.value as String,
    },
    total: j.integer('total'),
    answered: j.integer('answered'),
    serverNow: j.integer('serverNow'),
    endsAt: j.intOrNull('endsAt'),
    durationMs: j.integer('durationMs'),
    seq: j.integer('seq'),
    myTurn: j.boolean('myTurn'),
    question: j.strOrNull('question'),
    fromId: j.strOrNull('fromId'),
    choices: j.strs('choices'),
    holderId: j.strOrNull('holderId'),
    holderOffline: j.boolean('holderOffline'),
    pulse: j.integer('pulse'),
    mine: j.objs('mine').map(MineEntry.fromJson).toList(),
    revealed: j.objs('revealed').map(RevealedEntry.fromJson).toList(),
    revealTotal: j.integer('revealTotal'),
    votes: j.integer('votes'),
    votesNeeded: j.integer('votesNeeded'),
    myVote: j.boolean('myVote'),
    stats: j.objs('stats').map(StatEntry.fromJson).toList(),
    closesAt: j.integer('closesAt'),
  );
}

class CategoryInfo {
  const CategoryInfo({required this.id, required this.name, required this.count});
  final String id;
  final String name;
  final int count;
  factory CategoryInfo.fromJson(Json j) => CategoryInfo(id: j.str('id'), name: j.str('name'), count: j.integer('count'));
}
