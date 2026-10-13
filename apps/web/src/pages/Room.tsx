import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import type { ClientGameModule } from '@songie/game-kit/client';
import { Avatar, Icon } from '@songie/game-kit/ui';
import { MAX_ROOM_PLAYERS, type RoomState } from '@songie/shared';
import { GamePicker } from '../components/GamePicker';
import { TopBar } from '../components/Shell';
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
  // Oyun bitince önce sonuç ekranı; görülen sıralama bir daha açılmaz.
  const [resultsSeen, setResultsSeen] = useState<string | null>(null);
  const { showGuideOnce } = useGuide();
  // Bu oyuna ilk kez giriliyorsa tanıtımı aç.
  const gameId = room?.code === upper ? room.gameId : undefined;
  useEffect(() => {
    if (gameId) showGuideOnce(gameId);
  }, [gameId, showGuideOnce]);

  if (joinError) {
    return (
      <main className="col room-missing">
        <TopBar />
        <div className="card room-missing-card">
          <p className="room-missing-code">{upper}</p>
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

  if (room.phase === 'playing') return <Playing room={room} mod={mod} />;
  const standingsKey = room.lastStandings?.map((s) => `${s.playerId}:${s.score}`).join() || null;
  if (standingsKey && resultsSeen !== standingsKey) return <Results room={room} onDone={() => setResultsSeen(standingsKey)} />;
  return <Lobby room={room} mod={mod} />;
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
  const { profile, emit, notify, chat } = useSession();
  const { openGuide } = useGuide();
  const navigate = useNavigate();
  const me = profile!;
  const isHost = room.hostId === me.id;
  const game = findGame(room.gameId)!;
  const api = useMemo(() => gameApi(room.gameId), [room.gameId]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [picking, setPicking] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [seen, setSeen] = useState(chat.length);
  const max = Math.min(MAX_ROOM_PLAYERS, game.maxPlayers);
  const connected = room.players.filter((p) => p.connected).length;
  const enough = connected >= game.minPlayers;
  const readyCount = room.players.filter((p) => p.ready || p.id === room.hostId).length;
  const myself = room.players.find((p) => p.id === me.id);
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;
  const url = `${location.origin}/r/${room.code}`;
  const { SettingsPanel } = mod;

  useEffect(() => {
    if (chatOpen) setSeen(chat.length);
  }, [chatOpen, chat.length]);
  const unread = chat.slice(seen).filter((m) => m.playerId !== me.id).length;

  async function start() {
    setBusy(true);
    setError(null);
    const res = await emit('room:start', {});
    setBusy(false);
    if (!res.ok) setError(res.error);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      notify(url);
    }
  }

  async function share() {
    try {
      await navigator.share({ title: game.name, text: tr.room.shareText(game.name), url });
    } catch {
      // paylaşım penceresi kapatıldı
    }
  }

  async function changeGame(gameId: string) {
    setPicking(false);
    const res = await emit('room:game', { gameId });
    if (!res.ok) notify(res.error);
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
    <main className="col lobby">
      <TopBar
        compact
        right={
          game.guide ? (
            <button type="button" className="icon-btn" aria-label={tr.guide.open} onClick={() => openGuide(game.id)}>
              ?
            </button>
          ) : undefined
        }
      />

      <section className="lobby-code-card" aria-labelledby="code-title">
        <div className="lobby-code-head">
          <span>
            <span id="code-title" className="lobby-code-label">
              {tr.room.codeLabel}
            </span>
            <span className="lobby-code-game">{game.name}</span>
          </span>
          <span className="lobby-code-tiles" aria-label={`${tr.room.codeLabel}: ${room.code.split('').join(' ')}`}>
            {room.code.split('').map((ch, i) => (
              <span key={i} aria-hidden="true">
                {ch}
              </span>
            ))}
          </span>
        </div>
        <div className="lobby-code-actions">
          <button type="button" className="btn btn-dark" onClick={copyLink}>
            <Icon name={copied ? 'check' : 'link'} size={16} />
            {copied ? tr.room.copyDone : tr.room.copyLink}
          </button>
          <button type="button" className="btn btn-primary" onClick={canShare ? share : copyLink}>
            <Icon name="share" size={16} />
            {tr.room.share}
          </button>
        </div>
      </section>

      <section className="lobby-game">
        <span className="lobby-game-icon" aria-hidden="true">
          <Icon name={game.icon} size={26} />
        </span>
        <span className="lobby-game-text">
          <span className="lobby-game-label">{tr.room.selectedGame}</span>
          <span className="lobby-game-name">{game.name}</span>
          {game.guide && (
            <button type="button" className="lobby-game-guide" onClick={() => openGuide(game.id)}>
              {tr.guide.open}
            </button>
          )}
        </span>
        {isHost && (
          <button type="button" className="btn btn-dark lobby-game-change" onClick={() => setPicking(true)}>
            {tr.room.change}
          </button>
        )}
      </section>

      <section className="lobby-players" aria-labelledby="players-title">
        <div className="lobby-players-head">
          <h2 id="players-title" className="display">
            {tr.room.players} {room.players.length}/{max}
          </h2>
          <span className="lobby-ready-count">{tr.room.readyCount(readyCount)}</span>
        </div>
        <ul className="lobby-player-grid card">
          {room.players.map((p) => (
            <li key={p.id} className="lobby-player" data-off={!p.connected || undefined}>
              <Avatar avatar={p.avatar} nick={p.nick} size={30} dim={!p.connected} />
              <span className="lobby-player-name">
                {p.nick}
                {p.id === me.id && ` (${tr.room.you})`}
              </span>
              <span className="lobby-player-tag">
                {p.id === room.hostId ? (
                  <span className="lobby-host">{tr.room.host}</span>
                ) : !p.connected ? (
                  tr.room.offline
                ) : p.ready ? (
                  tr.room.ready
                ) : null}
              </span>
              {isHost && p.id !== me.id && (
                <button type="button" className="lobby-kick" aria-label={`${p.nick}: ${tr.room.kick}`} onClick={() => void emit('room:kick', { playerId: p.id })}>
                  <Icon name="close" size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
        {room.players.length < max && <p className="lobby-waiting">{tr.room.waiting}</p>}
      </section>

      <section className="lobby-settings" aria-labelledby="settings-title">
        <h2 id="settings-title" className="display">
          {tr.room.settings}
        </h2>
        <SettingsPanel {...settingsProps} section="primary" />
        <SettingsPanel {...settingsProps} section="secondary" />
      </section>

      <div className="lobby-spacer" />
      <div className="lobby-cta">
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        {isHost ? (
          <>
            <button type="button" className="btn btn-primary btn-block btn-lg" disabled={!enough || busy} onClick={start}>
              <Icon name="play" size={20} />
              {busy ? tr.room.starting : tr.room.start}
            </button>
            {!enough && <p className="lobby-note">{tr.room.needPlayers(game.minPlayers)}</p>}
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
            <p className="lobby-note">{tr.room.waitHost}</p>
          </>
        )}
      </div>

      {chatOpen && (
        <div className="lobby-chat">
          <Chat room={room} />
        </div>
      )}

      <div className="lobby-foot">
        <button type="button" className="btn btn-ghost" aria-expanded={chatOpen} onClick={() => setChatOpen((o) => !o)}>
          <Icon name="chat" size={16} />
          {tr.room.chat}
          {!chatOpen && unread > 0 && <span className="lobby-unread">{unread}</span>}
        </button>
        <button type="button" className="lobby-leave" onClick={leave}>
          {tr.room.leave}
        </button>
      </div>

      {picking && (
        <GamePicker title={tr.picker.changeTitle} current={room.gameId} onClose={() => setPicking(false)} onPick={(id) => void changeGame(id)} />
      )}
    </main>
  );
}

const RESULTS_MS = 15000;

/** Oyun sonu ekranı (tasarım: Sonuçlar). Süre dolunca ya da "Lobiye dön" ile lobiye geçer. */
function Results({ room, onDone }: { room: RoomState; onDone(): void }) {
  const { profile, emit, notify } = useSession();
  const me = profile!;
  const isHost = room.hostId === me.id;
  const game = findGame(room.gameId)!;
  const standings = room.lastStandings ?? [];
  const myself = room.players.find((p) => p.id === me.id);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const winners = standings.filter((s) => s.rank === 1);
  const [first, second] = standings;
  const rest = standings.slice(2);
  const half = Math.ceil(rest.length / 2);

  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (picking) return;
    const t = setTimeout(() => done.current(), RESULTS_MS);
    return () => clearTimeout(t);
  }, [picking]);

  async function rematch() {
    setBusy(true);
    const res = await emit('room:start', {});
    setBusy(false);
    if (!res.ok) notify(res.error);
  }

  return (
    <main className="col results">
      <span className="results-confetti" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>
      <div className="results-top">
        <span>{game.name}</span>
        <span className="results-code">{room.code}</span>
      </div>
      <div className="results-head">
        <span className="results-sticker">{tr.room.gameOver}</span>
        <h1 className="display results-title">{winners.length === 1 ? tr.room.winner(winners[0]!.nick) : tr.room.draw}</h1>
      </div>
      {first && (
        <div className="results-scores">
          <div className="results-card results-card-first">
            <svg width="40" height="28" viewBox="0 0 40 28" aria-hidden="true">
              <path d="M3 25L6 6l9 9 5-12 5 12 9-9 3 19z" fill="#FFD23F" stroke="#0D0828" strokeWidth="3" strokeLinejoin="round" />
            </svg>
            <span className="results-score">{first.score.toLocaleString('tr-TR')}</span>
            <span className="results-name">{first.nick}</span>
          </div>
          {second && (
            <>
              <span className="results-dash" aria-hidden="true">
                –
              </span>
              <div className="results-card results-card-second">
                <span className="results-score">{second.score.toLocaleString('tr-TR')}</span>
                <span className="results-name">{second.nick}</span>
              </div>
            </>
          )}
        </div>
      )}
      {rest.length > 0 && (
        <div className="results-rosters">
          {[rest.slice(0, half), rest.slice(half)].map(
            (col, i) =>
              col.length > 0 && (
                <ol key={i} className="results-roster" start={3 + i * half}>
                  {col.map((s) => (
                    <li key={s.playerId}>
                      <Avatar avatar={s.avatar} nick={s.nick} size={28} />
                      <span className="results-roster-name">{s.nick}</span>
                      <span className="results-roster-score">{s.score.toLocaleString('tr-TR')}</span>
                    </li>
                  ))}
                </ol>
              ),
          )}
        </div>
      )}
      <div className="lobby-spacer" />
      <div className="results-foot">
        <div className="results-bar" aria-hidden="true">
          <div style={{ animationDuration: `${RESULTS_MS}ms`, animationPlayState: picking ? 'paused' : 'running' }} />
        </div>
        <p className="results-note">
          {tr.room.backToLobby} · {tr.room.saved}
        </p>
        {isHost ? (
          <button type="button" className="btn btn-primary btn-block results-rematch" disabled={busy} onClick={rematch}>
            <Icon name="replay" size={22} />
            {tr.room.rematch}
          </button>
        ) : (
          <button
            type="button"
            className={`btn btn-block results-rematch ${myself?.ready ? 'btn-outline' : 'btn-primary'}`}
            onClick={() => void emit('room:ready', { ready: !myself?.ready })}
          >
            {myself?.ready ? tr.room.notReady : tr.room.imReady}
          </button>
        )}
        <button type="button" className="btn btn-outline btn-block results-other" onClick={isHost ? () => setPicking(true) : onDone}>
          {isHost ? tr.room.otherGame : tr.room.toLobby}
        </button>
      </div>
      {picking && (
        <GamePicker
          title={tr.picker.changeTitle}
          current={room.gameId}
          onClose={() => setPicking(false)}
          onPick={async (id) => {
            setPicking(false);
            const res = await emit('room:game', { gameId: id });
            if (!res.ok) notify(res.error);
            else onDone();
          }}
        />
      )}
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
