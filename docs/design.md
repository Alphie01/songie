# Songie — tasarım

## Yön: songspot.net görünümü (kullanıcının açık isteği)
İlk sürümdeki "90'lar kaset" yönü (kobalt zemin, sarı/pembe, şekilli avatarlar) kullanıcı tarafından
"çocuk oyunu gibi" bulunup reddedildi. Kullanıcı açıkça songspot.net'in tasarımını ve özelliklerini
istedi; frontend-design skill'indeki kural gereği brief'in kendi sözü önceliklidir.

## Token'lar (`apps/web/src/styles/tokens.css`)
- Zemin `#030704`, paneller `#101511` / `#161c17`, çizgi `rgba(255,255,255,.08)`.
- Metin beyaz, ikincil `#b4b8b4`, sönük `#7c837c`.
- Vurgu yeşil `#19df70` (parlama efektiyle), koyu yazı `#04160b`.
- Zorluk renkleri: yeşil, sarı `#ffd234`, turuncu `#ff8631`, kırmızı `#f66464`, mor `#ae67ed`.
- Yazı: Poppins (400–800, logo ve oyun adları 800 italik); süre etiketleri JetBrains Mono.

## Düzen
- Sol üstte sabit menü butonu → yan menü: ses seviyesi, oyun listesi, profil.
- Orta sütun ~400px. Masaüstünde (≥1100px) lobi ve oyun ekranı üç sütun:
  sol = ne oynanacak (liste, zorluk, tur) ya da skor; sağ = nasıl oynanacak (süre, oynatma,
  kolay arama, tahmin şuradan başlasın, sanatçı puanı).
- Oyun ekranı: ilerleme çubuğu + işaretçi ve mono etiket, büyük yeşil çalma butonu, arama + Pas.

## Denendi / çıkarıldı
- Kaset yönü, Archivo genişlik ekseni, şekilli avatarlar, emoji tepkileri: kaldırıldı.
- Avatarlar: renkli daire + baş harf; işaret (bildi/yanlış/pas) köşede küçük nokta.
