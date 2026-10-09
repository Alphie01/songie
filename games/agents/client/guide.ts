import type { GameGuide } from '@songie/game-kit/client';

export const guide: GameGuide = {
  summary:
    'Yeşil ve mor iki takım, 25 kelimelik bir tablo. Liderler tek kelimelik ipuçlarıyla takımlarına kendi ajanlarını buldurmaya çalışır; suikastçıyı açan takım kaybeder.',
  players: '4–16 oyuncu, iki takım (takım başına en az 2)',
  duration: 'Tablo başına 10–20 dk',
  sections: [
    {
      title: 'Amaç',
      body:
        'Tablodaki kendi ajanlarınızın hepsini rakipten önce bulmak. Başlayan takımın 9, diğerinin 8 ajanı var.\n\nHangi kelimenin kime ait olduğunu gösteren gizli anahtarı yalnızca iki lider görür. Takımın geri kalanı yalnızca kelimeleri görür.',
    },
    {
      title: 'Roller',
      items: [
        { term: 'Lider', text: 'Gizli anahtarı görür, sırası gelince ipucunu verir. Kartlara dokunamaz; takımı tahmin ederken yüzü bir şey belli etmemeli.', tone: 'purple' },
        { term: 'Tahminci', text: 'Liderin ipucuna göre takımıyla konuşur ve kartlara dokunur. Anahtarı görmez.', tone: 'yellow' },
        { term: 'İzleyici', text: 'Takımı olmayan oyuncu tabloyu izler.', tone: 'neutral' },
      ],
    },
    {
      title: 'Bir sıra nasıl geçer',
      body:
        'Sırası gelen takımın lideri tek kelimelik bir ipucu ve “Kaç kart” sayısı verir: “deniz 3”, üç kartın denizle ilgili olduğunu söyler. “İpucunu ver” ile gönderir.\n\nTakım kartlara dokunur. Kendi ajanınızı açtıkça devam edersiniz; en fazla sayının bir fazlası kadar kart açabilirsiniz. Sayı 0 ya da “Sınırsız” seçildiyse hak sınırı yoktur.\n\nİstediğiniz an “Sırayı bitir” ile sırayı rakibe verebilirsiniz.',
    },
    {
      title: 'İpucu kuralları',
      items: [
        { term: 'Tek kelime', text: 'Boşluk, rakam ya da işaret olmaz; yalnızca harfler, 2–24 harf.' },
        { term: 'Tablodaki kelime yasak', text: 'Açılmamış bir kelimenin kendisi, kökü ya da ondan türeyen kelime kabul edilmez (göz → gözlük, kitap → kitabı).' },
        { term: 'Bileşik kelime', text: 'Tablodaki bir kelimeyle biten bileşik ipucu da reddedilir (yıldız → denizyıldızı).' },
        { term: 'Sayı', text: '0–9 ya da Sınırsız. Sayı + 1 açma hakkı verir.' },
      ],
    },
    {
      title: 'Kartlar',
      items: [
        { term: 'Kendi ajanınız', text: 'Takımınıza sayılır, tahmin etmeye devam edersiniz.', tone: 'green' },
        { term: 'Rakip ajan', text: 'Rakibe sayılır ve sıra hemen rakibe geçer.', tone: 'purple' },
        { term: 'Tarafsız', text: 'Kimseye sayılmaz ama sıranızı bitirir. Tabloda 7 tane var.', tone: 'neutral' },
        { term: 'Suikastçı', text: 'Açan takım anında kaybeder. Tabloda 1 tane var.', tone: 'red' },
      ],
    },
    {
      title: 'Kazanma ve ayarlar',
      body:
        'Bütün ajanlarını önce bulan takım tabloyu kazanır; rakibin son ajanını siz açarsanız da rakip kazanır. Tablo bitince anahtar herkese açılır, oda sahibi “Yeni tablo” ile devam eder (liderler sırayla değişir, başlayan takım değişir) ya da “Lobiye dön” der.',
      items: [
        { term: 'Liderler', text: 'Başlarken rastgele ya da Oda sahibi seçer. Varsayılan: rastgele.' },
        { term: 'Kart nasıl açılsın', text: 'İlk dokunuş açar ya da Takım oylaması (bağlı tahmincilerin çoğunluğu aynı karta dokununca açılır). Varsayılan: İlk dokunuş açar.' },
        { term: 'Süre', text: 'Süresiz, Lider ve takım ayrı ya da Sıra başına toplam; 60 ya da 120 sn. Süre dolunca sıra rakibe geçer. Varsayılan: Süresiz.' },
        { term: 'Kelime paketleri', text: 'Genel, Kolay, Zor. Varsayılan: Genel.' },
      ],
    },
    {
      title: 'İpuçları',
      body: 'Büyük sayılar cazip ama riskli. Bir kelime hem kendi ajanınıza hem suikastçıya yakınsa o ipucundan vazgeçin.',
      tip: 'Kalan fazladan hakkı, önceki sıralardan bulamadığınız ajanlar için kullanın.',
    },
  ],
};
