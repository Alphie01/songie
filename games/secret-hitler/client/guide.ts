import type { GameGuide } from '@songie/game-kit/client';

export const guide: GameGuide = {
  summary:
    'Gizli rollerle oynanan bir sosyal çıkarım oyunu. Liberaller faşistleri ve gizli Hitler’i bulmaya, faşistler ise kimliklerini saklayıp iktidarı ele geçirmeye çalışır.',
  players: '5–10 oyuncu, iki gizli takım',
  duration: '30–45 dk',
  sections: [
    {
      title: 'Amaç',
      body:
        'Oyun başında herkes gizlice rolünü öğrenir. Rolünü görmek için karta basılı tut; yalnızca basılıyken açılır. Liberaller çoğunluktadır ama kimin ne olduğunu bilmez.\n\nFaşistler birbirini ve Hitler’i tanır. Hitler, 5–6 kişilik oyunda faşisti tanır; 7 ve üstünde kimseyi tanımaz.\n\nLiberaller liberal yasalar çıkarmaya ya da Hitler’i idam ettirmeye, faşistler faşist yasalar çıkarmaya ya da Hitler’i şansölye seçtirmeye çalışır.',
    },
    {
      title: 'Bir tur nasıl geçer',
      body:
        'Seçim: Başkanlık oturma sırasıyla döner. Başkan bir şansölye adayı seçer, herkes aynı anda Ja! ya da Nein der. Oylar herkes oy verince birlikte açılır; yarıdan fazlası Ja! derse hükümet kurulur. Son seçilen şansölye aday olamaz; 5’ten fazla kişi hayattaysa son başkan da olamaz.\n\nYasama: Başkan desteden 3 kart çeker, birini atar, kalan ikisi şansölyeye gider; şansölye birini yasalaştırır. Bu sırada ikisi de konuşmaz, işaret vermez. Sonrasında istediklerini söyleyebilirler; yalan da serbest.\n\nSeçim sayacı: Hükümet kurulamazsa sayaç ilerler. 3 başarısız seçimde destenin üstündeki yasa kendiliğinden çıkar; yetkisi kullanılmaz ve aday olma kısıtları sıfırlanır.',
    },
    {
      title: 'Roller ve yetkiler',
      body: 'Faşist yasa çıkınca bazen başkan bir yetki kazanır. Hangi yasada hangi yetkinin geldiği oyuncu sayısına göre değişir; pistteki simgeler gösterir.',
      items: [
        { term: 'Liberal', text: '5–6 kişide 3–4, 7–8 kişide 4–5, 9–10 kişide 5–6 liberal olur. Kimseyi tanımaz.', tone: 'green' },
        { term: 'Faşist', text: '5–6 kişide 1, 7–8 kişide 2, 9–10 kişide 3 faşist olur. Takım arkadaşlarını ve Hitler’i tanır.', tone: 'red' },
        { term: 'Hitler', text: 'Her oyunda 1 tane. Faşist takımdadır; liberal gibi davranıp güven kazanmaya çalışır.', tone: 'red' },
        { term: 'Politika önizleme', text: 'Başkan destenin üstündeki 3 kartı görür. 5–6 kişide 3. faşist yasada gelir.', tone: 'purple' },
        { term: 'Sadakat sorgulama', text: 'Başkan bir oyuncunun partisini öğrenir; sonucu yalnızca o görür. Hitler faşist görünür, aynı kişi iki kez sorgulanamaz. 7–8 kişide 2., 9–10 kişide 1. ve 2. faşist yasada gelir.', tone: 'purple' },
        { term: 'Özel seçim', text: 'Başkan sıradaki başkanı seçer; sonra sıra kaldığı yerden devam eder. 7–10 kişide 3. faşist yasada gelir.', tone: 'purple' },
        { term: 'İdam', text: 'Başkan bir oyuncuyu oyundan çıkarır. Hitler değilse rolü açıklanmaz; idam edilen oy veremez. Her oyuncu sayısında 4. ve 5. faşist yasada gelir.', tone: 'orange' },
        { term: 'Veto', text: '5 faşist yasadan sonra şansölye “Veto öner” diyebilir. Başkan kabul ederse iki kart da atılır ve seçim sayacı ilerler; reddederse şansölye bir yasa seçmek zorundadır.', tone: 'yellow' },
      ],
    },
    {
      title: 'Kazanma',
      items: [
        { term: '5 liberal yasa', text: 'Liberaller kazanır.', tone: 'green' },
        { term: 'Hitler idam edilirse', text: 'Liberaller hemen kazanır.', tone: 'green' },
        { term: '6 faşist yasa', text: 'Faşistler kazanır.', tone: 'red' },
        { term: 'Hitler şansölye seçilirse', text: '3 faşist yasa çıktıktan sonra Hitler şansölye seçilirse faşistler hemen kazanır.', tone: 'red' },
      ],
      body: 'Destede 6 liberal ve 11 faşist kart vardır. Oyun bitince herkesin rolü açılır; kazanan takımdaki herkes 1 puan alır.',
    },
    {
      title: 'Ayarlar',
      items: [
        { term: 'Bekleyen oyuncuyu atlama', text: 'Varsayılan 30 sn (15 sn, 30 sn, 1 dk ya da 2 dk). Bu süreden sonra oda sahibi, sırası gelen oyuncu adına varsayılanı uygulayabilir; bağlantısı kopan oyuncu hemen atlanabilir.', tone: 'neutral' },
        { term: 'Atlanınca ne olur', text: 'Oy vermeyen Nein sayılır, aday ve kart rastgele seçilir, yetki kullanılmadan geçilir.', tone: 'neutral' },
        { term: 'Rol dağılımı', text: 'Oyuncu sayısından kendiliğinden belirlenir; ayar panelinde odadaki kişi sayısına göre gösterilir.', tone: 'neutral' },
      ],
    },
    {
      title: 'İpuçları ve lisans',
      body:
        'Olay günlüğü kimin kime oy verdiğini ve hangi hükümetin ne çıkardığını tutar; çelişkileri orada ara.\n\nSecret Hitler, Goat, Wolf & Cabbage tarafından CC BY-NC-SA 4.0 lisansıyla yayımlanmıştır. Bu ticari olmayan uyarlama aynı lisansla paylaşılır; görseller özgündür.',
      tip: '3 faşist yasadan sonra şansölye adaylarına dikkat et: Hitler seçilirse oyun biter.',
    },
  ],
};
