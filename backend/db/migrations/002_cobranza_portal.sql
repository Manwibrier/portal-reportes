-- 002_cobranza_portal.sql
-- Ejecutar SOLO en la base de datos del portal.
-- NO ejecutar en Totalnet.
-- Totalnet debe quedar como fuente de consulta solo lectura.

CREATE SCHEMA IF NOT EXISTS cobranza;

CREATE TABLE IF NOT EXISTS cobranza.resumen_diario (
  id bigserial PRIMARY KEY,
  fecha_snapshot date NOT NULL DEFAULT CURRENT_DATE,
  periodo date NOT NULL,
  nivel varchar(30) NOT NULL,
  zona text NOT NULL DEFAULT '',
  franquicia text NOT NULL DEFAULT '',
  servicio text NOT NULL DEFAULT '',
  total_cargos integer NOT NULL DEFAULT 0,
  monto_cargos_usd numeric(18,2) NOT NULL DEFAULT 0,
  total_x_cobrar integer NOT NULL DEFAULT 0,
  monto_x_cobrar_usd numeric(18,2) NOT NULL DEFAULT 0,
  total_cobrado integer NOT NULL DEFAULT 0,
  monto_cobrado_usd numeric(18,2) NOT NULL DEFAULT 0,
  pct_x_cobrar numeric(8,2) NOT NULL DEFAULT 0,
  pct_cobrado numeric(8,2) NOT NULL DEFAULT 0,
  cargos_posteriores integer NOT NULL DEFAULT 0,
  monto_posterior_usd numeric(18,2) NOT NULL DEFAULT 0,
  cargos_recuperados integer NOT NULL DEFAULT 0,
  monto_recuperado_usd numeric(18,2) NOT NULL DEFAULT 0,
  source_hash text,
  snapshot_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT resumen_diario_unique UNIQUE (
    fecha_snapshot,
    periodo,
    nivel,
    zona,
    franquicia,
    servicio
  )
);

CREATE TABLE IF NOT EXISTS cobranza.detalle_snapshot (
  id bigserial PRIMARY KEY,
  fecha_snapshot date NOT NULL DEFAULT CURRENT_DATE,
  periodo date NOT NULL,
  id_cargo_cliente bigint,
  id_cliente bigint,
  rif text,
  razon_social text,
  id_contrato bigint,
  id_contrato_detalle bigint,
  numero_contrato text,
  fecha_cargo timestamptz,
  fecha_corte date,
  fecha_pago timestamptz,
  fecha_descuento timestamptz,
  tipo_cargo varchar(30),
  estado_pago varchar(30),
  servicio text,
  estatus_cliente text,
  id_franquicia bigint,
  nombre_franquicia text,
  zona text,
  cantidad_zonas integer,
  id_moneda_cargo integer,
  tasa_cargo numeric(18,4),
  monto_cargo_bs numeric(18,2),
  monto_cargo_usd numeric(18,2),
  monto_pago_bs numeric(18,2),
  monto_pago_usd numeric(18,2),
  monto_descuento_bs numeric(18,2),
  monto_descuento_usd numeric(18,2),
  saldo_pendiente_usd numeric(18,2),
  monto_recuperado_usd numeric(18,2),
  cantidad_facturas integer,
  renglones_sin_tasa integer,
  snapshot_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT detalle_snapshot_unique UNIQUE (
    fecha_snapshot,
    periodo,
    id_cargo_cliente
  )
);

CREATE TABLE IF NOT EXISTS cobranza.control_carga (
  id bigserial PRIMARY KEY,
  periodo date NOT NULL,
  fecha_snapshot date NOT NULL DEFAULT CURRENT_DATE,
  registros integer NOT NULL DEFAULT 0,
  total_cargos integer NOT NULL DEFAULT 0,
  total_cobrado integer NOT NULL DEFAULT 0,
  total_x_cobrar integer NOT NULL DEFAULT 0,
  source_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cobranza.resumen_diario
  ADD COLUMN IF NOT EXISTS monto_posterior_usd numeric(18,2) NOT NULL DEFAULT 0;

ALTER TABLE cobranza.resumen_diario
  ADD COLUMN IF NOT EXISTS cargos_recuperados integer NOT NULL DEFAULT 0;

ALTER TABLE cobranza.resumen_diario
  ADD COLUMN IF NOT EXISTS monto_recuperado_usd numeric(18,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_cobranza_resumen_periodo
  ON cobranza.resumen_diario (periodo, fecha_snapshot);

CREATE INDEX IF NOT EXISTS idx_cobranza_resumen_nivel
  ON cobranza.resumen_diario (nivel, periodo, fecha_snapshot);

CREATE INDEX IF NOT EXISTS idx_cobranza_detalle_periodo
  ON cobranza.detalle_snapshot (periodo, fecha_snapshot);

CREATE INDEX IF NOT EXISTS idx_cobranza_detalle_cliente
  ON cobranza.detalle_snapshot (id_cliente, periodo);

CREATE INDEX IF NOT EXISTS idx_cobranza_detalle_franquicia
  ON cobranza.detalle_snapshot (nombre_franquicia, periodo);

CREATE INDEX IF NOT EXISTS idx_cobranza_detalle_estado
  ON cobranza.detalle_snapshot (estado_pago, tipo_cargo, periodo);
