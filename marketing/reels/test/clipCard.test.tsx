// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { songieTheme } from '../src/themes/songie';

// ClipCard animates with Remotion hooks; outside a composition there is no timeline, so pin it to frame 0.
vi.mock('remotion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('remotion')>();
  return {
    ...actual,
    useCurrentFrame: () => 0,
    useVideoConfig: () => ({ fps: 30, width: 1080, height: 1920, durationInFrames: 90, id: 'test' }),
  };
});

const { ClipCard } = await import('../src/brand/ClipCard');

afterEach(cleanup);

describe('ClipCard', () => {
  it('ClipCard falls back when src missing', () => {
    const { container } = render(<ClipCard theme={songieTheme} />);
    expect(screen.getByText('KLİP')).toBeTruthy();
    expect(container.querySelector('video')).toBeNull();
  });

  it('falls back when the file is not in public/', () => {
    const { container } = render(<ClipCard theme={songieTheme} src="assets/yok.mp4" />);
    expect(screen.getByText('KLİP')).toBeTruthy();
    expect(container.querySelector('video')).toBeNull();
  });
});
