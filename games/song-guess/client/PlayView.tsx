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
  const [feedback, setFeedback] = useState<{ text: string; tone: Verdict } | null>(null);
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

  if (view.phase === 'podium') return <Podium view={view} members={members} />;

  return (
    <div className="sg">
      <aside className="sg-side sg-left">
        <SettingsPanel {...panelProps} section="primary" />
        <Scoreboard view={view} members={members} meId={meId} />
      </aside>

      <main className="sg-center">
        <header className="sg-top">
          <span className="sg-round mono">{s.play.round(Math.max(view.round, 1), view.totalRounds)}</span>
          {me && view.totalRounds === null && (
            <span className="sg-streak mono">
              {s.play.streak} {me.streak} <span className="dim">/ {s.play.best} {me.bestStreak}</span>
            </span>
          )}
          <span className="sg-code mono">{room.code}</span>
        </header>

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

        {view.phase === 'reveal' && view.reveal ? (
          <Reveal view={view} members={members} meId={meId} isHost={isHost} act={act} remaining={remaining} playing={!!playing && playingStage < 0} />
        ) : (
          <>
            <ProgressBar
              clips={view.stageClips}
              unlocked={unlockedStage}
              current={view.phase === 'stage' ? view.stage : view.startStage}
              playing={playing && playingStage >= 0 ? { stage: playingStage, duration: playing.duration, key: playing.key } : null}
              onPick={(i) => void playUrl(view.clips[i])}
            />

            <div className="sg-player">
              {view.phase === 'countdown' ? (
                <div className="sg-count" role="status" aria-label={`${s.play.countdown}: ${Math.ceil(remaining / 1000)}`}>
                  <span key={Math.ceil(remaining / 1000)} className="sg-count-num mono">
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
                  <Icon name={playingStage >= 0 ? 'pause' : 'play'} size={44} />
                </button>
              )}
              <div className="sg-player-info">
                <span className="sg-clip mono">{clipShort(view.stageClips[view.phase === 'stage' ? view.stage : view.startStage]!)}</span>
                {view.phase === 'stage' && view.timed && (
                  <span className="sg-timer mono" data-low={remaining < 4000 || undefined}>
                    {Math.ceil(remaining / 1000)}
                  </span>
                )}
              </div>
            </div>
            {view.phase === 'stage' && blocked && <p className="sg-tap">{s.play.tapToListen}</p>}
            {view.phase === 'loading' && <p className="sg-tap dim">{s.play.loading}</p>}

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
                className="btn btn-outline sg-skip"
                disabled={!view.me.canGuess}
                onClick={async () => {
                  const res = await act({ type: 'skip' });
                  if (!res.ok) setFeedback({ text: res.error, tone: 'wrong' });
                }}
              >
                <Icon name="skip" size={14} />
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
                <p className="sg-wait dim">{s.play.waiting(waiting)}</p>
              )}
              {view.phase === 'stage' && !view.me.canGuess && unlockedStage > 0 && <p className="sg-wait dim">{s.play.replayHint}</p>}
            </div>

            {view.me.guesses.length > 0 && (
              <ol className="sg-history">
                {view.me.guesses.map((g, i) => (
                  <li key={i} data-verdict={g.verdict}>
                    <span className="sg-history-stage mono">{clipShort(view.stageClips[g.stage]!)}</span>
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

        <div className="sg-mobile-only">
          <Scoreboard view={view} members={members} meId={meId} />
          <section className="sg-options">
            <button
              type="button"
              className="toggle sg-options-btn"
              aria-expanded={optionsOpen}
              onClick={() => setOptionsOpen((o) => !o)}
            >
              <span className="sgs-opt-icon">
                <Icon name="menu" size={14} />
                {s.settings.options}
              </span>
              <Icon name="chevron" size={14} style={{ transform: optionsOpen ? 'rotate(180deg)' : undefined }} />
            </button>
            {optionsOpen && (
              <div className="sg-options-body">
                <SettingsPanel {...panelProps} />
              </div>
            )}
          </section>
        </div>

        <HowToPlay />
      </main>

      <aside className="sg-side sg-right">
        <SettingsPanel {...panelProps} section="secondary" />
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
      </aside>
    </div>
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
      <div className="rv-cover">{r.cover ? <img src={r.cover} alt="" width={180} height={180} /> : null}</div>
      <p className="eyebrow">{s.reveal.itWas}</p>
      <h2 className="rv-title">{r.title}</h2>
      <p className="rv-artist">
        {r.artist}
        {r.album ? ` · ${r.album}` : ''}
      </p>
      {r.poolName && <p className="rv-pool dim">{s.reveal.fromPool(r.poolName)}</p>}
      <div className="rv-links">
        <button type="button" className="btn btn-ghost" onClick={() => (playing ? player.stop() : void player.play(r.previewUrl))}>
          <Icon name={playing ? 'pause' : 'play'} size={14} />
          {playing ? s.reveal.stop : s.reveal.replay}
        </button>
        <a className="btn btn-ghost" href={r.link} target="_blank" rel="noreferrer">
          {s.reveal.listen}
        </a>
      </div>

      <p className="rv-verdict" data-won={mine?.kind === 'correct' || undefined}>
        {mine?.kind === 'correct' ? s.reveal.won : s.reveal.lost}
        {mine && <span className="mono"> +{mine.points.toLocaleString('tr-TR')}</span>}
      </p>

      {view.players.length > 1 &&
        (r.results.length === 0 ? (
          <p className="dim rv-nobody">{s.reveal.nobody}</p>
        ) : (
          <ol className="rv-results">
            {r.results.map((x) => (
              <li key={x.playerId} data-kind={x.kind}>
                <span className="rv-who">{members.get(x.playerId)?.nick ?? '?'}</span>
                <span className="dim">
                  {x.kind === 'artist' ? s.reveal.artistOnly : s.reveal.atStage(clipLabel(view.stageClips[x.stage]!))}
                </span>
                <span className="mono rv-pts">+{x.points.toLocaleString('tr-TR')}</span>
              </li>
            ))}
          </ol>
        ))}

      <div className="rv-next">
        <button
          type="button"
          className="btn btn-primary btn-block btn-lg"
          disabled={me?.ready}
          onClick={() => void act({ type: 'next' })}
        >
          {last ? s.reveal.finish : s.reveal.next}
        </button>
        {present.length > 1 && <p className="dim rv-ready mono">{s.reveal.waitingOthers(readyCount, present.length)}</p>}
        {view.timed && <p className="dim rv-ready">{s.reveal.autoNext(Math.ceil(remaining / 1000))}</p>}
        {isHost && present.length > 1 && me?.ready && readyCount < present.length && (
          <button type="button" className="btn btn-ghost" onClick={() => void act({ type: 'next', force: true })}>
            {s.reveal.skipWait}
          </button>
        )}
      </div>
    </section>
  );
}

function Podium({ view, members }: { view: SongView; members: Map<string, RoomPlayer> }) {
  const ranked = [...view.players].sort((a, b) => b.score - a.score);
  const first = ranked[0];
  const winner = first ? members.get(first.id) : undefined;
  return (
    <main className="col podium">
      <span className="wordmark" aria-hidden="true">
        songie
      </span>
      <p className="eyebrow podium-kicker">{s.podium.title}</p>
      {winner && first && (
        <div className="podium-winner">
          <Avatar avatar={winner.avatar} nick={winner.nick} size={72} />
          <h1 className="podium-name">{winner.nick}</h1>
          <p className="podium-score mono">{s.podium.points(first.score)}</p>
          {first.bestStreak > 1 && <p className="dim">{s.podium.streak(first.bestStreak)}</p>}
        </div>
      )}
      {ranked.length > 1 && (
        <ol className="sg-score-list podium-list">
          {ranked.map((p, i) => {
            const m = members.get(p.id);
            if (!m) return null;
            return (
              <li key={p.id} className="sg-score" data-first={i === 0 || undefined}>
                <span className="mono dim">{String(i + 1).padStart(2, '0')}</span>
                <Avatar avatar={m.avatar} nick={m.nick} size={28} />
                <span className="sg-score-name">{m.nick}</span>
                <span className="sg-score-pts mono">{p.score.toLocaleString('tr-TR')}</span>
              </li>
            );
          })}
        </ol>
      )}
      <p className="dim podium-back">{s.podium.back}</p>
    </main>
  );
}
