import type { GameGuide } from '@songie/game-kit/client';

export const guide: GameGuide = {
  summary:
    'Renk ya da sayı eşleştirerek elindeki kartları bitirmeye çalıştığın hızlı bir kart oyunu. Atla, Yön değiştir ve +2’lerle rakiplerinin işini zorlaştır.',
  players: '2–10 oyuncu',
  duration: 'Tek el 5–15 dk, 500 puan 30–60 dk',
  sections: [
    {
      title: 'Amaç',
      body:
        'Herkese 7 kart dağıtılır, bir kart ortaya açılır. Elini ilk bitiren eli kazanır.\n\nTek el modunda oyun orada biter. 500 puan modunda eli bitiren, rakiplerin elinde kalan kartların puanını alır; 500’e ilk ulaşan kazanır.',
    },
    {
      title: 'Sıra sende',
      body:
        'Ortadaki kartla aynı renkte ya da aynı sayı/simgede bir kart oyna. Renk seç kartları her zaman oynanır.\n\nUyan kartın yoksa 1 kart çek. Çektiğin kart uyuyorsa hemen oynayabilir ya da elinde tutup sırayı geçirebilirsin.',
      tip: 'Elinde oynanabilen kartlar parlak, oynanamayanlar soluk görünür.',
    },
    {
      title: 'Kartlar',
      body: 'Dört renk var: yeşil, sarı, kırmızı ve mor. Her renkte bir 0, ikişer 1–9, Atla, Yön değiştir ve +2; ayrıca 4 Renk seç ve 4 Renk seç +4. Toplam 108 kart.',
      items: [
        { term: 'Sayı kartları (0–9)', text: 'Rengi ya da sayısı eşleşince oynanır.', tone: 'neutral' },
        { term: 'Atla', text: 'Sıradaki oyuncu bu turu oynayamaz.', tone: 'green' },
        { term: 'Yön değiştir', text: 'Oyunun yönü tersine döner. 2 kişide Atla gibi çalışır: sıra yine sende.', tone: 'yellow' },
        { term: '+2', text: 'Sıradaki oyuncu 2 kart çeker ve sırası geçer.', tone: 'red' },
        { term: 'Renk seç', text: 'Her zaman oynanır. Devam edilecek rengi sen seçersin.', tone: 'purple' },
        {
          term: 'Renk seç +4',
          text: 'Rengi seçersin; sıradaki 4 kart çeker ve sırası geçer. Yalnızca elinde etkin renkte kart yokken oynamalısın; yoksa itiraz edilebilir.',
          tone: 'orange',
        },
      ],
    },
    {
      title: '+4 ve “Hile!”',
      body:
        'Biri +4 oynayınca sıradaki oyuncu kabul edip 4 kart çekebilir ya da “Hile!” diyerek itiraz edebilir. Oynayanın eli yalnızca itiraz edene gösterilir.\n\nElinde o renkte kart varsa itiraz haklıdır: 4 kartı oynayan çeker, itiraz eden sırasını oynar. Yoksa itiraz eden 6 kart çeker ve sırası geçer.',
      tip: 'Az kartı kalan birine +4 geldiyse itiraz riskine değebilir.',
    },
    {
      title: 'Son kart!',
      body:
        'Elinde 1 kart kalınca “Son kart!” butonuna bas. Elinde 2 kart varken de önceden söyleyebilirsin.\n\nSöylemezsen, sıradaki oyuncu hamlesini yapmadan önce biri “Yakaladım!” derse 2 kart çekersin.',
    },
    {
      title: 'Ev kuralları ve süre',
      body: 'Oda sahibi lobide açabilir; hepsi varsayılan olarak kapalıdır. Tur süresi seçilirse süre dolan oyuncu yerine kart çekilir ve sıra geçer.',
      items: [
        { term: 'Ceza yığma', text: '+2 üstüne +2 ya da +4, +4 üstüne +4 konur. Ceza birikir; koyamayan hepsini çeker. Haklı bir itirazda biriken cezanın tamamını +4’ü oynayan çeker.' },
        { term: '7-0 kuralı', text: '0 oynanınca herkes elini oyun yönündeki komşusuna verir. 7 oynayan seçtiği oyuncuyla el değiştirir.' },
        { term: 'Sınırsız çekme', text: 'Uyan kartın yoksa oynanabilir kart gelene kadar çekersin.' },
      ],
    },
    {
      title: 'Puanlama',
      body: '500 puan modunda eli bitiren, rakiplerin elindeki kartları toplar. Son kart +2 ya da +4 ise sıradaki o kartları yine çeker ve puana sayılır.',
      items: [
        { term: '0–9', text: 'Kartın üstündeki sayı kadar.', tone: 'neutral' },
        { term: 'Atla, Yön değiştir, +2', text: '20 puan.', tone: 'yellow' },
        { term: 'Renk seç, Renk seç +4', text: '50 puan.', tone: 'purple' },
      ],
    },
  ],
};
