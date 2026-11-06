-- ============================================================
-- MIGRACIÓN 03: Asegurar columna token_voto en tabla habilitacion
-- ============================================================

ALTER TABLE habilitacion ADD COLUMN IF NOT EXISTS token_voto VARCHAR(128);

