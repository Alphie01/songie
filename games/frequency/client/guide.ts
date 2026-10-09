import type { GameGuide } from '@songie/game-kit/client';

export const guide: GameGuide = {
  summary:
    'Medyum iki zıt kavram arasında gizli bir hedef görür ve tek bir ipucu verir. Takımı kadranı çevirip hedefe ne kadar yaklaşırsa o kadar puan alır.',
  players: '2–16 oyuncu; takımlı modda iki takım (takım başına en az 2)',
  duration: '20–40 dk',
  sections: [
    {
      title: 'Amaç',
      body:
        'Her turda bir spektrum kartı çıkar: “Soğuk – Sıcak” gibi iki zıt uç. Kadranda gizli bir hedef var ve onu yalnızca medyum görür.\n\nMedyumun ipucuyla takım ibreyi hedefe olabildiğince yakın getirmeye çalışır. Medyumluk her turda takımda sırayla döner.',
    },
    {
      title: 'Bir tur nasıl geçer',
      body:
        'Medyum (“Medyum kartı seçsin” açıksa) iki karttan ipucu bulmaya uygun olanı seçer; hedef iki kartta da aynı yerdedir. Sonra hedefin iki uç arasındaki yerini anlatan bir ipucu yazar ya da sesli söyleyip “İpucunu verdim”e basar.\n\nMedyumun takımı tartışarak kadranı çevirir ve “Kadranı kilitle”ye basar. Medyum kadrana dokunamaz, yorum yapmamalı.\n\nTakımlı modda kilitten sonra rakip takım hedefin ibrenin “Solunda” mı “Sağında” mı olduğunu tahmin eder; ilk basan oyuncunun cevabı geçerli olur. Sonra perde açılır ve oyunculardan biri “Sıradaki tura geç”e basar.',
    },
    {
      title: 'Kadran ve puan bantları',
      body: 'Kadran soldan sağa 0 ile 100 arasında. Hedef bölgesi kadranın yaklaşık beşte biri genişliğinde ve beş banttan oluşur: 2-3-4-3-2.',
      items: [
        { term: '4 puan', text: 'Tam isabet: ibre hedef merkezine en fazla 2 birim uzakta.', tone: 'green' },
        { term: '3 puan', text: 'Merkezin hemen yanındaki bantlar: en fazla 6 birim.', tone: 'yellow' },
        { term: '2 puan', text: 'Hedef bölgesinin kenarları: en fazla 10 birim.', tone: 'orange' },
        { term: 'Iska', text: 'Daha uzaktaysa puan yok.', tone: 'red' },
        { term: 'Sağ-sol tahmini', text: 'Takımlı modda rakip doğru bilirse +1 puan alır. Tam isabette (4 puan) sayılmaz.', tone: 'purple' },
      ],
    },
    {
      title: 'Kazanma',
      body:
        'Takımlı modda hedef puana ilk ulaşan takım kazanır. İki takım aynı anda aynı puanla hedefe ulaşırsa bir tur daha oynanır.\n\nBirlikte modunda herkes tek takımdır. Turlar bitince ortak puanınız, alınabilecek en yüksek puana oranla bir derece verir: Parazit, Cızırtılı yayın, Aynı kanaldasınız, Net yayın, Telepati.',
    },
    {
      title: 'Ayarlar',
      items: [
        { term: 'Nasıl oynanacak', text: 'Takımlı ya da Birlikte. Varsayılan: Takımlı.' },
        { term: 'Kazanmak için puan', text: 'Takımlı modda 10 ya da 15. Varsayılan: 10.' },
        { term: 'Tur sayısı', text: 'Birlikte modunda 7, 10 ya da 13. Varsayılan: 7.' },
        { term: 'Kadran süresi', text: 'Süresiz, 60 ya da 90 sn. Süre bitince kadran olduğu yerde kilitlenir; rakibin sağ-sol tahmini için 30 sn kalır. Varsayılan: Süresiz.' },
        { term: 'Medyum kartı seçsin', text: 'Medyum iki karttan birini seçer. Varsayılan: Açık.' },
        { term: 'Kilit için çoğunluk', text: 'Açıkken takımın yarıdan fazlası “Kilidi onayla” demeli; kadran oynarsa onaylar sıfırlanır. Varsayılan: Kapalı.' },
        { term: 'Yetişme kuralı', text: 'Tam isabet yapan takım hâlâ gerideyse bir tur daha oynar; birlikte modunda +1 tur kazandırır. Varsayılan: Açık.' },
        { term: 'Arkadaş kartları', text: 'Oyuncuların eklediği spektrumlar desteye karışır. Varsayılan: Açık.' },
      ],
    },
    {
      title: 'İpuçları',
      body: 'İyi ipucu, iki uçtan birine ne kadar yakın olduğunu sezdirir. Kadranı çevirirken herkes neden orayı düşündüğünü anlatsın; rakip de bu tartışmayı dinliyor.',
      tip: 'Medyumsan sus ve yüzünü belli etme; kadranı takımın çevirir.',
    },
  ],
};
