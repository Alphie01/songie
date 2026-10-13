import path from 'node:path';
import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { createHarness } from '@songie/game-kit/testing';
import { ADULT_CATEGORIES, defaultSettings, type TabooView } from '../shared/index.js';
import { Deck } from './deck.js';
import { tabooServer } from './index.js';

const game = () => tabooServer({ db: new Database(':memory:'), deckDir: path.join(import.meta.dirname, 'test-deck') });

describe('taboo (harness)', () => {
  it('hides the card from the narrator’s teammates and ends the turn on time', async () => {
    const h = createHarness<TabooView>(game(), {
      players: ['a1', 'a2', 'b1', 'b2'],
      settings: { teams: { a: ['a1', 'a2'], b: ['b1', 'b2'] }, seconds: 60, categories: ['genel'] },
    });
    await h.start();
    expect(await h.act('a1', { type: 'start' })).toMatchObject({ ok: true });
    const word = h.view('a1').card!.word;
    expect(h.view('b1').card?.word).toBe(word);
    expect(h.seen('a2')).not.toContain(word);
    h.advance(60_000);
    expect(h.view('a1')).toMatchObject({ phase: 'ready', team: 'b', narratorId: 'b1' });
  });
});

describe('taboo: +18 deste', () => {
  it('varsayılan kapalı, en az 60 kart, her kartta 5 yasaklı kelime', () => {
    const deck = new Deck(new Database(':memory:'));
    for (const id of ADULT_CATEGORIES) {
      expect(defaultSettings.categories).not.toContain(id);
      const info = deck.categories().find((c) => c.id === id)!;
      expect(info.name).toMatch(/\(\+18\)$/);
      const cards = deck.cards([id]);
      expect(cards.length).toBeGreaterThanOrEqual(60);
      for (const c of cards) expect(c.taboo).toHaveLength(5);
    }
  });
});
