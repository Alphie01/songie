import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import type { ClientGameModule } from '@songie/game-kit/client';
import { Avatar, Icon } from '@songie/game-kit/ui';
import { MAX_ROOM_PLAYERS, type RoomState } from '@songie/shared';
import { findGame } from '../games';
import { tr } from '../i18n/tr';
import { gameApi } from '../lib/api';
import { useGuide } from '../lib/guide';
import { useSession } from '../lib/session';
import './room.css';

/** Oyunun ekran kodunu yükler. Başka bir oyunun odasına geçilince eski modül asla yeni ayarlarla çizilmez. */
function useGameModule(gameId: string | undefined) {
  const [loaded, setLoaded] = useState<{ id: string; mod: ClientGameModule } | null>(null);
  useEffect(() => {
    const game = gameId ? findGame(gameId) : undefined;
    if (!game) return;
    let alive = true;
    void game.load().then((mod) => alive && setLoaded({ id: game.id, mod }));
    return () => {
      alive = false;
    };
  }, [gameId]);
  return loaded && loaded.id === gameId ? loaded.mod : null;
}

export function RoomPage() {
  const { code = '' } = useParams();
  const upper = code.toUpperCase();
  const navigate = useNavigate();
  const { room, emit, connection } = useSession();
  const [joinError, setJoinError] = useState<string | null>(null);
  const tried = useRef<string | null>(null);

  useEffect(() => {
    if (connection !== 'online' || room?.code === upper || tried.current === upper) return;
    tried.current = upper;
    void emit('room:join', { code: upper }).then((res) => {
      if (!res.ok) setJoinError(res.error);
    });
  }, [connection, room?.code, upper, emit]);

  // Oda kapandıysa ana sayfaya dön.
  const wasInRoom = useRef(false);
  useEffect(() => {
    if (room?.code === upper) wasInRoom.current = true;
    else if (wasInRoom.current && !room) navigate('/');
  }, [room, upper, navigate]);

  const mod = useGameModule(room?.code === upper ? room.gameId : undefined);
  const { showGuideOnce } = useGuide();
  // Bu oyuna ilk kez giriliyorsa tanıtımı aç.
  const gameId = room?.code === upper ? room.gameId : undefined;
  useEffect(() => {
    if (gameId) showGuideOnce(gameId);
  }, [gameId, showGuideOnce]);

  if (joinError) {
    return (
      <main className="col room-missing">
        <span className="wordmark" aria-hidden="true">
          songie
        </span>
        <div className="card room-missing-card">
          <p className="mono room-missing-code">{upper}</p>
          <p className="muted">{joinError}</p>
          <Link to="/" className="btn btn-primary">
            {tr.room.home}
          </Link>
        </div>
      </main>
    );
  }

  if (!room || room.code !== upper || !mod) {
    return (
      <main className="col room-wait">
        <p className="dim" role="status">
          {connection === 'offline' ? tr.room.reconnecting : tr.room.connecting}
        </p>
      </main>
    );
  }

  return room.phase === 'playing' ? <Playing room={room} mod={mod} /> : <Lobby room={room} mod={mod} />;
}

function Playing({ room, mod }: { room: RoomState; mod: ClientGameModule }) {
  const { gameView: payload, profile, emit, connection, notify } = useSession();
  const { openGuide } = useGuide();
  // Yalnızca bu odanın ve bu oyunun görünümü kullanılır (önceki odadan kalan görünüm değil).
  const gameView = payload && payload.room === room.code && payload.game === room.gameId ? payload.view : null;
  const isHost = room.hostId === profile!.id;
  const api = useMemo(() => gameApi(room.gameId), [room.gameId]);
  const act = useMemo(() => (action: unknown) => emit('game:action', { action }), [emit]);
  const setSettings = useMemo(
    () => async (next: unknown) => {
      const res = await emit('room:settings', { settings: next });
      if (!res.ok) notify(res.error);
    },
    [emit, notify],
  );
  const { PlayView } = mod;
  return (
    <div className="playing">
      {connection === 'offline' && <p className="conn-banner">{tr.room.reconnecting}</p>}
      {gameView ? (
        <PlayView
          view={gameView}
          meId={profile!.id}
          room={room}
          act={act}
          api={api}
          settings={room.settings}
          setSettings={setSettings}
        />
      ) : (
        <main className="col room-wait">
          <p className="dim" role="status">
            {tr.room.starting}
          </p>
        </main>
      )}
      {findGame(room.gameId)?.guide && (
        <button
          type="button"
          className="guide-fab"
          data-solo={room.players.length <= 1 || undefined}
          aria-label={tr.guide.open}
          title={tr.guide.open}
          onClick={() => openGuide(room.gameId)}
        >
          ?
        </button>
      )}
      {room.players.length > 1 && <ChatDock room={room} />}
      {isHost && (
        <footer className="playing-footer">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              if (confirm(tr.room.endConfirm)) void emit('room:lobby', {});
            }}
          >
            <Icon name="flag" size={14} />
            {tr.room.end}
          </button>
        </footer>
      )}
    </div>
  );
}

function Lobby({ room, mod }: { room: RoomState; mod: ClientGameModule }) {
  const { profile, emit, notify } = useSession();
  const { openGuide } = useGuide();
  const navigate = useNavigate();
  const me = profile!;
  const isHost = room.hostId === me.id;
  const game = findGame(room.gameId)!;
  const api = useMemo(() => gameApi(room.gameId), [room.gameId]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const max = Math.min(MAX_ROOM_PLAYERS, game.maxPlayers);
  const connected = room.players.filter((p) => p.connected).length;
  const enough = connected >= game.minPlayers;
  const myself = room.players.find((p) => p.id === me.id);
  const { SettingsPanel } = mod;

  async function start() {
    setBusy(true);
    setError(null);
    const res = await emit('room:start', {});
    setBusy(false);
    if (!res.ok) setError(res.error);
  }

  async function copyLink() {
    const url = `${location.origin}/r/${room.code}`;
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ title: game.name, text: `${game.name} oynuyoruz, gel!`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      notify(tr.room.copied);
    } catch {
      notify(url);
    }
  }

  async function leave() {
    await emit('room:leave', {});
    navigate('/');
  }

  const settingsProps = {
    settings: room.settings,
    editable: isHost,
    api,
    players: room.players,
    meId: me.id,
    onChange: async (next: unknown) => {
      const res = await emit('room:settings', { settings: next });
      if (!res.ok) notify(res.error);
    },
  };

  return (
    <main className="lobby">
      <aside className="lobby-side lobby-left" aria-label="Oyun ayarları">
        <SettingsPanel {...settingsProps} section="primary" />
      </aside>

      <div className="lobby-center">
        <span className="wordmark" aria-hidden="true">
          songie
        </span>

        <section className="lobby-room card">
          <div className="lobby-room-head">
            <span className="eyebrow">{tr.room.codeLabel}</span>
            <span className="lobby-game">{game.name}</span>
          </div>
          <p className="lobby-code mono" aria-label={`${tr.room.codeLabel}: ${room.code.split('').join(' ')}`}>
            {room.code}
          </p>
          <button type="button" className="btn btn-outline btn-block" onClick={copyLink}>
            <Icon name="copy" size={16} />
            {tr.room.copyLink}
          </button>
          {game.guide && (
            <button type="button" className="btn btn-ghost lobby-guide" onClick={() => openGuide(game.id)}>
              {tr.guide.open}
            </button>
          )}
        </section>

        {room.lastStandings && room.lastStandings.length > 0 && (
          <section className="lobby-block" aria-labelledby="last-title">
            <h2 id="last-title" className="eyebrow">
              {tr.room.lastGame}
            </h2>
            <ol className="rows">
              {room.lastStandings.map((s) => (
                <li key={s.playerId} className="row" data-first={s.rank === 1 || undefined}>
                  <span className="row-rank mono">{String(s.rank).padStart(2, '0')}</span>
                  <Avatar avatar={s.avatar} nick={s.nick} size={28} />
                  <span className="row-name">{s.nick}</span>
                  <span className="row-score mono">{s.score.toLocaleString('tr-TR')}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section className="lobby-block" aria-labelledby="players-title">
          <h2 id="players-title" className="eyebrow">
            {tr.room.players}{' '}
            <span className="mono">
              {room.players.length}/{max}
            </span>
          </h2>
          <ul className="rows">
            {room.players.map((p) => (
              <li key={p.id} className="row">
                <Avatar avatar={p.avatar} nick={p.nick} size={28} dim={!p.connected} />
                <span className="row-name">
                  {p.nick}
                  {p.id === me.id && <span className="dim"> ({tr.room.you})</span>}
                </span>
                <span className="row-tags">
                  {p.id === room.hostId && <span className="tag">{tr.room.host}</span>}
                  {!p.connected && <span className="tag tag-off">{tr.room.offline}</span>}
                  {p.ready && p.id !== room.hostId && <span className="tag tag-ready">{tr.room.ready}</span>}
                </span>
                {isHost && p.id !== me.id && (
                  <button type="button" className="btn btn-ghost row-kick" onClick={() => void emit('room:kick', { playerId: p.id })}>
                    {tr.room.kick}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>

        <div className="lobby-cta">
          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
          {isHost ? (
            <>
              <button type="button" className="btn btn-primary btn-block btn-lg" disabled={!enough || busy} onClick={start}>
                {busy ? tr.room.starting : tr.room.start}
              </button>
              {!enough && <p className="dim lobby-note">{tr.room.needPlayers(game.minPlayers)}</p>}
            </>
          ) : (
            <>
              <button
                type="button"
                className={`btn btn-block btn-lg ${myself?.ready ? 'btn-outline' : 'btn-primary'}`}
                onClick={() => void emit('room:ready', { ready: !myself?.ready })}
              >
                {myself?.ready ? tr.room.notReady : tr.room.imReady}
              </button>
              <p className="dim lobby-note">{tr.room.waitHost}</p>
            </>
          )}
        </div>

        <Chat room={room} />

        <button type="button" className="btn btn-ghost lobby-leave" onClick={leave}>
          {tr.room.leave}
        </button>
      </div>

      <aside className="lobby-side lobby-right" aria-label="Oynanış ayarları">
        <SettingsPanel {...settingsProps} section="secondary" />
      </aside>
    </main>
  );
}

/** Oyun sırasında sağ altta açılıp kapanan sohbet. */
function ChatDock({ room }: { room: RoomState }) {
  const { chat, profile } = useSession();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(chat.length);
  useEffect(() => {
    if (open) setSeen(chat.length);
  }, [open, chat.length]);
  const unread = chat.slice(seen).filter((m) => m.playerId !== profile!.id).length;
  return (
    <div className="chat-dock" data-open={open || undefined}>
      {open && (
        <div className="chat-dock-panel card">
          <Chat room={room} compact />
        </div>
      )}
      <button type="button" className="chat-dock-btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Icon name={open ? 'close' : 'chat'} size={18} />
        <span className="sr-only">{tr.room.chat}</span>
        {!open && unread > 0 && <span className="chat-dock-badge mono">{unread}</span>}
      </button>
    </div>
  );
}

function Chat({ room, compact = false }: { room: RoomState; compact?: boolean }) {
  const { chat, emit } = useSession();
  const [text, setText] = useState('');
  const listRef = useRef<HTMLOListElement>(null);
  const players = new Map(room.players.map((p) => [p.id, p]));

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [chat.length]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setText('');
    await emit('room:chat', { text: t });
  }

  return (
    <section className={compact ? 'chat-compact' : 'lobby-block'} aria-labelledby="chat-title">
      <h2 id="chat-title" className="eyebrow">
        {tr.room.chat}
      </h2>
      {chat.length === 0 ? (
        <p className="dim chat-empty">{tr.room.chatEmpty}</p>
      ) : (
        <ol className="chat-list" ref={listRef}>
          {chat.map((m) => (
            <li key={m.id}>
              <span className="chat-nick">{players.get(m.playerId)?.nick ?? 'Biri'}</span> {m.text}
            </li>
          ))}
        </ol>
      )}
      <form className="chat-form" onSubmit={send}>
        <label className="sr-only" htmlFor="chat-input">
          {tr.room.chatPlaceholder}
        </label>
        <input
          id="chat-input"
          className="input"
          value={text}
          maxLength={200}
          placeholder={tr.room.chatPlaceholder}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="btn btn-outline" disabled={!text.trim()}>
          {tr.room.send}
        </button>
      </form>
    </section>
  );
}
