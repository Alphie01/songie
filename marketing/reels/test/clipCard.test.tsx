// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { songieTheme } from '../src/themes/songie';

/** What getStaticFiles() reports as bundled in public/ (Studio and render fill this from the bundle). */
const staticFiles = vi.hoisted(() => ({ list: [] as { name: string }[] }));

// ClipCard animates with Remotion hooks; outside a composition there is no timeline, so pin it to frame 0.
// OffthreadVideo needs the renderer, so in jsdom it is a plain <video>.
vi.mock('remotion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('remotion')>();
  return {
    ...actual,
    useCurrentFrame: () => 0,
    useVideoConfig: () => ({ fps: 30, width: 1080, height: 1920, durationInFrames: 90, id: 'test' }),
    getStaticFiles: () => staticFiles.list,
    staticFile: (p: string) => `/public/${p}`,
    OffthreadVideo: ({ src }: { src: string }) => <video src={src} />,
  };
});

const { ClipCard } = await import('../src/brand/ClipCard');

afterEach(() => {
  cleanup();
  staticFiles.list = [];
});

describe('ClipCard', () => {
  it('ClipCard falls back when src missing', () => {
    staticFiles.list = [{ name: 'assets/r1-react.mp4' }];
    const { container } = render(<ClipCard theme={songieTheme} />);
    expect(screen.getByText('KLİP')).toBeTruthy();
    expect(container.querySelector('video')).toBeNull();
  });

  it('falls back when the file is not in public/', () => {
    staticFiles.list = [{ name: 'assets/other.mp4' }];
    const { container } = render(<ClipCard theme={songieTheme} src="assets/r1-react.mp4" />);
    expect(screen.getByText('KLİP')).toBeTruthy();
    expect(container.querySelector('video')).toBeNull();
  });

  it('plays the clip when the file is bundled', () => {
    staticFiles.list = [{ name: 'assets/r1-react.mp4' }];
    const { container } = render(<ClipCard theme={songieTheme} src="assets/r1-react.mp4" />);
    expect(screen.queryByText('KLİP')).toBeNull();
    expect(container.querySelector('video')?.getAttribute('src')).toBe('/public/assets/r1-react.mp4');
  });
});
