import type { GameGuide } from '@songie/game-kit/client';

export const guide: GameGuide = {
  summary:
    'Herkesin alnında bir kimlik kartı var: başkalarınınkini görürsün, kendininkini göremezsin. Evet/hayır soruları sorarak kim olduğunu bul.',
  players: '2–12 oyuncu',
  duration: '15–30 dk',
  sections: [
    {
      title: 'Amaç',
      body:
        'Kendi kimliğini en az soruyla bulmak. Ünlü, karakter, hayvan, nesne, meslek ya da arkadaşların eklediği biri olabilirsin.\n\nKendi kartın sen bilene kadar ekranına hiç gelmez; diğerlerinin kartlarını oyuncu listesinde görürsün.',
    },
    {
      title: 'Bir tur nasıl geçer',
      body:
        'Sıra sana gelince evet/hayır ile cevaplanacak bir soru sor: “İnsan mıyım?”, “Yaşıyor muyum?” Sesli sorup “Soruyu sordum”a bas ya da yazılı soru açıksa yazıp “Soruyu gönder”e bas.\n\nDiğerleri cevaplar; çoğunluğun cevabı geçerli olur. Herkes cevaplayınca soru kapanır; beklemek istemezsen sen ya da oda sahibi “Gelen cevaplarla bitir” diyebilir.\n\nBildiğini düşündüğünde kimliğini yazıp “Tahmin et”e bas. Doğruysa bitirirsin, yanlışsa sıra geçer. İstersen “Sırayı geçir” ile sıranı bırakabilirsin.',
    },
    {
      title: 'Cevaplar',
      items: [
        { term: 'Evet', text: 'Soru kimliğe uyuyor. Sormaya devam edersin.', tone: 'green' },
        { term: 'Hayır', text: 'Uymuyor. “Hayır çıkana kadar” modunda sıra geçer.', tone: 'red' },
        { term: 'Belki', text: 'Tam emin değiliz ya da yarı yarıya doğru. Cevaplar eşit dağılırsa da sonuç Belki olur.', tone: 'yellow' },
        { term: 'Alakasız', text: 'Soru bu kimlik için anlamsız. Sormaya devam edersin.', tone: 'neutral' },
        { term: 'İpucu al', text: 'Sırayla kategori, baş harf, kelime ve harf sayısı. Yalnızca sen görürsün; her ipucu 1 soru sayılır.', tone: 'purple' },
      ],
    },
    {
      title: 'Puanlama ve kazanma',
      body:
        'Oyun herkes kimliğini bilince biter. Sıralamada bilenler öndedir; aralarında en az soruda bilen kazanır, soru sayısı eşitse önce bilen öne geçer. İpuçları da soru sayısına eklenir.\n\nKimliğini bilen oyuncu diğerlerinin sorularını cevaplamaya devam eder. Oda sahibi oyunu erken bitirirse bilemeyenler sona yazılır.',
    },
    {
      title: 'Ayarlar',
      items: [
        { term: 'Kimlikler nereden gelsin', text: 'Türk ve dünya ünlüleri, karakterler, hayvanlar, nesneler, meslekler, tarihi kişiler, sporcular, arkadaş kartları.' },
        { term: 'Soru hakkı', text: '“Hayır çıkana kadar” ya da “Her turda 3 soru” (cevap ne olursa olsun 3 sorudan sonra sıra geçer). Varsayılan: Hayır çıkana kadar.' },
        { term: 'Yazılı soru', text: 'Soruyu sesli sormanın yanında yazabilirsin; soru geçmişinde kalır. Varsayılan: Açık.' },
        { term: 'Tahmin kontrolü', text: 'Otomatik: yazım farkları ve takma adlar kabul edilir. Grup onaylasın: diğerleri “Doğru” ya da “Yanlış” der, eşitlikte otomatik kontrol karar verir. Varsayılan: Otomatik.' },
        { term: 'Kişi başı ipucu', text: '0, 1 ya da 3. Varsayılan: 1.' },
        { term: 'Kendi kimliğini ekle', text: 'Eklediğin kimlik “Arkadaş kartları”na girer; kimseye listelenmez ve mümkünse sana düşmez.' },
      ],
    },
    {
      title: 'İpuçları',
      body: 'Geniş sorularla başla, sonra daralt. Soru geçmişine bakarak neyi zaten öğrendiğini unutma.',
      tip: 'Emin değilsen tahmin etme; yanlış tahmin sırayı geçirir ama soru sayın yine de artmaz.',
    },
  ],
};
