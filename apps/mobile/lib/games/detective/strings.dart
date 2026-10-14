// games/detective/client/strings.ts ile birebir.
import '../../shared/text.dart';

String _hours(int n) => '$n sa';

abstract final class S {
  static const name = 'Dedektif Masası';
  static const you = 'Sen';
  static const pitch = 'Belgeleri birlikte incele, izleri seç, faili ekipçe bul';
}

/// `s.kind`
const kindNames = <String, String>{
  'statement': 'İfade',
  'report': 'Rapor',
  'phoneLog': 'HTS kaydı',
  'messages': 'Mesajlar',
  'email': 'E-posta',
  'receipt': 'Fiş',
  'bank': 'Hesap dökümü',
  'letter': 'Not',
  'newspaper': 'Gazete',
  'photo': 'Fotoğraf',
  'accessLog': 'Geçiş kaydı',
  'ticket': 'Bilet',
  'table': 'Liste',
  'floorplan': 'Kroki',
  'audio': 'Ses kaydı',
};

String kindName(String kind) => kindNames[kind] ?? kind;

/// `s.difficulty`
const difficultyNames = <String, String>{'orta': 'Orta', 'zor': 'Zor', 'çok zor': 'Çok zor'};

abstract final class SSettings {
  static const readOnly = 'Vakayı ve kuralları oda sahibi seçer.';
  static const shelf = 'Vaka rafı';
  static const shelfHint = 'Bir vaka seç. Dosya herkesin ortak masasına açılır.';
  static const loading = 'Vakalar yükleniyor…';
  static const loadError = 'Vaka listesi alınamadı. Sayfayı yenileyip tekrar dene.';
  static const empty = 'Rafta henüz vaka yok.';
  static String minutes(int n) => '$n dk';
  static String acts(int n) => '$n bölüm';
  static String evidence(int n) => '$n belge';
  static String solved(String rank) => 'Çözüldü, $rank';
  static const selected = 'Seçili';
  static const sessions = 'Devam eden dosyalar';
  static const sessionsHint = 'Yarım kalan bir soruşturmayı kaldığı yerden sürdür.';
  static String sessionAct(int act, int acts) => 'Bölüm ${act + 1}/$acts';
  static String sessionHours(int n) => '$n sa harcandı';
  static const leadMode = 'İzlere kim karar verir';
  static const leadModes = <String, String>{'vote': 'Oylama', 'host': 'Oda sahibi'};
  static const leadModeHint = <String, String>{
    'vote': 'Biri bir iz önerir, çoğunluk evet derse iz açılır. Oda sahibi beklemeden de açabilir.',
    'host': 'Herkes iz önerebilir; açıp açmamaya oda sahibi karar verir.',
  };
  static const hints = 'Amirden ipucu';
  static const hintsHint = 'Her bölümde en fazla 2 ipucu. Her ipucu sonuçtan 5 puan düşer.';
}

abstract final class SAgo {
  static const now = 'az önce';
  static String min(int n) => '$n dk önce';
  static String hour(int n) => '$n sa önce';
  static String day(int n) => '$n gün önce';
}

abstract final class STabs {
  static const board = 'Pano';
  static const cabinet = 'Kanıtlar';
  static const interviews = 'Sorgular';
  static const leads = 'İzler';
  static const notes = 'Notlar';
}

abstract final class STop {
  static const secret = 'GİZLİ';
  static String online(int n) => '$n dedektif çevrim içi';
  static const code = 'Oda kodu';
  static String act(int i, int total) => 'Bölüm ${i + 1}/$total';
  static const phase = <String, String>{
    'scene': 'Bölüm açılışı',
    'investigate': 'Soruşturma',
    'accuse': 'Suçlama',
    'reconcile': 'Karşılaştırma',
    'result': 'Dosya kapandı',
  };
}

abstract final class SScene {
  static String act(int i, int total) => 'Bölüm ${i + 1} / $total';
  static const continueLabel = 'Okudum, devam';
  static String waiting(int ready, int total) => 'Diğerleri okuyor ($ready/$total)';
  static const hostSkip = 'Beklemeden başlat';
  static const narration = 'Anlatıcıyı dinle';
  static const narrationPause = 'Anlatıcıyı duraklat';
  static const narrationNow = 'Anlatıcı okuyor';
  static const narrationStop = 'Durdur';
  static const close = 'Masaya dön';
  static const replay = 'Bölüm sahneleri';
  static const imageMissing = 'Sahne fotoğrafı';
}

abstract final class SBoard {
  static const title = 'Pano';
  static const suspects = 'Şüpheliler';
  static String victim(String genre) => genre == 'cinayet' || genre == 'zehirlenme' ? 'Maktul' : 'Mağdur';
  static const others = 'Diğer kişiler';
  static String age(int n) => '$n yaşında';
  static const markSuspect = 'Şüpheli';
  static const markClear = 'Temiz';
  static String markedBy(String mark, String nick) => '$nick, ${trLower(mark)} olarak işaretledi';
  static String mentions(int n) => n == 0 ? 'Henüz hiçbir belgede geçmiyor' : '$n belgede geçiyor';
  static const showMentions = 'Belgeleri göster';
  static const locations = 'Mekânlar';
  static const timeline = 'Zaman çizelgesi';
  static const timelineEmpty = 'Belgelerden saatler çıktıkça burada sıralanır.';
  static const more = 'Devamını oku';
  static const less = 'Kısalt';
  static String details(String name) => '$name: ayrıntılar';
}

abstract final class SNotes {
  static const add = 'Not ekle';
  static const placeholder = 'Kısa bir not yaz';
  static const delete = 'Notu sil';
  static String count(int n) => n == 1 ? '1 not' : '$n not';
}

abstract final class SCabinet {
  static const title = 'Kanıt dolabı';
  static const all = 'Tümü';
  static const pinned = 'İğnelenenler';
  static String act(int i) => 'Bölüm ${i + 1}';
  static String person(String name) => '$name geçenler';
  static const clearPerson = 'Kişi filtresini kaldır';
  static const empty = 'Bu filtrede belge yok.';
  static const isNew = 'yeni';
  static String source(String title) => 'İz: $title';
  static const sourceStart = 'Bölüm başında geldi';
  static const pick = 'İncelemek için dolaptan bir belge seç.';
  static const back = 'Dolaba dön';
  static const loading = 'Belge getiriliyor…';
  static const loadError = 'Belge açılamadı. Tekrar dene.';
  static const retry = 'Tekrar dene';
  static const zoomIn = 'Büyüt';
  static const zoomOut = 'Küçült';
  static const zoomReset = 'Gerçek boyut';
  static const pin = 'İğnele';
  static const unpin = 'İğneyi kaldır';
  static const people = 'Belgede geçenler';
  static const prev = 'Önceki belge';
  static const next = 'Sonraki belge';
}

abstract final class SLeads {
  static const title = 'İzler';
  static const hours = 'Soruşturma saati';
  static String hoursOf(int spent, int budget) => '$spent / $budget sa';
  static String target(int n) => 'Hedef $n sa; altında kalan her saat bonus puan getirir.';
  static String actSpent(int spent, int? limit) => limit != null && limit != 0 ? 'Bu bölümde $spent / $limit sa' : 'Bu bölümde $spent sa';
  static const budgetOut = 'Saat bütçesi doldu. İz açmaya devam edebilirsiniz; aşılan her 2 saat sonuçtan 1 puan düşer (en fazla 10).';
  static String overBy(int n) => '$n sa aşıldı';
  static String from(String title) => 'Kaynak: $title';
  static String cost(int n) => _hours(n);
  static const tooExpensive = 'Bütçeyi aşar';
  static const propose = 'Bu izi öner';
  static const open = 'Bu izi aç';
  static const openNow = 'Oylamadan aç';
  static const none = 'Açılacak iz kalmadı.';
  static const available = 'Açılabilir izler';
  static const opened = 'Açılan izler';
  static String openedMeta(int act, String? nick) => nick != null ? 'Bölüm ${act + 1}, $nick' : 'Bölüm ${act + 1}';
  static const brought = 'Getirdiği belgeler';
  static const hostOnly = 'İzleri oda sahibi açar. Önerin oda sahibine gider.';
}

abstract final class SProposal {
  static String lead(String nick) => '$nick bu izi öneriyor';
  static String close(String nick) => '$nick dosyayı kapatmayı öneriyor';
  static const leadMine = 'Bu izi sen öneriyorsun';
  static const closeMine = 'Dosyayı kapatmayı sen öneriyorsun';
  static String tally(int yes, int needed) => '$yes / $needed evet';
  static const yes = 'Evet';
  static const no = 'Hayır';
  static const cancel = 'Öneriyi geri çek';
  static const reject = 'Öneriyi geri çevir';
  static const hostOpen = 'İzi aç';
  static const hostClose = 'Davayı çöz';
  static const busy = 'Önce bekleyen öneri sonuçlansın.';
  static const waitHost = 'Oda sahibinin kararı bekleniyor.';
}

abstract final class SHint {
  static const title = 'Amirden ipucu';
  static const ask = 'İpucu iste';
  static String askCost(int n) => 'İpucu iste (−$n puan)';
  static String left(int n) => n == 0 ? 'Bu bölümün ipuçları bitti' : 'Bu bölümde $n ipucu kaldı';
  static const confirm = 'İpucu sonuçtan 5 puan düşer. Yine de isteyelim mi?';
  static const confirmYes = 'Evet, ipucu iste';
  static const cancel = 'Vazgeç';
  static String used(int act) => 'Bölüm ${act + 1}';
}

abstract final class SClose {
  static const title = 'Dosyayı kapat';
  static const hint = 'Kapatınca herkes suçlama formunu doldurur. Oda sahibi isterse soruşturmaya dönebilir.';
  static const propose = 'Davayı çözmeyi öner';
  static const direct = 'Davayı çöz';
  static const tag = 'Kim · Nasıl · Neden';
  static const confirm = 'Dosya kapanıp suçlama aşamasına geçilecek. Emin misin?';
  static const confirmYes = 'Evet, kapat';
  static const hostOnly = 'Dosyayı oda sahibi kapatır.';
  static const notYet = 'Dosya henüz kapatılamaz; ilk bölümün izlerini incelemeye devam edin.';
}

abstract final class SNotebook {
  static const title = 'Ortak not defteri';
  static const placeholder = 'Herkesin gördüğü ortak defter. Şüpheleri, çelişkileri, saatleri buraya yazın.';
  static const saving = 'Kaydediliyor…';
  static const saved = 'Kaydedildi';
  static String lastBy(String nick, String when) => 'Son düzenleyen $nick, $when';
  static const conflict = 'Defteri aynı anda başkası da düzenledi; son hâli yüklendi. Kaydedilmeyen metnin aşağıda.';
  static const lost = 'Kaydedilmeyen metnin';
  static const dismiss = 'Kapat';
  static String chars(int n, int max) => '$n / $max';
}

abstract final class SLog {
  static const title = 'Olay akışı';
  static const empty = 'Henüz bir şey olmadı.';
}

abstract final class SAccuse {
  static const title = 'Suçlama formu';
  static const lead = 'Dosya kapandı. Herkes formu kendisi doldurur; sonra oda sahibi formları toplar ve ekip cevabı birlikte belirlenir.';
  static String points(int n) => '$n puan';
  static const pickSuspect = 'Şüphelilerden birini seç';
  static const pickEvidence = 'Açılmış belgelerden birini seç';
  static const submit = 'Formu gönder';
  static const update = 'Formu güncelle';
  static const sent = 'Formun gönderildi. İstersen değiştirip yeniden gönderebilirsin.';
  static String incomplete(int n) => n == 1 ? '1 soru boş' : '$n soru boş';
  static const submitted = 'Formunu gönderenler';
  static const collect = 'Formları topla';
  static String collectHint(int n, int total) => '$n/$total form geldi. Toplayınca cevaplar karşılaştırılır.';
  static const reopen = 'Soruşturmaya dön';
  static const waitHost = 'Herkes gönderince oda sahibi formları toplayacak.';
  static const browse = 'Dosyayı incele';
  static const backToForm = 'Forma dön';
  static const browsing = 'Suçlama aşamasındasınız. Belgelere göz atabilirsiniz; yeni iz açılamaz.';
}

abstract final class SReconcile {
  static const title = 'Ekip cevabı';
  static const lead = 'Formlar yan yana. Çoğunluğun cevabı seçili geldi; oda sahibi tartışmaya göre değiştirebilir.';
  static const noVotes = 'Kimse cevaplamadı';
  static const hostPick = 'Ekip cevabı yap';
  static const teamAnswer = 'Ekip cevabı';
  static const submit = 'Ekip cevabını teslim et';
  static const missing = 'Her soru için bir ekip cevabı seçin.';
  static const waitHost = 'Oda sahibi ekip cevabını teslim edecek.';
}

abstract final class SResult {
  static const stamp = 'Dosya kapandı';
  static const solved = 'Vaka çözüldü';
  static const unsolved = 'Vaka çözülemedi';
  static const endHost = 'Okumanız bitince alttaki "Oyunu bitir" ile puanları kaydedip lobiye dönün.';
  static const endGuest = 'Oda sahibi oyunu bitirince puanlar kaydedilip lobiye dönülecek.';
  static const score = 'Puan';
  static const rank = 'Derece';
  static const breakdown = 'Puan dökümü';
  static const questions = 'Sorular';
  static const team = 'Ekip cevabı';
  static const correct = 'Doğru cevap';
  static const noAnswer = 'Cevap yok';
  static const ok = 'Doğru';
  static const wrong = 'Yanlış';
  static const individual = 'Kişisel formlar';
  static String individualOf(int c, int t) => '$c/$t doğru';
  static const culprits = 'Fail';
  static const story = 'Gerçekte ne oldu';
  static const timeline = 'Gerçek zaman çizelgesi';
  static const chain = 'Kanıt zinciri';
  static const found = 'bulundu';
  static const missed = 'kaçırıldı';
  static const herrings = 'Yanıltıcı ipuçları';
  static const characters = 'Herkesin sırrı';
  static const whereabouts = 'O saatte';
  static const lies = 'İfadesindeki yalanlar';
  static String pts(int n) => n > 0 ? '+$n' : '$n';
}

abstract final class SDoc {
  static const report = <String, String>{
    'scene': 'Olay yeri inceleme',
    'autopsy': 'Adli tıp',
    'lab': 'Kriminal laboratuvar',
    'police': 'Emniyet',
    'expert': 'Bilirkişi',
    'insurance': 'Sigorta',
    'medical': 'Tıbbi kayıt',
    'internal': 'İç yazışma',
  };
  static const reportStamp = <String, String>{
    'scene': 'ASLI GİBİDİR',
    'autopsy': 'ADLİ TIP',
    'lab': 'İNCELENDİ',
    'police': 'ASLI GİBİDİR',
    'expert': 'BİLİRKİŞİ',
    'insurance': 'HASAR DOSYASI',
    'medical': 'GİZLİDİR',
    'internal': 'GİZLİ',
  };
  static const ticket = <String, String>{
    'bus': 'Otobüs bileti',
    'flight': 'Biniş kartı',
    'train': 'Tren bileti',
    'ferry': 'Vapur bileti',
    'parking': 'Otopark fişi',
    'event': 'Etkinlik bileti',
    'pawn': 'Rehin makbuzu',
    'hotel': 'Otel kaydı',
    'other': 'Bilet',
  };
  static const statementTitle = 'İfade tutanağı';
  static const capacity = <String, String>{'tanık': 'Tanık', 'şüpheli': 'Şüpheli', 'müşteki': 'Müşteki', 'bilirkişi': 'Bilirkişi'};

  // fields
  static const fName = 'Adı soyadı';
  static const fAge = 'Yaşı';
  static const fCapacity = 'Sıfatı';
  static const fRole = 'İşi / konumu';
  static const fTakenBy = 'İfadeyi alan';
  static const fPlace = 'Yer';
  static const fDatetime = 'Tarih, saat';
  static const fNo = 'Sayı';
  static const fDate = 'Tarih';
  static const fSubject = 'Konu';
  static const fSubscriber = 'Abone';
  static const fNumber = 'Numara';
  static const fPeriod = 'Dönem';
  static const fHolder = 'Hesap sahibi';
  static const fIban = 'IBAN';
  static const fSite = 'Tesis';
  static const fFrom = 'Kimden';
  static const fTo = 'Kime';
  static const fCc = 'Bilgi';

  static const asked = 'Soruldu';
  static const answered = 'Cevaben';
  static const statementClose = 'İfadem okundu, söylediklerimin aynen yazıldığını beyan ederim.';
  static const signGiver = 'İfade veren';
  static const signTaker = 'İfadeyi alan';
  static const signature = 'İmza';
  static const htsTitle = 'Abone iletişim kayıtları (HTS)';
  static const htsDatetime = 'Tarih / saat';
  static const htsType = 'Tür';
  static const htsOther = 'Karşı taraf';
  static const htsDuration = 'Süre';
  static const htsTower = 'Baz istasyonu';
  static const deleted = 'Bu mesaj silindi';
  static const recovered = 'Kurtarılan içerik';
  static String attachments(int n) => n == 1 ? '1 ek' : '$n ek';
  static const total = 'Toplam';
  static const payment = 'Ödeme';
  static const bankTitle = 'Hesap hareketleri';
  static const bankDate = 'Tarih';
  static const bankDesc = 'Açıklama';
  static const bankAmount = 'Tutar';
  static const bankBalance = 'Bakiye';
  static const bankIn = 'Toplam giriş';
  static const bankOut = 'Toplam çıkış';
  static String condition(String c) => 'Belgenin durumu: $c';
  static const accessTime = 'Saat';
  static const accessCard = 'Kart';
  static const accessHolder = 'Kart sahibi';
  static const accessDoor = 'Kapı';
  static const accessResult = 'Sonuç';
  static const accessTitle = 'Geçiş olayları raporu';
  static String accessSummary(int rows, int rej, int alarm) => '$rows kayıt, $rej ret, $alarm alarm';
  static const receiptNo = 'FİŞ NO';
  static const photoMissing = 'Fotoğraf henüz basılmadı. Dosyadaki tarif:';
  static String photoTag(String t) => 'Delil $t';
  static const rec = 'KAYIT';
  static const floorplanTitle = 'Kroki';
  static const legend = 'Lejant';
  static const scale = '1 m';
  static const north = 'K';
  static const planMissing = 'Bu mekânın krokisi dosyada yok.';
  static const marker = <String, String>{'body': 'Ceset / kişi', 'camera': 'Kamera', 'item': 'Eşya', 'stain': 'İz / leke', 'note': 'Not'};
  static const door = 'Kapı';
  static const window = 'Pencere';
  static String page(int n, int total) => 'Sayfa $n / $total';
}

abstract final class SAudio {
  static const variant = <String, String>{
    'phone-call': 'Telefon görüşmesi',
    'emergency-call': 'İhbar hattı kaydı',
    'voicemail': 'Sesli mesaj',
    'voice-note': 'Sesli not',
    'recording': 'Ses kaydı',
    'interview': 'Görüşme kaydı',
  };
  static const play = 'Kaydı oynat';
  static const pause = 'Duraklat';
  static const seek = 'Kayıtta konum';
  static const missing = 'Kayıt henüz seslendirilmedi. Dökümü okuyabilirsiniz.';
  static const loadError = 'Kayıt çalınamadı. Dökümü okuyabilirsiniz.';
  static const showTranscript = 'Dökümü göster';
  static const hideTranscript = 'Dökümü gizle';
  static const transcript = 'Döküm';
  static String silence(num n) => '[$n sn sessizlik]';
  static String ambience(String a) => '[$a]';
  static const recNo = 'Kayıt no';
  static const unknown = 'Bilinmeyen ses';
}

abstract final class SInterview {
  static const title = 'Sorgular';
  static const open = 'Sorgula';
  static const pick = 'Sorgu seç';
  static String unread(int n) => n == 1 ? '1 yeni cevap' : '$n yeni cevap';
  static const fresh = 'Yeni sorgu';
  static String act(int i) => 'Bölüm ${i + 1}';
  static const empty = 'Henüz açık sorgu yok. İzler ve yeni bölümler sorgu odasına yeni kişiler getirir.';
  static const transcript = 'Tutanak';
  static const transcriptEmpty = 'Henüz soru sorulmadı. Aşağıdan bir soru seç ya da bir belge göster.';
  static String asked(String nick) => '$nick sordu';
  static String showed(String nick) => '$nick belge gösterdi';
  static const shownDoc = 'Gösterilen belge';
  static const deflect = 'Kaçamak cevap';
  static const broke = 'İfade değişti';
  static const unlocked = 'Dosyaya eklendi';
  static const listen = 'Kaydı dinle';
  static const pause = 'Duraklat';
  static const audioError = 'Kayıt çalınamadı';
  static const questions = 'Sorular';
  static const newQ = 'yeni';
  static const noQuestions = 'Şu an sorulacak yeni soru yok. Yeni belgeler gelince yeni sorular açılabilir.';
  static const free = 'Soru sormak saat harcatmaz. Tutanak herkesin.';
  static const show = 'Belge göster';
  static String showTo(String name) => '$name karşısına belge koy';
  static const search = 'Belge ara';
  static const noMatch = 'Bu aramayla eşleşen belge yok.';
  static const shownTag = 'Gösterildi';
  static const confirm = 'Göster';
  static const cancel = 'Vazgeç';
  static const hit = 'Savunması çöktü. Tutanağa bak.';
  static const miss = 'Belge bir şey değiştirmedi.';
  static const closed = 'Soruşturma kapandı; tutanaklar yalnızca okunabilir.';
  static const back = 'Sorgulara dön';
}

abstract final class SErrors {
  static const generic = 'Hamle gönderilemedi. Bağlantını kontrol edip tekrar dene.';
}

abstract final class SHowto {
  static const title = 'Nasıl oynanır';
}
