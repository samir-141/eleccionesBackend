-- ============================================================
-- MIGRACIÓN 01: ESQUEMA INICIAL DE BASE DE DATOS
-- Sistema Electoral de Municipalidad Escolar con Anonimato Estricto
-- ============================================================

-- ENUMS
CREATE TYPE eleccion_estado AS ENUM ('BORRADOR', 'ABIERTA', 'CERRADA', 'ESCRUTADA');
CREATE TYPE puesto_estado AS ENUM ('LIBRE', 'RESERVADO', 'FUERA_SERVICIO');
CREATE TYPE elector_estado AS ENUM ('PENDIENTE', 'HABILITADO', 'VOTO');

-- 1. TABLA ELECCIÓN
CREATE TABLE eleccion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    estado eleccion_estado NOT NULL DEFAULT 'BORRADOR',
    reglas JSONB NOT NULL DEFAULT '{
        "blanco_en_porcentaje": false,
        "porcentaje_minimo_ganar": 50.0,
        "segunda_vuelta": false,
        "cuantos_pasan_segunda_vuelta": 2,
        "quorum_porcentaje": 0.0,
        "accion_sin_quorum": "DECLARAR_DESIERTA",
        "regla_empate": "SORTEO",
        "duracion_reserva_segundos": 180,
        "ip_restringida": null
    }'::jsonb,
    huella_sha256 VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    abierta_at TIMESTAMPTZ,
    cerrada_at TIMESTAMPTZ
);

-- 2. TABLA AULA
CREATE TABLE aula (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    eleccion_id UUID NOT NULL REFERENCES eleccion(id) ON DELETE CASCADE,
    numero INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    capacidad INT NOT NULL DEFAULT 50,
    CONSTRAINT uq_aula_eleccion_numero UNIQUE (eleccion_id, numero)
);

-- 3. TABLA DOCENTE
CREATE TABLE docente (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aula_id UUID NOT NULL REFERENCES aula(id) ON DELETE RESTRICT,
    eleccion_id UUID NOT NULL REFERENCES eleccion(id) ON DELETE CASCADE,
    username VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    totp_secret VARCHAR(64) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_docente_username_eleccion UNIQUE (eleccion_id, username)
);

-- 4. TABLA PARTIDO
CREATE TABLE partido (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    eleccion_id UUID NOT NULL REFERENCES eleccion(id) ON DELETE CASCADE,
    numero_lista INT NOT NULL,
    nombre VARCHAR(120) NOT NULL,
    lema VARCHAR(255),
    logo_url TEXT,
    CONSTRAINT uq_partido_eleccion_lista UNIQUE (eleccion_id, numero_lista)
);

-- 5. TABLA PUESTO
CREATE TABLE puesto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aula_id UUID NOT NULL REFERENCES aula(id) ON DELETE CASCADE,
    numero_puesto INT NOT NULL,
    token_sesion VARCHAR(64),
    estado puesto_estado NOT NULL DEFAULT 'FUERA_SERVICIO',
    ultimo_heartbeat TIMESTAMPTZ,
    CONSTRAINT uq_puesto_aula_numero UNIQUE (aula_id, numero_puesto)
);

-- 6. TABLA QR_EMPAREJAMIENTO
CREATE TABLE qr_emparejamiento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    puesto_id UUID NOT NULL REFERENCES puesto(id) ON DELETE CASCADE,
    token VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    usado BOOLEAN NOT NULL DEFAULT FALSE
);

-- 7. TABLA ELECTOR (INVARIANTE I3: Sin fecha de voto ni tracking temporal)
CREATE TABLE elector (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    eleccion_id UUID NOT NULL REFERENCES eleccion(id) ON DELETE CASCADE,
    aula_id UUID NOT NULL REFERENCES aula(id) ON DELETE RESTRICT,
    dni VARCHAR(15) NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    grado_seccion VARCHAR(50) NOT NULL,
    estado elector_estado NOT NULL DEFAULT 'PENDIENTE',
    CONSTRAINT uq_elector_dni_eleccion UNIQUE (eleccion_id, dni)
);

-- 8. TABLA HABILITACIÓN (INVARIANTE I5 y I6: Transitoria, 1 activa por elector y 1 por puesto)
CREATE TABLE habilitacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    eleccion_id UUID NOT NULL REFERENCES eleccion(id) ON DELETE CASCADE,
    elector_id UUID NOT NULL UNIQUE REFERENCES elector(id) ON DELETE CASCADE,
    puesto_id UUID NOT NULL UNIQUE REFERENCES puesto(id) ON DELETE CASCADE,
    token_voto_hash VARCHAR(64) NOT NULL UNIQUE,
    token_voto VARCHAR(128),
    expires_at TIMESTAMPTZ NOT NULL
);

-- 9. TABLA URNA (INVARIANTES I1, I2, I3: Cero vínculos, cero timestamps, UUID v4 puro)
CREATE TABLE urna (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    eleccion_id UUID NOT NULL REFERENCES eleccion(id) ON DELETE CASCADE,
    voto_payload JSONB NOT NULL,
    schema_version VARCHAR(10) NOT NULL DEFAULT 'v1'
);

-- 10. TABLA AUDITORÍA LOG (INVARIANTE I12: Inmutable, jamás audita votos)
CREATE TABLE auditoria_log (
    id BIGSERIAL PRIMARY KEY,
    eleccion_id UUID REFERENCES eleccion(id) ON DELETE SET NULL,
    actor_tipo VARCHAR(20) NOT NULL,
    actor_id VARCHAR(64) NOT NULL,
    accion VARCHAR(50) NOT NULL,
    entidad VARCHAR(50) NOT NULL,
    entidad_id VARCHAR(64),
    datos_antes JSONB,
    datos_despues JSONB,
    ip VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. TABLA INCIDENTE
CREATE TABLE incidente (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    eleccion_id UUID NOT NULL REFERENCES eleccion(id) ON DELETE CASCADE,
    aula_id UUID REFERENCES aula(id) ON DELETE SET NULL,
    docente_id UUID REFERENCES docente(id) ON DELETE SET NULL,
    tipo VARCHAR(50) NOT NULL,
    descripcion TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. TABLA RESULTADO ESCRUTINIO
CREATE TABLE resultado_escrutinio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    eleccion_id UUID NOT NULL UNIQUE REFERENCES eleccion(id) ON DELETE CASCADE,
    total_votos_urna INT NOT NULL,
    total_electores_votaron INT NOT NULL,
    conteo_partidos JSONB NOT NULL,
    porcentajes_calculados JSONB NOT NULL,
    ganador_partido_id UUID REFERENCES partido(id),
    requiere_segunda_vuelta BOOLEAN NOT NULL DEFAULT FALSE,
    partidos_segunda_vuelta JSONB,
    quorum_cumplido BOOLEAN NOT NULL,
    huella_verificada BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ÍNDICES DE RENDIMIENTO PARA CONCURRENCIA
CREATE INDEX idx_elector_dni ON elector(eleccion_id, dni);
CREATE INDEX idx_elector_aula ON elector(aula_id, estado);
CREATE INDEX idx_puesto_aula_estado ON puesto(aula_id, estado);
CREATE INDEX idx_habilitacion_token ON habilitacion(token_voto_hash);
CREATE INDEX idx_urna_eleccion ON urna(eleccion_id);

