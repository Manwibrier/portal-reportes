# Despliegue del Portal de Reportes en Docker y Portainer

## 1. Arquitectura incluida

La pila contiene:

- `frontend`: React compilado y servido por Nginx.
- `backend`: Node.js/Express, accesible internamente en el puerto 3000.
- `postgres`: PostgreSQL 17 con volumen persistente.
- `pocketbase`: autenticación y auditoría con volumen persistente.

El único puerto público obligatorio es `8083` (configurable). Nginx sirve el portal y reenvía `/api/*` al backend.

## 2. Información que debe conservarse del servidor anterior

El ZIP original no contiene el esquema ni los datos de PostgreSQL y tampoco contiene `pb_data` de PocketBase.

Antes de migrar un sistema existente, obtenga:

1. Un respaldo de PostgreSQL que incluya el esquema `powerbi`.
2. Una copia consistente del directorio `pb_data` de PocketBase o un backup generado desde su panel.
3. El token real de SmartOLT.

Sin esos respaldos la pila inicia, pero no mostrará los reportes históricos ni los usuarios anteriores.

## 3. Despliegue recomendado desde Git en Portainer

1. Suba esta carpeta corregida a un repositorio Git privado.
2. En Portainer abra **Stacks > Add stack > Git Repository**.
3. Configure el repositorio y la rama.
4. En **Compose path** coloque `compose.yaml`.
5. Cargue las variables de `.env.portainer.example` mediante **Load variables from .env file** o agréguelas una por una.
6. Cambie todas las claves y correos marcados con `CAMBIAR_...`.
7. Pulse **Deploy the stack**.

Portainer clona el repositorio completo cuando la pila se despliega desde Git, por lo que los contextos `./frontend`, `./backend` y `./deploy/pocketbase` estarán disponibles para construir las imágenes.

## 4. Despliegue desde una carpeta del servidor

```bash
sudo mkdir -p /opt/portal-reportes
sudo chown -R "$USER":"$USER" /opt/portal-reportes
cd /opt/portal-reportes
# Copiar o descomprimir aquí el proyecto.
cp .env.portainer.example .env
nano .env
docker compose config
docker compose build --pull
docker compose up -d
./scripts/verify-deployment.sh
```

Después puede administrar los contenedores desde Portainer porque forman una pila estándar de Docker Compose.

## 5. Acceso

- Portal: `http://IP_DEL_SERVIDOR:8083`
- Health: `http://IP_DEL_SERVIDOR:8083/api/health`
- PocketBase local: `http://127.0.0.1:8090/_/`

Para abrir PocketBase desde otro equipo sin publicarlo:

```bash
ssh -L 8090:127.0.0.1:8090 usuario@IP_DEL_SERVIDOR
```

Luego abra `http://127.0.0.1:8090/_/` en el navegador local.

## 6. Restaurar PostgreSQL

### Respaldo SQL plano antes del primer arranque

Coloque el archivo `.sql` o `.sql.gz` dentro de `deploy/postgres/init/`. El contenedor lo ejecutará únicamente al crear un volumen vacío.

### Respaldo personalizado `.dump`

Copie el archivo al servidor y ejecute:

```bash
docker compose cp respaldo.dump postgres:/tmp/respaldo.dump
docker compose exec postgres pg_restore \
  -U portal_reportes \
  -d portal_reportes \
  --clean --if-exists --no-owner \
  /tmp/respaldo.dump
```

Ajuste usuario y base según las variables configuradas.

Objetos mínimos requeridos: consulte `deploy/postgres/REQUIRED_OBJECTS.md`.

## 7. Restaurar PocketBase

Detenga PocketBase antes de reemplazar sus datos:

```bash
docker compose stop pocketbase
```

Restaure el contenido de `pb_data` dentro del volumen `portal-reportes_pocketbase_data` usando Portainer o un contenedor temporal. Después:

```bash
docker compose start pocketbase
docker compose restart backend
```

Si no se restaura una base anterior, la migración incluida crea automáticamente:

- colección de autenticación `users`;
- colección `session_audits`;
- usuario administrador inicial definido por `PORTAL_ADMIN_EMAIL`.

## 8. Verificaciones posteriores

```bash
docker compose ps
docker compose logs --tail=100 backend
docker compose logs --tail=100 pocketbase
curl -fsS http://127.0.0.1:8083/api/health
```

Pruebe después:

1. Inicio de sesión con el administrador inicial.
2. Creación y edición de usuarios.
3. Módulos Clientes, Gerencia, Operaciones y Tickets.
4. Consulta SmartOLT.
5. Persistencia después de reiniciar la pila.

## 9. Actualización

Desde Git/Portainer, use **Pull and redeploy**. Desde terminal:

```bash
git pull --ff-only
docker compose build --pull
docker compose up -d --remove-orphans
```

Los volúmenes `postgres_data` y `pocketbase_data` no se eliminan con una actualización normal.

No utilice `docker compose down -v` en producción: la opción `-v` elimina los volúmenes y sus datos.

## 10. Respaldos

```bash
./scripts/backup.sh
```

El script genera un `postgres.dump` y un archivo comprimido de `pb_data` dentro de `backups/`.

## 11. Variante con PostgreSQL y PocketBase existentes

Cuando PostgreSQL y PocketBase ya están operativos y no desea migrarlos a contenedores, use:

- Compose path: `compose.external-services.yaml`
- Variables: `.env.external-services.example`

En Linux, `localhost` dentro del backend apunta al propio contenedor. Use la IP/DNS real del servicio o `host.docker.internal` si PostgreSQL/PocketBase corren directamente en el mismo servidor Docker.
