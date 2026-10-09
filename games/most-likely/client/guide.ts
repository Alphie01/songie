import type { GameGuide } from '@songie/game-kit/client';

export const guide: GameGuide = {
  summary:
    '“Aramızdaki en … kim?” sorusuna herkes gizlice oy verir. En çok oyu alan unvanı kapar.',
  players: '3–16 oyuncu',
  duration: '10 soru yaklaşık 10–15 dk',
  sections: [
    {
      title: 'Amaç',
      body:
        'Her soruda gruptaki birini seçersin: aramızdaki en geç kalan, en unutkan, en romantik… Oylar açılınca unvanı kimin kaptığı ortaya çıkar.\n\nOyun sonunda en çok unvanı toplayan birinci olur. Tahmin modu açıksa sıralama doğru tahminlere göre yapılır.',
    },
    {
      title: 'Bir tur nasıl geçer',
      body:
        'Ekranda soru çıkar. Soruya en çok uyan oyuncuya dokunarak oy ver. Sonuçlar açılana kadar fikrini değiştirebilirsin.\n\nHerkes oy verince ya da süre bitince oylar sayılır. En çok oyu alan unvanı kapar; beraberlikte unvan paylaşılır. Kimse oy vermediyse unvan boşta kalır.\n\nSonuçlardan sonra oda sahibi “Sıradaki soru” ile yeni soruya geçer.',
      tip: 'Bağlantısı kopan oyuncu beklenmez; odadan çıkan birine verilen oylar düşer, o oyu verenler yeniden seçer.',
    },
    {
      title: 'Kim neyi görür',
      items: [
        { term: 'Oy verirken', text: 'Kimin oy verdiği görünür, kime verdiği görünmez. Kendi oyunu yalnızca sen görürsün.', tone: 'purple' },
        { term: 'İsimsiz oylar', text: 'Sonuçlarda yalnızca kimin kaç oy aldığı açılır; kimin kime verdiği hiç kimseye gönderilmez.', tone: 'green' },
        { term: 'Açık oylar', text: 'Sonuçlarda kimin kime oy verdiği de görünür.', tone: 'orange' },
      ],
    },
    {
      title: 'Puanlama ve kazanma',
      body:
        'Her unvan sahibine bir unvan yazılır; beraberlikte hepsine. Unvanlar yan taraftaki unvan geçmişinde birikir.\n\nTahmin modu açıksa oy verirken “Sence kim kazanacak?” sorusunu da cevaplarsın. Tahmin ettiğin kişi unvanı aldıysa (paylaşsa da) 1 puan kazanırsın.\n\nOyun sonunda tahmin modu hiç açılmadıysa unvan sayısı, en az bir turda açıldıysa doğru tahmin puanı sıralamayı belirler.',
    },
    {
      title: 'Ayarlar',
      body: 'Ayarları oda sahibi seçer. Oyun sürerken yapılan değişiklikler sıradaki sorudan itibaren geçerli olur.',
      items: [
        { term: 'Soru kategorileri', text: 'Sorunun geleceği konular. Cesur (+18) varsayılan olarak kapalıdır.', tone: 'neutral' },
        { term: 'Oy süresi', text: 'Süresiz, 15 ya da 30 sn. Varsayılan: 30 sn.', tone: 'neutral' },
        { term: 'Soru sayısı', text: '10, 20 ya da Sınırsız. Varsayılan: 10.', tone: 'neutral' },
        { term: 'Kendine oy', text: 'Serbest ya da Yasak. Varsayılan: Yasak.', tone: 'neutral' },
        { term: 'İsimsiz oylar', text: 'Varsayılan: Açık.', tone: 'neutral' },
        { term: 'Tahmin modu', text: 'Doğru tahmin 1 puan. Varsayılan: Kapalı.', tone: 'neutral' },
        { term: 'Soru ekle', text: 'Eklediğin soru “Arkadaş soruları” kategorisine girer.', tone: 'neutral' },
      ],
    },
    {
      title: 'İpuçları',
      body: 'Oda sahibi oy sırasında “Soruyu atla” ile soruyu değiştirebilir ya da en az bir oy geldiyse “Sonuçları şimdi aç” ile beklemeyi kesebilir.',
      tip: 'Tahmin modunda kendi oyunla değil, grubun nasıl oy vereceğiyle düşün.',
    },
  ],
};
