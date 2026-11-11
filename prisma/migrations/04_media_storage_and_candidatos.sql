-- ==============================================================================
-- MIGRACIÓN 04: SISTEMA CENTRALIZADO DE MEDIOS (SUPABASE STORAGE) Y CANDIDATOS
-- Preserva íntegramente todas las invariantes (I1, I2 urna, I3 elector, I17 DNI)
-- ==============================================================================

-- 1. Tabla centralizada de referencias de archivos multimedia en Supabase Storage
CREATE TABLE IF NOT EXISTS archivo_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_original VARCHAR(255) NOT NULL,
    nombre_interno VARCHAR(255) NOT NULL UNIQUE,
    bucket VARCHAR(100) NOT NULL,
    ruta_archivo VARCHAR(500) NOT NULL,
    url_publica TEXT,
    es_privado BOOLEAN NOT NULL DEFAULT FALSE,
    mime_type VARCHAR(100) NOT NULL,
    tamano_bytes INT NOT NULL,
    checksum_sha256 VARCHAR(64),
    categoria VARCHAR(50) NOT NULL,
    entidad_tipo VARCHAR(50),
    entidad_id VARCHAR(64),
    eleccion_id UUID REFERENCES eleccion(id) ON DELETE SET NULL,
    subido_por VARCHAR(64) NOT NULL DEFAULT 'admin',
    alt_text VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_archivo_media_bucket_ruta UNIQUE (bucket, ruta_archivo)
);

CREATE INDEX IF NOT EXISTS idx_archivo_media_categoria ON archivo_media(categoria);
CREATE INDEX IF NOT EXISTS idx_archivo_media_eleccion ON archivo_media(eleccion_id);
CREATE INDEX IF NOT EXISTS idx_archivo_media_entidad ON archivo_media(entidad_tipo, entidad_id);

-- 2. Vincular imágenes en entidades existentes sin romper compatibilidad
ALTER TABLE eleccion
    ADD COLUMN IF NOT EXISTS banner_url TEXT,
    ADD COLUMN IF NOT EXISTS banner_media_id UUID REFERENCES archivo_media(id) ON DELETE SET NULL;

ALTER TABLE partido
    ADD COLUMN IF NOT EXISTS logo_media_id UUID REFERENCES archivo_media(id) ON DELETE SET NULL;

ALTER TABLE docente
    ADD COLUMN IF NOT EXISTS avatar_media_id UUID REFERENCES archivo_media(id) ON DELETE SET NULL;

-- 3. Tabla de candidatos asociados a cada lista/partido
CREATE TABLE IF NOT EXISTS candidato (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    eleccion_id UUID NOT NULL REFERENCES eleccion(id) ON DELETE CASCADE,
    partido_id UUID NOT NULL REFERENCES partido(id) ON DELETE CASCADE,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    cargo VARCHAR(100) NOT NULL,
    orden INT NOT NULL DEFAULT 1,
    foto_url TEXT,
    foto_media_id UUID REFERENCES archivo_media(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_candidato_partido ON candidato(partido_id, orden);
CREATE INDEX IF NOT EXISTS idx_candidato_eleccion ON candidato(eleccion_id);

-- 4. Configuración visual institucional (escudo/logo y banner oficial)
CREATE TABLE IF NOT EXISTS configuracion_institucional (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clave VARCHAR(50) NOT NULL UNIQUE DEFAULT 'global',
    nombre_institucion VARCHAR(150) NOT NULL DEFAULT 'Municipio Estudiantil',
    subtitulo VARCHAR(200) NOT NULL DEFAULT 'Sistema Electoral Escolar',
    titulo_portada VARCHAR(200) NOT NULL DEFAULT 'Elecciones de Municipio Escolar 2026',
    logo_url TEXT,
    logo_media_id UUID REFERENCES archivo_media(id) ON DELETE SET NULL,
    banner_url TEXT,
    banner_media_id UUID REFERENCES archivo_media(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO configuracion_institucional (clave, nombre_institucion, subtitulo, titulo_portada)
VALUES ('global', 'Municipio Estudiantil', 'Sistema Electoral Escolar', 'Elecciones de Municipio Escolar 2026')
ON CONFLICT (clave) DO NOTHING;

-- Permisos para roles operativos si existen (compatibilidad con migración 02)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON archivo_media, candidato, configuracion_institucional TO app_user;
    END IF;
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'escrutinio_user') THEN
        GRANT SELECT ON candidato, archivo_media, configuracion_institucional TO escrutinio_user;
    END IF;
END
$$;
