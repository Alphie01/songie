// games/song-guess/shared/index.ts karşılığı.
import 'dart:math' as math;

import '../../shared/models.dart';

const gameId = 'song-guess';

/// Her aşamada çalınan klip uzunluğu (saniye).
const stageClipsDefault = <double>[0.1, 0.5, 2, 8, 15];
const stageCount = 5;
const stagePoints = [1000, 700, 450, 250, 100];
const speedBonus = 200;
const firstBonus = 50;
const artistShare = 0.3;

const difficulties = ['easy', 'medium', 'hard', 'expert', 'impossible'];

/// Aşama başına süre seçenekleri (sn). 0 = süresiz: aşamalar yalnızca pas/tahminle ilerler.
const timerOptions = [0, 10, 20, 30];

/// Tur sayısı seçenekleri. 0 = sınırsız.
const roundOptions = [5, 10, 15, 20, 0];

const poolCategories = ['turkce', 'global', 'tur', 'donem', 'ulke', 'ozel'];

class SongSettings {
  const SongSettings({
    required this.rounds,
    required this.pools,
    required this.difficulty,
    required this.timer,
    required this.startAt,
    required this.startStage,
    required this.easySearch,
    required this.artistCredit,
  });

  final int rounds;
  final List<String> pools;

  /// easy | medium | hard | expert | impossible
  final String difficulty;
  final int timer;

  /// start | random
  final String startAt;

  /// Oyun bu aşamadan başlar (songspot'taki "Guess after").
  final int startStage;

  /// Öneriler yalnızca seçili listelerden gelir.
  final bool easySearch;
  final bool artistCredit;

  factory SongSettings.fromJson(Json j) => SongSettings(
    rounds: j.integer('rounds', defaultSettings.rounds),
    pools: j['pools'] is List ? j.strs('pools') : defaultSettings.pools,
    difficulty: j.str('difficulty', defaultSettings.difficulty),
    timer: j.integer('timer', defaultSettings.timer),
    startAt: j.str('startAt', defaultSettings.startAt),
    startStage: j.integer('startStage', defaultSettings.startStage),
    easySearch: j.boolean('easySearch', defaultSettings.easySearch),
    artistCredit: j.boolean('artistCredit', defaultSettings.artistCredit),
  );

  Json toJson() => {
    'rounds': rounds,
    'pools': pools,
    'difficulty': difficulty,
    'timer': timer,
    'startAt': startAt,
    'startStage': startStage,
    'easySearch': easySearch,
    'artistCredit': artistCredit,
  };
}

const defaultSettings = SongSettings(
  rounds: 10,
  pools: ['tr-top', 'global-top'],
  difficulty: 'medium',
  timer: 0,
  startAt: 'random',
  startStage: 0,
  easySearch: false,
  artistCredit: true,
);

/// Tek başına: sınırsız, süresiz; seri sayılır.
const soloSettings = SongSettings(
  rounds: 0,
  pools: ['tr-top', 'global-top'],
  difficulty: 'medium',
  timer: 0,
  startAt: 'random',
  startStage: 0,
  easySearch: false,
  artistCredit: true,
);

/// wrong | artist | correct
typedef Verdict = String;

/// listening | locked | skipped | artist | correct
typedef PlayerRoundState = String;

class GuessRecord {
  const GuessRecord({required this.stage, required this.title, required this.artist, required this.verdict});
  final int stage;
  final String title;
  final String artist;
  final Verdict verdict;

  factory GuessRecord.fromJson(Json j) =>
      GuessRecord(stage: j.integer('stage'), title: j.str('title'), artist: j.str('artist'), verdict: j.str('verdict', 'wrong'));
}

class PlayerLine {
  const PlayerLine({
    required this.id,
    required this.score,
    required this.roundPoints,
    required this.state,
    this.solvedStage,
    required this.streak,
    required this.bestStreak,
    required this.ready,
  });
  final String id;
  final int score;
  final int roundPoints;
  final PlayerRoundState state;

  /// Doğru bildiği aşama (0–4).
  final int? solvedStage;

  /// Art arda doğru bilinen şarkı sayısı.
  final int streak;
  final int bestStreak;

  /// Sonuç ekranında "Sonraki şarkı"ya bastı mı.
  final bool ready;

  factory PlayerLine.fromJson(Json j) => PlayerLine(
    id: j.str('id'),
    score: j.integer('score'),
    roundPoints: j.integer('roundPoints'),
    state: j.str('state', 'listening'),
    solvedStage: j.intOrNull('solvedStage'),
    streak: j.integer('streak'),
    bestStreak: j.integer('bestStreak'),
    ready: j.boolean('ready'),
  );
}

class RevealResult {
  const RevealResult({required this.playerId, required this.stage, required this.points, required this.kind});
  final String playerId;
  final int stage;
  final int points;

  /// artist | correct
  final String kind;

  factory RevealResult.fromJson(Json j) =>
      RevealResult(playerId: j.str('playerId'), stage: j.integer('stage'), points: j.integer('points'), kind: j.str('kind', 'correct'));
}

class RevealInfo {
  const RevealInfo({
    required this.trackId,
    required this.title,
    required this.artist,
    required this.album,
    this.cover,
    this.year,
    required this.link,
    required this.previewUrl,
    this.poolName,
    required this.results,
  });
  final int trackId;
  final String title;
  final String artist;
  final String album;
  final String? cover;
  final int? year;
  final String link;
  final String previewUrl;

  /// Şarkının geldiği liste (seçili listelerden).
  final String? poolName;
  final List<RevealResult> results;

  factory RevealInfo.fromJson(Json j) => RevealInfo(
    trackId: j.integer('trackId'),
    title: j.str('title'),
    artist: j.str('artist'),
    album: j.str('album'),
    cover: j.strOrNull('cover'),
    year: j.intOrNull('year'),
    link: j.str('link'),
    previewUrl: j.str('previewUrl'),
    poolName: j.strOrNull('poolName'),
    results: j.objs('results').map(RevealResult.fromJson).toList(),
  );
}

/// correct | artist | wrong | skip | settings
typedef FeedKind = String;

/// Canlı akış: kim ne yaptı (tahminin kendisi gösterilmez, ipucu olmasın).
class FeedItem {
  const FeedItem({required this.id, required this.at, required this.playerId, required this.kind, required this.stage, this.points, this.text});
  final int id;
  final int at;
  final String playerId;
  final FeedKind kind;
  final int stage;
  final int? points;

  /// 'settings' için kısa açıklama.
  final String? text;

  factory FeedItem.fromJson(Json j) => FeedItem(
    id: j.integer('id'),
    at: j.integer('at'),
    playerId: j.str('playerId'),
    kind: j.str('kind'),
    stage: j.integer('stage'),
    points: j.intOrNull('points'),
    text: j.strOrNull('text'),
  );
}

class SongMe {
  const SongMe({required this.state, required this.canGuess, required this.guesses});
  final PlayerRoundState state;
  final bool canGuess;
  final List<GuessRecord> guesses;

  factory SongMe.fromJson(Json j) =>
      SongMe(state: j.str('state', 'listening'), canGuess: j.boolean('canGuess'), guesses: j.objs('guesses').map(GuessRecord.fromJson).toList());
}

/// loading | countdown | stage | reveal | podium
typedef SongPhase = String;

class SongView {
  const SongView({
    required this.phase,
    required this.round,
    this.totalRounds,
    required this.stage,
    required this.stageClips,
    required this.serverNow,
    required this.phaseEndsAt,
    required this.phaseMs,
    required this.clips,
    required this.poolNames,
    required this.players,
    required this.me,
    this.reveal,
    required this.timed,
    required this.startStage,
    required this.easySearch,
    required this.pools,
    required this.artistCredit,
    required this.difficulty,
    required this.feed,
  });

  final SongPhase phase;
  final int round;
  final int? totalRounds;
  final int stage;
  final List<double> stageClips;
  final int serverNow;
  final int phaseEndsAt;
  final int phaseMs;

  /// Açılmış aşamaların klip adresleri; açılmamışlar null.
  final List<String?> clips;
  final List<String> poolNames;
  final List<PlayerLine> players;
  final SongMe me;
  final RevealInfo? reveal;

  /// Aşama süresi açık mı; kapalıyken phaseEndsAt anlamsızdır.
  final bool timed;
  final int startStage;
  final bool easySearch;
  final List<String> pools;
  final bool artistCredit;
  final String difficulty;
  final List<FeedItem> feed;

  factory SongView.fromJson(Json j) {
    final clips = j.list('stageClips').whereType<num>().map((e) => e.toDouble()).toList();
    return SongView(
      phase: j.str('phase', 'loading'),
      round: j.integer('round'),
      totalRounds: j.intOrNull('totalRounds'),
      stage: j.integer('stage'),
      stageClips: clips.isEmpty ? stageClipsDefault : clips,
      serverNow: j.integer('serverNow'),
      phaseEndsAt: j.integer('phaseEndsAt'),
      phaseMs: j.integer('phaseMs'),
      clips: j.list('clips').map((e) => e is String ? e : null).toList(),
      poolNames: j.strs('poolNames'),
      players: j.objs('players').map(PlayerLine.fromJson).toList(),
      me: SongMe.fromJson(j.obj('me')),
      reveal: j.objOrNull('reveal') == null ? null : RevealInfo.fromJson(j.obj('reveal')),
      timed: j.boolean('timed'),
      startStage: j.integer('startStage'),
      easySearch: j.boolean('easySearch'),
      pools: j.strs('pools'),
      artistCredit: j.boolean('artistCredit', true),
      difficulty: j.str('difficulty', 'medium'),
      feed: j.objs('feed').map(FeedItem.fromJson).toList(),
    );
  }
}

class SearchHit {
  const SearchHit({required this.id, required this.title, required this.artist, this.cover});
  final int id;
  final String title;
  final String artist;
  final String? cover;

  factory SearchHit.fromJson(Json j) => SearchHit(id: j.integer('id'), title: j.str('title'), artist: j.str('artist'), cover: j.strOrNull('cover'));
}

class PoolInfo {
  const PoolInfo({required this.id, required this.name, required this.category, this.cover, required this.trackCount, required this.custom});
  final String id;
  final String name;

  /// turkce | global | tur | donem | ulke | ozel
  final String category;
  final String? cover;
  final int trackCount;
  final bool custom;

  factory PoolInfo.fromJson(Json j) => PoolInfo(
    id: j.str('id'),
    name: j.str('name'),
    category: j.str('category', 'ozel'),
    cover: j.strOrNull('cover'),
    trackCount: j.integer('trackCount'),
    custom: j.boolean('custom'),
  );
}

/// Aşama içinde ne kadar erken bilinirse o kadar hız bonusu.
int scoreFor({required int stage, required int elapsedMs, required int stageMs, required String kind, required bool first}) {
  final base = stage >= 0 && stage < stagePoints.length ? stagePoints[stage] : 0;
  final speed = (speedBonus * math.max(0, math.min(1, 1 - elapsedMs / stageMs))).round();
  if (kind == 'artist') return ((base + speed) * artistShare).round();
  return base + speed + (first ? firstBonus : 0);
}
