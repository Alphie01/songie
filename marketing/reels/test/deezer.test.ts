import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchSong, searchTrack } from '../tools/deezer';

afterEach(() => vi.unstubAllGlobals());

const hit = {
  id: 16412320,
  title: 'Kuzu Kuzu',
  preview: 'https://cdn.example/p.mp3',
  artist: { id: 12, name: 'Tarkan' },
  album: { title: 'Karma', cover_xl: 'https://cdn.example/c.jpg' },
};

describe('deezer', () => {
  it('skips results without a preview', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ data: [{ ...hit, id: 1, preview: '' }, hit] }))));
    expect((await searchTrack('tarkan kuzu kuzu')).id).toBe(16412320);
  });

  it('throws when nothing has a preview', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ data: [] }))));
    await expect(searchTrack('yok')).rejects.toThrow(/bulunamadı/);
  });

  it('downloads the preview once into assets/songs and returns the answer and public path', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deezer-'));
    const others = [hit, { ...hit, title: 'Kuzu Kuzu (Remix)' }, { ...hit, title: 'Şımarık' }, { ...hit, title: 'Dudu' }];
    const fetchMock = vi.fn(async (url: string) =>
      url.includes('/artist/12/top')
        ? new Response(JSON.stringify({ data: others }))
        : url.includes('api.deezer.com')
          ? new Response(JSON.stringify({ data: [hit] }))
          : new Response(new Uint8Array([1, 2, 3])),
    );
    vi.stubGlobal('fetch', fetchMock);
    const s = await fetchSong('tarkan kuzu kuzu', dir);
    expect(s).toMatchObject({
      answer: 'Tarkan – Kuzu Kuzu',
      album: 'Karma',
      src: 'assets/songs/16412320.mp3',
      cover: 'assets/songs/16412320.jpg',
      decoys: ['Tarkan – Şımarık', 'Tarkan – Dudu'],
    });
    expect(fs.existsSync(path.join(dir, 'songs', '16412320.jpg'))).toBe(true);
    expect(fs.readFileSync(path.join(dir, 'songs', '16412320.mp3'))).toHaveLength(3);
    await fetchSong('tarkan kuzu kuzu', dir);
    expect(fetchMock.mock.calls.filter(([u]) => !String(u).includes('api.deezer.com'))).toHaveLength(2);
  });
});
