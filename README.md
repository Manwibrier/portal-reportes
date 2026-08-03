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
