import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { createHarness } from '@songie/game-kit/testing';
import type { CaseCard, CasesResponse, DetectiveView } from '@songie/detective/shared';
import { CaseLibrary, SessionStore, createDetectiveGame } from '@songie/detective/server';
import { fixtureWriter } from './lib.js';

/**
 * Dedektif Masası görünümleri: test vakası "mini" (games/detective/server/test-cases) üç kişiyle oynanır.
 * Dosya adının son parçası görünümün sahibidir (ali oda sahibi, ayse ve cem misafir).
 * Ayrıca `extra/docs.json` (her belgenin `doc` cevabı), `extra/acks.json` (diğer cevaplar) ve
 * `extra/cases.json` (lobi vaka rafı, gerçek vakalardan) yazılır.
 */
const out = fixtureWriter('detective');
const repo = path.resolve(import.meta.dirname, '../../../..');
const extraDir = path.join(repo, 'apps/mobile/test/fixtures/detective/extra');
fs.mkdirSync(extraDir, { recursive: true });
const writeExtra = (name: string, data: unknown) => fs.writeFileSync(path.join(extraDir, `${name}.json`), JSON.stringify(data, null, 2) + '\n');

const testCases = path.join(repo, 'games/detective/server/test-cases');
const realCases = path.join(repo, 'games/detective/server/cases');
const RIGHT = { who: 'kerem', how: 'poison', why: 'debt', proof: 'e-cam' };

function setup(players: string[], extra: Record<string, unknown> = {}) {
  const db = new Database(':memory:');
  const sessions = new SessionStore(db);
  const library = new CaseLibrary(testCases, () => {});
  const game = createDetectiveGame({ library, sessions });
  const settings = { caseSlug: 'mini', resume: null, leadMode: 'vote', hints: true, ...extra };
  const h = createHarness<DetectiveView>(game, { players, settings });
  return { h, settings, sessions };
}

const acks: Record<string, unknown> = {};

// ---------- Oylama modu, üç kişi: bütün aşamalar ----------
{
  const { h, settings } = setup(['ali', 'ayse', 'cem']);
  const w = (name: string, who: string) => out.write(`${name}-${who}`, h.view(who), { settings });
  await h.start();
  w('scene', 'ali');
  await h.act('ayse', { type: 'continue' });
  w('scene-ready', 'ayse');
  w('scene-waiting', 'ali');
  await h.act('ali', { type: 'continue' });
  w('investigate', 'ali');
  w('investigate', 'cem');

  // Öneri ve oylama
  await h.act('ayse', { type: 'propose', leadId: 'l-leyla' });
  w('proposal', 'cem');
  w('proposal', 'ali');
  w('proposal-mine', 'ayse');
  await h.act('cem', { type: 'vote', yes: true });

  // Ortak dosya: işaret, not, iğne, defter, ipucu, sorgu
  await h.act('ayse', { type: 'mark', characterId: 'kerem', mark: 'suspect' });
  await h.act('cem', { type: 'mark', characterId: 'leyla', mark: 'clear' });
  await h.act('ayse', { type: 'note', target: { kind: 'evidence', id: 'e-kerem' }, text: 'Saat 19 diyor' });
  await h.act('cem', { type: 'note', target: { kind: 'character', id: 'kerem' }, text: 'Borçlu olabilir' });
  await h.act('cem', { type: 'pin', evidenceId: 'e-kerem', pinned: true });
  acks.notebook = await h.act('ali', { type: 'notebook', text: 'Kerem yalan söylüyor.\nEczane kayıtlarına bak.', base: 0 });
  acks.notebookConflict = await h.act('ayse', { type: 'notebook', text: 'başka', base: 0 });
  await h.act('cem', { type: 'hint' });
  await h.act('ayse', { type: 'ask', interviewId: 'iv-sevim', questionId: 'q2' });
  await h.act('ali', { type: 'ask', interviewId: 'iv-sevim', questionId: 'q3' });
  acks.confrontMiss = await h.act('cem', { type: 'confront', interviewId: 'iv-sevim', evidenceId: 'e-scene' });
  acks.confrontHit = await h.act('cem', { type: 'confront', interviewId: 'iv-sevim', evidenceId: 'e-ticket' });
  acks.askStale = await h.act('ali', { type: 'ask', interviewId: 'iv-sevim', questionId: 'q3' });
  w('investigate-rich', 'ali');
  w('investigate-rich', 'cem');

  // 2. bölüm
  await h.act('ali', { type: 'open', leadId: 'l-camera' });
  w('act2-scene', 'cem');
  await h.act('ali', { type: 'continue' });
  w('act2', 'ayse');
  await h.act('ali', { type: 'open', leadId: 'l-sevim' });
  await h.act('ali', { type: 'open', leadId: 'l-email' });
  await h.act('ayse', { type: 'doc', evidenceId: 'e-email' }); // l-noter belgeden doğar
  await h.act('ali', { type: 'open', leadId: 'l-wallet' });
  await h.act('ayse', { type: 'proposeClose' });
  w('close-proposal', 'cem');
  await h.act('ayse', { type: 'cancelProposal' });
  await h.act('ali', { type: 'open', leadId: 'l-kerem-phone' });
  await h.act('ali', { type: 'continue' });
  await h.act('ali', { type: 'open', leadId: 'l-kerem-msg' });
  w('act3-over', 'ali');
  w('act3-over', 'cem');

  // Her belgenin içeriği (doc cevabı)
  const docs: Record<string, unknown> = {};
  for (const e of h.view('ali').evidence) docs[e.id] = await h.act('ali', { type: 'doc', evidenceId: e.id });
  writeExtra('docs', docs);

  // Suçlama
  await h.act('ali', { type: 'close' });
  w('accuse', 'ali');
  w('accuse', 'cem');
  await h.act('ali', { type: 'answer', answers: RIGHT });
  w('accuse-sent', 'ali');
  await h.act('ayse', { type: 'answer', answers: { ...RIGHT, who: 'leyla' } });
  w('accuse-two', 'cem');
  await h.act('cem', { type: 'answer', answers: { ...RIGHT, why: 'inherit' } });
  w('reconcile', 'ali');
  w('reconcile', 'cem');
  await h.act('ali', { type: 'final', questionId: 'why', answer: 'inherit' });
  await h.act('ali', { type: 'submit' });
  w('result', 'ali');
  w('result', 'ayse');
}

// ---------- Oda sahibi modu: misafir önerir, karar oda sahibinde ----------
{
  const { h, settings } = setup(['ali', 'ayse', 'cem'], { leadMode: 'host', hints: false });
  await h.start();
  await h.act('ali', { type: 'continue' });
  await h.act('ayse', { type: 'propose', leadId: 'l-leyla' });
  out.write('hostmode-cem', h.view('cem'), { settings });
  out.write('hostmode-ali', h.view('ali'), { settings });
}

// ---------- Tek kişilik oda ----------
{
  const { h, settings } = setup(['ali']);
  await h.start();
  await h.act('ali', { type: 'continue' });
  out.write('solo-ali', h.view('ali'), { settings });
}

writeExtra('acks', acks);

// ---------- Lobi vaka rafı (gerçek vakalar) ----------
{
  const library = new CaseLibrary(fs.existsSync(realCases) ? realCases : testCases, () => {});
  const cases: CaseCard[] = library.list().map(({ data, urls }, i) => ({
    slug: data.meta.slug,
    title: data.meta.title,
    subtitle: data.meta.subtitle,
    genre: data.meta.genre,
    difficulty: data.meta.difficulty,
    minutes: data.meta.minutes,
    teaser: data.meta.teaser,
    coverUrl: data.meta.cover ? (urls.get(data.meta.cover) ?? null) : null,
    acts: data.acts.length,
    evidenceCount: data.evidence.length,
    solved: i === 1 ? { rank: 'Komiser', score: 72 } : null,
  }));
  const first = cases[0];
  const res: CasesResponse = {
    cases,
    sessions: first
      ? [{ id: 'abc123', slug: first.slug, title: first.title, act: 2, acts: first.acts, hoursSpent: 7, updatedAt: Date.now() - 3 * 3600_000, members: ['Ali', 'Ayşe'] }]
      : [],
  };
  writeExtra('cases', res);
}

out.done();
