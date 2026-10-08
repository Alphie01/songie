import path from 'node:path';
import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { createHarness } from '@songie/game-kit/testing';
import { countWords, type CharadesView } from '../shared/index.js';
import { TitleBank } from './titles.js';
import { charadesServer } from './index.js';

const TEST_DIR = path.join(import.meta.dirname, 'test-content');
const game = (db = new Database(':memory:')) => charadesServer({ db, contentDir: TEST_DIR, timing: { podiumMs: 5000 } });

const PLAYERS = ['a1', 'a2', 'b1', 'b2'];
const TEAMS = { a: ['a1', 'a2'], b: ['b1', 'b2'] };

async function setup(settings: Record<string, unknown> = {}, players = PLAYERS) {
  const h = createHarness<CharadesView>(game(), {
    players,
    settings: { teams: TEAMS, seconds: 60, categories: ['film-turk', 'atasozu-deyim'], ...settings },
  });
  await h.start();
  return h;
}

describe('charades: içerik', () => {
  it('gerçek içerikte en az 260 başlık var, hepsi türlü ve zorluk etiketli', () => {
    const bank = new TitleBank(new Database(':memory:'));
    const cats = bank.categories().filter((c) => c.id !== 'arkadas');
    expect(cats.map((c) => c.id).sort()).toEqual(['atasozu-deyim', 'dizi-turk', 'dizi-yabanci', 'film-turk', 'film-yabanci', 'kitap', 'sarki']);
    const all = bank.cards(cats.map((c) => c.id), 'karisik');
    expect(all.length).toBeGreaterThanOrEqual(260);
    const easy = bank.cards(cats.map((c) => c.id), 'kolay');
    const hard = bank.cards(cats.map((c) => c.id), 'zor');
    expect(easy.length + hard.length).toBe(all.length);
    expect(easy.length).toBeGreaterThan(100);
    expect(hard.length).toBeGreaterThan(80);
    expect(new Set(all.map((c) => c.title)).size).toBe(all.length);
    for (const c of all) expect(c.words).toBeGreaterThan(0);
  });

  it('kelime sayısı noktalamayı saymaz', () => {
    expect(countWords('Bir elin nesi var, iki elin sesi var')).toBe(8);
    expect(countWords('Behzat Ç.')).toBe(2);
    expect(countWords('Ali Baba ve 7 Cüceler')).toBe(5);
    expect(countWords('Damdan düşen - anlar')).toBe(3);
  });

  it('zorluk filtresi uygulanır ve boş havuz başlatılmaz', async () => {
    const h = await setup({ difficulty: 'zor', categories: ['film-turk'] });
    await h.act('a1', { type: 'start' });
    expect(['Kış Uykusu', 'Ahlat Ağacı']).toContain(h.view('a1').card!.title);

    const g = createHarness<CharadesView>(game(), { players: PLAYERS, settings: { teams: TEAMS, categories: ['arkadas'] } });
    await expect(g.start()).rejects.toThrow(/başlık yok/);
  });

  it('arkadaş başlıkları her zorlukta gelir', async () => {
    const db = new Database(':memory:');
    const g = game(db);
    g.bank.addCustom({ title: 'Ayrılık da sevdaya dahil', kind: 'sarki' }, 'a1');
    const cards = g.bank.cards(['arkadas'], 'zor');
    expect(cards).toEqual([expect.objectContaining({ title: 'Ayrılık da sevdaya dahil', kind: 'sarki', words: 4, category: 'arkadas' })]);
    expect(g.bank.categories().find((c) => c.id === 'arkadas')?.count).toBe(1);
  });
});

describe('charades: oyun', () => {
  it('takımı en az 2 kişi olmayan oyun başlamaz', async () => {
    const h = createHarness<CharadesView>(game(), { players: ['a1', 'a2', 'b1'], settings: { teams: TEAMS, categories: ['film-turk'] } });
    await expect(h.start()).rejects.toThrow(/en az 2 kişi/);
  });

  it('başlık takım arkadaşına hiç gitmez; anlatıcı ve rakip görür', async () => {
    const h = await setup();
    expect(h.view('a1')).toMatchObject({ phase: 'ready', role: 'guesser', narratorId: 'a1', team: 'a' });
    expect(await h.act('a2', { type: 'start' })).toMatchObject({ ok: false });
    expect(await h.act('a1', { type: 'start' })).toMatchObject({ ok: true });

    const first = h.view('a1').card!;
    expect(h.view('a1').role).toBe('narrator');
    expect(first.words).toBe(countWords(first.title));
    expect(['film', 'deyim']).toContain(first.kind);
    expect(h.view('b1')).toMatchObject({ role: 'watcher', card: { title: first.title } });
    expect(h.view('a2')).toMatchObject({ role: 'guesser', card: null });

    // Takım arkadaşı ne kartı ne de doğru bilinen kartın başlığını görür (flash dahil).
    await h.act('a1', { type: 'correct', cardId: first.id });
    const second = h.view('a1').card!;
    await h.act('a1', { type: 'pass', cardId: second.id });
    const third = h.view('a1').card!;
    expect(h.view('a2').flash).toMatchObject({ kind: 'pass', title: null });
    expect(h.view('b2').flash).toMatchObject({ kind: 'pass', title: second.title });
    for (const c of [first, second, third]) {
      expect(h.seen('a2')).not.toContain(c.title);
      expect(h.seen('a2')).not.toContain(c.id);
    }
  });

  it('doğru +1, pas puansız ve hak düşer, faul −1 ve kart geçer', async () => {
    const h = await setup({ passes: 1 });
    await h.act('a1', { type: 'start' });
    const c1 = h.view('a1').card!;
    await h.act('a1', { type: 'correct', cardId: c1.id });
    expect(h.view('a1').scores).toEqual({ a: 1, b: 0 });

    // Gecikmiş çift tıklama yutulur.
    expect(await h.act('a1', { type: 'correct', cardId: c1.id })).toMatchObject({ ok: true, stale: true });
    expect(h.view('a1').scores.a).toBe(1);

    const c2 = h.view('a1').card!;
    expect(await h.act('a2', { type: 'correct', cardId: c2.id })).toMatchObject({ ok: false });
    await h.act('a1', { type: 'pass', cardId: c2.id });
    expect(h.view('a1')).toMatchObject({ passesLeft: 0, scores: { a: 1, b: 0 } });
    const c3 = h.view('a1').card!;
    expect(await h.act('a1', { type: 'pass', cardId: c3.id })).toMatchObject({ ok: false, error: expect.stringMatching(/Pas hakkın bitti/) });

    // Faulü yalnızca rakip takım söyler.
    expect(await h.act('a2', { type: 'foul', cardId: c3.id })).toMatchObject({ ok: false });
    expect(await h.act('b1', { type: 'foul', cardId: c3.id })).toMatchObject({ ok: true });
    expect(await h.act('b2', { type: 'foul', cardId: c3.id })).toMatchObject({ ok: true, stale: true });
    expect(h.view('a1').scores).toEqual({ a: 0, b: 0 });
    expect(h.view('a1').card!.id).not.toBe(c3.id);
    expect(h.view('a1').turnStats).toEqual({ correct: 1, pass: 1, foul: 1 });

    // Geri al: faul cezası iade edilir, kart geri gelir.
    await h.act('a1', { type: 'undo' });
    expect(h.view('a1').scores.a).toBe(1);
    expect(h.view('a1').card!.id).toBe(c3.id);
  });

  it('faul cezası kapalıysa puan düşmez ama kart geçer', async () => {
    const h = await setup({ foulPenalty: false });
    await h.act('a1', { type: 'start' });
    const c = h.view('a1').card!;
    await h.act('b1', { type: 'foul', cardId: c.id });
    expect(h.view('a1').scores.a).toBe(0);
    expect(h.view('a1').card!.id).not.toBe(c.id);
    expect(h.view('a1').lastTurn).toBeNull();
  });

  it('süre bitince özet herkese açılır, sıra rakibe geçer ve anlatıcılar döner', async () => {
    const h = await setup({ turns: 2 });
    await h.act('a1', { type: 'start' });
    const c = h.view('a1').card!;
    await h.act('a1', { type: 'correct', cardId: c.id });
    const pending = h.view('a1').card!;
    h.advance(59_000);
    expect(h.view('a1').phase).toBe('turn');
    h.advance(1_000);
    const v = h.view('a2');
    expect(v).toMatchObject({ phase: 'ready', team: 'b', narratorId: 'b1', turnNumber: 1, role: 'watcher' });
    expect(v.lastTurn).toMatchObject({ team: 'a', narratorId: 'a1', points: 1, cards: [{ title: c.title, result: 'correct' }] });
    // Yarım kalan kart özette yer almaz.
    expect(v.lastTurn!.cards.map((x) => x.title)).not.toContain(pending.title);

    await h.act('b1', { type: 'start' });
    h.advance(60_000);
    expect(h.view('a1')).toMatchObject({ phase: 'ready', team: 'a', narratorId: 'a2' });
    await h.act('a2', { type: 'start' });
    h.advance(60_000);
    expect(h.view('a1')).toMatchObject({ phase: 'ready', team: 'b', narratorId: 'b2' });
    await h.act('b2', { type: 'start' });
    h.advance(60_000);
    expect(h.view('a1').phase).toBe('podium');
    expect(h.finished).toBeNull();
    h.advance(5_000);
    expect(h.finished).toEqual(
      expect.arrayContaining([
        { playerId: 'a1', score: 1, meta: { team: 'a' } },
        { playerId: 'b2', score: 0, meta: { team: 'b' } },
      ]),
    );
    expect(h.finished).toHaveLength(4);
  });

  it('bağlantısı kopan anlatıcı atlanır; oda sahibi başlatabilir ve atlayabilir', async () => {
    const h = await setup({}, ['a1', 'a2', 'b1', 'b2', 'a3']);
    h.setConnected('a1', false);
    expect(h.view('b1').narratorId).toBe('a1');
    // Oda sahibi a1 değil: b1 yap.
    h.setHost('b1');
    expect(await h.act('b2', { type: 'skipNarrator' })).toMatchObject({ ok: false });
    expect(await h.act('b1', { type: 'skipNarrator' })).toMatchObject({ ok: true });
    expect(h.view('b1').narratorId).toBe('a2');
    expect(await h.act('b1', { type: 'start' })).toMatchObject({ ok: true });
    expect(h.view('a2').role).toBe('narrator');
    expect(await h.act('b1', { type: 'skipNarrator' })).toMatchObject({ ok: false });
  });

  it('başlarken bağlantısı kopmuş anlatıcının yerine sıradaki çevrimiçi oyuncu anlatır', async () => {
    const h = await setup();
    h.setConnected('a1', false);
    expect(await h.act('a2', { type: 'start' })).toMatchObject({ ok: true });
    expect(h.view('a2').role).toBe('narrator');
  });

  it('anlatıcı odadan çıkarsa tur biter ve sıra rakibe geçer', async () => {
    const h = await setup({}, ['a1', 'a2', 'a3', 'b1', 'b2']);
    await h.act('a1', { type: 'start' });
    h.leave('a1');
    expect(h.view('b1')).toMatchObject({ phase: 'ready', team: 'b', turnNumber: 1 });
    h.advance(120_000);
    expect(h.view('b1').phase).toBe('ready');
  });

  it('yeni gelen oyuncu küçük takıma girer', async () => {
    const h = await setup({}, ['a1', 'a2', 'a3', 'b1', 'b2']);
    h.join('n1');
    expect(h.view('n1').teams.b).toContain('n1');
  });

  it('oyunu bitir: tur ortasında podyum, sonra finish', async () => {
    const h = await setup({ turns: 0 });
    expect(h.view('a1').totalTurns).toBeNull();
    await h.act('a1', { type: 'start' });
    const c = h.view('a1').card!;
    await h.act('a1', { type: 'correct', cardId: c.id });
    h.end();
    expect(h.view('a2')).toMatchObject({ phase: 'podium', card: null, scores: { a: 1, b: 0 } });
    expect(h.view('a2').lastTurn?.cards[0]?.title).toBe(c.title);
    h.advance(60_000);
    expect(h.finished).toHaveLength(4);
    expect(await h.act('a1', { type: 'start' })).toMatchObject({ ok: false });
  });

  it('oyun sırasında ayar değişikliği sıradaki turdan geçerli olur', async () => {
    const h = await setup();
    h.changeSettings({ seconds: 120, categories: ['atasozu-deyim'] });
    await h.act('a1', { type: 'start' });
    expect(h.view('a1').durationMs).toBe(120_000);
    expect(h.view('a1').card!.kind).toBe('deyim');
  });
});
