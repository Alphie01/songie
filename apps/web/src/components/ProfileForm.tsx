import { useState, type FormEvent, type ReactNode } from 'react';
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

/** Ad + renk kartı (tasarım: İlk giriş). Gönder butonu kartın altında, ekranın dibinde durur. */
export function ProfileForm({
  initial,
  submitLabel,
  onSubmit,
  before,
}: {
  initial?: ProfileInput;
  submitLabel: string;
  onSubmit(input: ProfileInput): Promise<void>;
  /** Kartın üstüne (aynı form içinde) eklenecek içerik. */
  before?: ReactNode;
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
      {before}
      <div className="pf-card">
        <div className="pf-head">
          <Avatar avatar={{ shape: 'circle', color }} nick={nick || '?'} size={64} />
          <div>
            <h1 className="display pf-title">{tr.welcome.title}</h1>
            <p className="pf-sub">{tr.welcome.sub}</p>
          </div>
        </div>
        <label className="sr-only" htmlFor="nick">
          {tr.welcome.nick}
        </label>
        <input
          id="nick"
          className="pf-input"
          value={nick}
          maxLength={16}
          autoComplete="nickname"
          autoFocus={!initial}
          placeholder={tr.welcome.nickPlaceholder}
          onChange={(e) => setNick(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? 'nick-error' : undefined}
        />
        {error && (
          <p id="nick-error" className="pf-error" role="alert">
            {error}
          </p>
        )}
        <fieldset className="pf-colors">
          <legend className="pf-label">{tr.welcome.color}</legend>
          <div className="pf-swatches" role="radiogroup" aria-label={tr.welcome.color}>
            {ORDER.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                className="pf-swatch"
                aria-checked={color === c}
                aria-label={COLOR_NAMES[c]}
                style={{ background: AVATAR_COLOR[c] }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </fieldset>
        <p className="pf-note">{tr.welcome.note}</p>
      </div>
      <div className="pf-spacer" />
      <button className="pf-submit" disabled={busy}>
        {busy ? tr.welcome.saving : submitLabel}
      </button>
    </form>
  );
}
