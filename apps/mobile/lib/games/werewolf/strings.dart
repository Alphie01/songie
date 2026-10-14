// games/werewolf/client/strings.ts ile birebir.
import 'models.dart';

abstract final class S {
  static const name = 'Kurt Adam';

  static const role = <Role, String>{
    'wolf': 'Kurt Adam',
    'villager': 'Köylü',
    'seer': 'Kahin',
    'doctor': 'Doktor',
    'hunter': 'Avcı',
    'witch': 'Cadı',
    'cupid': 'Aşk okçusu',
    'fool': 'Köyün delisi',
  };

  static const rolePlural = <Role, String>{
    'wolf': 'Kurt',
    'villager': 'Köylü',
    'seer': 'Kahin',
    'doctor': 'Doktor',
    'hunter': 'Avcı',
    'witch': 'Cadı',
    'cupid': 'Okçu',
    'fool': 'Deli',
  };

  static const roleBlurb = <Role, String>{
    'wolf': 'Her gece diğer kurtlarla birlikte bir kurban seçersin. Gündüz köylü gibi davran; sayınız köylülere eşit olunca kazanırsınız.',
    'villager': 'Gece uyursun. Gündüz konuş, şüphelendiğini aday göster ve kurtları asmaya çalış.',
    'seer': 'Her gece bir kişinin kurt olup olmadığını öğrenirsin. Bildiğini dikkatli paylaş; kurtlar seni arar.',
    'doctor': 'Her gece bir kişiyi kurtlara karşı korursun. Kendini de koruyabilirsin.',
    'hunter': 'Öldüğün an birini yanında götürürsün. Köyün tarafındasın.',
    'witch': 'Bir iyileştirme ve bir zehir iksirin var. Her gece kurtların kurbanını görürsün; iksirleri oyun boyunca birer kez kullanırsın.',
    'cupid': 'İlk gece iki kişiyi âşık edersin. Biri ölürse diğeri de ölür. Sen köyün tarafındasın.',
    'fool': 'Tek amacın gündüz oylamasında asılmak. Asılırsan tek başına kazanırsın; gece ölürsen kaybedersin.',
  };

  static const side = <Side, String>{'wolves': 'kurt tarafı', 'village': 'köy tarafı'};

  static const step = <NightStep, String>{
    'cupid': 'Aşk okçusu',
    'wolves': 'Kurtlar',
    'seer': 'Kahin',
    'doctor': 'Doktor',
    'witch': 'Cadı',
  };

  static const stepWakes = <NightStep, String>{
    'cupid': 'Aşk okçusu uyanıyor ve iki kişiyi âşık ediyor.',
    'wolves': 'Kurtlar uyanıyor ve kurbanını seçiyor.',
    'seer': 'Kahin uyanıyor ve birine bakıyor.',
    'doctor': 'Doktor uyanıyor ve birini koruyor.',
    'witch': 'Cadı uyanıyor ve iksirlerine bakıyor.',
  };

  static const phase = <Phase, String>{
    'night': 'Gece',
    'hunter': 'Avcının son atışı',
    'discuss': 'Tartışma',
    'vote': 'Oylama',
    'verdict': 'Karar',
    'over': 'Oyun bitti',
  };
}

abstract final class SSettings {
  static const readOnly = 'Ayarları oda sahibi seçer.';
  static const roles = 'Roller';
  static const rolesHint = 'Kurt sayısını ve açılacak rolleri seç; kalan herkes köylü olur.';
  static String villagers(int n) => n >= 0 ? '$n köylü' : 'Köylüye yer kalmadı';
  static String recommend(int n) => '$n kişi için önerilen dağılım';
  static const recommendShort = 'Önerilen dağılım';
  static String less(String r) => '$r sayısını azalt';
  static String more(String r) => '$r sayısını artır';
  static const roleSeconds = 'Gece rol süresi';
  static const roleSecondsHint =
      'Her rol gece bu kadar süre uyanık kalır. Rol erken bitirse de süre dolmadan sıra geçmez; böylece kimse kimin hangi rolde olduğunu süreden anlayamaz.';
  static const discussSeconds = 'Tartışma süresi';
  static const discussHint = 'Hayattaki herkes "Hazırım" derse tartışma erken biter.';
  static const voteSeconds = 'Oylama süresi';
  static const rules = 'Kurallar';
  static const revealRoles = 'Ölenin rolü açıklansın';
  static const openVotes = 'Açık oy (kim kime oy verdi görünsün)';
  static const doctorNoRepeat = 'Doktor aynı kişiyi üst üste koruyamaz';
  static const ghostsSeeRoles = 'Ölüler bütün rolleri görsün';
  static const dayTie = 'Gündüz oylamasında beraberlik';
  static const dayTieOpts = <String, String>{'none': 'Kimse asılmaz', 'runoff': 'İkinci tur'};
  static const wolfTie = 'Kurt oylamasında beraberlik';
  static const wolfTieOpts = <String, String>{'random': 'Rastgele biri', 'none': 'Kimse ölmez'};
  static String sec(int n) => n < 60 ? '$n sn' : (n % 60 == 0 ? '${n ~/ 60} dk' : '$n sn');
}

abstract final class SPlay {
  static const you = 'sen';
  static String night(int n) => '$n. gece';
  static String day(int n) => '$n. gün';
  static const village = 'Köy';
  static const inGame = 'Oyundaki roller';
  static String alive(int n) => '$n kişi hayatta';
  static const dead = 'Öldü';
  static const ready = 'Hazır';
  static const voted = 'Oy verdi';
  static String nominated(int n) => '$n aday gösterme';

  // Rol kartı
  static const roleHold = 'Rolünü görmek için basılı tut';
  static const roleHoldHint = 'Yanındakiler görmesin diye yalnızca basılıyken açılır.';
  static const allies = 'Diğer kurtlar';
  static const noAllies = 'Bu oyunda tek kurt sensin.';
  static String lover(String nick, String side) => '$nick ile âşıksın ($side). Biriniz ölürse diğeri de ölür.';
  static const loverMixed = 'Farklı taraftasınız: ikiniz son iki kişi kalırsanız birlikte kazanırsınız.';
  static String cupidPair(String a, String b) => 'Âşık ettiklerin: $a ve $b';
  static const seerResults = 'Bakışların';
  static const isWolf = 'kurt';
  static const notWolf = 'kurt değil';
  static String potions(bool heal, bool poison) =>
      'İksirler: iyileştirme ${heal ? 'duruyor' : 'kullanıldı'}, zehir ${poison ? 'duruyor' : 'kullanıldı'}.';
  static const youDied = 'Öldün. Artık konuşamazsın; hayaletler kanalından izleyebilirsin.';

  // Gece
  static const sleepTitle = 'Gözlerini kapat, köy uyuyor';
  static const sleepBody = 'Sıran gelirse ekranın kendiliğinden uyanır. Ekranını kimseye gösterme.';
  static const nightOrder = 'Gecenin sırası';
  static const aliveNow = 'Köyde hayatta olanlar';
  static const cupidTitle = 'İki kişiyi âşık et';
  static const cupidHint = 'Kendini de seçebilirsin. Biri ölürse diğeri de ölür; farklı taraftalarsa birlikte kazanabilirler.';
  static String cupidConfirm(String a, String b) => '$a ve $b kişisini âşık et';
  static const cupidPick = 'İki kişi seç';
  static String cupidDone(String a, String b) => '$a ile $b artık âşık. Süre dolunca uyuyacaksın.';
  static const wolvesTitle = 'Bu gece kimi avlıyorsunuz?';
  static const wolvesHint = 'En çok oyu alan ölür. Oyunu süre dolana kadar değiştirebilirsin; diğer kurtların seçimini görüyorsun.';
  static const wolvesWithdraw = 'Oyumu geri al';
  static String wolfVotes(int n) => '$n kurt';
  static const seerTitle = 'Kime bakmak istiyorsun?';
  static const seerHint = 'Gecede bir kişiye bakabilirsin. Sonucu yalnızca sen görürsün.';
  static String seerIsWolf(String nick) => '$nick bir kurt.';
  static String seerNotWolf(String nick) => '$nick kurt değil.';
  static const doctorTitle = 'Bu gece kimi koruyorsun?';
  static const doctorHint = 'Koruduğun kişi kurtların saldırısından kurtulur; cadının zehrinden değil.';
  static const doctorBlocked = 'Dün gece korudun';
  static String doctorDone(String nick) => 'Bu gece $nick kişisini koruyorsun.';
  static const witchTitle = 'İksirlerin';
  static String witchVictim(String nick) => 'Kurtlar bu gece $nick kişisini seçti.';
  static const witchNoVictim = 'Kurtlar bu gece kimseyi seçmedi.';
  static String witchHeal(String nick) => '$nick kişisini iyileştir';
  static const witchHealUsed = 'İyileştirme iksirini kullandın.';
  static const witchPoison = 'Zehirlemek istediğin kişi';
  static const witchPoisonUsed = 'Zehir iksirini kullandın.';
  static const witchNoPoison = 'Kimseyi zehirleme';
  static const witchConfirm = 'Kararımı ver';
  static const witchHint = 'Kararını bir kez verirsin. Süre dolarsa iksir kullanmadan geçersin.';
  static const witchDone = 'Kararını verdin. Süre dolunca uyuyacaksın.';
  static const stepDone = 'Seçimin kaydedildi. Süre dolunca uyuyacaksın.';
  static String stepLeft(int sec) => '$sec sn';
  static const deadNight = 'Ölüler gece uyanmaz. Hayaletler kanalında olanları izleyebilirsin.';

  // Kurt sohbeti
  static const wolfChat = 'Kurtların sohbeti';
  static const wolfChatHint = 'yalnızca kurtlar görür';
  static const chatEmpty = 'Henüz mesaj yok.';
  static const chatPlaceholder = 'Mesaj yaz';
  static const send = 'Gönder';

  // Sabah
  static String dawnTitle(int n) => '$n. gecenin sabahı';
  static const dawnNone = 'Bu gece kimse ölmedi.';
  static const dawnDied = 'Bu gece ölenler';

  // Avcı
  static const hunterTitle = 'Son atışın: yanında kimi götürüyorsun?';
  static const hunterHint = 'Süre dolarsa atış yapmadan ölürsün.';
  static String hunterWait(String nick) => '$nick avcıymış. Son atışını yapıyor.';

  // Tartışma
  static const discussRule = 'Hayattakiler konuşur, ölüler susar. Rol kartını kimseye gösterme.';
  static const discussPick = 'Aday göstermek için birine dokun';
  static const candidates = 'Adaylar';
  static const noCandidates = 'Henüz aday yok. Kimse aday gösterilmezse bugün kimse asılmaz.';
  static String nominatedBy(String names) => 'Aday gösteren: $names';
  static String nominate(String nick) => '$nick kişisini aday göster';
  static const withdraw = 'Adaylığı geri çek';
  static String myNomination(String nick) => '$nick kişisini aday gösterdin.';
  static const readyBtn = 'Hazırım, oylamaya geçelim';
  static const unready = 'Hazır değilim';
  static String readyCount(int a, int b) => '$a/$b kişi hazır';
  static const endDiscuss = 'Tartışmayı bitir';
  static const deadDiscuss = 'Ölüler tartışmaya katılmaz. Hayaletler kanalını kullanabilirsin.';
  static const spectator = 'Bu oyunu izliyorsun.';

  // Oylama
  static const voteTitle = 'Kimi asıyoruz?';
  static const runoffTitle = 'İkinci tur: yalnızca berabere kalanlar';
  static String voteHint(bool open) => open ? 'Açık oy: herkes kimin kime oy verdiğini görür.' : 'Gizli oy: yalnızca sayılar açıklanır.';
  static const voteNone = 'Kimseyi asma';
  static String voteProgress(int a, int b) => '$a/$b kişi oy verdi';
  static String voteMine(String nick) => 'Oyun: $nick';
  static const endVote = 'Oylamayı bitir';
  static const deadVote = 'Ölüler oy veremez.';

  // Karar
  static String hanged(String nick) => '$nick asıldı.';
  static String hangedRole(String role) => 'Rolü: $role';
  static const spared = 'Bugün kimse asılmadı.';
  static const sparedTie = 'Oylar eşit çıktı; kimse asılmadı.';
  static const sparedNone = 'Kimse aday gösterilmedi.';
  static const tally = 'Oylar';
  static const nobody = 'Kimse';
  static const nightFalls = 'Birazdan gece çöküyor.';

  // Hayaletler
  static const ghosts = 'Hayaletler';
  static const ghostHint = 'yalnızca ölüler görür, hayattakilere ipucu verme';
  static const ghostRoles = 'Herkesin rolü';
  static const ghostSecret = 'Gece olanlar';

  // Sonuç
  static const winner = <Winner, String>{
    'village': 'Köy kazandı',
    'wolves': 'Kurtlar kazandı',
    'fool': 'Köyün delisi kazandı',
    'lovers': 'Âşıklar kazandı',
  };
  static const noWinner = 'Oyun yarıda bitti';
  static const reason = <WinReason, String>{
    'wolvesDead': 'Bütün kurtlar öldü.',
    'wolvesParity': 'Kurtlar sayıca köylülere yetişti.',
    'foolHanged': 'Deli asılmayı başardı.',
    'loversLast': 'Farklı taraftaki âşıklar son iki kişi kaldı.',
    'ended': 'Oda sahibi oyunu bitirdi.',
  };
  static const rolesTitle = 'Roller';
  static const secretTitle = 'Gece neler oldu';
  static String backIn(int n) => 'Lobiye dönülüyor… · $n sn';
  static const gameOver = 'Oyun bitti';
  static const winnerTitle = <Winner, String>{
    'village': 'Köy kazandı!',
    'wolves': 'Kurtlar kazandı!',
    'fool': 'Köyün delisi kazandı!',
    'lovers': 'Âşıklar kazandı!',
  };
  static const sideWolves = 'Kurtlar';
  static const sideVillage = 'Köy';
  static const backNow = 'Lobiye dön';
  static const log = 'Olay günlüğü';
  static const logEmpty = 'Henüz bir şey olmadı.';
  static const pending = 'Gönderiliyor…';
}

abstract final class SHowto {
  static const title = 'Nasıl oynanır';
  static const steps = <(String, String)>[
    ('Rolünü gizlice öğren', 'Rol kartına basılı tutunca rolün görünür. Kurtlar birbirini tanır; diğer herkes yalnızca kendini bilir.'),
    (
      'Gece',
      'Anlatıcı sunucudur. Roller sırayla uyanır: aşk okçusu (ilk gece), kurtlar, kahin, doktor, cadı. Her rolün süresi sabittir; ekranın uyanmazsa uyumaya devam et.',
    ),
    ('Sabah', 'Gece ölenler açıklanır. Avcı öldüyse son atışını yapar.'),
    ('Tartışma', 'Hayattakiler konuşur, şüphelendiklerini aday gösterir. Herkes hazır olunca ya da süre dolunca oylamaya geçilir.'),
    ('Oylama', 'Herkes aynı anda adaylardan birine ya da "Kimseyi asma"ya oy verir. En çok oyu alan asılır.'),
    (
      'Kazanma',
      'Bütün kurtlar ölünce köy, kurtlar köylülere yetişince kurtlar kazanır. Deli asılırsa deli, farklı taraftaki âşıklar son iki kişi kalırsa âşıklar kazanır.',
    ),
  ];
  static const roleTable = 'Roller';
}
