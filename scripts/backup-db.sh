#!/usr/bin/env bash
# Daily backup of the orders database (server only): a compressed pg_dump per day, the last BACKUP_DIAS days
# kept, plus the 1st of each month for a year. With BACKUP_REMOTO (usuario@maquina:/carpeta) each backup is also
# copied to another machine. Run by deploy/ensushi-backup.timer; see docs/app-pedidos.md ("Backups").
set -euo pipefail

: "${DATABASE_URL:?Falta DATABASE_URL}"
DIR="${BACKUP_DIR:-/var/backups/ensushi}"
KEEP_DAYS="${BACKUP_DIAS:-14}"

mkdir -p "$DIR"
TODAY="$(date +%F)"
FILE="$DIR/ensushi-$TODAY.dump"

# Written under another name first: a dump cut halfway never replaces a good one
pg_dump --format=custom --no-owner --dbname="$DATABASE_URL" --file="$FILE.tmp"
mv "$FILE.tmp" "$FILE"

if [ "$(date +%d)" = "01" ]; then
  cp "$FILE" "$DIR/mensual-$(date +%Y-%m).dump"
fi

find "$DIR" -maxdepth 1 -name 'ensushi-*.dump' -mtime +"$KEEP_DAYS" -delete
find "$DIR" -maxdepth 1 -name 'mensual-*.dump' -mtime +370 -delete

if [ -n "${BACKUP_REMOTO:-}" ]; then
  rsync -a --delete "$DIR/" "$BACKUP_REMOTO"
fi

echo "Backup listo: $FILE ($(du -h "$FILE" | cut -f1))"
