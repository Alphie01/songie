import type { Avatar as AvatarData } from '@songie/shared';
import './ui.css';

/** Avatar renkleri (şema adları içseldir; kullanıcı rengi görür). */
export const AVATAR_COLOR: Record<AvatarData['color'], string> = {
  mint: '#19df70',
  signal: '#ffd234',
  label: '#f66464',
  sky: '#6aa8ff',
  paper: '#ae67ed',
};

export type AvatarMark = 'correct' | 'artist' | 'locked' | 'skipped' | null;

const MARK_LABEL: Record<Exclude<AvatarMark, null>, string> = {
  correct: 'bildi',
  artist: 'sanatçıyı bildi',
  locked: 'yanlış',
  skipped: 'pas',
};

export function Avatar({
  avatar,
  nick,
  size = 36,
  mark = null,
  dim = false,
}: {
  avatar: AvatarData;
  nick: string;
  size?: number;
  mark?: AvatarMark;
  dim?: boolean;
}) {
  const color = AVATAR_COLOR[avatar.color] ?? AVATAR_COLOR.mint;
  const letter = nick.trim().charAt(0).toLocaleUpperCase('tr-TR') || '?';
  return (
    <span
      className="gk-avatar"
      data-dim={dim || undefined}
      style={{ width: size, height: size, fontSize: size * 0.42, color, background: `${color}1f`, boxShadow: `inset 0 0 0 1px ${color}40` }}
    >
      {letter}
      {mark && (
        <span className="gk-mark" data-mark={mark} title={MARK_LABEL[mark]}>
          <span className="sr-only">{MARK_LABEL[mark]}</span>
        </span>
      )}
    </span>
  );
}
