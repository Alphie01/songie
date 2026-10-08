import { useState, type FormEvent } from 'react';
import { AVATAR_COLORS, nickSchema, type Avatar as AvatarData, type ProfileInput } from '@songie/shared';
import { Avatar, AVATAR_COLOR } from '@songie/game-kit/ui';
import { tr } from '../i18n/tr';
import './profile-form.css';

const COLOR_NAMES: Record<AvatarData['color'], string> = {
  mint: 'Yeşil',
  signal: 'Sarı',
  label: 'Kırmızı',
  sky: 'Mavi',
  paper: 'Mor',
};
const ORDER: AvatarData['color'][] = ['mint', 'signal', 'label', 'sky', 'paper'];

export function ProfileForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: ProfileInput;
  submitLabel: string;
  onSubmit(input: ProfileInput): Promise<void>;
}) {
  const [nick, setNick] = useState(initial?.nick ?? '');
  const [color, setColor] = useState<AvatarData['color']>(
    initial?.avatar.color ?? AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]!,
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = nickSchema.safeParse(nick);
    if (!parsed.success) {
      setError(parsed.error.issues[0]!.message);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ nick: parsed.data, avatar: { shape: 'circle', color } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kaydedilemedi. Tekrar dene.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="pf" onSubmit={submit} noValidate>
      <div className="pf-row">
        <Avatar avatar={{ shape: 'circle', color }} nick={nick || '?'} size={48} />
        <label className="pf-nick">
          <span className="sr-only">{tr.welcome.nick}</span>
          <input
            className="input"
            value={nick}
            maxLength={16}
            autoComplete="nickname"
            autoFocus={!initial}
            placeholder={tr.welcome.nickPlaceholder}
            onChange={(e) => setNick(e.target.value)}
            aria-label={tr.welcome.nick}
            aria-invalid={!!error}
            aria-describedby={error ? 'nick-error' : undefined}
          />
        </label>
      </div>
      {error && (
        <p id="nick-error" className="error-text" role="alert">
          {error}
        </p>
      )}

      <fieldset className="pf-colors">
        <legend className="eyebrow">{tr.welcome.color}</legend>
        <div className="pf-swatches">
          {ORDER.map((c) => (
            <button
              key={c}
              type="button"
              className="pf-swatch"
              aria-pressed={color === c}
              aria-label={COLOR_NAMES[c]}
              style={{ '--c': AVATAR_COLOR[c] } as React.CSSProperties}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </fieldset>

      <button className="btn btn-primary btn-block btn-lg" disabled={busy}>
        {busy ? tr.welcome.saving : submitLabel}
      </button>
    </form>
  );
}
