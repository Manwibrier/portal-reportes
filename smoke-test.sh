#!/usr/bin/env bash
# Smoke tests del Portal de Reportes (backend + DB de reportes).
# Uso: BASE_URL=http://127.0.0.1:3100 EMAIL=... PASSWORD=... ./smoke-test.sh
set -u

BASE_URL="${BASE_URL:-http://127.0.0.1:3100}"
EMAIL="${EMAIL:-admin@test.local}"
PASSWORD="${PASSWORD:-PortalTest2026!}"
PASS=0
FAIL=0

check() { # check <nombre> <esperado> <obtenido>
  if [ "$2" = "$3" ]; then
    PASS=$((PASS + 1)); printf '  OK   %s (%s)\n' "$1" "$3"
  else
    FAIL=$((FAIL + 1)); printf '  FAIL %s (esperado %s, obtenido %s)\n' "$1" "$2" "$3"
  fi
}

code() { curl -s -m 90 -o /tmp/smoke_body.json -w '%{http_code}' "$@"; }

# check <nombre> <esperado(s separados por |)> <obtenido>
check() {
  local expected="|$2|"
  if [[ "$expected" == *"|$3|"* ]]; then
    PASS=$((PASS + 1)); printf '  OK   %s (%s)\n' "$1" "$3"
  else
    FAIL=$((FAIL + 1)); printf '  FAIL %s (esperado %s, obtenido %s)\n' "$1" "$2" "$3"
  fi
}

echo "== Auth =="
check "health" 200 "$(code "$BASE_URL/api/health")"
check "helmet: x-content-type-options" "nosniff" \
  "$(curl -s -m 15 -D - -o /dev/null "$BASE_URL/api/health" | grep -i '^x-content-type-options:' | tr -d '\r' | awk '{print $2}')"
check "login OK" 200 "$(code -X POST "$BASE_URL/api/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")"
# 401 normal; 429 si el cupo de intentos fallidos ya se agoto en la ventana de 15 min.
check "login clave mala -> 401/429" "401|429" "$(code -X POST "$BASE_URL/api/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"mala-clave\"}")"

TOKEN=$(curl -s -m 15 -X POST "$BASE_URL/api/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
AUTH=(-H "Authorization: Bearer $TOKEN")

check "me con token" 200 "$(code "${AUTH[@]}" "$BASE_URL/api/auth/me")"
check "me sin token -> 401" 401 "$(code "$BASE_URL/api/auth/me")"
check "health/ready" 200 "$(code "${AUTH[@]}" "$BASE_URL/api/health/ready")"

echo "== Modulos (requieren DB de reportes) =="
check "clientes/dashboard" 200 "$(code "${AUTH[@]}" "$BASE_URL/api/clientes/dashboard?windowMonths=12")"
check "gerencia/dashboard" 200 "$(code "${AUTH[@]}" "$BASE_URL/api/gerencia/dashboard?windowMonths=12")"
check "operaciones/dashboard" 200 "$(code "${AUTH[@]}" "$BASE_URL/api/operaciones/dashboard?windowMonths=12")"
check "operaciones/ordenes-servicio" 200 "$(code "${AUTH[@]}" "$BASE_URL/api/operaciones/ordenes-servicio")"
check "tickets" 200 "$(code "${AUTH[@]}" "$BASE_URL/api/tickets?limit=5")"
check "tickets/operacional-resumen" 200 "$(code "${AUTH[@]}" "$BASE_URL/api/tickets/operacional-resumen")"
check "tickets/gerencial-resumen" 200 "$(code "${AUTH[@]}" "$BASE_URL/api/tickets/gerencial-resumen")"
check "users/list" 200 "$(code "${AUTH[@]}" "$BASE_URL/api/users?page=1&perPage=5")"

echo "== Validacion, rate limit y logout =="
check "query invalida -> 400" 400 "$(code "${AUTH[@]}" "$BASE_URL/api/tickets?limit=9999")"

# limit del listado de tickets (antes se ignoraba): exactamente 5 filas.
curl -s -m 90 -o /tmp/smoke_body.json "${AUTH[@]}" "$BASE_URL/api/tickets?limit=5" > /tmp/smoke_code.txt
TICKETS_N=$(python3 -c 'import json;print(len(json.load(open("/tmp/smoke_body.json"))))' 2>/dev/null || echo error)
check "tickets limit=5 -> 5 filas" 5 "$TICKETS_N"

# Fuerza bruta: un correo canario dedicado debe recibir 429 tras agotar el cupo.
# Acepta 429 en cualquier intento para ser estable si ya estaba bloqueado.
CANARY="canary-ratelimit@test.local"
GOT_429=0
for i in $(seq 1 12); do
  rc=$(code -X POST "$BASE_URL/api/auth/login" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$CANARY\",\"password\":\"intento-fallido-$i\"}")
  [ "$rc" = "429" ] && GOT_429=1 && break
done
check "rate limit login -> 429" 1 "$GOT_429"

check "logout" 204 "$(code -X POST "${AUTH[@]}" "$BASE_URL/api/auth/logout")"
check "token tras logout -> 401" 401 "$(code "${AUTH[@]}" "$BASE_URL/api/auth/me")"

echo
echo "Resultado: $PASS OK, $FAIL FAIL"
[ "$FAIL" -eq 0 ]