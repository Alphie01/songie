import type Database from 'better-sqlite3';
import { foldText, normalizeArtist, normalizeTitle } from '@songie/shared';
import type { Difficulty, PoolCategory, PoolInfo, SearchHit } from '../../shared/index.js';
import { DeezerClient, type DzTrack } from './deezer.js';
import { fetchSpotifyPlaylist, type SpotifyTrack } from './spotify.js';

export interface TrackRow {
  id: number;
  title: string;
  artist: string;
  album: string;
  cover: string | null;
  rank: number;
  preview_ok: number;
  norm_title: string;
  norm_artist: string;
}

export interface PoolDef {
  id: string;
  name: string;
  category: PoolCategory;
  /** Deezer playlist ID'si. */
  playlist: string;
  max?: number;
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS sg_tracks (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    album TEXT NOT NULL DEFAULT '',
    cover TEXT,
    rank INTEGER NOT NULL DEFAULT 0,
    preview_ok INTEGER NOT NULL DEFAULT 1,
    norm_title TEXT NOT NULL,
    norm_artist TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE VIRTUAL TABLE IF NOT EXISTS sg_tracks_fts USING fts5(
    words, content='', contentless_delete=1, tokenize='unicode61 remove_diacritics 2'
  );
  CREATE TABLE IF NOT EXISTS sg_pools (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    playlist TEXT NOT NULL,
    cover TEXT,
    track_count INTEGER NOT NULL DEFAULT 0,
    custom INTEGER NOT NULL DEFAULT 0,
    created_by TEXT,
    refreshed_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sg_pool_tracks (
    pool_id TEXT NOT NULL REFERENCES sg_pools(id) ON DELETE CASCADE,
    track_id INTEGER NOT NULL REFERENCES sg_tracks(id),
    position INTEGER NOT NULL,
    PRIMARY KEY (pool_id, track_id)
  );
`;

/** Listedeki şarkılar popülerliğe (Deezer rank) göre sıralanır; zorluk hangi dilimden seçileceğini belirler. */
const DIFFICULTY_SLICE: Record<Difficulty, [number, number]> = {
  easy: [0, 0.25],
  medium: [0, 0.5],
  hard: [0.2, 0.75],
  expert: [0.45, 1],
  impossible: [0.7, 1],
};

const MIN_POOL_TRACKS = 10;

export class Catalog {
  private searchCache = new Map<string, { at: number; hits: SearchHit[] }>();

  constructor(
    private db: Database.Database,
    readonly deezer: DeezerClient = new DeezerClient(),
  ) {
    db.exec(SCHEMA);
  }

  // ---------- şarkılar ----------

  upsertTracks(tracks: DzTrack[]): void {
    const find = this.db.prepare('SELECT 1 FROM sg_tracks WHERE id = ?');
    const upsert = this.db.prepare(`
      INSERT INTO sg_tracks (id, title, artist, album, cover, rank, preview_ok, norm_title, norm_artist, updated_at)
      VALUES (@id, @title, @artist, @album, @cover, @rank, @preview_ok, @norm_title, @norm_artist, @now)
      ON CONFLICT(id) DO UPDATE SET title = excluded.title, artist = excluded.artist, album = excluded.album,
        cover = COALESCE(excluded.cover, sg_tracks.cover), rank = MAX(excluded.rank, sg_tracks.rank),
        preview_ok = excluded.preview_ok, norm_title = excluded.norm_title, norm_artist = excluded.norm_artist,
        updated_at = excluded.updated_at`);
    const ftsDel = this.db.prepare('DELETE FROM sg_tracks_fts WHERE rowid = ?');
    const ftsIns = this.db.prepare('INSERT INTO sg_tracks_fts (rowid, words) VALUES (?, ?)');
    const now = Date.now();
    this.db.transaction(() => {
      for (const t of tracks) {
        if (!t?.id || !t.title || !t.artist?.name) continue;
        const existed = find.get(t.id);
        const row = {
          id: t.id,
          title: t.title_short || t.title,
          artist: t.artist.name,
          album: t.album?.title ?? '',
          cover: t.album?.cover_medium ?? null,
          rank: t.rank ?? 0,
          preview_ok: t.readable === false || t.preview === '' ? 0 : 1,
          norm_title: normalizeTitle(t.title_short || t.title),
          norm_artist: normalizeArtist(t.artist.name),
          now,
        };
        upsert.run(row);
        if (existed) ftsDel.run(t.id);
        ftsIns.run(t.id, foldText(`${t.title} ${t.artist.name}`));
      }
    })();
  }

  track(id: number): TrackRow | null {
    return (this.db.prepare('SELECT * FROM sg_tracks WHERE id = ?').get(id) as TrackRow | undefined) ?? null;
  }

  markNoPreview(id: number): void {
    this.db.prepare('UPDATE sg_tracks SET preview_ok = 0 WHERE id = ?').run(id);
  }

  /** Seçilen listelerden, zorluğa göre popülerlik diliminden rastgele şarkılar. */
  pickTracks(poolIds: string[], count: number, difficulty: Difficulty, exclude: Set<number>): TrackRow[] {
    const marks = poolIds.map(() => '?').join(',');
    const all = this.db
      .prepare(
        `SELECT DISTINCT t.* FROM sg_tracks t JOIN sg_pool_tracks pt ON pt.track_id = t.id
         WHERE pt.pool_id IN (${marks}) AND t.preview_ok = 1 ORDER BY t.rank DESC`,
      )
      .all(...poolIds) as TrackRow[];
    const [from, to] = DIFFICULTY_SLICE[difficulty];
    let slice = all.slice(Math.floor(all.length * from), Math.max(Math.ceil(all.length * to), 1));
    if (slice.length < count) slice = all;
    // Aynı şarkının farklı sürümleri aynı oyunda iki kez çıkmasın.
    const seenKeys = new Set<string>();
    const fresh = shuffle(slice.filter((t) => !exclude.has(t.id)));
    const pool = fresh.length >= count ? fresh : shuffle(slice);
    const out: TrackRow[] = [];
    for (const t of pool) {
      const key = `${t.norm_title}|${t.norm_artist}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      out.push(t);
      if (out.length >= count) break;
    }
    return out;
  }

  // ---------- arama ----------

  /** `poolIds` verilirse yalnızca o listelerdeki şarkılarda arar ("Kolay arama"). */
  searchLocal(q: string, limit = 8, poolIds?: string[]): SearchHit[] {
    const words = foldText(q).split(' ').filter(Boolean).slice(0, 6);
    if (!words.length) return [];
    const match = words.map((w) => `"${w.replace(/"/g, '')}"*`).join(' ');
    const inPools = poolIds?.length
      ? `AND t.id IN (SELECT track_id FROM sg_pool_tracks WHERE pool_id IN (${poolIds.map(() => '?').join(',')}))`
      : '';
    const rows = this.db
      .prepare(
        `SELECT t.id, t.title, t.artist, t.cover FROM sg_tracks_fts f JOIN sg_tracks t ON t.id = f.rowid
         WHERE sg_tracks_fts MATCH ? ${inPools} ORDER BY t.rank DESC LIMIT ?`,
      )
      .all(match, ...(poolIds ?? []), limit * 2) as SearchHit[];
    return dedupe(rows).slice(0, limit);
  }

  /** Yerel sonuçlar + Deezer araması. Öneriler sadece oyundaki listelerden gelmez, cevabı ele vermez. */
  async search(q: string, limit = 8): Promise<SearchHit[]> {
    const key = foldText(q);
    if (key.length < 2) return [];
    const cached = this.searchCache.get(key);
    if (cached && Date.now() - cached.at < 10 * 60_000) return cached.hits;
    let remote: SearchHit[] = [];
    try {
      const found = await this.deezer.search(q, 12);
      this.upsertTracks(found);
      remote = found.map((t) => ({ id: t.id, title: t.title_short || t.title, artist: t.artist.name, cover: t.album?.cover_medium ?? null }));
    } catch {
      // Deezer'a ulaşılamazsa yerel sonuçlarla devam.
    }
    const local = this.searchLocal(q, limit);
    const hits = dedupe(interleave(remote, local)).slice(0, limit);
    this.searchCache.set(key, { at: Date.now(), hits });
    if (this.searchCache.size > 2000) this.searchCache.delete(this.searchCache.keys().next().value!);
    return hits;
  }

  // ---------- listeler ----------

  pools(): PoolInfo[] {
    const rows = this.db
      .prepare('SELECT id, name, category, cover, track_count, custom FROM sg_pools WHERE track_count >= ? ORDER BY custom, rowid')
      .all(MIN_POOL_TRACKS) as { id: string; name: string; category: PoolCategory; cover: string | null; track_count: number; custom: number }[];
    return rows.map((r) => ({ id: r.id, name: r.name, category: r.category, cover: r.cover, trackCount: r.track_count, custom: !!r.custom }));
  }

  poolNames(ids: string[]): string[] {
    const byId = new Map(this.pools().map((p) => [p.id, p.name]));
    return ids.map((id) => byId.get(id) ?? id);
  }

  missingPools(ids: string[]): string[] {
    const have = new Set(this.pools().map((p) => p.id));
    return ids.filter((id) => !have.has(id));
  }

  async importPool(def: PoolDef, opts: { custom?: boolean; createdBy?: string } = {}): Promise<PoolInfo> {
    if (def.playlist.startsWith('spotify:')) {
      return (await this.importSpotify(def.playlist.slice(8), { ...opts, id: def.id, name: def.name })).pool;
    }
    const meta = await this.deezer.playlist(def.playlist);
    const tracks = await this.deezer.playlistTracks(def.playlist, def.max ?? 400);
    return this.storePool(def, tracks, meta.picture_medium ?? null, opts);
  }

  /**
   * Spotify listesini okur, her şarkıyı Deezer'da bulup önizlemesiyle eşleştirir.
   * Eşleşmeyen şarkılar (Deezer'da yok ya da önizlemesiz) listeye alınmaz.
   */
  async importSpotify(
    spotifyId: string,
    opts: { custom?: boolean; createdBy?: string; id?: string; name?: string; fetchImpl?: typeof fetch } = {},
  ): Promise<{ pool: PoolInfo; matched: number; total: number }> {
    const sp = await fetchSpotifyPlaylist(spotifyId, opts.fetchImpl);
    const found = await Promise.all(sp.tracks.map((t) => this.matchOnDeezer(t).catch(() => null)));
    const tracks = found.filter((t): t is DzTrack => t !== null);
    const def: PoolDef = {
      id: opts.id ?? `custom-sp-${spotifyId}`,
      name: opts.name ?? sp.name,
      category: 'ozel',
      playlist: `spotify:${spotifyId}`,
    };
    const pool = this.storePool(def, tracks, sp.cover, { custom: opts.custom ?? true, createdBy: opts.createdBy });
    return { pool, matched: pool.trackCount, total: sp.tracks.length };
  }

  /** Spotify şarkısını Deezer'da bulur: sanatçı + ad eşleşmeli, süre yakınsa tercih edilir. */
  async matchOnDeezer(t: SpotifyTrack): Promise<DzTrack | null> {
    const title = normalizeTitle(t.title);
    const artist = normalizeArtist(t.artist);
    // Deezer'ın gelişmiş sözdizimi (artist:"…") yeni şarkılarda boş dönebiliyor; düz arama güvenilir.
    const hits = await this.deezer.search(`${t.artist} ${title}`, 8);
    const same = (h: DzTrack) => {
      if (!h.preview || h.readable === false || normalizeArtist(h.artist.name) !== artist) return false;
      const ht = normalizeTitle(h.title_short || h.title);
      return ht === title || ht.startsWith(title) || title.startsWith(ht);
    };
    const close = (h: DzTrack) => !t.durationMs || Math.abs((h.duration ?? 0) * 1000 - t.durationMs) < 5000;
    return hits.find((h) => same(h) && close(h)) ?? hits.find(same) ?? null;
  }

  private storePool(def: PoolDef, tracks: DzTrack[], cover: string | null, opts: { custom?: boolean; createdBy?: string }): PoolInfo {
    this.upsertTracks(tracks);
    const ids = tracks.filter((t) => t.readable !== false && t.preview).map((t) => t.id);
    const unique = [...new Set(ids)];
    this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO sg_pools (id, name, category, playlist, cover, track_count, custom, created_by, refreshed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET name = excluded.name, category = excluded.category, playlist = excluded.playlist,
             cover = excluded.cover, track_count = excluded.track_count, refreshed_at = excluded.refreshed_at`,
        )
        .run(def.id, def.name, def.category, def.playlist, cover, unique.length, opts.custom ? 1 : 0, opts.createdBy ?? null, Date.now());
      this.db.prepare('DELETE FROM sg_pool_tracks WHERE pool_id = ?').run(def.id);
      const ins = this.db.prepare('INSERT OR IGNORE INTO sg_pool_tracks (pool_id, track_id, position) VALUES (?, ?, ?)');
      unique.forEach((id, i) => ins.run(def.id, id, i));
    })();
    return { id: def.id, name: def.name, category: def.category, cover, trackCount: unique.length, custom: !!opts.custom };
  }

  poolDefs(): PoolDef[] {
    return this.db.prepare('SELECT id, name, category, playlist FROM sg_pools').all() as PoolDef[];
  }

  poolByPlaylist(playlist: string): PoolInfo | null {
    const row = this.db.prepare('SELECT id FROM sg_pools WHERE playlist = ?').get(playlist) as { id: string } | undefined;
    return row ? (this.pools().find((p) => p.id === row.id) ?? null) : null;
  }
}

function dedupe(hits: SearchHit[]): SearchHit[] {
  const seen = new Set<string>();
  return hits.filter((h) => {
    const key = `${normalizeTitle(h.title)}|${normalizeArtist(h.artist)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function interleave<T>(a: T[], b: T[]): T[] {
  const out: T[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i]) out.push(a[i]!);
    if (b[i]) out.push(b[i]!);
  }
  return out;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
