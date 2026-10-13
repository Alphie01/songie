import { useEffect, useMemo, useState, useSyncExternalStore, type CSSProperties } from 'react';
import type { PlayViewProps } from '@songie/game-kit/client';
import { player } from '@songie/game-kit/audio';
import { Avatar, Icon, type AvatarMark } from '@songie/game-kit/ui';
import type { RoomPlayer } from '@songie/shared';
import type { PlayerLine, SearchHit, SongSettings, SongView, Verdict } from '../shared/index.js';
import { DifficultyPills, Feed, HowToPlay, PoolStrip } from './Controls';
import { GuessBox } from './GuessBox';
import { usePools } from './pools';
import { ProgressBar } from './ProgressBar';
import { SettingsPanel } from './SettingsPanel';
import { clipLabel, clipShort, s } from './strings';

function usePlayerState() {
  const playing = useSyncExternalStore(
    (fn) => player.subscribe(fn),
    () => player.playing,
  );
  const blocked = useSyncExternalStore(
    (fn) => player.subscribe(fn),
    () => player.blocked,
  );
  return { playing, blocked };
}

/** Sunucu saatine göre kalan süre (ms). */
function useRemaining(view: SongView): number {
  const offset = useMemo(() => view.serverNow - Date.now(), [view.serverNow]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  return Math.max(0, view.phaseEndsAt - (now + offset));
}

const MARK: Record<PlayerLine['state'], AvatarMark> = {
  correct: 'correct',
  artist: 'artist',
  locked: 'locked',
  skipped: 'skipped',
  listening: null,
};

export function PlayView({ view, meId, room, act, api, settings, setSettings }: PlayViewProps<SongView, SongSettings>) {
  const { playing, blocked } = usePlayerState();
  const volume = useSyncExternalStore(
    (fn) => player.subscribe(fn),
    () => player.volume,
  );
  const remaining = useRemaining(view);
  const [feedback, setFeedback] = useState<{
    text: string;
    tone: Verdict;
  } | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const members = useMemo(() => new Map(room.players.map((p) => [p.id, p])), [room.players]);
  const isHost = room.hostId === meId;
  const [pools] = usePools(api, true, settings.pools);

  const stageUrl = view.phase === 'stage' ? view.clips[view.stage] : null;
  const previewUrl = view.phase === 'reveal' ? view.reveal?.previewUrl : null;

  // Yeni parça açılınca kendiliğinden çal; sonuçta tam önizlemeyi çal.
  useEffect(() => {
    if (stageUrl) void player.play(stageUrl);
  }, [stageUrl]);
  useEffect(() => {
    if (previewUrl) void player.play(previewUrl);
  }, [previewUrl]);
  useEffect(() => {
    if (view.phase === 'countdown' || view.phase === 'podium' || view.phase === 'loading') player.stop();
  }, [view.phase]);
  useEffect(() => () => player.stop(), []);
  useEffect(() => setFeedback(null), [view.round, view.stage]);

  async function guess(hit: SearchHit) {
    const res = await act({ type: 'guess', trackId: hit.id });
    if (!res.ok) return setFeedback({ text: res.error, tone: 'wrong' });
    const verdict = res.verdict as Verdict;
    setFeedback({
      tone: verdict,
      text:
        verdict === 'correct'
          ? s.play.verdict.correct
          : verdict === 'artist'
            ? s.play.verdict.artist(hit.title)
            : s.play.verdict.wrong(`${hit.artist} – ${hit.title}`),
    });
  }

  async function playUrl(url: string | null | undefined) {
    if (!url) return;
    if (playing?.url === url) return player.stop();
    await player.unlock();
    await player.play(url);
  }

  const panelProps = {
    settings,
    editable: isHost,
    api,
    players: room.players,
    meId,
    onChange: (next: SongSettings) => void setSettings(next),
  };
  const playingStage = playing ? view.clips.findIndex((u) => u === playing.url) : -1;
  const unlockedStage = view.clips.reduce((acc, u, i) => (u ? i : acc), -1);
  const isLastStage = view.stage === view.stageClips.length - 1;
  const me = view.players.find((p) => p.id === meId);
  const waiting = view.players.filter((p) => members.get(p.id)?.connected && p.state === 'listening').length;

  if (view.phase === 'podium') return <Podium view={view} members={members} room={room} remaining={remaining} />;

  const shownStage = view.phase === 'stage' ? view.stage : view.startStage;
  const hint =
    view.phase === 'countdown'
      ? s.play.countdown
      : view.phase === 'loading'
        ? s.play.loading
        : blocked
          ? s.play.tapToListen
          : s.play.stageHint(view.stageClips[shownStage]!);

  return (
    <div className="sg song">
      <aside className="sg-side sg-left">
        <SettingsPanel {...panelProps} section="primary" />
        <Scoreboard view={view} members={members} meId={meId} />
      </aside>

      <main className="sg-center song-center">
        <header className="song-top">
          <span className="song-round">
            {s.play.round(Math.max(view.round, 1), view.totalRounds)}
            {me && view.totalRounds === null && me.streak > 1 && <span className="song-round-streak"> ×{me.streak}</span>}
          </span>
          <span className="song-code">{room.code}</span>
        </header>

        {view.phase === 'reveal' && view.reveal ? (
          <Reveal
            view={view}
            members={members}
            meId={meId}
            isHost={isHost}
            act={act}
            remaining={remaining}
            playing={!!playing && playingStage < 0}
          />
        ) : (
          <>
            <ProgressBar
              clips={view.stageClips}
              unlocked={unlockedStage}
              current={shownStage}
              playing={
                playing && playingStage >= 0
                  ? {
                      stage: playingStage,
                      duration: playing.duration,
                      key: playing.key,
                    }
                  : null
              }
              onPick={(i) => void playUrl(view.clips[i])}
            />

            <div className="song-stage">
              {view.phase === 'countdown' ? (
                <div className="sg-count" role="status" aria-label={`${s.play.countdown}: ${Math.ceil(remaining / 1000)}`}>
                  <span key={Math.ceil(remaining / 1000)} className="sg-count-num">
                    {Math.max(1, Math.ceil(remaining / 1000))}
                  </span>
                </div>
              ) : view.phase === 'loading' ? (
                <div className="sg-count" role="status">
                  <span className="sg-spinner" aria-hidden="true" />
                </div>
              ) : (
                <button
                  type="button"
                  className="sg-play"
                  data-playing={playingStage >= 0 || undefined}
                  data-blocked={blocked || undefined}
                  onClick={() => void playUrl(stageUrl)}
                  aria-label={playingStage >= 0 ? s.play.stopLabel : s.play.playLabel(clipLabel(view.stageClips[view.stage]!))}
                >
                  <Icon name={playingStage >= 0 ? 'pause' : 'play'} size={62} />
                </button>
              )}
              <div className="song-meter">
                <span className="song-eq" data-on={playingStage >= 0 || undefined} aria-hidden="true">
                  {EQ.map((h, i) => (
                    <i key={i} style={{ height: `${h}%` }} />
                  ))}
                </span>
                {view.phase === 'stage' && view.timed && (
                  <span className="sg-timer" data-low={remaining < 4000 || undefined} aria-label={`${Math.ceil(remaining / 1000)} sn`}>
                    {Math.ceil(remaining / 1000)}
                  </span>
                )}
              </div>
              <p className="song-hint">{hint}</p>
            </div>

            <div className="sg-answer">
              <GuessBox
                api={api}
                disabled={!view.me.canGuess}
                placeholder={view.me.canGuess || view.phase !== 'stage' ? s.play.searchPlaceholder : s.play.states[view.me.state]}
                pools={view.easySearch ? view.pools : undefined}
                onPick={guess}
              />
              <button
                type="button"
                className="sg-skip"
                disabled={!view.me.canGuess}
                onClick={async () => {
                  const res = await act({ type: 'skip' });
                  if (!res.ok) setFeedback({ text: res.error, tone: 'wrong' });
                }}
              >
                {isLastStage ? s.play.giveUp : s.play.skip}
              </button>
            </div>

            <div className="sg-status" role="status">
              {feedback ? (
                <p className="sg-feedback" data-tone={feedback.tone}>
                  {feedback.text}
                </p>
              ) : (
                view.phase === 'stage' &&
                !view.me.canGuess && (
                  <p className="sg-feedback" data-tone={view.me.state}>
                    {s.play.states[view.me.state]}
                  </p>
                )
              )}
              {view.phase === 'stage' && !view.timed && waiting > 0 && !view.me.canGuess && (
                <p className="sg-wait">{s.play.waiting(waiting)}</p>
              )}
              {view.phase === 'stage' && !view.me.canGuess && unlockedStage > 0 && <p className="sg-wait">{s.play.replayHint}</p>}
            </div>

            {view.me.guesses.length > 0 && (
              <ol className="sg-history">
                {view.me.guesses.map((g, i) => (
                  <li key={i} data-verdict={g.verdict}>
                    <span className="sg-history-stage">{clipShort(view.stageClips[g.stage]!)}</span>
                    <span className="sg-history-text">
                      {g.artist} – {g.title}
                    </span>
                    <Icon name={g.verdict === 'correct' ? 'check' : 'x'} size={14} />
                  </li>
                ))}
              </ol>
            )}

            {isHost && view.phase === 'stage' && !view.timed && view.players.length > 1 && (
              <button type="button" className="btn btn-ghost sg-advance" onClick={() => void act({ type: 'advance' })}>
                {s.play.advance}
              </button>
            )}
          </>
        )}

        <Feed items={view.feed} members={members} clips={view.stageClips} meId={meId} />

        <div className="song-spacer" />

        <div className="sg-mobile-only">
          <ScoreStrip view={view} members={members} meId={meId} />
        </div>

        <div className="sg-quick">
          <PoolStrip
            pools={pools}
            selected={settings.pools}
            editable={isHost}
            onPick={(id) => void setSettings({ ...settings, pools: [id] })}
          />
          <DifficultyPills value={settings.difficulty} editable={isHost} onPick={(d) => void setSettings({ ...settings, difficulty: d })} />
          {isHost && <p className="sg-live-hint">{s.settings.liveHint}</p>}
        </div>

        <div className="sg-mobile-only">
          <section className="sg-options">
            <button type="button" className="toggle sg-options-btn" aria-expanded={optionsOpen} onClick={() => setOptionsOpen((o) => !o)}>
              <span className="sgs-opt-icon">
                <Icon name="menu" size={14} />
                {s.settings.options}
              </span>
              <Icon
                name="chevron"
                size={14}
                style={{
                  transform: optionsOpen ? 'rotate(180deg)' : undefined,
                }}
              />
            </button>
            {optionsOpen && (
              <div className="sg-options-body">
                <SettingsPanel {...panelProps} />
                <Volume volume={volume} />
              </div>
            )}
          </section>
        </div>

        <HowToPlay />
      </main>

      <aside className="sg-side sg-right">
        <SettingsPanel {...panelProps} section="secondary" />
        <Volume volume={volume} />
      </aside>
    </div>
  );
}

/** Ekolayzer çubuklarının boyları (tasarımdaki gibi; dördüncüsü sarı). */
const EQ = [30, 70, 45, 100, 55, 85, 35, 60];

function Volume({ volume }: { volume: number }) {
  return (
    <label className="sg-volume">
      <span className="eyebrow">{s.settings.volume}</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={volume}
        onChange={(e) => player.setVolume(Number(e.target.value))}
        style={{ '--v': `${volume * 100}%` } as CSSProperties}
      />
    </label>
  );
}

/** Mobilde alttaki skor şeridi: lider nane, sen sarı. */
function ScoreStrip({ view, members, meId }: { view: SongView; members: Map<string, RoomPlayer>; meId: string }) {
  const lines = [...view.players].sort((a, b) => b.score - a.score);
  return (
    <ol className="song-strip" aria-label={s.play.scores}>
      {lines.map((p, i) => {
        const m = members.get(p.id);
        if (!m) return null;
        const mine = p.id === meId;
        return (
          <li
            key={p.id}
            data-me={mine || undefined}
            data-first={(i === 0 && p.score > 0 && !mine) || undefined}
            data-off={!m.connected || undefined}
          >
            <span className="song-strip-name">
              {mine ? s.play.scoreYou : m.nick}
              {p.streak > 1 && ` ×${p.streak}`}
            </span>
            <span className="song-strip-pts">{p.score.toLocaleString('tr-TR')}</span>
          </li>
        );
      })}
    </ol>
  );
}

function Scoreboard({ view, members, meId }: { view: SongView; members: Map<string, RoomPlayer>; meId: string }) {
  const lines = [...view.players].sort((a, b) => b.score - a.score);
  const markOf = (p: PlayerLine): AvatarMark =>
    view.phase === 'stage' || p.state === 'correct' || p.state === 'artist' ? MARK[p.state] : null;
  return (
    <section className="sg-scores" aria-label={s.play.scores}>
      <h2 className="eyebrow">{s.play.scores}</h2>
      <ol className="sg-score-list">
        {lines.map((p) => {
          const m = members.get(p.id);
          if (!m) return null;
          return (
            <li key={p.id} className="sg-score" data-me={p.id === meId || undefined}>
              <Avatar avatar={m.avatar} nick={m.nick} size={28} mark={markOf(p)} dim={!m.connected} />
              <span className="sg-score-name">{m.nick}</span>
              {p.streak > 1 && <span className="sg-score-streak mono">×{p.streak}</span>}
              <span className="sg-score-pts mono">{p.score.toLocaleString('tr-TR')}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Reveal({
  view,
  members,
  meId,
  isHost,
  act,
  remaining,
  playing,
}: {
  view: SongView;
  members: Map<string, RoomPlayer>;
  meId: string;
  isHost: boolean;
  act: PlayViewProps<SongView>['act'];
  remaining: number;
  playing: boolean;
}) {
  const r = view.reveal!;
  const me = view.players.find((p) => p.id === meId);
  const mine = r.results.find((x) => x.playerId === meId);
  const last = view.totalRounds !== null && view.round >= view.totalRounds;
  const present = view.players.filter((p) => members.get(p.id)?.connected);
  const readyCount = present.filter((p) => p.ready).length;

  return (
    <section className="rv" aria-live="polite">
      <div className="rv-cover">{r.cover ? <img src={r.cover} alt="" width={180} height={180} /> : <Icon name="music" size={64} />}</div>
      <span className="rv-sticker">{s.reveal.itWas}</span>
      <h2 className="rv-title">{r.title}</h2>
      <p className="rv-artist">
        {r.artist}
        {r.album ? ` · ${r.album}` : ''}
      </p>
      {r.poolName && <p className="rv-pool">{s.reveal.fromPool(r.poolName)}</p>}
      <div className="rv-links">
        <button type="button" className="btn btn-ghost" onClick={() => (playing ? player.stop() : void player.play(r.previewUrl))}>
          <Icon name={playing ? 'pause' : 'play'} size={14} />
          {playing ? s.reveal.stop : s.reveal.replay}
        </button>
        <a className="btn btn-ghost" href={r.link} target="_blank" rel="noreferrer">
          {s.reveal.listen}
        </a>
      </div>

      <p className="rv-verdict" data-won={mine?.kind === 'correct' || undefined} data-artist={mine?.kind === 'artist' || undefined}>
        {mine?.kind === 'correct' ? s.reveal.won : mine?.kind === 'artist' ? s.reveal.artistOnly : s.reveal.lost}
        {mine && <span> +{mine.points.toLocaleString('tr-TR')}</span>}
      </p>

      {view.players.length > 1 &&
        (r.results.length === 0 ? (
          <p className="rv-nobody">{s.reveal.nobody}</p>
        ) : (
          <ol className="rv-results">
            {r.results.map((x) => (
              <li key={x.playerId} data-kind={x.kind}>
                <span className="rv-who">{x.playerId === meId ? s.feed.you : (members.get(x.playerId)?.nick ?? '?')}</span>
                <span className="rv-how">
                  {x.kind === 'artist' ? s.reveal.artistOnly : s.reveal.atStage(clipLabel(view.stageClips[x.stage]!))}
                </span>
                <span className="rv-pts">+{x.points.toLocaleString('tr-TR')}</span>
              </li>
            ))}
          </ol>
        ))}

      <div className="rv-next">
        <button type="button" className="btn btn-primary btn-block btn-lg" disabled={me?.ready} onClick={() => void act({ type: 'next' })}>
          {last ? s.reveal.finish : s.reveal.next}
        </button>
        {present.length > 1 && <p className="rv-ready">{s.reveal.waitingOthers(readyCount, present.length)}</p>}
        {view.timed && <p className="rv-ready">{s.reveal.autoNext(Math.ceil(remaining / 1000))}</p>}
        {isHost && present.length > 1 && me?.ready && readyCount < present.length && (
          <button type="button" className="btn btn-ghost" onClick={() => void act({ type: 'next', force: true })}>
            {s.reveal.skipWait}
          </button>
        )}
      </div>
    </section>
  );
}

/** Oyun sonu (tasarım: Sonuçlar): OYUN BİTTİ, kazanan, renkli skor kartları, lobiye dönüş çubuğu. */
function Podium({
  view,
  members,
  room,
  remaining,
}: {
  view: SongView;
  members: Map<string, RoomPlayer>;
  room: PlayViewProps<SongView>['room'];
  remaining: number;
}) {
  const ranked = [...view.players].filter((p) => members.has(p.id)).sort((a, b) => b.score - a.score);
  const [first, second] = ranked;
  const rest = ranked.slice(2);
  const half = Math.ceil(rest.length / 2);
  const tie = !!first && !!second && first.score === second.score;
  const nick = (id: string) => members.get(id)?.nick ?? '?';
  useEffect(() => window.scrollTo(0, 0), []);
  const progress = view.phaseMs > 0 ? Math.min(100, Math.max(0, 100 - (remaining / view.phaseMs) * 100)) : 100;
  return (
    <main className="col podium song-podium">
      <span className="song-confetti" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>
      <div className="song-podium-top">
        <span>{s.name}</span>
        <span className="song-code">{room.code}</span>
      </div>
      <div className="song-podium-head">
        <span className="song-podium-sticker">{s.podium.title}</span>
        <h1 className="song-podium-title">{first && !tie ? s.podium.winner(nick(first.id)) : s.podium.draw}</h1>
        {first && first.bestStreak > 1 && <p className="song-podium-streak">{s.podium.streak(first.bestStreak)}</p>}
      </div>
      {first && (
        <div className="song-podium-cards">
          <div className="song-podium-card" data-first>
            {!tie && (
              <svg width="40" height="28" viewBox="0 0 40 28" aria-hidden="true">
                <path
                  d="M3 25L6 6l9 9 5-12 5 12 9-9 3 19z"
                  fill="var(--yellow)"
                  stroke="var(--ink)"
                  strokeWidth="3"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            <span className="song-podium-score">{first.score.toLocaleString('tr-TR')}</span>
            <span className="song-podium-name">{nick(first.id)}</span>
          </div>
          {second && (
            <>
              <span className="song-podium-dash" aria-hidden="true">
                –
              </span>
              <div className="song-podium-card">
                <span className="song-podium-score">{second.score.toLocaleString('tr-TR')}</span>
                <span className="song-podium-name">{nick(second.id)}</span>
              </div>
            </>
          )}
        </div>
      )}
      {rest.length > 0 && (
        <div className="song-podium-rosters">
          {[rest.slice(0, half), rest.slice(half)].map(
            (col, i) =>
              col.length > 0 && (
                <ol key={i} className="song-podium-roster" start={3 + i * half}>
                  {col.map((p) => {
                    const m = members.get(p.id)!;
                    return (
                      <li key={p.id}>
                        <Avatar avatar={m.avatar} nick={m.nick} size={28} />
                        <span className="song-podium-roster-name">{m.nick}</span>
                        <span className="song-podium-roster-pts">{p.score.toLocaleString('tr-TR')}</span>
                      </li>
                    );
                  })}
                </ol>
              ),
          )}
        </div>
      )}
      <div className="song-spacer" />
      <div className="song-podium-foot">
        <div className="song-podium-bar" aria-hidden="true">
          <div style={{ width: `${progress}%` }} />
        </div>
        <p className="song-podium-back">{s.podium.back}</p>
      </div>
    </main>
  );
}
