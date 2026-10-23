import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { download } from './kie.js';

/**
 * Deezer 30 sn önizlemesi: oyunun kullandığı kaynakla aynı. Dosyalar `assets/songs/` altına iner
 * (telifli, git'e girmez) ve Remotion'a `assets/songs/<id>.mp3` olarak verilir.
 */
export type DeezerTrack = { id: number; title: string; artist: string; preview: string };
export type SongAsset = { id: number; title: string; artist: string; answer: string; src: string; file: string };

export async function searchTrack(query: string): Promise<DeezerTrack> {
  const res = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=5`);
  const json = (await res.json()) as { data?: { id: number; title: string; preview: string; artist: { name: string } }[] };
  const hit = json.data?.find((t) => t.preview);
  if (!hit) throw new Error(`Deezer'da önizlemesi olan şarkı bulunamadı: "${query}"`);
  return { id: hit.id, title: hit.title, artist: hit.artist.name, preview: hit.preview };
}

/** Şarkıyı bulur, önizlemesini `<assetsDir>/songs/<id>.mp3` olarak indirir (varsa tekrar indirmez). */
export async function fetchSong(query: string, assetsDir: string): Promise<SongAsset> {
  const t = await searchTrack(query);
  const file = path.join(assetsDir, 'songs', `${t.id}.mp3`);
  if (!fs.existsSync(file)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await download(t.preview, file);
  }
  return { id: t.id, title: t.title, artist: t.artist, answer: `${t.artist} – ${t.title}`, src: `assets/songs/${t.id}.mp3`, file };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const query = process.argv.slice(2).join(' ');
  if (!query) {
    console.error('kullanım: pnpm song "<sanatçı şarkı>"');
    process.exit(1);
  }
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const s = await fetchSong(query, path.join(root, 'assets'));
  console.log(JSON.stringify({ answer: s.answer, song: s.src }));
}
