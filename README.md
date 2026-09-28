# Portal de Reportes

Portal full stack con frontend React/Vite y backend Node.js/Express.

## Autenticacion real del portal

El login del frontend usa PostgreSQL, esquema `portal_auth`:

- `portal_auth.users`
- `portal_auth.sessions`
- `portal_auth.session_audits`

PocketBase existe en el repositorio como componente legado, pero **no es la fuente del login actual**. Por lo tanto, una clave de superusuario de PocketBase no sirve para entrar al formulario del portal.

## Acceso local por la red 192.168.33.94

El backend escucha en `0.0.0.0:3000` y Vite en `0.0.0.0:5173`.

Desde la maquina `192.168.33.94`:

```bash
cd backend
npm ci
npm run auth:migrate
npm run auth:reset-analista
npm run dev
```

En otra terminal:

```bash
cd frontend
npm ci
npm run dev
```

Desde otro equipo de la misma red abra:

```text
http://192.168.33.94:5173
```

El proxy de Vite envia `/api` al backend local en `127.0.0.1:3000`, por lo que los clientes de la red no necesitan acceder directamente al puerto 3000.

### Credencial local despues del reset

```text
Correo: analistadedatos@norteconecta.net
Clave: 12345678
```

El script `auth:reset-analista` activa el usuario y genera el hash con el mismo formato `scrypt$...` que valida el backend.

Si el usuario no existe, puede crearlo con:

```bash
cd backend
npm run auth:create-admin -- analistadedatos@norteconecta.net 12345678 "Administrador"
```

Cambie la clave despues de recuperar el acceso.

## Docker / Portainer

El portal se publica por Nginx y la API queda en el mismo origen. Con los valores predeterminados:

```text
http://192.168.33.94:8080
```

En `compose.yaml`, el backend ejecuta la migracion de `portal_auth` al iniciar y crea el administrador inicial solo si todavia no existe. Defina en el entorno de la pila:

```text
PORTAL_ADMIN_NAME=Administrador
PORTAL_ADMIN_EMAIL=analistadedatos@norteconecta.net
PORTAL_ADMIN_PASSWORD=<clave-segura>
```

La migracion es idempotente y el bootstrap no reemplaza la clave de un administrador activo existente.

## Comandos utiles

Backend:

```bash
npm run auth:migrate
npm run auth:create-admin -- correo@dominio.com claveMin8 "Nombre"
npm run auth:reset-analista
npm start
```

Frontend:

```bash
npm run dev
npm run build
npm run preview
```

## Notas de seguridad

- No publique el archivo real `backend/.env`.
- No use `12345678` como clave definitiva en produccion.
- No elimine volumenes PostgreSQL si necesita conservar usuarios y sesiones.
- El backend debe poder conectarse al PostgreSQL configurado en `backend/.env` antes de ejecutar las migraciones o el reset.
