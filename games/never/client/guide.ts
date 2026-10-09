import type { GameGuide } from '@songie/game-kit/client';

export const guide: GameGuide = {
  summary:
    'Her turda bir “Ben hiç …” cümlesi çıkar. Herkes gizlice “Yaptım” ya da “Yapmadım” der, sonra kimlerin yaptığı ortaya çıkar.',
  players: '2–16 oyuncu',
  duration: '15–30 dk',
  sections: [
    {
      title: 'Amaç',
      body:
        'Kazanmaktan çok birbirinizi tanımak için bir oyun. Cümleler açıldıkça kimin neler yaptığı ortaya çıkar, hikâyeleri anlatmak serbest.\n\nCan sistemi açıksa her “yaptım” bir parmak indirir. Canı biten elenir; ayakta kalan son kişi kazanır.',
    },
    {
      title: 'Bir tur nasıl geçer',
      body:
        'Ekranda bir cümle çıkar: “Ben hiç … .” Yaptıysan “Yaptım”, yapmadıysan “Yapmadım”a bas. Cevabın açılana kadar fikrini değiştirebilirsin.\n\nHerkes cevaplayınca ya da süre bitince cevaplar açılır. Cevap vermeyen o turda sayılmaz.\n\nAçıklamadan sonra oda sahibi “Sıradaki cümle” ile yeni tura geçer.',
      tip: 'Cümleyi beğenmediysen “Bu cümleyi atla”ya bas; oyuncuların yarısından fazlası isterse cümle değişir.',
    },
    {
      title: 'Kim neyi görür',
      items: [
        { term: 'Cevap verirken', text: 'Herkes yalnızca kendi cevabını görür. Diğerleri için sadece “cevapladı” ya da “düşünüyor” yazar.', tone: 'purple' },
        { term: 'Açıklamada', text: 'Kaç kişinin yaptığı ve kimlerin yaptığı gösterilir.', tone: 'green' },
        { term: 'İsimsiz açıklama', text: 'Açıksa yalnızca kaç kişinin yaptığı gösterilir; kim olduğu hiç kimseye gönderilmez.', tone: 'yellow' },
      ],
    },
    {
      title: 'Canlar ve kazanma',
      body:
        'Can sistemi açıksa herkes aynı canla başlar. Açıklamada “yaptım” diyen 1 can kaybeder; canı biten elenir ama oyunu izlemeye devam eder.\n\nOyun, tur sayısı dolunca, ayakta tek kişi kalınca ya da oda sahibi bitirince sona erer. Sonuçlarda en çok yapan, en masum ve en çok yapılan cümle gösterilir.\n\nCan sistemi kapalıysa kimse elenmez; skor tablosunda “yapmadım” sayıları öne çıkar.',
    },
    {
      title: 'Ayarlar',
      body: 'Ayarları oda sahibi seçer. Can ve isimsiz açıklama oyunun başında sabitlenir; kategori, süre ve tur sayısı oyun sürerken de değişebilir.',
      items: [
        { term: 'Kategoriler', text: 'Cümlelerin geleceği konular. Cesur (+18) varsayılan olarak kapalıdır.', tone: 'neutral' },
        { term: 'Can (parmak)', text: '3, 5, 10 ya da Kapalı. Varsayılan: 5.', tone: 'neutral' },
        { term: 'İsimsiz açıklama', text: 'Açınca can sistemi kapanır, çünkü canlar kimin yaptığını belli eder. Varsayılan: Kapalı.', tone: 'neutral' },
        { term: 'Cevap süresi', text: 'Süresiz, 15 ya da 30 sn. Varsayılan: 30 sn.', tone: 'neutral' },
        { term: 'Tur sayısı', text: '10, 20 ya da Sınırsız. Varsayılan: 20.', tone: 'neutral' },
        { term: 'Cümle ekle', text: '“Kendi cümleni yaz” ile eklediğin cümle “Arkadaş cümleleri” kategorisine girer.', tone: 'neutral' },
      ],
    },
    {
      title: 'İpuçları',
      body:
        'Oda sahibi cevap aşamasında “Cevapları şimdi aç” ile beklemeyi kesebilir ya da “Başka cümle getir” ile cümleyi değiştirebilir.',
      tip: 'Grup utangaçsa isimsiz açıklamayla başlayın; sayılar da yeterince konuşturur.',
    },
  ],
};
