/**
 * Spotify playlist'lerini Spotify'ın herkese açık "embed" sayfasından okur (API anahtarı gerekmez).
 * Not: resmi bir API değildir; sayfa yalnızca ilk 100 şarkıyı verir ve Spotify değiştirirse
 * buranın güncellenmesi gerekir.
 */

export interface SpotifyTrack {
  title: string;
  artist: string;
  durationMs: number;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  cover: string | null;
  tracks: SpotifyTrack[];
}

export class SpotifyError extends Error {}

/** open.spotify.com/playlist/… (dil önekli olabilir) ya da spotify:playlist:… */
export function parseSpotifyPlaylistRef(input: string): string | null {
  const s = input.trim();
  const m = s.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(?:embed\/)?playlist\/([A-Za-z0-9]{22})/) ?? s.match(/^spotify:playlist:([A-Za-z0-9]{22})$/);
  return m ? m[1]! : null;
}

interface EmbedEntity {
  name?: string;
  title?: string;
  coverArt?: { sources?: { url: string }[] };
  trackList?: { title?: string; subtitle?: string; duration?: number }[];
}

export async function fetchSpotifyPlaylist(id: string, fetchImpl: typeof fetch = fetch): Promise<SpotifyPlaylist> {
  let res: Response;
  try {
    res = await fetchImpl(`https://open.spotify.com/embed/playlist/${id}`, {
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; songie)', 'accept-language': 'tr,en;q=0.8' },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new SpotifyError('Spotify’a ulaşılamadı. Biraz sonra tekrar dene.');
  }
  if (res.status === 404) throw new SpotifyError('Bu Spotify listesi bulunamadı. Herkese açık olduğundan emin ol.');
  if (!res.ok) throw new SpotifyError('Spotify listesi okunamadı. Biraz sonra tekrar dene.');
  const html = await res.text();
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) throw new SpotifyError('Spotify listesi okunamadı. Herkese açık olduğundan emin ol.');
  let entity: EmbedEntity | undefined;
  try {
    entity = JSON.parse(m[1]!)?.props?.pageProps?.state?.data?.entity as EmbedEntity | undefined;
  } catch {
    entity = undefined;
  }
  if (!entity?.trackList?.length) throw new SpotifyError('Bu Spotify listesi boş ya da gizli.');
  return {
    id,
    name: (entity.name ?? entity.title ?? 'Spotify listesi').slice(0, 60),
    cover: entity.coverArt?.sources?.[0]?.url ?? null,
    tracks: entity.trackList
      .filter((t) => t.title && t.subtitle)
      .map((t) => ({ title: t.title!, artist: t.subtitle!.split(',')[0]!.trim(), durationMs: t.duration ?? 0 })),
  };
}
