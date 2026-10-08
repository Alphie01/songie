import crypto from 'node:crypto';

export function randomId(len = 12): string {
  return crypto.randomBytes(len).toString('base64url').slice(0, len);
}

export function randomToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function randomCode(alphabet: string, length: number): string {
  let out = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) out += alphabet[bytes[i]! % alphabet.length];
  return out;
}
