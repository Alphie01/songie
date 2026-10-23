/**
 * Topics are copied verbatim from games/confessions/server/content (the app's own pools); the confessions are
 * sample answers a player could write (10–240 characters, like the game requires). Flirt pairs come from the
 * +18 packs but stay innuendo, never explicit (Instagram).
 */
export type ConfessionPair = { topic: string; confession: string };

export const CONFESSION_PAIRS: ConfessionPair[] = [
  {
    topic: 'Bir ilk buluşmada yaşadığın en garip an',
    confession: 'İlk buluşmada garson "afiyet olsun" dedi, ben de heyecandan "sen de" dedim. Sonra bütün akşam aynı garsondan kaçtım.',
  },
  {
    topic: 'Bugüne kadar söylediğin en büyük beyaz yalan',
    confession: 'Annemin mantısını yıllardır "bayılıyorum" diye yiyorum. Aslında hiç sevmiyorum, artık her bayram iki tabak koyuyor.',
  },
  {
    topic: 'Hiç kimsenin bilmediği bir alışkanlığın',
    confession: 'Duşta her sabah konser veriyorum. Mikrofonum şampuan şişesi, seyircim de havlu askısı.',
  },
  {
    topic: 'Eski sevgilinin hâlâ elinde tuttuğun bir eşyası',
    confession: 'Eski sevgilimin kapüşonlusunu hâlâ giyiyorum. Yeni sevgilim de bana çok yakıştırıyor, nereden aldığımı soruyor.',
  },
];

export const FLIRT_PAIRS: ConfessionPair[] = [
  {
    topic: 'Bu odada çekici bulduğun biri hakkında bir itiraf',
    confession: 'Bu odada biri var… ilk tanıştığımız gece onu öpmemek için kendimi zor tuttum. Hâlâ aklımda. 😳',
  },
  {
    topic: 'Bu odadan biriyle ilgili gördüğün ateşli bir rüya',
    confession: 'Geçen hafta rüyamda bu odadan biriyle Kapadokya’da balondaydık… ve manzaraya hiç bakmıyorduk. 🔥',
  },
  {
    topic: 'Sevgilin varken başkasına attığın ateşli mesaj',
    confession: 'Gece ikide "uyudun mu?" yazdım, sabah "yanlışlıkla gitti" dedim. İki kere oldu.',
  },
  {
    topic: 'Bu odadaki biriyle ilgili bir fantezi (isim vermeden)',
    confession: 'Bu odadaki biriyle bir gece telefonları kapatıp kimseye söylemeden kaybolmak. Sadece ikimiz.',
  },
];
