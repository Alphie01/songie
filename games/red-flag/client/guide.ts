import type { GameGuide } from '@songie/game-kit/client';

export const guide: GameGuide = {
  summary:
    'Ekrana bir durum gelir; herkes gizlice “Green flag” mi “Red flag” mi olduğuna oy verir. Oylar birlikte açılır, kimin ne dediğine bakıp tartışırsınız.',
  players: '2–16 oyuncu',
  duration: '10–20 dk',
  sections: [
    {
      title: 'Amaç',
      body:
        'Kazanmaktan çok tanışmak için bir oyun: kim neye hoşgörülü, kim neye katı, onu görürsünüz.\n\nTahmin modu açıksa bir de puan yarışı var: çoğunluğun ne diyeceğini en çok tutturan öne geçer.',
    },
    {
      title: 'Bir tur nasıl geçer',
      body:
        'Her turda seçili kategorilerden bir durum çıkar. “Sen ne dersin?” altında oyunu verirsin; oyun açılana kadar gizlidir ve değiştirebilirsin.\n\nHerkes oy verince (tahmin modunda tahminini de yapınca) ya da süre bitince oylar birlikte açılır. Dağılımı görüp tartışırsınız.\n\nHazır olunca “Hazırım”a basın; herkes hazır olunca ya da oda sahibi “Sonraki durum”a basınca sıradaki duruma geçilir. Açılıştan sonraki ilk birkaç saniye tartışma için geçiş kilitlidir.',
    },
    {
      title: 'Seçenekler',
      items: [
        { term: 'Green flag', text: 'Sorun yok, hatta hoşuna gider.', tone: 'green' },
        { term: 'Red flag', text: 'Bu bir uyarı işareti.', tone: 'red' },
        { term: 'Asla olmaz', text: 'Yalnızca “Üçüncü seçenek” açıksa çıkar: kesinlikle kabul edilemez.', tone: 'purple' },
        { term: 'Çoğunluk ne diyecek?', text: 'Tahmin modunda kendi oyundan sonra grubun çoğunluğunun ne diyeceğini seçersin.', tone: 'yellow' },
        { term: 'Oyları şimdi aç', text: 'Oda sahibi herkesi beklemeden oyları açabilir (en az bir oy varsa).', tone: 'neutral' },
        { term: 'Durumu atla', text: 'Oda sahibi durumu oylamadan geçebilir; atlanan durum sayılmaz.', tone: 'neutral' },
      ],
    },
    {
      title: 'Puanlama ve kazanma',
      body:
        'Puan yalnızca tahmin modunda var: çoğunluğu doğru tahmin eden +1 puan alır. Oylar bölünürse en çok oy alan seçeneklerden herhangi birini tahmin etmek yeter.\n\nOyun sonunda “Red flag toleransı” özeti gelir: en hoşgörülü, en katı ve en aykırı (en çok azınlıkta kalan) oyuncu, herkesin green oranı ve en çok bölen durumlar.',
    },
    {
      title: 'Kim neyi görür',
      body:
        '“Kim ne dedi” Açık ise açılışta herkesin oyu adıyla görünür. İsimsiz ise yalnızca dağılım görünür; kimin ne dediği sunucudan hiç gönderilmez.\n\nOyunda bir tur bile isimsiz oynandıysa sonuç özetinde herkes yalnızca kendi profilini görür ve en hoşgörülü, en katı gibi unvanlar verilmez.',
    },
    {
      title: 'Ayarlar',
      items: [
        { term: 'Kategoriler', text: 'İlişki, ilk buluşma, iş, aile, sosyal medya ve daha fazlası. Cesur (+18) varsayılan olarak kapalı.' },
        { term: 'Üçüncü seçenek', text: '“Asla olmaz” seçeneğini ekler. Varsayılan: Kapalı.' },
        { term: 'Kim ne dedi', text: 'Açık ya da İsimsiz. Varsayılan: Açık.' },
        { term: 'Tahmin modu', text: 'Çoğunluk tahmini ve puan. Varsayılan: Açık.' },
        { term: 'Oy süresi', text: '15 sn, 30 sn ya da Süresiz. Varsayılan: 30 sn.' },
        { term: 'Durum sayısı', text: '10, 20 ya da Sınırsız (oda sahibi bitirene kadar). Varsayılan: 10.' },
        { term: 'Durum ekle', text: 'Kendi durumunu yaz; “Arkadaşların ekledikleri” kategorisine girer ve kimseye listelenmez.' },
      ],
    },
    {
      title: 'İpuçları',
      body: 'En eğlenceli kısım açılıştan sonraki tartışma. Acele etmeyin, azınlıkta kalan kendini savunsun.',
      tip: 'Tahmin modunda kendi fikrini değil, grubun ne diyeceğini düşün; ikisi çoğu zaman farklıdır.',
    },
  ],
};
