import 'package:songie_core/games/detective/models.dart';

/// games/detective/server/index.ts `RANK_ORDER`.
const rankOrder = ['Stajyer', 'Komiser Yardımcısı', 'Komiser', 'Başkomiser'];

/// games/detective/server/game.ts: çözülen dosyada puan oranı ≥ %45 / %65 / %85.
const rankThreshold = {'Komiser Yardımcısı': 45, 'Komiser': 65, 'Başkomiser': 85};

int rankIndex(String rank) {
  final i = rankOrder.indexOf(rank);
  return i < 0 ? 0 : i;
}

/// Oyuncunun en iyi rütbesi (hiç dosya kapatmadıysa Stajyer).
String bestRank(Iterable<CaseCard> cases) {
  var best = 0;
  for (final c in cases) {
    if (c.solved != null) best = rankIndex(c.solved!.rank) > best ? rankIndex(c.solved!.rank) : best;
  }
  return rankOrder[best];
}

/// Sıradaki rütbe ve gereken yüzde; en üstteyse null.
({String rank, int percent})? nextRank(String current) {
  final i = rankIndex(current);
  if (i >= rankOrder.length - 1) return null;
  final next = rankOrder[i + 1];
  return (rank: next, percent: rankThreshold[next]!);
}

/// "Uludağ, Bursa — Aralık 2025" → "Uludağ, Bursa".
String placeOf(String subtitle) => subtitle.split(' — ').first.trim();

/// Türkçe baş harf büyütme ("çok zor" → "Çok zor").
String capitalizeTr(String s) {
  if (s.isEmpty) return s;
  final first = s.substring(0, 1);
  final up = switch (first) {
    'i' => 'İ',
    'ı' => 'I',
    _ => first.toUpperCase(),
  };
  return up + s.substring(1);
}
