import type { GameGuide } from '@songie/game-kit/client';

export const guide: GameGuide = {
  summary:
    'Sana yalnızca senin gördüğün bir soru gelir, cevabın odadaki biri olur. Kim neyi sordu, kim kimi seçti; hepsi en sonda teker teker açılır.',
  players: '3–16 oyuncu',
  duration: '10–25 dk',
  sections: [
    {
      title: 'Amaç',
      body:
        'Kazanmak ya da kaybetmek yok; amaç güldürmek ve merak ettirmek. “Aramızda kim en kıskanç?” gibi bir soru alırsın ve cevap olarak birini seçersin.\n\nOyun boyunca kimse kime ne sorulduğunu, kimin kimi seçtiğini bilmez. Sorular bitince hepsi sırayla açılır.',
    },
    {
      title: 'Bir tur nasıl geçer',
      body:
        'İlk soruyu rastgele biri alır ya da oda sahibi seçer. Sıra sana gelince ekranında “Sıra sende” yazar ve soruyu yalnızca sen görürsün. Cevap olarak bir oyuncu seçip “Seçimi onayla”ya bas.\n\nSeçtiğin kişi sıradaki soruyu alır. Soru sayısına ulaşana kadar zincir böyle sürer. Beklerken kendi aldığın soruları ve cevaplarını “Senin gizli cevapların” bölümünde görebilirsin.\n\nDüşünme süresi biterse ayara göre senin yerine rastgele biri seçilir ya da soru pas geçilir. Pas geçilen sorudan sonra sıradaki soru rastgele birine gider.',
    },
    {
      title: 'Açıklama ve gizlilik',
      items: [
        { term: 'Soru', text: 'Oyun sırasında yalnızca soruyu alan kişi görür.', tone: 'purple' },
        { term: 'Cevap', text: 'Kimi seçtiğini açıklamaya kadar kimse görmez.', tone: 'purple' },
        { term: 'Soruyu kim aldı', text: '“Kime sorulduğu gizli” açıksa sıranın kimde olduğunu bile yalnızca o kişi bilir; diğerleri yalnızca birinin düşündüğünü görür.', tone: 'yellow' },
        { term: 'Açıklama', text: 'Her soru sırayla açılır: önce soru, sonra kime sorulduğu, en sonda cevap. Süre dolup rastgele seçildiyse ya da pas geçildiyse bu da yazılır.', tone: 'green' },
        { term: 'Özet', text: 'Bütün sorular açılınca kimin kaç kez cevap olarak seçildiği listelenir.', tone: 'green' },
      ],
    },
    {
      title: 'Açıklamada sıradaki soru',
      body:
        'Ayara göre “Sıradaki soruyu aç” düğmesine oda sahibi basar ya da herkes “Sıradakine geç” oyu verir; bağlı oyuncuların çoğunluğu oy verince sıradaki soru açılır. Oy modunda da oda sahibi tek başına ilerletebilir.\n\nÖzet ekranında oda sahibi “Oyunu bitir ve lobiye dön” der; demezse oda 2 dakika sonra kendiliğinden lobiye döner.',
    },
    {
      title: 'Ayarlar',
      items: [
        { term: 'Soru sayısı', text: '5, 10, 15 ya da 20. Varsayılan: 10.', tone: 'neutral' },
        { term: 'Kategoriler', text: 'Genel, Arkadaşlık, Aşk, Gelecek, Utanç, Yetenek, Cesur (+18) ve Sizin sorularınız. Cesur dışındakiler varsayılan olarak açık; Cesur’da açık içerik yoktur.', tone: 'neutral' },
        { term: 'Düşünme süresi', text: 'Süresiz, 20 sn ya da 40 sn. Varsayılan: 40 sn.', tone: 'neutral' },
        { term: 'Süre bitince', text: 'Rastgele seçilir ya da pas geçilir. Varsayılan: rastgele.', tone: 'neutral' },
        { term: 'Kendini seçebilir', text: 'Açıkken cevap olarak kendini de seçebilirsin. Varsayılan: Kapalı.', tone: 'neutral' },
        { term: 'Geri seçim yok', text: 'Soruyu sana gönderen kişiyi seçemezsin; soru iki kişi arasında gidip gelmez. Varsayılan: Açık.', tone: 'neutral' },
        { term: 'Kime sorulduğu gizli', text: 'Varsayılan: Açık.', tone: 'neutral' },
        { term: 'İlk soruyu kim alır', text: 'Rastgele ya da oda sahibi seçer. Varsayılan: Rastgele.', tone: 'neutral' },
        { term: 'Açıklamada sıradaki soru', text: 'Oda sahibi açar ya da çoğunluk oylar. Varsayılan: oda sahibi.', tone: 'neutral' },
        { term: 'Soru ekle', text: 'Eklediğin sorular “Sizin sorularınız” kategorisine girer, kimseye listelenmez; oyunda sürpriz olarak çıkar.', tone: 'neutral' },
      ],
    },
    {
      title: 'İpuçları',
      body:
        'Sırası gelen oyuncunun bağlantısı koparsa oda sahibi “Onun yerine rastgele seç” ya da “Soruyu başkasına ver” diyebilir.',
      tip: 'Seçtiğin kişi sıradaki soruyu alır; zinciri kime uzattığını da düşün.',
    },
  ],
};
