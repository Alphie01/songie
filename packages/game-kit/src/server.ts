import type { FastifyInstance } from 'fastify';
import type { ZodType } from 'zod';
import type { RoomPlayer } from '@songie/shared';

/** Mesajı oyuncuya olduğu gibi gösterilebilen hata. */
export class UserFacingError extends Error {}

export interface GameResult {
  playerId: string;
  score: number;
  /** Oyuna özel ek bilgi (ör. en iyi seri). Profil istatistiğine yazılır. */
  meta?: Record<string, unknown>;
}

export interface GameContext {
  readonly roomCode: string;
  /** Odadaki oyuncular, katılma sırasıyla. */
  players(): readonly RoomPlayer[];
  /** Şu anki oda sahibi. */
  hostId(): string;
  now(): number;
  /** İptal edilebilir zamanlayıcı. Oyun bitince hepsi otomatik temizlenir. */
  schedule(ms: number, fn: () => void): () => void;
  /** Her oyuncuya güncel `viewFor` görünümünü gönderir. */
  pushViews(): void;
  /** Oyunu bitirir; sonuçlar kaydedilir ve oda lobiye döner. */
  finish(results: GameResult[]): void;
  log(msg: string, data?: Record<string, unknown>): void;
}

export interface ServerGame<Settings = unknown, State = unknown, Action = unknown> {
  id: string;
  minPlayers: number;
  maxPlayers: number;
  settingsSchema: ZodType<Settings>;
  defaultSettings: Settings;
  actionSchema: ZodType<Action>;
  /** Oda ayarları değiştiğinde ek doğrulama (ör. seçilen listeler var mı). Hata metni döndürür. */
  validateSettings?(settings: Settings): string | null;
  start(ctx: GameContext, settings: Settings): Promise<State>;
  onAction(ctx: GameContext, state: State, playerId: string, action: Action): unknown | Promise<unknown>;
  onPlayerJoin?(ctx: GameContext, state: State, playerId: string): void;
  onPlayerLeave?(ctx: GameContext, state: State, playerId: string): void;
  viewFor(state: State, playerId: string): unknown;
  /**
   * Oda sahibi oyun sürerken ayarları değiştirdi. Tanımlıysa oyun yeni ayarları kendi uygun
   * gördüğü andan (ör. sıradaki tur) itibaren uygular; tanımlı değilse oyun sırasında ayar
   * değiştirilemez.
   */
  onSettings?(ctx: GameContext, state: State, settings: Settings): void;
  /**
   * Oda sahibi "Oyunu bitir" dedi. Tanımlıysa oyun kendi kapanışını yapar (ör. podyum) ve
   * `ctx.finish` ile skorları kaydeder; tanımlı değilse oyun skorsuz kesilir.
   */
  end?(ctx: GameContext, state: State): void;
  dispose?(state: State): void;
  /** Oyuna özel HTTP uçları (arama, medya). `/api/games/<id>` önekiyle kaydedilir. */
  routes?(app: FastifyInstance): void | Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyServerGame = ServerGame<any, any, any>;

export function defineServerGame<S, St, A>(game: ServerGame<S, St, A>): ServerGame<S, St, A> {
  return game;
}
