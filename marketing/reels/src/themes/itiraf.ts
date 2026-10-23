import type { AppTheme } from './types';
import { songieTheme } from './songie';

/** İtiraf Köşesi (apps/itiraf_kosesi/lib/flavor.dart): same "Songie Arayüz" tokens, its own name and CTA. */
const colors = { ...songieTheme.colors };

export const itirafTheme: AppTheme = {
  id: 'itiraf',
  name: 'İtiraf Köşesi',
  colors,
  stageColors: [colors.pink, colors.yellow, colors.mint, colors.sky, colors.lilac],
  cta: 'Arkadaşlarınla en dürüst gece!',
  stores: songieTheme.stores,
};

/** flavor.dart badgeColor (#FF6B6B): the coral of the icon bubble and the App Store stage. */
export const ITIRAF_CORAL = '#ff6b6b';
