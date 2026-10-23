import React from 'react';
import type { AppTheme } from '../../themes/types';
import { APP } from '../app/appTokens';
import { FONT_BODY, FONT_DISPLAY } from '../fonts';
import { CF, ConfBox, ConfCanvas, ConfHead, ConfTimer, GhostButton, HostBox } from './confessionsParts';
import { CF_TEXT, canSend, counterBad, counterLabel, trimmedLength, writeHead, wroteChip, wroteTitle } from './confessionsText';

export type ConfessionsWriteProps = {
  theme: AppTheme;
  /** Round topic; omitted = free mode ("Serbest itiraf" + hint as the headline). */
  topic?: string;
  /** Pill text, default "Tur 2/5 · Yaz". */
  round?: string;
  code?: string;
  /** Seconds left / write time; seconds omitted = untimed ("Süresiz"). */
  seconds?: number;
  duration?: number;
  /** What is typed in the note so far (empty = placeholder). */
  text?: string;
  /** Draw the text caret after the typed text (blink it from the reel). */
  caret?: boolean;
  /** 0..1 press-down of "İtirafı gönder" (:active). */
  press?: number;
  /** Sent: button reads "İtirafı güncelle" (disabled until edited), note line switches to the sent note. */
  sent?: boolean;
  /** Every player's nick in room order, and who has written. */
  players?: string[];
  written?: string[];
  /** Players shown dimmed (not counted in "Yazanlar 3/6"). */
  offline?: string[];
  /** Host sees the ghost "Yazmayı bitir" once anyone has written. */
  isHost?: boolean;
};

/**
 * Gizli İtiraflar write phase (games/confessions/client PlayView Write + confessions.css), drawn at 393 px and
 * scaled to the PhoneFrame screen.
 */
export const ConfessionsWriteScreen: React.FC<ConfessionsWriteProps> = ({
  theme,
  topic = 'Yatmadan önce yaptığın garip bir ritüel',
  round = writeHead(2, 5),
  code = 'ODAK',
  seconds = 42,
  duration = 90,
  text = '',
  caret = false,
  press = 0,
  sent = false,
  players = ['Sen', 'Mert', 'Deniz', 'Kaan', 'Zeynep', 'Bora'],
  written = ['Mert', 'Zeynep', 'Bora'],
  offline = [],
  isHost = false,
}) => {
  const c = theme.colors;
  const len = trimmedLength(text);
  // A sent note is shown as sent and unchanged (dirty = false).
  const enabled = canSend(text, sent, false);
  const online = players.filter((p) => !offline.includes(p)).length;
  return (
    <ConfCanvas theme={theme}>
      <ConfHead theme={theme} label={round} code={code} />
      <ConfTimer theme={theme} seconds={seconds} duration={duration} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 'none' }}>
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: APP.text3 }}>
          {topic ? CF_TEXT.topicLabel : CF_TEXT.freeTopic}
        </span>
        <h1 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 32, fontWeight: 800, lineHeight: 1.05, overflowWrap: 'anywhere' }}>
          {topic ?? CF_TEXT.freeTopicHint}
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <div
              style={{
                minHeight: 170,
                boxSizing: 'border-box',
                padding: '16px 16px 30px',
                border: `${APP.bw}px solid ${c.ink}`,
                borderRadius: 6,
                background: CF.note,
                color: CF.noteInk,
                boxShadow: `6px 6px 0 ${c.ink}`,
                fontFamily: FONT_DISPLAY,
                fontSize: 20,
                fontWeight: 700,
                lineHeight: 1.25,
                transform: 'rotate(-1deg)',
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere',
              }}
            >
              {text ? text : <span style={{ color: CF.placeholder }}>{caret ? null : CF_TEXT.placeholder}</span>}
              {caret && (
                <span
                  style={{
                    display: 'inline-block',
                    width: 2,
                    height: '1.1em',
                    marginLeft: 1,
                    verticalAlign: '-0.15em',
                    background: CF.noteInk,
                  }}
                />
              )}
              {!text && caret && <span style={{ color: CF.placeholder }}>{CF_TEXT.placeholder}</span>}
            </div>
            <span
              style={{
                position: 'absolute',
                right: 12,
                bottom: 10,
                fontSize: 12,
                fontWeight: 800,
                color: counterBad(len) ? CF.bad : CF.noteInk,
              }}
            >
              {counterLabel(len)}
            </span>
          </div>
          <div
            style={{
              minHeight: 58,
              boxSizing: 'border-box',
              padding: '0 18px',
              border: `${APP.bw}px solid ${c.ink}`,
              borderRadius: 20,
              background: c.yellow,
              color: APP.ink2,
              boxShadow: `0 ${5 - 4 * press}px 0 ${c.ink}`,
              transform: press ? `translateY(${4 * press}px)` : undefined,
              opacity: enabled ? 1 : 0.55,
              fontFamily: FONT_DISPLAY,
              fontSize: 21,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {sent ? CF_TEXT.update : CF_TEXT.send}
          </div>
        </div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: APP.text3 }}>{sent ? CF_TEXT.sent : CF_TEXT.privacy}</p>

        <ConfBox theme={theme} title={wroteTitle(written.length, online)}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {players.map((p) => {
              const done = written.includes(p);
              return (
                <span
                  key={p}
                  style={{
                    padding: '3px 9px',
                    border: `2px solid ${done ? c.mint : CF.violet}`,
                    borderRadius: APP.pill,
                    background: done ? c.mint : undefined,
                    color: done ? APP.ink2 : c.paper,
                    fontFamily: FONT_BODY,
                    fontSize: 13,
                    fontWeight: 800,
                    opacity: offline.includes(p) ? 0.6 : 1,
                  }}
                >
                  {wroteChip(p, done)}
                </span>
              );
            })}
          </div>
        </ConfBox>

        {isHost && written.length > 0 && (
          <HostBox hint={CF_TEXT.closeWritingHint}>
            <GhostButton label={CF_TEXT.closeWriting} />
          </HostBox>
        )}
      </div>
    </ConfCanvas>
  );
};
