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

/** Not kâğıtları hafif eğik dursun; her oyuncunun açısı ve rengi sabit (tasarım: -4, 3, -2, 4). */
const TILTS = [-4, 3, -2, 4, -3, 2, -4, 3, -2, 4, -3, 2];
const NOTE_COLORS = ['pink', 'sky', 'mint', 'yellow', 'lilac', 'coral'] as const;

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

  if (view.phase === 'podium') return <Podium view={view} members={members} meId={meId} code={room.code} />;

  const panelProps = { settings, editable: isHost, api, players: room.players, meId, onChange: (n: WhoAmISettings) => void setSettings(n) };
  const me = view.players.find((p) => p.id === meId) ?? null;

  return (
    <div className="wa sg">
      <aside className="sg-side sg-left">
        <Progress view={view} members={members} meId={meId} />
      </aside>

      <main className="sg-center">
        <section className="wa-play">
          <header className="wa-top">
            <span className="wa-round">
              {s.name} · {s.play.turn(view.turnNumber)}
            </span>
            <span className="wa-code">{room.code}</span>
          </header>

          <Foreheads view={view} members={members} meId={meId} />

          <Stage view={view} meId={meId} isHost={isHost} nick={nick} members={members} send={send} />
          {error && (
            <p className="error-text wa-center" role="alert">
              {error}
            </p>
          )}

          <History view={view} meId={meId} nick={nick} />

          <div className="wa-spacer" />
          {me && <MyCorner view={view} me={me} send={send} />}
        </section>

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

function Note({ card, mine, index }: { card: PlayerCard; mine: boolean; index: number }) {
  const hidden = !card.identity;
  return (
    <div
      className="wa-note"
      data-color={hidden ? 'mine' : NOTE_COLORS[index % NOTE_COLORS.length]}
      data-hidden={hidden || undefined}
      style={{ '--tilt': `${TILTS[index % TILTS.length]}deg` } as CSSProperties}
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
          <li key={p.id} className="wa-face" data-left={p.left || undefined} data-offline={offline || undefined}>
            <Note card={p} mine={p.id === meId} index={i} />
            <span className="wa-face-nick">{p.id === meId ? s.play.you : (m?.nick ?? '?')}</span>
            <span className="wa-face-meta" data-state={asking ? 'asking' : p.finished ? 'done' : undefined}>
              {asking
                ? s.play.asking
                : p.finished
                  ? `✓ ${s.play.finished(p.finishRank! + 1)}`
                  : p.left
                    ? s.play.left
                    : offline
                      ? s.play.offline
                      : s.play.questions(p.questions)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------- Ortadaki sahne: kimin ne yapacağı ---------- */

/** "Mert soruyor · kartı: Zürafa" */
function Kicker({ text, card }: { text: string; card: PlayerCard | undefined }) {
  return (
    <span className="wa-kicker">
      {text}
      {card?.identity && (
        <>
          {' · '}
          {s.play.cardIs} <strong>{card.identity.name}</strong>
        </>
      )}
    </span>
  );
}

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
  const askerCard = view.players.find((p) => p.id === asker);
  const mine = asker === meId;
  const iPlay = view.players.some((p) => p.id === meId && !p.left);
  const askerOffline = !members.get(asker)?.connected;

  // Grup onayı bekleyen tahmin
  if (view.guess) {
    const g = view.guess;
    if (g.playerId === meId) {
      return (
        <section className="wa-card">
          <span className="wa-kicker">{s.play.guessPendingMineHint}</span>
          <p className="wa-quote">{s.play.guessPendingMine(g.text)}</p>
          <span className="wa-count">{s.play.voted(g.voted.length, g.expected)}</span>
        </section>
      );
    }
    return (
      <section className="wa-card">
        <Kicker text={s.play.guessPending(nick(g.playerId))} card={askerCard} />
        <p className="wa-quote">“{g.text}”</p>
        {iPlay && (
          <div className="wa-answers">
            <button type="button" className="wa-answer" data-answer="yes" aria-pressed={g.myVote === true} onClick={() => void send({ type: 'verify', guessId: g.id, correct: true })}>
              {s.play.correct}
            </button>
            <button type="button" className="wa-answer" data-answer="no" aria-pressed={g.myVote === false} onClick={() => void send({ type: 'verify', guessId: g.id, correct: false })}>
              {s.play.wrong}
            </button>
          </div>
        )}
        <span className="wa-count">
          {s.play.votes(g.votes.correct, g.votes.wrong)}. {s.play.voted(g.voted.length, g.expected)}
        </span>
        {isHost && g.voted.length > 0 && (
          <button type="button" className="wa-card-btn" onClick={() => void send({ type: 'close', guessId: g.id })}>
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
        <section className="wa-card">
          <span className="wa-kicker">{s.play.myQuestion}</span>
          <p className="wa-quote">{q.text ? `“${q.text}”` : s.play.myQuestionVoice}</p>
          <Tally counts={q.counts} expected={q.expected} />
          <span className="wa-count">{s.play.answered(q.answered.length, q.expected)}</span>
          {q.answered.length > 0 && (
            <button type="button" className="wa-card-btn" onClick={() => void send({ type: 'close', questionId: q.id })}>
              {s.play.closeNow}
            </button>
          )}
        </section>
      );
    }
    return (
      <section className="wa-card">
        <Kicker text={s.play.answerTitle(nick(asker))} card={askerCard} />
        <p className="wa-quote">{q.text ? `“${q.text}”` : s.play.voiceQuestion}</p>
        {iPlay && (
          <div className="wa-answers">
            {ANSWERS.map((a) => (
              <button
                key={a}
                type="button"
                className="wa-answer"
                data-answer={a}
                aria-pressed={q.myAnswer === a}
                onClick={() => void send({ type: 'answer', questionId: q.id, answer: a })}
              >
                {s.answers[a]}
              </button>
            ))}
          </div>
        )}
        <Tally counts={q.counts} expected={q.expected} />
        <span className="wa-count">{s.play.answered(q.answered.length, q.expected)}</span>
        {isHost && q.answered.length > 0 && (
          <button type="button" className="wa-card-btn" onClick={() => void send({ type: 'close', questionId: q.id })}>
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
    <section className="wa-card">
      <Kicker text={s.play.nextUp(nick(asker))} card={askerCard} />
      <p className="wa-quote wa-quote-sm">{s.play.waitAsk(nick(asker))}</p>
      <LastResult view={view} />
      {isHost && (
        <button type="button" className="wa-card-btn" data-strong={askerOffline || undefined} onClick={() => void send({ type: 'pass' })}>
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
    <section className="wa-myturn">
      <h2 className="wa-myturn-title">{s.play.myTurn}</h2>
      <p className="wa-myturn-hint">{s.play.myTurnHint(view.turnMode, left)}</p>
      <form className="wa-form" onSubmit={ask}>
        {view.typedQuestions && (
          <>
            <label htmlFor="wa-question" className="sr-only">
              {s.play.questionPlaceholder}
            </label>
            <input
              id="wa-question"
              className="wa-input"
              value={question}
              maxLength={140}
              autoComplete="off"
              placeholder={s.play.questionPlaceholder}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </>
        )}
        <button className="wa-dark-btn">{question.trim() ? s.play.askTyped : s.play.askedAloud}</button>
      </form>
      <LastResult view={view} />

      <form className="wa-guess" onSubmit={submitGuess}>
        <label className="sr-only" htmlFor="wa-guess">
          {s.play.guessLabel}
        </label>
        <input
          id="wa-guess"
          className="wa-input wa-input-sm"
          value={guess}
          maxLength={60}
          autoComplete="off"
          placeholder={s.play.guessPlaceholder}
          onChange={(e) => setGuess(e.target.value)}
        />
        <button className="wa-guess-btn" disabled={!guess.trim()}>
          {s.play.guess}
        </button>
      </form>
      <div className="wa-myturn-foot">
        <span className="wa-myturn-note">{s.play.guessHint}</span>
        <button type="button" className="wa-pass" onClick={() => void send({ type: 'pass' })}>
          {s.play.passMine}
        </button>
      </div>
    </section>
  );
}

/** Son sorunun çoğunluk cevabı (sıra aynı kişide devam ederken bağlam verir). */
function LastResult({ view }: { view: WhoAmIView }) {
  const last = view.history.at(-1);
  if (!last || last.kind !== 'question' || last.askerId !== view.askerId || view.turnQuestions === 0) return null;
  return (
    <p className="wa-last">
      {s.play.lastAnswer} {last.text ? `“${last.text}”` : s.play.voice}{' '}
      <span className="wa-pill" data-answer={last.result} data-bordered>
        {s.answers[last.result]}
      </span>
    </p>
  );
}

function Tally({ counts, expected }: { counts: Record<Answer, number>; expected: number }) {
  const total = Math.max(expected, ANSWERS.reduce((n, a) => n + counts[a], 0), 1);
  return (
    <ul className="wa-tally">
      {ANSWERS.map((a) => (
        <li key={a} data-answer={a}>
          <span className="wa-tally-label">{s.answers[a]}</span>
          <span className="wa-tally-bar" aria-hidden="true">
            <span style={{ width: `${(counts[a] / total) * 100}%` }} />
          </span>
          <span className="wa-tally-n">{counts[a]}</span>
        </li>
      ))}
    </ul>
  );
}

/* ---------- Bana özel: ipuçları ya da "bildin" ---------- */

function MyCorner({ view, me, send }: { view: WhoAmIView; me: PlayerCard; send: Send }) {
  if (me.finished && me.identity) {
    return (
      <section className="wa-done">
        <span className="wa-done-title">{s.play.done(me.finishRank! + 1)}</span>
        <span className="wa-done-name">{me.identity.name}</span>
        <span className="wa-done-hint">{s.play.doneHint}</span>
      </section>
    );
  }
  if (view.hintLimit === 0) return null;
  return (
    <section className="wa-hints" aria-label={s.play.hintsTitle}>
      {view.myHints.length > 0 && (
        <ol className="wa-hint-list">
          {view.myHints.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ol>
      )}
      <div className="wa-hint-row">
        <span className="wa-hint-note">{s.play.hintNote}</span>
        {view.hintsLeft > 0 && (
          <button type="button" className="wa-hint-btn" onClick={() => void send({ type: 'hint' })}>
            {s.play.hintButton(view.hintsLeft)}
          </button>
        )}
      </div>
    </section>
  );
}

/* ---------- Soru geçmişi ---------- */

function History({ view, meId, nick }: { view: WhoAmIView; meId: string; nick: (id: string) => string }) {
  const [onlyMine, setOnlyMine] = useState(false);
  const items = [...view.history].reverse().filter((h) => !onlyMine || h.askerId === meId);
  return (
    <section className="wa-history" aria-labelledby="wa-history">
      <div className="wa-history-head">
        <h2 id="wa-history" className="wa-box-title">
          {s.play.historyTitle}
        </h2>
        <div className="wa-filter">
          <button type="button" aria-pressed={!onlyMine} onClick={() => setOnlyMine(false)}>
            {s.play.all}
          </button>
          <button type="button" aria-pressed={onlyMine} onClick={() => setOnlyMine(true)}>
            {s.play.mine}
          </button>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="wa-hrow-empty">{s.play.historyEmpty}</p>
      ) : (
        <ol className="wa-history-list">
          {items.map((h) => (
            <HistoryRow key={h.id} item={h} name={nick(h.askerId)} />
          ))}
        </ol>
      )}
    </section>
  );
}

function HistoryRow({ item, name }: { item: HistoryItem; name: string }) {
  const who = name.charAt(0).toLocaleUpperCase('tr-TR') + name.slice(1);
  return (
    <li className="wa-hrow" data-kind={item.kind}>
      <span className="wa-hrow-text">
        <strong>{who}:</strong>{' '}
        {item.kind === 'question' && (item.text ?? <span className="wa-faint">{s.play.voice}</span>)}
        {item.kind === 'guess' && (
          <>
            {s.play.guessed(item.text)}
            {item.byGroup && <span className="wa-faint"> ({s.play.byGroup})</span>}
          </>
        )}
        {item.kind === 'skip' && <span className="wa-faint">{item.byHost ? s.play.skippedHost : s.play.skipped}</span>}
      </span>
      {item.kind === 'question' && (
        <span className="wa-pill" data-answer={item.result} title={ANSWERS.map((a) => `${s.answers[a]} ${item.counts[a]}`).join(', ')}>
          {s.answers[item.result]}
        </span>
      )}
      {item.kind === 'guess' && (
        <span className="wa-pill" data-answer={item.correct ? 'yes' : 'no'}>
          {item.correct ? s.play.correct : s.play.wrong}
        </span>
      )}
    </li>
  );
}

/* ---------- Yan sütun (masaüstü): oyuncular ve bitirenler ---------- */

function Progress({ view, members, meId }: { view: WhoAmIView; members: Members; meId: string }) {
  const ranked = rankPlayers(view.players.filter((p) => !p.left));
  return (
    <section className="wa-board">
      <h2 className="wa-box-title">{s.play.progressTitle}</h2>
      <ol>
        {ranked.map((p) => {
          const m = members.get(p.id);
          if (!m) return null;
          return (
            <li key={p.id} data-me={p.id === meId || undefined} data-done={p.finished || undefined}>
              <Avatar avatar={m.avatar} nick={m.nick} size={28} dim={!m.connected} />
              <span className="wa-board-nick">{m.nick}</span>
              <span className="wa-board-q">
                {p.finished && '✓ '}
                {s.play.questions(p.questions)}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* ---------- Oyun sonu (Sonuclar.dc.html) ---------- */

function Crown() {
  return (
    <svg width="40" height="28" viewBox="0 0 40 28" aria-hidden="true" className="wa-crown">
      <path d="M3 25L6 6l9 9 5-12 5 12 9-9 3 19z" />
    </svg>
  );
}

function Podium({ view, members, meId, code }: { view: WhoAmIView; members: Members; meId: string; code: string }) {
  const ranked = rankPlayers(view.players.filter((p) => !p.left));
  const finished = ranked.filter((p) => p.finished);
  const winner = finished[0] ?? null;
  const top = finished.slice(0, 2);
  const nickOf = (id: string) => members.get(id)?.nick ?? '?';
  return (
    <main className="col wa-endscreen">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="wa-confetti" data-n={i} aria-hidden="true" />
      ))}
      <div className="wa-end-top">
        <span>{s.name}</span>
        <span className="wa-end-code">{code}</span>
      </div>
      <div className="wa-end-title">
        <span className="wa-end-tag" lang="tr">
          {s.podium.title}
        </span>
        <h1>{winner ? s.podium.winner(nickOf(winner.id)) : s.podium.none}</h1>
      </div>

      {top.length > 0 && (
        <div className="wa-end-cards">
          {top.map((p, i) => (
            <div key={p.id} className="wa-end-card" data-place={i + 1}>
              {i === 0 && <Crown />}
              <span className="wa-end-num">{p.questions}</span>
              <span className="wa-end-label">{nickOf(p.id)}</span>
              <span className="wa-end-sub">{s.podium.asked(p.questions)}</span>
            </div>
          ))}
        </div>
      )}

      <section className="wa-board wa-rank" aria-label={s.podium.ranking}>
        <h2 className="wa-box-title">{s.podium.ranking}</h2>
        <ol>
          {ranked.map((p, i) => {
            const m = members.get(p.id);
            return (
              <li key={p.id} data-me={p.id === meId || undefined} data-done={p.finished || undefined}>
                <span className="wa-rank-n">{p.finished ? s.podium.place(i + 1) : ''}</span>
                {m ? <Avatar avatar={m.avatar} nick={m.nick} size={28} /> : null}
                <span className="wa-rank-who">
                  <span className="wa-board-nick">{m?.nick ?? '?'}</span>
                  <span className="wa-rank-id">{p.identity?.name}</span>
                </span>
                <span className="wa-board-q">{p.finished ? s.podium.questions(p.questions) : s.podium.notFound}</span>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="wa-spacer" />
      <div className="wa-end-foot">
        <span className="wa-end-bar" aria-hidden="true">
          <span style={{ animationDuration: `${view.podiumMs}ms` }} />
        </span>
        <p>{s.podium.back}</p>
      </div>
    </main>
  );
}
