import { normalizeArtist, normalizeTitle } from '@songie/shared';

interface ItunesResult {
  trackName: string;
  artistName: string;
  previewUrl?: string;
}

/** Deezer önizlemesi olmayan şarkılar için iTunes'ta aynı şarkının önizlemesini arar. */
export async function findItunesPreview(title: string, artist: string, fetchImpl: typeof fetch = fetch): Promise<string | null> {
  const term = encodeURIComponent(`${artist} ${title}`);
  try {
    const res = await fetchImpl(`https://itunes.apple.com/search?term=${term}&entity=song&limit=10`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { results: ItunesResult[] };
    const t = normalizeTitle(title);
    const a = normalizeArtist(artist);
    const hit = body.results.find(
      (r) => r.previewUrl && normalizeTitle(r.trackName) === t && normalizeArtist(r.artistName) === a,
    );
    return hit?.previewUrl ?? null;
  } catch {
    return null;
  }
}
