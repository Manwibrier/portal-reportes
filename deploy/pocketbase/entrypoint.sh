#!/bin/sh
set -eu

mkdir -p /pb/pb_data /pb/pb_migrations
chown -R pocketbase:pocketbase /pb/pb_data

if [ -n "${PB_SUPERUSER_EMAIL:-}" ] && [ -n "${PB_SUPERUSER_PASSWORD:-}" ]; then
  if ! su-exec pocketbase /pb/pocketbase superuser upsert \
    "${PB_SUPERUSER_EMAIL}" "${PB_SUPERUSER_PASSWORD}" --dir=/pb/pb_data >/dev/null 2>&1; then
    su-exec pocketbase /pb/pocketbase superuser create \
      "${PB_SUPERUSER_EMAIL}" "${PB_SUPERUSER_PASSWORD}" --dir=/pb/pb_data >/dev/null 2>&1 || true
  fi
fi

set -- serve \
  --http=0.0.0.0:8090 \
  --dir=/pb/pb_data \
  --migrationsDir=/pb/pb_migrations

if [ -n "${PB_ENCRYPTION_KEY:-}" ]; then
  set -- "$@" --encryptionEnv=PB_ENCRYPTION_KEY
fi

exec su-exec pocketbase /pb/pocketbase "$@"
