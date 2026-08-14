# Despliegue corporativo en Portainer

## 1. Arquitectura definitiva

El stack contiene tres servicios:

- `frontend`: Nginx + React.
- `backend`: API Node/Express.
- `pocketbase`: autenticacion, sesiones y auditoria del portal.

PostgreSQL NO forma parte del stack. Es una base corporativa externa usada exclusivamente como fuente de reportes.

```text
Portainer / Docker
  |-- frontend
  |-- backend ---- SELECT ----> PostgreSQL corporativo
  |       |
  |       `---- auth/audit ---> pocketbase
  `-- pocketbase ---- volume ---> pocketbase_data
```

## 2. Regla critica para PostgreSQL

No ejecutar migraciones del portal contra la base corporativa.
No crear esquemas o tablas de autenticacion en ella.
No usar esa base para sesiones ni auditoria.

La cuenta PostgreSQL del portal debe tener solamente los permisos de lectura requeridos. Los objetos esperados estan en `deploy/postgres/REQUIRED_OBJECTS.md`.

El backend ademas fuerza cada conexion PostgreSQL con `default_transaction_read_only=on` y su wrapper SQL rechaza sentencias de escritura.

## 3. Variables de Portainer

Use `.env.portainer.example` solo como lista de claves. No copie valores reales al repositorio.

Grupos principales:

```text
Portal:
  PORTAL_BIND
  PORTAL_HTTP_PORT
  FRONTEND_ORIGIN

PostgreSQL corporativo read-only:
  DB_HOST
  DB_PORT
  DB_NAME
  DB_USER
  DB_PASSWORD
  DB_SSL

PocketBase:
  PB_SUPERUSER_EMAIL
  PB_SUPERUSER_PASSWORD
  PB_ENCRYPTION_KEY

SmartOLT:
  SMARTOLT_BASE_URL
  SMARTOLT_API_TOKEN
```

`DB_READ_ONLY` se fija a `true` dentro de `compose.yaml` y no debe desactivarse en produccion.

## 4. Crear el Stack desde GitHub

En Portainer:

1. Abra **Stacks** -> **Add stack**.
2. Seleccione **Git Repository**.
3. Indique el repositorio y la rama estable.
4. Use `compose.yaml` como Compose path.
5. Cargue las variables reales en Portainer.
6. Despliegue el stack.

El frontend publica el puerto HTTP del portal. Backend queda interno en `backend:3000`. PocketBase se enlaza al host por `127.0.0.1:8090` por defecto.

## 5. PocketBase y persistencia

El volumen Docker `pocketbase_data` contiene los datos propios del portal. Las migraciones incluidas crean:

- coleccion auth `users`;
- coleccion `sessions` para tokens opacos revocables;
- coleccion `session_audits` para trazabilidad.

Una actualizacion normal del stack no debe eliminar este volumen.

## 6. Primer administrador

Despues del primer despliegue cree el administrador desde una terminal segura del servidor. La clave se captura sin eco y no se escribe literalmente en el historial del shell:

```bash
BACKEND_ID="$(docker ps \
  --filter label=com.docker.compose.project=portal-reportes \
  --filter label=com.docker.compose.service=backend \
  -q)"

read -r -p "Nombre del administrador: " BOOTSTRAP_ADMIN_NAME
read -r -p "Correo del administrador: " BOOTSTRAP_ADMIN_EMAIL
printf "Clave del administrador: "
stty -echo
read -r BOOTSTRAP_ADMIN_PASSWORD
stty echo
printf '\n'

docker exec \
  -e BOOTSTRAP_ADMIN_NAME="$BOOTSTRAP_ADMIN_NAME" \
  -e BOOTSTRAP_ADMIN_EMAIL="$BOOTSTRAP_ADMIN_EMAIL" \
  -e BOOTSTRAP_ADMIN_PASSWORD="$BOOTSTRAP_ADMIN_PASSWORD" \
  "$BACKEND_ID" npm run bootstrap-admin

unset BOOTSTRAP_ADMIN_NAME BOOTSTRAP_ADMIN_EMAIL BOOTSTRAP_ADMIN_PASSWORD
```

El bootstrap se niega a crear otro administrador si ya existe uno.

## 7. Verificacion inicial

Desde el servidor:

```bash
curl -fsS http://127.0.0.1:8080/api/health
curl -fsS http://127.0.0.1:8080/api/health/ready
```

`/api/health/ready` valida dos dependencias:

1. PostgreSQL responde, la sesion esta realmente en read-only, existen los objetos de reportes y la cuenta tiene `SELECT`.
2. PocketBase responde y las colecciones `users`, `sessions` y `session_audits` son accesibles por el backend.

Despues pruebe:

- login/logout;
- administracion de usuarios;
- Gerencia;
- Clientes;
- Tickets;
- Operaciones y SmartOLT.

## 8. Backups

El stack NO hace `pg_dump` de la base corporativa. Su backup corresponde al equipo o proceso que administra PostgreSQL.

Portal Reportes debe respaldar su propio volumen PocketBase:

```bash
./scripts/backup.sh
```

Conserve copias fuera del mismo disco fisico del servidor Docker.

## 9. Actualizaciones

Flujo recomendado:

```text
desarrollo -> Pull Request -> main -> Portainer Pull and redeploy
```

El codigo se actualiza desde GitHub. Las credenciales permanecen en Portainer y los datos de usuarios permanecen en `pocketbase_data`.

## 10. Seguridad de red

- No publicar PostgreSQL hacia Internet.
- Permitir desde el servidor Docker solamente la conectividad necesaria hacia PostgreSQL por LAN.
- Mantener PocketBase en `127.0.0.1` salvo que exista una razon operativa para exponerlo.
- No publicar el puerto 3000 del backend.
- Usar HTTPS en el proxy corporativo antes de exponer el portal a usuarios finales.
