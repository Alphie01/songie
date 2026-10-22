import 'dart:convert';

import 'package:flutter/services.dart';

import '../flavor.dart';
import '../shared/models.dart';

/// Oyun kataloğu: `assets/catalog.json`, web'deki oyun kaydından üretilir
/// (`pnpm --filter @songie/web mobile:catalog`). Ad, tanıtım ve rehber metinleri tek kaynaktan gelir.
class GuideItem {
  const GuideItem({required this.term, required this.text, this.tone});
  final String term;
  final String text;

  /// green | yellow | orange | red | purple | neutral
  final String? tone;
}

class GuideSection {
  const GuideSection({required this.title, this.body, this.items = const [], this.tip});
  final String title;
  final String? body;
  final List<GuideItem> items;
  final String? tip;
}

class GameGuide {
  const GameGuide({required this.summary, required this.players, required this.duration, required this.sections});
  final String summary;
  final String players;
  final String duration;
  final List<GuideSection> sections;

  static GameGuide? fromJson(Object? json) {
    if (json is! Map) return null;
    final j = asJson(json);
    return GameGuide(
      summary: j.str('summary'),
      players: j.str('players'),
      duration: j.str('duration'),
      sections: j.objs('sections').map((s) {
        return GuideSection(
          title: s.str('title'),
          body: s.strOrNull('body'),
          tip: s.strOrNull('tip'),
          items: s.objs('items').map((i) => GuideItem(term: i.str('term'), text: i.str('text'), tone: i.strOrNull('tone'))).toList(),
        );
      }).toList(),
    );
  }
}

class GameInfo {
  const GameInfo({
    required this.id,
    required this.name,
    required this.pitch,
    required this.icon,
    required this.category,
    required this.mono,
    required this.teams,
    required this.minPlayers,
    required this.maxPlayers,
    required this.playersLabel,
    required this.soloSettings,
    required this.guide,
  });
  final String id;
  final String name;
  final String pitch;
  final String icon;
  final String category;
  final String mono;
  final bool teams;
  final int minPlayers;
  final int maxPlayers;

  /// "4–12 · iki takım", "1–12 oyuncu"
  final String playersLabel;

  /// Tek kişilik modu varsa "Tek başına oyna" bu ayarlarla oda kurar.
  final Object? soloSettings;
  final GameGuide? guide;
}

class GameCategory {
  const GameCategory(this.id, this.label);
  final String id;
  final String label;
}

class Catalog {
  Catalog._(this.categories, this.all, this.games);
  final List<GameCategory> categories;

  /// Sunucudaki bütün oyunlar (başka uygulamanın oda koduyla gelen oyuncuya ad göstermek için).
  final List<GameInfo> all;

  /// Bu uygulamada oynanan oyunlar ([AppFlavor.games] sırasıyla; boşsa hepsi).
  final List<GameInfo> games;

  static late Catalog instance;

  static Future<String> _read() async {
    try {
      return await rootBundle.loadString('packages/songie_core/assets/catalog.json');
    } on Object {
      // Paketin kendi testlerinde varlık öneksiz yüklenir.
      return rootBundle.loadString('assets/catalog.json');
    }
  }

  static Future<void> load() async {
    final j = asJson(jsonDecode(await _read()));
    final all = j.objs('games').map((g) {
        return GameInfo(
          id: g.str('id'),
          name: g.str('name'),
          pitch: g.str('pitch'),
          icon: g.str('icon'),
          category: g.str('category'),
          mono: g.str('mono'),
          teams: g.boolean('teams'),
          minPlayers: g.integer('minPlayers'),
          maxPlayers: g.integer('maxPlayers'),
          playersLabel: g.str('playersLabel'),
          soloSettings: g['soloSettings'],
          guide: GameGuide.fromJson(g['guide']),
        );
      }).toList();
    final ids = AppFlavor.current.games;
    final games = ids.isEmpty ? all : [for (final id in ids) ...all.where((g) => g.id == id)];
    final cats = j.objs('categories').map((c) => GameCategory(c.str('id'), c.str('label'))).toList();
    instance = Catalog._(cats.where((c) => c.id == 'all' || games.any((g) => g.category == c.id)).toList(), all, games);
  }

  /// Bu uygulamada oynanıyor mu.
  bool has(String id) => games.any((g) => g.id == id);

  GameInfo? find(String id) {
    for (final g in all) {
      if (g.id == id) return g;
    }
    return null;
  }
}
