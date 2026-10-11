/**
 * Oyuncunun göreceği her şeyi (gerçek ve çözüm HARİÇ) okunur metne döker:
 *   pnpm --filter @songie/detective case:export <slug>
 * Çıktı: cases/<slug>/.export/player.md (bölüm bölüm) — kör çözüm testi bunu okur.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { CaseDoc, CaseFile, Evidence } from '../shared/case-schema.js';
import { DEFAULT_CASES_DIR, readCaseFile } from '../server/library.js';
import { reachable } from '../server/validate.js';

const slug = process.argv[2];
if (!slug) {
  console.error('Kullanım: case:export <slug>');
  process.exit(1);
}
const dir = path.join(DEFAULT_CASES_DIR, slug);
const c: CaseFile = readCaseFile(dir);
const name = (id: string) => c.characters.find((x) => x.id === id)?.name ?? id;
const imgAlt = (key: string) => c.images[key]?.alt ?? '(görsel)';

function docText(d: CaseDoc): string {
  switch (d.kind) {
    case 'statement':
      return [
        `İFADE TUTANAĞI — ${name(d.person)} (${d.capacity}) · ${d.datetime} · ${d.place} · Alan: ${d.takenBy}`,
        ...d.qa.map((x) => `SORULDU: ${x.q}\nCEVABEN: ${x.a}`),
        d.body ?? '',
      ].join('\n');
    case 'report':
      return [`${d.agency} · ${d.docNo} · ${d.datetime}`, `## ${d.heading}`, ...d.sections.map((s) => `### ${s.title}\n${s.text}`), `İmza: ${d.signature}`].join('\n');
    case 'phoneLog':
      return [`HTS KAYDI — ${d.subscriber} (${d.number}) · ${d.period}`, ...d.rows.map((r) => `${r.datetime} | ${r.type} | ${r.other} | ${r.duration ?? ''} | ${r.tower ?? ''}`)].join('\n');
    case 'messages':
      return [`MESAJLAR (${d.source}) — ${d.owner} ↔ ${d.with}`, ...d.messages.map((m) => `[${m.time}] ${m.from === 'me' ? d.owner : m.from === 'system' ? 'sistem' : (m.name ?? d.with)}: ${m.deleted ? '(silinmiş) ' : ''}${m.text}`)].join('\n');
    case 'email':
      return [`E-POSTA · Kimden: ${d.from} · Kime: ${d.to}${d.cc ? ` · Bilgi: ${d.cc}` : ''} · ${d.date}`, `Konu: ${d.subject}`, d.body, d.attachments.length ? `Ekler: ${d.attachments.join(', ')}` : ''].join('\n');
    case 'receipt':
      return [`FİŞ — ${d.merchant}, ${d.address} · ${d.datetime}`, ...d.items.map((i) => `${i.qty} x ${i.name} — ${i.price.toFixed(2)} TL`), `Toplam: ${d.items.reduce((s, i) => s + i.qty * i.price, 0).toFixed(2)} TL · ${d.payment}`, d.footer ?? ''].join('\n');
    case 'bank':
      return [`HESAP DÖKÜMÜ — ${d.bank} · ${d.holder} · ${d.iban} · ${d.period}`, ...d.rows.map((r) => `${r.date} | ${r.desc} | ${r.amount.toFixed(2)} | ${r.balance?.toFixed(2) ?? ''}`)].join('\n');
    case 'letter':
      return [`${d.hand === 'handwritten' ? 'EL YAZISI' : 'BASILI'} ${d.condition ? `(${d.condition})` : ''} ${d.date ?? ''}`, d.salutation ?? '', d.body, d.signoff ?? ''].join('\n');
    case 'newspaper':
      return [`${d.paper} · ${d.date}`, `# ${d.headline}`, d.subhead ?? '', d.image ? `[Fotoğraf: ${imgAlt(d.image)}]` : '', d.body].join('\n');
    case 'photo':
      return [`FOTOĞRAF${d.cctv ? ` — ${d.cctv.camera} ${d.cctv.timestamp}` : ''}${d.tag ? ` · ${d.tag}` : ''}`, `Görüntü: ${imgAlt(d.image)}`, `Not: ${d.caption}`].join('\n');
    case 'accessLog':
      return [`GEÇİŞ KAYDI — ${d.system} · ${d.site} · ${d.period}`, ...d.rows.map((r) => `${r.time} | ${r.card} | ${r.holder} | ${r.door} | ${r.result}`)].join('\n');
    case 'ticket':
      return [`${d.title}${d.serial ? ` · ${d.serial}` : ''}`, ...d.fields.map((f) => `${f.label}: ${f.value}`)].join('\n');
    case 'table':
      return [`## ${d.heading}`, d.note ?? '', d.columns.join(' | '), ...d.rows.map((r) => r.join(' | '))].join('\n');
    case 'audio':
      return [
        `SES KAYDI (${d.variant}) — ${d.source} · ${d.datetime}${d.ambience ? ` · [arka plan: ${d.ambience}]` : ''}`,
        ...d.lines.map((l) => `${l.pause ? `[${l.pause} sn sessizlik] ` : ''}${l.character ? name(l.character) : (l.name ?? '?')}${l.delivery ? ` (${l.delivery})` : ''}: ${l.text}`),
      ].join('\n');
    case 'floorplan': {
      const loc = c.locations.find((l) => l.id === d.location);
      const p = loc?.plan;
      return [`KROKİ — ${loc?.name ?? d.location}: ${d.caption}`, ...(p ? [
        `Bölümler: ${p.rooms.map((r) => `${r.label} (${r.x},${r.y} ${r.w}x${r.h})`).join('; ')}`,
        `Kapılar: ${p.doors.map((x) => `${x.label ?? 'kapı'} (${x.x},${x.y})`).join('; ')}`,
        `Pencereler: ${p.windows.map((x) => `(${x.x},${x.y})`).join('; ')}`,
        `İşaretler: ${p.markers.map((m) => `${m.label} [${m.kind}] (${m.x},${m.y})`).join('; ')}`,
      ] : [])].join('\n');
    }
  }
}

const evText = (e: Evidence) => `#### [${e.id}] ${e.title}\n_${e.summary}_\n\n${docText(e.doc)}\n`;
const evById = new Map(c.evidence.map((e) => [e.id, e]));
const out: string[] = [];
out.push(`# ${c.meta.title}\n${c.meta.subtitle} · ${c.meta.genre} · ${c.meta.difficulty}\n\n${c.meta.teaser}\n`);
out.push(`Soruşturma saati bütçesi: ${c.meta.hoursBudget} (hedef ${c.meta.targetHours})\n`);
out.push('## Karakterler');
for (const ch of c.characters) out.push(`- **${ch.name}**${ch.age ? `, ${ch.age}` : ''} — ${ch.role}; ${ch.relation}${ch.victim ? ' (KURBAN)' : ''}${ch.suspect ? ' (ŞÜPHELİ)' : ''}. ${ch.summary}${ch.portrait ? ` [Portre: ${imgAlt(ch.portrait)}]` : ''}`);
out.push('\n## Mekânlar');
for (const l of c.locations) out.push(`- **${l.name}** — ${l.description}${l.image ? ` [Görsel: ${imgAlt(l.image)}]` : ''}`);

const leadById = new Map(c.leads.map((l) => [l.id, l]));
const parts: string[][] = [];
let prevLeads = new Set<string>();
let prevIv = new Set<string>();
c.acts.forEach((a, i) => {
  const part: string[] = [];
  part.push(`\n\n# BÖLÜM ${i + 1}: ${a.title}\n\n${a.scene}\n${a.sceneImage ? `[Sahne görseli: ${imgAlt(a.sceneImage)}]\n` : ''}`);
  if (a.advance) part.push(`(Geçiş: ${a.advance.leads.join(', ') || '—'} izleri açılınca ya da bu bölümde ${a.advance.hours} saat harcanınca.)`);
  part.push('\n### Bölüm başında gelen kanıtlar');
  for (const id of a.evidence) part.push(evText(evById.get(id)!));
  part.push('\n### Bölüm başında keşfedilen izler');
  for (const id of a.leads) {
    const l = leadById.get(id)!;
    part.push(`- [${l.id}] ${l.title} (${l.hours} sa) — ${l.description}`);
  }
  if (a.hints.length) part.push(`\n### İpuçları (puan cezalı)\n${a.hints.map((h, j) => `${j + 1}. ${h}`).join('\n')}`);
  // Bu bölümde ilk kez erişilebilen izler ve açtıkları
  const now = reachable(c, i).leads;
  const fresh = c.leads.filter((l) => now.has(l.id) && !prevLeads.has(l.id));
  prevLeads = now;
  part.push(`\n### Bu bölümde açılabilen izler ve getirdikleri`);
  for (const l of fresh) {
    part.push(`\n#### İz [${l.id}] ${l.title} (${l.hours} sa)\n${l.description}\nSonuç: ${l.outcome}\nYeni izler: ${l.leadsTo.join(', ') || '—'}\n`);
    for (const id of l.unlocks) part.push(evText(evById.get(id)!));
  }
  // Bu bölümde açılabilen sorgular
  const ivNow = reachable(c, i).interviews;
  const freshIv = c.interviews.filter((iv) => ivNow.has(iv.id) && !prevIv.has(iv.id));
  prevIv = ivNow;
  if (freshIv.length) part.push(`\n### Bu bölümde açılabilen sorgular`);
  for (const iv of freshIv) {
    part.push(`\n#### Sorgu [${iv.id}] ${iv.title} — ${name(iv.character)} · ${iv.place}\n_${iv.intro}_\n`);
    for (const q of iv.questions) {
      const cond = [q.after.length ? `önce: ${q.after.join(', ')}` : '', q.needs.length ? `belge gerekir: ${q.needs.join(', ')}` : ''].filter(Boolean).join('; ');
      const out = [q.unlocks.length ? `belge açar: ${q.unlocks.join(', ')}` : '', q.leadsTo.length ? `iz açar: ${q.leadsTo.join(', ')}` : ''].filter(Boolean).join('; ');
      part.push(`- [${q.id}]${cond ? ` (${cond})` : ''} SORU: ${q.ask}\n  CEVAP: ${q.answer}${out ? `\n  → ${out}` : ''}`);
      for (const id of q.unlocks) if (evById.has(id)) part.push(evText(evById.get(id)!));
    }
    for (const x of iv.confront) {
      const out = [x.unlocks.length ? `belge açar: ${x.unlocks.join(', ')}` : '', x.leadsTo.length ? `iz açar: ${x.leadsTo.join(', ')}` : ''].filter(Boolean).join('; ');
      part.push(`- BELGE GÖSTERİLİRSE [${x.evidence}]: ${x.answer}${out ? `\n  → ${out}` : ''}`);
      for (const id of x.unlocks) if (evById.has(id)) part.push(evText(evById.get(id)!));
    }
    part.push(`- Başka bir belge gösterilirse: ${iv.deflect.join(' / ')}`);
  }
  parts.push(part);
});
const head = [...out];
out.push(...parts.flat());
out.push('\n\n# SUÇLAMA FORMU');
for (const q of c.questions) {
  out.push(`- [${q.id}] (${q.points} puan, ${q.kind}) ${q.prompt}${q.options.length ? `\n  ${q.options.map((o) => `${o.id}: ${o.text}`).join(' / ')}` : ''}`);
}
const outDir = path.join(dir, '.export');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'player.md'), out.join('\n'));
// Son bölümsüz sürüm: "son kanıtı görmeden çözülebilir mi" testi için.
const form = out.slice(out.indexOf('\n\n# SUÇLAMA FORMU'));
fs.writeFileSync(path.join(outDir, 'player-without-last-act.md'), [...head, ...parts.slice(0, -1).flat(), ...form].join('\n'));
console.log(`Yazıldı: ${path.join(outDir, 'player.md')} (${Math.round(out.join('\n').length / 1024)} KB)`);
