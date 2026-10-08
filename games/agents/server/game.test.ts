import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { createHarness, type Harness } from '@songie/game-kit/testing';
import { foldText } from '@songie/shared';
import { BOARD_SIZE, PACKS, clueProblem, type AgentsView, type CardColor, type TeamId } from '../shared/index.js';
import type { AgentsState } from './game.js';
import { agentsServer } from './index.js';
import { loadPacks } from './words.js';

const PLAYERS = ['a1', 'a2', 'a3', 'b1', 'b2'];
const TEAMS = { a: ['a1', 'a2', 'a3'], b: ['b1', 'b2'] };

/** Sabit tohumlu rastgelelik: testler tekrarlanabilir. */
function seeded(seed = 7) {
  let x = seed;
  return () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x / 2147483648;
  };
}

async function setup(settings: Record<string, unknown> = {}, players = PLAYERS) {
  const game = agentsServer({ db: new Database(':memory:'), random: seeded(), timing: { closingMs: 5000 } });
  const h = createHarness<AgentsView>(game, {
    players,
    settings: { teams: TEAMS, leaderPick: 'host', leaders: { a: 'a1', b: 'b1' }, ...settings },
  });
  await h.start();
  return h;
}

const st = (h: Harness<AgentsView>) => h.state as AgentsState;
const idx = (h: Harness<AgentsView>, color: CardColor, nth = 0) => {
  const list = st(h).cards.map((c, i) => [c, i] as const).filter(([c]) => c.color === color && !c.revealed);
  return list[nth]![1];
};
const leaderOf = (t: TeamId) => (t === 'a' ? 'a1' : 'b1');
const guesserOf = (t: TeamId) => (t === 'a' ? 'a2' : 'b2');

async function giveClue(h: Harness<AgentsView>, number: number, word = 'zıpzıp') {
  const team = st(h).team;
  const res = await h.act(leaderOf(team), { type: 'clue', word, number });
  expect(res).toMatchObject({ ok: true });
  return team;
}

describe('ajanlar: içerik', () => {
  it('en az 400 tekil kelime var ve aynı kökten ikiler yok', () => {
    const packs = loadPacks();
    const all = PACKS.flatMap((p) => packs[p]);
    expect(all.length).toBeGreaterThanOrEqual(400);
    expect(new Set(all.map(foldText)).size).toBe(all.length);
    for (const p of PACKS) expect(packs[p].length).toBeGreaterThanOrEqual(BOARD_SIZE);
    for (const w of all) expect(w).toMatch(/^\p{L}+$/u);
    // Tablodaki bir kelime, başka bir tablo kelimesi için geçersiz ipucu olmamalı (kök/parça).
    const clashes = all.flatMap((a) => all.filter((b) => b !== a && clueProblem(a, [b]) !== null).map((b) => `${a}/${b}`));
    expect(clashes).toEqual([]);
  });
});

describe('ajanlar: tablo ve anahtar', () => {
  it('9/8/7/1 dağılımı; başlayan takımın 9 ajanı var', async () => {
    const h = await setup();
    const s = st(h);
    const count = (c: CardColor) => s.cards.filter((x) => x.color === c).length;
    expect(s.cards).toHaveLength(25);
    expect(new Set(s.cards.map((c) => c.word)).size).toBe(25);
    expect(count(s.startTeam)).toBe(9);
    expect(count(s.startTeam === 'a' ? 'b' : 'a')).toBe(8);
    expect(count('neutral')).toBe(7);
    expect(count('assassin')).toBe(1);
    expect(h.view('a2')).toMatchObject({ phase: 'clue', team: s.startTeam, remaining: { [s.startTeam]: 9 } });
  });

  it('anahtar yalnızca liderlere gider', async () => {
    const h = await setup();
    expect(h.view('a1').keyVisible).toBe(true);
    expect(h.view('b1').cards.every((c) => c.color !== null)).toBe(true);
    for (const id of ['a2', 'a3', 'b2']) {
      expect(h.view(id).keyVisible).toBe(false);
      expect(h.view(id).cards.every((c) => c.color === null)).toBe(true);
      expect(h.seen(id)).not.toContain('assassin');
      expect(h.seen(id)).not.toContain('neutral');
    }
    // Açılan kartın rengi herkese görünür; diğerleri hâlâ gizli.
    const team = await giveClue(h, 2);
    const i = idx(h, 'neutral');
    await h.act(guesserOf(team), { type: 'touch', index: i, turn: st(h).turn });
    for (const id of ['a2', 'b2']) {
      const v = h.view(id);
      expect(v.cards[i]).toMatchObject({ revealed: true, color: 'neutral' });
      expect(v.cards.filter((c) => c.color !== null)).toHaveLength(1);
      expect(h.seen(id)).not.toContain('assassin');
    }
  });

  it('kopan lideri oda sahibi değiştirir; yeni lider anahtarı görür, eskisi tahminci olur', async () => {
    const h = await setup();
    h.setConnected('a1', false);
    expect(await h.act('a2', { type: 'setLeader', team: 'a', playerId: 'a3' })).toMatchObject({ ok: false });
    // Oda sahibi a1; bağlantısı koptuğu için oda sahipliği a2'ye geçmiş olsun.
    h.setHost('a2');
    expect(await h.act('a2', { type: 'setLeader', team: 'a', playerId: 'b2' })).toMatchObject({ ok: false });
    expect(await h.act('a2', { type: 'setLeader', team: 'a', playerId: 'a3' })).toMatchObject({ ok: true });
    expect(h.view('a3')).toMatchObject({ role: 'leader', keyVisible: true });
    expect(h.view('a1')).toMatchObject({ role: 'guesser', keyVisible: false });
    expect(h.view('a2').leaders.a).toBe('a3');
  });

  it('lider odadan çıkarsa takımdan biri lider olur', async () => {
    const h = await setup();
    h.leave('b1');
    expect(h.view('b2')).toMatchObject({ role: 'leader', keyVisible: true });
    expect(h.view('a2').teams.b).toEqual(['b2']);
  });
});

describe('ajanlar: ipucu', () => {
  it('ipucu doğrulaması', () => {
    const board = ['Kitap', 'Gözlük', 'Ağaç', 'Kalem', 'Yıldız'];
    expect(clueProblem('macera', board)).toBeNull();
    expect(clueProblem('iki kelime', board)).toMatch(/tek kelime/);
    expect(clueProblem('a1', board)).toMatch(/harf/);
    expect(clueProblem('KİTAP', board)).toMatch(/Kitap/);
    expect(clueProblem('kitabı', board)).toMatch(/Kitap/);
    expect(clueProblem('kitapçı', board)).toMatch(/Kitap/);
    expect(clueProblem('göz', board)).toMatch(/Gözlük/);
    expect(clueProblem('agac', board)).toMatch(/Ağaç/);
    expect(clueProblem('kalemlik', board)).toMatch(/Kalem/);
    expect(clueProblem('denizyıldızı', board)).toBeNull(); // yıldızı: sonu "yildiz" değil
    expect(clueProblem('denizyıldız', board)).toMatch(/Yıldız/);
  });

  it('yalnızca sırası gelen lider ipucu verir; tablodaki kelime reddedilir, açılmış kelime serbest', async () => {
    const h = await setup();
    const team = st(h).team;
    const opp = team === 'a' ? 'b' : 'a';
    expect(await h.act(leaderOf(opp), { type: 'clue', word: 'deneme', number: 1 })).toMatchObject({ ok: false });
    expect(await h.act(guesserOf(team), { type: 'clue', word: 'deneme', number: 1 })).toMatchObject({ ok: false });
    const word = st(h).cards[0]!.word;
    const bad = await h.act(leaderOf(team), { type: 'clue', word: word.toLocaleUpperCase('tr'), number: 1 });
    expect(bad).toMatchObject({ ok: false });
    expect((bad as { error: string }).error).toContain(word);

    st(h).cards[0]!.revealed = true;
    expect(await h.act(leaderOf(team), { type: 'clue', word, number: 1 })).toMatchObject({ ok: true });
    expect(h.view('a2')).toMatchObject({ phase: 'guess', clue: { number: 1 }, guessesLeft: 2 });
    expect(h.view('a2').log.at(-1)).toMatchObject({ team, number: 1 });
  });
});

describe('ajanlar: açma kuralları', () => {
  it('kendi ajanı: sayı + 1 hakka kadar devam, sonra sıra geçer', async () => {
    const h = await setup();
    const team = await giveClue(h, 1);
    const g = guesserOf(team);
    expect(await h.act(g, { type: 'touch', index: idx(h, team), turn: st(h).turn })).toMatchObject({ ok: true });
    expect(h.view(g)).toMatchObject({ phase: 'guess', team, guessesLeft: 1 });
    await h.act(g, { type: 'touch', index: idx(h, team), turn: st(h).turn });
    expect(h.view(g)).toMatchObject({ phase: 'clue', team: team === 'a' ? 'b' : 'a' });
    expect(h.view(g).remaining[team]).toBe(st(h).startTeam === team ? 7 : 6);
  });

  it('lider ve rakip takım dokunamaz; eski sıradaki dokunuş yutulur', async () => {
    const h = await setup();
    const team = await giveClue(h, 2);
    const opp = team === 'a' ? 'b' : 'a';
    expect(await h.act(leaderOf(team), { type: 'touch', index: 0, turn: st(h).turn })).toMatchObject({ ok: false });
    expect(await h.act(guesserOf(opp), { type: 'touch', index: 0, turn: st(h).turn })).toMatchObject({ ok: false });
    expect(await h.act(guesserOf(team), { type: 'touch', index: 0, turn: st(h).turn - 1 })).toMatchObject({ ok: true, stale: true });
    expect(st(h).cards.every((c) => !c.revealed)).toBe(true);
  });

  it('tarafsız kart sırayı geçirir', async () => {
    const h = await setup();
    const team = await giveClue(h, 3);
    await h.act(guesserOf(team), { type: 'touch', index: idx(h, 'neutral'), turn: st(h).turn });
    expect(h.view('a2')).toMatchObject({ phase: 'clue', team: team === 'a' ? 'b' : 'a' });
  });

  it('rakip kartı rakibe sayılır ve sıra geçer', async () => {
    const h = await setup();
    const team = await giveClue(h, 3);
    const opp: TeamId = team === 'a' ? 'b' : 'a';
    const before = h.view('a2').remaining[opp];
    await h.act(guesserOf(team), { type: 'touch', index: idx(h, opp), turn: st(h).turn });
    expect(h.view('a2').remaining[opp]).toBe(before - 1);
    expect(h.view('a2')).toMatchObject({ phase: 'clue', team: opp });
    expect(h.view('a2').log.at(-1)!.picks).toEqual([expect.objectContaining({ color: opp })]);
  });

  it('suikastçı: açan takım anında kaybeder, anahtar herkese açılır', async () => {
    const h = await setup();
    const team = await giveClue(h, 2);
    const opp: TeamId = team === 'a' ? 'b' : 'a';
    await h.act(guesserOf(team), { type: 'touch', index: idx(h, 'assassin'), turn: st(h).turn });
    const v = h.view('a2');
    expect(v).toMatchObject({ phase: 'over', winner: opp, reason: 'assassin', keyVisible: true });
    expect(v.cards.every((c) => c.color !== null)).toBe(true);
    expect(v.wins[opp]).toBe(1);
  });

  it('sırayı bitir: yalnızca tahminci, sıra rakibe geçer', async () => {
    const h = await setup();
    const team = await giveClue(h, 2);
    const turn = st(h).turn;
    expect(await h.act(leaderOf(team), { type: 'endTurn', turn })).toMatchObject({ ok: false });
    expect(await h.act(guesserOf(team), { type: 'endTurn', turn })).toMatchObject({ ok: true });
    expect(h.view('a2')).toMatchObject({ phase: 'clue', team: team === 'a' ? 'b' : 'a' });
    // Çift tıklama: ikincisi eski sıraya ait.
    expect(await h.act(guesserOf(team), { type: 'endTurn', turn })).toMatchObject({ ok: true, stale: true });
  });

  it('sınırsız ipucunda hak sınırı yok', async () => {
    const h = await setup();
    const team = await giveClue(h, -1);
    for (let k = 0; k < 4; k++) await h.act(guesserOf(team), { type: 'touch', index: idx(h, team), turn: st(h).turn });
    expect(h.view('a2')).toMatchObject({ phase: 'guess', team, guessesLeft: null });
  });

  it('tüm ajanlarını bulan takım kazanır; rakibin son ajanını açmak rakibe kazandırır', async () => {
    const h = await setup();
    const team = await giveClue(h, -1);
    const n = st(h).cards.filter((c) => c.color === team).length;
    for (let k = 0; k < n; k++) await h.act(guesserOf(team), { type: 'touch', index: idx(h, team), turn: st(h).turn });
    expect(h.view('b2')).toMatchObject({ phase: 'over', winner: team, reason: 'agents', remaining: { [team]: 0 } });

    const h2 = await setup();
    const t2 = st(h2).team;
    const o2: TeamId = t2 === 'a' ? 'b' : 'a';
    for (const c of st(h2).cards) if (c.color === o2) c.revealed = true;
    st(h2).cards.find((c) => c.color === o2)!.revealed = false;
    await giveClue(h2, 2);
    await h2.act(guesserOf(t2), { type: 'touch', index: idx(h2, o2), turn: st(h2).turn });
    expect(h2.view('a2')).toMatchObject({ phase: 'over', winner: o2, reason: 'agents' });
  });
});

describe('ajanlar: oylama modu', () => {
  it('takımın çoğunluğu aynı karta dokununca açılır; oylar canlı görünür', async () => {
    const players = ['a1', 'a2', 'a3', 'a4', 'b1', 'b2'];
    const h = await setup({ revealMode: 'vote', teams: { a: ['a1', 'a2', 'a3', 'a4'], b: ['b1', 'b2'] } }, players);
    // a takımının sırası olsun.
    if (st(h).team !== 'a') await h.act('b1', { type: 'clue', word: 'zıpzıp', number: 0 }).then(() => h.act('b2', { type: 'endTurn', turn: st(h).turn }));
    await giveClue(h, 2);
    expect(h.view('a2').votesNeeded).toBe(2); // 3 tahminci → 2 oy
    const target = idx(h, 'a');
    const otherCard = idx(h, 'neutral');
    await h.act('a2', { type: 'touch', index: target, turn: st(h).turn });
    await h.act('a3', { type: 'touch', index: otherCard, turn: st(h).turn });
    expect(st(h).cards[target]!.revealed).toBe(false);
    expect(h.view('a4').cards[target]!.votes).toEqual(['a2']);
    expect(h.view('b2').cards[otherCard]!.votes).toEqual(['a3']);
    // Aynı karta ikinci dokunuş oyu geri çeker.
    await h.act('a2', { type: 'touch', index: target, turn: st(h).turn });
    expect(h.view('a4').cards[target]!.votes).toEqual([]);
    await h.act('a2', { type: 'touch', index: target, turn: st(h).turn });
    await h.act('a4', { type: 'touch', index: target, turn: st(h).turn });
    expect(st(h).cards[target]!.revealed).toBe(true);
    expect(h.view('a4').cards.every((c) => c.votes.length === 0)).toBe(true);
    expect(h.view('a4')).toMatchObject({ phase: 'guess', team: 'a', guessesLeft: 2 });
  });

  it('bağlantısı kopan tahminci çoğunluğa sayılmaz', async () => {
    const players = ['a1', 'a2', 'a3', 'a4', 'b1', 'b2'];
    const h = await setup({ revealMode: 'vote', teams: { a: ['a1', 'a2', 'a3', 'a4'], b: ['b1', 'b2'] } }, players);
    if (st(h).team !== 'a') await h.act('b1', { type: 'clue', word: 'zıpzıp', number: 0 }).then(() => h.act('b2', { type: 'endTurn', turn: st(h).turn }));
    h.setConnected('a3', false);
    h.setConnected('a4', false);
    await giveClue(h, 1);
    await h.act('a2', { type: 'touch', index: idx(h, 'a'), turn: st(h).turn });
    expect(st(h).cards.filter((c) => c.revealed)).toHaveLength(1);
  });
  it('oy veren kalmayınca bekleyen oy, biri kopunca çoğunluğa ulaşıp kartı açar', async () => {
    const players = ['a1', 'a2', 'a3', 'a4', 'b1', 'b2'];
    const h = await setup({ revealMode: 'vote', teams: { a: ['a1', 'a2', 'a3', 'a4'], b: ['b1', 'b2'] } }, players);
    if (st(h).team !== 'a') await h.act('b1', { type: 'clue', word: 'zıpzıp', number: 0 }).then(() => h.act('b2', { type: 'endTurn', turn: st(h).turn }));
    await giveClue(h, 1);
    const target = idx(h, 'a');
    await h.act('a2', { type: 'touch', index: target, turn: st(h).turn });
    expect(st(h).cards[target]!.revealed).toBe(false);
    h.setConnected('a3', false);
    h.setConnected('a4', false);
    expect(st(h).cards[target]!.revealed).toBe(true);
  });
});

describe('ajanlar: süre', () => {
  it('ayrı süre: lider süresinde ipucu vermezse sıra geçer; tahmin süresi yeniden başlar', async () => {
    const h = await setup({ timer: 'split', seconds: 60 });
    const team = st(h).team;
    const opp: TeamId = team === 'a' ? 'b' : 'a';
    expect(h.view('a2').durationMs).toBe(60_000);
    h.advance(60_000);
    expect(h.view('a2')).toMatchObject({ phase: 'clue', team: opp });
    expect(h.view('a2').log.at(-1)).toMatchObject({ team, word: null });
    h.advance(30_000);
    await giveClue(h, 1);
    h.advance(59_000);
    expect(h.view('a2')).toMatchObject({ phase: 'guess', team: opp });
    h.advance(1_000);
    expect(h.view('a2')).toMatchObject({ phase: 'clue', team });
  });

  it('toplam süre: ipucu süreyi sıfırlamaz', async () => {
    const h = await setup({ timer: 'total', seconds: 60 });
    const team = st(h).team;
    h.advance(40_000);
    await giveClue(h, 1);
    h.advance(20_000);
    expect(h.view('a2')).toMatchObject({ phase: 'clue', team: team === 'a' ? 'b' : 'a' });
  });
});

describe('ajanlar: tablo sonu', () => {
  it('yeni tablo: aynı oda, liderler değişir, başlayan takım değişir, skor birikir', async () => {
    const h = await setup();
    const team = await giveClue(h, 2);
    const words = st(h).cards.map((c) => c.word);
    const start = st(h).startTeam;
    expect(await h.act('a1', { type: 'newBoard' })).toMatchObject({ ok: true, stale: true });
    await h.act(guesserOf(team), { type: 'touch', index: idx(h, 'assassin'), turn: st(h).turn });
    expect(await h.act('a2', { type: 'newBoard' })).toMatchObject({ ok: false });
    expect(await h.act('a1', { type: 'newBoard' })).toMatchObject({ ok: true });
    const v = h.view('a2');
    expect(v).toMatchObject({ phase: 'clue', board: 2, leaders: { a: 'a2', b: 'b2' }, startTeam: start === 'a' ? 'b' : 'a', role: 'leader' });
    expect(v.wins).toEqual(team === 'a' ? { a: 0, b: 1 } : { a: 1, b: 0 });
    expect(v.log).toEqual([]);
    expect(st(h).cards.some((c) => words.includes(c.word))).toBe(false);
    expect(h.view('a1')).toMatchObject({ role: 'guesser', keyVisible: false });
    expect(h.finished).toBeNull();
  });

  it('lobiye dön: kazanan takıma 1 puan', async () => {
    const h = await setup();
    expect(await h.act('a1', { type: 'toLobby' })).toMatchObject({ ok: false });
    const team = await giveClue(h, 2);
    await h.act(guesserOf(team), { type: 'touch', index: idx(h, 'assassin'), turn: st(h).turn });
    expect(await h.act('a1', { type: 'toLobby' })).toMatchObject({ ok: true });
    const opp = team === 'a' ? 'b' : 'a';
    expect(h.finished).toHaveLength(5);
    for (const r of h.finished!) expect(r.score).toBe((r.meta as { team: TeamId }).team === opp ? 1 : 0);
  });

  it('oyunu bitir: anahtar herkese açılır, kısa süre sonra skorlar kaydedilir', async () => {
    const h = await setup();
    await giveClue(h, 2);
    h.end();
    expect(h.view('a2')).toMatchObject({ phase: 'over', winner: null, reason: 'ended', closing: true, keyVisible: true });
    expect(await h.act('a2', { type: 'touch', index: 0, turn: st(h).turn })).toMatchObject({ ok: false });
    expect(h.finished).toBeNull();
    h.advance(5000);
    expect(h.finished).toHaveLength(5);
    expect(h.finished!.every((r) => r.score === 0)).toBe(true);
  });

  it('takımda 2 kişiden az varsa başlamaz', async () => {
    const game = agentsServer({ db: new Database(':memory:') });
    const h = createHarness(game, { players: ['a1', 'a2', 'a3', 'b1'], settings: { teams: { a: ['a1', 'a2', 'a3'], b: ['b1'] } } });
    await expect(h.start()).rejects.toThrow(/en az 2/);
  });

  it('oyun sırasında katılan oyuncu küçük takıma tahminci olarak girer', async () => {
    const h = await setup();
    h.join('b3');
    expect(h.view('b3')).toMatchObject({ myTeam: 'b', role: 'guesser', keyVisible: false });
    expect(h.seen('b3')).not.toContain('assassin');
  });
});
