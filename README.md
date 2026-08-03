<<<<<<< HEAD
# Portal de Reportes

Portal full stack preparado para ejecución local y despliegue Docker/Portainer.

## Componentes

- Frontend: React 19 + Vite, servido por Nginx.
- Backend: Node.js 24 + Express.
- Base de datos analítica: PostgreSQL 17.
- Autenticación y auditoría: PocketBase 0.39.10.
- Integración externa: SmartOLT.

## Despliegue Docker

1. Copie las variables:

```bash
cp .env.portainer.example .env
```

2. Complete las credenciales y el token SmartOLT.
3. Valide y despliegue:

```bash
docker compose config
docker compose build
docker compose up -d
./scripts/verify-deployment.sh
```

Portal predeterminado: `http://IP_DEL_SERVIDOR:8080`.

La guía completa para Portainer, restauración de PostgreSQL, migración de PocketBase, verificación, actualización y respaldos está en [PORTAINER_DEPLOY.md](PORTAINER_DEPLOY.md).

## Datos requeridos

El repositorio no incluye los datos productivos. Para conservar reportes y usuarios debe restaurar:

- un respaldo de PostgreSQL con el esquema `powerbi`;
- el volumen/directorio `pb_data` de PocketBase.

Los objetos PostgreSQL requeridos están documentados en `deploy/postgres/REQUIRED_OBJECTS.md`.

## Seguridad

- Backend, PostgreSQL y PocketBase comparten una red Docker interna.
- Solo Nginx publica el portal.
- PocketBase se enlaza a `127.0.0.1` por defecto.
- Las credenciales se suministran como variables de la pila y no se guardan en Git.
- Los logs de Docker tienen rotación configurada.

## Servicios existentes

Para contenerizar solamente frontend y backend conservando PostgreSQL y PocketBase actuales, use `compose.external-services.yaml` y `.env.external-services.example`.
=======
# Portal Reportes

Portal fullstack compuesto por:

- Frontend: React y Vite.
- Backend: Node.js y Express.
- Base de datos: PostgreSQL.
- Autenticación: PocketBase.
- Integración: SmartOLT.
- Procesos Ubuntu: PM2.

## Flujo de trabajo

- `main`: versión estable.
- `develop`: versión desplegada en el servidor de pruebas.
- Los cambios se realizan desde un entorno remoto conectado a GitHub.
- El servidor de pruebas obtiene el código desde GitHub.
- No se almacenan credenciales dentro del repositorio.

## Requisitos del servidor

- Ubuntu.
- Node.js 24.x.
- npm 11.x.
- PM2.
- PocketBase.
- Acceso a PostgreSQL y SmartOLT.

## Instalación inicial en Ubuntu

1. Clonar la rama de pruebas:

   git clone --branch develop URL_PRIVADA_DEL_REPOSITORIO portal-reportes
   cd portal-reportes

2. Crear la configuración del backend:

   cp backend/.env.example backend/.env

3. El administrador debe completar backend/.env con los accesos del servidor.

4. Instalar el backend:

   cd backend
   npm ci --omit=dev
   cd ..

5. Compilar el frontend:

   cd frontend
   npm ci
   npm run build
   cd ..

6. Levantar el backend:

   pm2 start ecosystem.config.cjs
   pm2 save

7. Verificar:

   curl http://127.0.0.1:3000/api/health

El frontend compilado queda disponible en frontend/dist.

## Actualización del servidor de pruebas

   git pull --ff-only origin develop
   cd backend
   npm ci --omit=dev
   cd ../frontend
   npm ci
   npm run build
   cd ..
   pm2 startOrReload ecosystem.config.cjs --update-env

## Seguridad

Los siguientes elementos están excluidos de Git:

- backend/.env
- node_modules
- frontend/dist
- releases y archivos ZIP
- datos de PocketBase
>>>>>>> 48ea142d92028658351fdc47bf19b51e4e43e2e7
