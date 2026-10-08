# Yayına alma

Her şey `songie` adlı ayrı bir Docker Compose projesinde çalışır. Kendi ağı, kendi volume'ü ve kendi
Cloudflare tüneli vardır. Host nginx'e ve diğer projelere dokunmaz.

## 1. Cloudflare tüneli (bir kez)
1. Cloudflare Zero Trust → Networks → Tunnels → **Create a tunnel** → Cloudflared.
2. Tünele bir ad ver (ör. `songie`). Kurulum ekranındaki komutta görünen **token**'ı kopyala
   (`--token` sonrası uzun metin). Komutu çalıştırma; token yeterli.
3. **Public hostname** ekle: alt alan adı (ör. `oyun`), alan adın, Service: `HTTP` → `app:8080`.
4. `deploy/.env.example` dosyasını `deploy/.env` olarak kopyala, `TUNNEL_TOKEN` ve `PUBLIC_ORIGIN`'i doldur.

## 2. Çalıştır
```bash
cd deploy
docker compose up -d --build                      # yalnızca uygulama (127.0.0.1:4310)
docker compose --profile tunnel up -d --build     # uygulama + tünel
```
İlk açılışta şarkı listeleri Deezer'dan arka planda çekilir (~30 sn).

## Bakım
- Kayıtlar: `docker compose logs -f app`
- Güncelleme: `git pull && docker compose --profile tunnel up -d --build`
- Yedek: `./backup.sh` → `deploy/backups/`
