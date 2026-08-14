#!/bin/sh
set -eu

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="${BACKUP_DIR:-./backups/${STAMP}}"
mkdir -p "$BACKUP_DIR"

BACKEND_CONTAINER="$(docker compose ps -q backend)"
if [ -z "$BACKEND_CONTAINER" ]; then
  echo "No se encontro el contenedor backend." >&2
  exit 1
fi

echo "Creando respaldo de la autenticacion local..."
docker cp "$BACKEND_CONTAINER:/app/data/auth.sqlite" "$BACKUP_DIR/auth.sqlite"

# Include WAL/SHM files when present to preserve a consistent recent SQLite state.
docker cp "$BACKEND_CONTAINER:/app/data/auth.sqlite-wal" "$BACKUP_DIR/auth.sqlite-wal" 2>/dev/null || true
docker cp "$BACKEND_CONTAINER:/app/data/auth.sqlite-shm" "$BACKUP_DIR/auth.sqlite-shm" 2>/dev/null || true

echo "Respaldo guardado en: $BACKUP_DIR"
echo "PostgreSQL corporativo no se respalda desde este stack: es una fuente externa de solo lectura."
