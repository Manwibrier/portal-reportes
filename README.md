# Portal de Reportes

Portal full stack preparado para Docker y Portainer.

## Arquitectura

- Frontend: React + Vite, servido por Nginx.
- Backend: Node.js + Express.
- PostgreSQL corporativo externo: fuente de datos de reportes, solo lectura.
- PocketBase interno: usuarios, sesiones y auditoria del portal.
- SmartOLT: integracion externa del modulo de operaciones.

```text
Usuario
  |
  v
Nginx / Frontend
  |
  v
Backend
  |-- SELECT --> PostgreSQL corporativo (powerbi)
  |-- auth ----> PocketBase (volumen persistente)
  `-- API -----> SmartOLT
```

## Regla de datos

Portal Reportes no debe crear tablas, ejecutar migraciones ni escribir datos propios en PostgreSQL corporativo. La conexion del backend se fuerza a modo read-only.

Los datos propios del portal se guardan en PocketBase:

- `users`
- `sessions`
- `session_audits`

## Despliegue rapido

1. Use `.env.portainer.example` como referencia de variables.
2. Cargue los valores reales solamente en Portainer.
3. Valide y despliegue:

```bash
docker compose config
docker compose build
docker compose up -d
./scripts/verify-deployment.sh
```

El portal publica HTTP en el puerto definido por `PORTAL_HTTP_PORT`.

## Seguridad

- No guardar `.env`, passwords, tokens ni dumps en Git.
- PostgreSQL debe usar una cuenta con permisos de lectura sobre los objetos `powerbi` necesarios.
- El backend fuerza `default_transaction_read_only=on` para PostgreSQL.
- PocketBase se publica en `127.0.0.1` por defecto, no en toda la LAN.
- El backend no publica directamente su puerto 3000.
- El volumen `pocketbase_data` debe incluirse en la estrategia de backup.

Consulte `PORTAINER_DEPLOY.md` para el procedimiento completo.
