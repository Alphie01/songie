import type { GameGuide } from '@songie/game-kit/client';

export const guide: GameGuide = {
  summary:
    'İki takımlı klasik sessiz sinema. Anlatıcı filmi, diziyi, kitabı, şarkıyı ya da deyimi tek kelime etmeden hareketle anlatır; takımı süre bitmeden bilmeye çalışır.',
  players: '4–16 oyuncu, iki takım (takım başına en az 2)',
  duration: '20–40 dk',
  sections: [
    {
      title: 'Amaç',
      body:
        'Yeşil takım ve Mor takım sırayla anlatır. Her turda anlatan takımdan bir kişi anlatıcı olur; anlatıcılar takım içinde sırayla değişir.\n\nTurun süresi içinde takımına olabildiğince çok başlık bildir. Oyun sonunda puanı yüksek olan takım kazanır; eşitlikte berabere biter.',
    },
    {
      title: 'Bir tur nasıl geçer',
      body:
        'Sıradaki anlatıcı hazır olunca “Anlatmaya başla”ya basar; süre o an işlemeye başlar. Anlatıcı başlığı, türünü ve kaç kelime olduğunu görür. Konuşmadan, ses çıkarmadan, yalnızca hareketle anlatır.\n\nTakımı tahminlerini yüksek sesle söyler. Başlığın tamamı söylenince anlatıcı “Doğru”ya basar, yeni kart gelir. Takılırsa “Pas” ile geçebilir; yanlış bastıysa “Geri al” son işaretlemeyi geri alır.\n\nSüre bitince tur kapanır ve bu turda geçen kartlar herkese gösterilir. Yarım kalan kart desteye geri döner. Sıra diğer takıma geçer.',
    },
    {
      title: 'Kim neyi görür',
      items: [
        { term: 'Anlatıcı', text: 'Başlığı, türünü ve kelime sayısını görür. “Doğru”, “Pas” ve “Geri al” düğmeleri onda.', tone: 'green' },
        { term: 'Anlatan takım', text: 'Başlığı göremez. İşaretleri izler, tahminini yüksek sesle söyler.', tone: 'yellow' },
        { term: 'Rakip takım', text: 'Başlığı görür ama söylemez. Anlatıcı ses çıkarır ya da dudaklarıyla söylerse “Konuştu!”ya basar; kart geçer.', tone: 'purple' },
        { term: 'Tür işareti', text: 'Önce türü göster: film için kamera kolu çevir, dizi için havaya ekran çiz, kitap için ellerini aç, şarkı için şarkı söyler gibi yap, deyim için tırnak işareti yap.', tone: 'neutral' },
        { term: 'Kelime ve hece', text: 'Kelime sayısını ve kaçıncı kelimeyi parmaklarınla göster. Hece için parmaklarını ön koluna koy.', tone: 'neutral' },
      ],
    },
    {
      title: 'Puanlama ve kazanma',
      items: [
        { term: 'Doğru', text: 'Anlatan takıma +1 puan.', tone: 'green' },
        { term: 'Pas', text: 'Puan değişmez; pas hakkından düşer.', tone: 'neutral' },
        { term: 'Konuştu!', text: 'Kart geçer. Konuşma cezası açıksa anlatan takımdan 1 puan düşülür; puan eksiye de inebilir.', tone: 'red' },
      ],
      body: 'Belirlenen sayıda anlatma bitince oyun biter ve podyum gelir. “Takım başına anlatma” sınırsızsa oyunu oda sahibi bitirir.',
    },
    {
      title: 'Ayarlar',
      items: [
        { term: 'Takımlar', text: 'Lobide bir oyuncuya dokunarak takımını değiştir ya da “Karıştır” de. Takımı seçilmeyenler başlarken dağıtılır.', tone: 'neutral' },
        { term: 'Türler', text: 'Türk ve yabancı filmler, Türk ve yabancı diziler, kitaplar, şarkılar, atasözleri ve deyimler, arkadaş başlıkları. Varsayılan: hepsi.', tone: 'neutral' },
        { term: 'Zorluk', text: 'Kolay, Karışık ya da Zor. Varsayılan: Karışık.', tone: 'neutral' },
        { term: 'Tur süresi', text: '60, 90, 120 ya da 180 sn. Varsayılan: 90 sn.', tone: 'neutral' },
        { term: 'Pas hakkı', text: 'Tur başına 1, 3 ya da sınırsız. Varsayılan: 3.', tone: 'neutral' },
        { term: 'Takım başına anlatma', text: '2, 4, 6 ya da oda sahibi bitirene kadar. Varsayılan: 4 (toplam 8 tur).', tone: 'neutral' },
        { term: 'Konuşma cezası', text: 'Açıksa her “Konuştu!” anlatan takıma −1. Varsayılan: Açık.', tone: 'neutral' },
        { term: 'Başlık ekle', text: 'Eklediğin başlık “Arkadaş başlıkları” türüne girer ve kimseye listelenmez.', tone: 'neutral' },
      ],
    },
    {
      title: 'İpuçları',
      body:
        'Anlatıcının bağlantısı koparsa oda sahibi tur başlamadan “Anlatıcıyı atla” diyebilir ya da onun yerine turu başlatabilir. Anlatıcı tur ortasında odadan çıkarsa tur o ana kadarki puanlarla biter.',
      tip: 'Uzun başlıkta önce en kolay kelimeyi anlat; parmakla kaçıncı kelime olduğunu göstermeyi unutma.',
    },
  ],
};
