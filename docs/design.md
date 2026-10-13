# Songie — tasarım

## Kaynak: "Songie Arayüz" tasarımı (Ekim 2026, kullanıcının verdiği canvas)
Kullanıcı yeni arayüzü bir tasarım canvas'ı olarak verdi: https://claude.ai/artifact/6TuCRUWASPFvhWarFfG32n
(24 ekran: ana sayfa, ilk giriş, lobi, rehber, oyun sonu ve her oyun için bir ekran).
Kural: **tasarım yorumlanmaz, birebir uygulanır** (kullanıcı: "tasarımı benzetmeye çalışma direk uygula").
Tasarımda olmayan bir durum gerekiyorsa aynı görsel dille genişletilir.
Önceki songspot.net görünümü bu tasarımla değişti.

## Token'lar (`apps/web/src/styles/tokens.css`)
- Zemin mor `#2A1B6E`, koyu yüzey `#1F145A`, yükseltilmiş yüzey `#3A2A8C`, pencere arkası `#150E38`.
- Mürekkep `#0D0828`: 3px çerçeve ve sert gölge (`4px 4px 0`, butonlarda `0 6px 0`).
- Renkler: nane `#3EE0A8`, sarı `#FFD23F`, pembe `#FF7AC6`, gök `#5AB8FF`, lila `#B794FF`, mercan `#FF8A5B`, kırmızı `#FF6B6B`, menekşe `#6E5FC4`.
- Yazı: Baloo 2 (başlık, 800) + Nunito (metin, 600–800).
- Kartlar hafif eğik durur (−1,2°…1°); etiketler eğik "sticker" hapı.

## Düzen
- Ana sayfa, lobi ve profil: üst çubuk (menü · logo · sağ düğme).
- Oyun sırasında: sol üstte menü, sağ üstte "?" ve sohbet; oyunlar üstte ~72px boşluk bırakır.
- Kategori renkleri (`[data-cat]`): takım sarı, parti nane, gizli roller lila, kart mercan, müzik pembe, dedektif gök.
- Oyun sonu: ayrı sonuç ekranı (podyum, "Rövanş!", "Başka oyun seç", lobiye geri sayım).
