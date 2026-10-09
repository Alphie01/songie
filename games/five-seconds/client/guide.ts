import type { GameGuide } from '@songie/game-kit/client';

export const guide: GameGuide = {
  summary:
    'Sıra sana gelince bir görev açılır: “3 … söyle”. Süre bitmeden üç şeyi yüksek sesle say, sonra arkadaşların başarıp başarmadığına karar versin.',
  players: '2–16 oyuncu, istersen iki takım',
  duration: '10–20 dk',
  sections: [
    {
      title: 'Amaç',
      body:
        'Baskı altında aklına gelen ilk üç şeyi söylemek. Her başarılı görev 1 puan; oyun sonunda en çok puanı olan (ya da takım modunda en çok puanı olan takım) kazanır.',
    },
    {
      title: 'Bir tur nasıl geçer',
      body:
        'Sıra sana gelince “Hazırım”a bas. Görev herkesin ekranında aynı anda açılır ve süre başlar. Yüksek sesle 3 şey söyle; bitirdiysen “Söyledim”e basıp süreyi erken kapatabilirsin.\n\nSüre bitince diğer oyuncular “Başardı” ya da “Başaramadı” der. Herkes oy verince ya da 20 saniye dolunca sonuç açıklanır ve sıra sıradaki oyuncuya geçer.',
    },
    {
      title: 'Roller ve düğmeler',
      items: [
        { term: 'Sırası gelen', text: '“Hazırım” ile görevi açar, 3 şeyi söyler. Kendine oy veremez.', tone: 'green' },
        { term: 'Oy verenler', text: 'Diğer herkes. Oylama sürerken oyunu değiştirebilirsin; kimin ne verdiği gizlidir.', tone: 'yellow' },
        { term: 'Saydıkça dokun', text: 'İzlerken söylenenleri saymak için kendi sayacın; sonucu etkilemez.', tone: 'neutral' },
        { term: 'Çalma şansı', text: 'Çalma kuralı açıksa başarısız görevi sıradaki oyuncu aynı sürede dener. Takım modunda çalan rakip takımdan olur.', tone: 'purple' },
        { term: 'Görevi değiştir', text: 'Oda sahibi, açılmış görevi yenisiyle değiştirir; süre baştan başlar.', tone: 'neutral' },
        { term: 'Sırayı atla', text: 'Oda sahibi sırayı puansız geçer. Bağlantısı kopan oyuncunun sırası birkaç saniye sonra kendiliğinden atlanır.', tone: 'neutral' },
      ],
    },
    {
      title: 'Puanlama ve kazanma',
      body:
        'Çoğunluk “Başardı” derse +1 puan. Eşitlikte, hatta kimse oy vermezse de başardı sayılır.\n\nÇalma denemesi başarılı olursa puanı çalan oyuncu alır. Takım modunda puanlar takımın hanesine toplanır; Yeşil takım ile Mor takım yarışır.\n\nHerkes ayarlanan sayıda sıra aldıktan sonra oyun biter ve “En hızlı ağızlar” sıralaması gelir.',
    },
    {
      title: 'Ayarlar',
      items: [
        { term: 'Oyun modu', text: 'Herkes kendine ya da İki takım. İki takımda her takımda en az 2 kişi olmalı. Varsayılan: Herkes kendine.' },
        { term: 'Takımlar', text: 'Oyuncuya dokunarak takımını değiştir; seçilmeyenler başlarken dağıtılır. Takımlar sırayla oynar.' },
        { term: 'Süre', text: '5, 7 ya da 10 sn. Varsayılan: 5 sn.' },
        { term: 'Oyuncu başına sıra', text: '3, 5 ya da Sınırsız (oda sahibi bitirene kadar). Varsayılan: 3.' },
        { term: 'Çalma kuralı', text: 'Başarısız görevi sıradaki oyuncu dener. Varsayılan: Kapalı.' },
        { term: 'Kategoriler', text: 'Genel, aşk, iş ve okul, yemek, Türkiye, pop kültür, saçma sapan. Cesur (+18) varsayılan olarak kapalı.' },
        { term: 'Görev ekle', text: 'Kendi görevini yaz; “Arkadaş görevleri” kategorisine girer ve kimseye listelenmez.' },
      ],
    },
    {
      title: 'İpuçları',
      body: 'Kusursuz cevap aramayın; akla gelen ilk şeyi söyleyin. Takılmak serbest, susmak yasak.',
      tip: 'Oy verirken cömert olun: eşitlik zaten başardı sayılır.',
    },
  ],
};
