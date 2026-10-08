import { useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import type { PlayViewProps } from '@songie/game-kit/client';
import { Avatar, Icon } from '@songie/game-kit/ui';
import type { RoomPlayer } from '@songie/shared';
import {
  ANSWERS,
  QUESTIONS_PER_TURN,
  rankPlayers,
  type Answer,
  type HistoryItem,
  type PlayerCard,
  type WhoAmISettings,
  type WhoAmIView,
} from '../shared/index.js';
import { SettingsPanel } from './SettingsPanel';
import { s } from './strings';

type Send = (action: unknown) => Promise<boolean>;
type Members = Map<string, RoomPlayer>;

/** Kartlar hafif eğik dursun; her oyuncunun açısı sabit. */
const TILTS = [-2.5, 1.8, -1.2, 2.6, -1.9, 1.1, -2.8, 2.2, -0.8, 1.5, -2.2, 2.9];

export function PlayView({ view, meId, room, act, api, settings, setSettings }: PlayViewProps<WhoAmIView, WhoAmISettings>) {
  const members = useMemo(() => new Map(room.players.map((p) => [p.id, p])), [room.players]);
  const nick = (id: string) => (id === meId ? s.play.you : (members.get(id)?.nick ?? '?'));
  const isHost = room.hostId === meId;
  const [error, setError] = useState<string | null>(null);

  const send: Send = async (action) => {
    setError(null);
    const res = await act(action);
    if (!res.ok) setError(res.error);
    return res.ok;
  };

  if (view.phase === 'podium') return <Podium view={view} members={members} meId={meId} />;

  const panelProps = { settings, editable: isHost, api, players: room.players, meId, onChange: (n: WhoAmISettings) => void setSettings(n) };
  const me = view.players.find((p) => p.id === meId) ?? null;

  return (
    <div className="wa sg">
      <aside className="sg-side sg-left">
        <Progress view={view} members={members} meId={meId} />
      </aside>

      <main className="sg-center">
        <header className="sg-top">
          <span className="sg-round mono">{s.play.turn(view.turnNumber)}</span>
          <span className="sg-code mono">{room.code}</span>
        </header>

        <Foreheads view={view} members={members} meId={meId} />

        <Stage view={view} meId={meId} isHost={isHost} nick={nick} members={members} send={send} />
        {error && (
          <p className="error-text wa-center" role="alert">
            {error}
          </p>
        )}

        {me && <MyCorner view={view} me={me} send={send} />}

        <History view={view} meId={meId} members={members} nick={nick} />

        <div className="sg-mobile-only">
          <Progress view={view} members={members} meId={meId} />
        </div>

        <section className="howto" aria-labelledby="wa-howto">
          <h2 id="wa-howto" className="howto-title">
            {s.howto.title}
          </h2>
          <ol className="howto-list">
            {s.howto.steps.map(([title, body], i) => (
              <li key={title}>
                <span className="howto-n mono">{i + 1}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <aside className="sg-side sg-right">
        <SettingsPanel {...panelProps} section="secondary" />
      </aside>
    </div>
  );
}

/* ---------- Alın kartları ---------- */

function Note({ card, mine, tilt, size = 'md' }: { card: PlayerCard; mine: boolean; tilt: number; size?: 'md' | 'lg' }) {
  const hidden = !card.identity;
  return (
    <div
      className="wa-note"
      data-size={size}
      data-hidden={hidden || undefined}
      data-done={card.finished || undefined}
      style={{ '--tilt': `${tilt}deg` } as CSSProperties}
      aria-label={hidden ? s.play.yourCard : card.identity!.name}
    >
      {hidden ? (
        <span className="wa-note-q" aria-hidden="true">
          {s.play.unknown}
        </span>
      ) : (
        <>
          <span className="wa-note-name">{card.identity!.name}</span>
          {!mine && <span className="wa-note-cat">{card.identity!.category}</span>}
        </>
      )}
    </div>
  );
}

function Foreheads({ view, members, meId }: { view: WhoAmIView; members: Members; meId: string }) {
  return (
    <ul className="wa-faces" aria-label={s.play.progressTitle}>
      {view.players.map((p, i) => {
        const m = members.get(p.id);
        const asking = view.askerId === p.id;
        const offline = !p.left && m && !m.connected;
        return (
          <li key={p.id} className="wa-face" data-asking={asking || undefined} data-me={p.id === meId || undefined} data-left={p.left || undefined}>
            <Note card={p} mine={p.id === meId} tilt={TILTS[i % TILTS.length]!} />
            <div className="wa-face-who">
              {m ? <Avatar avatar={m.avatar} nick={m.nick} size={30} dim={!m.connected || p.left} /> : <span className="wa-face-ghost" />}
              <span className="wa-face-nick">{p.id === meId ? s.play.you : (m?.nick ?? '?')}</span>
            </div>
            <span className="wa-face-meta">
              {asking ? (
                <b className="wa-asking">{s.play.asking}</b>
              ) : p.finished ? (
                <span className="wa-done-tag">
                  <Icon name="check" size={12} />
                  {s.play.finished(p.finishRank! + 1)}
                </span>
              ) : p.left ? (
                s.play.left
              ) : offline ? (
                s.play.offline
              ) : (
                s.play.questions(p.questions)
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------- Ortadaki sahne: kimin ne yapacağı ---------- */

function Stage({
  view,
  meId,
  isHost,
  nick,
  members,
  send,
}: {
  view: WhoAmIView;
  meId: string;
  isHost: boolean;
  nick: (id: string) => string;
  members: Members;
  send: Send;
}) {
  const asker = view.askerId;
  if (!asker) return null;
  const askerCard = view.players.find((p) => p.id === asker)!;
  const mine = asker === meId;
  const iPlay = view.players.some((p) => p.id === meId && !p.left);
  const askerOffline = !members.get(asker)?.connected;

  // Grup onayı bekleyen tahmin
  if (view.guess) {
    const g = view.guess;
    if (g.playerId === meId) {
      return (
        <section className="wa-stage" data-tone="wait">
          <p className="wa-stage-title">{s.play.guessPendingMine(g.text)}</p>
          <p className="dim wa-small">{s.play.guessPendingMineHint}</p>
          <p className="mono wa-small">{s.play.voted(g.voted.length, g.expected)}</p>
        </section>
      );
    }
    return (
      <section className="wa-stage">
        <p className="wa-stage-kicker">{s.play.guessPending(nick(g.playerId))}</p>
        <p className="wa-stage-title wa-quote">“{g.text}”</p>
        <div className="wa-compare">
          <span className="dim wa-small">{s.play.guessCard}</span>
          <Note card={askerCard} mine={false} tilt={-1.5} size="lg" />
        </div>
        {iPlay && (
          <div className="wa-verify">
            <button type="button" className="btn btn-lg wa-btn-yes" aria-pressed={g.myVote === true} onClick={() => void send({ type: 'verify', guessId: g.id, correct: true })}>
              <Icon name="check" size={16} />
              {s.play.correct}
            </button>
            <button type="button" className="btn btn-lg wa-btn-no" aria-pressed={g.myVote === false} onClick={() => void send({ type: 'verify', guessId: g.id, correct: false })}>
              <Icon name="x" size={16} />
              {s.play.wrong}
            </button>
          </div>
        )}
        <p className="mono wa-small wa-center">
          {s.play.votes(g.votes.correct, g.votes.wrong)}. {s.play.voted(g.voted.length, g.expected)}
        </p>
        {isHost && g.voted.length > 0 && (
          <button type="button" className="btn btn-ghost wa-self-center" onClick={() => void send({ type: 'close', guessId: g.id })}>
            {s.play.closeVote}
          </button>
        )}
      </section>
    );
  }

  // Açık soru
  if (view.question) {
    const q = view.question;
    if (mine) {
      return (
        <section className="wa-stage" data-tone="wait">
          <p className="wa-stage-kicker">{s.play.myQuestion}</p>
          <p className="wa-stage-title wa-quote">{q.text ? `“${q.text}”` : s.play.myQuestionVoice}</p>
          <Tally counts={q.counts} />
          <p className="mono wa-small">{s.play.answered(q.answered.length, q.expected)}</p>
          {q.answered.length > 0 && (
            <button type="button" className="btn btn-outline" onClick={() => void send({ type: 'close', questionId: q.id })}>
              {s.play.closeNow}
            </button>
          )}
        </section>
      );
    }
    return (
      <section className="wa-stage">
        <div className="wa-stage-head">
          <div>
            <p className="wa-stage-kicker">{s.play.answerTitle(nick(asker))}</p>
            <p className="wa-stage-title wa-quote">{q.text ? `“${q.text}”` : s.play.voiceQuestion}</p>
          </div>
          <Note card={askerCard} mine={false} tilt={2} />
        </div>
        {iPlay && (
          <div className="wa-answers">
            {ANSWERS.map((a) => (
              <button
                key={a}
                type="button"
                className="btn btn-lg wa-answer"
                data-answer={a}
                aria-pressed={q.myAnswer === a}
                onClick={() => void send({ type: 'answer', questionId: q.id, answer: a })}
              >
                {s.answers[a]}
              </button>
            ))}
          </div>
        )}
        <Tally counts={q.counts} />
        <p className="mono wa-small wa-center">{s.play.answered(q.answered.length, q.expected)}</p>
        {isHost && q.answered.length > 0 && (
          <button type="button" className="btn btn-ghost wa-self-center" onClick={() => void send({ type: 'close', questionId: q.id })}>
            {s.play.closeNow}
          </button>
        )}
      </section>
    );
  }

  // Sıra bende: soru sor ya da tahmin et
  if (mine) return <MyTurn view={view} send={send} />;

  // Başkası soracak
  return (
    <section className="wa-stage">
      <div className="wa-stage-head">
        <div>
          <p className="wa-stage-title">{s.play.waitAsk(nick(asker))}</p>
          <LastResult view={view} nick={nick} />
        </div>
        <Note card={askerCard} mine={false} tilt={2} />
      </div>
      {isHost && (
        <button type="button" className={`btn ${askerOffline ? 'btn-outline' : 'btn-ghost'} wa-self-center`} onClick={() => void send({ type: 'pass' })}>
          <Icon name="skip" size={14} />
          {s.play.skip(nick(asker))}
        </button>
      )}
    </section>
  );
}

function MyTurn({ view, send }: { view: WhoAmIView; send: Send }) {
  const [question, setQuestion] = useState('');
  const [guess, setGuess] = useState('');
  const left = Math.max(0, QUESTIONS_PER_TURN - view.turnQuestions);

  async function ask(e: FormEvent) {
    e.preventDefault();
    if (await send({ type: 'ask', text: question.trim() || undefined })) setQuestion('');
  }

  async function submitGuess(e: FormEvent) {
    e.preventDefault();
    if (!guess.trim()) return;
    if (await send({ type: 'guess', text: guess.trim() })) setGuess('');
  }

  return (
    <section className="wa-stage" data-tone="mine">
      <p className="wa-stage-title wa-myturn">{s.play.myTurn}</p>
      <p className="wa-small wa-soft">{s.play.myTurnHint(view.turnMode, left)}</p>
      <form className="wa-form" onSubmit={ask}>
        {view.typedQuestions && (
          <input
            className="input"
            value={question}
            maxLength={140}
            placeholder={s.play.questionPlaceholder}
            aria-label={s.play.questionPlaceholder}
            onChange={(e) => setQuestion(e.target.value)}
          />
        )}
        <button className="btn btn-primary btn-lg btn-block">{question.trim() ? s.play.askTyped : s.play.askedAloud}</button>
      </form>
      <LastResult view={view} nick={() => s.play.you} />

      <form className="wa-guess" onSubmit={submitGuess}>
        <label className="wa-guess-label" htmlFor="wa-guess">
          {s.play.guessTitle}
        </label>
        <div className="wa-guess-row">
          <input
            id="wa-guess"
            className="input"
            value={guess}
            maxLength={60}
            autoComplete="off"
            placeholder={s.play.guessPlaceholder}
            onChange={(e) => setGuess(e.target.value)}
          />
          <button className="btn btn-outline" disabled={!guess.trim()}>
            {s.play.guess}
          </button>
        </div>
        <p className="sgs-hint">{s.play.guessHint}</p>
      </form>

      <button type="button" className="btn btn-ghost wa-self-center" onClick={() => void send({ type: 'pass' })}>
        <Icon name="skip" size={14} />
        {s.play.passMine}
      </button>
    </section>
  );
}

/** Son sorunun çoğunluk cevabı (sıra aynı kişide devam ederken bağlam verir). */
function LastResult({ view, nick }: { view: WhoAmIView; nick: (id: string) => string }) {
  const last = view.history.at(-1);
  if (!last || last.kind !== 'question' || last.askerId !== view.askerId || view.turnQuestions === 0) return null;
  return (
    <p className="wa-last wa-small">
      <span className="dim">{last.text ? `“${last.text}”` : s.play.voice}</span>{' '}
      <span className="wa-pill" data-answer={last.result}>
        {s.answers[last.result]}
      </span>
      <span className="sr-only"> {nick(last.askerId)}</span>
    </p>
  );
}

function Tally({ counts }: { counts: Record<Answer, number> }) {
  const total = ANSWERS.reduce((n, a) => n + counts[a], 0);
  return (
    <ul className="wa-tally">
      {ANSWERS.map((a) => (
        <li key={a} data-answer={a}>
          <span className="wa-tally-label">{s.answers[a]}</span>
          <span className="wa-tally-bar" aria-hidden="true">
            <span style={{ width: total ? `${(counts[a] / total) * 100}%` : 0 }} />
          </span>
          <span className="mono wa-tally-n">{counts[a]}</span>
        </li>
      ))}
    </ul>
  );
}

/* ---------- Bana özel: ipuçları ya da "bildin" ---------- */

function MyCorner({ view, me, send }: { view: WhoAmIView; me: PlayerCard; send: Send }) {
  if (me.finished && me.identity) {
    return (
      <section className="wa-mine" data-done>
        <Note card={me} mine tilt={-2} />
        <div>
          <p className="wa-mine-title">{s.play.done(me.finishRank! + 1)}</p>
          <p className="wa-small dim">{s.play.doneHint}</p>
        </div>
      </section>
    );
  }
  if (view.hintLimit === 0) return null;
  return (
    <section className="wa-mine">
      <Note card={me} mine tilt={-2} />
      <div className="wa-hints">
        <p className="wa-mine-title">{s.play.hintsTitle}</p>
        {view.myHints.length > 0 && (
          <ol className="wa-hint-list">
            {view.myHints.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ol>
        )}
        {view.hintsLeft > 0 && (
          <button type="button" className="btn btn-ghost wa-hint-btn" onClick={() => void send({ type: 'hint' })}>
            {s.play.hintButton(view.hintsLeft)}
          </button>
        )}
        <p className="sgs-hint">{s.play.hintNote}</p>
      </div>
    </section>
  );
}

/* ---------- Soru geçmişi ---------- */

function History({ view, meId, members, nick }: { view: WhoAmIView; meId: string; members: Members; nick: (id: string) => string }) {
  const [onlyMine, setOnlyMine] = useState(false);
  const items = [...view.history].reverse().filter((h) => !onlyMine || h.askerId === meId);
  return (
    <section className="wa-history" aria-labelledby="wa-history">
      <div className="wa-history-head">
        <h2 id="wa-history" className="wa-h2">
          {s.play.historyTitle}
        </h2>
        <div className="chips wa-filter">
          <button type="button" className="chip" aria-pressed={!onlyMine} onClick={() => setOnlyMine(false)}>
            {s.play.all}
          </button>
          <button type="button" className="chip" aria-pressed={onlyMine} onClick={() => setOnlyMine(true)}>
            {s.play.mine}
          </button>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="dim wa-small">{s.play.historyEmpty}</p>
      ) : (
        <ol className="wa-history-list">
          {items.map((h) => (
            <HistoryRow key={h.id} item={h} member={members.get(h.askerId)} name={nick(h.askerId)} />
          ))}
        </ol>
      )}
    </section>
  );
}

function HistoryRow({ item, member, name }: { item: HistoryItem; member: RoomPlayer | undefined; name: string }) {
  return (
    <li className="wa-hrow" data-kind={item.kind}>
      {member ? <Avatar avatar={member.avatar} nick={member.nick} size={24} /> : <span className="wa-face-ghost" />}
      <div className="wa-hrow-body">
        <span className="wa-hrow-who">{name}</span>
        {item.kind === 'question' && <span className="wa-hrow-text">{item.text ?? <span className="dim">{s.play.voice}</span>}</span>}
        {item.kind === 'guess' && (
          <span className="wa-hrow-text">
            {s.play.guessed(item.text)}
            {item.byGroup && <span className="dim"> ({s.play.byGroup})</span>}
          </span>
        )}
        {item.kind === 'skip' && <span className="wa-hrow-text dim">{item.byHost ? s.play.skippedHost : s.play.skipped}</span>}
      </div>
      {item.kind === 'question' && (
        <span className="wa-pill" data-answer={item.result} title={ANSWERS.map((a) => `${s.answers[a]} ${item.counts[a]}`).join(', ')}>
          {s.answers[item.result]}
        </span>
      )}
      {item.kind === 'guess' && (
        <span className="wa-pill" data-answer={item.correct ? 'yes' : 'no'}>
          <Icon name={item.correct ? 'check' : 'x'} size={12} />
          {item.correct ? s.play.correct : s.play.wrong}
        </span>
      )}
    </li>
  );
}

/* ---------- Yan sütun: oyuncular ve bitirenler ---------- */

function Progress({ view, members, meId }: { view: WhoAmIView; members: Members; meId: string }) {
  const ranked = rankPlayers(view.players.filter((p) => !p.left));
  return (
    <section className="wa-progress">
      <h2 className="wa-h2">{s.play.progressTitle}</h2>
      <ol className="sg-score-list">
        {ranked.map((p) => {
          const m = members.get(p.id);
          if (!m) return null;
          return (
            <li key={p.id} className="sg-score" data-me={p.id === meId || undefined} data-first={(p.finished && p.finishRank === 0) || undefined}>
              <Avatar avatar={m.avatar} nick={m.nick} size={26} dim={!m.connected} />
              <span className="sg-score-name">{m.nick}</span>
              {p.finished && <Icon name="check" size={14} className="wa-check" />}
              <span className="sg-score-pts mono">{s.play.questions(p.questions)}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* ---------- Sonuç ---------- */

function Podium({ view, members, meId }: { view: WhoAmIView; members: Members; meId: string }) {
  const ranked = rankPlayers(view.players.filter((p) => !p.left));
  const winner = ranked[0]?.finished ? ranked[0] : null;
  return (
    <main className="col podium wa-podium">
      <span className="wordmark" aria-hidden="true">
        songie
      </span>
      <p className="podium-kicker dim">{s.podium.title}</p>
      <div className="podium-winner">
        <h1 className="podium-name">{winner ? s.podium.winner(winner.id === meId ? s.play.you : (members.get(winner.id)?.nick ?? '?')) : s.podium.none}</h1>
      </div>
      <ol className="wa-rank">
        {ranked.map((p, i) => {
          const m = members.get(p.id);
          return (
            <li key={p.id} className="wa-rank-row" data-me={p.id === meId || undefined} data-done={p.finished || undefined}>
              <span className="mono wa-rank-n">{p.finished ? s.podium.place(i + 1) : ''}</span>
              {m ? <Avatar avatar={m.avatar} nick={m.nick} size={30} /> : <span className="wa-face-ghost" />}
              <div className="wa-rank-who">
                <span className="wa-rank-nick">{m?.nick ?? '?'}</span>
                <span className="wa-rank-id">{p.identity?.name}</span>
              </div>
              <span className="mono wa-rank-q">{p.finished ? s.podium.questions(p.questions) : s.podium.notFound}</span>
            </li>
          );
        })}
      </ol>
      <p className="dim podium-back">{s.podium.back}</p>
    </main>
  );
}
