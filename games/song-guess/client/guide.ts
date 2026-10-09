import type { GameGuide } from '@songie/game-kit/client';

export const guide: GameGuide = {
  summary:
    'Şarkı önce 0,1 saniyelik bir parçayla çalar, kimse bilemezse parça uzar. Şarkıyı herkesten önce ve en kısa parçada bulan en çok puanı alır.',
  players: '1–12 oyuncu, herkes kendi için',
  duration: '10 şarkı yaklaşık 10–15 dk',
  sections: [
    {
      title: 'Amaç',
      body:
        'Her turda bir şarkının önizlemesinden parçalar çalar. Şarkıyı olabildiğince kısa parçada ve hızlı bulmaya çalış.\n\nOyun seçilen tur sayısı kadar sürer ya da tur sayısı sınırsızsa oda sahibi bitirene kadar devam eder. Tek başına da oynayabilirsin; o zaman tur sınırı yoktur ve serini büyütmeye çalışırsın.',
    },
    {
      title: 'Bir tur nasıl geçer',
      body:
        '“Hazır ol” geri sayımından sonra ilk parça açılır. Çal butonuyla parçayı istediğin kadar tekrar dinleyebilirsin.\n\n“Şarkıyı bul” kutusuna şarkının ya da sanatçının adını yaz, önerilerden doğru şarkıyı seç. Her parçada tek tahmin hakkın var. Bilmiyorsan “Pas” de; son parçada bu buton “Pes et” olur.\n\nBilmeyen herkes pas deyince ya da yanlış tahmin edince sıradaki, daha uzun parça herkese açılır. Herkes bilince ya da son parça da bitince şarkı açıklanır.',
      tip: 'Beklerken açılmış parçalara çubuktan dokunup tekrar dinleyebilirsin.',
    },
    {
      title: 'Parçalar',
      items: [
        { term: '0,1 sn', text: 'İlk parça. Burada bilen 1000 puanla başlar.', tone: 'purple' },
        { term: '0,5 sn', text: 'İkinci parça, 700 puan.', tone: 'green' },
        { term: '2 sn', text: 'Üçüncü parça, 450 puan.', tone: 'yellow' },
        { term: '8 sn', text: 'Dördüncü parça, 250 puan.', tone: 'orange' },
        { term: '15 sn', text: 'Son parça, 100 puan. Buton “Pes et” olur.', tone: 'red' },
      ],
    },
    {
      title: 'Puanlama ve kazanma',
      body:
        'Puan, bildiğin parçanın taban puanı ile hız bonusunun toplamıdır. Parça açılır açılmaz bilirsen 200’e kadar hız bonusu alırsın; beklemek bonusu eritir. Süresiz oyunda bonus ilk 15 saniyeye göre hesaplanır. Şarkıyı o turda ilk bilen ayrıca 50 puan alır.\n\n“Sanatçıyı bilene puan” açıksa sanatçısı doğru ama şarkısı yanlış tahmin puanın %30’unu getirir. Sonra şarkıyı da bulursan bu puan tam puanla değiştirilir.\n\nArt arda bildiğin şarkılar serini büyütür. Oyun sonunda en çok puanı olan kazanır.',
      tip: 'Turu sürerken başkalarının puanını değil, kimin hangi parçada bildiğini görürsün; tahminler hiç gösterilmez.',
    },
    {
      title: 'Ayarlar',
      body: 'Ayarları oda sahibi seçer. Oyun sürerken de değiştirilebilir; değişiklikler sıradaki şarkıdan itibaren geçerli olur.',
      items: [
        { term: 'Liste', text: 'Şarkıların geleceği listeler. Deezer ya da Spotify playlist linki ekleyebilirsin.', tone: 'neutral' },
        { term: 'Zorluk', text: 'Kolaydan İmkânsız’a; ne kadar az dinlenen şarkıların geleceğini belirler. Varsayılan: Orta.', tone: 'neutral' },
        { term: 'Tur sayısı', text: '5, 10, 15, 20 ya da Sınırsız. Varsayılan: 10.', tone: 'neutral' },
        { term: 'Süre', text: 'Her parça için Süresiz, 10, 20 ya da 30 sn. Varsayılan: Süresiz.', tone: 'neutral' },
        { term: 'Oynatma', text: 'Önizleme rastgele bir yerden ya da baştan başlar. Varsayılan: Rastgele bir yerden.', tone: 'neutral' },
        { term: 'Tahmin şuradan başlasın', text: 'Oyunu daha uzun bir parçadan başlatır; öncekiler baştan açık gelir.', tone: 'neutral' },
        { term: 'Kolay arama', text: 'Öneriler yalnızca seçili listelerden gelir. Varsayılan: Kapalı.', tone: 'neutral' },
        { term: 'Sanatçıyı bilene puan', text: 'Sadece sanatçıyı bilen puanın %30’unu alır. Varsayılan: Açık.', tone: 'neutral' },
      ],
    },
    {
      title: 'İpuçları',
      body:
        'Süresiz oyunda oda sahibi, kimse bir şey yapmıyorsa “Sonraki parçayı herkese aç” ile oyunu ilerletebilir.\n\nŞarkı açıklandıktan sonra herkes “Sonraki şarkı”ya basınca yeni şarkı gelir. Oda sahibi “Beklemeden geç” ile beklemeyi atlayabilir; süreli oyunda sonuç ekranı kendiliğinden kapanır.',
      tip: 'Bilmiyorsan hemen pas de: bilmeyen herkes pas deyince sıradaki parça beklemeden açılır.',
    },
  ],
};
