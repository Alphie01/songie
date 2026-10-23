export type ColorToken =
  | 'pink' | 'yellow' | 'mint' | 'sky' | 'lilac' | 'bg'
  | 'bgDeep' | 'panel' | 'ink' | 'paper' | 'cream' | 'coral';

export type AppTheme = {
  id: 'songie' | 'itiraf' | 'casebook' | 'weknows';
  name: string;
  colors: Record<ColorToken, string>;
  stageColors: string[];
  cta: string;
  stores: string;
};
