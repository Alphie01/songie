import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchSong, searchTrack } from '../tools/deezer';

afterEach(() => vi.unstubAllGlobals());

const hit = { id: 16412320, title: 'Kuzu Kuzu', preview: 'https://cdn.example/p.mp3', artist: { name: 'Tarkan' } };

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
    const fetchMock = vi.fn(async (url: string) =>
      url.includes('api.deezer.com') ? new Response(JSON.stringify({ data: [hit] })) : new Response(new Uint8Array([1, 2, 3])),
    );
    vi.stubGlobal('fetch', fetchMock);
    const s = await fetchSong('tarkan kuzu kuzu', dir);
    expect(s).toMatchObject({ answer: 'Tarkan – Kuzu Kuzu', src: 'assets/songs/16412320.mp3' });
    expect(fs.readFileSync(path.join(dir, 'songs', '16412320.mp3'))).toHaveLength(3);
    await fetchSong('tarkan kuzu kuzu', dir);
    expect(fetchMock.mock.calls.filter(([u]) => !String(u).includes('api.deezer.com'))).toHaveLength(1);
  });
});
