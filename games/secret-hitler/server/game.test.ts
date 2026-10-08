import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { createHarness, type Harness } from '@songie/game-kit/testing';
import { ROLE_COUNTS, type Policy, type Role, type SecretHitlerView } from '../shared/index.js';
import { assignRoles } from './game.js';
import { secretHitlerServer, type SecretHitlerState } from './index.js';

const PODIUM = 10_000;
const game = () => secretHitlerServer({ db: new Database(':memory:'), timing: { podiumMs: PODIUM } });
const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`);

type H = Harness<SecretHitlerView>;

/**
 * n kişilik oyun. Roller verilirse sırayla p0, p1… oyuncularına atanır; varsayılan:
 * p0 Hitler, sonra faşistler, kalanlar liberal. İlk başkan p1; sıra p1, p2, …
 * Not: başlangıçta rastgele rollerle bir görünüm gönderilmiş olur; sızıntı testleri bunu hesaba katar.
 */
async function setup(n: number, opts: { roles?: Role[]; deck?: Policy[]; skipAfter?: number } = {}) {
  const h: H = createHarness<SecretHitlerView>(game(), {
    players: ids(n),
    settings: opts.skipAfter ? { skipAfter: opts.skipAfter } : {},
  });
  await h.start();
  const s = h.state as SecretHitlerState;
  const counts = ROLE_COUNTS[n]!;
  const roles: Role[] = opts.roles ?? ['hitler', ...Array<Role>(counts.fascist).fill('fascist'), ...Array<Role>(counts.liberal).fill('liberal')];
  s.roles = Object.fromEntries(ids(n).map((id, i) => [id, roles[i]!]));
  s.seats = ids(n);
  s.president = 'p1';
  s.anchor = 'p1';
  if (opts.deck) s.deck = [...opts.deck];
  h.ctx.pushViews();
  return { h, s };
}

async function ok(h: H, id: string, action: unknown) {
  const res = await h.act(id, action);
  expect(res, JSON.stringify(action)).toMatchObject({ ok: true });
  expect(res).not.toHaveProperty('stale');
  return res;
}

async function voteAll(h: H, s: SecretHitlerState, vote: 'ja' | 'nein' | ((id: string) => 'ja' | 'nein')) {
  const round = s.voteRound;
  for (const id of s.seats.filter((x) => !s.dead.includes(x))) {
    await ok(h, id, { type: 'vote', round, vote: typeof vote === 'function' ? vote(id) : vote });
  }
}

/** Başkan `chancellor`'ı aday gösterir ve herkes Ja der. */
async function elect(h: H, s: SecretHitlerState, chancellor: string) {
  await ok(h, s.president, { type: 'nominate', target: chancellor });
  await voteAll(h, s, 'ja');
}

/** Bir hükümet `policy` yasasını çıkarır (destenin üstüne 3 adet konur). */
async function govern(h: H, s: SecretHitlerState, policy: Policy, chancellor?: string) {
  const target = chancellor ?? h.view(s.president).eligible.find((id) => s.roles[id] !== 'hitler')!;
  s.deck.unshift(policy, policy, policy);
  await elect(h, s, target);
  expect(s.phase).toBe('presidentLegislate');
  await ok(h, s.president, { type: 'discard', session: s.session, index: 0 });
  await ok(h, target, { type: 'enact', session: s.session, index: 0 });
}

/** Hamle yapmadan yasa sayılarını ayarlar. */
function setTracks(s: SecretHitlerState, liberal: number, fascist: number) {
  s.liberal = liberal;
  s.fascist = fascist;
}

const parsedViews = (h: H, id: string) => JSON.parse(h.seen(id)) as SecretHitlerView[];

describe('rol dağılımı', () => {
  it.each([5, 6, 7, 8, 9, 10])('%i oyuncuda doğru sayıda liberal, faşist ve tek Hitler', async (n) => {
    for (let k = 0; k < 20; k++) {
      const roles = Object.values(assignRoles(ids(n)));
      expect(roles.filter((r) => r === 'liberal')).toHaveLength(ROLE_COUNTS[n]!.liberal);
      expect(roles.filter((r) => r === 'fascist')).toHaveLength(ROLE_COUNTS[n]!.fascist);
      expect(roles.filter((r) => r === 'hitler')).toHaveLength(1);
    }
    const h = createHarness<SecretHitlerView>(game(), { players: ids(n) });
    await h.start();
    const s = h.state as SecretHitlerState;
    expect(Object.keys(s.roles)).toHaveLength(n);
    expect(s.deck).toHaveLength(17);
    expect(s.deck.filter((p) => p === 'liberal')).toHaveLength(6);
  });

  it('5’ten az ya da 10’dan fazla kişiyle başlamaz', async () => {
    await expect(createHarness(game(), { players: ids(4) }).start()).rejects.toThrow(/5–10/);
    await expect(createHarness(game(), { players: ids(11) }).start()).rejects.toThrow(/5–10/);
  });

  it('bağlı olmayanlar oyuna alınmaz', async () => {
    const h = createHarness<SecretHitlerView>(game(), { players: ids(6) });
    h.setConnected('p5', false);
    await h.start();
    expect(h.view('p0').playerCount).toBe(5);
    expect(h.view('p5').me).toBeNull();
  });
});

describe('bilgi görünürlüğü', () => {
  it.each([5, 6, 7, 8, 9, 10])('%i oyuncu: kim kimi bilir', async (n) => {
    const h = createHarness<SecretHitlerView>(game(), { players: ids(n) });
    await h.start();
    const s = h.state as SecretHitlerState;
    const hitler = ids(n).find((id) => s.roles[id] === 'hitler')!;
    const fascists = ids(n).filter((id) => s.roles[id] === 'fascist');
    for (const id of ids(n)) {
      const me = h.view(id).me!;
      expect(me.role).toBe(s.roles[id]);
      if (s.roles[id] === 'liberal') {
        expect(me.known).toEqual([]);
        // Liberale giden hiçbir veride Hitler'in kim olduğu geçmez.
        expect(h.seen(id)).not.toContain('hitler');
        expect(h.seen(id)).not.toContain('"role":"fascist"');
        for (const v of parsedViews(h, id)) expect(v.roles).toBeNull();
      } else if (s.roles[id] === 'fascist') {
        expect(me.known.map((k) => k.id).sort()).toEqual([hitler, ...fascists.filter((f) => f !== id)].sort());
      } else {
        if (n <= 6) expect(me.known).toEqual(fascists.map((f) => ({ id: f, role: 'fascist' })));
        else {
          expect(me.known).toEqual([]);
          expect(h.seen(id)).not.toContain('"role":"fascist"');
        }
      }
    }
  });

  it('çekilen kartlar yalnızca başkan ve şansölyeye, oylar herkes oy verene kadar gizli', async () => {
    const { h, s } = await setup(7, { deck: ['fascist', 'liberal', 'fascist', ...Array<Policy>(14).fill('liberal')] });
    await ok(h, 'p1', { type: 'nominate', target: 'p3' });
    await ok(h, 'p4', { type: 'vote', round: s.voteRound, vote: 'nein' });
    expect(h.view('p4').myVote).toBe('nein');
    expect(h.view('p5').myVote).toBeNull();
    expect(h.view('p5').seats.find((x) => x.id === 'p4')!.voted).toBe(true);
    expect(h.seen('p5')).not.toContain('nein');
    expect(h.view('p5').lastVote).toBeNull();
    await voteAll(h, s, (id) => (id === 'p4' ? 'nein' : 'ja'));
    expect(h.view('p5').lastVote).toMatchObject({ passed: true, votes: { p4: 'nein', p5: 'ja' } });

    expect(h.view('p1').hand).toEqual(['fascist', 'liberal', 'fascist']);
    expect(h.view('p3').hand).toBeNull();
    await ok(h, 'p1', { type: 'discard', session: s.session, index: 1 });
    expect(h.view('p3').hand).toEqual(['fascist', 'fascist']);
    expect(h.view('p1').hand).toBeNull();
    for (const id of ids(7).filter((x) => x !== 'p1' && x !== 'p3')) {
      for (const v of parsedViews(h, id)) {
        expect(v.hand).toBeNull();
        expect(v.peek).toBeNull();
      }
    }
    expect(s.discard).toEqual(['liberal']);
  });

  it('sonradan katılan izleyici rol ve kart görmez', async () => {
    const { h } = await setup(5);
    h.join('izleyici');
    h.ctx.pushViews();
    expect(h.view('izleyici').me).toBeNull();
    expect(h.seen('izleyici')).not.toContain('hitler');
    expect(await h.act('izleyici', { type: 'vote', round: 0, vote: 'ja' })).toMatchObject({ ok: true, stale: true });
  });
});

describe('seçim', () => {
  it('yalnızca başkan uygun bir adayı gösterebilir', async () => {
    const { h } = await setup(7);
    expect(await h.act('p2', { type: 'nominate', target: 'p3' })).toMatchObject({ ok: false });
    expect(await h.act('p1', { type: 'nominate', target: 'p1' })).toMatchObject({ ok: false });
    expect(await h.act('p1', { type: 'nominate', target: 'yok' })).toMatchObject({ ok: false });
  });

  it('dönem sınırları: son başkan ve şansölye aday olamaz; 5 kişi kalınca yalnızca şansölye', async () => {
    const { h, s } = await setup(7);
    await govern(h, s, 'liberal', 'p3');
    expect(s.president).toBe('p2');
    const el = h.view('p2').eligible;
    expect(el).not.toContain('p1');
    expect(el).not.toContain('p3');
    expect(el).not.toContain('p2');
    expect(await h.act('p2', { type: 'nominate', target: 'p1' })).toMatchObject({ ok: false });

    const five = await setup(5);
    await govern(five.h, five.s, 'liberal', 'p3');
    const el5 = five.h.view('p2').eligible;
    expect(el5).toContain('p1');
    expect(el5).not.toContain('p3');
  });

  it('idamla 5 kişi kalınca son başkan yeniden aday olabilir', async () => {
    const { h, s } = await setup(6);
    s.dead.push('p5');
    await govern(h, s, 'liberal', 'p3');
    expect(h.view('p2').eligible).toContain('p1');
  });

  it('beraberlik geçmez; başarısız seçim sayacı ilerletir, başkanlık döner', async () => {
    const { h, s } = await setup(6);
    await ok(h, 'p1', { type: 'nominate', target: 'p2' });
    await voteAll(h, s, (id) => (['p0', 'p1', 'p2'].includes(id) ? 'ja' : 'nein'));
    expect(s.electionTracker).toBe(1);
    expect(s.president).toBe('p2');
    expect(s.phase).toBe('nominate');
    expect(h.view('p0').lastVote?.passed).toBe(false);
  });

  it('3 başarısız seçimde destenin üstü çıkar, yetki kullanılmaz, dönem sınırları sıfırlanır', async () => {
    const { h, s } = await setup(5);
    await govern(h, s, 'liberal', 'p3');
    setTracks(s, 1, 2);
    expect(s.lastElected).toEqual({ president: 'p1', chancellor: 'p3' });
    s.deck.unshift('fascist');
    for (let i = 0; i < 3; i++) {
      const pres = s.president;
      await ok(h, pres, { type: 'nominate', target: h.view(pres).eligible[0]! });
      await voteAll(h, s, 'nein');
    }
    expect(s.fascist).toBe(3);
    expect(s.electionTracker).toBe(0);
    expect(s.lastElected).toBeNull();
    // 5 kişide 3. faşist yasa önizleme verir; kaos yasasında verilmez.
    expect(s.phase).toBe('nominate');
    expect(s.power).toBeNull();
    expect(s.log.some((l) => l.k === 'enact' && l.chaos)).toBe(true);
    expect(h.view(s.president).eligible).toContain('p3');
  });

  it('yasa çıkınca seçim sayacı sıfırlanır', async () => {
    const { h, s } = await setup(5);
    await ok(h, 'p1', { type: 'nominate', target: 'p2' });
    await voteAll(h, s, 'nein');
    expect(s.electionTracker).toBe(1);
    await govern(h, s, 'liberal', 'p3');
    expect(s.electionTracker).toBe(0);
  });

  it('3+ faşist yasadan sonra Hitler şansölye seçilirse faşistler kazanır', async () => {
    const { h, s } = await setup(5);
    setTracks(s, 0, 3);
    await elect(h, s, 'p0');
    expect(s.phase).toBe('over');
    expect(h.view('p2')).toMatchObject({ winner: 'fascist', winReason: 'hitlerChancellor' });
    expect(h.view('p2').roles).toMatchObject({ p0: 'hitler' });
    h.advance(PODIUM);
    expect(h.finished!.find((r) => r.playerId === 'p0')!.score).toBe(1);
    expect(h.finished!.find((r) => r.playerId === 'p2')!.score).toBe(0);
  });

  it('2 faşist yasadayken Hitler şansölye olabilir, oyun sürer', async () => {
    const { h, s } = await setup(5);
    setTracks(s, 0, 2);
    await elect(h, s, 'p0');
    expect(s.phase).toBe('presidentLegislate');
  });

  it('3+ faşist yasadan sonra seçilen Hitler olmayan şansölye günlüğe yazılır', async () => {
    const { h, s } = await setup(5);
    setTracks(s, 0, 3);
    await elect(h, s, 'p3');
    expect(s.log.at(-1)).toEqual({ k: 'notHitler', chancellor: 'p3' });
  });
});

describe('yasama ve veto', () => {
  it('başkan atar, şansölye çıkarır; başkalarının ve eski oturumun hamlesi geçmez', async () => {
    const { h, s } = await setup(5, { deck: ['liberal', 'fascist', 'liberal', ...Array<Policy>(14).fill('fascist')] });
    await elect(h, s, 'p3');
    const session = s.session;
    expect(await h.act('p3', { type: 'discard', session, index: 0 })).toMatchObject({ ok: false });
    await ok(h, 'p1', { type: 'discard', session, index: 1 });
    expect(await h.act('p1', { type: 'discard', session, index: 0 })).toMatchObject({ ok: true, stale: true });
    expect(await h.act('p1', { type: 'enact', session: s.session, index: 0 })).toMatchObject({ ok: false });
    expect(await h.act('p3', { type: 'veto', session: s.session })).toMatchObject({ ok: false });
    await ok(h, 'p3', { type: 'enact', session: s.session, index: 1 });
    expect(s.liberal).toBe(1);
    expect(s.discard).toEqual(['fascist', 'liberal']);
    expect(s.deck.length + s.discard.length + s.liberal + s.fascist).toBe(17);
  });

  it('veto kabul: iki kart atılır, sayaç ilerler, sıradaki başkana geçilir', async () => {
    const { h, s } = await setup(7);
    setTracks(s, 0, 5);
    s.deck.unshift('fascist', 'fascist', 'fascist');
    await elect(h, s, 'p4');
    await ok(h, 'p1', { type: 'discard', session: s.session, index: 0 });
    expect(h.view('p4').vetoUnlocked).toBe(true);
    await ok(h, 'p4', { type: 'veto', session: s.session });
    expect(h.view('p2').vetoRequested).toBe(true);
    expect(await h.act('p4', { type: 'enact', session: s.session, index: 0 })).toMatchObject({ ok: false });
    expect(await h.act('p4', { type: 'vetoAnswer', session: s.session, accept: true })).toMatchObject({ ok: false });
    await ok(h, 'p1', { type: 'vetoAnswer', session: s.session, accept: true });
    expect(s.discard).toHaveLength(3);
    expect(s.fascist).toBe(5);
    expect(s.electionTracker).toBe(1);
    expect(s.president).toBe('p2');
  });

  it('veto reddi: şansölye yasa seçmek zorunda, ikinci kez veto yok', async () => {
    const { h, s } = await setup(7);
    setTracks(s, 0, 5);
    s.deck.unshift('liberal', 'fascist', 'fascist');
    await elect(h, s, 'p4');
    await ok(h, 'p1', { type: 'discard', session: s.session, index: 1 });
    await ok(h, 'p4', { type: 'veto', session: s.session });
    await ok(h, 'p1', { type: 'vetoAnswer', session: s.session, accept: false });
    expect(h.view('p4')).toMatchObject({ vetoDenied: true, vetoRequested: false, hand: ['liberal', 'fascist'] });
    expect(await h.act('p4', { type: 'veto', session: s.session })).toMatchObject({ ok: false });
    await ok(h, 'p4', { type: 'enact', session: s.session, index: 0 });
    expect(s.liberal).toBe(1);
  });

  it('veto üçüncü başarısızlığı doldurursa kaos yasası çıkar', async () => {
    const { h, s } = await setup(7);
    setTracks(s, 0, 5);
    s.electionTracker = 2;
    s.deck.unshift('fascist', 'fascist', 'fascist', 'liberal');
    await elect(h, s, 'p4');
    await ok(h, 'p1', { type: 'discard', session: s.session, index: 0 });
    await ok(h, 'p4', { type: 'veto', session: s.session });
    await ok(h, 'p1', { type: 'vetoAnswer', session: s.session, accept: true });
    expect(s.liberal).toBe(1);
    expect(s.electionTracker).toBe(0);
  });

  it('destede 3’ten az kart kalınca ıskarta karıştırılıp eklenir', async () => {
    const { h, s } = await setup(5);
    s.deck = ['liberal', 'liberal', 'fascist', 'fascist'];
    s.discard = Array<Policy>(13).fill('fascist');
    await elect(h, s, 'p3');
    await ok(h, 'p1', { type: 'discard', session: s.session, index: 2 });
    await ok(h, 'p3', { type: 'enact', session: s.session, index: 0 });
    // 1 kart kalmıştı + 15 ıskarta = 16
    expect(s.deck).toHaveLength(16);
    expect(s.discard).toHaveLength(0);
    expect(s.log.some((l) => l.k === 'reshuffle')).toBe(true);
    expect(h.view('p0').deckCount).toBe(16);
  });
});

describe('yürütme yetkileri', () => {
  it('5–6 kişi: 3. faşist yasada başkan destenin üst 3 kartını görür', async () => {
    const { h, s } = await setup(6);
    setTracks(s, 0, 2);
    await govern(h, s, 'fascist', 'p3');
    expect(s.phase).toBe('power');
    s.deck.splice(0, 3, 'liberal', 'fascist', 'liberal');
    h.ctx.pushViews();
    expect(h.view('p1')).toMatchObject({ power: 'peek', peek: ['liberal', 'fascist', 'liberal'] });
    for (const id of ['p0', 'p2', 'p3', 'p4', 'p5']) for (const v of parsedViews(h, id)) expect(v.peek).toBeNull();
    expect(await h.act('p1', { type: 'power', session: s.session, target: 'p2' })).toMatchObject({ ok: false });
    await ok(h, 'p1', { type: 'peekDone', session: s.session });
    expect(s.deck.slice(0, 3)).toEqual(['liberal', 'fascist', 'liberal']);
    expect(s.president).toBe('p2');
  });

  it('5–6 kişi: 4. ve 5. faşist yasa idam', async () => {
    const { h, s } = await setup(5);
    setTracks(s, 0, 3);
    await govern(h, s, 'fascist', 'p3');
    expect(h.view('p1').power).toBe('execution');
    await ok(h, 'p1', { type: 'power', session: s.session, target: 'p4' });
    await govern(h, s, 'fascist', 'p1');
    expect(s.fascist).toBe(5);
    expect(h.view(s.president).power).toBe('execution');
  });

  it('7–8 kişi: sadakat sorgulama sonucu yalnızca başkanda, Hitler faşist görünür, ikinci kez sorgulanamaz', async () => {
    const { h, s } = await setup(7);
    setTracks(s, 0, 1);
    await govern(h, s, 'fascist', 'p3');
    expect(h.view('p1').power).toBe('investigate');
    expect(await h.act('p1', { type: 'power', session: s.session, target: 'p1' })).toMatchObject({ ok: false });
    await ok(h, 'p1', { type: 'power', session: s.session, target: 'p0' });
    expect(h.view('p1').me!.investigations).toEqual([{ target: 'p0', party: 'fascist' }]);
    for (const id of ids(7).filter((x) => x !== 'p1')) {
      expect(h.view(id).me!.investigations).toEqual([]);
      expect(h.view(id).seats.find((x) => x.id === 'p0')!.investigated).toBe(true);
    }
    // p0 ve p3 gibi liberallere sorgu sonucu hiç gitmez
    expect(h.seen('p5')).not.toContain('"party"');
    expect(s.president).toBe('p2');

    // ikinci sorgulama (9–10 kişide olduğu gibi) aynı kişiyi seçemez
    s.phase = 'power';
    s.power = 'investigate';
    h.ctx.pushViews();
    expect(await h.act('p2', { type: 'power', session: s.session, target: 'p0' })).toMatchObject({ ok: false });
    await ok(h, 'p2', { type: 'power', session: s.session, target: 'p5' });
    expect(h.view('p2').me!.investigations).toEqual([{ target: 'p5', party: 'liberal' }]);
  });

  it('7–8 kişi: özel seçim; sonra sıra özel seçimi yapanın solundan devam eder', async () => {
    const { h, s } = await setup(8);
    setTracks(s, 0, 2);
    await govern(h, s, 'fascist', 'p4');
    expect(h.view('p1').power).toBe('specialElection');
    await ok(h, 'p1', { type: 'power', session: s.session, target: 'p6' });
    expect(s.president).toBe('p6');
    expect(s.phase).toBe('nominate');
    await govern(h, s, 'liberal', 'p3');
    expect(s.president).toBe('p2');
  });

  it('özel seçimle sıradaki kişi seçilirse iki kez üst üste başkan olur', async () => {
    const { h, s } = await setup(7);
    setTracks(s, 0, 2);
    await govern(h, s, 'fascist', 'p4');
    await ok(h, 'p1', { type: 'power', session: s.session, target: 'p2' });
    await govern(h, s, 'liberal', 'p5');
    expect(s.president).toBe('p2');
  });

  it('9–10 kişi: 1. ve 2. faşist yasada sorgulama, 3.’de özel seçim', async () => {
    const { h, s } = await setup(9);
    await govern(h, s, 'fascist', 'p5');
    expect(h.view('p1').power).toBe('investigate');
    await ok(h, 'p1', { type: 'power', session: s.session, target: 'p5' });
    await govern(h, s, 'fascist', 'p6');
    expect(h.view('p2').power).toBe('investigate');
    await ok(h, 'p2', { type: 'power', session: s.session, target: 'p6' });
    await govern(h, s, 'fascist', 'p7');
    expect(h.view('p3').power).toBe('specialElection');
  });

  it('idam edilen oy veremez, aday olamaz, başkanlıkta atlanır; Hitler olduğu açıklanmaz', async () => {
    const { h, s } = await setup(7);
    const from = parsedViews(h, 'p5').length;
    setTracks(s, 0, 3);
    await govern(h, s, 'fascist', 'p4');
    expect(await h.act('p1', { type: 'power', session: s.session, target: 'p1' })).toMatchObject({ ok: false });
    await ok(h, 'p1', { type: 'power', session: s.session, target: 'p2' });
    expect(h.view('p0').seats.find((x) => x.id === 'p2')!.alive).toBe(false);
    // setup'tan önceki rastgele rollerle giden ilk görünümler hariç
    expect(JSON.stringify(parsedViews(h, 'p5').slice(from))).not.toContain('hitler');
    // p2 atlandı
    expect(s.president).toBe('p3');
    expect(h.view('p3').eligible).not.toContain('p2');
    expect(await h.act('p3', { type: 'nominate', target: 'p2' })).toMatchObject({ ok: false });
    await ok(h, 'p3', { type: 'nominate', target: 'p5' });
    expect(await h.act('p2', { type: 'vote', round: s.voteRound, vote: 'ja' })).toMatchObject({ ok: false });
    // 6 canlı oyuncu oy verince sonuç açılır
    await voteAll(h, s, 'ja');
    expect(s.phase).toBe('presidentLegislate');
    expect(s.lastVote!.votes).not.toHaveProperty('p2');
  });

  it('Hitler idam edilirse liberaller kazanır', async () => {
    const { h, s } = await setup(7);
    setTracks(s, 0, 3);
    await govern(h, s, 'fascist', 'p4');
    await ok(h, 'p1', { type: 'power', session: s.session, target: 'p0' });
    expect(h.view('p5')).toMatchObject({ phase: 'over', winner: 'liberal', winReason: 'hitlerExecuted' });
  });
});

describe('kazanma', () => {
  it('5 liberal yasa liberallere kazandırır; sonuçlar ve roller açılır', async () => {
    const { h, s } = await setup(5);
    setTracks(s, 4, 0);
    await govern(h, s, 'liberal', 'p3');
    const v = h.view('p4');
    expect(v).toMatchObject({ phase: 'over', winner: 'liberal', winReason: 'liberalPolicies' });
    expect(Object.keys(v.roles!)).toHaveLength(5);
    expect(h.finished).toBeNull();
    h.advance(PODIUM);
    expect(h.finished).toHaveLength(5);
    for (const r of h.finished!) expect(r.score).toBe(s.roles[r.playerId] === 'liberal' ? 1 : 0);
  });

  it('6 faşist yasa faşistlere kazandırır (yetkiden önce)', async () => {
    const { h, s } = await setup(5);
    setTracks(s, 0, 5);
    await govern(h, s, 'fascist', 'p3');
    expect(h.view('p4')).toMatchObject({ phase: 'over', winner: 'fascist', winReason: 'fascistPolicies', power: null });
  });

  it('kaos yasası da oyunu bitirebilir', async () => {
    const { h, s } = await setup(5);
    setTracks(s, 4, 0);
    s.electionTracker = 2;
    s.deck.unshift('liberal');
    await ok(h, 'p1', { type: 'nominate', target: 'p2' });
    await voteAll(h, s, 'nein');
    expect(h.view('p0').winner).toBe('liberal');
  });

  it('oda sahibi bitince hemen lobiye döndürebilir; başkası döndüremez', async () => {
    const { h, s } = await setup(5);
    setTracks(s, 4, 0);
    await govern(h, s, 'liberal', 'p3');
    expect(await h.act('p1', { type: 'finish' })).toMatchObject({ ok: false });
    await ok(h, 'p0', { type: 'finish' });
    expect(h.finished).toHaveLength(5);
  });

  it('oda sahibi oyunu yarıda bitirirse roller açılır, kimse kazanmaz', async () => {
    const { h } = await setup(6);
    h.end();
    expect(h.view('p2')).toMatchObject({ phase: 'over', winner: null, winReason: 'ended' });
    expect(h.view('p2').roles).not.toBeNull();
    h.end();
    expect(h.finished!.every((r) => r.score === 0)).toBe(true);
  });
});

describe('bağlantı kopması ve atlama', () => {
  it('bekleme süresi dolmadan ve herkes bağlıyken atlanamaz; yalnızca oda sahibi atlar', async () => {
    const { h, s } = await setup(5, { skipAfter: 30 });
    expect(await h.act('p0', { type: 'skip', session: s.session })).toMatchObject({ ok: false });
    h.advance(30_000);
    expect(await h.act('p2', { type: 'skip', session: s.session })).toMatchObject({ ok: false });
    await ok(h, 'p0', { type: 'skip', session: s.session });
    expect(s.phase).toBe('vote');
    expect(s.chancellor).not.toBeNull();
    expect(s.chancellor).not.toBe('p1');
  });

  it('bağlantısı kopan oyuncunun oyu hemen Nein sayılabilir', async () => {
    const { h, s } = await setup(5);
    await ok(h, 'p1', { type: 'nominate', target: 'p3' });
    for (const id of ['p0', 'p1', 'p2']) await ok(h, id, { type: 'vote', round: s.voteRound, vote: 'ja' });
    h.setConnected('p4', false);
    await ok(h, 'p0', { type: 'skip', session: s.session });
    expect(s.lastVote!.votes).toMatchObject({ p3: 'nein', p4: 'nein' });
    expect(s.lastVote!.passed).toBe(true);
    // eski oturumla tekrar atlama yutulur
    expect(await h.act('p0', { type: 'skip', session: s.session - 1 })).toMatchObject({ ok: true, stale: true });
  });

  it('kart atma, yasalaştırma, veto cevabı ve yetki atlanabilir', async () => {
    const { h, s } = await setup(7);
    setTracks(s, 0, 5);
    s.deck.unshift('fascist', 'liberal', 'liberal');
    await elect(h, s, 'p4');
    h.setConnected('p1', false);
    await ok(h, 'p0', { type: 'skip', session: s.session });
    expect(s.phase).toBe('chancellorLegislate');
    expect(s.discard).toHaveLength(1);
    await ok(h, 'p4', { type: 'veto', session: s.session });
    await ok(h, 'p0', { type: 'skip', session: s.session });
    expect(s.vetoDenied).toBe(true);
    h.setConnected('p4', false);
    await ok(h, 'p0', { type: 'skip', session: s.session });
    expect(s.liberal + s.fascist).toBeGreaterThanOrEqual(5);

    const t = await setup(7);
    setTracks(t.s, 0, 3);
    await govern(t.h, t.s, 'fascist', 'p4');
    t.h.setConnected('p1', false);
    await ok(t.h, 'p0', { type: 'skip', session: t.s.session });
    expect(t.s.dead).toEqual([]);
    expect(t.s.president).toBe('p2');
    expect(t.s.log.some((l) => l.k === 'powerSkipped')).toBe(true);
  });

  it('oyundan çıkan oyuncu oyunu kilitlemez', async () => {
    const { h, s } = await setup(5);
    h.leave('p1');
    await ok(h, 'p0', { type: 'skip', session: s.session });
    expect(s.phase).toBe('vote');
  });
});
