/**
 * Vaka dosyası biçimi. Her vaka `server/cases/<slug>/case.json` (+ `img/<anahtar>.webp`).
 *
 * Katmanlar:
 *  - meta, characters, locations, images: oyuncuya açık dünya bilgisi
 *  - evidence, leads, acts, hints: oyun sırasında kademeli açılır
 *  - questions: suçlama formu (cevaplar `solution` içinde, oyuncuya gitmez)
 *  - facts, truth, solution: gerçek; yalnızca sonuç ekranında (facts hiç) gösterilir
 *
 * Yazım kuralları: docs/dedektif-yazim.md
 */
import { z } from 'zod';

const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'kimlik küçük harf, rakam ve tire olmalı');
const text = z.string().min(1);
/** Paragraflar boş satırla (\n\n) ayrılır. */
const prose = z.string().min(1);
/** "21:40" ya da "14.03.2025 21:40" gibi; sıralama için `at` kullanılır. */
const clock = z.string().min(1);

export const GENRES = [
  'cinayet',
  'hırsızlık',
  'dolandırıcılık',
  'kayıp',
  'şantaj',
  'zehirlenme',
  'sahtecilik',
  'kundaklama',
  'kaçakçılık',
  'rüşvet',
] as const;

export const imageSchema = z.object({
  kind: z.enum(['cover', 'portrait', 'scene', 'object', 'cctv', 'location', 'document-photo']),
  /** İngilizce, metinsiz fotoğraf tarifi (yazı, tabela, rakam istenmez). Stil öneki araç tarafından eklenir. */
  prompt: z.string().min(20),
  aspect: z.enum(['square', 'landscape', 'portrait']).default('landscape'),
  /** Görseldeki her şeyin oyuncuya açık olduğu kısa Türkçe tarif (görsel yoksa yer tutucu olarak gösterilir). */
  alt: text,
});

/** Seslendirme için ses tarifi (ses kanıtlarında bu karakterin sesi sabit kalır). */
export const voiceSchema = z.object({
  gender: z.enum(['male', 'female']),
  age: z.enum(['young', 'adult', 'old']),
  /** Türkçe konuşma tarzı: "İstanbul ağzı, sakin, kendinden emin", "Karadeniz şivesi, telaşlı". */
  style: z.string().optional(),
});

export const characterSchema = z.object({
  id,
  name: text,
  age: z.number().int().min(1).max(110).optional(),
  /** Meslek / konum: "Yalının kâhyası", "Kurbanın ortağı". */
  role: text,
  /** Kurbanla/olayla ilişkisi, oyuncunun dosyadan bildiği kadarıyla. */
  relation: text,
  /** Dosyadaki açık özet (2–4 cümle). Sır içermez. */
  summary: prose,
  portrait: id.optional(),
  victim: z.boolean().optional(),
  /** Şüpheliler panosunda ve "Kim?" sorusunda görünür. */
  suspect: z.boolean().default(false),
  /** Ses kanıtlarında konuşuyorsa zorunlu. */
  voice: voiceSchema.optional(),
});

export const floorPlanSchema = z.object({
  /** Izgara birimi; çizim bu ölçüye göre ölçeklenir. */
  width: z.number().positive(),
  height: z.number().positive(),
  rooms: z
    .array(
      z.object({
        id,
        label: text,
        x: z.number(),
        y: z.number(),
        w: z.number().positive(),
        h: z.number().positive(),
        /** Avlu, bahçe gibi açık alanlar soluk çizilir. */
        outdoor: z.boolean().optional(),
      }),
    )
    .min(1),
  doors: z.array(z.object({ x: z.number(), y: z.number(), vertical: z.boolean().optional(), label: z.string().optional() })).default([]),
  windows: z.array(z.object({ x: z.number(), y: z.number(), vertical: z.boolean().optional() })).default([]),
  markers: z.array(z.object({ x: z.number(), y: z.number(), label: text, kind: z.enum(['body', 'camera', 'item', 'stain', 'note']).default('note') })).default([]),
});

export const locationSchema = z.object({
  id,
  name: text,
  description: prose,
  image: id.optional(),
  plan: floorPlanSchema.optional(),
});

export const timelineEntrySchema = z.object({
  /** Sıralama anahtarı: "2025-03-14T21:40". */
  at: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  text: text,
});

// ---------- Belge şablonları ----------

const statementDoc = z.object({
  kind: z.literal('statement'),
  /** İfadeyi veren kişi (karakter kimliği). */
  person: id,
  capacity: z.enum(['tanık', 'şüpheli', 'müşteki', 'bilirkişi']),
  takenBy: text,
  place: text,
  datetime: clock,
  /** Soru-cevap biçimi; yoksa `body` serbest anlatım. */
  qa: z.array(z.object({ q: text, a: text })).default([]),
  body: prose.optional(),
});

const reportDoc = z.object({
  kind: z.literal('report'),
  variant: z.enum(['scene', 'autopsy', 'lab', 'police', 'expert', 'insurance', 'medical', 'internal']),
  agency: text,
  docNo: text,
  datetime: clock,
  heading: text,
  sections: z.array(z.object({ title: text, text: prose })).min(1),
  signature: text,
});

const phoneLogDoc = z.object({
  kind: z.literal('phoneLog'),
  subscriber: text,
  number: text,
  period: text,
  rows: z
    .array(
      z.object({
        datetime: clock,
        type: z.enum(['giden arama', 'gelen arama', 'cevapsız', 'giden SMS', 'gelen SMS', 'veri']),
        other: text,
        duration: z.string().optional(),
        /** Baz istasyonu / konum. */
        tower: z.string().optional(),
      }),
    )
    .min(1),
});

const messagesDoc = z.object({
  kind: z.literal('messages'),
  /** Telefonun sahibi (sağda görünen taraf). */
  owner: text,
  /** Karşı taraf adı ya da grup adı. */
  with: text,
  source: text,
  messages: z
    .array(
      z.object({
        from: z.enum(['me', 'them', 'system']),
        /** Grup sohbetinde konuşanın adı. */
        name: z.string().optional(),
        time: clock,
        text: text,
        deleted: z.boolean().optional(),
      }),
    )
    .min(1),
});

const emailDoc = z.object({
  kind: z.literal('email'),
  from: text,
  to: text,
  cc: z.string().optional(),
  date: clock,
  subject: text,
  body: prose,
  attachments: z.array(text).default([]),
});

const receiptDoc = z.object({
  kind: z.literal('receipt'),
  merchant: text,
  address: text,
  datetime: clock,
  items: z.array(z.object({ name: text, qty: z.number().positive().default(1), price: z.number() })).min(1),
  payment: text,
  footer: z.string().optional(),
});

const bankDoc = z.object({
  kind: z.literal('bank'),
  bank: text,
  holder: text,
  iban: text,
  period: text,
  rows: z.array(z.object({ date: clock, desc: text, amount: z.number(), balance: z.number().optional() })).min(1),
});

const letterDoc = z.object({
  kind: z.literal('letter'),
  /** El yazısı (not, günlük, mektup) ya da daktilo/basılı. */
  hand: z.enum(['handwritten', 'typed']),
  date: z.string().optional(),
  salutation: z.string().optional(),
  body: prose,
  signoff: z.string().optional(),
  /** Yırtık, yanık, kahve lekeli gibi durum notu (görsel efekt + açıklama). */
  condition: z.string().optional(),
});

const newspaperDoc = z.object({
  kind: z.literal('newspaper'),
  paper: text,
  date: text,
  headline: text,
  subhead: z.string().optional(),
  body: prose,
  image: id.optional(),
});

const photoDoc = z.object({
  kind: z.literal('photo'),
  image: id,
  caption: text,
  /** Güvenlik kamerası karesi: üstüne zaman damgası ve kamera adı basılır. */
  cctv: z.object({ camera: text, timestamp: text }).optional(),
  /** Olay yeri fotoğrafı numarası / delil etiketi. */
  tag: z.string().optional(),
});

const accessLogDoc = z.object({
  kind: z.literal('accessLog'),
  system: text,
  site: text,
  period: text,
  rows: z.array(z.object({ time: clock, card: text, holder: text, door: text, result: z.enum(['GEÇİŞ', 'RET', 'ALARM', 'ÇIKIŞ']) })).min(1),
});

const ticketDoc = z.object({
  kind: z.literal('ticket'),
  variant: z.enum(['bus', 'flight', 'train', 'ferry', 'parking', 'event', 'pawn', 'hotel', 'other']),
  title: text,
  fields: z.array(z.object({ label: text, value: text })).min(1),
  serial: z.string().optional(),
});

const tableDoc = z.object({
  kind: z.literal('table'),
  heading: text,
  note: z.string().optional(),
  columns: z.array(text).min(1),
  rows: z.array(z.array(z.string())).min(1),
});

/**
 * Ses kaydı: telefon dinlemesi, ihbar hattı, telesekreter, sesli mesaj, gizli kayıt, sorgu kaydı.
 * Ses dosyası `audio/<kanıt kimliği>.mp3` olarak araçla üretilir; oyuncu dinler, dökümü de açabilir.
 */
const audioDoc = z.object({
  kind: z.literal('audio'),
  variant: z.enum(['phone-call', 'emergency-call', 'voicemail', 'voice-note', 'recording', 'interview']),
  /** Kaydın kaynağı: "Hat dinleme kaydı (İstanbul 4. Sulh Ceza Hâkimliği kararı)", "155 Polis İmdat kaydı". */
  source: text,
  datetime: clock,
  lines: z
    .array(
      z.object({
        /** Konuşan karakter (sesi `voice` alanından gelir). Yoksa `name` + `voice` verilir (operatör, yabancı). */
        character: id.optional(),
        name: z.string().optional(),
        voice: voiceSchema.optional(),
        text: text,
        /** Söyleyiş yönergesi: "fısıldayarak", "ağlamaklı", "öfkeyle, hızlı". */
        delivery: z.string().optional(),
        /** Bu satırdan önce sessizlik (sn). */
        pause: z.number().min(0).max(8).optional(),
      }),
    )
    .min(1),
  /** Arka plan sesi notu (dökümde köşeli parantezle gösterilir): "vapur düdüğü", "yağmur". */
  ambience: z.string().optional(),
});

const floorplanDoc = z.object({
  kind: z.literal('floorplan'),
  location: id,
  caption: text,
});

export const docSchema = z.discriminatedUnion('kind', [
  statementDoc,
  reportDoc,
  phoneLogDoc,
  messagesDoc,
  emailDoc,
  receiptDoc,
  bankDoc,
  letterDoc,
  newspaperDoc,
  photoDoc,
  accessLogDoc,
  ticketDoc,
  tableDoc,
  floorplanDoc,
  audioDoc,
]);
export type CaseDoc = z.infer<typeof docSchema>;
export type DocKind = CaseDoc['kind'];

export const evidenceSchema = z.object({
  id,
  /** Kanıt dolabında görünen ad: "Kapıcı Hüseyin Demir'in ifadesi". */
  title: text,
  /** Listede başlığın altındaki tek cümle; sonuç vermez, ne olduğunu söyler. */
  summary: text,
  doc: docSchema,
  /** Bu belgeden çıkarılabilen gerçekler (facts). Denetim ve sonuç ekranı için; oyuncuya gitmez. */
  reveals: z.array(id).default([]),
  /** Açılınca panodaki zaman çizelgesine eklenen, belgede açıkça yazan olaylar. */
  timeline: z.array(timelineEntrySchema).default([]),
  /** Belgede adı geçen kişiler (panoda bağlantı). */
  people: z.array(id).default([]),
});

export const leadSchema = z.object({
  id,
  /** Emir kipinde, oyuncunun seçtiği eylem: "Kapıcıyla yeniden görüş". */
  title: text,
  /** Neden mantıklı olduğu, 1–2 cümle (sonucu söylemez). */
  description: text,
  /** Soruşturma saati maliyeti. */
  hours: z.number().int().min(1).max(8),
  unlocks: z.array(id).default([]),
  /** Bu iz açılınca keşfedilen yeni izler. */
  leadsTo: z.array(id).default([]),
  /** Açılınca gösterilen kısa sonuç notu ("Kapıcı ilk ifadesini değiştirdi."). */
  outcome: text,
  /** Daha erken keşfedilse de en erken bu bölümde (1'den) açılabilir; o zamana kadar listede görünmez. */
  minAct: z.number().int().min(1).max(5).optional(),
  /** Bu iz açılınca başlayan sorgular (interviews). */
  interviews: z.array(id).default([]),
  /**
   * İzi doğuran belgeler: bunlardan biri dosyadayken biri belgeyi OKUYUNCA iz keşfedilir
   * ("İfadede adı geçen bahçıvanı bul" ← kâhyanın ifadesi). Oyuncu bilmediği bir şeyi açmasın.
   */
  from: z.array(id).default([]),
});

/** Sorguda bir cevabın sonuçları (soru ya da belge gösterme). */
const outcomeFields = {
  /** Cevap üzerine dosyaya giren belgeler (tanığın verdiği fiş, gösterdiği mesaj…). */
  unlocks: z.array(id).default([]),
  /** Cevap üzerine keşfedilen izler. */
  leadsTo: z.array(id).default([]),
  /** Cevabın ortaya koyduğu gerçekler (denetim için; oyuncuya gitmez). */
  reveals: z.array(id).default([]),
  /** Kilit an: karakterin sesiyle seslendirilir (yalnızca itiraf, kırılma, kritik bilgi). */
  voiced: z.boolean().default(false),
  /** Seslendirmede söyleyiş yönergesi ("yutkunarak", "öfkeyle"). */
  delivery: z.string().optional(),
};

/**
 * Sorgu: oyuncular listeden soru seçer ya da dosyadaki bir belgeyi gösterir; cevaplar yazarın
 * hazırladığı metinlerdir. Sorulanlar ortak bir sorgu tutanağında herkese görünür.
 */
export const interviewSchema = z.object({
  id,
  /** Sorgulanan karakter. */
  character: id,
  /** "Kâhya Rıza Yalçın, ikinci görüşme". */
  title: text,
  place: text,
  /** Görüşme açılırken okunan kısa sahne: oda, kişinin tavrı (2–4 cümle). */
  intro: prose,
  questions: z
    .array(
      z.object({
        id,
        /** Oyuncunun sorusu: kısa, doğal, komiserin ağzından ("O gece saat kaçta çıktınız?"). */
        ask: text,
        /** Karakterin cevabı (yalan da olabilir; yalanlar truth.characters[].lies ile tutarlı). */
        answer: prose,
        /** Bu soru ancak şu sorular sorulduktan sonra listede görünür. */
        after: z.array(id).default([]),
        /** Bu soru ancak şu belgeler dosyadayken görünür. */
        needs: z.array(id).default([]),
        ...outcomeFields,
      }),
    )
    .min(4),
  /** Belge gösterme: belirli bir belge gösterilince verilen tepki (genelde savunmanın çöktüğü an). */
  confront: z.array(z.object({ evidence: id, answer: prose, ...outcomeFields })).default([]),
  /** Tepkisi yazılmamış bir belge gösterilince sırayla kullanılan kaçamak cevaplar. */
  deflect: z.array(text).min(2),
});

export const actSchema = z.object({
  title: text,
  /** Bölüm açılış sahnesi: anlatı (anlatıcı bunu seslendirir; sesli okunmaya uygun yaz). */
  scene: prose,
  sceneImage: id.optional(),
  /** Bölüm başında dosyaya giren kanıtlar. */
  evidence: z.array(id).default([]),
  /** Bölüm başında keşfedilen izler. */
  leads: z.array(id).default([]),
  /** Bölüm başında açılan sorgular. */
  interviews: z.array(id).default([]),
  /** Amirden ipucu (bölüm başına en fazla 2), en hafiften en yöne vericiye. */
  hints: z.array(text).max(3).default([]),
  /**
   * Sonraki bölüme geçiş: `leads` içindeki izlerin hepsi açılınca ya da bu bölümde keşfedilen
   * izlere `hours` saat harcanınca (hangisi önce; önceki bölümlerden kalan izler sayılmaz).
   * Açılabilir iz kalmazsa da geçilir. Son bölümde yok.
   */
  advance: z.object({ leads: z.array(id).default([]), hours: z.number().int().positive() }).optional(),
});

export const questionSchema = z.object({
  id,
  prompt: text,
  /** suspect: şüphelilerden seç; choice: seçeneklerden; evidence: açılmış kanıtlardan. */
  kind: z.enum(['suspect', 'choice', 'evidence']),
  options: z.array(z.object({ id, text })).default([]),
  points: z.number().int().min(1).max(50),
});

export const factSchema = z.object({ id, text });

export const truthSchema = z.object({
  /** Fail(ler). */
  culprits: z.array(id).min(1),
  /** "Gerçekte ne oldu": sonuç ekranında okunan anlatı. */
  story: prose,
  /** Gerçek, dakika dakika zaman çizelgesi. */
  timeline: z.array(timelineEntrySchema).min(5),
  characters: z.array(
    z.object({
      id,
      secret: text,
      /** Olay saatinde gerçekte nerede/ne yapıyordu. */
      whereabouts: text,
      /** İfadesindeki yalanlar (yoksa boş). */
      lies: z.array(text).default([]),
    }),
  ),
  /** Çözümü kanıtlayan zincir: her halka bir çıkarım ve dayandığı kanıtlar. */
  chain: z.array(z.object({ step: text, evidence: z.array(id).min(1), facts: z.array(id).default([]) })).min(3),
  redHerrings: z.array(z.object({ evidence: id, explanation: text })).default([]),
});

export const caseSchema = z.object({
  meta: z.object({
    slug: id,
    title: text,
    /** Kapakta başlığın altı: "Bebek, İstanbul — Kasım 2024". */
    subtitle: text,
    genre: z.enum(GENRES),
    difficulty: z.enum(['orta', 'zor', 'çok zor']),
    /** Tahmini süre (dk). */
    minutes: z.number().int().min(30).max(150),
    /** Kapak arka yazısı, 2–3 cümle. */
    teaser: prose,
    cover: id.optional(),
    /** Soruşturma saati bütçesi; bitince dosya kapanmak zorunda. */
    hoursBudget: z.number().int().min(10).max(200),
    /** Bunun altında kalan her saat bonus puan getirir. */
    targetHours: z.number().int().min(5).max(200),
    /** Bölüm sahnelerini okuyan anlatıcı. */
    narrator: voiceSchema.optional(),
  }),
  images: z.record(id, imageSchema).default({}),
  characters: z.array(characterSchema).min(3),
  locations: z.array(locationSchema).min(1),
  facts: z.array(factSchema).min(5),
  evidence: z.array(evidenceSchema).min(10),
  leads: z.array(leadSchema).min(5),
  interviews: z.array(interviewSchema).default([]),
  acts: z.array(actSchema).min(2).max(5),
  questions: z.array(questionSchema).min(3),
  /** Soru kimliği → kabul edilen cevap kimlikleri. */
  solution: z.record(id, z.array(id).min(1)),
  truth: truthSchema,
});

export type CaseFile = z.infer<typeof caseSchema>;
export type CaseInput = z.input<typeof caseSchema>;
export type Evidence = z.infer<typeof evidenceSchema>;
export type Lead = z.infer<typeof leadSchema>;
export type Act = z.infer<typeof actSchema>;
export type Character = z.infer<typeof characterSchema>;
export type CaseLocation = z.infer<typeof locationSchema>;
export type FloorPlan = z.infer<typeof floorPlanSchema>;
export type Question = z.infer<typeof questionSchema>;
export type TimelineEntry = z.infer<typeof timelineEntrySchema>;
export type CaseImage = z.infer<typeof imageSchema>;
export type Voice = z.infer<typeof voiceSchema>;
export type Interview = z.infer<typeof interviewSchema>;
