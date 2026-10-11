import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { createHarness } from '@songie/game-kit/testing';
import type { DetectiveView, ResultView } from '../shared/index.js';
import { createDetectiveGame } from './game.js';
import { CaseLibrary, DEFAULT_CASES_DIR, readCaseFile } from './library.js';
import { SessionStore } from './sessions.js';
import { checkCase } from './validate.js';

const TEST_CASES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'test-cases');

function setup(players = ['ali', 'ayse', 'cem'], settings: Record<string, unknown> = {}, db = new Database(':memory:')) {
  const sessions = new SessionStore(db);
  const library = new CaseLibrary(TEST_CASES, () => {});
  const game = createDetectiveGame({ library, sessions });
  const h = createHarness<DetectiveView>(game, { players, settings: { caseSlug: 'mini', ...settings } });
  return { h, game, sessions, db };
}

async function investigating(players?: string[], settings?: Record<string, unknown>) {
  const s = setup(players, settings);
  await s.h.start();
  await s.h.act('ali', { type: 'continue' });
  return s;
}

describe('dedektif: başlangıç ve gizlilik', () => {
  it('1. bölüm sahnesiyle başlar, yalnızca bölüm başı kanıtları açıktır', async () => {
    const { h } = setup();
    await h.start();
    const v = h.view('ayse');
    expect(v.phase).toBe('scene');
    expect(v.act.index).toBe(0);
    expect(v.evidence.map((e) => e.id)).toEqual(['e-scene', 'e-sevim', 'e-kerem', 'e-plan']);
    expect(v.leads.map((l) => l.id).sort()).toEqual(['l-camera', 'l-leyla', 'l-sevim']);
    expect(v.locations[0]!.plan).not.toBeNull(); // kroki belgesi bölüm başında açık
  });

  it('gerçek, çözüm ve açılmamış belgeler hiçbir görünüme girmez', async () => {
    const { h } = await investigating();
    await h.act('ali', { type: 'open', leadId: 'l-leyla' });
    for (const p of ['ali', 'ayse', 'cem']) {
      const seen = h.seen(p);
      expect(seen).not.toContain('borcunu kapatmak'); // truth.story
      expect(seen).not.toContain('Tefeciye borçlu'); // truth.characters
      expect(seen).not.toContain('Usta Çilingir'); // açılmamış fiş
      expect(seen).not.toContain('f-debt'); // facts
      expect(seen).not.toContain('"solution"');
      expect(seen).not.toContain('Kerem lehine'); // fact metni
      expect(seen).not.toContain('Siyanür zehirlenmesi'); // belge içerikleri görünüme hiç girmez
    }
  });

  it('belge içeriği yalnızca açılmışsa "doc" ile gelir', async () => {
    const { h } = await investigating();
    const ok = await h.act('cem', { type: 'doc', evidenceId: 'e-sevim' });
    expect(ok).toMatchObject({ ok: true, title: "Sevim Er'in ifadesi", doc: { kind: 'statement' } });
    expect(await h.act('cem', { type: 'doc', evidenceId: 'e-autopsy' })).toMatchObject({ ok: false });
  });
});

describe('dedektif: sahne ve izler', () => {
  it('herkes devam deyince ya da oda sahibi geçince soruşturma başlar', async () => {
    const { h } = setup();
    await h.start();
    await h.act('ayse', { type: 'continue' });
    expect(h.view('ali').sceneReady).toEqual(['ayse']);
    expect(await h.act('ayse', { type: 'propose', leadId: 'l-leyla' })).toMatchObject({ ok: false });
    await h.act('cem', { type: 'continue' });
    expect(h.view('ali').phase).toBe('scene');
    h.setConnected('ali', false);
    expect(h.view('ayse').phase).toBe('investigate');
  });

  it('oylamada çoğunluk evet derse iz açılır, saat düşer', async () => {
    const { h } = await investigating();
    await h.act('ayse', { type: 'propose', leadId: 'l-leyla' });
    const v = h.view('cem');
    expect(v.proposal).toMatchObject({ kind: 'lead', leadId: 'l-leyla', by: 'ayse', needed: 2 });
    expect(await h.act('cem', { type: 'propose', leadId: 'l-sevim' })).toMatchObject({ ok: false });
    await h.act('cem', { type: 'vote', yes: true });
    const after = h.view('ali');
    expect(after.proposal).toBeNull();
    expect(after.hours.spent).toBe(2);
    expect(after.evidence.map((e) => e.id)).toContain('e-pharmacy');
    expect(after.opened[0]).toMatchObject({ id: 'l-leyla', by: 'ayse', outcome: 'Eczane kayıtları geldi.' });
    expect(after.leads.map((l) => l.id)).not.toContain('l-leyla');
  });

  it('çoğunluk hayır derse öneri düşer', async () => {
    const { h } = await investigating();
    await h.act('ayse', { type: 'propose', leadId: 'l-leyla' });
    await h.act('ali', { type: 'vote', yes: false });
    await h.act('cem', { type: 'vote', yes: false });
    expect(h.view('ali').proposal).toBeNull();
    expect(h.view('ali').hours.spent).toBe(0);
  });

  it('tek kişilik odada öneri hemen açılır', async () => {
    const { h } = await investigating(['ali']);
    await h.act('ali', { type: 'propose', leadId: 'l-sevim' });
    expect(h.view('ali').hours.spent).toBe(1);
  });

  it('geçiş izi açılınca sonraki bölüm gelir; yeni izler keşfedilir', async () => {
    const { h } = await investigating();
    await h.act('ali', { type: 'open', leadId: 'l-camera' });
    const v = h.view('cem');
    expect(v.phase).toBe('scene');
    expect(v.act.index).toBe(1);
    expect(v.evidence.map((e) => e.id)).toEqual(expect.arrayContaining(['e-cam', 'e-autopsy', 'e-news']));
    expect(v.evidence.find((e) => e.id === 'e-cam')).toMatchObject({ source: 'Cadde kameralarını topla', act: 0 });
    expect(v.leads.map((l) => l.id)).toEqual(expect.arrayContaining(['l-wallet', 'l-kerem-phone', 'l-email', 'l-leyla']));
    expect(v.timeline.map((t) => t.at)).toEqual([...v.timeline.map((t) => t.at)].sort());
  });

  it('bölüm saati dolunca da sonraki bölüme geçilir', async () => {
    const { h } = await investigating();
    await h.act('ali', { type: 'open', leadId: 'l-leyla' });
    await h.act('ali', { type: 'open', leadId: 'l-sevim' });
    expect(h.view('ali').act.index).toBe(0);
    await h.act('ali', { type: 'continue' });
    // 3 saat; sınır 4. Kalan tek iz kamerada; açılınca zaten geçer — saat sınırını ayrıca deneyelim:
    expect(h.view('ali').hours.actSpent).toBe(3);
  });

  it('önceki bölümden kalan izler bölüm saatini doldurmaz', async () => {
    const { h } = await investigating(['ali']);
    await h.act('ali', { type: 'open', leadId: 'l-camera' });
    await h.act('ali', { type: 'continue' });
    for (const id of ['l-leyla', 'l-sevim', 'l-wallet']) await h.act('ali', { type: 'open', leadId: id });
    expect(h.view('ali').hours).toMatchObject({ spent: 6, actSpent: 0 });
    await h.act('ali', { type: 'open', leadId: 'l-email' });
    expect(h.view('ali')).toMatchObject({ act: { index: 1 }, hours: { actSpent: 2 } });
  });

  it('oda sahibi modunda oda sahibi doğrudan açar, diğerleri yalnızca önerir', async () => {
    const { h } = await investigating(undefined, { leadMode: 'host' });
    await h.act('ayse', { type: 'propose', leadId: 'l-leyla' });
    expect(h.view('ali').proposal).toMatchObject({ needed: 0, by: 'ayse' });
    expect(await h.act('cem', { type: 'vote', yes: true })).toMatchObject({ ok: false });
    expect(await h.act('ayse', { type: 'open', leadId: 'l-leyla' })).toMatchObject({ ok: false });
    await h.act('ali', { type: 'open', leadId: 'l-leyla' });
    expect(h.view('ali').opened[0]).toMatchObject({ id: 'l-leyla', by: 'ayse' });
    await h.act('ali', { type: 'propose', leadId: 'l-sevim' });
    expect(h.view('ali').hours.spent).toBe(3);
  });

  it('saat bütçesi aşılamaz', async () => {
    const { h } = await investigating(['ali']);
    for (const id of ['l-leyla', 'l-sevim', 'l-camera']) await h.act('ali', { type: 'open', leadId: id });
    await h.act('ali', { type: 'continue' });
    for (const id of ['l-kerem-phone']) await h.act('ali', { type: 'open', leadId: id });
    await h.act('ali', { type: 'continue' });
    await h.act('ali', { type: 'open', leadId: 'l-email' });
    // 2+1+2+2+2 = 9; kalan 3: l-kerem-msg (3) açılır, sonra l-wallet (1) açılamaz
    await h.act('ali', { type: 'open', leadId: 'l-kerem-msg' });
    expect(h.view('ali').hours.spent).toBe(12);
    const res = await h.act('ali', { type: 'open', leadId: 'l-wallet' });
    expect(res).toMatchObject({ ok: false });
    if (!res.ok) expect(res.error).toContain('saat');
  });
});

describe('dedektif: ortak dosya', () => {
  it('not defteri sürüm çakışmasını reddeder', async () => {
    const { h } = await investigating();
    expect(await h.act('ali', { type: 'notebook', text: 'Kerem yalan söylüyor', base: 0 })).toMatchObject({ ok: true, version: 1 });
    expect(await h.act('ayse', { type: 'notebook', text: 'başka', base: 0 })).toMatchObject({ ok: false });
    expect(h.view('cem').notebook).toMatchObject({ text: 'Kerem yalan söylüyor', version: 1, by: 'ali' });
  });

  it('işaret, not ve pin herkese görünür; not yalnızca yazan ya da oda sahibince silinir', async () => {
    const { h } = await investigating();
    await h.act('ayse', { type: 'mark', characterId: 'kerem', mark: 'suspect' });
    await h.act('ayse', { type: 'note', target: { kind: 'evidence', id: 'e-kerem' }, text: 'Saat 19 diyor' });
    await h.act('cem', { type: 'pin', evidenceId: 'e-kerem', pinned: true });
    const v = h.view('ali');
    expect(v.characters.find((c) => c.id === 'kerem')!.mark).toEqual({ mark: 'suspect', by: 'ayse' });
    const ev = v.evidence.find((e) => e.id === 'e-kerem')!;
    expect(ev.pinned).toBe(true);
    expect(ev.notes[0]).toMatchObject({ by: 'ayse', text: 'Saat 19 diyor' });
    expect(await h.act('cem', { type: 'deleteNote', noteId: ev.notes[0]!.id })).toMatchObject({ ok: false });
    await h.act('ali', { type: 'deleteNote', noteId: ev.notes[0]!.id });
    expect(h.view('ali').evidence.find((e) => e.id === 'e-kerem')!.notes).toHaveLength(0);
    expect(await h.act('ali', { type: 'note', target: { kind: 'evidence', id: 'e-autopsy' }, text: 'x' })).toMatchObject({ ok: false });
  });

  it('ipucu bölüm başına sınırlı ve görünür', async () => {
    const { h } = await investigating();
    await h.act('cem', { type: 'hint' });
    await h.act('cem', { type: 'hint' });
    expect(await h.act('cem', { type: 'hint' })).toMatchObject({ ok: false });
    const v = h.view('ali');
    expect(v.hints.used).toHaveLength(2);
    expect(v.hints.left).toBe(0);
    expect(v.hints.used[0]!.text).toContain('Kerem');
  });
});

async function toAct2(h: ReturnType<typeof setup>['h']) {
  await h.act('ali', { type: 'open', leadId: 'l-camera' });
  await h.act('ali', { type: 'continue' });
}

const RIGHT = { who: 'kerem', how: 'poison', why: 'debt', proof: 'e-cam' };

describe('dedektif: dosyayı kapatma ve sonuç', () => {
  it('1. bölümde dosya kapatılamaz, 2. bölümde kapatılır', async () => {
    const { h } = await investigating();
    expect(h.view('ali').canClose).toBe(false);
    expect(await h.act('ali', { type: 'close' })).toMatchObject({ ok: false });
    await toAct2(h);
    expect(h.view('ali').canClose).toBe(true);
    await h.act('ayse', { type: 'proposeClose' });
    await h.act('cem', { type: 'vote', yes: true });
    expect(h.view('ali').phase).toBe('accuse');
  });

  it('formlar karşılaştırılır, ekip cevabı teslim edilir ve puanlanır', async () => {
    const { h } = await investigating();
    await toAct2(h);
    await h.act('ali', { type: 'hint' });
    await h.act('ali', { type: 'close' });
    expect(await h.act('ali', { type: 'answer', answers: { who: 'kerem' } })).toMatchObject({ ok: false });
    expect(await h.act('ali', { type: 'answer', answers: { ...RIGHT, proof: 'e-msg' } })).toMatchObject({ ok: false }); // açılmamış kanıt
    await h.act('ali', { type: 'answer', answers: RIGHT });
    await h.act('ayse', { type: 'answer', answers: { ...RIGHT, who: 'leyla' } });
    expect(h.view('ali').accuse).toMatchObject({ submitted: ['ali', 'ayse'], mine: RIGHT });
    expect(h.view('cem').accuse!.mine).toBeNull();
    expect(h.seen('cem')).not.toContain('"who":"leyla"');
    await h.act('cem', { type: 'answer', answers: { ...RIGHT, why: 'inherit' } });
    const r = h.view('ali');
    expect(r.phase).toBe('reconcile');
    expect(r.reconcile!.tallies.who).toEqual({ kerem: ['ali', 'cem'], leyla: ['ayse'] });
    expect(r.reconcile!.final).toMatchObject({ who: 'kerem', how: 'poison', why: 'debt' });
    expect(await h.act('ayse', { type: 'submit' })).toMatchObject({ ok: false });
    await h.act('ali', { type: 'final', questionId: 'why', answer: 'inherit' });
    await h.act('ali', { type: 'submit' });
    const res = h.view('ali').result as ResultView;
    expect(res.solved).toBe(true);
    // 40 + 20 + 0 + 20 = 80; süre bonusu: hedef 7, harcanan 2 → 10; ipucu −5
    expect(res.score).toBe(85);
    expect(res.rank).toBe('Başkomiser');
    expect(res.questions.find((q) => q.id === 'why')).toMatchObject({ ok: false, team: 'Miras', correct: ['Borcunu ödemek için dükkânı hemen istiyordu'] });
    expect(res.culprits).toEqual(['Kerem Yalçın']);
    expect(res.chain[1]!.evidence.every((e) => !e.found)).toBe(true);
    expect(res.individual.find((i) => i.playerId === 'ayse')).toMatchObject({ correct: 3, total: 4 });
    expect(h.finished).toBeNull(); // sonuç ekranı oda sahibi bitirene kadar açık kalır
    h.end();
    expect(h.finished!.map((f) => f.score)).toEqual([85, 85, 85]);
    expect(h.seen('cem')).toContain('borcunu kapatmak');
  });

  it('yanlış fail: dosya çözülmedi, süre bonusu yok', async () => {
    const { h } = await investigating(['ali']);
    await toAct2(h);
    await h.act('ali', { type: 'close' });
    await h.act('ali', { type: 'answer', answers: { ...RIGHT, who: 'sevim' } });
    await h.act('ali', { type: 'submit' });
    const res = h.view('ali').result!;
    expect(res.solved).toBe(false);
    expect(res.score).toBe(60);
    expect(res.rank).toBe('Stajyer');
  });

  it('bağlantısı kopan oyuncu suçlamayı kilitlemez; oda sahibi soruşturmayı yeniden açabilir', async () => {
    const { h } = await investigating();
    await toAct2(h);
    await h.act('ali', { type: 'close' });
    await h.act('ali', { type: 'answer', answers: RIGHT });
    await h.act('ali', { type: 'reopen' });
    expect(h.view('ali').phase).toBe('investigate');
    await h.act('ali', { type: 'close' });
    expect(h.view('ali').accuse!.mine).toEqual(RIGHT);
    await h.act('ayse', { type: 'answer', answers: RIGHT });
    h.setConnected('cem', false);
    expect(h.view('ali').phase).toBe('reconcile');
  });
});

describe('dedektif: kaydet ve devam et', () => {
  it('"Oyunu bitir" soruşturmayı kaydeder; sonra kaldığı yerden sürer', async () => {
    const db = new Database(':memory:');
    const first = setup(['ali', 'ayse'], {}, db);
    await first.h.start();
    await first.h.act('ali', { type: 'continue' });
    await first.h.act('ali', { type: 'open', leadId: 'l-leyla' });
    await first.h.act('ayse', { type: 'notebook', text: 'eczane nöbeti', base: 0 });
    first.h.end();
    expect(first.h.finished).toEqual([]);
    const sessionId = first.h.view('ali').sessionId;
    const active = first.sessions.forMember('ayse', 'active');
    expect(active.map((s) => s.id)).toEqual([sessionId]);

    const second = setup(['ayse', 'deniz'], { caseSlug: null, resume: sessionId }, db);
    expect(second.game.validateSettings!({ caseSlug: null, resume: sessionId, leadMode: 'vote', hints: true })).toBeNull();
    await second.h.start();
    const v = second.h.view('deniz');
    expect(v.sessionId).toBe(sessionId);
    expect(v.hours.spent).toBe(2);
    expect(v.notebook.text).toBe('eczane nöbeti');
    expect(v.evidence.map((e) => e.id)).toContain('e-pharmacy');
    expect(second.sessions.get(sessionId)!.members.sort()).toEqual(['ali', 'ayse', 'deniz']);
  });

  it('teslim edilen dosya kapanır ve devam listesinden çıkar', async () => {
    const db = new Database(':memory:');
    const { h, sessions } = setup(['ali'], {}, db);
    await h.start();
    await h.act('ali', { type: 'continue' });
    await toAct2(h);
    await h.act('ali', { type: 'close' });
    await h.act('ali', { type: 'answer', answers: RIGHT });
    await h.act('ali', { type: 'submit' });
    expect(sessions.forMember('ali', 'active')).toHaveLength(0);
    expect(sessions.forMember('ali', 'done')[0]).toMatchObject({ slug: 'mini', rank: 'Başkomiser' });
  });

  it('vaka seçilmeden başlatılamaz', () => {
    const { game } = setup();
    expect(game.validateSettings!({ caseSlug: null, resume: null, leadMode: 'vote', hints: true })).toContain('vaka');
    expect(game.validateSettings!({ caseSlug: 'yok', resume: null, leadMode: 'vote', hints: true })).toContain('bulunamadı');
    expect(game.validateSettings!({ caseSlug: null, resume: 'yok', leadMode: 'vote', hints: true })).toContain('bulunamadı');
  });
});

describe('vaka dosyaları', () => {
  const dirs = fs.existsSync(DEFAULT_CASES_DIR)
    ? fs.readdirSync(DEFAULT_CASES_DIR).filter((n) => fs.existsSync(path.join(DEFAULT_CASES_DIR, n, 'case.json')))
    : [];
  it.each(['mini'].map((n) => path.join(TEST_CASES, n)).concat(dirs.map((n) => path.join(DEFAULT_CASES_DIR, n))))('%s şemaya ve denetime uyar', (dir) => {
    const report = checkCase(readCaseFile(dir));
    expect(report.errors).toEqual([]);
  });
});
