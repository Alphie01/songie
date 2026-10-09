import type { GameGuide } from '@songie/game-kit/client';

export const guide: GameGuide = {
  summary:
    'Herkes isimsiz bir itiraf yazar, sonra itiraflar tek tek ekrana gelir ve kimin yazdığını tahmin edersiniz. Doğru bilen de, herkesi yanıltan da puan alır.',
  players: '3–16 oyuncu',
  duration: '15–30 dk',
  sections: [
    {
      title: 'Amaç',
      body:
        'Arkadaşlarının itiraflarını kimin yazdığını bil, kendi itirafınla da onları yanılt. Oyun sonunda en çok puanı olan kazanır; podyumda “En iyi dedektif” ve “En iyi yanıltıcı” da gösterilir.',
    },
    {
      title: 'Bir tur nasıl geçer',
      body:
        'Yaz: Her tur bir konu çıkar (serbest modda konu yoktur). İtirafını yazıp “İtirafı gönder”e bas; süre bitene kadar güncelleyebilirsin. İtiraf 10–240 karakter olmalı. Herkes yazınca, süre bitince ya da oda sahibi “Yazmayı bitir” deyince tahmine geçilir.\n\nTahmin et: İtiraflar karışık sırayla tek tek gelir. “Sence kim yazdı?” sorusuna bu tur yazanlar arasından birini seç. Kendi itirafın gelse de birini seç; seçimin sayılmaz ve kimse anlamaz.\n\nAçıklama: Herkes seçince ya da süre bitince yazan, bilenler ve kime kaç oy gittiği gösterilir. Sonra sıradaki itirafa geçilir. Tur sonunda o turun itirafları yazarlarıyla birlikte özetlenir.',
    },
    {
      title: 'Kim neyi görür',
      items: [
        { term: 'Yazarken', text: 'Kimin yazdığını görürsün ama ne yazdığını görmezsin. Kendi itirafını yalnızca sen görürsün.', tone: 'purple' },
        { term: 'Tahminde', text: 'İtiraf metni herkese açıktır, yazarı gizlidir. Kimin seçim yaptığı görünür, kimi seçtiği görünmez.', tone: 'purple' },
        { term: 'Yazarın seçimi', text: 'Yazarın kendi itirafındaki seçimi hiçbir yerde gösterilmez ve sayılmaz.', tone: 'yellow' },
        { term: 'Tepkiler', text: '“Yok artık”, “Ben de!”, “Efsane” ve “Olamaz” tepkileri isimsizdir; yalnızca sayıları görünür.', tone: 'green' },
        { term: 'İtirafı gizle', text: 'Oda sahibi uygunsuz bir itirafı gizleyebilir. Gizlenen itiraf kimseye bir daha gönderilmez, yazarı açıklanmaz, puan verilmez.', tone: 'red' },
      ],
    },
    {
      title: 'Puanlama ve kazanma',
      items: [
        { term: 'Doğru tahmin', text: 'Yazarı doğru bilen 1 puan alır.', tone: 'green' },
        { term: 'Yanıltma', text: 'Yazar, yanlış tahmin eden her kişi için 1 puan alır.', tone: 'orange' },
        { term: 'Seçim yapmamak', text: 'Seçim yapmayan puan almaz; yazara da puan kazandırmaz.', tone: 'neutral' },
        { term: 'Yazar açıklanmasın', text: 'Bu ayar açıksa yazar hiç söylenmez, yalnızca oy dağılımı görünür ve kimse puan almaz.', tone: 'neutral' },
      ],
      body: 'Belirlenen tur sayısı bitince podyum gelir. Tur sayısı sınırsızsa oda sahibi oyunu bitirene kadar sürer.',
    },
    {
      title: 'Ayarlar',
      items: [
        { term: 'Ne itiraf edilsin', text: 'Her tur bir konu ya da serbest itiraf. Varsayılan: her tur bir konu.', tone: 'neutral' },
        { term: 'Konu kategorileri', text: 'Genel, Çocukluk, Okul ve iş, Aşk, Utanç, Alışkanlıklar, Cesur (+18) ve Arkadaş konuları. Cesur dışındakiler varsayılan olarak açık.', tone: 'neutral' },
        { term: 'Yazma süresi', text: '60 sn, 120 sn ya da süresiz. Varsayılan: 120 sn.', tone: 'neutral' },
        { term: 'Tahmin süresi', text: 'Her itiraf için 30, 45 ya da 60 sn. Varsayılan: 45 sn.', tone: 'neutral' },
        { term: 'Tur sayısı', text: '3, 5 ya da sınırsız. Varsayılan: 3.', tone: 'neutral' },
        { term: 'Yazar açıklanmasın', text: 'Tamamen anonim oyun. Varsayılan: Kapalı.', tone: 'neutral' },
        { term: 'Konu ekle', text: 'Eklediğin konu “Arkadaş konuları” kategorisine girer ve sonraki oyunlarda çıkabilir.', tone: 'neutral' },
      ],
    },
    {
      title: 'İpuçları',
      body: 'Oda sahibi beklemek istemezse “Tahmini bitir”, “Sıradaki itiraf” ve “Sonraki tura geç” ile oyunu hızlandırabilir.',
      tip: 'Herkesi yanıltmak için başkasının yazacağı gibi bir itiraf yaz; ama gerçek olsun.',
    },
  ],
};
