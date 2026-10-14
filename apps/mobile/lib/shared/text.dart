import 'package:unorm_dart/unorm_dart.dart' as unorm;

/// `packages/shared/src/text.ts` karşılığı.
const _fold = <String, String>{
  'ı': 'i', 'İ': 'i', 'ş': 's', 'Ş': 's', 'ğ': 'g', 'Ğ': 'g', 'ü': 'u', 'Ü': 'u', 'ö': 'o', 'Ö': 'o', 'ç': 'c', 'Ç': 'c',
  'â': 'a', 'î': 'i', 'û': 'u', 'ß': 'ss', 'æ': 'ae', 'ø': 'o', 'œ': 'oe', 'đ': 'd', 'ł': 'l',
};

final _foldChars = RegExp('[ıİşŞğĞüÜöÖçÇâîûßæøœđł]');
final _marks = RegExp(r'\p{M}+', unicode: true);
final _apostrophes = RegExp('[\'’`´]');
final _nonWord = RegExp(r'[^\p{L}\p{N}]+', unicode: true);

/// Küçük harfe çevirir, Türkçe ve diğer aksanları atar, noktalamayı boşluğa çevirir.
String foldText(String input) {
  var s = input.replaceAllMapped(_foldChars, (m) => _fold[m[0]!] ?? m[0]!);
  s = unorm.nfkd(s).replaceAll(_marks, '').toLowerCase();
  s = s.replaceAll('&', ' and ').replaceAll(_apostrophes, '');
  return s.replaceAll(_nonWord, ' ').trim();
}

/// Türkçe büyük harf (`toLocaleUpperCase('tr-TR')`): i → İ, ı → I.
String trUpper(String s) => s.replaceAll('i', 'İ').replaceAll('ı', 'I').toUpperCase();

/// Türkçe küçük harf: İ → i, I → ı.
String trLower(String s) => s.replaceAll('İ', 'i').replaceAll('I', 'ı').toLowerCase();

/// `toLocaleString('tr-TR')`: binlik ayırıcı nokta.
String trNumber(num n) {
  final negative = n < 0;
  final digits = n.abs().round().toString();
  final out = StringBuffer();
  for (var i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 == 0) out.write('.');
    out.write(digits[i]);
  }
  return negative ? '-$out' : out.toString();
}

final _nickChars = RegExp(r'^[\p{L}\p{N} ._-]+$', unicode: true);

/// `nickSchema` (packages/shared/src/player.ts): hata metni ya da null.
String? nickError(String raw) {
  final nick = raw.trim();
  if (nick.length < 2) return 'Takma ad en az 2 karakter olmalı';
  if (nick.length > 16) return 'Takma ad en fazla 16 karakter olabilir';
  if (!_nickChars.hasMatch(nick)) return 'Takma adda yalnızca harf, rakam, boşluk ve . _ - kullanılabilir';
  return null;
}
