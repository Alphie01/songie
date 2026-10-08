import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { createHarness } from '@songie/game-kit/testing';
import { CUSTOM_CATEGORY, type RedFlagView } from '../shared/index.js';
import { DEFAULT_TIMING, majorityOf } from './game.js';
import { redFlagServer } from './index.js';

const game = () => redFlagServer({ db: new Database(':memory:') });

function setup(settings: Record<string, unknown> = {}, players = ['ali', 'ayse', 'cem']) {
  const h = createHarness<RedFlagView>(game(), {
    players,
    settings: { seconds: 0, predict: false, dealBreaker: false, anonymous: false, rounds: 10, ...settings },
  });
  const item = () => h.view('ali').item!.id;
  return { h, item };
}

describe('red-flag: içerik', () => {
  it('has at least 250 built-in situations across all categories', () => {
    const g = game();
    const cats = g.pool.categories();
    const builtIn = cats.filter((c) => c.id !== CUSTOM_CATEGORY);
    expect(builtIn.map((c) => c.id)).toEqual([
      'iliski',
      'ilk-bulusma',
      'arkadaslik',
      'ev-arkadasi',
      'is',
      'aile',
      'sosyal-medya',
      'aliskanliklar',
      'cesur',
    ]);
    expect(builtIn.reduce((n, c) => n + c.count, 0)).toBeGreaterThanOrEqual(250);
    const texts = g.pool.items(builtIn.map((c) => c.id)).map((s) => s.text);
    expect(new Set(texts).size).toBe(texts.length);
  });

  it('stores player-added situations in red_flag_items and plays them', async () => {
    const db = new Database(':memory:');
    const g = redFlagServer({ db });
    g.pool.addCustom({ text: 'Arkadaşın her buluşmaya kendi bardağını getiriyor.' }, 'ali');
    expect(db.prepare('SELECT COUNT(*) AS n FROM red_flag_items').get()).toEqual({ n: 1 });
    expect(g.pool.categories().find((c) => c.id === CUSTOM_CATEGORY)?.count).toBe(1);
    const h = createHarness<RedFlagView>(g, { players: ['ali', 'ayse'], settings: { categories: [CUSTOM_CATEGORY] } });
    await h.start();
    expect(h.view('ayse').item?.text).toBe('Arkadaşın her buluşmaya kendi bardağını getiriyor.');
  });

  it('rejects settings whose categories are empty', async () => {
    const h = createHarness(game(), { players: ['ali', 'ayse'], settings: { categories: [CUSTOM_CATEGORY] } });
    await expect(h.start()).rejects.toThrow(/kategori/);
  });
});

describe('red-flag: oylama', () => {
  it('reveals once everyone voted and counts the distribution', async () => {
    const { h, item } = setup();
    await h.start();
    const id = item();
    expect(h.view('ali')).toMatchObject({ phase: 'vote', round: 0, totalRounds: 10, voters: ['ali', 'ayse', 'cem'] });
    await h.act('ali', { type: 'vote', itemId: id, vote: 'green' });
    await h.act('ayse', { type: 'vote', itemId: id, vote: 'red' });
    expect(h.view('cem')).toMatchObject({ phase: 'vote', done: ['ali', 'ayse'], myVote: null });
    // Fikrini değiştirebilir.
    await h.act('ali', { type: 'vote', itemId: id, vote: 'red' });
    await h.act('cem', { type: 'vote', itemId: id, vote: 'green' });
    const v = h.view('cem');
    expect(v.phase).toBe('reveal');
    expect(v.round).toBe(1);
    expect(v.reveal).toMatchObject({ counts: { green: 1, red: 2, never: 0 }, total: 3, majority: ['red'], myVote: 'green' });
    expect(v.reveal!.votes).toEqual(
      expect.arrayContaining([
        { playerId: 'ali', vote: 'red' },
        { playerId: 'ayse', vote: 'red' },
        { playerId: 'cem', vote: 'green' },
      ]),
    );
  });

  it('ignores late votes for an old situation', async () => {
    const { h, item } = setup();
    await h.start();
    const id = item();
    for (const p of ['ali', 'ayse', 'cem']) await h.act(p, { type: 'vote', itemId: id, vote: 'green' });
    expect(await h.act('ali', { type: 'vote', itemId: id, vote: 'red' })).toMatchObject({ ok: true, stale: true });
    expect(h.view('ali').reveal!.counts.green).toBe(3);
  });

  it('only allows "Asla olmaz" when the third option is on', async () => {
    const off = setup();
    await off.h.start();
    const r = await off.h.act('ali', { type: 'vote', itemId: off.item(), vote: 'never' });
    expect(r).toMatchObject({ ok: false });
    expect((r as { error: string }).error).toMatch(/Asla olmaz/);

    const on = setup({ dealBreaker: true });
    await on.h.start();
    const id = on.item();
    expect(on.h.view('ali').dealBreaker).toBe(true);
    await on.h.act('ali', { type: 'vote', itemId: id, vote: 'never' });
    await on.h.act('ayse', { type: 'vote', itemId: id, vote: 'never' });
    await on.h.act('cem', { type: 'vote', itemId: id, vote: 'red' });
    expect(on.h.view('ali').reveal).toMatchObject({ counts: { green: 0, red: 1, never: 2 }, majority: ['never'] });
  });
});

describe('red-flag: gizlilik', () => {
  it('never sends anyone’s vote to others before the reveal', async () => {
    const { h, item } = setup({ dealBreaker: true, predict: true });
    await h.start();
    const id = item();
    await h.act('ali', { type: 'vote', itemId: id, vote: 'never' });
    await h.act('ali', { type: 'guess', itemId: id, vote: 'red' });
    await h.act('ayse', { type: 'vote', itemId: id, vote: 'green' });
    for (const p of ['ayse', 'cem']) {
      expect(h.seen(p)).not.toContain('"never"');
      expect(h.seen(p)).not.toContain('"red"');
    }
    expect(h.seen('cem')).not.toContain('"green"');
    expect(h.view('ali')).toMatchObject({ myVote: 'never', myGuess: 'red', reveal: null });
  });

  it('anonymous mode never sends who voted what, even after the reveal or at the end', async () => {
    const { h, item } = setup({ anonymous: true });
    await h.start();
    const id = item();
    await h.act('ali', { type: 'vote', itemId: id, vote: 'green' });
    await h.act('ayse', { type: 'vote', itemId: id, vote: 'red' });
    await h.act('cem', { type: 'vote', itemId: id, vote: 'red' });
    const v = h.view('ayse');
    expect(v.phase).toBe('reveal');
    expect(v.reveal).toMatchObject({ counts: { green: 1, red: 2 }, votes: null, myVote: 'red' });
    h.end();
    const end = h.view('ali').summary!;
    expect(end.profiles.map((p) => p.playerId)).toEqual(['ali']);
    expect(end).toMatchObject({ mostGreen: null, strictest: null, rebel: null });
    for (const p of ['ali', 'ayse', 'cem']) {
      expect(h.seen(p)).not.toMatch(/"vote":/);
      const others = ['ali', 'ayse', 'cem'].filter((x) => x !== p);
      for (const o of others) expect(h.seen(p)).not.toContain(`"playerId":"${o}","green"`);
    }
  });

  it('keeps an anonymous round anonymous even if the host opens names mid-game', async () => {
    const { h, item } = setup({ anonymous: true });
    await h.start();
    const id = item();
    for (const p of ['ali', 'ayse', 'cem']) await h.act(p, { type: 'vote', itemId: id, vote: 'green' });
    h.changeSettings({ anonymous: false });
    expect(h.view('ayse').reveal!.votes).toBeNull();
    h.advance(DEFAULT_TIMING.revealLockMs);
    await h.act('ali', { type: 'next', round: 1 });
    expect(h.view('ali').anonymous).toBe(false);
    h.end();
    // Oyunda isimsiz tur olduğundan kişisel profiller başkasına gösterilmez.
    expect(h.view('ali').summary!.profiles.map((p) => p.playerId)).toEqual(['ali']);
  });
});

describe('red-flag: tahmin', () => {
  it('gives +1 to everyone who guessed the majority', async () => {
    const { h, item } = setup({ predict: true });
    await h.start();
    const id = item();
    await h.act('ali', { type: 'vote', itemId: id, vote: 'red' });
    await h.act('ali', { type: 'guess', itemId: id, vote: 'red' });
    await h.act('ayse', { type: 'vote', itemId: id, vote: 'red' });
    await h.act('ayse', { type: 'guess', itemId: id, vote: 'green' });
    await h.act('cem', { type: 'vote', itemId: id, vote: 'green' });
    // Tahmin modunda oy tek başına yetmez: tahmin de bekleniyor.
    expect(h.view('cem').phase).toBe('vote');
    expect(h.view('cem').done).toEqual(['ali', 'ayse']);
    await h.act('cem', { type: 'guess', itemId: id, vote: 'red' });
    const v = h.view('ali');
    expect(v.phase).toBe('reveal');
    expect(v.reveal!.correct.sort()).toEqual(['ali', 'cem']);
    expect(v.scores).toEqual({ ali: 1, ayse: 0, cem: 1 });
  });

  it('counts every tied option as the majority', async () => {
    expect(majorityOf({ green: 2, red: 2, never: 1 })).toEqual(['green', 'red']);
    expect(majorityOf({ green: 0, red: 0, never: 0 })).toEqual([]);
    const { h, item } = setup({ predict: true }, ['ali', 'ayse']);
    await h.start();
    const id = item();
    await h.act('ali', { type: 'vote', itemId: id, vote: 'green' });
    await h.act('ali', { type: 'guess', itemId: id, vote: 'green' });
    await h.act('ayse', { type: 'vote', itemId: id, vote: 'red' });
    await h.act('ayse', { type: 'guess', itemId: id, vote: 'red' });
    expect(h.view('ali').scores).toEqual({ ali: 1, ayse: 1 });
  });

  it('rejects guesses when prediction mode is off', async () => {
    const { h, item } = setup({ predict: false });
    await h.start();
    expect(await h.act('ali', { type: 'guess', itemId: item(), vote: 'green' })).toMatchObject({ ok: false });
  });
});

describe('red-flag: süre ve akış', () => {
  it('reveals with whatever came in when the timer ends', async () => {
    const { h, item } = setup({ seconds: 15 });
    await h.start();
    const id = item();
    const v0 = h.view('ali');
    expect(v0.endsAt - v0.serverNow).toBe(15_000);
    await h.act('ali', { type: 'vote', itemId: id, vote: 'green' });
    h.advance(14_000);
    expect(h.view('ali').phase).toBe('vote');
    h.advance(1_000);
    expect(h.view('ayse')).toMatchObject({ phase: 'reveal', reveal: { counts: { green: 1, red: 0 }, total: 1 } });
  });

  it('waits forever in untimed mode until votes or the host reveal', async () => {
    const { h, item } = setup({ seconds: 0 });
    await h.start();
    const id = item();
    expect(h.view('ali').endsAt).toBe(0);
    h.advance(600_000);
    expect(h.view('ali').phase).toBe('vote');
    expect(await h.act('ali', { type: 'reveal', itemId: id })).toMatchObject({ ok: false });
    await h.act('ayse', { type: 'vote', itemId: id, vote: 'red' });
    expect(await h.act('ayse', { type: 'reveal', itemId: id })).toMatchObject({ ok: false });
    await h.act('ali', { type: 'reveal', itemId: id });
    expect(h.view('cem').phase).toBe('reveal');
  });

  it('holds the discussion briefly, then the host or an all-ready room moves on', async () => {
    const { h, item } = setup();
    await h.start();
    let id = item();
    for (const p of ['ali', 'ayse', 'cem']) await h.act(p, { type: 'vote', itemId: id, vote: 'green' });
    expect(await h.act('ali', { type: 'next', round: 1 })).toMatchObject({ ok: false });
    expect(await h.act('ayse', { type: 'next', round: 1 })).toMatchObject({ ok: false });
    h.advance(DEFAULT_TIMING.revealLockMs);
    expect(await h.act('ali', { type: 'next', round: 1 })).toMatchObject({ ok: true });
    expect(h.view('ali')).toMatchObject({ phase: 'vote', round: 1 });
    expect(item()).not.toBe(id);
    // Çift tıklama yeni turu atlatmaz.
    expect(await h.act('ali', { type: 'next', round: 1 })).toMatchObject({ ok: true, stale: true });
    expect(h.view('ali').phase).toBe('vote');

    id = item();
    for (const p of ['ali', 'ayse', 'cem']) await h.act(p, { type: 'vote', itemId: id, vote: 'red' });
    for (const p of ['ali', 'ayse', 'cem']) await h.act(p, { type: 'ready', round: 2 });
    expect(h.view('ali').phase).toBe('reveal');
    h.advance(DEFAULT_TIMING.revealLockMs);
    expect(h.view('ali')).toMatchObject({ phase: 'vote', round: 2 });
  });

  it('ends after the configured number of rounds', async () => {
    const { h, item } = setup({ rounds: 10 });
    await h.start();
    for (let i = 0; i < 10; i++) {
      const id = item();
      for (const p of ['ali', 'ayse', 'cem']) await h.act(p, { type: 'vote', itemId: id, vote: i % 2 ? 'green' : 'red' });
      h.advance(DEFAULT_TIMING.revealLockMs);
      await h.act('ali', { type: 'next', round: i + 1 });
    }
    expect(h.view('ali').phase).toBe('podium');
    expect(h.view('ali').summary!.rounds).toBe(10);
    h.advance(DEFAULT_TIMING.podiumMs);
    expect(h.finished).not.toBeNull();
  });

  it('lets only the host skip a situation without counting it', async () => {
    const { h, item } = setup();
    await h.start();
    const id = item();
    await h.act('ayse', { type: 'vote', itemId: id, vote: 'red' });
    expect(await h.act('ayse', { type: 'skip', itemId: id })).toMatchObject({ ok: false });
    expect(await h.act('ali', { type: 'skip', itemId: id })).toMatchObject({ ok: true });
    const v = h.view('ayse');
    expect(v).toMatchObject({ phase: 'vote', round: 0, myVote: null, done: [] });
    expect(v.item!.id).not.toBe(id);
    expect(await h.act('ali', { type: 'skip', itemId: id })).toMatchObject({ ok: true, stale: true });
  });
});

describe('red-flag: bağlantı', () => {
  it('does not wait for a disconnected player', async () => {
    const { h, item } = setup();
    await h.start();
    const id = item();
    h.setConnected('cem', false);
    await h.act('ali', { type: 'vote', itemId: id, vote: 'green' });
    await h.act('ayse', { type: 'vote', itemId: id, vote: 'green' });
    expect(h.view('ali').phase).toBe('reveal');
  });

  it('notices a player who drops after everyone else voted', async () => {
    const { h, item } = setup();
    await h.start();
    const id = item();
    await h.act('ali', { type: 'vote', itemId: id, vote: 'green' });
    await h.act('ayse', { type: 'vote', itemId: id, vote: 'red' });
    h.setConnected('cem', false);
    h.advance(DEFAULT_TIMING.watchdogMs);
    expect(h.view('ali').phase).toBe('reveal');
    // Hazır kontrolünde de beklenmez.
    h.advance(DEFAULT_TIMING.revealLockMs);
    await h.act('ali', { type: 'ready', round: 1 });
    await h.act('ayse', { type: 'ready', round: 1 });
    expect(h.view('ali').phase).toBe('vote');
  });

  it('drops a leaving player from the wait list and lets a newcomer vote', async () => {
    const { h, item } = setup();
    await h.start();
    const id = item();
    h.join('deniz');
    expect(h.view('deniz').voters).toContain('deniz');
    await h.act('ali', { type: 'vote', itemId: id, vote: 'green' });
    await h.act('ayse', { type: 'vote', itemId: id, vote: 'green' });
    await h.act('deniz', { type: 'vote', itemId: id, vote: 'red' });
    expect(h.view('ali').phase).toBe('vote');
    h.leave('cem');
    expect(h.view('ali')).toMatchObject({ phase: 'reveal', reveal: { total: 3 } });
  });
});

describe('red-flag: oyunu bitir', () => {
  it('shows tolerance profiles and divisive situations, then finishes', async () => {
    const { h, item } = setup({ predict: true, dealBreaker: true });
    await h.start();
    const plan: Record<string, ['green' | 'red' | 'never', 'green' | 'red' | 'never']>[] = [
      { ali: ['green', 'green'], ayse: ['red', 'green'], cem: ['never', 'green'] },
      { ali: ['green', 'red'], ayse: ['green', 'green'], cem: ['red', 'green'] },
    ];
    const texts: string[] = [];
    for (const [i, round] of plan.entries()) {
      const id = item();
      texts.push(h.view('ali').item!.text);
      for (const [p, [vote, guess]] of Object.entries(round)) {
        await h.act(p, { type: 'vote', itemId: id, vote });
        await h.act(p, { type: 'guess', itemId: id, vote: guess });
      }
      h.advance(DEFAULT_TIMING.revealLockMs);
      if (i < plan.length - 1) await h.act('ali', { type: 'next', round: i + 1 });
    }
    expect(h.finished).toBeNull();
    h.end();
    const v = h.view('ayse');
    expect(v.phase).toBe('podium');
    expect(v.item).toBeNull();
    const sum = v.summary!;
    expect(sum.rounds).toBe(2);
    expect(sum.profiles.map((p) => [p.playerId, p.tolerance])).toEqual([
      ['ali', 100],
      ['ayse', 50],
      ['cem', 0],
    ]);
    expect(sum.mostGreen).toBe('ali');
    expect(sum.strictest).toBe('cem');
    expect(sum.rebel).toBe('cem');
    expect(sum.divisive[0]!.text).toBe(texts[0]);
    expect(sum.totals).toEqual({ green: 3, red: 2, never: 1 });
    // 1. tur: üçlü beraberlik, herkes doğru. 2. tur: çoğunluk green.
    expect(v.scores).toEqual({ ali: 1, ayse: 2, cem: 2 });

    h.advance(DEFAULT_TIMING.podiumMs);
    expect(h.finished).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ playerId: 'ayse', score: 2, meta: expect.objectContaining({ tolerance: 50 }) }),
        expect.objectContaining({ playerId: 'ali', score: 1 }),
      ]),
    );
  });

  it('can end in the middle of voting without leaking the open round', async () => {
    const { h, item } = setup();
    await h.start();
    await h.act('ali', { type: 'vote', itemId: item(), vote: 'red' });
    h.end();
    expect(h.view('ayse')).toMatchObject({ phase: 'podium', summary: { rounds: 0 } });
    expect(h.seen('ayse')).not.toMatch(/"red"[,}\]]/);
    h.advance(DEFAULT_TIMING.podiumMs);
    expect(h.finished).toHaveLength(3);
  });
});
