import type { GameGuide } from '@songie/game-kit/client';

export const guide: GameGuide = {
  summary:
    'Sarayda gizli rollerle oynanan bir blöf oyunu. Herkesin 2 gizli kartı var; rol iddia et, altın topla, rakiplerini kart kaybetmeye zorla. Son ayakta kalan kazanır.',
  players: '2–10 oyuncu (en iyisi 3–6)',
  duration: '10–20 dk',
  sections: [
    {
      title: 'Amaç',
      body:
        'Herkes 2 gizli rol kartı ve 2 altınla başlar (2 kişide başlayan oyuncu 1 altınla). Kart kaybedince hangi kartını açacağını sen seçersin; iki kartı da açılan elenir.\n\nSon ayakta kalan kazanır. Sıralama elenme sırasına göredir.',
      tip: 'Açılan kartlar herkese açık: hangi rollerin oyundan çıktığını takip et.',
    },
    {
      title: 'Sıra sende',
      body: 'Her turda tek bir eylem yaparsın. Bu üçü için rol gerekmez:',
      items: [
        { term: 'Gelir', text: '+1 altın. Engellenemez, itiraz edilemez.', tone: 'neutral' },
        { term: 'Yardım iste', text: '+2 altın. Hazinedar olduğunu söyleyen herkes engelleyebilir.', tone: 'neutral' },
        { term: 'Darbe', text: '7 altın öde, seçtiğin oyuncu bir kart kaybeder. Engellenemez. 10 ya da daha fazla altının varsa zorunludur.', tone: 'red' },
      ],
    },
    {
      title: 'Roller',
      body: 'Her rolden 3 kart var (7–10 kişide 4). Elinde olmasa bile her rolü iddia edebilirsin.',
      items: [
        { term: 'Hazinedar', text: 'Vergi: +3 altın. Yardım isteyeni engeller.', tone: 'yellow' },
        { term: 'Fedai', text: 'Suikast: 3 altın öde, seçtiğin oyuncu bir kart kaybeder. Engellense de altın geri gelmez.', tone: 'red' },
        { term: 'Muhafız', text: 'Kendisine yapılan suikastı engeller.', tone: 'purple' },
        { term: 'Korsan', text: 'Çal: bir oyuncudan 2 altın al. Kendisinden çalınmasını engeller.', tone: 'orange' },
        { term: 'Casus', text: 'Değiş tokuş: desteden 2 kart çek, elindekilerle birlikte bak, elindeki kart sayısı kadarını seçip sakla, kalanı desteye dönsün. Kendisinden çalınmasını engeller.', tone: 'green' },
      ],
    },
    {
      title: 'Yalan! ve engel',
      body:
        'Bir rol iddia edilince ekranda geri sayım başlar (ayar: 5, 8 ya da 12 sn). Herkes “Yalan!” diyebilir ya da geçebilir; herkes geçerse pencere erken kapanır. Hedef alınan oyuncu bu sırada engelleyebilir.\n\nİtiraz edilince iddia eden kartını gösterir. Kart varsa itiraz eden bir kart kaybeder; gösterilen kart desteye karışır ve yerine yenisi çekilir. Kart yoksa iddia eden bir kart kaybeder ve eylemi boşa gider.\n\nEngel de bir iddiadır: ona da “Yalan!” denebilir. Engel ayakta kalırsa eylem gerçekleşmez.',
      tip: 'Blöf yakalanırsa bir kart gider; emin değilsen bazen geçmek daha ucuzdur.',
    },
    {
      title: 'Süre ve kopan oyuncular',
      body:
        'Tur süresi açıksa (45 ya da 90 sn) süre bitince oyuncu yerine Gelir alınır. Kart seçme süresi dolarsa rastgele bir kart açılır; değiş tokuşta süre dolarsa elindekiler kalır.\n\nBağlantısı kopan oyuncu itiraz penceresinde geçmiş sayılır. Oda sahibi onun yerine varsayılanı uygulayabilir: Gelir, geç ya da rastgele kart.',
    },
  ],
};
