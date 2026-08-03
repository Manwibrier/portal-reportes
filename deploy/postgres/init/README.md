# Inicialización de PostgreSQL

Este directorio se monta en `/docker-entrypoint-initdb.d`.

Los archivos `.sql`, `.sql.gz` y scripts compatibles se ejecutan **solo cuando el volumen de PostgreSQL está vacío**.

El código fuente recibido no contiene las tablas ni vistas de reportes. Antes del primer despliegue puede colocar aquí un respaldo SQL, por ejemplo:

- `01-estructura.sql`
- `02-datos.sql.gz`

Si el respaldo está en formato personalizado de `pg_dump` (`.dump` o `.backup`), despliegue primero la pila y luego utilice `pg_restore` siguiendo `PORTAINER_DEPLOY.md`.
