import { continueRender, delayRender, staticFile } from 'remotion';

export const FONT_DISPLAY = "'Baloo 2', sans-serif";
export const FONT_BODY = "'Nunito', sans-serif";

export const VIDEO = { width: 1080, height: 1920, fps: 30 } as const;
export const SAFE = { top: 250, bottom: 400, side: 60 } as const;

const FACES = [
  { family: 'Baloo 2', weight: '800', file: 'Baloo2-ExtraBold.ttf' },
  { family: 'Baloo 2', weight: '700', file: 'Baloo2-Bold.ttf' },
  { family: 'Nunito', weight: '800', file: 'Nunito-ExtraBold.ttf' },
  { family: 'Nunito', weight: '700', file: 'Nunito-Bold.ttf' },
] as const;

let loading: Promise<void> | null = null;

export function loadBrandFonts(): Promise<void> {
  if (loading) return loading;
  const handle = delayRender('Loading brand fonts');
  loading = Promise.all(
    FACES.map(async (f) => {
      const face = new FontFace(f.family, `url(${staticFile(`fonts/${f.file}`)})`, {
        weight: f.weight,
      });
      await face.load();
      document.fonts.add(face);
    }),
  )
    .then(() => continueRender(handle))
    .catch((err) => {
      loading = null;
      continueRender(handle);
      throw err;
    });
  return loading;
}
