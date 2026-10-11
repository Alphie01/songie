import { z } from 'zod';
import type { CaseDoc, DocKind, FloorPlan, TimelineEntry } from './case-schema.js';

export * from './case-schema.js';

export const GAME_ID = 'detective';
export const MIN_PLAYERS = 1;
export const MAX_PLAYERS = 8;

export const NOTEBOOK_MAX = 8000;
export const NOTE_MAX = 400;
export const HINTS_PER_ACT = 2;
export const HINT_PENALTY = 5;
/** Bütçe aşılabilir; aşılan her OVERTIME_STEP saat için 1 puan, en fazla OVERTIME_MAX. */
export const OVERTIME_STEP = 2;
export const OVERTIME_MAX = 10;
export const MAX_TIME_BONUS = 20;
export const TIME_BONUS_PER_HOUR = 2;

export const settingsSchema = z.object({
  /** Oynanacak vaka. */
  caseSlug: z.string().max(80).nullable(),
  /** Devam edilecek kayıtlı soruşturma (seçiliyse `caseSlug` onun vakasıdır). */
  resume: z.string().max(40).nullable(),
  /** İzlere kim karar verir: öneri + çoğunluk oyu ya da oda sahibi. */
  leadMode: z.enum(['vote', 'host']),
  /** "Amirden ipucu" açık mı. */
  hints: z.boolean(),
});
export type DetectiveSettings = z.infer<typeof settingsSchema>;

export const defaultSettings: DetectiveSettings = {
  caseSlug: null,
  resume: null,
  leadMode: 'vote',
  hints: true,
};

const ref = z.string().min(1).max(80);

export const actionSchema = z.discriminatedUnion('type', [
  /** Bölüm sahnesini okudum. */
  z.object({ type: z.literal('continue') }),
  /** Belgenin içeriğini getir (cevapta `doc`). */
  z.object({ type: z.literal('doc'), evidenceId: ref }),
  z.object({ type: z.literal('propose'), leadId: ref }),
  z.object({ type: z.literal('proposeClose') }),
  z.object({ type: z.literal('vote'), yes: z.boolean() }),
  z.object({ type: z.literal('cancelProposal') }),
  /** Oda sahibi izi doğrudan açar (oda sahibi modunda ya da oylamayı beklemeden). */
  z.object({ type: z.literal('open'), leadId: ref }),
  /** Oda sahibi dosyayı doğrudan kapatır. */
  z.object({ type: z.literal('close') }),
  z.object({ type: z.literal('notebook'), text: z.string().max(NOTEBOOK_MAX), base: z.number().int().min(0) }),
  z.object({ type: z.literal('mark'), characterId: ref, mark: z.enum(['suspect', 'clear']).nullable() }),
  z.object({
    type: z.literal('note'),
    target: z.object({ kind: z.enum(['evidence', 'character']), id: ref }),
    text: z.string().trim().min(1).max(NOTE_MAX),
  }),
  z.object({ type: z.literal('deleteNote'), noteId: ref }),
  z.object({ type: z.literal('pin'), evidenceId: ref, pinned: z.boolean() }),
  z.object({ type: z.literal('hint') }),
  /** Sorguda listeden soru sor. */
  z.object({ type: z.literal('ask'), interviewId: ref, questionId: ref }),
  /** Sorguda dosyadaki bir belgeyi göster. */
  z.object({ type: z.literal('confront'), interviewId: ref, evidenceId: ref }),
  /** Suçlama formu (soru kimliği → cevap kimliği). */
  z.object({ type: z.literal('answer'), answers: z.record(ref, ref) }),
  /** Oda sahibi: formları topla, karşılaştırmaya geç. */
  z.object({ type: z.literal('collect') }),
  /** Oda sahibi: bir sorunun ekip cevabını belirler. */
  z.object({ type: z.literal('final'), questionId: ref, answer: ref }),
  /** Oda sahibi: ekip cevabını teslim et, sonucu aç. */
  z.object({ type: z.literal('submit') }),
  /** Oda sahibi: suçlamadan soruşturmaya dön. */
  z.object({ type: z.literal('reopen') }),
]);
export type DetectiveAction = z.infer<typeof actionSchema>;

export type Phase = 'scene' | 'investigate' | 'accuse' | 'reconcile' | 'result';
export type Mark = 'suspect' | 'clear';

// ---------- Lobi / HTTP ----------

export interface CaseCard {
  slug: string;
  title: string;
  subtitle: string;
  genre: string;
  difficulty: string;
  minutes: number;
  teaser: string;
  coverUrl: string | null;
  acts: number;
  evidenceCount: number;
  /** İsteyen profil bu vakayı daha önce çözdü mü (en iyi derece). */
  solved: { rank: string; score: number } | null;
}

export interface SessionCard {
  id: string;
  slug: string;
  title: string;
  act: number;
  acts: number;
  hoursSpent: number;
  updatedAt: number;
  members: string[];
}

export interface CasesResponse {
  cases: CaseCard[];
  sessions: SessionCard[];
}

// ---------- Görünüm ----------

export interface Note {
  id: string;
  by: string;
  text: string;
  at: number;
}

export interface CharacterView {
  id: string;
  name: string;
  age: number | null;
  role: string;
  relation: string;
  summary: string;
  portraitUrl: string | null;
  portraitAlt: string | null;
  victim: boolean;
  suspect: boolean;
  mark: { mark: Mark; by: string } | null;
  notes: Note[];
}

export interface LocationView {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  imageAlt: string | null;
  plan: FloorPlan | null;
}

export interface EvidenceView {
  id: string;
  title: string;
  summary: string;
  kind: DocKind;
  /** Hangi bölümde dosyaya girdi (0'dan). */
  act: number;
  /** Açan izin başlığı (bölüm başında geldiyse null). */
  source: string | null;
  /** Dosyaya giriş sırası (yeniler büyük). */
  seq: number;
  pinned: boolean;
  notes: Note[];
  people: string[];
  /** Fotoğraf belgelerinde küçük resim. */
  thumbUrl: string | null;
}

export interface LeadView {
  id: string;
  title: string;
  description: string;
  hours: number;
  /** İzi doğuran belge (belge okununca keşfedildiyse). */
  from?: { id: string; title: string } | null;
}

export interface OpenedLeadView extends LeadView {
  outcome: string;
  act: number;
  /** Kim önerdi / kim açtı. */
  by: string | null;
  evidence: string[];
}

export interface TranscriptEntry {
  kind: 'ask' | 'confront' | 'deflect';
  /** Sorulan soru ya da gösterilen belgenin başlığı. */
  prompt: string;
  evidenceId: string | null;
  answer: string;
  by: string;
  at: number;
  /** Kilit anın seslendirmesi. */
  audioUrl: string | null;
  /** Bu cevapla dosyaya giren belgeler. */
  unlocked: string[];
}

export interface InterviewView {
  id: string;
  characterId: string;
  title: string;
  place: string;
  intro: string;
  /** Açıldığı bölüm (0'dan). */
  act: number;
  transcript: TranscriptEntry[];
  /** Şu an sorulabilecek sorular. */
  questions: { id: string; ask: string }[];
}

export interface ProposalView {
  kind: 'lead' | 'close';
  leadId: string | null;
  by: string;
  votes: Record<string, boolean>;
  /** Geçmesi için gereken evet sayısı. */
  needed: number;
}

export interface QuestionView {
  id: string;
  prompt: string;
  kind: 'suspect' | 'choice' | 'evidence';
  options: { id: string; text: string }[];
  points: number;
}

export interface ResultView {
  solved: boolean;
  score: number;
  maxScore: number;
  rank: string;
  breakdown: { label: string; points: number }[];
  questions: {
    id: string;
    prompt: string;
    team: string | null;
    correct: string[];
    ok: boolean;
    points: number;
  }[];
  individual: { playerId: string; correct: number; total: number }[];
  culprits: string[];
  story: string;
  timeline: TimelineEntry[];
  chain: { step: string; evidence: { id: string; title: string; found: boolean }[] }[];
  redHerrings: { title: string; explanation: string }[];
  characters: { name: string; secret: string; whereabouts: string; lies: string[] }[];
}

export interface DetectiveView {
  phase: Phase;
  serverNow: number;
  sessionId: string;
  leadMode: 'vote' | 'host';
  case: {
    slug: string;
    title: string;
    subtitle: string;
    genre: string;
    difficulty: string;
    coverUrl: string | null;
  };
  act: {
    index: number;
    total: number;
    title: string;
    scene: string;
    imageUrl: string | null;
    imageAlt: string | null;
    /** Anlatıcının seslendirmesi (yoksa null). */
    narrationUrl: string | null;
  };
  /** Ulaşılan bölümlerin başlıkları (sahneyi yeniden okumak için metinleriyle). */
  acts: { index: number; title: string; scene: string; imageUrl: string | null; narrationUrl: string | null }[];
  hours: { spent: number; budget: number; target: number; actSpent: number; actLimit: number | null };
  characters: CharacterView[];
  locations: LocationView[];
  evidence: EvidenceView[];
  timeline: (TimelineEntry & { evidenceId: string })[];
  leads: LeadView[];
  opened: OpenedLeadView[];
  interviews: InterviewView[];
  proposal: ProposalView | null;
  notebook: { text: string; version: number; by: string | null; at: number };
  hints: { enabled: boolean; used: { act: number; text: string }[]; left: number };
  canClose: boolean;
  sceneReady: string[];
  questions: QuestionView[];
  accuse: { submitted: string[]; mine: Record<string, string> | null } | null;
  reconcile: {
    tallies: Record<string, Record<string, string[]>>;
    final: Record<string, string | null>;
  } | null;
  result: ResultView | null;
  log: { at: number; text: string }[];
}

export type DocResponse = {
  doc: CaseDoc;
  title: string;
  evidenceId: string;
  images: Record<string, { url: string | null; alt: string }>;
  /** Ses kanıtının kaydı (seslendirilmediyse null). */
  audioUrl: string | null;
};
