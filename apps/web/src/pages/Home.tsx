import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { ROOM_CODE_LENGTH } from '@songie/shared';
import { Avatar, Icon } from '@songie/game-kit/ui';
import { GamePicker } from '../components/GamePicker';
import { TopBar } from '../components/Shell';
import { CATEGORIES, GAMES, playersLabel, type GameCategory } from '../games';
import { tr } from '../i18n/tr';
import { useGuide } from '../lib/guide';
import { useSession } from '../lib/session';
import './home.css';

const TILTS = ['-1.2deg', '1deg', '0.6deg', '-0.8deg'];

export function Home() {
  const { profile, room, emit } = useSession();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [cat, setCat] = useState<GameCategory | 'all'>('all');
  const [picking, setPicking] = useState(false);
  const { openGuide, openTour, showTourOnce } = useGuide();

  // İlk girişte platformu ve oyunları tanıt.
  useEffect(() => showTourOnce(), [showTourOnce]);

  async function join(e: FormEvent) {
    e.preventDefault();
    if (code.length !== ROOM_CODE_LENGTH) {
      setError(tr.home.codeLength);
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
  const shown = GAMES.filter((g) => cat === 'all' || g.category === cat);

  return (
    <main className="col home">
      <TopBar
        right={
          <Link to="/profil" className="home-me" aria-label={tr.shell.profile}>
            <Avatar avatar={profile.avatar} nick={profile.nick} size={44} />
          </Link>
        }
      />

      <div className="home-hello">
        <h1 className="display">{tr.home.hello(profile.nick)}</h1>
        <p>{tr.home.helloSub}</p>
      </div>

      <section className="home-hero">
        <span className="sticker home-hero-sticker">{tr.home.free}</span>
        <h2 className="display">{tr.home.heroTitle}</h2>
        <p>{tr.home.heroLead}</p>
        <button type="button" className="btn btn-dark btn-lg btn-block" onClick={() => setPicking(true)}>
          <Icon name="plus" size={22} />
          {tr.home.createRoom}
        </button>
      </section>

      <ul className="home-badges" aria-label={tr.home.badgesLabel}>
        {tr.home.badges.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>

      {room && (
        <Link to={`/r/${room.code}`} className="btn btn-primary btn-lg btn-block home-back">
          <span>{tr.home.backToRoom(room.code)}</span>
          <Icon name="arrow" size={22} />
        </Link>
      )}

      <section className="home-join" aria-labelledby="join-title">
        <span className="sticker home-join-sticker">{tr.home.joinSticker}</span>
        <h2 id="join-title" className="display">
          {tr.home.joinTitle}
        </h2>
        <form className="home-join-row" onSubmit={join}>
          <label className="sr-only" htmlFor="code">
            {tr.home.codeLabel}
          </label>
          <input
            id="code"
            className="home-code"
            value={code}
            maxLength={ROOM_CODE_LENGTH}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            placeholder={tr.home.codePlaceholder}
            aria-invalid={!!error}
            aria-describedby="join-hint"
            onChange={(e) => {
              setCode(e.target.value.toLocaleUpperCase('en-US').replace(/[^A-Z]/g, '').slice(0, ROOM_CODE_LENGTH));
              setError(null);
            }}
          />
          <button className="home-join-btn" disabled={code.length !== ROOM_CODE_LENGTH || busy !== null}>
            {busy === 'join' ? tr.home.joining : tr.home.join}
          </button>
        </form>
        {error ? (
          <p id="join-hint" className="home-join-error" role="alert">
            {error}
          </p>
        ) : (
          <p id="join-hint" className="home-join-hint">
            {tr.home.joinHint}
          </p>
        )}
      </section>

      <button type="button" className="home-feature" disabled={busy !== null} onClick={() => void create('detective')}>
        <span className="home-feature-file" aria-hidden="true">
          <Icon name="search" size={36} />
        </span>
        <span className="home-feature-text">
          <span className="home-feature-tag">{tr.home.featureTag}</span>
          <span className="home-feature-name">{tr.home.featureName}</span>
          <span className="home-feature-lead">{tr.home.featureLead}</span>
        </span>
      </button>

      <section className="home-games" aria-labelledby="games-title">
        <div className="home-games-head">
          <h2 id="games-title" className="display">
            {tr.home.games} <span className="home-games-count">{shown.length}</span>
          </h2>
          <button type="button" className="btn btn-ghost" onClick={openTour}>
            {tr.tour.replay}
          </button>
        </div>
        <div className="home-chips" role="group" aria-label={tr.home.filterLabel}>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className="home-chip"
              data-cat={c.id === 'all' ? undefined : c.id}
              aria-pressed={cat === c.id}
              onClick={() => setCat(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="home-grid">
          {shown.map((g, i) => (
            <article key={g.id} className="home-tile" data-cat={g.category} style={{ '--tilt': TILTS[i % 4] } as CSSProperties}>
              <span className="game-mono">{g.mono}</span>
              <h3 className="home-tile-name">{g.name}</h3>
              <p className="home-tile-pitch">{g.pitch}</p>
              <p className="home-tile-players">{playersLabel(g)}</p>
              <div className="home-tile-actions">
                {g.guide && (
                  <button type="button" className="home-tile-help" aria-label={`${g.name}: ${tr.guide.open}`} onClick={() => openGuide(g.id)}>
                    ?
                  </button>
                )}
                <button type="button" className="home-tile-create" disabled={busy !== null} onClick={() => void create(g.id)}>
                  {busy === g.id ? '…' : tr.home.create}
                </button>
              </div>
              {g.soloSettings !== undefined && (
                <button type="button" className="home-tile-solo" disabled={busy !== null} onClick={() => void create(g.id, g.soloSettings)}>
                  {busy === `${g.id}:solo` ? '…' : tr.home.solo}
                </button>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="home-steps" aria-labelledby="steps-title">
        <h2 id="steps-title" className="display">
          {tr.home.stepsTitle}
        </h2>
        <ol>
          {tr.home.steps.map(([t, d], i) => (
            <li key={t} data-step={i}>
              <span className="home-step-n">{i + 1}</span>
              <span>
                <strong>{t}</strong>
                <span>{d}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <p className="home-foot">{tr.home.footer}</p>

      {picking && (
        <GamePicker
          title={tr.picker.createTitle}
          busy={busy !== null}
          onClose={() => setPicking(false)}
          onPick={(id) => {
            setPicking(false);
            void create(id);
          }}
        />
      )}
    </main>
  );
}
