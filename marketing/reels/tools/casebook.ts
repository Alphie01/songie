import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { C1Props } from '../src/reels/casebook/C1Case.js';
import { ffmpegBin } from './sfx.js';

/**
 * Casebook reel data from a real case file (games/detective/server/cases/<slug>/case.json): cover, first act photo
 * and narrator, the act's first photo and report, six suspects, the first question. Nothing from the solution is
 * shown; it is only read so the teammates' board marks never land on the real culprit.
 */
type Doc = { kind: string; image?: string; tag?: string; agency?: string; heading?: string; sections?: { text: string }[]; caption?: string };
type CaseFile = {
  meta: { title: string; subtitle: string; genre: string; teaser: string };
  characters: { id: string; name: string; portrait?: string; suspect?: boolean }[];
  evidence: { id: string; title: string; timeline?: { at: string }[]; doc: Doc }[];
  acts: { title: string; scene: string; sceneImage?: string; evidence: string[] }[];
  questions: { prompt: string }[];
  solution: Record<string, string[]>;
};

/** One hand-picked line per case: the turn in the teaser that makes it a case (≤ 96 chars, no spoilers). */
export const CASE_TWISTS: Record<string, string> = {
  'ankara-ihalesi': 'Ama binanın arka kapısı gece yarısı içeriden açılmış.',
  'ayvalik-miras': 'Fabrikada beş kamera var; ama o yollardan birini hiçbiri görmüyor.',
  'bodrum-zehir': 'Ama kanında, hiç kullanmadığı bir kalp ilacı çıktı.',
  'eskisehir-laboratuvar': 'Kapının iç kolu boşta dönüyor. Başvuru 23:41’de onun hesabından gitmiş.',
  'gaziantep-kuyumcu': 'Kasa geçerli bir kodla açılmış. O kodu bilen bir avuç insan var.',
  'izmir-santaj': 'Şantajcı sudan çıkarıldı. Ama hesabı bir saat sonra bir mesaj daha attı.',
  'kapadokya-kayip': 'Gece sevgilisine tek bir mesaj attı: “Bitti.” Annesi inanmıyor.',
  'koza-han-yangini': 'Sigortası geçen ay dört katına çıkmış bir dükkân. Herkesin bir nedeni var.',
  'mardin-kacakcilik': 'Sahteliği fark eden arkeolog, savcılığa gitmeden önceki gece tekerini kaybetti.',
  'mersin-limani': 'Bekçi onu mendireğe tek başına yürürken gördüğüne yemin ediyor.',
  'pera-gecesi': 'Çerçeve aynı, duvar aynı, alarm susmuş. Ama tablo başka.',
  'sahnede-olum': 'Sahne arkasında kimsenin takmadığı bir ara kablo bulundu.',
  'uludag-firtina': 'Köşkün çevresindeki taze karda kendi ayak izinden başka iz yok.',
  'yalida-son-aksam': 'Ama ambulans doktoru gözlerdeki minik kanamaları not etti.',
  'yayla-sisi': 'Herkes kaza diyor. Ama o gece teleferik kimsenin kabul etmediği iki sefer yaptı.',
};

/**
 * First sentence: ends at . ! ? … followed by a capital (or a quote) or the end, so "16.40", "34. kilometre" and
 * "Dr. Cemal" do not cut it.
 */
export function firstSentence(text: string): string {
  const t = text.trim().split('\n')[0]!.trim();
  const re = /[.!?…]["”’]?(?=\s+["“]?[A-ZÇĞİÖŞÜ]|$)/gu;
  for (let m = re.exec(t); m; m = re.exec(t)) {
    const before = t.slice(0, m.index).split(/\s/).at(-1) ?? '';
    if (/^(Dr|Prof|Doç|Av|Yrd|No|Sn)$/u.test(before)) continue;
    return t.slice(0, m.index + m[0].length).trim();
  }
  return t;
}

/** "2026-09-11T21:29" → "11.09.2026 21:29". */
export function camStamp(at: string | undefined): string {
  const m = at?.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})/);
  return m ? `${m[3]}.${m[2]}.${m[1]} ${m[4]}` : '';
}

/** Split a paragraph after its first sentence; both parts trimmed to stay short on the paper. */
export function leadRest(text: string, max = 150): { lead: string; rest: string } {
  const lead = firstSentence(text);
  const after = text.slice(text.indexOf(lead) + lead.length).trim().split('\n')[0] ?? '';
  const rest = firstSentence(after);
  return { lead, rest: lead.length + rest.length > max ? '' : rest };
}

/** Three board marks on non-culprits: two "şüpheli", one "temiz" (deterministic per case). */
export function boardMarks(suspectIds: string[], culprits: string[], seed: number): C1Props['marks'] {
  const free = suspectIds.map((id, i) => ({ id, i })).filter((s) => !culprits.includes(s.id));
  const pick = free.map((_, k) => free[(k + seed) % free.length]!);
  const [a, b, d] = pick;
  if (!a || !b || !d) throw new Error('Panoya işaret koymak için yeterli şüpheli yok');
  return [
    { i: a.i, mark: 'suspect' },
    { i: b.i, mark: 'clear' },
    { i: d.i, mark: 'suspect' },
  ];
}

/** Where the narrator's first sentence ends (seconds): the first pause after it could plausibly be read. */
export function narrationEnd(file: string, chars: number): number {
  const r = spawnSync(ffmpegBin(), ['-hide_banner', '-i', file, '-t', '8', '-af', 'silencedetect=n=-35dB:d=0.35', '-f', 'null', '-'], { encoding: 'utf8' });
  const starts = [...(r.stderr ?? '').matchAll(/silence_start: ([\d.]+)/g)].map((m) => Number(m[1]));
  // a comma pause can come first; the narrator reads at most ~20 characters a second
  return starts.find((t) => t >= Math.max(0.8, chars / 20)) ?? 0;
}

const hashSlug = (s: string) => [...s].reduce((h, ch) => (h * 31 + ch.codePointAt(0)!) >>> 0, 7);

/** Props for C1Case from a case folder; `pub` is the folder's path inside public/ ("cases/<slug>"). */
export function caseProps(dir: string, slug: string, opts: { music: string; musicFrom: number; solver: string; narrationSec?: number }): C1Props {
  const d = JSON.parse(fs.readFileSync(path.join(dir, 'case.json'), 'utf8')) as CaseFile;
  const pub = `cases/${slug}`;
  const img = (key: string | undefined) => {
    if (!key || !fs.existsSync(path.join(dir, 'img', `${key}.webp`))) return '';
    return `${pub}/img/${key}.webp`;
  };
  const act = d.acts[0]!;
  const evs = act.evidence.map((id) => d.evidence.find((e) => e.id === id)).filter((e): e is CaseFile['evidence'][number] => !!e);
  const photoEv = evs.find((e) => e.doc.kind === 'photo' && img(e.doc.image)) ?? evs.find((e) => img(e.doc.image));
  const reportEv = evs.find((e) => e.doc.kind === 'report' && e.doc.sections?.length);
  if (!photoEv || !reportEv) throw new Error(`${slug}: ilk bölümde fotoğraf ya da rapor yok`);
  const suspects = d.characters.filter((ch) => ch.suspect && img(ch.portrait)).slice(0, 6);
  if (suspects.length < 6) throw new Error(`${slug}: portreli 6 şüpheli yok`);
  const narr = path.join(dir, 'audio', 'act-1.mp3');
  const line = firstSentence(act.scene);
  const sec = opts.narrationSec ?? (fs.existsSync(narr) ? narrationEnd(narr, line.length) : 0);
  const useNarr = sec > 0.8 && sec <= 4.2 && line.length <= 110;
  const camKey = photoEv.doc.image ?? '';
  const twist = CASE_TWISTS[slug] ?? firstSentence(d.meta.teaser.split('\n').filter(Boolean).at(-1) ?? d.meta.teaser);
  return {
    title: d.meta.title,
    subtitle: d.meta.subtitle,
    genre: d.meta.genre,
    cover: img('cover'),
    act: {
      label: `Bölüm 1 / ${d.acts.length}: ${act.title}`,
      image: img(act.sceneImage) || img('cover'),
      line: useNarr ? line : line.slice(0, 110),
      narration: useNarr ? `${pub}/audio/act-1.mp3` : '',
      narrationSec: useNarr ? Math.round(sec * 100) / 100 : 2.5,
    },
    twist,
    photo: {
      image: img(camKey),
      title: photoEv.title,
      stamp: camKey.startsWith('cam-') ? camStamp(photoEv.timeline?.[0]?.at) : (photoEv.doc.tag ?? ''),
      cam: camKey.startsWith('cam-'),
    },
    report: {
      agency: (reportEv.doc.agency ?? '').split('—')[0]!.replace(/^T\.C\.\s*/, '').trim(),
      heading: (reportEv.doc.heading ?? reportEv.title).split('—')[0]!.trim(),
      ...leadRest(reportEv.doc.sections![0]!.text),
    },
    suspects: suspects.map((s) => ({ name: s.name, image: img(s.portrait) })),
    marks: boardMarks(
      suspects.map((s) => s.id),
      [...(d.solution.who ?? []), ...(d.solution.planner ?? [])],
      hashSlug(slug),
    ),
    question: d.questions[0]!.prompt,
    music: opts.music,
    musicFrom: opts.musicFrom,
    solver: opts.solver,
  };
}
