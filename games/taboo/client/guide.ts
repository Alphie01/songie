import type { GameGuide } from '@songie/game-kit/client';

export const guide: GameGuide = {
  summary:
    'İki takım sırayla anlatır. Anlatıcı kartındaki kelimeyi, yasaklı 5 kelimeyi söylemeden takımına buldurmaya çalışır.',
  players: '4–12 oyuncu, iki takım (her takımda en az 2 kişi)',
  duration: '20–40 dk',
  sections: [
    {
      title: 'Amaç',
      body:
        'Yeşil takım ve Mor takım sırayla anlatır. Her turda anlatan takımdan bir kişi anlatıcı olur, süre bitene kadar olabildiğince çok kart buldurur.\n\nOyun bittiğinde puanı yüksek olan takım kazanır; puanlar eşitse berabere biter.',
    },
    {
      title: 'Kim neyi görür',
      items: [
        { term: 'Anlatıcı', text: 'Kartı görür. Kelimeyi ve yasaklı kelimeleri söylemeden anlatır.', tone: 'green' },
        { term: 'Tahmin eden takım', text: 'Kartı göremez. Anlatıcıyı dinler, cevabı yüksek sesle söyler.', tone: 'yellow' },
        { term: 'Rakip takım', text: 'Kartı görür ve anlatıcıyı denetler. Yasaklı kelime söylenirse “Tabu!”ya basar.', tone: 'purple' },
      ],
    },
    {
      title: 'Bir tur nasıl geçer',
      body:
        'Sıradaki anlatıcı “Anlatmaya başla”ya basınca süre işlemeye başlar. Anlatıcı bağlı değilse oda sahibi onun yerine başlatabilir ya da “Anlatıcıyı atla” diyebilir.\n\nTakımın kelimeyi bilince anlatıcı “Doğru”ya basar. Zor bir kartı “Pas” ile geçebilir. Yanlışlıkla basılırsa “Geri al” son işaretlemeyi geri alır.\n\nSüre bitince yarım kalan kart desteye döner, sıra diğer takıma geçer. Her takımda anlatıcılık sırayla döner.',
      tip: 'Anlatırken kartın kelimesini de söylemek tabudur; parçalarını ya da eş anlamlısını kullan.',
    },
    {
      title: 'Puanlama ve kazanma',
      body:
        'Her “Doğru” anlatan takıma 1 puan kazandırır. Pas puan kazandırmaz ama pas hakkı sınırlıdır.\n\nTabu cezası açıksa rakip takım “Tabu!”ya her bastığında anlatan takımdan 1 puan düşer ve sıradaki karta geçilir. Aynı karta iki kişi birden basarsa yalnızca biri sayılır.',
    },
    {
      title: 'Ayarlar',
      body: 'Ayarları oda sahibi seçer.',
      items: [
        { term: 'Takımlar', text: 'Bir oyuncuya dokunarak takımını değiştir. Takımı seçilmeyenler başlarken dengeli dağıtılır.', tone: 'neutral' },
        { term: 'Kategoriler', text: 'Kartların geleceği konular. Eklenen kartlar “Arkadaş kartları”na girer.', tone: 'neutral' },
        { term: 'Tur süresi', text: '60, 90 ya da 120 sn. Varsayılan: 60 sn.', tone: 'neutral' },
        { term: 'Pas hakkı', text: 'Her tur için 3, 5 ya da Sınırsız. Varsayılan: 3.', tone: 'neutral' },
        { term: 'Takım başına anlatma', text: '2, 4, 6 ya da oda sahibi bitirene kadar. Varsayılan: 4 (toplam 8 tur).', tone: 'neutral' },
        { term: 'Tabu cezası', text: 'Açıksa her tabu 1 puan götürür. Varsayılan: Açık.', tone: 'neutral' },
      ],
    },
    {
      title: 'İpuçları',
      body:
        'Ayarlardaki “Kart ekle” ile kendi kartlarınızı yazabilirsiniz: bir kelime ve 5 yasaklı kelime.\n\nRakip takımdaysan kartı göreceğin için tahmin etme; işin anlatıcıyı dikkatle dinlemek.',
      tip: 'Pas hakkını erken harcama; turun sonuna zor bir kart kalabilir.',
    },
  ],
};
