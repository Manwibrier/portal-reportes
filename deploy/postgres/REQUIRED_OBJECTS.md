# PostgreSQL corporativo: objetos de solo lectura

La base PostgreSQL es una fuente externa de reportes. Portal Reportes no crea tablas, no ejecuta migraciones y no escribe datos en esta base.

El usuario runtime necesita solamente `SELECT` sobre:

- `powerbi.cargos_mensualidad_ingreso_mes`
- `powerbi.cliente`
- `powerbi.indicadores_operacionales_mes`
- `powerbi.ingreso_consolidado`
- `powerbi.resumen_ordenes_servicio`
- `powerbi.tickets`

## Regla operativa

No otorgar a la cuenta usada por Portal Reportes permisos `INSERT`, `UPDATE`, `DELETE`, `CREATE`, `ALTER` o `DROP` sobre la base corporativa.

El backend agrega una segunda barrera: abre sus sesiones PostgreSQL con `default_transaction_read_only=on` y bloquea sentencias de escritura desde su wrapper SQL.

La autenticacion, sesiones y auditoria del portal viven exclusivamente en PocketBase.
