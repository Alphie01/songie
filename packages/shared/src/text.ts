const FOLD: Record<string, string> = {
  ı: 'i', İ: 'i', ş: 's', Ş: 's', ğ: 'g', Ğ: 'g', ü: 'u', Ü: 'u', ö: 'o', Ö: 'o', ç: 'c', Ç: 'c',
  â: 'a', î: 'i', û: 'u', ß: 'ss', æ: 'ae', ø: 'o', œ: 'oe', đ: 'd', ł: 'l',
};

/** Küçük harfe çevirir, Türkçe ve diğer aksanları atar, noktalamayı boşluğa çevirir. */
export function foldText(input: string): string {
  let s = input.replace(/[ıİşŞğĞüÜöÖçÇâîûßæøœđł]/g, (ch) => FOLD[ch] ?? ch);
  s = s.normalize('NFKD').replace(/\p{M}+/gu, '').toLowerCase();
  s = s.replace(/&/g, ' and ').replace(/['’`´]/g, '');
  return s.replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

const VERSION_NOISE =
  /\s*[-–—]\s*(\d{4}\s+)?(remaster(ed)?|live|radio edit|single version|edit|acoustic|akustik|version|versiyon|mono|stereo|remix|canlı)\b.*$/i;

/** Şarkı adını karşılaştırma için sadeleştirir: parantez/köşeli içi, feat., sürüm ekleri atılır. */
export function normalizeTitle(title: string): string {
  let s = title;
  s = s.replace(/\s*[([{][^)\]}]*[)\]}]/g, ' ');
  s = s.replace(VERSION_NOISE, '');
  s = s.replace(/\s+(feat\.?|ft\.?|featuring|with)\s+.*$/i, '');
  return foldText(s);
}

export function normalizeArtist(artist: string): string {
  const main = artist.split(/\s*(?:,|&| x | feat\.?| ft\.?| featuring| ve )\s*/i)[0] ?? artist;
  return foldText(main);
}
