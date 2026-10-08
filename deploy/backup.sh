#!/usr/bin/env bash
# SQLite veritabanının tutarlı bir kopyasını deploy/backups/ altına alır.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p backups
name="songie-$(date +%Y%m%d-%H%M%S).db"
docker compose -p songie exec -T app node --input-type=module -e "
  import Database from 'better-sqlite3';
  await new Database('/data/songie.db', { readonly: true }).backup('/data/backup.db');
"
docker compose -p songie cp app:/data/backup.db "backups/$name"
docker compose -p songie exec -T app rm -f /data/backup.db
echo "backups/$name"
