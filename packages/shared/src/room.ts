import type { Avatar } from './player.js';

export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPRSTUVYZ';
export const ROOM_CODE_LENGTH = 4;
export const MAX_ROOM_PLAYERS = 12;

export interface RoomPlayer {
  id: string;
  nick: string;
  avatar: Avatar;
  connected: boolean;
  ready: boolean;
}

export type RoomPhase = 'lobby' | 'playing';

export interface ChatMessage {
  id: string;
  playerId: string;
  text: string;
  at: number;
}

export interface Standing {
  playerId: string;
  nick: string;
  avatar: Avatar;
  score: number;
  rank: number;
}

export interface RoomState {
  code: string;
  hostId: string;
  gameId: string;
  settings: unknown;
  phase: RoomPhase;
  players: RoomPlayer[];
  chat: ChatMessage[];
  /** Son bitmiş oyunun sıralaması, lobiye dönünce gösterilir. */
  lastStandings: Standing[] | null;
}
