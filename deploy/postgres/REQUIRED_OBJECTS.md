# Objetos PostgreSQL requeridos por el backend

El backend consulta los siguientes objetos del esquema `powerbi`:

- `powerbi.cargos_mensualidad_ingreso_mes`
- `powerbi.cliente`
- `powerbi.indicadores_operacionales_mes`
- `powerbi.ingreso_consolidado`
- `powerbi.resumen_ordenes_servicio`
- `powerbi.tickets`

La pila puede iniciar con una base vacía, pero los módulos de reportes devolverán errores hasta restaurar estos objetos y sus datos.
