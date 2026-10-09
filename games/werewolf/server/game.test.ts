import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { createHarness, type Harness } from '@songie/game-kit/testing';
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  recommendedRoles,
  rolesProblem,
  villagerCount,
  type NightStep,
  type Role,
  type RoleCounts,
  type WerewolfSettings,
  type WerewolfView,
} from '../shared/index.js';
import { assignRoles } from './game.js';
import { werewolfServer, type WerewolfState } from './index.js';

const ROLE_MS = 20_000;
const VERDICT = 5_000;
const PODIUM = 10_000;
const TICK = 1_000;
/** shuffle'ı birim permütasyona çevirir: roller sırayla kurtlar, kahin, doktor, avcı, cadı, okçu, deli, köylüler. */
const identity = () => 0.999999;

const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`);
type H = Harness<WerewolfView>;

const FULL: RoleCounts = { wolf: 2, seer: 1, doctor: 1, hunter: 1, witch: 1, cupid: 1, fool: 1 };
// 9 kişilik tam düzen: rollerin oturduğu yerler.
const W1 = 'p0';
const W2 = 'p1';
const SEER = 'p2';
const DOC = 'p3';
const HUNTER = 'p4';
const WITCH = 'p5';
const CUPID = 'p6';
const FOOL = 'p7';
const VIL = 'p8';

async function setup(opts: { n?: number; roles?: RoleCounts; settings?: Partial<WerewolfSettings>; random?: () => number } = {}) {
  const n = opts.n ?? 9;
  const g = werewolfServer({
    db: new Database(':memory:'),
    timing: { verdictMs: VERDICT, podiumMs: PODIUM, tickMs: TICK },
    random: opts.random ?? identity,
  });
  const h: H = createHarness<WerewolfView>(g, {
    players: ids(n),
    settings: { roleSeconds: ROLE_MS / 1000, discussSeconds: 60, voteSeconds: 30, roles: opts.roles ?? FULL, ...opts.settings },
  });
  await h.start();
  const s = h.state as WerewolfState;
  return { h, s };
}

async function ok(h: H, id: string, action: unknown) {
  const res = await h.act(id, action);
  expect(res, `${id} ${JSON.stringify(action)}`).toMatchObject({ ok: true });
  expect(res).not.toHaveProperty('stale');
  return res;
}

async function fail(h: H, id: string, action: unknown, re?: RegExp) {
  const res = await h.act(id, action);
  expect(res.ok, `${id} ${JSON.stringify(action)}`).toBe(false);
  if (re && !res.ok) expect(res.error).toMatch(re);
  return res;
}

const step = (s: WerewolfState): NightStep | null => (s.phase === 'night' ? s.nightSteps[s.stepIndex]! : null);
const endStep = (h: H, s: WerewolfState) => h.advance(s.endsAt - h.now);

function goTo(h: H, s: WerewolfState, target: NightStep) {
  for (let i = 0; i < 10 && s.phase === 'night' && step(s) !== target; i++) endStep(h, s);
  expect(step(s)).toBe(target);
}

function endNight(h: H, s: WerewolfState) {
  for (let i = 0; i < 10 && s.phase === 'night'; i++) endStep(h, s);
  expect(s.phase).not.toBe('night');
}

async function wolvesPick(h: H, s: WerewolfState, target: string) {
  goTo(h, s, 'wolves');
  for (const w of s.seats.filter((id) => s.roles[id] === 'wolf' && !s.dead.includes(id))) {
    await ok(h, w, { type: 'wolfVote', session: s.session, target });
  }
}

/** Geceyi bitirip tartışmaya geçer (avcı yoksa). */
async function nightKill(h: H, s: WerewolfState, target: string) {
  await wolvesPick(h, s, target);
  endNight(h, s);
}

async function hang(h: H, s: WerewolfState, target: string) {
  expect(s.phase).toBe('discuss');
  const nominator = s.seats.find((id) => id !== target && !s.dead.includes(id))!;
  await ok(h, nominator, { type: 'nominate', session: s.session, target });
  await ok(h, h.ctx.hostId(), { type: 'hostSkip', session: s.session });
  expect(s.phase).toBe('vote');
  const voters = s.seats.filter((id) => !s.dead.includes(id));
  for (const v of voters) {
    if (s.phase !== 'vote') break;
    await ok(h, v, { type: 'vote', session: s.session, target });
  }
}

const viewsOf = (h: H, id: string) => JSON.parse(h.seen(id)) as WerewolfView[];
const withoutMe = (v: WerewolfView) => ({ ...v, me: null });

/* ------------------------------------------------------------------ */

describe('rol dağılımı', () => {
  it('ayarlardaki sayılar dağıtılır, kalan yerler köylü olur', () => {
    for (let k = 0; k < 20; k++) {
      const roles = Object.values(assignRoles(ids(12), { roles: FULL } as WerewolfSettings));
      expect(roles.filter((r) => r === 'wolf')).toHaveLength(2);
      for (const r of ['seer', 'doctor', 'hunter', 'witch', 'cupid', 'fool'] as Role[]) expect(roles.filter((x) => x === r)).toHaveLength(1);
      expect(roles.filter((r) => r === 'villager')).toHaveLength(villagerCount(FULL, 12));
    }
  });

  it('önerilen dağılım her oyuncu sayısında oynanabilir', () => {
    for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) {
      const r = recommendedRoles(n);
      expect(rolesProblem(r, n), `${n}`).toBeNull();
      expect(villagerCount(r, n)).toBeGreaterThanOrEqual(1);
    }
  });

  it('geçersiz dağılımlar oyuncuya anlaşılır hata verir', async () => {
    expect(rolesProblem({ ...FULL, wolf: 3 }, 6)).toMatch(/kurt/);
    expect(rolesProblem(FULL, 7)).toMatch(/rolleri kapat/i);
    expect(rolesProblem(FULL, 4)).toMatch(/5–16/);
    await expect(setup({ n: 7 })).rejects.toThrow(/rolleri kapat/i);
  });

  it('kurtlar birbirini görür; diğerleri yalnızca kendi rolünü görür', async () => {
    const { h, s } = await setup();
    expect(s.roles).toMatchObject({ [W1]: 'wolf', [W2]: 'wolf', [SEER]: 'seer', [VIL]: 'villager' });
    expect(h.view(W1).me).toMatchObject({ role: 'wolf', allies: [W2] });
    expect(h.view(W2).me).toMatchObject({ role: 'wolf', allies: [W1] });
    for (const id of [SEER, DOC, HUNTER, WITCH, CUPID, FOOL, VIL]) {
      const v = h.view(id);
      expect(v.me!.role).toBe(s.roles[id]);
      expect(v.me!.allies).toEqual([]);
      expect(v.me!.wolfChat).toBeNull();
      expect(v.roles).toBeNull();
      expect(v.ghost).toBeNull();
      expect(v.seats.every((x) => x.role === null)).toBe(true);
      // Başka birinin rolü görünümlerde hiç geçmiyor.
      const seen = h.seen(id);
      expect(seen).not.toContain('"role":"wolf"');
      for (const r of ['seer', 'doctor', 'hunter', 'witch', 'cupid', 'fool', 'villager'] as Role[]) {
        if (r !== s.roles[id]) expect(seen).not.toContain(`"role":"${r}"`);
      }
    }
  });

  it('sonradan katılan izleyici rol görmez', async () => {
    const { h } = await setup();
    h.join('late');
    h.ctx.pushViews();
    const v = h.view('late');
    expect(v.me).toBeNull();
    expect(v.ghost).toBeNull();
    expect(h.seen('late')).not.toMatch(/"role":"(wolf|seer|doctor|hunter|witch|cupid|fool|villager)"/);
    await fail(h, 'late', { type: 'ghostChat', text: 'merhaba' }, /oyuncu değilsin/);
  });
});

describe('gece sırası ve süresi', () => {
  it('ilk gece: okçu, kurtlar, kahin, doktor, cadı; ikinci gece okçusuz', async () => {
    const { h, s } = await setup();
    expect(s.nightSteps).toEqual(['cupid', 'wolves', 'seer', 'doctor', 'witch']);
    expect(h.view(VIL).nightStep).toBe('cupid');
    endNight(h, s);
    await ok(h, h.ctx.hostId(), { type: 'hostSkip', session: s.session }); // aday yok
    h.advance(VERDICT);
    expect(s.phase).toBe('night');
    expect(s.day).toBe(2);
    expect(s.nightSteps).toEqual(['wolves', 'seer', 'doctor', 'witch']);
  });

  it('kapalı roller gece sırasında yer almaz', async () => {
    const { s } = await setup({ n: 6, roles: { wolf: 1, seer: 1, doctor: 0, hunter: 0, witch: 0, cupid: 0, fool: 0 } });
    expect(s.nightSteps).toEqual(['wolves', 'seer']);
  });

  it('herkes erken bitirse de gece sabit sürer (adım sayısı × rol süresi)', async () => {
    const { h, s } = await setup();
    const t0 = h.now;
    await ok(h, CUPID, { type: 'cupid', session: s.session, a: VIL, b: FOOL });
    expect(step(s)).toBe('cupid'); // okçu seçti ama adım bitmedi
    h.advance(ROLE_MS - 1);
    expect(step(s)).toBe('cupid');
    h.advance(1);
    expect(step(s)).toBe('wolves');
    await ok(h, W1, { type: 'wolfVote', session: s.session, target: VIL });
    await ok(h, W2, { type: 'wolfVote', session: s.session, target: VIL });
    expect(step(s)).toBe('wolves');
    h.advance(t0 + 5 * ROLE_MS - 1 - h.now);
    expect(s.phase).toBe('night');
    h.advance(1);
    expect(s.phase).not.toBe('night');
  });

  it('rolün sahibi ölü olsa da adım aynı süre sürer', async () => {
    const a = await setup();
    const b = await setup();
    b.s.dead.push(SEER, DOC); // kahin ve doktor ölü
    endNight(a.h, a.s);
    endNight(b.h, b.s);
    expect(a.h.now).toBe(b.h.now);
  });

  it('yanlış adımdaki ya da eski oturumdaki eylem yutulur', async () => {
    const { h, s } = await setup();
    const old = s.session;
    expect(await h.act(SEER, { type: 'seer', session: s.session, target: W1 })).toMatchObject({ ok: true, stale: true });
    goTo(h, s, 'seer');
    expect(await h.act(SEER, { type: 'seer', session: old, target: W1 })).toMatchObject({ ok: true, stale: true });
    expect(s.seerTonight).toBeNull();
  });

  it('başka rolün eylemi reddedilir', async () => {
    const { h, s } = await setup();
    await fail(h, VIL, { type: 'cupid', session: s.session, a: W1, b: W2 }, /aşk okçusu/);
    goTo(h, s, 'wolves');
    await fail(h, SEER, { type: 'wolfVote', session: s.session, target: VIL }, /kurtlar/);
    goTo(h, s, 'seer');
    await fail(h, W1, { type: 'seer', session: s.session, target: VIL }, /kahin/);
    goTo(h, s, 'doctor');
    await fail(h, WITCH, { type: 'doctor', session: s.session, target: VIL }, /doktor/);
    goTo(h, s, 'witch');
    await fail(h, DOC, { type: 'witch', session: s.session, heal: false, poison: W1 }, /cadı/);
  });
});

describe('gece gizliliği', () => {
  it('her adımda bütün oyuncuların görünümü, rol kartı alanı dışında birebir aynı', async () => {
    const { h, s } = await setup();
    const check = () => {
      const base = withoutMe(h.view(VIL));
      for (const id of s.seats) expect(withoutMe(h.view(id)), `${id} @ ${step(s)}`).toEqual(base);
    };
    check();
    await ok(h, CUPID, { type: 'cupid', session: s.session, a: SEER, b: W1 });
    check();
    goTo(h, s, 'wolves');
    await ok(h, W1, { type: 'wolfVote', session: s.session, target: VIL });
    await ok(h, W1, { type: 'wolfChat', text: 'köylüyü alalım' });
    check();
    goTo(h, s, 'seer');
    await ok(h, SEER, { type: 'seer', session: s.session, target: W2 });
    check();
    goTo(h, s, 'doctor');
    await ok(h, DOC, { type: 'doctor', session: s.session, target: DOC });
    check();
    goTo(h, s, 'witch');
    await ok(h, WITCH, { type: 'witch', session: s.session, heal: false, poison: null });
    check();
  });

  it('kurt olmayan oyuncunun gece görünümü rolüne göre değişmez (rol kartı dışında)', async () => {
    const { h, s } = await setup();
    goTo(h, s, 'seer');
    const roleless = [SEER, DOC, HUNTER, WITCH, CUPID, FOOL, VIL].map((id) => withoutMe(h.view(id)));
    for (const v of roleless) expect(v).toEqual(roleless[0]);
    // Rol kartı alanındaki anahtarlar da yapısal olarak aynı.
    const keys = [SEER, DOC, VIL].map((id) => Object.keys(h.view(id).me!).sort());
    expect(keys[1]).toEqual(keys[0]);
    expect(keys[2]).toEqual(keys[0]);
  });

  it('gece eylemleri anında gönderim yapmaz; görünümler herkese aynı tik ile gider', async () => {
    const { h, s } = await setup();
    goTo(h, s, 'seer');
    const before = s.seats.map((id) => viewsOf(h, id).length);
    await ok(h, SEER, { type: 'seer', session: s.session, target: W1 });
    expect(s.seats.map((id) => viewsOf(h, id).length)).toEqual(before);
    h.advance(TICK);
    const after = s.seats.map((id) => viewsOf(h, id).length);
    expect(new Set(after).size).toBe(1);
    expect(after[0]).toBeGreaterThan(before[0]!);
    expect(h.view(SEER).me!.turn).toMatchObject({ step: 'seer', result: { id: W1, wolf: true } });
  });

  it('sıra sende değilken eylem paneli boş', async () => {
    const { h, s } = await setup();
    goTo(h, s, 'seer');
    for (const id of s.seats.filter((x) => x !== SEER)) expect(h.view(id).me!.turn).toBeNull();
    expect(h.view(SEER).me!.turn?.step).toBe('seer');
  });
});

describe('aşk okçusu ve âşıklar', () => {
  it('âşıklar birbirini ve tarafını görür, başkası görmez', async () => {
    const { h, s } = await setup();
    await ok(h, CUPID, { type: 'cupid', session: s.session, a: SEER, b: W1 });
    h.advance(TICK);
    expect(h.view(SEER).me!.lover).toEqual({ id: W1, side: 'wolves' });
    expect(h.view(W1).me!.lover).toEqual({ id: SEER, side: 'village' });
    expect(h.view(CUPID).me!.cupidPair).toEqual([SEER, W1]);
    for (const id of [W2, DOC, HUNTER, WITCH, FOOL, VIL]) {
      expect(h.view(id).me!.lover).toBeNull();
      expect(h.view(id).me!.cupidPair).toBeNull();
    }
    await fail(h, CUPID, { type: 'cupid', session: s.session, a: VIL, b: FOOL }, /zaten/);
    endNight(h, s);
    expect(h.seen(VIL)).not.toContain('"lover":{');
  });

  it('aynı kişiyi iki kez seçemez; süre dolarsa âşık olmaz', async () => {
    const { h, s } = await setup();
    await fail(h, CUPID, { type: 'cupid', session: s.session, a: VIL, b: VIL }, /farklı/);
    endStep(h, s);
    expect(s.lovers).toBeNull();
  });

  it('gece âşıklardan biri ölünce diğeri de ölür', async () => {
    const { h, s } = await setup();
    await ok(h, CUPID, { type: 'cupid', session: s.session, a: VIL, b: DOC });
    await nightKill(h, s, VIL);
    expect(s.dead).toEqual([VIL, DOC]);
    expect(h.view(SEER).lastNight!.deaths.map((d) => d.id)).toEqual([VIL, DOC]);
  });

  it('gündüz asılan âşığın partneri kalp acısından ölür', async () => {
    const { h, s } = await setup();
    await ok(h, CUPID, { type: 'cupid', session: s.session, a: VIL, b: DOC });
    endNight(h, s);
    await hang(h, s, VIL);
    expect(s.dead).toEqual([VIL, DOC]);
    expect(s.log).toContainEqual({ k: 'grief', id: DOC, partner: VIL, role: 'doctor' });
  });

  it('farklı taraftaki âşıklar son iki kişi kalınca birlikte kazanır', async () => {
    const { h, s } = await setup();
    await ok(h, CUPID, { type: 'cupid', session: s.session, a: VIL, b: W1 });
    endNight(h, s);
    s.dead.push(W2, SEER, HUNTER, WITCH, CUPID, FOOL);
    await hang(h, s, DOC);
    h.advance(VERDICT);
    expect(s.phase).toBe('over');
    expect(s.winner).toBe('lovers');
    h.advance(PODIUM);
    const score = Object.fromEntries(h.finished!.map((r) => [r.playerId, r.score]));
    expect(score[VIL]).toBe(1);
    expect(score[W1]).toBe(1);
    expect(score[W2]).toBe(0);
    expect(score[DOC]).toBe(0);
  });
});

describe('kurtlar', () => {
  it('çoğunluğun seçtiği kişi ölür; kurtlar birbirinin oyunu görür', async () => {
    const { h, s } = await setup();
    goTo(h, s, 'wolves');
    await ok(h, W1, { type: 'wolfVote', session: s.session, target: VIL });
    expect(h.view(W2).me!.turn).toMatchObject({ step: 'wolves', votes: { [W1]: VIL } });
    expect(h.view(W2).me!.turn!.step === 'wolves' && h.view(W2).me!.turn).toBeTruthy();
    await ok(h, W2, { type: 'wolfVote', session: s.session, target: VIL });
    endNight(h, s);
    expect(s.dead).toEqual([VIL]);
    expect(s.phase).toBe('discuss');
    expect(s.log).toContainEqual({ k: 'dawn', night: 1, deaths: [{ id: VIL, role: 'villager' }] });
  });

  it('kurt kurdu hedefleyemez; oy geri alınabilir', async () => {
    const { h, s } = await setup();
    goTo(h, s, 'wolves');
    await fail(h, W1, { type: 'wolfVote', session: s.session, target: W2 }, /kurt olmayan/);
    await ok(h, W1, { type: 'wolfVote', session: s.session, target: VIL });
    await ok(h, W1, { type: 'wolfVote', session: s.session, target: null });
    endNight(h, s);
    expect(s.dead).toEqual([]);
  });

  it('beraberlikte ayara göre rastgele biri ölür', async () => {
    const { h, s } = await setup({ settings: { wolfTie: 'random' } });
    goTo(h, s, 'wolves');
    await ok(h, W1, { type: 'wolfVote', session: s.session, target: VIL });
    await ok(h, W2, { type: 'wolfVote', session: s.session, target: FOOL });
    endNight(h, s);
    expect(s.dead).toHaveLength(1);
    expect([VIL, FOOL]).toContain(s.dead[0]);
  });

  it('beraberlikte ayar "kimse" ise kimse ölmez', async () => {
    const { h, s } = await setup({ settings: { wolfTie: 'none' } });
    goTo(h, s, 'wolves');
    await ok(h, W1, { type: 'wolfVote', session: s.session, target: VIL });
    await ok(h, W2, { type: 'wolfVote', session: s.session, target: FOOL });
    endNight(h, s);
    expect(s.dead).toEqual([]);
    expect(s.lastNight!.deaths).toEqual([]);
  });

  it('kurt sohbeti yalnızca kurtlara gider ve yalnızca gece açık', async () => {
    const { h, s } = await setup();
    await ok(h, W1, { type: 'wolfChat', text: 'gizli plan xyz' });
    h.advance(TICK);
    expect(h.view(W2).me!.wolfChat!.map((m) => m.text)).toEqual(['gizli plan xyz']);
    await fail(h, VIL, { type: 'wolfChat', text: 'ben de' }, /yalnızca kurtlara/);
    endNight(h, s);
    for (const id of s.seats.filter((x) => s.roles[x] !== 'wolf')) expect(h.seen(id)).not.toContain('gizli plan xyz');
    await fail(h, W1, { type: 'wolfChat', text: 'gündüz' }, /yalnızca gece/);
  });
});

describe('kahin', () => {
  it('kurt olup olmadığını yalnızca kahin öğrenir; gecede bir bakış', async () => {
    const { h, s } = await setup();
    goTo(h, s, 'seer');
    await fail(h, SEER, { type: 'seer', session: s.session, target: SEER }, /başka/);
    await ok(h, SEER, { type: 'seer', session: s.session, target: W2 });
    await fail(h, SEER, { type: 'seer', session: s.session, target: VIL }, /yaptın/);
    endNight(h, s);
    await ok(h, h.ctx.hostId(), { type: 'hostSkip', session: s.session });
    h.advance(VERDICT);
    goTo(h, s, 'seer');
    await ok(h, SEER, { type: 'seer', session: s.session, target: VIL });
    expect(h.view(SEER).me!.seerResults).toEqual([
      { night: 1, id: W2, wolf: true },
      { night: 2, id: VIL, wolf: false },
    ]);
    endNight(h, s);
    for (const id of s.seats.filter((x) => x !== SEER)) {
      expect(h.view(id).me!.seerResults).toEqual([]);
      expect(h.seen(id)).not.toContain('"wolf":true');
    }
  });
});

describe('doktor', () => {
  it('korunan kişi kurtlardan kurtulur', async () => {
    const { h, s } = await setup();
    await wolvesPick(h, s, VIL);
    goTo(h, s, 'doctor');
    await ok(h, DOC, { type: 'doctor', session: s.session, target: VIL });
    endNight(h, s);
    expect(s.dead).toEqual([]);
    expect(s.secret).toContainEqual({ k: 'saved', night: 1, target: VIL });
    expect(h.view(VIL).lastNight).toEqual({ night: 1, deaths: [] });
  });

  it('ayar açıkken aynı kişiyi üst üste koruyamaz', async () => {
    const { h, s } = await setup({ settings: { doctorNoRepeat: true } });
    goTo(h, s, 'doctor');
    await ok(h, DOC, { type: 'doctor', session: s.session, target: VIL });
    endNight(h, s);
    await ok(h, h.ctx.hostId(), { type: 'hostSkip', session: s.session });
    h.advance(VERDICT);
    goTo(h, s, 'doctor');
    expect(h.view(DOC).me!.turn).toMatchObject({ step: 'doctor', blocked: VIL });
    await fail(h, DOC, { type: 'doctor', session: s.session, target: VIL }, /üst üste/);
    await ok(h, DOC, { type: 'doctor', session: s.session, target: SEER });
  });

  it('ayar kapalıyken aynı kişiyi yeniden koruyabilir', async () => {
    const { h, s } = await setup({ settings: { doctorNoRepeat: false } });
    goTo(h, s, 'doctor');
    await ok(h, DOC, { type: 'doctor', session: s.session, target: VIL });
    endNight(h, s);
    await ok(h, h.ctx.hostId(), { type: 'hostSkip', session: s.session });
    h.advance(VERDICT);
    goTo(h, s, 'doctor');
    await ok(h, DOC, { type: 'doctor', session: s.session, target: VIL });
  });
});

describe('cadı', () => {
  it('kurbanı görür, iyileştirme bir kez kullanılır', async () => {
    const { h, s } = await setup();
    await wolvesPick(h, s, VIL);
    goTo(h, s, 'witch');
    expect(h.view(WITCH).me!.turn).toMatchObject({ step: 'witch', victim: VIL, canHeal: true, canPoison: true });
    await ok(h, WITCH, { type: 'witch', session: s.session, heal: true, poison: null });
    await fail(h, WITCH, { type: 'witch', session: s.session, heal: false, poison: W1 }, /kararını/);
    endNight(h, s);
    expect(s.dead).toEqual([]);
    expect(h.view(WITCH).me!.potions).toEqual({ heal: false, poison: true });
    // Başka kimse kurbanı göremez.
    for (const id of s.seats.filter((x) => x !== WITCH)) expect(h.seen(id)).not.toContain('"victim"');

    await ok(h, h.ctx.hostId(), { type: 'hostSkip', session: s.session });
    h.advance(VERDICT);
    await wolvesPick(h, s, FOOL);
    goTo(h, s, 'witch');
    expect(h.view(WITCH).me!.turn).toMatchObject({ canHeal: false });
    await fail(h, WITCH, { type: 'witch', session: s.session, heal: true, poison: null }, /zaten/);
  });

  it('zehir doktoru da aşar ve iki iksir aynı gece kullanılabilir', async () => {
    const { h, s } = await setup();
    await wolvesPick(h, s, VIL);
    goTo(h, s, 'doctor');
    await ok(h, DOC, { type: 'doctor', session: s.session, target: W1 });
    goTo(h, s, 'witch');
    await fail(h, WITCH, { type: 'witch', session: s.session, heal: false, poison: WITCH }, /başka/);
    await ok(h, WITCH, { type: 'witch', session: s.session, heal: true, poison: W1 });
    endNight(h, s);
    expect(s.dead).toEqual([W1]);
    expect(s.potions).toEqual({ heal: false, poison: false });
  });

  it('kurban yoksa iyileştiremez', async () => {
    const { h, s } = await setup();
    goTo(h, s, 'witch');
    expect(h.view(WITCH).me!.turn).toMatchObject({ victim: null, canHeal: false });
    await fail(h, WITCH, { type: 'witch', session: s.session, heal: true, poison: null }, /kurban yok/);
  });
});

describe('avcı', () => {
  it('gece ölürse sabah son atışını yapar', async () => {
    const { h, s } = await setup();
    await nightKill(h, s, HUNTER);
    expect(s.phase).toBe('hunter');
    expect(h.view(VIL).hunter).toBe(HUNTER);
    await fail(h, VIL, { type: 'shoot', session: s.session, target: W1 }, /avcı/);
    await ok(h, HUNTER, { type: 'shoot', session: s.session, target: W1 });
    expect(s.dead).toEqual([HUNTER, W1]);
    expect(s.log).toContainEqual({ k: 'shot', hunter: HUNTER, target: W1, role: 'wolf' });
    expect(s.phase).toBe('discuss');
  });

  it('süre dolarsa atış yapılmadan geçilir', async () => {
    const { h, s } = await setup();
    await nightKill(h, s, HUNTER);
    h.advance(ROLE_MS);
    expect(s.log).toContainEqual({ k: 'noShot', hunter: HUNTER });
    expect(s.phase).toBe('discuss');
  });

  it('asılırsa karar ekranından sonra ateş eder; vurduğu âşıksa partneri de ölür', async () => {
    const { h, s } = await setup();
    await ok(h, CUPID, { type: 'cupid', session: s.session, a: SEER, b: DOC });
    endNight(h, s);
    await hang(h, s, HUNTER);
    expect(s.phase).toBe('verdict');
    h.advance(VERDICT);
    expect(s.phase).toBe('hunter');
    await ok(h, HUNTER, { type: 'shoot', session: s.session, target: SEER });
    expect(s.dead).toEqual([HUNTER, SEER, DOC]);
    expect(s.phase).toBe('night');
  });

  it('son atış kurtların kazanmasını engelleyebilir', async () => {
    const { h, s } = await setup();
    endNight(h, s);
    s.dead.push(SEER, DOC, WITCH, CUPID, FOOL, W2); // canlı: W1, avcı, köylü
    await ok(h, h.ctx.hostId(), { type: 'hostSkip', session: s.session });
    h.advance(VERDICT);
    await nightKill(h, s, HUNTER);
    expect(s.phase).toBe('hunter'); // kurt 1 – köylü 1 ama önce avcı ateş eder
    await ok(h, HUNTER, { type: 'shoot', session: s.session, target: W1 });
    expect(s.winner).toBe('village');
  });
});

describe('köyün delisi', () => {
  it('gündüz asılırsa tek başına kazanır', async () => {
    const { h, s } = await setup();
    endNight(h, s);
    await hang(h, s, FOOL);
    expect(s.phase).toBe('over');
    expect(s.winner).toBe('fool');
    expect(s.winReason).toBe('foolHanged');
    h.advance(PODIUM);
    const winners = h.finished!.filter((r) => r.score === 1).map((r) => r.playerId);
    expect(winners).toEqual([FOOL]);
  });

  it('gece ölürse oyun sürer', async () => {
    const { h, s } = await setup();
    await nightKill(h, s, FOOL);
    expect(s.phase).toBe('discuss');
    expect(s.winner).toBeNull();
  });
});

describe('gündüz: tartışma ve oylama', () => {
  it('herkes hazır deyince tartışma erken biter', async () => {
    const { h, s } = await setup();
    endNight(h, s);
    await ok(h, SEER, { type: 'nominate', session: s.session, target: VIL });
    for (const id of s.seats.slice(0, -1)) await ok(h, id, { type: 'ready', session: s.session, ready: true });
    expect(s.phase).toBe('discuss');
    expect(h.view(SEER).seats.find((x) => x.id === W1)!.ready).toBe(true);
    await ok(h, VIL, { type: 'ready', session: s.session, ready: true });
    expect(s.phase).toBe('vote');
    expect(s.candidates).toEqual([VIL]);
  });

  it('süre dolunca oylamaya geçer; aday yoksa kimse asılmaz', async () => {
    const { h, s } = await setup();
    endNight(h, s);
    h.advance(60_000);
    expect(s.phase).toBe('verdict');
    expect(s.lastVote).toMatchObject({ noCandidates: true, hanged: null });
    h.advance(VERDICT);
    expect(s.phase).toBe('night');
  });

  it('aday gösterme: kendini gösteremez, geri çekilebilir', async () => {
    const { h, s } = await setup();
    endNight(h, s);
    await fail(h, VIL, { type: 'nominate', session: s.session, target: VIL }, /Kendini/);
    await ok(h, VIL, { type: 'nominate', session: s.session, target: W1 });
    expect(h.view(SEER).seats.find((x) => x.id === W1)!.nominatedBy).toEqual([VIL]);
    expect(h.view(VIL).myNomination).toBe(W1);
    await ok(h, VIL, { type: 'nominate', session: s.session, target: null });
    expect(h.view(SEER).candidates).toEqual([]);
  });

  it('en çok oy alan asılır; ölen rolü ayara göre açıklanır', async () => {
    const { h, s } = await setup({ settings: { revealRoles: false } });
    endNight(h, s);
    await hang(h, s, SEER);
    expect(s.dead).toEqual([SEER]);
    expect(s.log).toContainEqual({ k: 'hanged', id: SEER, role: null, votes: 9 });
    expect(h.view(VIL).seats.find((x) => x.id === SEER)!.role).toBeNull();
    expect(h.seen(VIL)).not.toContain('"role":"seer"');
  });

  it('"kimse" oyu adayla berabere ya da fazlaysa kimse asılmaz', async () => {
    const { h, s } = await setup();
    endNight(h, s);
    await ok(h, SEER, { type: 'nominate', session: s.session, target: W1 });
    await ok(h, h.ctx.hostId(), { type: 'hostSkip', session: s.session });
    for (const [i, id] of s.seats.entries()) {
      if (s.phase !== 'vote') break;
      await ok(h, id, { type: 'vote', session: s.session, target: i < 4 ? W1 : null });
    }
    expect(s.lastVote).toMatchObject({ hanged: null });
    expect(s.dead).toEqual([]);
  });

  it('beraberlik: ayar "kimse" ise kimse asılmaz', async () => {
    const { h, s } = await setup({ settings: { dayTie: 'none' } });
    endNight(h, s);
    await ok(h, SEER, { type: 'nominate', session: s.session, target: W1 });
    await ok(h, DOC, { type: 'nominate', session: s.session, target: W2 });
    await ok(h, h.ctx.hostId(), { type: 'hostSkip', session: s.session });
    const plan: Record<string, string | null> = { p0: W2, p1: W1, p2: W1, p3: W2, p4: W1, p5: W2, p6: null, p7: null, p8: null };
    for (const id of s.seats) await ok(h, id, { type: 'vote', session: s.session, target: plan[id] });
    expect(s.phase).toBe('verdict');
    expect(s.lastVote).toMatchObject({ tie: true, hanged: null });
  });

  it('beraberlik: ayar "ikinci tur" ise berabere kalanlar arasında yeniden oylanır', async () => {
    const { h, s } = await setup({ settings: { dayTie: 'runoff' } });
    endNight(h, s);
    await ok(h, SEER, { type: 'nominate', session: s.session, target: W1 });
    await ok(h, DOC, { type: 'nominate', session: s.session, target: W2 });
    await ok(h, VIL, { type: 'nominate', session: s.session, target: FOOL });
    await ok(h, h.ctx.hostId(), { type: 'hostSkip', session: s.session });
    const plan: Record<string, string | null> = { p0: W2, p1: W1, p2: W1, p3: W2, p4: W1, p5: W2, p6: FOOL, p7: null, p8: null };
    for (const id of s.seats) await ok(h, id, { type: 'vote', session: s.session, target: plan[id] });
    expect(s.phase).toBe('vote');
    expect(s.candidates).toEqual([W1, W2]);
    expect(h.view(VIL).runoff).toBe(true);
    await fail(h, VIL, { type: 'vote', session: s.session, target: FOOL }, /adaylardan/);
    // İkinci turda da beraberlik: kimse asılmaz.
    for (const id of s.seats) await ok(h, id, { type: 'vote', session: s.session, target: plan[id] === FOOL ? null : plan[id] });
    expect(s.phase).toBe('verdict');
    expect(s.lastVote).toMatchObject({ round: 2, tie: true, hanged: null });
  });

  it('açık oyda oylar canlı görünür; gizli oyda yalnızca "oy verdi" bilgisi', async () => {
    const open = await setup({ settings: { openVotes: true } });
    endNight(open.h, open.s);
    await ok(open.h, SEER, { type: 'nominate', session: open.s.session, target: W1 });
    await ok(open.h, open.h.ctx.hostId(), { type: 'hostSkip', session: open.s.session });
    await ok(open.h, SEER, { type: 'vote', session: open.s.session, target: W1 });
    expect(open.h.view(VIL).liveVotes).toEqual({ [SEER]: W1 });

    const secret = await setup({ settings: { openVotes: false } });
    endNight(secret.h, secret.s);
    await ok(secret.h, SEER, { type: 'nominate', session: secret.s.session, target: W1 });
    await ok(secret.h, secret.h.ctx.hostId(), { type: 'hostSkip', session: secret.s.session });
    await ok(secret.h, SEER, { type: 'vote', session: secret.s.session, target: W1 });
    const v = secret.h.view(VIL);
    expect(v.liveVotes).toBeNull();
    expect(v.seats.find((x) => x.id === SEER)!.voted).toBe(true);
    expect(secret.h.view(SEER).myVote).toEqual({ target: W1 });
    expect(v.myVote).toBeNull();
    for (const id of secret.s.seats.filter((x) => x !== SEER)) {
      if (secret.s.phase !== 'vote') break;
      await ok(secret.h, id, { type: 'vote', session: secret.s.session, target: W1 });
    }
    expect(secret.s.lastVote!.votes).toBeNull();
    expect(secret.s.lastVote!.tally).toContainEqual({ id: W1, n: 9 });
  });

  it('süre dolunca verilen oylarla sonuçlanır', async () => {
    const { h, s } = await setup();
    endNight(h, s);
    await ok(h, SEER, { type: 'nominate', session: s.session, target: W1 });
    await ok(h, h.ctx.hostId(), { type: 'hostSkip', session: s.session });
    await ok(h, SEER, { type: 'vote', session: s.session, target: W1 });
    h.advance(30_000);
    expect(s.dead).toEqual([W1]);
  });
});

describe('ölüler ve hayaletler', () => {
  it('ölüler oy veremez, aday gösteremez, gece uyanmaz', async () => {
    const { h, s } = await setup();
    await nightKill(h, s, SEER);
    await fail(h, SEER, { type: 'nominate', session: s.session, target: W1 }, /Ölüler/);
    await fail(h, SEER, { type: 'ready', session: s.session, ready: true }, /Ölüler/);
    await ok(h, VIL, { type: 'nominate', session: s.session, target: W1 });
    await ok(h, h.ctx.hostId(), { type: 'hostSkip', session: s.session });
    await fail(h, SEER, { type: 'vote', session: s.session, target: W1 }, /oy veremez/);
    for (const id of s.seats.filter((x) => x !== SEER)) {
      if (s.phase !== 'vote') break;
      await ok(h, id, { type: 'vote', session: s.session, target: null });
    }
    h.advance(VERDICT);
    goTo(h, s, 'seer');
    await fail(h, SEER, { type: 'seer', session: s.session, target: W1 }, /Ölüler gece uyanmaz/);
  });

  it('hayaletler kanalı yalnızca ölülere; ayar açıksa bütün rolleri görürler', async () => {
    const { h, s } = await setup({ settings: { ghostsSeeRoles: true } });
    await nightKill(h, s, VIL);
    const g = h.view(VIL).ghost!;
    expect(g.roles).toEqual(s.roles);
    expect(g.secret).toContainEqual({ k: 'wolves', night: 1, target: VIL });
    await fail(h, SEER, { type: 'ghostChat', text: 'selam' }, /yalnızca ölülere/);
    await ok(h, VIL, { type: 'ghostChat', text: 'öbür taraftan selam' });
    expect(h.view(VIL).ghost!.chat.map((m) => m.text)).toEqual(['öbür taraftan selam']);
    for (const id of s.seats.filter((x) => x !== VIL)) {
      expect(h.view(id).ghost).toBeNull();
      expect(h.seen(id)).not.toContain('öbür taraftan selam');
    }
  });

  it('ayar kapalıyken hayaletler rolleri görmez', async () => {
    const { h, s } = await setup({ settings: { ghostsSeeRoles: false } });
    await nightKill(h, s, VIL);
    expect(h.view(VIL).ghost).toMatchObject({ roles: null, secret: null, lovers: null });
  });
});

describe('kazanma koşulları', () => {
  const SMALL: RoleCounts = { wolf: 1, seer: 1, doctor: 1, hunter: 0, witch: 0, cupid: 0, fool: 0 };

  it('bütün kurtlar ölünce köy kazanır', async () => {
    const { h, s } = await setup({ n: 5, roles: SMALL });
    endNight(h, s);
    await hang(h, s, 'p0');
    h.advance(VERDICT);
    expect(s.winner).toBe('village');
    expect(s.winReason).toBe('wolvesDead');
    h.advance(PODIUM);
    expect(h.finished!.find((r) => r.playerId === 'p0')!.score).toBe(0);
    expect(h.finished!.filter((r) => r.score === 1)).toHaveLength(4);
  });

  it('kurtlar köylülere eşit olunca kurtlar kazanır', async () => {
    const { h, s } = await setup({ n: 5, roles: SMALL });
    s.dead.push('p3', 'p4');
    await nightKill(h, s, 'p1');
    expect(s.winner).toBe('wolves');
    expect(s.winReason).toBe('wolvesParity');
    const v = h.view('p2');
    expect(v.roles).toEqual(s.roles);
    expect(v.secret).not.toBeNull();
    expect(v.seats.every((x) => x.role !== null)).toBe(true);
  });

  it('oyun bitince süre dolunca sonuçlar kaydedilir; oda sahibi hemen dönebilir', async () => {
    const { h, s } = await setup({ n: 5, roles: SMALL });
    endNight(h, s);
    await hang(h, s, 'p0');
    h.advance(VERDICT);
    await fail(h, 'p1', { type: 'finish' }, /oda sahibi/);
    await ok(h, 'p0', { type: 'finish' });
    expect(h.finished).not.toBeNull();
  });
});

describe('bağlantı ve oda sahibi', () => {
  it('kopan oyuncunun gece sırası süreyle geçer', async () => {
    const { h, s } = await setup();
    h.setConnected(SEER, false);
    goTo(h, s, 'seer');
    endStep(h, s);
    expect(step(s)).toBe('doctor');
  });

  it('kopan oyuncu tartışmayı ve oylamayı kilitlemez', async () => {
    const { h, s } = await setup();
    endNight(h, s);
    h.setConnected(VIL, false);
    await ok(h, SEER, { type: 'nominate', session: s.session, target: W1 });
    for (const id of s.seats.filter((x) => x !== VIL)) await ok(h, id, { type: 'ready', session: s.session, ready: true });
    expect(s.phase).toBe('vote');
    for (const id of s.seats.filter((x) => x !== VIL)) {
      if (s.phase !== 'vote') break;
      await ok(h, id, { type: 'vote', session: s.session, target: W1 });
    }
    expect(s.phase).toBe('verdict');
    expect(s.dead).toEqual([W1]);
  });

  it('tartışmayı ya da oylamayı yalnızca oda sahibi erken bitirir', async () => {
    const { h, s } = await setup();
    await fail(h, VIL, { type: 'hostSkip', session: s.session }, /oda sahibi/);
    await fail(h, 'p0', { type: 'hostSkip', session: s.session }, /erken bitirilecek/);
    endNight(h, s);
    await fail(h, VIL, { type: 'hostSkip', session: s.session }, /oda sahibi/);
    const old = s.session;
    await ok(h, 'p0', { type: 'hostSkip', session: s.session });
    expect(await h.act('p0', { type: 'hostSkip', session: old })).toMatchObject({ ok: true, stale: true });
  });

  it('oyunu bitir: roller açılır, süre sonunda skorsuz kaydedilir', async () => {
    const { h, s } = await setup();
    goTo(h, s, 'seer');
    h.end();
    expect(s.phase).toBe('over');
    expect(s.winner).toBeNull();
    expect(h.view(VIL).roles).toEqual(s.roles);
    h.advance(PODIUM);
    expect(h.finished).toHaveLength(9);
    expect(h.finished!.every((r) => r.score === 0)).toBe(true);
    // Gece tik'i durdu: oyun bitince yeni görünüm gönderilmez.
    const n = viewsOf(h, VIL).length;
    h.advance(10 * TICK);
    expect(viewsOf(h, VIL).length).toBe(n);
  });

  it('ayarlara dokunulmadıysa rol dağılımı odadaki kişi sayısına uyarlanır', async () => {
    const h = createHarness<WerewolfView>(werewolfServer({ db: new Database(':memory:') }), { players: ['a', 'b', 'c', 'd', 'e'] });
    await h.start();
    const roles = ['a', 'b', 'c', 'd', 'e'].map((id) => h.view(id).me?.role);
    expect(roles.filter((r) => r === 'wolf')).toHaveLength(1);
  });
});
