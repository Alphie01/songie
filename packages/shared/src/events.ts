import { z } from 'zod';
import type { ChatMessage, RoomState } from './room.js';

export const roomCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{4}$/, 'Oda kodu 4 harften oluşur');

export const clientEvents = {
  'room:create': z.object({ gameId: z.string(), settings: z.unknown().optional() }),
  'room:join': z.object({ code: roomCodeSchema }),
  'room:leave': z.object({}),
  'room:settings': z.object({ settings: z.unknown() }),
  'room:ready': z.object({ ready: z.boolean() }),
  'room:start': z.object({}),
  'room:lobby': z.object({}),
  'room:kick': z.object({ playerId: z.string() }),
  'room:chat': z.object({ text: z.string().trim().min(1).max(200) }),
  'room:react': z.object({ emoji: z.string().min(1).max(8) }),
  'game:action': z.object({ action: z.unknown() }),
} as const;

export type ClientEventName = keyof typeof clientEvents;
export type ClientEventPayload<E extends ClientEventName> = z.infer<(typeof clientEvents)[E]>;

export type Ack<T = object> = ({ ok: true } & T) | { ok: false; error: string };

/** Oyun görünümü, hangi odaya ve oyuna ait olduğuyla birlikte (oda/oyun değişince eski görünüm kullanılmasın). */
export interface GameViewPayload {
  room: string;
  game: string;
  view: unknown;
}

export interface ServerToClient {
  'room:state': (state: RoomState) => void;
  'room:closed': (reason: string) => void;
  'room:chat': (msg: ChatMessage) => void;
  'room:react': (r: { playerId: string; emoji: string }) => void;
  'game:view': (payload: GameViewPayload | null) => void;
}

export type ClientToServer = {
  [E in ClientEventName]: (payload: ClientEventPayload<E>, ack: (res: Ack<Record<string, unknown>>) => void) => void;
};
