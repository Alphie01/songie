/// Casebook ana ekranının metinleri.
abstract final class TrCb {
  static const menu = 'Menüyü aç';
  static const profile = 'Profil';
  static const headline = 'Masada yeni dosyalar var.';

  static const activeTab = 'DEVAM EDEN DOSYA';
  static const open = 'AÇIK';
  static const solved = 'ÇÖZÜLDÜ';
  static String progress(int act, int acts, int hours, int? budget) => 'Bölüm $act/$acts · $hours${budget != null ? '/$budget' : ''} sa';
  static const withTeam = 'Ekibinle kaldığın yerden';
  static const alone = 'Kaldığın yerden';
  static const resume = 'Soruşturmaya dön';

  static const team = 'Ekip kur';
  static const teamSub = '1–8 dedektif';
  static const solo = 'Tek başına';
  static const soloSub = 'Kendi hızında çöz';
  static const soloPick = 'Hangi dosyayı açalım?';
  static const soloPickHint = 'Tek başına oynarsın, dosya hemen açılır.';

  static const codePlaceholder = 'Ekip kodu';
  static const codeLabel = 'Ekip kodu';
  static const join = 'Katıl';
  static const joining = 'Katılıyor…';
  static const codeLength = 'Ekip kodu 4 harften oluşur.';

  static const rankTitle = 'Rütben';
  static String solvedCount(int n, int total) => '$n / $total vaka çözüldü';
  static String nextRank(int percent, String rank) => 'Puanının yüzde $percent’ini topla, “$rank” rütbesine yüksel.';
  static const topRank = 'En yüksek rütbedesin. Yeni dosyalarda da unvanını koru.';

  static const shelf = 'Vaka rafı';
  static String count(int n) => '$n dosya';
  static const filterLabel = 'Zorluk filtresi';
  static const filters = [('all', 'Tümü'), ('orta', 'Orta'), ('zor', 'Zor'), ('çok zor', 'Çok zor'), ('cozuldu', 'Çözdüklerim')];
  static String fileNo(int n) => 'DOSYA ${n < 10 ? '0' : ''}$n';
  static String minutes(int n) => '$n dk';
  static String actsDocs(int acts, int docs) => '$acts bölüm · $docs belge';
  static const loading = 'Dosyalar getiriliyor…';
  static const loadError = 'Dosyalar yüklenemedi.';
  static const retry = 'Tekrar dene';
  static const empty = 'Bu rafta dosya yok.';
}
