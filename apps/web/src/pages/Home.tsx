import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { ROOM_CODE_LENGTH } from '@songie/shared';
import { Icon } from '@songie/game-kit/ui';
import { GAMES } from '../games';
import { tr } from '../i18n/tr';
import { useSession } from '../lib/session';
import './home.css';

export function Home() {
  const { profile, room, emit } = useSession();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function join(e: FormEvent) {
    e.preventDefault();
    if (code.length !== ROOM_CODE_LENGTH) {
      setError('Oda kodu 4 harften oluşur.');
      return;
    }
    setBusy('join');
    const res = await emit('room:join', { code });
    setBusy(null);
    if (res.ok) navigate(`/r/${code}`);
    else setError(res.error);
  }

  async function create(gameId: string, settings?: unknown) {
    setBusy(gameId + (settings ? ':solo' : ''));
    setError(null);
    const res = await emit('room:create', { gameId, settings });
    // Tek başına oyunda lobi beklemesi yok.
    if (res.ok && settings) await emit('room:start', {});
    setBusy(null);
    if (res.ok) navigate(`/r/${res.code as string}`);
    else setError(res.error);
  }

  if (!profile) return null;

  return (
    <main className="col home">
      <span className="wordmark" aria-hidden="true">
        songie
      </span>

      <p className="home-hello muted">{tr.home.hello(profile.nick)}</p>

      {room && (
        <button type="button" className="btn btn-primary btn-block btn-lg" onClick={() => navigate(`/r/${room.code}`)}>
          {tr.home.backToRoom(room.code)}
        </button>
      )}

      <form className="home-join" onSubmit={join}>
        <label className="sr-only" htmlFor="code">
          {tr.home.codeLabel}
        </label>
        <div className="home-join-row">
          <input
            id="code"
            className="input home-code"
            value={code}
            maxLength={ROOM_CODE_LENGTH}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            placeholder={tr.home.codePlaceholder}
            aria-invalid={!!error}
            onChange={(e) => {
              setCode(e.target.value.toLocaleUpperCase('en-US').replace(/[^A-Z]/g, '').slice(0, ROOM_CODE_LENGTH));
              setError(null);
            }}
          />
          <button className="btn btn-outline home-join-btn" disabled={code.length !== ROOM_CODE_LENGTH || busy !== null}>
            {busy === 'join' ? tr.home.joining : tr.home.join}
          </button>
        </div>
        {error ? (
          <p className="error-text" role="alert">
            {error}
          </p>
        ) : (
          <p className="home-hint dim">{tr.home.joinHint}</p>
        )}
      </form>

      <section className="home-games" aria-labelledby="games-title">
        <h2 id="games-title" className="eyebrow home-games-title">
          {tr.home.games}
        </h2>
        {GAMES.map((g) => (
          <article key={g.id} className="home-game card">
            <div className="home-game-head">
              <span className="game-tile-icon">
                <Icon name={g.icon} size={18} />
              </span>
              <div>
                <h3 className="home-game-name">{g.name}</h3>
                <p className="home-game-pitch dim">{g.pitch}</p>
              </div>
            </div>
            <div className="home-game-actions">
              <button className="btn btn-primary" disabled={busy !== null} onClick={() => void create(g.id)}>
                {busy === g.id ? '…' : tr.home.create}
              </button>
              {g.soloSettings !== undefined && (
                <button className="btn btn-outline" disabled={busy !== null} onClick={() => void create(g.id, g.soloSettings)}>
                  {busy === `${g.id}:solo` ? '…' : tr.home.solo}
                </button>
              )}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
