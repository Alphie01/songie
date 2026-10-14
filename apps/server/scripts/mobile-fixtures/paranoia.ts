import Database from 'better-sqlite3';
import { createHarness } from '@songie/game-kit/testing';
import { defaultSettings, type ParanoiaSettings, type ParanoiaView } from '@songie/paranoia/shared';
import { paranoiaServer } from '@songie/paranoia/server';
import { fixtureWriter } from './lib.js';

const out = fixtureWriter('paranoia');
const players = ['ali', 'ayse', 'cem', 'deniz'];
const game = paranoiaServer({ db: new Database(':memory:') });
let settings: ParanoiaSettings = {
  ...defaultSettings,
  questionCount: 3,
  thinkSeconds: 40,
  firstHolder: 'host',
  hideHolder: false,
  categories: ['genel'],
};
const h = createHarness<ParanoiaView>(game, { players, settings });

/** Fikstür: görünüm + odanın güncel ayarları + bakan oyuncu + oyuncular (ilki oda sahibi) + bağlantısı kopuklar. */
function write(name: string, me: string) {
  const offline = h.ctx.players().filter((p) => !p.connected).map((p) => p.id);
  out.write(name, h.view(me), { settings, me, players, offline });
}

/** Oda sahibi oyun sırasında ayar değiştirir. */
function set(patch: Partial<ParanoiaSettings>) {
  settings = { ...settings, ...patch };
  h.changeSettings(patch);
}

const seq = (id: string) => h.view(id).seq;

await h.start();
write('pickfirst-host', 'ali'); // ilk soruyu kimin alacağını oda sahibi seçer
write('pickfirst-guest', 'cem');

await h.act('ali', { type: 'pickFirst', targetId: 'ayse' });
write('asking-envelope', 'ayse'); // kapalı zarf (ilk soru, gönderen yok)
write('asking-wait-host', 'ali'); // "ayse düşünüyor…"

await h.act('ayse', { type: 'choose', seq: seq('ayse'), targetId: 'cem' });
write('asking-from', 'cem'); // ayse gönderdi; geri seçim yok
write('asking-wait-mine', 'ayse'); // gizli cevapların + "Bir soru cevaplandı"
set({ hideHolder: true });
write('asking-wait-hidden', 'deniz'); // kime sorulduğu gizli
h.setConnected('cem', false);
write('asking-stuck-host', 'ali'); // sırası gelenin bağlantısı koptu
h.setConnected('cem', true);

await h.act('cem', { type: 'choose', seq: seq('cem'), targetId: 'deniz' });
set({ onTimeout: 'pass' });
h.advance(40_000); // deniz süre bitince pas → 3 soru tamam → açıklama
write('reveal-host', 'ali');
write('reveal-guest', 'cem');
set({ revealBy: 'vote' });
write('reveal-vote', 'deniz');
await h.act('cem', { type: 'next', shown: 1 });
write('reveal-voted', 'cem');
await h.act('ali', { type: 'next', shown: 1 });
write('reveal-history', 'ayse');
await h.act('ali', { type: 'next', shown: 2 });
write('reveal-last-host', 'ali'); // pas geçilen son soru, "Özeti göster"

await h.act('ali', { type: 'next', shown: 3 });
write('summary-host', 'ali');
write('summary-guest', 'ayse');

out.done();
