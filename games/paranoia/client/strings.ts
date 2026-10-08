import type { AnswerHow } from '../shared/index.js';

/** Türkçe isim ekleri: "Ayşe'ye", "Barış'ın". Ünlüsü olmayan ya da harfle bitmeyen adlarda null. */
function suffix(nick: string, kind: 'dat' | 'gen'): string | null {
  const name = nick.trim();
  const lower = name.toLocaleLowerCase('tr-TR');
  const last = lower.at(-1) ?? '';
  if (!/\p{L}/u.test(last)) return null;
  const vowels = [...lower].filter((c) => 'aıoueiöü'.includes(c));
  const v = vowels.at(-1);
  if (!v) return null;
  const endsVowel = 'aıoueiöü'.includes(last);
  if (kind === 'dat') {
    const e = 'aıou'.includes(v) ? 'a' : 'e';
    return `${name}'${endsVowel ? 'y' : ''}${e}`;
  }
  const i = 'aı'.includes(v) ? 'ı' : 'ou'.includes(v) ? 'u' : 'ei'.includes(v) ? 'i' : 'ü';
  return `${name}'${endsVowel ? 'n' : ''}${i}n`;
}

export const s = {
  name: 'Gizlilik Esas',
  pitch: 'Sana gizli bir soru gelir, cevabın biri olur; hepsi en sonda açılır',
  you: 'sen',
  settings: {
    readOnly: 'Ayarları oda sahibi seçer.',
    count: 'Soru sayısı',
    countHint: (n: number) => `${n} soru sorulduktan sonra hepsi teker teker açılır.`,
    categories: 'Kategoriler',
    categoriesHint: 'Cesur kategorisi yetişkinlere yöneliktir; açık içerik yoktur.',
    think: 'Düşünme süresi',
    unlimited: 'Süresiz',
    sec: (n: number) => `${n} sn`,
    onTimeout: 'Süre bitince',
    timeoutRandom: 'Rastgele seçilir',
    timeoutPass: 'Pas geçilir',
    allowSelf: 'Kendini seçebilir',
    allowSelfHint: 'Açıkken soruyu alan kişi cevap olarak kendini de seçebilir.',
    noReturn: 'Geri seçim yok',
    noReturnHint: 'Soruyu sana gönderen kişiyi seçemezsin; böylece soru iki kişi arasında gidip gelmez.',
    hideHolder: 'Kime sorulduğu gizli',
    hideHolderHint: 'Açıkken sıranın kimde olduğunu bile yalnızca o kişi bilir.',
    first: 'İlk soruyu kim alır',
    firstRandom: 'Rastgele',
    firstHost: 'Oda sahibi seçer',
    revealBy: 'Açıklamada sıradaki soru',
    revealHost: 'Oda sahibi açar',
    revealVote: 'Çoğunluk oylar',
    on: 'Açık',
    off: 'Kapalı',
    add: 'Soru ekle',
    addHint: 'Eklediğin sorular “Sizin sorularınız” kategorisine girer ve kimseye listelenmez.',
    addPlaceholder: 'Aramızda kim…',
    addLabel: 'Yeni soru',
    save: 'Soruyu ekle',
    saving: 'Ekleniyor…',
    saved: 'Soru eklendi. Oyunda sürpriz olarak çıkacak.',
    addFailed: 'Soru eklenemedi. Tekrar dene.',
  },
  play: {
    progress: (n: number, total: number) => `${n}/${total} soru`,
    players: 'Oyuncular',
    thinking: 'düşünüyor',
    offline: 'bağlantı yok',
    // İlk seçim
    pickFirstTitle: 'İlk soruyu kim alsın?',
    pickFirstHint: 'Seçtiğin kişi ilk gizli soruyu alır. Kimse kimi seçtiğini görmez.',
    pickFirstConfirm: 'İlk soruyu ver',
    pickFirstWait: 'Oda sahibi ilk soruyu kime vereceğini seçiyor.',
    // Sıra sende
    yourTurn: 'Sıra sende',
    secretNote: 'Bu soruyu yalnızca sen görüyorsun.',
    pickTitle: 'Cevabın kim?',
    pickHint: (allowSelf: boolean, noReturn: boolean) =>
      [allowSelf ? null : 'Kendini seçemezsin.', noReturn ? 'Soruyu sana gönderen kişiyi seçemezsin.' : null, 'Seçtiğin kişi sıradaki soruyu alır.']
        .filter(Boolean)
        .join(' '),
    confirm: 'Seçimi onayla',
    confirmPick: (nick: string) => `${nick} seçimini onayla`,
    sending: 'Gönderiliyor…',
    secondsLeft: (n: number) => `${n} sn`,
    timeoutRandom: 'Süre bitince rastgele biri seçilir.',
    timeoutPass: 'Süre bitince soru pas geçilir.',
    // Bekleme
    waitHidden: 'Şu an birine soru soruldu, düşünüyor…',
    waitHolder: (nick: string) => `${nick} düşünüyor…`,
    waitHint: 'Sorular ve cevaplar en sonda teker teker açılacak.',
    answeredFlash: 'Bir soru cevaplandı',
    mine: 'Senin gizli cevapların',
    mineHint: 'Bunları yalnızca sen görüyorsun; açıklamaya kadar sır.',
    passed: 'pas geçildi',
    // Oda sahibi: takılan oyuncu
    stuckTitle: 'Sırası gelen oyuncunun bağlantısı koptu',
    stuckHint: 'Beklemek istemezsen onun yerine rastgele seç ya da soruyu başka birine ver.',
    skipRandom: 'Onun yerine rastgele seç',
    skipReassign: 'Soruyu başkasına ver',
    // Açıklama
    revealHead: (n: number, total: number) => `Soru ${n}/${total}`,
    askedTo: (nick: string) => (suffix(nick, 'dat') ? `${suffix(nick, 'dat')} soruldu` : `Soruldu: ${nick}`),
    answerOf: (nick: string) => (suffix(nick, 'gen') ? `${suffix(nick, 'gen')} cevabı` : `${nick} cevap verdi`),
    noAnswer: 'Cevap vermedi',
    how: {
      chosen: null,
      random: 'Süre bitti, rastgele seçildi',
      pass: 'Süre bitti, pas geçildi',
      host: 'Oda sahibi onun yerine rastgele seçti',
    } satisfies Record<AnswerHow, string | null>,
    next: 'Sıradaki soruyu aç',
    last: 'Özeti göster',
    vote: (votes: number, needed: number) => `Sıradakine geç (${votes}/${needed})`,
    voted: (votes: number, needed: number) => `Oyun verildi (${votes}/${needed})`,
    hostWillOpen: 'Sıradaki soruyu oda sahibi açacak.',
    history: 'Açılan sorular',
    // Özet
    summaryTitle: 'Bütün sorular açıldı',
    statsTitle: 'Kim kaç kez seçildi',
    times: (n: number) => (n === 0 ? 'hiç' : `${n} kez`),
    allTitle: 'Bütün sorular',
    finish: 'Oyunu bitir ve lobiye dön',
    closes: (secs: number) => `Oda ${secs} sn içinde lobiye dönecek.`,
    waitHostFinish: 'Oda sahibi oyunu bitirince lobiye dönülecek.',
  },
  howto: {
    title: 'Nasıl oynanır',
    steps: [
      ['Gizli soru', 'Sıra sana gelince ekranında yalnızca senin gördüğün bir soru çıkar: “Aramızda kim en kıskanç?” gibi.'],
      ['Birini seç', 'Cevap olarak odadaki oyunculardan birini seç ve onayla. Kimi seçtiğini kimse görmez.'],
      ['Zincir', 'Seçtiğin kişi sıradaki soruyu alır. Belirlenen soru sayısına ulaşana kadar böyle devam eder.'],
      ['Açıklama', 'Sorular bitince hepsi sırayla açılır: önce soru, sonra kime sorulduğu, en sonda cevap.'],
    ] as [string, string][],
  },
};
