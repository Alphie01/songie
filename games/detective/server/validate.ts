import type { CaseFile } from '../shared/case-schema.js';

export interface CheckReport {
  errors: string[];
  warnings: string[];
  stats: Record<string, number | string>;
}

/**
 * İzlerin ve sorguların tamamı açılırsa `uptoAct` bölümüne kadar (dahil) erişilebilen kanıt, iz ve
 * sorgular. Sorgu cevapları (`needs`/`confront` koşulları sağlandıkça) belge ve iz açabilir.
 */
export function reachable(c: CaseFile, uptoAct: number): { evidence: Set<string>; leads: Set<string>; interviews: Set<string> } {
  const leadById = new Map(c.leads.map((l) => [l.id, l]));
  const ivById = new Map(c.interviews.map((i) => [i.id, i]));
  const evidence = new Set<string>();
  const leads = new Set<string>();
  const interviews = new Set<string>();
  const queue: string[] = [];
  for (const act of c.acts.slice(0, uptoAct + 1)) {
    act.evidence.forEach((e) => evidence.add(e));
    act.interviews.forEach((i) => interviews.add(i));
    queue.push(...act.leads);
  }
  // Sabit noktaya kadar: bir turda küme büyümediyse dur (minAct yüzünden açılamayan izler döngü yaratmasın).
  const size = () => evidence.size + leads.size + interviews.size;
  for (let before = -1; before !== size(); ) {
    before = size();
    while (queue.length) {
      const id = queue.shift()!;
      if (leads.has(id)) continue;
      const lead = leadById.get(id);
      if (!lead) continue;
      if (lead.minAct && lead.minAct - 1 > uptoAct) continue;
      leads.add(id);
      lead.unlocks.forEach((e) => evidence.add(e));
      lead.interviews.forEach((i) => interviews.add(i));
      queue.push(...lead.leadsTo);
    }
    // Belgeden doğan izler
    for (const l of c.leads) {
      if (!leads.has(l.id) && l.from.some((e) => evidence.has(e))) queue.push(l.id);
    }
    for (const ivId of interviews) {
      const iv = ivById.get(ivId);
      if (!iv) continue;
      const outcomes = [
        ...iv.questions.filter((q) => q.needs.every((e) => evidence.has(e))),
        ...iv.confront.filter((x) => evidence.has(x.evidence)),
      ];
      for (const o of outcomes) {
        for (const e of o.unlocks) evidence.add(e);
        for (const l of o.leadsTo) if (!leads.has(l)) queue.push(l);
      }
    }
  }
  return { evidence, leads, interviews };
}

/** Vaka dosyasının şema dışındaki tutarlılık denetimi. `imageExists` verilmezse görsel dosyaları denetlenmez. */
export function checkCase(c: CaseFile, imageExists?: (key: string) => boolean): CheckReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const err = (m: string) => errors.push(m);
  const warn = (m: string) => warnings.push(m);

  const dupes = (label: string, ids: string[]) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) err(`${label} kimliği tekrar ediyor: ${id}`);
      seen.add(id);
    }
    return seen;
  };
  const chars = dupes('Karakter', c.characters.map((x) => x.id));
  const locs = dupes('Mekân', c.locations.map((x) => x.id));
  const evs = dupes('Kanıt', c.evidence.map((x) => x.id));
  const leads = dupes('İz', c.leads.map((x) => x.id));
  const facts = dupes('Gerçek', c.facts.map((x) => x.id));
  const qs = dupes('Soru', c.questions.map((x) => x.id));
  const images = new Set(Object.keys(c.images));
  const suspects = new Set(c.characters.filter((x) => x.suspect).map((x) => x.id));
  const evById = new Map(c.evidence.map((e) => [e.id, e]));

  const need = (set: Set<string>, id: string, label: string, where: string) => {
    if (!set.has(id)) err(`${where}: bilinmeyen ${label} "${id}"`);
  };

  // --- Görseller ---
  const usedImages = new Set<string>();
  const img = (key: string | undefined, where: string) => {
    if (!key) return;
    usedImages.add(key);
    need(images, key, 'görsel', where);
  };
  img(c.meta.cover, 'meta.cover');
  if (!c.meta.cover) warn('Kapak görseli (meta.cover) yok.');
  c.characters.forEach((ch) => img(ch.portrait, `karakter ${ch.id}`));
  c.locations.forEach((l) => img(l.image, `mekân ${l.id}`));
  c.acts.forEach((a, i) => img(a.sceneImage, `bölüm ${i + 1}`));
  for (const e of c.evidence) {
    if (e.doc.kind === 'photo') img(e.doc.image, `kanıt ${e.id}`);
    if (e.doc.kind === 'newspaper') img(e.doc.image, `kanıt ${e.id}`);
    if (e.doc.kind === 'statement') need(chars, e.doc.person, 'karakter', `kanıt ${e.id} (ifade)`);
    if (e.doc.kind === 'floorplan') {
      const locId = e.doc.location;
      need(locs, locId, 'mekân', `kanıt ${e.id} (kroki)`);
      const loc = c.locations.find((l) => l.id === locId);
      if (loc && !loc.plan) err(`kanıt ${e.id}: "${loc.id}" mekânının planı (plan) yok.`);
    }
    if (e.doc.kind === 'audio') {
      e.doc.lines.forEach((line, i) => {
        const where = `kanıt ${e.id} (ses) satır ${i + 1}`;
        if (line.character) {
          need(chars, line.character, 'karakter', where);
          const ch = c.characters.find((x) => x.id === line.character);
          if (ch && !ch.voice && !line.voice) err(`${where}: "${ch.id}" karakterinin sesi (voice) tanımlı değil.`);
        } else if (!line.name || !line.voice) err(`${where}: karakter yoksa "name" ve "voice" gerekli.`);
      });
    }
    e.reveals.forEach((f) => need(facts, f, 'gerçek', `kanıt ${e.id} reveals`));
    e.people.forEach((p) => need(chars, p, 'karakter', `kanıt ${e.id} people`));
  }
  for (const key of images) if (!usedImages.has(key)) warn(`Görsel kullanılmıyor: ${key}`);
  if (imageExists) {
    const missing = [...images].filter((k) => !imageExists(k));
    if (missing.length) warn(`${missing.length}/${images.size} görsel dosyası henüz üretilmedi.`);
  }
  const audioCount = c.evidence.filter((e) => e.doc.kind === 'audio').length;
  if (audioCount < 2) warn(`Ses kaydı kanıtı az: ${audioCount} (2–4 önerilir).`);
  if (!c.meta.narrator) warn('Anlatıcı sesi (meta.narrator) yok.');
  const photoCount = c.evidence.filter((e) => e.doc.kind === 'photo').length;
  if (photoCount < 6) warn(`Fotoğraf/kamera kanıtı az: ${photoCount} (en az 6 önerilir).`);

  // --- Bölümler ve izler ---
  c.acts.forEach((a, i) => {
    a.evidence.forEach((e) => need(evs, e, 'kanıt', `bölüm ${i + 1} evidence`));
    a.leads.forEach((l) => need(leads, l, 'iz', `bölüm ${i + 1} leads`));
    const last = i === c.acts.length - 1;
    if (!last && !a.advance) err(`Bölüm ${i + 1}: geçiş koşulu (advance) yok.`);
    if (last && a.advance) warn(`Son bölümde geçiş koşulu (advance) gereksiz.`);
    if (a.advance) {
      const r = reachable(c, i);
      for (const l of a.advance.leads) {
        need(leads, l, 'iz', `bölüm ${i + 1} advance`);
        if (leads.has(l) && !r.leads.has(l)) err(`Bölüm ${i + 1}: geçiş izi "${l}" bu bölümde keşfedilemiyor.`);
      }
      if (a.advance.leads.length === 0) warn(`Bölüm ${i + 1}: geçiş izi yok, yalnızca saatle geçiliyor.`);
    }
    if (c.acts.length > 1 && a.hints.length < 2) warn(`Bölüm ${i + 1}: ipucu sayısı ${a.hints.length} (2 önerilir).`);
  });
  // --- Sorgular ---
  const ivs = dupes('Sorgu', c.interviews.map((x) => x.id));
  c.acts.forEach((a, i) => a.interviews.forEach((x) => need(ivs, x, 'sorgu', `bölüm ${i + 1} interviews`)));
  c.leads.forEach((l) => l.interviews.forEach((x) => need(ivs, x, 'sorgu', `iz ${l.id} interviews`)));
  let voicedTotal = 0;
  for (const iv of c.interviews) {
    const where = `sorgu ${iv.id}`;
    need(chars, iv.character, 'karakter', where);
    const ch = c.characters.find((x) => x.id === iv.character);
    const qids = dupes(`${where} soru`, iv.questions.map((q) => q.id));
    const outs = [...iv.questions.map((q) => ({ o: q, w: `${where} soru ${q.id}` })), ...iv.confront.map((x) => ({ o: x, w: `${where} gösterme ${x.evidence}` }))];
    for (const q of iv.questions) {
      q.after.forEach((a) => need(qids, a, 'soru', `${where} soru ${q.id} after`));
      q.needs.forEach((e) => need(evs, e, 'kanıt', `${where} soru ${q.id} needs`));
    }
    iv.confront.forEach((x) => need(evs, x.evidence, 'kanıt', `${where} confront`));
    for (const { o, w } of outs) {
      o.unlocks.forEach((e) => need(evs, e, 'kanıt', `${w} unlocks`));
      o.leadsTo.forEach((l) => need(leads, l, 'iz', `${w} leadsTo`));
      o.reveals.forEach((f) => need(facts, f, 'gerçek', `${w} reveals`));
      if (o.voiced) voicedTotal++;
    }
    if (outs.some((x) => x.o.voiced) && ch && !ch.voice) err(`${where}: sesli cevap var ama "${ch.id}" karakterinin sesi (voice) yok.`);
    if (iv.questions.length < 10) warn(`${where}: ${iv.questions.length} soru (12–22 önerilir).`);
    if (iv.confront.length < 2) warn(`${where}: belge gösterme tepkisi ${iv.confront.length} (2–5 önerilir).`);
    // Döngüsel/ulaşılamaz "after" zinciri
    const known = new Set<string>();
    for (let grew = true; grew; ) {
      grew = false;
      for (const q of iv.questions) if (!known.has(q.id) && q.after.every((a) => known.has(a))) (known.add(q.id), (grew = true));
    }
    for (const q of iv.questions) if (!known.has(q.id)) err(`${where}: soru ${q.id} hiçbir zaman görünmüyor (after zinciri döngüsel).`);
  }
  if (voicedTotal > 20) warn(`Sesli sorgu cevabı ${voicedTotal} (vaka başına 12–18 önerilir).`);

  for (const l of c.leads) {
    l.unlocks.forEach((e) => need(evs, e, 'kanıt', `iz ${l.id} unlocks`));
    l.leadsTo.forEach((x) => need(leads, x, 'iz', `iz ${l.id} leadsTo`));
    l.from.forEach((e) => need(evs, e, 'kanıt', `iz ${l.id} from`));
    if (l.unlocks.length === 0 && l.interviews.length === 0) warn(`İz ${l.id} hiçbir belge ya da sorgu açmıyor.`);
  }

  // Her kanıt tek bir yerden gelsin.
  const sources = new Map<string, string[]>();
  c.acts.forEach((a, i) => a.evidence.forEach((e) => sources.set(e, [...(sources.get(e) ?? []), `bölüm ${i + 1}`])));
  c.leads.forEach((l) => l.unlocks.forEach((e) => sources.set(e, [...(sources.get(e) ?? []), `iz ${l.id}`])));
  c.interviews.forEach((iv) =>
    [...iv.questions, ...iv.confront].forEach((o) => o.unlocks.forEach((e) => sources.set(e, [...(sources.get(e) ?? []), `sorgu ${iv.id}`]))),
  );
  for (const [e, s] of sources) if (s.length > 1) warn(`Kanıt ${e} birden çok yerden açılıyor: ${s.join(', ')}`);

  const all = reachable(c, c.acts.length - 1);
  for (const e of evs) if (!all.evidence.has(e)) err(`Kanıt ${e} hiçbir bölüm ya da izle açılmıyor.`);
  for (const l of leads) if (!all.leads.has(l)) err(`İz ${l} hiçbir bölüm ya da izle keşfedilmiyor.`);
  for (const i of ivs) if (!all.interviews.has(i)) err(`Sorgu ${i} hiçbir bölüm ya da izle açılmıyor.`);

  // --- Gerçek ve çözüm ---
  const truth = c.truth;
  truth.culprits.forEach((x) => need(chars, x, 'karakter', 'truth.culprits'));
  truth.characters.forEach((x) => need(chars, x.id, 'karakter', 'truth.characters'));
  for (const s of suspects) if (!truth.characters.some((x) => x.id === s)) warn(`Şüpheli ${s} için truth.characters kaydı yok.`);
  truth.redHerrings.forEach((r) => need(evs, r.evidence, 'kanıt', 'truth.redHerrings'));
  if (truth.redHerrings.length < 3) warn(`Yanıltıcı ipucu sayısı ${truth.redHerrings.length} (3–5 önerilir).`);

  const lastAct = c.acts.length - 1;
  const early = reachable(c, Math.max(0, lastAct - 1));
  truth.chain.forEach((step, i) => {
    step.evidence.forEach((e) => need(evs, e, 'kanıt', `truth.chain[${i}]`));
    step.facts.forEach((f) => need(facts, f, 'gerçek', `truth.chain[${i}]`));
    if (step.evidence.length < 2) warn(`Zincir halkası ${i + 1} tek kanıta dayanıyor ("${step.step.slice(0, 50)}…").`);
    if (lastAct > 0 && !step.evidence.some((e) => early.evidence.has(e))) {
      err(`Zincir halkası ${i + 1} yalnızca son bölümde kanıtlanabiliyor (son kanıtı görmeden çözülebilmeli).`);
    }
  });

  const revealed = new Set(c.evidence.flatMap((e) => e.reveals));
  for (const f of facts) if (!revealed.has(f)) warn(`Gerçek ${f} hiçbir belgeyle ortaya konmuyor.`);

  // Fail 1. bölümde tanıtılmalı.
  const act0 = reachable(c, 0);
  for (const cul of truth.culprits) {
    const appears = c.acts[0]!.evidence.some((id) => {
      const e = evById.get(id);
      return !!e && (e.people.includes(cul) || (e.doc.kind === 'statement' && e.doc.person === cul));
    });
    if (!appears) {
      const later = [...act0.evidence].some((id) => evById.get(id)?.people.includes(cul));
      (later ? warn : err)(`Fail ${cul} 1. bölümün başlangıç kanıtlarında geçmiyor.`);
    }
    if (!suspects.has(cul)) err(`Fail ${cul} şüpheli (suspect: true) olarak işaretli değil.`);
  }

  // Sorular
  const who = c.questions.find((q) => q.id === 'who');
  if (!who || who.kind !== 'suspect') err('"who" kimlikli, kind: "suspect" soru zorunlu.');
  let total = 0;
  // Form "Kim?" sorusuyla aynı ekranda: suçlu adları başka sorularda geçmesin, doğru seçenek göze batmasın.
  const guilty = new Set(c.questions.filter((q) => q.kind === 'suspect').flatMap((q) => c.solution[q.id] ?? []));
  const guiltyNames = c.characters
    .filter((x) => guilty.has(x.id))
    .flatMap((x) => x.name.split(/\s+/))
    .filter((n) => n.length > 2);
  const named = (t: string) => guiltyNames.filter((n) => new RegExp(`(^|[^\\p{L}])${n}`, 'u').test(t));
  for (const q of c.questions) {
    total += q.points;
    const ans = c.solution[q.id];
    if (!ans) {
      err(`Soru ${q.id} için çözüm (solution) yok.`);
      continue;
    }
    if (q.kind !== 'suspect') {
      const hits = [...named(q.prompt), ...q.options.flatMap((o) => named(o.text))];
      if (hits.length) warn(`Soru ${q.id}: metinde suçlu adı geçiyor (${[...new Set(hits)].join(', ')}); form kimseyi adıyla anmasın.`);
    }
    if (q.kind === 'choice' && q.options.length > 2) {
      const len = (o: { text: string }) => o.text.length;
      const right = q.options.filter((o) => ans.includes(o.id));
      const longestWrong = Math.max(...q.options.filter((o) => !ans.includes(o.id)).map(len));
      if (right.some((o) => len(o) > longestWrong * 1.2)) warn(`Soru ${q.id}: doğru seçenek diğerlerinden belirgin uzun; uzunlukları eşitle.`);
    }
    for (const a of ans) {
      if (q.kind === 'suspect' && !suspects.has(a)) err(`Soru ${q.id}: cevap "${a}" bir şüpheli değil.`);
      if (q.kind === 'choice' && !q.options.some((o) => o.id === a)) err(`Soru ${q.id}: cevap "${a}" seçeneklerde yok.`);
      if (q.kind === 'evidence' && !evs.has(a)) err(`Soru ${q.id}: cevap "${a}" bir kanıt değil.`);
      if (q.kind === 'evidence' && evs.has(a) && !early.evidence.has(a) && lastAct > 0) {
        warn(`Soru ${q.id}: kanıt cevabı "${a}" yalnızca son bölümde açılıyor.`);
      }
    }
    if (q.kind === 'choice' && (q.options.length < 3 || q.options.length > 6)) warn(`Soru ${q.id}: ${q.options.length} seçenek (4–5 önerilir).`);
    if (q.kind !== 'choice' && q.options.length) warn(`Soru ${q.id}: ${q.kind} sorusunda seçenekler kullanılmaz.`);
  }
  for (const k of Object.keys(c.solution)) if (!qs.has(k)) err(`solution: bilinmeyen soru "${k}"`);
  if (who && c.solution.who) {
    const a = [...c.solution.who].sort().join(',');
    const b = [...truth.culprits].sort().join(',');
    if (!truth.culprits.every((x) => c.solution.who!.includes(x)) || c.solution.who.some((x) => !truth.culprits.includes(x))) {
      err(`"who" çözümü (${a}) truth.culprits (${b}) ile aynı değil.`);
    }
  }
  if (!c.questions.some((q) => q.kind === 'evidence')) warn('Kanıt sorusu (kind: "evidence") yok.');
  if (total !== 100) warn(`Soru puanları toplamı ${total} (100 önerilir).`);

  // Saat dengesi
  const leadHours = c.leads.reduce((s, l) => s + l.hours, 0);
  const ratio = leadHours / c.meta.hoursBudget;
  if (ratio < 1.3 || ratio > 2.2) warn(`İzlerin toplam saati (${leadHours}) / bütçe (${c.meta.hoursBudget}) = ${ratio.toFixed(2)} (≈1,6 önerilir).`);
  if (c.meta.targetHours >= c.meta.hoursBudget) err('targetHours, hoursBudget değerinden küçük olmalı.');

  // Belge türü çeşitliliği
  const kinds = new Set(c.evidence.map((e) => e.doc.kind));
  if (kinds.size < 9) warn(`Belge türü çeşitliliği ${kinds.size} (en az 9 önerilir).`);

  return {
    errors,
    warnings,
    stats: {
      bölüm: c.acts.length,
      kanıt: c.evidence.length,
      iz: c.leads.length,
      'iz saati': leadHours,
      bütçe: c.meta.hoursBudget,
      hedef: c.meta.targetHours,
      karakter: c.characters.length,
      şüpheli: suspects.size,
      görsel: images.size,
      'belge türü': kinds.size,
      'son bölüm öncesi kanıt': `${early.evidence.size}/${c.evidence.length}`,
      sorgu: c.interviews.length,
      'sorgu sorusu': c.interviews.reduce((n, i) => n + i.questions.length, 0),
    },
  };
}
