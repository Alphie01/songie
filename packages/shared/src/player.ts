import { z } from 'zod';

export const AVATAR_SHAPES = ['circle', 'square', 'burst', 'diamond', 'triangle', 'hexagon'] as const;
export const AVATAR_COLORS = ['signal', 'label', 'paper', 'mint', 'sky'] as const;

export const avatarSchema = z.object({
  shape: z.enum(AVATAR_SHAPES),
  color: z.enum(AVATAR_COLORS),
});
export type Avatar = z.infer<typeof avatarSchema>;

export const nickSchema = z
  .string()
  .trim()
  .min(2, 'Takma ad en az 2 karakter olmalı')
  .max(16, 'Takma ad en fazla 16 karakter olabilir')
  .regex(/^[\p{L}\p{N} ._-]+$/u, 'Takma adda yalnızca harf, rakam, boşluk ve . _ - kullanılabilir');

export const profileInputSchema = z.object({ nick: nickSchema, avatar: avatarSchema });
export type ProfileInput = z.infer<typeof profileInputSchema>;

export interface Profile {
  id: string;
  nick: string;
  avatar: Avatar;
}

export interface ProfileStats {
  gamesPlayed: number;
  wins: number;
  bestScore: number;
  bestStreak: number;
}
