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