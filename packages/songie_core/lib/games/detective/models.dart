// games/detective/shared/index.ts ve case-schema.ts karşılığı (oyuncuya giden kısımlar).
import '../../shared/models.dart';

const gameId = 'detective';
const notebookMax = 8000;
const noteMax = 400;
const hintsPerAct = 2;
const hintPenalty = 5;
const overtimeStep = 2;
const overtimeMax = 10;

/// Belge türleri (`DocKind`).
const docKinds = [
  'statement',
  'report',
  'phoneLog',
  'messages',
  'email',
  'receipt',
  'bank',
  'letter',
  'newspaper',
  'photo',
  'accessLog',
  'ticket',
  'table',
  'floorplan',
  'audio',
];

class DetectiveSettings {
  const DetectiveSettings({this.caseSlug, this.resume, this.leadMode = 'vote', this.hints = true});

  /// Oynanacak vaka.
  final String? caseSlug;

  /// Devam edilecek kayıtlı soruşturma (seçiliyse `caseSlug` onun vakasıdır).
  final String? resume;

  /// vote | host
  final String leadMode;
  final bool hints;

  factory DetectiveSettings.fromJson(Json j) => DetectiveSettings(
    caseSlug: j.strOrNull('caseSlug'),
    resume: j.strOrNull('resume'),
    leadMode: j.str('leadMode', 'vote') == 'host' ? 'host' : 'vote',
    hints: j.boolean('hints', true),
  );

  Json toJson() => {'caseSlug': caseSlug, 'resume': resume, 'leadMode': leadMode, 'hints': hints};
}

// ---------- Lobi / HTTP ----------

class CaseCard {
  const CaseCard({
    required this.slug,
    required this.title,
    required this.subtitle,
    required this.genre,
    required this.difficulty,
    required this.minutes,
    required this.teaser,
    this.coverUrl,
    required this.acts,
    required this.evidenceCount,
    this.solved,
  });
  final String slug;
  final String title;
  final String subtitle;
  final String genre;
  final String difficulty;
  final int minutes;
  final String teaser;
  final String? coverUrl;
  final int acts;
  final int evidenceCount;
  final ({String rank, int score})? solved;

  factory CaseCard.fromJson(Json j) {
    final s = j.objOrNull('solved');
    return CaseCard(
      slug: j.str('slug'),
      title: j.str('title'),
      subtitle: j.str('subtitle'),
      genre: j.str('genre'),
      difficulty: j.str('difficulty'),
      minutes: j.integer('minutes'),
      teaser: j.str('teaser'),
      coverUrl: j.strOrNull('coverUrl'),
      acts: j.integer('acts'),
      evidenceCount: j.integer('evidenceCount'),
      solved: s == null ? null : (rank: s.str('rank'), score: s.integer('score')),
    );
  }
}

class SessionCard {
  const SessionCard({
    required this.id,
    required this.slug,
    required this.title,
    required this.act,
    required this.acts,
    required this.hoursSpent,
    required this.updatedAt,
    required this.members,
    this.hoursBudget,
    this.crew = const [],
  });
  final String id;
  final String slug;
  final String title;
  final int act;
  final int acts;
  final int hoursSpent;
  final int updatedAt;
  final List<String> members;

  /// Vakanın saat bütçesi (eski sunucuda yok).
  final int? hoursBudget;

  /// Üyelerin adı ve avatarı.
  final List<({String id, String nick, Avatar avatar})> crew;

  factory SessionCard.fromJson(Json j) => SessionCard(
    id: j.str('id'),
    slug: j.str('slug'),
    title: j.str('title'),
    act: j.integer('act'),
    acts: j.integer('acts'),
    hoursSpent: j.integer('hoursSpent'),
    updatedAt: j.integer('updatedAt'),
    members: j.strs('members'),
    hoursBudget: j.intOrNull('hoursBudget'),
    crew: [for (final m in j.objs('crew')) (id: m.str('id'), nick: m.str('nick'), avatar: Avatar.fromJson(m['avatar']))],
  );
}

class CasesResponse {
  const CasesResponse({required this.cases, required this.sessions});
  final List<CaseCard> cases;
  final List<SessionCard> sessions;

  factory CasesResponse.fromJson(Json j) =>
      CasesResponse(cases: j.objs('cases').map(CaseCard.fromJson).toList(), sessions: j.objs('sessions').map(SessionCard.fromJson).toList());
}

// ---------- Görünüm ----------

class Note {
  const Note({required this.id, required this.by, required this.text, required this.at});
  final String id;
  final String by;
  final String text;
  final int at;
  factory Note.fromJson(Json j) => Note(id: j.str('id'), by: j.str('by'), text: j.str('text'), at: j.integer('at'));
}

class CharacterView {
  const CharacterView({
    required this.id,
    required this.name,
    this.age,
    required this.role,
    required this.relation,
    required this.summary,
    this.portraitUrl,
    this.portraitAlt,
    required this.victim,
    required this.suspect,
    this.mark,
    required this.notes,
  });
  final String id;
  final String name;
  final int? age;
  final String role;
  final String relation;
  final String summary;
  final String? portraitUrl;
  final String? portraitAlt;
  final bool victim;
  final bool suspect;

  /// suspect | clear, kim işaretledi.
  final ({String mark, String by})? mark;
  final List<Note> notes;

  factory CharacterView.fromJson(Json j) {
    final m = j.objOrNull('mark');
    return CharacterView(
      id: j.str('id'),
      name: j.str('name'),
      age: j.intOrNull('age'),
      role: j.str('role'),
      relation: j.str('relation'),
      summary: j.str('summary'),
      portraitUrl: j.strOrNull('portraitUrl'),
      portraitAlt: j.strOrNull('portraitAlt'),
      victim: j.boolean('victim'),
      suspect: j.boolean('suspect'),
      mark: m == null ? null : (mark: m.str('mark'), by: m.str('by')),
      notes: j.objs('notes').map(Note.fromJson).toList(),
    );
  }
}

class PlanRoom {
  const PlanRoom({required this.id, required this.label, required this.x, required this.y, required this.w, required this.h, required this.outdoor});
  final String id;
  final String label;
  final double x;
  final double y;
  final double w;
  final double h;
  final bool outdoor;
  factory PlanRoom.fromJson(Json j) => PlanRoom(
    id: j.str('id'),
    label: j.str('label'),
    x: j.number('x'),
    y: j.number('y'),
    w: j.number('w'),
    h: j.number('h'),
    outdoor: j.boolean('outdoor'),
  );
}

class PlanDoor {
  const PlanDoor({required this.x, required this.y, required this.vertical, this.label});
  final double x;
  final double y;
  final bool vertical;
  final String? label;
  factory PlanDoor.fromJson(Json j) => PlanDoor(x: j.number('x'), y: j.number('y'), vertical: j.boolean('vertical'), label: j.strOrNull('label'));
}

class PlanMarker {
  const PlanMarker({required this.x, required this.y, required this.label, required this.kind});
  final double x;
  final double y;
  final String label;

  /// body | camera | item | stain | note
  final String kind;
  factory PlanMarker.fromJson(Json j) => PlanMarker(x: j.number('x'), y: j.number('y'), label: j.str('label'), kind: j.str('kind', 'note'));
}

class FloorPlan {
  const FloorPlan({required this.width, required this.height, required this.rooms, required this.doors, required this.windows, required this.markers});
  final double width;
  final double height;
  final List<PlanRoom> rooms;
  final List<PlanDoor> doors;

  /// Pencerelerde `label` yok.
  final List<PlanDoor> windows;
  final List<PlanMarker> markers;

  factory FloorPlan.fromJson(Json j) => FloorPlan(
    width: j.number('width', 1),
    height: j.number('height', 1),
    rooms: j.objs('rooms').map(PlanRoom.fromJson).toList(),
    doors: j.objs('doors').map(PlanDoor.fromJson).toList(),
    windows: j.objs('windows').map(PlanDoor.fromJson).toList(),
    markers: j.objs('markers').map(PlanMarker.fromJson).toList(),
  );
}

class LocationView {
  const LocationView({required this.id, required this.name, required this.description, this.imageUrl, this.imageAlt, this.plan});
  final String id;
  final String name;
  final String description;
  final String? imageUrl;
  final String? imageAlt;
  final FloorPlan? plan;
  factory LocationView.fromJson(Json j) => LocationView(
    id: j.str('id'),
    name: j.str('name'),
    description: j.str('description'),
    imageUrl: j.strOrNull('imageUrl'),
    imageAlt: j.strOrNull('imageAlt'),
    plan: j.objOrNull('plan') == null ? null : FloorPlan.fromJson(j.obj('plan')),
  );
}

class EvidenceView {
  const EvidenceView({
    required this.id,
    required this.title,
    required this.summary,
    required this.kind,
    required this.act,
    this.source,
    required this.seq,
    required this.pinned,
    required this.notes,
    required this.people,
    this.thumbUrl,
  });
  final String id;
  final String title;
  final String summary;

  /// `DocKind`
  final String kind;

  /// Hangi bölümde dosyaya girdi (0'dan).
  final int act;

  /// Açan izin başlığı (bölüm başında geldiyse null).
  final String? source;

  /// Dosyaya giriş sırası (yeniler büyük).
  final int seq;
  final bool pinned;
  final List<Note> notes;
  final List<String> people;
  final String? thumbUrl;

  factory EvidenceView.fromJson(Json j) => EvidenceView(
    id: j.str('id'),
    title: j.str('title'),
    summary: j.str('summary'),
    kind: j.str('kind'),
    act: j.integer('act'),
    source: j.strOrNull('source'),
    seq: j.integer('seq'),
    pinned: j.boolean('pinned'),
    notes: j.objs('notes').map(Note.fromJson).toList(),
    people: j.strs('people'),
    thumbUrl: j.strOrNull('thumbUrl'),
  );
}

class TimelineItem {
  const TimelineItem({required this.at, required this.text, this.evidenceId});

  /// "2025-03-14T21:40"
  final String at;
  final String text;
  final String? evidenceId;
  factory TimelineItem.fromJson(Json j) => TimelineItem(at: j.str('at'), text: j.str('text'), evidenceId: j.strOrNull('evidenceId'));
}

class LeadView {
  const LeadView({required this.id, required this.title, required this.description, required this.hours, this.from});
  final String id;
  final String title;
  final String description;
  final int hours;

  /// İzi doğuran belge (belge okununca keşfedildiyse).
  final ({String id, String title})? from;

  factory LeadView.fromJson(Json j) {
    final f = j.objOrNull('from');
    return LeadView(
      id: j.str('id'),
      title: j.str('title'),
      description: j.str('description'),
      hours: j.integer('hours'),
      from: f == null ? null : (id: f.str('id'), title: f.str('title')),
    );
  }
}

class OpenedLeadView {
  const OpenedLeadView({
    required this.id,
    required this.title,
    required this.description,
    required this.hours,
    required this.outcome,
    required this.act,
    this.by,
    required this.evidence,
  });
  final String id;
  final String title;
  final String description;
  final int hours;
  final String outcome;
  final int act;
  final String? by;
  final List<String> evidence;
  factory OpenedLeadView.fromJson(Json j) => OpenedLeadView(
    id: j.str('id'),
    title: j.str('title'),
    description: j.str('description'),
    hours: j.integer('hours'),
    outcome: j.str('outcome'),
    act: j.integer('act'),
    by: j.strOrNull('by'),
    evidence: j.strs('evidence'),
  );
}

class TranscriptEntry {
  const TranscriptEntry({
    required this.kind,
    required this.prompt,
    this.evidenceId,
    required this.answer,
    required this.by,
    required this.at,
    this.audioUrl,
    required this.unlocked,
  });

  /// ask | confront | deflect
  final String kind;

  /// Sorulan soru ya da gösterilen belgenin başlığı.
  final String prompt;
  final String? evidenceId;
  final String answer;
  final String by;
  final int at;

  /// Kilit anın seslendirmesi.
  final String? audioUrl;

  /// Bu cevapla dosyaya giren belgeler.
  final List<String> unlocked;

  factory TranscriptEntry.fromJson(Json j) => TranscriptEntry(
    kind: j.str('kind', 'ask'),
    prompt: j.str('prompt'),
    evidenceId: j.strOrNull('evidenceId'),
    answer: j.str('answer'),
    by: j.str('by'),
    at: j.integer('at'),
    audioUrl: j.strOrNull('audioUrl'),
    unlocked: j.strs('unlocked'),
  );
}

class InterviewView {
  const InterviewView({
    required this.id,
    required this.characterId,
    required this.title,
    required this.place,
    required this.intro,
    required this.act,
    required this.transcript,
    required this.questions,
  });
  final String id;
  final String characterId;
  final String title;
  final String place;
  final String intro;

  /// Açıldığı bölüm (0'dan).
  final int act;
  final List<TranscriptEntry> transcript;

  /// Şu an sorulabilecek sorular.
  final List<({String id, String ask})> questions;

  factory InterviewView.fromJson(Json j) => InterviewView(
    id: j.str('id'),
    characterId: j.str('characterId'),
    title: j.str('title'),
    place: j.str('place'),
    intro: j.str('intro'),
    act: j.integer('act'),
    transcript: j.objs('transcript').map(TranscriptEntry.fromJson).toList(),
    questions: [for (final q in j.objs('questions')) (id: q.str('id'), ask: q.str('ask'))],
  );
}

class ProposalView {
  const ProposalView({required this.kind, this.leadId, required this.by, required this.votes, required this.needed});

  /// lead | close
  final String kind;
  final String? leadId;
  final String by;

  /// Oyuncu kimliği → evet/hayır (eklenme sırasıyla).
  final Map<String, bool> votes;

  /// Geçmesi için gereken evet sayısı.
  final int needed;

  factory ProposalView.fromJson(Json j) {
    final v = j.obj('votes');
    return ProposalView(
      kind: j.str('kind', 'lead'),
      leadId: j.strOrNull('leadId'),
      by: j.str('by'),
      votes: {for (final e in v.entries) e.key: e.value == true},
      needed: j.integer('needed'),
    );
  }
}

class QuestionOption {
  const QuestionOption({required this.id, required this.text});
  final String id;
  final String text;
}

class QuestionView {
  const QuestionView({required this.id, required this.prompt, required this.kind, required this.options, required this.points});
  final String id;
  final String prompt;

  /// suspect | choice | evidence
  final String kind;
  final List<QuestionOption> options;
  final int points;

  factory QuestionView.fromJson(Json j) => QuestionView(
    id: j.str('id'),
    prompt: j.str('prompt'),
    kind: j.str('kind', 'choice'),
    options: [for (final o in j.objs('options')) QuestionOption(id: o.str('id'), text: o.str('text'))],
    points: j.integer('points'),
  );
}

class ResultQuestion {
  const ResultQuestion({required this.id, required this.prompt, this.team, required this.correct, required this.ok, required this.points});
  final String id;
  final String prompt;
  final String? team;
  final List<String> correct;
  final bool ok;
  final int points;
  factory ResultQuestion.fromJson(Json j) => ResultQuestion(
    id: j.str('id'),
    prompt: j.str('prompt'),
    team: j.strOrNull('team'),
    correct: j.strs('correct'),
    ok: j.boolean('ok'),
    points: j.integer('points'),
  );
}

class ChainStep {
  const ChainStep({required this.step, required this.evidence});
  final String step;
  final List<({String id, String title, bool found})> evidence;
  factory ChainStep.fromJson(Json j) => ChainStep(
    step: j.str('step'),
    evidence: [for (final e in j.objs('evidence')) (id: e.str('id'), title: e.str('title'), found: e.boolean('found'))],
  );
}

class SecretView {
  const SecretView({required this.name, required this.secret, required this.whereabouts, required this.lies});
  final String name;
  final String secret;
  final String whereabouts;
  final List<String> lies;
  factory SecretView.fromJson(Json j) =>
      SecretView(name: j.str('name'), secret: j.str('secret'), whereabouts: j.str('whereabouts'), lies: j.strs('lies'));
}

class ResultView {
  const ResultView({
    required this.solved,
    required this.score,
    required this.maxScore,
    required this.rank,
    required this.breakdown,
    required this.questions,
    required this.individual,
    required this.culprits,
    required this.story,
    required this.timeline,
    required this.chain,
    required this.redHerrings,
    required this.characters,
  });
  final bool solved;
  final int score;
  final int maxScore;
  final String rank;
  final List<({String label, int points})> breakdown;
  final List<ResultQuestion> questions;
  final List<({String playerId, int correct, int total})> individual;
  final List<String> culprits;
  final String story;
  final List<TimelineItem> timeline;
  final List<ChainStep> chain;
  final List<({String title, String explanation})> redHerrings;
  final List<SecretView> characters;

  factory ResultView.fromJson(Json j) => ResultView(
    solved: j.boolean('solved'),
    score: j.integer('score'),
    maxScore: j.integer('maxScore'),
    rank: j.str('rank'),
    breakdown: [for (final b in j.objs('breakdown')) (label: b.str('label'), points: b.integer('points'))],
    questions: j.objs('questions').map(ResultQuestion.fromJson).toList(),
    individual: [for (final i in j.objs('individual')) (playerId: i.str('playerId'), correct: i.integer('correct'), total: i.integer('total'))],
    culprits: j.strs('culprits'),
    story: j.str('story'),
    timeline: j.objs('timeline').map(TimelineItem.fromJson).toList(),
    chain: j.objs('chain').map(ChainStep.fromJson).toList(),
    redHerrings: [for (final r in j.objs('redHerrings')) (title: r.str('title'), explanation: r.str('explanation'))],
    characters: j.objs('characters').map(SecretView.fromJson).toList(),
  );
}

class CaseInfo {
  const CaseInfo({required this.slug, required this.title, required this.subtitle, required this.genre, required this.difficulty, this.coverUrl});
  final String slug;
  final String title;
  final String subtitle;
  final String genre;
  final String difficulty;
  final String? coverUrl;
  factory CaseInfo.fromJson(Json j) => CaseInfo(
    slug: j.str('slug'),
    title: j.str('title'),
    subtitle: j.str('subtitle'),
    genre: j.str('genre'),
    difficulty: j.str('difficulty'),
    coverUrl: j.strOrNull('coverUrl'),
  );
}

class ActInfo {
  const ActInfo({required this.index, required this.total, required this.title, required this.scene, this.imageUrl, this.imageAlt, this.narrationUrl});
  final int index;

  /// Yalnızca güncel bölümde dolu (bölüm listesinde 0).
  final int total;
  final String title;
  final String scene;
  final String? imageUrl;
  final String? imageAlt;

  /// Anlatıcının seslendirmesi (yoksa null).
  final String? narrationUrl;

  factory ActInfo.fromJson(Json j) => ActInfo(
    index: j.integer('index'),
    total: j.integer('total'),
    title: j.str('title'),
    scene: j.str('scene'),
    imageUrl: j.strOrNull('imageUrl'),
    imageAlt: j.strOrNull('imageAlt'),
    narrationUrl: j.strOrNull('narrationUrl'),
  );
}

class HoursView {
  const HoursView({required this.spent, required this.budget, required this.target, required this.actSpent, this.actLimit});
  final int spent;
  final int budget;
  final int target;
  final int actSpent;
  final int? actLimit;
  factory HoursView.fromJson(Json j) => HoursView(
    spent: j.integer('spent'),
    budget: j.integer('budget'),
    target: j.integer('target'),
    actSpent: j.integer('actSpent'),
    actLimit: j.intOrNull('actLimit'),
  );
}

class NotebookView {
  const NotebookView({required this.text, required this.version, this.by, required this.at});
  final String text;
  final int version;
  final String? by;
  final int at;
  factory NotebookView.fromJson(Json j) => NotebookView(text: j.str('text'), version: j.integer('version'), by: j.strOrNull('by'), at: j.integer('at'));
}

class HintsView {
  const HintsView({required this.enabled, required this.used, required this.left});
  final bool enabled;
  final List<({int act, String text})> used;
  final int left;
  factory HintsView.fromJson(Json j) => HintsView(
    enabled: j.boolean('enabled'),
    used: [for (final u in j.objs('used')) (act: u.integer('act'), text: u.str('text'))],
    left: j.integer('left'),
  );
}

class AccuseView {
  const AccuseView({required this.submitted, this.mine});
  final List<String> submitted;
  final Map<String, String>? mine;
  factory AccuseView.fromJson(Json j) {
    final m = j.objOrNull('mine');
    return AccuseView(submitted: j.strs('submitted'), mine: m == null ? null : {for (final e in m.entries) if (e.value is String) e.key: e.value as String});
  }
}

class ReconcileView {
  const ReconcileView({required this.tallies, required this.finals});

  /// Soru → cevap → oy verenler.
  final Map<String, Map<String, List<String>>> tallies;

  /// Soru → ekip cevabı.
  final Map<String, String?> finals;

  factory ReconcileView.fromJson(Json j) {
    final t = j.obj('tallies');
    final f = j.obj('final');
    return ReconcileView(
      tallies: {
        for (final q in t.entries)
          q.key: {for (final a in asJson(q.value).entries) a.key: (a.value is List ? (a.value as List).whereType<String>().toList() : <String>[])},
      },
      finals: {for (final e in f.entries) e.key: e.value is String ? e.value as String : null},
    );
  }
}

class DetectiveView {
  const DetectiveView({
    required this.phase,
    required this.serverNow,
    required this.sessionId,
    required this.leadMode,
    required this.caseInfo,
    required this.act,
    required this.acts,
    required this.hours,
    required this.characters,
    required this.locations,
    required this.evidence,
    required this.timeline,
    required this.leads,
    required this.opened,
    required this.interviews,
    this.proposal,
    required this.notebook,
    required this.hints,
    required this.canClose,
    required this.sceneReady,
    required this.questions,
    this.accuse,
    this.reconcile,
    this.result,
    required this.log,
  });

  /// scene | investigate | accuse | reconcile | result
  final String phase;
  final int serverNow;
  final String sessionId;

  /// vote | host
  final String leadMode;
  final CaseInfo caseInfo;
  final ActInfo act;

  /// Ulaşılan bölümler (sahneyi yeniden okumak için).
  final List<ActInfo> acts;
  final HoursView hours;
  final List<CharacterView> characters;
  final List<LocationView> locations;
  final List<EvidenceView> evidence;
  final List<TimelineItem> timeline;
  final List<LeadView> leads;
  final List<OpenedLeadView> opened;
  final List<InterviewView> interviews;
  final ProposalView? proposal;
  final NotebookView notebook;
  final HintsView hints;
  final bool canClose;
  final List<String> sceneReady;
  final List<QuestionView> questions;
  final AccuseView? accuse;
  final ReconcileView? reconcile;
  final ResultView? result;
  final List<({int at, String text})> log;

  bool get isFinal => phase == 'accuse' || phase == 'reconcile' || phase == 'result';

  factory DetectiveView.fromJson(Json j) => DetectiveView(
    phase: j.str('phase', 'scene'),
    serverNow: j.integer('serverNow'),
    sessionId: j.str('sessionId'),
    leadMode: j.str('leadMode', 'vote'),
    caseInfo: CaseInfo.fromJson(j.obj('case')),
    act: ActInfo.fromJson(j.obj('act')),
    acts: j.objs('acts').map(ActInfo.fromJson).toList(),
    hours: HoursView.fromJson(j.obj('hours')),
    characters: j.objs('characters').map(CharacterView.fromJson).toList(),
    locations: j.objs('locations').map(LocationView.fromJson).toList(),
    evidence: j.objs('evidence').map(EvidenceView.fromJson).toList(),
    timeline: j.objs('timeline').map(TimelineItem.fromJson).toList(),
    leads: j.objs('leads').map(LeadView.fromJson).toList(),
    opened: j.objs('opened').map(OpenedLeadView.fromJson).toList(),
    interviews: j.objs('interviews').map(InterviewView.fromJson).toList(),
    proposal: j.objOrNull('proposal') == null ? null : ProposalView.fromJson(j.obj('proposal')),
    notebook: NotebookView.fromJson(j.obj('notebook')),
    hints: HintsView.fromJson(j.obj('hints')),
    canClose: j.boolean('canClose'),
    sceneReady: j.strs('sceneReady'),
    questions: j.objs('questions').map(QuestionView.fromJson).toList(),
    accuse: j.objOrNull('accuse') == null ? null : AccuseView.fromJson(j.obj('accuse')),
    reconcile: j.objOrNull('reconcile') == null ? null : ReconcileView.fromJson(j.obj('reconcile')),
    result: j.objOrNull('result') == null ? null : ResultView.fromJson(j.obj('result')),
    log: [for (final l in j.objs('log')) (at: l.integer('at'), text: l.str('text'))],
  );
}

/// `doc` aksiyonunun cevabı (`DocResponse`). Belgenin kendisi ham JSON olarak tutulur;
/// türüne göre documents.dart okur.
class DocResponse {
  const DocResponse({required this.doc, required this.title, required this.evidenceId, required this.images, this.audioUrl});
  final Json doc;
  final String title;
  final String evidenceId;

  /// Görsel anahtarı → adres (yoksa null) + tarif.
  final Map<String, ({String? url, String alt})> images;

  /// Ses kanıtının kaydı (seslendirilmediyse null).
  final String? audioUrl;

  String get kind => doc.str('kind');

  /// Aksiyon cevabından (`ack['doc']` …) okur; belge yoksa null.
  static DocResponse? fromAck(Json data, String fallbackId) {
    final doc = data.objOrNull('doc');
    if (doc == null) return null;
    final imgs = data.obj('images');
    return DocResponse(
      doc: doc,
      title: data['title']?.toString() ?? '',
      evidenceId: data['evidenceId']?.toString() ?? fallbackId,
      images: {
        for (final e in imgs.entries)
          if (e.value is Map) e.key: (url: asJson(e.value).strOrNull('url'), alt: asJson(e.value).str('alt')),
      },
      audioUrl: data.strOrNull('audioUrl'),
    );
  }
}
