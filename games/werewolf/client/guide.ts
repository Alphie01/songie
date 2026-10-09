import type { GameGuide } from '@songie/game-kit/client';

export const guide: GameGuide = {
  summary:
    'Köyün içine kurtlar saklanmış. Geceleri kurtlar gizlice avlanır, gündüz köy tartışıp birini asar. Anlatıcı sunucudur; herkes oyuncudur.',
  players: '5–16 oyuncu, gizli roller',
  duration: '20–45 dk',
  sections: [
    {
      title: 'Amaç',
      body:
        'Oyun başında herkes gizlice bir rol alır. Rolünü görmek için karta basılı tut; yalnızca basılıyken açılır.\n\nKöy, bütün kurtları asmaya çalışır. Kurtlar, köylülere sayıca yetişene kadar her gece birini avlar. Kurtlar birbirini tanır; diğer herkes yalnızca kendi rolünü bilir.',
      tip: 'Ekranını kimseye gösterme: gece herkesin ekranı aynı süre "köy uyuyor" der, sıran gelince yalnızca seninki uyanır.',
    },
    {
      title: 'Gece',
      body:
        'Roller sırayla uyanır: aşk okçusu (yalnızca ilk gece), kurtlar, kahin, doktor, cadı. Her rolün sabit bir süresi vardır (20, 30 ya da 45 sn). Rol erken seçse de sıra süre dolunca geçer; rolün sahibi ölmüş olsa bile adım aynı süre sürer. Böylece kimin hangi rolde olduğu süreden anlaşılmaz.\n\nKurtlar kendi aralarında gizli bir sohbetle konuşur ve kurbana oy verir; en çok oyu alan ölür. Beraberlikte ayara göre rastgele biri ölür ya da kimse ölmez. Süre dolunca seçim yapmayan rol eylemsiz geçer.',
    },
    {
      title: 'Gündüz',
      body:
        'Sabah gece ölenler açıklanır; ayar açıksa rolleri de. Ardından tartışma başlar (60, 120 ya da 180 sn). Hayattakiler konuşur, ölüler susar.\n\nTartışmada şüphelendiğin birini aday gösterebilirsin. Hayattaki herkes "Hazırım" derse ya da süre dolarsa oylamaya geçilir. Herkes aynı anda adaylardan birine ya da "Kimseyi asma"ya oy verir; en çok oyu alan, "Kimseyi asma"dan fazla oy aldıysa asılır. Hiç aday yoksa o gün kimse asılmaz.\n\nBeraberlikte ayara göre kimse asılmaz ya da berabere kalanlar arasında ikinci tur yapılır (ikinci turda da beraberlik çıkarsa kimse asılmaz).',
    },
    {
      title: 'Roller',
      items: [
        { term: 'Kurt Adam', text: 'Her gece diğer kurtlarla birlikte bir kurban seçer. Kurtlar birbirini tanır ve gece gizlice yazışır.', tone: 'red' },
        { term: 'Köylü', text: 'Özel gücü yok. Gündüz konuşur, aday gösterir ve oy verir.', tone: 'neutral' },
        { term: 'Kahin', text: 'Her gece bir kişinin kurt olup olmadığını öğrenir. Sonucu yalnızca kendisi görür.', tone: 'purple' },
        { term: 'Doktor', text: 'Her gece bir kişiyi kurtlara karşı korur; kendini de koruyabilir. Ayar açıksa aynı kişiyi üst üste iki gece koruyamaz.', tone: 'green' },
        { term: 'Avcı', text: 'Gece ya da gündüz ölünce son atışıyla birini yanında götürür. Süre dolarsa atışsız ölür.', tone: 'orange' },
        { term: 'Cadı', text: 'Kurtların kurbanını görür. Bir iyileştirme iksiriyle kurbanı kurtarabilir, bir zehir iksiriyle birini öldürebilir; her biri oyunda bir kez.', tone: 'purple' },
        { term: 'Aşk okçusu', text: 'İlk gece iki kişiyi âşık eder. Âşıklar birbirini ve birbirinin tarafını bilir; biri ölünce diğeri de kalp acısından ölür.', tone: 'orange' },
        { term: 'Köyün delisi', text: 'Gündüz oylamasında asılırsa tek başına kazanır. Gece ölürse kaybeder.', tone: 'yellow' },
      ],
      tip: 'Oda sahibi lobide kurt sayısını ve açılacak rolleri seçer; kalan herkes köylü olur. "Önerilen dağılım" odadaki kişi sayısına göre doldurur.',
    },
    {
      title: 'Kazanma',
      items: [
        { term: 'Köy', text: 'Bütün kurtlar ölünce kazanır.', tone: 'green' },
        { term: 'Kurtlar', text: 'Hayattaki kurt sayısı diğerlerine eşit ya da fazla olunca kazanır.', tone: 'red' },
        { term: 'Köyün delisi', text: 'Gündüz asılırsa oyun hemen biter, yalnız o kazanır.', tone: 'yellow' },
        { term: 'Âşıklar', text: 'Biri kurt, biri köyden olan âşıklar son iki kişi kalırsa ikisi birlikte kazanır.', tone: 'orange' },
      ],
      body: 'Ölen avcı her zaman önce ateş eder; kazanan ondan sonra belli olur. Oyun bitince bütün roller ve gece olanlar açılır.',
    },
    {
      title: 'Ölüler ve ayarlar',
      body:
        'Ölüler oy veremez, aday gösteremez ve konuşmaz. Hayaletler kanalında birbirleriyle yazışabilir; ayar açıksa bütün rolleri ve gece olanları görür.\n\nDiğer ayarlar: ölenin rolü açıklansın mı, açık ya da gizli oy, oylama süresi (30, 45 ya da 60 sn). Bağlantısı kopan oyuncunun gece sırası süreyle geçer; oda sahibi tartışmayı ve oylamayı erken bitirebilir.',
      tip: 'Olay günlüğü kimin kimi aday gösterdiğini ve oyların nasıl dağıldığını tutar; çelişkileri orada ara.',
    },
  ],
};
