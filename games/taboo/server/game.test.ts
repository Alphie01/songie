import path from 'node:path';
import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { createHarness } from '@songie/game-kit/testing';
import type { TabooView } from '../shared/index.js';
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
