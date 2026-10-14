import Fastify, { type FastifyInstance } from 'fastify';
import type { AnyServerGame } from '@songie/game-kit/server';
import { openDb, type DB } from './db.js';
import { loadGames, type GameDeps } from './games.js';
import { registerHttp, type AppLinks } from './http.js';
import { PlayerStore } from './players.js';
import { RoomManager, type RoomTimings } from './rooms/RoomManager.js';
import { firebaseVerifier, type IdTokenVerifier } from './firebase.js';
import { bindSockets, createIO, disconnectPlayer, socketTransport, type IO } from './socket.js';

export interface AppOptions {
  dataDir: string;
  webDist: string;
  ffmpegPath: string;
  allowedOrigins?: string[];
  dbFile?: string;
  fetchImpl?: typeof fetch;
  background?: boolean;
  timings?: Partial<RoomTimings>;
  logger?: boolean | { level: string };
  trustProxy?: boolean;
  gameOverrides?: GameDeps['overrides'];
  firebaseProjectId?: string;
  /** Testlerde sahte doğrulayıcı. */
  verifyIdToken?: IdTokenVerifier;
  minAppVersion?: string;
  appLinks?: AppLinks;
}

export interface App {
  http: FastifyInstance;
  io: IO;
  db: DB;
  rooms: RoomManager;
  players: PlayerStore;
  games: Map<string, AnyServerGame>;
  close(): Promise<void>;
}

export async function buildApp(opts: AppOptions): Promise<App> {
  const db = openDb(opts.dataDir, opts.dbFile);
  const players = new PlayerStore(db);
  const deps: GameDeps = { db, dataDir: opts.dataDir, ffmpegPath: opts.ffmpegPath, fetchImpl: opts.fetchImpl, background: opts.background, overrides: opts.gameOverrides };
  const games = loadGames(deps);

  const http = Fastify({ logger: opts.logger ?? false, trustProxy: opts.trustProxy ?? false, bodyLimit: 64 * 1024, forceCloseConnections: true });
  const io = createIO(http.server, opts.allowedOrigins ?? []);
  const rooms = new RoomManager(
    games,
    socketTransport(io),
    (gameId, code, results) => players.recordResults(gameId, code, results),
    opts.timings,
  );
  bindSockets(io, players, rooms);
  await registerHttp(http, {
    players,
    rooms,
    games,
    webDist: opts.webDist,
    verifyIdToken: opts.verifyIdToken ?? firebaseVerifier(opts.firebaseProjectId ?? 'songie-app'),
    disconnectPlayer: (id) => disconnectPlayer(io, id),
    minAppVersion: opts.minAppVersion ?? '1.0.0',
    appLinks: opts.appLinks ?? { appleTeamId: '', androidCertSha256: [] },
  });

  return {
    http,
    io,
    db,
    rooms,
    players,
    games,
    async close() {
      rooms.shutdown();
      io.close();
      await http.close();
      db.close();
    },
  };
}
