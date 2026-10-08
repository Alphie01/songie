import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import type {
  Ack,
  ChatMessage,
  ClientEventName,
  ClientEventPayload,
  Profile,
  ProfileInput,
  ProfileStats,
  RoomState,
} from '@songie/shared';
import { api, ApiError, getToken, setToken } from './api';

type Status = 'loading' | 'anonymous' | 'ready';
type Connection = 'connecting' | 'online' | 'offline';

interface Session {
  status: Status;
  connection: Connection;
  profile: Profile | null;
  stats: ProfileStats | null;
  room: RoomState | null;
  gameView: unknown;
  chat: ChatMessage[];
  reactions: { id: number; playerId: string; emoji: string }[];
  notice: string | null;
  saveProfile(input: ProfileInput): Promise<void>;
  refreshStats(): Promise<void>;
  emit<E extends ClientEventName>(event: E, payload: ClientEventPayload<E>): Promise<Ack<Record<string, unknown>>>;
  notify(text: string | null): void;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [connection, setConnection] = useState<Connection>('connecting');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [gameView, setGameView] = useState<unknown>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<Session['reactions']>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const reactionId = useRef(0);

  const loadMe = useCallback(async () => {
    if (!getToken()) {
      setStatus('anonymous');
      return;
    }
    try {
      const me = await api.get<{ profile: Profile; stats: ProfileStats }>('/api/me');
      setProfile(me.profile);
      setStats(me.stats);
      setStatus('ready');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setToken(null);
        setStatus('anonymous');
      } else {
        setNotice(err instanceof Error ? err.message : 'Sunucuya ulaşılamıyor.');
        setTimeout(() => void loadMe(), 3000);
      }
    }
  }, []);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  // Profil hazır olunca socket bağlantısı.
  useEffect(() => {
    if (status !== 'ready') return;
    const socket = io({ auth: { token: getToken() }, transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.on('connect', () => setConnection('online'));
    socket.on('disconnect', () => setConnection('offline'));
    socket.on('connect_error', (err) => {
      setConnection('offline');
      if (err.message === 'unauthorized') {
        setToken(null);
        setStatus('anonymous');
      }
    });
    socket.on('room:state', (state: RoomState) => {
      setRoom(state);
      setChat(state.chat);
    });
    socket.on('room:closed', (reason: string) => {
      setRoom(null);
      setGameView(null);
      setChat([]);
      setNotice(reason);
    });
    socket.on('room:chat', (msg: ChatMessage) => setChat((c) => [...c.slice(-39), msg]));
    socket.on('room:react', (r: { playerId: string; emoji: string }) => {
      const id = ++reactionId.current;
      setReactions((rs) => [...rs, { id, ...r }]);
      setTimeout(() => setReactions((rs) => rs.filter((x) => x.id !== id)), 2200);
    });
    socket.on('game:view', (v: unknown) => setGameView(v));
    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [status]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4500);
    return () => clearTimeout(t);
  }, [notice]);

  const emit = useCallback<Session['emit']>((event, payload) => {
    const socket = socketRef.current;
    if (!socket?.connected) return Promise.resolve({ ok: false, error: 'Bağlantı koptu. Yeniden bağlanıyor…' });
    return new Promise((resolve) => {
      socket.timeout(10_000).emit(event, payload, (err: Error | null, res: Ack<Record<string, unknown>>) => {
        resolve(err ? { ok: false, error: 'Sunucu cevap vermedi. Tekrar dene.' } : res);
      });
    });
  }, []);

  const saveProfile = useCallback(
    async (input: ProfileInput) => {
      if (profile) {
        const res = await api.put<{ profile: Profile }>('/api/me', input);
        setProfile(res.profile);
        return;
      }
      const res = await api.post<{ token: string; profile: Profile }>('/api/profile', input);
      setToken(res.token);
      setProfile(res.profile);
      setStats({ gamesPlayed: 0, wins: 0, bestScore: 0, bestStreak: 0 });
      setStatus('ready');
    },
    [profile],
  );

  const refreshStats = useCallback(async () => {
    const me = await api.get<{ stats: ProfileStats }>('/api/me');
    setStats(me.stats);
  }, []);

  // Oyun bittiğinde (oda lobiye dönünce) istatistikleri tazele.
  const phase = room?.phase;
  useEffect(() => {
    if (phase === 'lobby' && status === 'ready') void refreshStats().catch(() => {});
  }, [phase, status, refreshStats]);

  const value = useMemo<Session>(
    () => ({
      status,
      connection,
      profile,
      stats,
      room,
      gameView,
      chat,
      reactions,
      notice,
      saveProfile,
      refreshStats,
      emit,
      notify: setNotice,
    }),
    [status, connection, profile, stats, room, gameView, chat, reactions, notice, saveProfile, refreshStats, emit],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const s = useContext(SessionContext);
  if (!s) throw new Error('useSession outside provider');
  return s;
}
