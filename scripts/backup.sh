#!/bin/sh
set -eu

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="${BACKUP_DIR:-./backups/${STAMP}}"
mkdir -p "$BACKUP_DIR"

POSTGRES_DB="${POSTGRES_DB:-portal_reportes}"
POSTGRES_USER="${POSTGRES_USER:-portal_reportes}"

echo "Creando respaldo PostgreSQL..."
docker compose exec -T postgres pg_dump \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  -Fc > "$BACKUP_DIR/postgres.dump"

echo "Creando respaldo PocketBase..."
docker compose exec -T pocketbase tar -czf - -C /pb pb_data \
  > "$BACKUP_DIR/pocketbase-pb_data.tar.gz"

echo "Respaldos guardados en: $BACKUP_DIR"
