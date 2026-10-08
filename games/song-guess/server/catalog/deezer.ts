/** Deezer'ın herkese açık API'si. Sınır: IP başına 5 saniyede 50 istek; biz 40'ta kalıyoruz. */

export interface DzArtist {
  id: number;
  name: string;
}
export interface DzAlbum {
  id: number;
  title: string;
  cover_medium?: string;
  cover_big?: string;
  release_date?: string;
}
export interface DzTrack {
  id: number;
  readable?: boolean;
  title: string;
  title_short?: string;
  duration?: number;
  rank?: number;
  isrc?: string;
  preview?: string;
  release_date?: string;
  artist: DzArtist;
  album: DzAlbum;
}
export interface DzPlaylist {
  id: number;
  title: string;
  nb_tracks: number;
  picture_medium?: string;
  user?: { name: string };
}

interface DzError {
  error: { type: string; message: string; code: number };
}

export class DeezerError extends Error {
  constructor(
    message: string,
    public code?: number,
  ) {
    super(message);
  }
}

const BASE = 'https://api.deezer.com';
const WINDOW_MS = 5000;
const MAX_IN_WINDOW = 40;

export class DeezerClient {
  private sent: number[] = [];
  private queue: (() => void)[] = [];
  private timer: NodeJS.Timeout | null = null;

  constructor(private fetchImpl: typeof fetch = fetch) {}

  private slot(): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push(resolve);
      this.drain();
    });
  }

  private drain(): void {
    const now = Date.now();
    this.sent = this.sent.filter((t) => now - t < WINDOW_MS);
    while (this.queue.length && this.sent.length < MAX_IN_WINDOW) {
      this.sent.push(now);
      this.queue.shift()!();
    }
    if (this.queue.length && !this.timer) {
      const wait = WINDOW_MS - (now - this.sent[0]!) + 5;
      this.timer = setTimeout(() => {
        this.timer = null;
        this.drain();
      }, wait);
    }
  }

  async get<T>(path: string, attempt = 0): Promise<T> {
    await this.slot();
    const res = await this.fetchImpl(BASE + path, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new DeezerError(`Deezer ${res.status} for ${path}`, res.status);
    const body = (await res.json()) as T | DzError;
    if (body && typeof body === 'object' && 'error' in body) {
      // 4 = quota aşıldı: kısa bekleyip tekrar dene.
      if (body.error.code === 4 && attempt < 3) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        return this.get(path, attempt + 1);
      }
      throw new DeezerError(body.error.message, body.error.code);
    }
    return body as T;
  }

  track(id: number): Promise<DzTrack> {
    return this.get<DzTrack>(`/track/${id}`);
  }

  playlist(id: string | number): Promise<DzPlaylist> {
    return this.get<DzPlaylist>(`/playlist/${id}`);
  }

  async playlistTracks(id: string | number, max = 400): Promise<DzTrack[]> {
    const out: DzTrack[] = [];
    for (let index = 0; out.length < max; index += 100) {
      const page = await this.get<{ data: DzTrack[]; next?: string }>(`/playlist/${id}/tracks?index=${index}&limit=100`);
      out.push(...page.data);
      if (!page.next || page.data.length === 0) break;
    }
    return out.slice(0, max);
  }

  async search(q: string, limit = 10): Promise<DzTrack[]> {
    const res = await this.get<{ data: DzTrack[] }>(`/search/track?q=${encodeURIComponent(q)}&limit=${limit}`);
    return res.data;
  }
}

/** Deezer playlist linkinden ya da düz sayıdan playlist ID'si çıkarır. */
export function parsePlaylistRef(input: string): string | null {
  const s = input.trim();
  if (/^\d{4,15}$/.test(s)) return s;
  const m = s.match(/deezer\.com\/(?:[a-z]{2}\/)?playlist\/(\d{4,15})/i);
  return m ? m[1]! : null;
}
