/**
 * Kimim Ben? görünümleri. Sıra ve kart dağıtımı belirleyici olsun diye başlarken `Math.random` sabitlenir
 * (karıştırma hiçbir şeyin yerini değiştirmez): sıra ali, ayse, cem, deniz; ali oda sahibi.
 * Her dosyada `me`: görünümün sahibi.
 */
import path from 'node:path';
import Database from 'better-sqlite3';
import { createHarness, type Harness } from '@songie/game-kit/testing';
import { defaultSettings, type WhoAmIView } from '@songie/who-am-i/shared';
import { whoAmIServer } from '@songie/who-am-i/server';
import { fixtureWriter } from './lib.js';

const out = fixtureWriter('who-am-i');
const repo = path.resolve(import.meta.dirname, '../../../..');
const contentDir = path.join(repo, 'games/who-am-i/server/test-content');

interface State {
  askerId: string | null;
  players: Record<string, { card: { name: string } }>;
}

function setup(players: string[], patch: Record<string, unknown>) {
  const game = whoAmIServer({ db: new Database(':memory:'), contentDir, timing: { podiumMs: 5000 } });
  const settings: Record<string, unknown> = { ...defaultSettings, categories: ['test'], ...patch };
  const h = createHarness<WhoAmIView>(game, { players, settings });
  return { h, settings, st: () => h.state as State };
}

async function start(h: Harness<WhoAmIView>) {
  const random = Math.random;
  Math.random = () => 0.999;
  try {
    await h.start();
  } finally {
    Math.random = random;
  }
}

// ---- 1) Klasik kural, yazılı soru, 3 ipucu; sonra grup onayı
{
  const { h, st, settings: base } = setup(['ali', 'ayse', 'cem', 'deniz'], { hints: 3, typedQuestions: true, turnMode: 'classic', groupVerify: false });
  let settings = base;
  const write = (name: string, me: string) => out.write(name, h.view(me), { settings, me });
  const qid = () => h.view('ali').question!.id;
  const gid = () => h.view('ali').guess!.id;
  await start(h);

  // Sıra ali'de (oda sahibi); geçmiş boş.
  write('myturn-host', 'ali');
  write('waiting-guest', 'cem');

  await h.act('ali', { type: 'ask', text: 'İnsan mıyım?' });
  write('question-asker-host', 'ali');
  await h.act('ayse', { type: 'answer', questionId: qid(), answer: 'yes' });
  write('question-asker-answered-host', 'ali');
  write('question-answer-guest', 'cem');
  write('question-answered-guest', 'ayse');
  await h.act('cem', { type: 'answer', questionId: qid(), answer: 'yes' });
  await h.act('deniz', { type: 'answer', questionId: qid(), answer: 'maybe' });
  // Çoğunluk "Evet": ali sormaya devam eder ve bir ipucu alır.
  await h.act('ali', { type: 'hint' });
  write('myturn-last-host', 'ali');

  // Sesli soru; herkes "Hayır" der, sıra ayse'ye geçer.
  await h.act('ali', { type: 'ask' });
  write('question-voice-guest', 'ayse');
  for (const id of ['ayse', 'cem', 'deniz']) await h.act(id, { type: 'answer', questionId: qid(), answer: 'no' });
  write('waiting-host', 'ali');
  write('myturn-guest', 'ayse');

  // ayse yazılı sorar; oda sahibi cevaplar ve gelen cevaplarla bitirir (eşitlik → "Belki", sıra ayse'de).
  await h.act('ayse', { type: 'ask', text: 'Erkek miyim?' });
  await h.act('ali', { type: 'answer', questionId: qid(), answer: 'no' });
  await h.act('cem', { type: 'answer', questionId: qid(), answer: 'irrelevant' });
  write('question-host', 'ali');
  await h.act('ali', { type: 'close', questionId: qid() });
  write('waiting-last-host', 'ali');

  // ayse yanlış tahmin eder (sıra cem'e), cem doğru bilir (sıra deniz'e).
  await h.act('ayse', { type: 'guess', text: 'Kedi' });
  await h.act('cem', { type: 'guess', text: st().players['cem']!.card.name });
  write('done-guest', 'cem');

  // Grup onayı: deniz tahmin eder, diğerleri oylar.
  h.changeSettings({ groupVerify: true });
  settings = { ...settings, groupVerify: true };
  await h.act('deniz', { type: 'guess', text: 'Bir şey' });
  write('guess-mine-guest', 'deniz');
  await h.act('ayse', { type: 'verify', guessId: gid(), correct: false });
  write('guess-vote-host', 'ali');
  write('guess-vote-guest', 'cem');
  await h.act('ali', { type: 'verify', guessId: gid(), correct: true });
  await h.act('cem', { type: 'verify', guessId: gid(), correct: true });
  write('history-host', 'ali');

  h.end();
  write('podium-host', 'ali');
  write('podium-guest', 'cem');
}

// ---- 2) Her turda 3 soru, ipucu yok, yazılı soru kapalı; ayrılan oyuncu; kimse bilemeden biter
{
  const { h, settings } = setup(['ali', 'ayse', 'cem'], { hints: 0, typedQuestions: false, turnMode: 'three' });
  const write = (name: string, me: string) => out.write(name, h.view(me), { settings, me });
  await start(h);
  await h.act('ali', { type: 'ask' });
  const qid = h.view('ali').question!.id;
  for (const id of ['ayse', 'cem']) await h.act(id, { type: 'answer', questionId: qid, answer: 'no' });
  write('myturn-three-host', 'ali');
  write('waiting-three-guest', 'ayse');
  h.leave('cem');
  write('left-guest', 'ayse');
  h.end();
  write('podium-none', 'ayse');
}

out.done();
