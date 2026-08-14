# Despliegue en Portainer

## 1. Stack desde Git

Crear un nuevo Stack usando **Repository** y configurar:

- Repository reference: `refs/heads/main`
- Compose path: `compose.yaml`

## 2. Variables de entorno

Configurar en Portainer, sin guardarlas en GitHub:

```env
PORTAL_BIND=0.0.0.0
PORTAL_HTTP_PORT=8080
FRONTEND_ORIGIN=http://__PORTAL_HOST__:8080

DB_HOST=__POSTGRES_HOST__
DB_PORT=5432
DB_NAME=__POSTGRES_DATABASE__
DB_USER=__POSTGRES_READONLY_USER__
DB_PASSWORD=__POSTGRES_PASSWORD__
DB_SSL=true

SMARTOLT_BASE_URL=https://__SMARTOLT_HOST__/
SMARTOLT_API_TOKEN=__SMARTOLT_API_TOKEN__
```

No existen variables de PocketBase.

## 3. Persistencia local

El volumen `auth_data` contiene la base SQLite de usuarios, sesiones y auditoria.
No eliminar el volumen al recrear o actualizar el stack.

No usar `docker compose down -v` salvo que se quiera eliminar deliberadamente la autenticacion local.

## 4. Primer administrador

Una vez iniciado el backend, crear el primer administrador mediante el comando de bootstrap dentro del contenedor. Las variables de bootstrap son de un solo uso y no deben guardarse en GitHub.

```sh
BOOTSTRAP_ADMIN_NAME='Administrador' \
BOOTSTRAP_ADMIN_EMAIL='admin@example.invalid' \
BOOTSTRAP_ADMIN_PASSWORD='CAMBIAR_TEMPORALMENTE' \
npm run bootstrap-admin
```

Sustituir los valores localmente antes de ejecutar y no copiar credenciales reales a documentacion o repositorios.

## 5. Healthchecks

- `/api/health`: liveness del backend y almacenamiento local de autenticacion. Es el healthcheck usado por Docker.
- `/api/health/ready`: comprueba ademas PostgreSQL de reportes y permisos `SELECT`.

Un bloqueo de `pg_hba.conf` puede hacer que `/api/health/ready` devuelva 503, pero ya no impide que Docker levante frontend/backend.

## 6. PostgreSQL corporativo

La aplicacion fuerza sesiones de PostgreSQL en modo solo lectura. El servidor PostgreSQL igualmente debe autorizar la IP del host Docker en `pg_hba.conf` y el usuario debe tener `SELECT` sobre los objetos de reportes necesarios.
