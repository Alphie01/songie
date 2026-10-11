import { randomBytes } from 'node:crypto';
import { UserFacingError, type GameContext, type ServerGame } from '@songie/game-kit/server';
import {
  GAME_ID,
  HINTS_PER_ACT,
  HINT_PENALTY,
  OVERTIME_MAX,
  OVERTIME_STEP,
  MAX_PLAYERS,
  MAX_TIME_BONUS,
  MIN_PLAYERS,
  TIME_BONUS_PER_HOUR,
  actionSchema,
  defaultSettings,
  settingsSchema,
  type CaseDoc,
  type CaseFile,
  type DetectiveAction,
  type DetectiveSettings,
  type DetectiveView,
  type DocResponse,
  type Lead,
  type Mark,
  type Note,
  type Phase,
  type ResultView,
} from '../shared/index.js';
import { interviewAudioKey, type CaseLibrary, type LoadedCase } from './library.js';
import type { SessionStore } from './sessions.js';

export class GameError extends UserFacingError {}

const LOG_MAX = 40;
const NOTES_MAX = 400;

type Target = { kind: 'evidence' | 'character'; id: string };

/** Veritabanına yazılan, kaldığı yerden devam için yeterli durum. */
export interface Saved {
  slug: string;
  actIndex: number;
  phase: Phase;
  hoursSpent: number;
  actHours: number;
  discovered: string[];
  /** İzin keşfedildiği bölüm (bölüm saatine yalnızca o bölümde keşfedilen izler sayılır). */
  discoveredAct: Record<string, number>;
  opened: { id: string; act: number; by: string | null; at: number }[];
  unlocked: { id: string; act: number; source: string | null; seq: number }[];
  notebook: { text: string; version: number; by: string | null; at: number };
  marks: Record<string, { mark: Mark; by: string }>;
  notes: (Note & { target: Target })[];
  noteSeq: number;
  pins: string[];
  hintsUsed: { act: number; index: number }[];
  /** Açılmış sorgular ve açıldıkları bölüm. */
  interviewsOpen: { id: string; act: number }[];
  /** En az bir oyuncunun açıp okuduğu belgeler (belgeden doğan izler için). */
  read: string[];
  /** İzin keşfine yol açan belge (iz kimliği → kanıt kimliği). */
  leadFrom: Record<string, string>;
  /** Sorgu tutanağı: q:<soru> | c:<belge> (tepki) | d:<belge> (kaçamak). */
  asked: { iv: string; key: string; by: string; at: number }[];
  sceneReady: string[];
  answers: Record<string, Record<string, string>>;
  final: Record<string, string | null>;
  result: ResultView | null;
  log: { at: number; text: string }[];
}

interface Proposal {
  kind: 'lead' | 'close';
  leadId: string | null;
  by: string;
  votes: Record<string, boolean>;
  /** Geçmesi için gereken evet (oda sahibi modunda 0: oy yok). */
  needed: number;
}

export interface DetectiveState extends Saved {
  sessionId: string;
  createdAt: number;
  members: string[];
  settings: DetectiveSettings;
  proposal: Proposal | null;
  /** Oturum açıkken yüklü vaka (JSON'a yazılmaz). */
  loaded: LoadedCase;
}

export interface DetectiveDeps {
  library: CaseLibrary;
  sessions: SessionStore;
}

function newSessionId(): string {
  return randomBytes(6).toString('base64url');
}

function fresh(slug: string): Saved {
  return {
    slug,
    actIndex: 0,
    phase: 'scene',
    hoursSpent: 0,
    actHours: 0,
    discovered: [],
    discoveredAct: {},
    opened: [],
    unlocked: [],
    notebook: { text: '', version: 0, by: null, at: 0 },
    marks: {},
    notes: [],
    noteSeq: 0,
    pins: [],
    hintsUsed: [],
    interviewsOpen: [],
    read: [],
    leadFrom: {},
    asked: [],
    sceneReady: [],
    answers: {},
    final: {},
    result: null,
    log: [],
  };
}

const SAVED_KEYS: (keyof Saved)[] = Object.keys(fresh('x')) as (keyof Saved)[];

/** Kayıtlı durumu yüklü vakaya karşı temizler (vaka sonradan düzenlendiyse bilinmeyen kimlikler düşer). */
function restore(raw: unknown, c: CaseFile): Saved {
  const base = fresh(c.meta.slug);
  const src = (raw && typeof raw === 'object' ? raw : {}) as Partial<Saved>;
  const s = { ...base, ...Object.fromEntries(SAVED_KEYS.filter((k) => k in src).map((k) => [k, src[k]])) } as Saved;
  const evs = new Set(c.evidence.map((e) => e.id));
  const leads = new Set(c.leads.map((l) => l.id));
  s.actIndex = Math.min(Math.max(0, s.actIndex | 0), c.acts.length - 1);
  s.unlocked = s.unlocked.filter((u) => evs.has(u.id));
  s.opened = s.opened.filter((o) => leads.has(o.id));
  s.discovered = s.discovered.filter((l) => leads.has(l));
  s.pins = s.pins.filter((p) => evs.has(p));
  const ivs = new Set(c.interviews.map((i) => i.id));
  s.interviewsOpen = s.interviewsOpen.filter((i) => ivs.has(i.id));
  s.asked = s.asked.filter((a) => ivs.has(a.iv));
  if (s.phase === 'result') s.phase = 'investigate';
  s.result = null;
  return s;
}

export function createDetectiveGame(deps: DetectiveDeps): ServerGame<DetectiveSettings, DetectiveState, DetectiveAction> {
  const { library, sessions } = deps;

  // ---------- yardımcılar ----------

  const caseOf = (st: DetectiveState) => st.loaded.data;
  const nick = (ctx: GameContext, id: string | null) => (id ? (ctx.players().find((p) => p.id === id)?.nick ?? 'Biri') : 'Biri');
  const isHost = (ctx: GameContext, id: string) => ctx.hostId() === id;
  const connectedIds = (ctx: GameContext) => ctx.players().filter((p) => p.connected).map((p) => p.id);

  function log(ctx: GameContext, st: DetectiveState, text: string) {
    st.log.push({ at: ctx.now(), text });
    if (st.log.length > LOG_MAX) st.log.splice(0, st.log.length - LOG_MAX);
  }

  function persist(ctx: GameContext, st: DetectiveState, done = false) {
    const data = Object.fromEntries(SAVED_KEYS.map((k) => [k, st[k]]));
    sessions.save({
      id: st.sessionId,
      slug: st.slug,
      status: done ? 'done' : 'active',
      members: st.members,
      data,
      act: st.actIndex,
      hoursSpent: st.hoursSpent,
      score: st.result?.score ?? null,
      rank: st.result?.rank ?? null,
      createdAt: st.createdAt,
      updatedAt: ctx.now(),
    });
  }

  function commit(ctx: GameContext, st: DetectiveState) {
    persist(ctx, st);
    ctx.pushViews();
  }

  const leadOf = (st: DetectiveState, id: string): Lead => {
    const lead = caseOf(st).leads.find((l) => l.id === id);
    if (!lead) throw new GameError('Böyle bir iz yok.');
    return lead;
  };
  const isOpened = (st: DetectiveState, id: string) => st.opened.some((o) => o.id === id);
  const isUnlocked = (st: DetectiveState, id: string) => st.unlocked.some((u) => u.id === id);
  const available = (st: DetectiveState) =>
    st.discovered.filter((id) => {
      if (isOpened(st, id)) return false;
      const min = caseOf(st).leads.find((l) => l.id === id)?.minAct;
      return !min || min - 1 <= st.actIndex;
    });
  const hoursLeft = (st: DetectiveState) => caseOf(st).meta.hoursBudget - st.hoursSpent;

  function unlock(st: DetectiveState, ids: string[], source: string | null) {
    for (const id of ids) {
      if (isUnlocked(st, id)) continue;
      st.unlocked.push({ id, act: st.actIndex, source, seq: st.unlocked.length + 1 });
    }
  }
  function discover(st: DetectiveState, ids: string[]) {
    for (const id of ids) {
      if (st.discovered.includes(id)) continue;
      st.discovered.push(id);
      // minAct'li iz o bölüme kadar görünmez; o bölümde keşfedilmiş sayılır.
      const min = caseOf(st).leads.find((l) => l.id === id)?.minAct;
      st.discoveredAct[id] = Math.max(st.actIndex, min ? min - 1 : 0);
    }
  }

  function openInterviews(st: DetectiveState, ids: string[]) {
    for (const id of ids) if (!st.interviewsOpen.some((i) => i.id === id)) st.interviewsOpen.push({ id, act: st.actIndex });
  }

  const interviewOf = (st: DetectiveState, id: string) => {
    const iv = caseOf(st).interviews.find((x) => x.id === id);
    if (!iv || !st.interviewsOpen.some((x) => x.id === id)) throw new GameError('Bu sorgu henüz açılmadı.');
    return iv;
  };
  const askedKey = (st: DetectiveState, iv: string, key: string) => st.asked.some((a) => a.iv === iv && a.key === key);

  /** Sorgudaki bir sorunun şu an sorulabilir olup olmadığı. */
  function askable(st: DetectiveState, ivId: string, q: { id: string; after: string[]; needs: string[] }): boolean {
    return !askedKey(st, ivId, `q:${q.id}`) && q.after.every((a) => askedKey(st, ivId, `q:${a}`)) && q.needs.every((e) => isUnlocked(st, e));
  }

  function applyOutcome(st: DetectiveState, ivId: string, o: { unlocks: string[]; leadsTo: string[] }) {
    unlock(st, o.unlocks, `iv:${ivId}`);
    discover(st, o.leadsTo);
  }

  function enterAct(ctx: GameContext, st: DetectiveState, index: number) {
    const act = caseOf(st).acts[index]!;
    st.actIndex = index;
    st.actHours = 0;
    st.phase = 'scene';
    st.sceneReady = [];
    st.proposal = null;
    unlock(st, act.evidence, null);
    discover(st, act.leads);
    openInterviews(st, act.interviews);
    log(ctx, st, `Bölüm ${index + 1}: ${act.title}`);
  }

  /** Bölüm geçiş koşulu sağlandıysa sonraki bölümü açar. */
  function checkAdvance(ctx: GameContext, st: DetectiveState) {
    const c = caseOf(st);
    const act = c.acts[st.actIndex]!;
    if (!act.advance || st.actIndex >= c.acts.length - 1) return;
    const byLeads = act.advance.leads.length > 0 && act.advance.leads.every((l) => isOpened(st, l));
    const byHours = st.actHours >= act.advance.hours;
    const stuck = available(st).length === 0;
    if (byLeads || byHours || stuck) enterAct(ctx, st, st.actIndex + 1);
  }

  /** 2. bölümden itibaren; 1. bölümde ancak açılabilecek iz kalmadıysa ya da bütçe aşıldıysa. */
  function canClose(st: DetectiveState): boolean {
    return st.actIndex >= 1 || available(st).length === 0 || hoursLeft(st) <= 0;
  }

  function openLead(ctx: GameContext, st: DetectiveState, lead: Lead, by: string | null) {
    if (isOpened(st, lead.id)) return;
    st.hoursSpent += lead.hours;
    // Önceki bölümlerden kalan izler bölüm saatini doldurmaz (bölümü ucuzca atlamasınlar).
    if ((st.discoveredAct[lead.id] ?? st.actIndex) >= st.actIndex) st.actHours += lead.hours;
    st.opened.push({ id: lead.id, act: st.actIndex, by, at: ctx.now() });
    unlock(st, lead.unlocks, lead.id);
    discover(st, lead.leadsTo);
    openInterviews(st, lead.interviews);
    st.proposal = null;
    log(ctx, st, `İz açıldı: ${lead.title} (${lead.hours} sa)`);
    checkAdvance(ctx, st);
  }

  function enterAccuse(ctx: GameContext, st: DetectiveState) {
    st.phase = 'accuse';
    st.proposal = null;
    log(ctx, st, 'Dosya kapatıldı; suçlama formu açıldı.');
  }

  const needed = (ctx: GameContext) => Math.floor(Math.max(1, connectedIds(ctx).length) / 2) + 1;

  /** Oylamayı sonuçlandırır (geçti / reddedildi / sürüyor). */
  function resolveProposal(ctx: GameContext, st: DetectiveState) {
    const p = st.proposal;
    if (!p || st.settings.leadMode !== 'vote') return;
    const voters = connectedIds(ctx);
    const yes = voters.filter((id) => p.votes[id] === true).length;
    const no = voters.filter((id) => p.votes[id] === false).length;
    const need = needed(ctx);
    p.needed = need;
    if (yes >= need) {
      if (p.kind === 'lead' && p.leadId) openLead(ctx, st, leadOf(st, p.leadId), p.by);
      else enterAccuse(ctx, st);
    } else if (no > voters.length - need) {
      st.proposal = null;
      log(ctx, st, p.kind === 'lead' ? `Öneri reddedildi: ${leadOf(st, p.leadId!).title}` : 'Dosyayı kapatma önerisi reddedildi.');
    }
  }

  function checkScene(ctx: GameContext, st: DetectiveState) {
    if (st.phase !== 'scene') return;
    const ids = connectedIds(ctx);
    if (ids.length > 0 && ids.every((id) => st.sceneReady.includes(id))) st.phase = 'investigate';
  }

  function checkAccuse(ctx: GameContext, st: DetectiveState) {
    if (st.phase !== 'accuse') return;
    const ids = connectedIds(ctx);
    if (ids.length > 0 && ids.every((id) => st.answers[id])) enterReconcile(ctx, st);
  }

  function tallies(st: DetectiveState): Record<string, Record<string, string[]>> {
    const out: Record<string, Record<string, string[]>> = {};
    for (const q of caseOf(st).questions) {
      const t: Record<string, string[]> = {};
      for (const [pid, ans] of Object.entries(st.answers)) {
        const a = ans[q.id];
        if (a) (t[a] ??= []).push(pid);
      }
      out[q.id] = t;
    }
    return out;
  }

  function enterReconcile(ctx: GameContext, st: DetectiveState) {
    st.phase = 'reconcile';
    const t = tallies(st);
    for (const q of caseOf(st).questions) {
      const entries = Object.entries(t[q.id] ?? {}).sort((a, b) => b[1].length - a[1].length);
      const top = entries[0];
      const tie = top && entries[1] && entries[1][1].length === top[1].length;
      st.final[q.id] = top && !tie ? top[0] : null;
    }
    log(ctx, st, 'Formlar toplandı; ekip cevabı belirleniyor.');
  }

  function validAnswer(st: DetectiveState, qid: string, answer: string): boolean {
    const c = caseOf(st);
    const q = c.questions.find((x) => x.id === qid);
    if (!q) return false;
    if (q.kind === 'suspect') return c.characters.some((ch) => ch.id === answer && ch.suspect);
    if (q.kind === 'choice') return q.options.some((o) => o.id === answer);
    return isUnlocked(st, answer);
  }

  function answerLabel(st: DetectiveState, qid: string, answer: string): string {
    const c = caseOf(st);
    const q = c.questions.find((x) => x.id === qid)!;
    if (q.kind === 'suspect') return c.characters.find((ch) => ch.id === answer)?.name ?? answer;
    if (q.kind === 'choice') return q.options.find((o) => o.id === answer)?.text ?? answer;
    return c.evidence.find((e) => e.id === answer)?.title ?? answer;
  }

  function scoreResult(st: DetectiveState): ResultView {
    const c = caseOf(st);
    const total = c.questions.reduce((s, q) => s + q.points, 0);
    const questions = c.questions.map((q) => {
      const team = st.final[q.id] ?? null;
      const accepted = c.solution[q.id] ?? [];
      const ok = team !== null && accepted.includes(team);
      return {
        id: q.id,
        prompt: q.prompt,
        team: team === null ? null : answerLabel(st, q.id, team),
        correct: accepted.map((a) => answerLabel(st, q.id, a)),
        ok,
        points: ok ? q.points : 0,
      };
    });
    const solved = questions.find((q) => q.id === 'who')?.ok ?? false;
    const earned = questions.reduce((s, q) => s + q.points, 0);
    const bonus = solved ? Math.min(MAX_TIME_BONUS, Math.max(0, c.meta.targetHours - st.hoursSpent) * TIME_BONUS_PER_HOUR) : 0;
    const penalty = st.hintsUsed.length * HINT_PENALTY;
    // Rekabet değil, çözmek önemli: bütçe aşımı hafif ve orantılı ceza.
    const over = Math.max(0, st.hoursSpent - c.meta.hoursBudget);
    const overtime = Math.min(OVERTIME_MAX, Math.floor(over / OVERTIME_STEP));
    const score = Math.max(0, earned + bonus - penalty - overtime);
    const ratio = total ? score / total : 0;
    const rank = !solved ? 'Stajyer' : ratio >= 0.85 ? 'Başkomiser' : ratio >= 0.65 ? 'Komiser' : ratio >= 0.45 ? 'Komiser Yardımcısı' : 'Stajyer';
    const evTitle = (id: string) => c.evidence.find((e) => e.id === id)?.title ?? id;
    const name = (id: string) => c.characters.find((x) => x.id === id)?.name ?? id;
    return {
      solved,
      score,
      maxScore: total + MAX_TIME_BONUS,
      rank,
      breakdown: [
        { label: 'Doğru cevaplar', points: earned },
        { label: 'Süre bonusu', points: bonus },
        { label: 'İpucu cezası', points: -penalty },
        ...(overtime ? [{ label: `Bütçe aşımı (${over} sa)`, points: -overtime }] : []),
      ],
      questions,
      individual: Object.entries(st.answers).map(([playerId, ans]) => ({
        playerId,
        correct: c.questions.filter((q) => ans[q.id] && (c.solution[q.id] ?? []).includes(ans[q.id]!)).length,
        total: c.questions.length,
      })),
      culprits: c.truth.culprits.map(name),
      story: c.truth.story,
      timeline: [...c.truth.timeline].sort((a, b) => a.at.localeCompare(b.at)),
      chain: c.truth.chain.map((step) => ({
        step: step.step,
        evidence: step.evidence.map((id) => ({ id, title: evTitle(id), found: isUnlocked(st, id) })),
      })),
      redHerrings: c.truth.redHerrings.map((r) => ({ title: evTitle(r.evidence), explanation: r.explanation })),
      characters: c.truth.characters.map((x) => ({ name: name(x.id), secret: x.secret, whereabouts: x.whereabouts, lies: x.lies })),
    };
  }

  function finishCase(ctx: GameContext, st: DetectiveState) {
    st.result = scoreResult(st);
    st.phase = 'result';
    st.proposal = null;
    log(ctx, st, `Dosya teslim edildi: ${st.result.rank}, ${st.result.score} puan.`);
    persist(ctx, st, true);
    ctx.pushViews();
  }

  /** Sonuç ekranı uzun okunur: skorlar oda sahibi "Oyunu bitir" deyince kaydedilir. */
  function recordResults(ctx: GameContext, st: DetectiveState) {
    const present = new Set(ctx.players().map((p) => p.id));
    ctx.finish(
      st.members
        .filter((id) => present.has(id))
        .map((playerId) => ({ playerId, score: st.result!.score, meta: { rank: st.result!.rank, slug: st.slug } })),
    );
  }

  function requirePhase(st: DetectiveState, ...phases: Phase[]) {
    if (phases.includes(st.phase)) return;
    if (st.phase === 'scene') throw new GameError('Önce bölüm sahnesini okuyup devam edin.');
    if (st.phase === 'accuse' || st.phase === 'reconcile') throw new GameError('Dosya kapandı; şu an suçlama aşamasındasınız.');
    throw new GameError('Bu şu an yapılamaz.');
  }

  function imageRef(st: DetectiveState, key: string | undefined) {
    if (!key) return { url: null, alt: null };
    return { url: st.loaded.urls.get(key) ?? null, alt: caseOf(st).images[key]?.alt ?? null };
  }

  function docImages(st: DetectiveState, doc: CaseDoc): DocResponse['images'] {
    const keys: string[] = [];
    if (doc.kind === 'photo') keys.push(doc.image);
    if (doc.kind === 'newspaper' && doc.image) keys.push(doc.image);
    return Object.fromEntries(keys.map((k) => [k, { url: st.loaded.urls.get(k) ?? null, alt: caseOf(st).images[k]?.alt ?? '' }]));
  }

  // ---------- oyun ----------

  return {
    id: GAME_ID,
    minPlayers: MIN_PLAYERS,
    maxPlayers: MAX_PLAYERS,
    settingsSchema,
    defaultSettings,
    actionSchema,

    validateSettings(settings) {
      if (settings.resume) {
        const row = sessions.get(settings.resume);
        if (!row || row.status !== 'active') return 'Seçilen soruşturma bulunamadı ya da kapanmış. Başka bir dosya seçin.';
        if (!library.get(row.slug)) return 'Bu soruşturmanın vakası artık yok.';
        return null;
      }
      if (!settings.caseSlug) return 'Önce bir vaka seçin.';
      if (!library.get(settings.caseSlug)) return 'Seçilen vaka bulunamadı. Listeden başka bir vaka seçin.';
      return null;
    },

    async start(ctx, settings) {
      const ids = ctx.players().map((p) => p.id);
      if (settings.resume) {
        const row = sessions.get(settings.resume);
        const loaded = row ? library.get(row.slug) : undefined;
        if (!row || row.status !== 'active' || !loaded) throw new GameError('Seçilen soruşturma bulunamadı. Başka bir dosya seçin.');
        const st: DetectiveState = {
          ...restore(row.data, loaded.data),
          sessionId: row.id,
          createdAt: row.createdAt,
          members: [...new Set([...row.members, ...ids])],
          settings,
          proposal: null,
          loaded,
        };
        st.sceneReady = [];
        log(ctx, st, 'Soruşturma kaldığı yerden sürüyor.');
        persist(ctx, st);
        return st;
      }
      const loaded = library.get(settings.caseSlug ?? '');
      if (!loaded) throw new GameError('Seçilen vaka bulunamadı.');
      const st: DetectiveState = {
        ...fresh(loaded.data.meta.slug),
        sessionId: newSessionId(),
        createdAt: ctx.now(),
        members: ids,
        settings,
        proposal: null,
        loaded,
      };
      enterAct(ctx, st, 0);
      persist(ctx, st);
      return st;
    },

    onAction(ctx, st, pid, action) {
      const c = caseOf(st);
      if (st.phase === 'result') throw new GameError('Dosya teslim edildi.');
      switch (action.type) {
        case 'continue': {
          requirePhase(st, 'scene');
          if (isHost(ctx, pid)) st.phase = 'investigate';
          else if (!st.sceneReady.includes(pid)) st.sceneReady.push(pid);
          checkScene(ctx, st);
          commit(ctx, st);
          return {};
        }

        case 'doc': {
          const ev = c.evidence.find((e) => e.id === action.evidenceId);
          if (!ev || !isUnlocked(st, ev.id)) throw new GameError('Bu belge henüz dosyada değil.');
          // Belgeyi ilk okuyan, belgeden doğan izleri herkes için açar.
          if (!st.read.includes(ev.id)) {
            st.read.push(ev.id);
            const born = c.leads.filter((l) => l.from.includes(ev.id) && !st.discovered.includes(l.id));
            if (born.length) {
              discover(st, born.map((l) => l.id));
              for (const l of born) st.leadFrom[l.id] = ev.id;
              log(ctx, st, `${nick(ctx, pid)} "${ev.title}" belgesini okudu: ${born.length} yeni iz.`);
            }
            commit(ctx, st);
          }
          const res: DocResponse = {
            doc: ev.doc,
            title: ev.title,
            evidenceId: ev.id,
            images: docImages(st, ev.doc),
            audioUrl: ev.doc.kind === 'audio' ? (st.loaded.audio.get(ev.id) ?? null) : null,
          };
          return res;
        }

        case 'propose': {
          requirePhase(st, 'investigate');
          const lead = leadOf(st, action.leadId);
          if (!available(st).includes(lead.id)) throw new GameError('Bu iz şu an açılabilir değil.');
          if (st.proposal) throw new GameError('Önce oylamadaki öneri sonuçlansın.');
          if (st.settings.leadMode === 'host' && isHost(ctx, pid)) {
            openLead(ctx, st, lead, pid);
          } else {
            st.proposal = { kind: 'lead', leadId: lead.id, by: pid, votes: { [pid]: true }, needed: 0 };
            log(ctx, st, `${nick(ctx, pid)} önerdi: ${lead.title}`);
            resolveProposal(ctx, st);
          }
          commit(ctx, st);
          return {};
        }

        case 'proposeClose': {
          requirePhase(st, 'investigate');
          if (!canClose(st)) throw new GameError('Dosya en erken 2. bölümde kapatılabilir.');
          if (st.proposal) throw new GameError('Önce oylamadaki öneri sonuçlansın.');
          if (st.settings.leadMode === 'host' && isHost(ctx, pid)) enterAccuse(ctx, st);
          else {
            st.proposal = { kind: 'close', leadId: null, by: pid, votes: { [pid]: true }, needed: 0 };
            log(ctx, st, `${nick(ctx, pid)} dosyayı kapatmayı önerdi.`);
            resolveProposal(ctx, st);
          }
          commit(ctx, st);
          return {};
        }

        case 'vote': {
          requirePhase(st, 'investigate');
          if (!st.proposal) return { stale: true };
          if (st.settings.leadMode !== 'vote') throw new GameError('Bu odada izlere oda sahibi karar veriyor.');
          st.proposal.votes[pid] = action.yes;
          resolveProposal(ctx, st);
          commit(ctx, st);
          return {};
        }

        case 'cancelProposal': {
          if (!st.proposal) return { stale: true };
          if (st.proposal.by !== pid && !isHost(ctx, pid)) throw new GameError('Öneriyi yalnızca öneren ya da oda sahibi geri çekebilir.');
          st.proposal = null;
          log(ctx, st, `${nick(ctx, pid)} öneriyi geri çekti.`);
          commit(ctx, st);
          return {};
        }

        case 'open': {
          requirePhase(st, 'investigate');
          if (!isHost(ctx, pid)) throw new GameError('İzi doğrudan yalnızca oda sahibi açabilir. Öneri yapın.');
          const lead = leadOf(st, action.leadId);
          if (isOpened(st, lead.id)) return { stale: true };
          if (!available(st).includes(lead.id)) throw new GameError('Bu iz şu an açılabilir değil.');
          openLead(ctx, st, lead, st.proposal?.leadId === lead.id ? st.proposal.by : pid);
          commit(ctx, st);
          return {};
        }

        case 'close': {
          requirePhase(st, 'investigate');
          if (!isHost(ctx, pid)) throw new GameError('Dosyayı doğrudan yalnızca oda sahibi kapatabilir.');
          if (!canClose(st)) throw new GameError('Dosya en erken 2. bölümde kapatılabilir.');
          enterAccuse(ctx, st);
          commit(ctx, st);
          return {};
        }

        case 'notebook': {
          if (action.base !== st.notebook.version) {
            throw new GameError('Not defteri bu sırada başkası tarafından değişti; son hali yüklendi. Eklemenizi tekrar yapın.');
          }
          st.notebook = { text: action.text, version: st.notebook.version + 1, by: pid, at: ctx.now() };
          commit(ctx, st);
          return { version: st.notebook.version };
        }

        case 'mark': {
          if (!c.characters.some((x) => x.id === action.characterId)) throw new GameError('Böyle bir kişi yok.');
          if (action.mark) st.marks[action.characterId] = { mark: action.mark, by: pid };
          else delete st.marks[action.characterId];
          commit(ctx, st);
          return {};
        }

        case 'note': {
          const { target } = action;
          const ok = target.kind === 'evidence' ? isUnlocked(st, target.id) : c.characters.some((x) => x.id === target.id);
          if (!ok) throw new GameError('Not eklenecek şey bulunamadı.');
          if (st.notes.length >= NOTES_MAX) throw new GameError('Not sınırına ulaşıldı; eski notlardan bazılarını silin.');
          st.noteSeq += 1;
          st.notes.push({ id: `n${st.noteSeq}`, by: pid, text: action.text, at: ctx.now(), target });
          commit(ctx, st);
          return {};
        }

        case 'deleteNote': {
          const note = st.notes.find((n) => n.id === action.noteId);
          if (!note) return { stale: true };
          if (note.by !== pid && !isHost(ctx, pid)) throw new GameError('Notu yalnızca yazan ya da oda sahibi silebilir.');
          st.notes = st.notes.filter((n) => n !== note);
          commit(ctx, st);
          return {};
        }

        case 'pin': {
          if (!isUnlocked(st, action.evidenceId)) throw new GameError('Bu belge henüz dosyada değil.');
          st.pins = st.pins.filter((p) => p !== action.evidenceId);
          if (action.pinned) st.pins.push(action.evidenceId);
          commit(ctx, st);
          return {};
        }

        case 'hint': {
          requirePhase(st, 'investigate', 'scene');
          if (!st.settings.hints) throw new GameError('Bu odada ipucu kapalı.');
          const hints = c.acts[st.actIndex]!.hints;
          const used = st.hintsUsed.filter((h) => h.act === st.actIndex).length;
          if (used >= Math.min(HINTS_PER_ACT, hints.length)) throw new GameError('Bu bölümün ipuçları bitti.');
          st.hintsUsed.push({ act: st.actIndex, index: used });
          log(ctx, st, `${nick(ctx, pid)} amirden ipucu istedi (−${HINT_PENALTY} puan).`);
          commit(ctx, st);
          return {};
        }

        case 'ask': {
          requirePhase(st, 'investigate');
          const iv = interviewOf(st, action.interviewId);
          const q = iv.questions.find((x) => x.id === action.questionId);
          if (!q) throw new GameError('Böyle bir soru yok.');
          if (askedKey(st, iv.id, `q:${q.id}`)) return { stale: true };
          if (!askable(st, iv.id, q)) throw new GameError('Bu soruyu sormak için önce başka bir şey öğrenmeniz gerekiyor.');
          st.asked.push({ iv: iv.id, key: `q:${q.id}`, by: pid, at: ctx.now() });
          applyOutcome(st, iv.id, q);
          commit(ctx, st);
          return {};
        }

        case 'confront': {
          requirePhase(st, 'investigate');
          const iv = interviewOf(st, action.interviewId);
          if (!isUnlocked(st, action.evidenceId)) throw new GameError('Bu belge henüz dosyada değil.');
          const hit = iv.confront.find((x) => x.evidence === action.evidenceId);
          if (hit) {
            if (askedKey(st, iv.id, `c:${hit.evidence}`)) return { stale: true };
            st.asked.push({ iv: iv.id, key: `c:${hit.evidence}`, by: pid, at: ctx.now() });
            applyOutcome(st, iv.id, hit);
            const ch = c.characters.find((x) => x.id === iv.character);
            log(ctx, st, `${nick(ctx, pid)}, ${ch?.name ?? 'şüpheliye'} bir belge gösterdi.`);
          } else {
            if (askedKey(st, iv.id, `d:${action.evidenceId}`)) return { stale: true };
            st.asked.push({ iv: iv.id, key: `d:${action.evidenceId}`, by: pid, at: ctx.now() });
          }
          commit(ctx, st);
          return { hit: !!hit };
        }

        case 'answer': {
          requirePhase(st, 'accuse');
          const answers: Record<string, string> = {};
          for (const q of c.questions) {
            const a = action.answers[q.id];
            if (!a) throw new GameError('Göndermeden önce bütün soruları cevaplayın.');
            if (!validAnswer(st, q.id, a)) throw new GameError(`"${q.prompt}" sorusunun cevabı geçersiz.`);
            answers[q.id] = a;
          }
          st.answers[pid] = answers;
          checkAccuse(ctx, st);
          commit(ctx, st);
          return {};
        }

        case 'collect': {
          requirePhase(st, 'accuse');
          if (!isHost(ctx, pid)) throw new GameError('Formları oda sahibi toplar.');
          if (Object.keys(st.answers).length === 0) throw new GameError('Henüz kimse formunu göndermedi.');
          enterReconcile(ctx, st);
          commit(ctx, st);
          return {};
        }

        case 'final': {
          requirePhase(st, 'reconcile');
          if (!isHost(ctx, pid)) throw new GameError('Ekip cevabını oda sahibi belirler.');
          if (!validAnswer(st, action.questionId, action.answer)) throw new GameError('Bu cevap geçersiz.');
          st.final[action.questionId] = action.answer;
          commit(ctx, st);
          return {};
        }

        case 'submit': {
          requirePhase(st, 'reconcile');
          if (!isHost(ctx, pid)) throw new GameError('Dosyayı oda sahibi teslim eder.');
          const missing = c.questions.filter((q) => !st.final[q.id]);
          if (missing.length) throw new GameError(`Önce şu sorunun ekip cevabını seçin: ${missing[0]!.prompt}`);
          finishCase(ctx, st);
          return {};
        }

        case 'reopen': {
          requirePhase(st, 'accuse', 'reconcile');
          if (!isHost(ctx, pid)) throw new GameError('Soruşturmayı yeniden oda sahibi açar.');
          st.phase = 'investigate';
          log(ctx, st, 'Soruşturma yeniden açıldı.');
          commit(ctx, st);
          return {};
        }
      }
    },

    onPlayerJoin(ctx, st, pid) {
      if (!st.members.includes(pid)) st.members.push(pid);
      persist(ctx, st);
      ctx.pushViews();
    },

    onPlayerLeave(ctx, st, pid) {
      if (st.proposal) delete st.proposal.votes[pid];
      st.sceneReady = st.sceneReady.filter((x) => x !== pid);
      resolveProposal(ctx, st);
      checkScene(ctx, st);
      checkAccuse(ctx, st);
      if (st.phase !== 'result') commit(ctx, st);
    },

    onPlayerConnection(ctx, st) {
      if (st.phase === 'result') return;
      resolveProposal(ctx, st);
      checkScene(ctx, st);
      checkAccuse(ctx, st);
      commit(ctx, st);
    },

    onSettings(ctx, st, settings) {
      const modeChanged = settings.leadMode !== st.settings.leadMode;
      st.settings = { ...st.settings, leadMode: settings.leadMode, hints: settings.hints };
      if (modeChanged) st.proposal = null;
      ctx.pushViews();
    },

    /** "Oyunu bitir": sonuçtaysa skorlar kaydedilir; değilse soruşturma kaydedilir, lobiden "Devam eden dosyalar" ile sürer. */
    end(ctx, st) {
      if (st.phase === 'result') return recordResults(ctx, st);
      persist(ctx, st);
      ctx.finish([]);
    },

    viewFor(st, pid): DetectiveView {
      const c = caseOf(st);
      const act = c.acts[st.actIndex]!;
      const evById = new Map(c.evidence.map((e) => [e.id, e]));
      const notesFor = (kind: Target['kind'], id: string): Note[] =>
        st.notes.filter((n) => n.target.kind === kind && n.target.id === id).map(({ target: _t, ...n }) => n);
      const planGated = new Set(c.evidence.flatMap((e) => (e.doc.kind === 'floorplan' ? [e.doc.location] : [])));
      const planOpen = new Set(
        st.unlocked.flatMap((u) => {
          const d = evById.get(u.id)?.doc;
          return d?.kind === 'floorplan' ? [d.location] : [];
        }),
      );
      const usedHints = st.hintsUsed.map((h) => ({ act: h.act, text: c.acts[h.act]?.hints[h.index] ?? '' }));
      const usedHere = st.hintsUsed.filter((h) => h.act === st.actIndex).length;
      const proposal = st.proposal;
      const leadTitle = (id: string | null) => {
        if (!id) return null;
        if (id.startsWith('iv:')) return c.interviews.find((i) => i.id === id.slice(3))?.title ?? null;
        return c.leads.find((l) => l.id === id)?.title ?? null;
      };

      return {
        phase: st.phase,
        serverNow: Date.now(),
        sessionId: st.sessionId,
        leadMode: st.settings.leadMode,
        case: {
          slug: c.meta.slug,
          title: c.meta.title,
          subtitle: c.meta.subtitle,
          genre: c.meta.genre,
          difficulty: c.meta.difficulty,
          coverUrl: imageRef(st, c.meta.cover).url,
        },
        act: {
          index: st.actIndex,
          total: c.acts.length,
          title: act.title,
          scene: act.scene,
          imageUrl: imageRef(st, act.sceneImage).url,
          imageAlt: imageRef(st, act.sceneImage).alt,
          narrationUrl: st.loaded.audio.get(`act-${st.actIndex + 1}`) ?? null,
        },
        acts: c.acts.slice(0, st.actIndex + 1).map((a, index) => ({
          index,
          title: a.title,
          scene: a.scene,
          imageUrl: imageRef(st, a.sceneImage).url,
          narrationUrl: st.loaded.audio.get(`act-${index + 1}`) ?? null,
        })),
        hours: {
          spent: st.hoursSpent,
          budget: c.meta.hoursBudget,
          target: c.meta.targetHours,
          actSpent: st.actHours,
          actLimit: act.advance?.hours ?? null,
        },
        characters: c.characters.map((ch) => {
          const img = imageRef(st, ch.portrait);
          return {
            id: ch.id,
            name: ch.name,
            age: ch.age ?? null,
            role: ch.role,
            relation: ch.relation,
            summary: ch.summary,
            portraitUrl: img.url,
            portraitAlt: img.alt,
            victim: !!ch.victim,
            suspect: ch.suspect,
            mark: st.marks[ch.id] ?? null,
            notes: notesFor('character', ch.id),
          };
        }),
        locations: c.locations.map((l) => {
          const img = imageRef(st, l.image);
          return {
            id: l.id,
            name: l.name,
            description: l.description,
            imageUrl: img.url,
            imageAlt: img.alt,
            plan: l.plan && (!planGated.has(l.id) || planOpen.has(l.id)) ? l.plan : null,
          };
        }),
        evidence: st.unlocked.map((u) => {
          const e = evById.get(u.id)!;
          return {
            id: e.id,
            title: e.title,
            summary: e.summary,
            kind: e.doc.kind,
            act: u.act,
            source: leadTitle(u.source),
            seq: u.seq,
            pinned: st.pins.includes(e.id),
            notes: notesFor('evidence', e.id),
            people: e.people,
            thumbUrl: e.doc.kind === 'photo' ? imageRef(st, e.doc.image).url : null,
          };
        }),
        timeline: st.unlocked
          .flatMap((u) => (evById.get(u.id)?.timeline ?? []).map((t) => ({ ...t, evidenceId: u.id })))
          .sort((a, b) => a.at.localeCompare(b.at)),
        leads: available(st).map((id) => {
          const l = c.leads.find((x) => x.id === id)!;
          const from = st.leadFrom[id];
          return { id: l.id, title: l.title, description: l.description, hours: l.hours, from: from ? { id: from, title: evById.get(from)?.title ?? from } : null };
        }),
        opened: st.opened.map((o) => {
          const l = c.leads.find((x) => x.id === o.id)!;
          return { id: l.id, title: l.title, description: l.description, hours: l.hours, outcome: l.outcome, act: o.act, by: o.by, evidence: l.unlocks };
        }),
        interviews: st.interviewsOpen.map(({ id, act: openedAct }) => {
          const iv = c.interviews.find((x) => x.id === id)!;
          let deflects = 0;
          const transcript = st.asked
            .filter((a) => a.iv === id)
            .map((a) => {
              const [kind, ref] = [a.key.slice(0, 1), a.key.slice(2)];
              if (kind === 'q') {
                const q = iv.questions.find((x) => x.id === ref)!;
                return { kind: 'ask' as const, prompt: q.ask, evidenceId: null, answer: q.answer, by: a.by, at: a.at, audioUrl: q.voiced ? (st.loaded.audio.get(interviewAudioKey(id, q.id)) ?? null) : null, unlocked: q.unlocks };
              }
              const title = evById.get(ref)?.title ?? ref;
              if (kind === 'c') {
                const x = iv.confront.find((y) => y.evidence === ref)!;
                return { kind: 'confront' as const, prompt: title, evidenceId: ref, answer: x.answer, by: a.by, at: a.at, audioUrl: x.voiced ? (st.loaded.audio.get(interviewAudioKey(id, `c-${ref}`)) ?? null) : null, unlocked: x.unlocks };
              }
              const answer = iv.deflect[deflects++ % iv.deflect.length]!;
              return { kind: 'deflect' as const, prompt: title, evidenceId: ref, answer, by: a.by, at: a.at, audioUrl: null, unlocked: [] };
            });
          return {
            id,
            characterId: iv.character,
            title: iv.title,
            place: iv.place,
            intro: iv.intro,
            act: openedAct,
            transcript,
            questions: iv.questions.filter((q) => askable(st, id, q)).map((q) => ({ id: q.id, ask: q.ask })),
          };
        }),
        proposal: proposal
          ? { kind: proposal.kind, leadId: proposal.leadId, by: proposal.by, votes: proposal.votes, needed: proposal.needed }
          : null,
        notebook: st.notebook,
        hints: {
          enabled: st.settings.hints,
          used: usedHints,
          left: st.settings.hints ? Math.max(0, Math.min(HINTS_PER_ACT, act.hints.length) - usedHere) : 0,
        },
        canClose: st.phase === 'investigate' && canClose(st),
        sceneReady: st.sceneReady,
        questions: c.questions.map((q) => ({ id: q.id, prompt: q.prompt, kind: q.kind, options: q.options, points: q.points })),
        accuse:
          st.phase === 'accuse' || st.phase === 'reconcile'
            ? { submitted: Object.keys(st.answers), mine: st.answers[pid] ?? null }
            : null,
        reconcile: st.phase === 'reconcile' || st.phase === 'result' ? { tallies: tallies(st), final: st.final } : null,
        result: st.phase === 'result' ? st.result : null,
        log: st.log,
      };
    },
  };
}
