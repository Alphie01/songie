import type { GameGuide } from '@songie/game-kit/client';

export const guide: GameGuide = {
  summary:
    'Şişe herkesin ekranında aynı anda döner ve birini gösterir. Gösterilen kişi doğruluk ya da cesaret seçer, soruyu cevaplar ya da görevi yapar.',
  players: '2–16 oyuncu',
  duration: '20–40 dk',
  sections: [
    {
      title: 'Amaç',
      body:
        'Soruları dürüstçe cevapla, görevleri yap ve puan topla. Tamamlanan her soru ve görev 1 puan getirir.\n\nOyun seçilen çevirme sayısı dolunca ya da oda sahibi bitirince sona erer. En çok puanı olan kazanır.',
    },
    {
      title: 'Bir tur nasıl geçer',
      body:
        'Sırası gelen “Şişeyi çevir”e basar. Şişe çevireni hiç göstermez; masadaki başka birinde durur.\n\nŞişenin gösterdiği kişi Doğruluk ya da Cesaret seçer. Soru ya da görev herkesin ekranında görünür. Cevapladıysa “Cevapladım”, görevi yaptıysa “Yaptım”a basar; istemezse “Pas” der.\n\nİlk şişeyi oda sahibi çevirir. Sonrasında sıradaki çeviren, ayara göre şişenin gösterdiği kişi ya da masada sıradaki kişidir.',
    },
    {
      title: 'Doğruluk ve cesaret',
      items: [
        { term: 'Doğruluk', text: 'Bir soru gelir; dürüstçe cevaplaman gerekir.', tone: 'green' },
        { term: 'Cesaret', text: 'Bir görev gelir; masanın önünde yapman gerekir.', tone: 'orange' },
        { term: 'Pas', text: 'Soruyu ya da görevi geçer. Hakkın oyun boyunca sınırlıdır; ceza açıksa 1 puan götürür.', tone: 'red' },
        { term: '“Yaptı mı?” oylaması', text: 'Açıksa diğerleri 20 saniye içinde Evet ya da Hayır der. Hayır çoğunluktaysa puan yok; eşitlikte puan verilir.', tone: 'purple' },
      ],
    },
    {
      title: 'Puanlama ve kazanma',
      body:
        'Tamamlanan soru ya da görev: +1 puan. Masa “yapmadı” derse puan yok. Pas cezası açıksa pas: −1 puan.\n\nOyuncu bağlantısını kaybederse oda sahibi “Sırayı atla” ya da “Turu puansız geç” ile oyunu sürdürebilir.',
    },
    {
      title: 'Ayarlar',
      body: 'Ayarları oda sahibi seçer.',
      items: [
        { term: 'Kategoriler', text: 'Eğlenceli, Arkadaşlar, Aşk, Utanç, Cesur (+18) ve Oyuncuların ekledikleri. Cesur varsayılan olarak kapalıdır.', tone: 'neutral' },
        { term: 'Doğruluk mu cesaret mi', text: 'Oyuncu seçer ya da Rastgele. Varsayılan: Oyuncu seçer.', tone: 'neutral' },
        { term: 'Pas hakkı (kişi başı)', text: '1, 2, 3 ya da Sınırsız; oyunun tamamı için. Varsayılan: 2.', tone: 'neutral' },
        { term: 'Pas cezası', text: 'Açıksa pas geçen 1 puan kaybeder. Varsayılan: Açık.', tone: 'neutral' },
        { term: '“Yaptı mı?” oylaması', text: 'Varsayılan: Açık.', tone: 'neutral' },
        { term: 'Sıradaki çeviren', text: 'Şişenin gösterdiği ya da Masada sırayla. Varsayılan: Şişenin gösterdiği.', tone: 'neutral' },
        { term: 'Çevirme sayısı', text: '10, 20 ya da Sınırsız. Varsayılan: 20.', tone: 'neutral' },
        { term: 'Adil şişe', text: 'Son iki çevirmede seçilenlere şişenin yeniden gelme olasılığı azalır. Varsayılan: Açık.', tone: 'neutral' },
      ],
    },
    {
      title: 'İpuçları',
      body: 'Ayarlardaki “Soru ya da görev ekle” ile kendi sorularınızı ve görevlerinizi yazabilirsiniz; bir sonraki çekilişlerde çıkabilirler.',
      tip: 'Pas hakkın oyun boyunca yetmeli; ilk zor soruda harcama.',
    },
  ],
};
