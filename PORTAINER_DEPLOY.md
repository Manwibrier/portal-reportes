# Despliegue del Portal de Reportes en Docker y Portainer

## Arquitectura

La pila principal contiene:

- `frontend`: React compilado y servido por Nginx.
- `backend`: Node.js/Express, interno en el puerto 3000.
- `postgres`: datos del portal y autenticacion `portal_auth`.
- `pocketbase`: componente legado conservado por compatibilidad; no es la fuente del login actual.

El puerto publico del portal es `8080` por defecto. Nginx sirve el frontend y reenvia `/api/*` al backend.

## Variables minimas

Defina al menos:

```text
POSTGRES_PASSWORD=<clave-postgres>
PB_SUPERUSER_EMAIL=<correo-pocketbase>
PB_SUPERUSER_PASSWORD=<clave-pocketbase>
PORTAL_ADMIN_NAME=Administrador
PORTAL_ADMIN_EMAIL=analistadedatos@norteconecta.net
PORTAL_ADMIN_PASSWORD=<clave-portal>
PORTAL_BIND=0.0.0.0
PORTAL_HTTP_PORT=8080
```

`PORTAL_ADMIN_EMAIL` y `PORTAL_ADMIN_PASSWORD` corresponden al usuario inicial del **portal**. Las credenciales `PB_*` son diferentes y no sirven en el formulario de login del portal.

## Despliegue

```bash
docker compose config
docker compose build --pull
docker compose up -d
./scripts/verify-deployment.sh
```

El backend espera a PostgreSQL, ejecuta la migracion `portal_auth` y crea el administrador inicial si no existe un usuario activo con ese correo.

## Acceso en 192.168.30.51

Con `PORTAL_BIND=0.0.0.0` o `PORTAL_BIND=192.168.30.51` y `PORTAL_HTTP_PORT=8080`:

```text
http://192.168.30.51:8080
```

Health:

```text
http://192.168.30.51:8080/api/health
```

## Recuperar la clave del usuario analista

Si usa el backend contra una base PostgreSQL existente:

```bash
cd backend
npm run auth:migrate
npm run auth:reset-analista
```

Por defecto, ese reset deja:

```text
Correo: analistadedatos@norteconecta.net
Clave: 12345678
```

Para establecer otra clave sin editar el script:

```bash
PORTAL_LOGIN_EMAIL=analistadedatos@norteconecta.net \
PORTAL_LOGIN_PASSWORD='NuevaClaveSegura' \
npm run auth:reset-analista
```

## Actualizacion

```bash
git pull --ff-only
docker compose build --pull
docker compose up -d --remove-orphans
```

No use `docker compose down -v` si necesita conservar los datos.
