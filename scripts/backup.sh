#!/bin/sh
set -eu

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="${BACKUP_DIR:-./backups/${STAMP}}"
mkdir -p "$BACKUP_DIR"

echo "Creando respaldo de PocketBase..."
docker compose exec -T pocketbase tar -czf - -C /pb pb_data \
  > "$BACKUP_DIR/pocketbase-pb_data.tar.gz"

echo "Respaldo guardado en: $BACKUP_DIR/pocketbase-pb_data.tar.gz"
echo "PostgreSQL corporativo no se respalda desde este stack: es una fuente externa de solo lectura."
