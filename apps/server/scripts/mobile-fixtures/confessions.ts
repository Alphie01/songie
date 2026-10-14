import Database from 'better-sqlite3';
import { createHarness } from '@songie/game-kit/testing';
import { defaultSettings, type ConfessionsView } from '@songie/confessions/shared';
import { confessionsServer } from '@songie/confessions/server';
import { fixtureWriter } from './lib.js';

const out = fixtureWriter('confessions');
const game = () => confessionsServer({ db: new Database(':memory:') });
const TEXT: Record<string, string> = {
  ali: 'Kahvaltıda gizlice çikolata yerim',
  ayse: 'Hâlâ ışık açık uyuyorum',
  cem: 'Ehliyet sınavından üç kez kaldım',
  deniz: 'Bitkilerime isim koyup konuşurum',
};

type H = ReturnType<typeof createHarness<ConfessionsView>>;
/** Ekrandaki itirafın yazarı (yalnızca sunucu durumunda). */
const authorOf = (h: H) => {
  const st = h.state as { queue: { authorId: string }[]; index: number };
  return st.queue[st.index]!.authorId;
};
const cid = (h: H) => h.view('ali').current!.id;
/** `me`: görünümün sahibi; `players`: odadaki oyuncular (ilk oyuncu oda sahibi). */
const write = (h: H, name: string, me: string, players: string[], settings: Record<string, unknown>) =>
  out.write(name, h.view(me), { settings, me, players });

// 1) Konulu, süreli, açık yazar, 2 tur.
{
  const players = ['ali', 'ayse', 'cem', 'deniz'];
  const settings = { ...defaultSettings, categories: ['genel'], writeSeconds: 60, guessSeconds: 30, rounds: 2, hiddenAuthor: false };
  const h = createHarness<ConfessionsView>(game(), { players, settings });
  await h.start();
  write(h, 'write-host', 'ali', players, settings);
  await h.act('ali', { type: 'write', text: TEXT.ali });
  write(h, 'write-sent-host', 'ali', players, settings);
  write(h, 'write-guest', 'cem', players, settings);
  for (const p of ['ayse', 'cem', 'deniz']) await h.act(p, { type: 'write', text: TEXT[p] });
  // Tahmin: tepkiler, bir seçim.
  await h.act('ali', { type: 'react', confessionId: cid(h), reaction: 'efsane' });
  await h.act('cem', { type: 'react', confessionId: cid(h), reaction: 'bende' });
  write(h, 'guess-host', 'ali', players, settings);
  const author = authorOf(h);
  // Misafir görünümleri: oda sahibi de yazar da olmayan iki oyuncu.
  const [g1, g2] = players.filter((p) => p !== author && p !== 'ali') as [string, string];
  await h.act(g1, { type: 'guess', confessionId: cid(h), targetId: author });
  write(h, 'guess-picked-guest', g1, players, settings);
  write(h, 'guess-guest', g2, players, settings);
  // Açıklama: g1 bilir, g2 yanılır, yazar başkasını seçer, kalan da yazarı bilir.
  await h.act(g2, { type: 'guess', confessionId: cid(h), targetId: g1 });
  for (const p of players.filter((x) => x !== g1 && x !== g2)) {
    await h.act(p, { type: 'guess', confessionId: cid(h), targetId: p === author ? g2 : author });
  }
  write(h, 'reveal-host', 'ali', players, settings);
  write(h, 'reveal-hit-guest', g1, players, settings);
  write(h, 'reveal-miss-guest', g2, players, settings);
  write(h, 'reveal-author', author, players, settings);
  // Sıradaki itiraf: açıklamada oda sahibi gizler.
  await h.act('ali', { type: 'next' });
  await h.act('ali', { type: 'next' });
  await h.act('ali', { type: 'hide', confessionId: cid(h) });
  write(h, 'reveal-hidden-text-guest', 'cem', players, settings);
  // Kalanları geç → tur özeti.
  for (let i = 0; i < 10 && h.view('ali').phase !== 'summary'; i++) await h.act('ali', { type: 'next' });
  write(h, 'summary-host', 'ali', players, settings);
  write(h, 'summary-guest', 'cem', players, settings);
  // 2. tur: son tur özeti, sonra podyum.
  await h.act('ali', { type: 'next' });
  for (const p of players) await h.act(p, { type: 'write', text: `${TEXT[p]} ve bunu kimse bilmiyor` });
  for (let i = 0; i < 12 && h.view('ali').phase !== 'summary'; i++) await h.act('ali', { type: 'next' });
  write(h, 'summary-last-guest', 'cem', players, settings);
  await h.act('ali', { type: 'next' });
  write(h, 'podium-host', 'ali', players, settings);
  write(h, 'podium-guest', 'cem', players, settings);
}

// 2) Serbest itiraf, süresiz yazma, gizli yazar, sınırsız tur.
{
  const players = ['ali', 'ayse', 'cem'];
  const settings = { ...defaultSettings, mode: 'free', writeSeconds: 0, guessSeconds: 45, rounds: 0, hiddenAuthor: true };
  const h = createHarness<ConfessionsView>(game(), { players, settings });
  await h.start();
  await h.act('ali', { type: 'write', text: TEXT.ali });
  write(h, 'write-free-guest', 'cem', players, settings);
  for (const p of ['ayse', 'cem']) await h.act(p, { type: 'write', text: TEXT[p] });
  for (const p of players) await h.act(p, { type: 'guess', confessionId: cid(h), targetId: 'ayse' });
  write(h, 'reveal-anon-guest', 'cem', players, settings);
  h.end();
  write(h, 'podium-anon-guest', 'cem', players, settings);
}

out.done();
