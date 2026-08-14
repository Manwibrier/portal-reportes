#!/bin/sh
set -eu

PORT="${PORTAL_HTTP_PORT:-8080}"
HOST="${PORTAL_VERIFY_HOST:-127.0.0.1}"
BASE_URL="http://${HOST}:${PORT}"

echo "== Estado de contenedores =="
docker compose ps

echo
echo "== Liveness =="
curl -fsS "${BASE_URL}/api/health"
echo

echo
echo "== Readiness: PostgreSQL read-only + PocketBase =="
curl -fsS "${BASE_URL}/api/health/ready"
echo

echo
echo "== Pagina principal =="
curl -fsSI "${BASE_URL}/" | sed -n '1,8p'

echo
echo "Verificacion completada: ${BASE_URL}"
