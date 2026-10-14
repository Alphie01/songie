// games/detective/client/util.tsx karşılığı: masanın ortak durumu (DeskContext), belge önbelleği,
// cihazda tutulan "görüldü" kayıtları ve biçimlendirme yardımcıları.
import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/widgets.dart';

import '../../session/storage.dart';
import '../../shared/models.dart';
import '../../shared/text.dart';
import 'models.dart';
import 'strings.dart';

enum DtTab { board, cabinet, interviews, leads, notes }

/// `Send`: hata olursa masada uyarı gösterir; cevabı döndürür.
typedef Send = Future<Ack> Function(Json action);

/// Web'deki `Desk` (DeskContext) karşılığı. Oyun ekranı her çizimde yeniden kurar.
class Desk {
  Desk({
    required this.view,
    required this.room,
    required this.meId,
    required this.isHost,
    required this.send,
    required this.members,
    required this.chars,
    required this.evidence,
    required this.offset,
    required this.selected,
    required this.openEvidence,
    required this.showPerson,
    required this.personFilter,
    required this.setPersonFilter,
    required this.seen,
    required this.docs,
    required this.setTab,
    required this.interview,
    required this.openInterview,
    required this.ivUnread,
    required this.replayAct,
    required this.readOnly,
    required this.storage,
    required this.focusPerson,
  });

  final DetectiveView view;
  final RoomState room;
  final String meId;
  final bool isHost;

  /// Hata gösterir (Türkçe metin).
  final Send send;
  final Map<String, RoomPlayer> members;
  final Map<String, CharacterView> chars;
  final Map<String, EvidenceView> evidence;

  /// Sunucu saatini yerel saate çevirmek için: yerel = sunucu - offset.
  final int offset;
  final String? selected;
  final void Function(String id) openEvidence;
  final void Function(String id) showPerson;
  final String? personFilter;
  final void Function(String? id) setPersonFilter;
  final Set<String> seen;
  final DocStore docs;
  final void Function(DtTab tab) setTab;

  /// Sorgu odasında açık olan sorgu.
  final String? interview;
  final void Function(String id) openInterview;

  /// Sorgu başına okunmamış durum (başkasının sorduğu, henüz görmediğim girdiler).
  final Map<String, ({int count, bool fresh})> ivUnread;
  final void Function(int index) replayAct;
  final bool readOnly;

  /// Cihaz deposu (testte yoksa null).
  final Storage? storage;

  /// `showPerson` ile istenen kişi kartı: açılır ve ekrana kaydırılır (her istekte `seq` artar).
  final ({String id, int seq})? focusPerson;

  RoomPlayer? player(String id) => members[id];
  String nick(String? id) => id == null || id.isEmpty ? '?' : (id == meId ? S.you : (members[id]?.nick ?? '?'));

  /// Medya önbelleği anahtarlarının öneki (sunucu yeniden başlayınca adres değişir, vaka + kimlik değişmez).
  String get slug => view.caseInfo.slug;

  static Desk of(BuildContext context) => context.dependOnInheritedWidgetOfExactType<DeskScope>()!.desk;
  static Desk? maybeOf(BuildContext context) => context.dependOnInheritedWidgetOfExactType<DeskScope>()?.desk;
}

class DeskScope extends InheritedWidget {
  const DeskScope({super.key, required this.desk, required super.child});
  final Desk desk;
  @override
  bool updateShouldNotify(DeskScope oldWidget) => true;
}

// ---------------------------------------------------------------- Belge önbelleği

sealed class DocEntry {
  const DocEntry();
}

class DocLoading extends DocEntry {
  const DocLoading();
}

class DocFailed extends DocEntry {
  const DocFailed(this.error);
  final String error;
}

class DocReady extends DocEntry {
  const DocReady(this.data);
  final DocResponse data;
}

/// `useDocStore`: belge içerikleri kanıt kimliğiyle saklanır (adresle değil; adresler sunucu
/// yeniden başlayınca değişir). Başka bir soruşturmaya geçilince boşalır.
class DocStore extends ChangeNotifier {
  DocStore(this.act);

  /// Ham aksiyon (hata masada uyarı olarak değil, belgede gösterilir).
  Future<Ack> Function(Json action) act;
  final Map<String, DocEntry> _entries = {};
  String _scope = '';
  int _epoch = 0;
  bool _disposed = false;

  DocEntry? get(String id) => _entries[id];

  /// Oturum (ya da medya adresleri) değişince önbelleği boşaltır.
  void reset(String scope) {
    if (scope == _scope) return;
    _scope = scope;
    if (_entries.isEmpty) return;
    _entries.clear();
    _epoch++;
    _notify();
  }

  void load(String id, {bool force = false}) {
    final cur = _entries[id];
    if (!force && cur != null && cur is! DocFailed) return;
    _entries[id] = const DocLoading();
    _notify();
    final epoch = _epoch;
    () async {
      DocEntry next;
      try {
        final res = await act({'type': 'doc', 'evidenceId': id});
        final data = res.ok ? DocResponse.fromAck(res.data, id) : null;
        next = data != null ? DocReady(data) : DocFailed(res.ok ? SCabinet.loadError : res.error);
      } on Object {
        next = const DocFailed(SCabinet.loadError);
      }
      if (_disposed || epoch != _epoch) return;
      _entries[id] = next;
      _notify();
    }();
  }

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }
}

// ---------------------------------------------------------------- Cihazda tutulanlar

Set<String> readIdSet(Storage? storage, String key) {
  try {
    final raw = storage?.getString(key);
    if (raw == null) return <String>{};
    final v = jsonDecode(raw);
    return v is List ? v.whereType<String>().toSet() : <String>{};
  } on Object {
    return <String>{};
  }
}

void writeIdSet(Storage? storage, String key, Set<String> value) {
  try {
    unawaited(storage?.setString(key, jsonEncode(value.toList())));
  } on Object {
    // depolama kapalıysa yalnızca bu oturumda tutulur
  }
}

Map<String, int> readCountMap(Storage? storage, String key) {
  try {
    final raw = storage?.getString(key);
    if (raw == null) return {};
    final v = asJson(jsonDecode(raw));
    return {for (final e in v.entries) if (e.value is num) e.key: (e.value as num).toInt()};
  } on Object {
    return {};
  }
}

void writeCountMap(Storage? storage, String key, Map<String, int> value) {
  try {
    unawaited(storage?.setString(key, jsonEncode(value)));
  } on Object {
    // depolama kapalıysa yalnızca bu oturumda tutulur
  }
}

/// `useFreshQuestions`: daha önce gördüğüm soru kimlikleri; yeni gelenler bu oturum boyunca "yeni" kalır.
/// Sorgu odası (Room) durumunda tutulur, her çizimde [update] çağrılır.
class FreshQuestions {
  String? _ivId;
  String? _sig;
  final Set<String> fresh = {};

  Set<String> update(Storage? storage, String sessionId, String meId, String? ivId, List<String> ids) {
    if (ivId != _ivId) {
      _ivId = ivId;
      _sig = null;
      fresh.clear();
    }
    final sig = ids.join('|');
    if (ivId == null || sig == _sig) return fresh;
    _sig = sig;
    final key = 'dt-ivq:$sessionId:$meId';
    var known = <String, List<String>>{};
    try {
      final raw = storage?.getString(key);
      if (raw != null) {
        final v = asJson(jsonDecode(raw));
        known = {for (final e in v.entries) if (e.value is List) e.key: (e.value as List).whereType<String>().toList()};
      }
    } on Object {
      // yok say
    }
    final prev = known[ivId];
    final cur = sig.isEmpty ? <String>[] : sig.split('|');
    // Sorguyu ilk kez açıyorsam baştaki sorular "yeni" sayılmaz.
    if (prev != null) fresh.addAll(cur.where((q) => !prev.contains(q)));
    known[ivId] = {...?prev, ...cur}.toList();
    try {
      unawaited(storage?.setString(key, jsonEncode(known)));
    } on Object {
      // yok say
    }
    return fresh;
  }
}

// ---------------------------------------------------------------- Biçimlendirme

/// `Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })`
String money(num n) {
  final neg = n < 0;
  final cents = (n.abs() * 100).round();
  final whole = cents ~/ 100;
  final frac = (cents % 100).toString().padLeft(2, '0');
  return '${neg && cents > 0 ? '-' : ''}${trNumber(whole)},$frac';
}

String lira(num n) => '${money(n)} ₺';

String ago(int ms) {
  final d = math.max(0, DateTime.now().millisecondsSinceEpoch - ms);
  final m = d ~/ 60000;
  if (m < 1) return SAgo.now;
  if (m < 60) return SAgo.min(m);
  final h = m ~/ 60;
  if (h < 24) return SAgo.hour(h);
  return SAgo.day(h ~/ 24);
}

const _months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

/// "2025-02-14T21:08" → ("14 Şubat 2025", "21:08").
(String, String) splitAt(String at) {
  final i = at.indexOf('T');
  final date = i < 0 ? at : at.substring(0, i);
  final time = i < 0 ? '' : at.substring(i + 1).split('T').first;
  final parts = date.split('-').map(int.tryParse).toList();
  if (parts.length >= 3 && parts[0] != null && parts[1] != null && parts[2] != null && parts[0] != 0 && parts[1] != 0 && parts[2] != 0) {
    final dt = DateTime.utc(parts[0]!, parts[1]!, parts[2]!);
    return ('${dt.day} ${_months[dt.month - 1]} ${dt.year}', time);
  }
  return (date, time);
}

/// Belirli bir metinden kararlı sayı (belge no, barkod): FNV-1a, 32 bit.
int hashStr(String str) {
  var h = 2166136261;
  for (final c in str.codeUnits) {
    h = (h ^ c) & 0xFFFFFFFF;
    h = (h * 16777619) & 0xFFFFFFFF;
  }
  return h;
}

/// `Math.imul(a, b) >>> 0`
int imul32(int a, int b) => (a * b) & 0xFFFFFFFF;

String upper(String t) => trUpper(t);

String initials(String name) => name
    .split(RegExp(r'\s+'))
    .where((w) => w.isNotEmpty)
    .take(2)
    .map((w) => trUpper(String.fromCharCode(w.runes.first)))
    .join();

/// Büyük harfle başlatır (`charAt(0).toLocaleUpperCase('tr') + slice(1)`).
String capitalize(String t) => t.isEmpty ? t : trUpper(String.fromCharCode(t.runes.first)) + t.substring(String.fromCharCode(t.runes.first).length);

final _paraSplit = RegExp(r'\n\s*\n');
final _spaces = RegExp(r'[ \t\r\f\v]+');

/// Paragraflar: boş satırla ayrılır; satır içi kırılmalar korunur (HTML'deki gibi boşluklar daralır).
List<String> paragraphs(String text) => [
  for (final p in text.split(_paraSplit))
    if (p.trim().isNotEmpty) p.split('\n').map((l) => l.replaceAll(_spaces, ' ').trim()).join('\n'),
];

/// `<Paras>`: her paragraf bir `<p>`. [gap] paragraflar arası (`p + p { margin-top }`),
/// [bottom] her paragrafın alt boşluğu (`p { margin-bottom }`, sonuncusu dahil).
class Paras extends StatelessWidget {
  const Paras(this.text, {super.key, this.style, this.gap = 0, this.bottom = 0, this.textAlign});
  final String text;
  final TextStyle? style;
  final double gap;
  final double bottom;
  final TextAlign? textAlign;

  @override
  Widget build(BuildContext context) {
    final ps = paragraphs(text);
    final out = <Widget>[];
    for (var i = 0; i < ps.length; i++) {
      if (i > 0) out.add(SizedBox(height: math.max(gap, bottom)));
      out.add(Text(ps[i], style: style, textAlign: textAlign));
    }
    if (ps.isNotEmpty && bottom > 0) out.add(SizedBox(height: bottom));
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: out);
  }
}
