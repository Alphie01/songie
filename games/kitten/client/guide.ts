import type { GameGuide } from '@songie/game-kit/client';

export const guide: GameGuide = {
  summary:
    'Sırayla desteden kart çektiğin bir şans ve blöf oyunu. Destede bombalar var; bomba çekip Etkisiz Kıl’ın yoksa patlarsın. Patlamayan son oyuncu kazanır.',
  players: '2–10 oyuncu',
  duration: '10–20 dk',
  sections: [
    {
      title: 'Amaç',
      body:
        'Herkes 1 Etkisiz Kıl ve 7 kartla başlar. Destede oyuncu sayısının bir eksiği kadar bomba vardır; yani biri hariç herkes eninde sonunda patlar.\n\n2–5 kişide tek deste, 6–10 kişide iki deste birleştirilir. Patlamayan son oyuncu kazanır.',
    },
    {
      title: 'Bir tur nasıl geçer',
      body:
        'Sıra sendeyken elinden istediğin kadar kart oynayabilir ya da hiç oynamayabilirsin. Sıran, “Kart çek ve sırayı bitir”e basıp desteden bir kart çekince biter.\n\nBir eylem oynanınca kısa bir geri sayım başlar; bu sürede herkes “Hayır!” diyebilir. Kimse durdurmazsa eylem uygulanır.\n\nBomba çekersen Etkisiz Kıl’ı oynarsın ve bombayı destede istediğin yere gizlice geri koyarsın. Etkisiz Kıl yoksa patlarsın; elindeki kartlar ıskartaya gider ve oyundan çıkarsın.',
    },
    {
      title: 'Kartlar',
      items: [
        { term: 'Bomba', text: 'Çektiğin an patlarsın; elinde Etkisiz Kıl yoksa oyundan çıkarsın. Hayır ile durdurulamaz.', tone: 'red' },
        { term: 'Etkisiz Kıl', text: 'Yalnızca bomba çekince oynanır. Bombayı en üste, en alta, rastgele ya da istediğin sıraya koyarsın; yerini yalnızca sen bilirsin.', tone: 'green' },
        { term: 'Saldır', text: 'Kart çekmeden sıranı bitirir; sıradaki oyuncu art arda 2 tur oynar. Saldırı altındayken oynarsan kalan turların da ona geçer.', tone: 'orange' },
        { term: 'Atla', text: 'Kart çekmeden bir turunu bitirir. Saldırı altındaysan yalnızca bir turu siler.', tone: 'yellow' },
        { term: 'Geleceği Gör', text: 'Destenin en üstteki 3 kartına gizlice bakarsın.', tone: 'purple' },
        { term: 'Karıştır', text: 'Desteyi karıştırır; kimse bombanın yerini artık bilemez.', tone: 'purple' },
        { term: 'İyilik İste', text: 'Bir oyuncu seç; elinden seçtiği bir kartı sana vermek zorunda.', tone: 'yellow' },
        { term: 'Hayır', text: 'Bomba ve Etkisiz Kıl dışındaki her eylemi durdurur. Hayır’a da Hayır denebilir; çift sayıda Hayır eylemi geri getirir. Her Hayır geri sayımı baştan başlatır.', tone: 'red' },
        { term: 'Kedi kartları', text: 'Sarman Paşa, Tekir Hoca, Pamuk Bulut, Kara Kömür ve Benekli Bıyık. Tek başına oynanmaz.', tone: 'neutral' },
        { term: 'Kedi çifti', text: 'Aynı kediden 2 tane: seçtiğin oyuncudan rastgele bir kart çalarsın.', tone: 'neutral' },
        { term: 'Kedi üçlüsü', text: 'Aynı kediden 3 tane: bir oyuncu seçip bir kart adı söylersin; onda varsa senin olur. Bomba istenemez.', tone: 'neutral' },
        { term: '5 farklı kedi', text: '5 farklı kedi birlikte oynanırsa ıskartadan istediğin kartı alırsın (ayar açıksa).', tone: 'neutral' },
      ],
    },
    {
      title: 'Kim neyi görür',
      body:
        'Elini yalnızca sen görürsün; diğerleri yalnızca kaç kartın olduğunu görür. Çektiğin kartın ne olduğunu sen bilirsin; diğerleri yalnızca kart çektiğini görür.\n\nÇalınan ya da İyilik ile verilen kartı yalnızca iki taraf görür. Geleceği Gör’deki kartları ve geri koyduğun bombanın yerini yalnızca sen görürsün; desteden kart çekildikçe bombanın sırası güncellenir, deste karışınca bu bilgi silinir.',
    },
    {
      title: 'Ayarlar',
      items: [
        { term: 'Hayır süresi', text: 'Bir eylem oynanınca herkesin Hayır diyebileceği süre: 3, 5 ya da 8 sn. Varsayılan: 5 sn.', tone: 'neutral' },
        { term: 'Tur süresi', text: 'Süresiz, 30 sn ya da 60 sn. Süre biterse oyuncu yerine kart çekilir. Varsayılan: Süresiz.', tone: 'neutral' },
        { term: '5 farklı kedi', text: '5 farklı kediyle ıskartadan kart alma kuralı. Varsayılan: Açık.', tone: 'neutral' },
        { term: 'Deste', text: 'Oyuncu sayısına göre kendiliğinden ayarlanır: 6–10 kişide iki deste kullanılır.', tone: 'neutral' },
      ],
    },
    {
      title: 'İpuçları',
      body:
        'İyilik, bomba, bomba yerleştirme ve ıskartadan seçme için 25 saniyen var; süre biterse senin yerine rastgele seçilir. Bağlantısı kopan oyuncunun sırasını oda sahibi onun yerine kart çekerek geçirebilir.',
      tip: 'Etkisiz Kıl’ını kullandıysan bombayı en üste koy; sıradaki oyuncu Karıştır, Atla ya da Saldır oynamazsa onu çeker.',
    },
  ],
};
