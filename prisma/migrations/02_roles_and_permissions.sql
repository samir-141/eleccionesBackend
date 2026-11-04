-- ============================================================
-- MIGRACIÓN 02: CONFIGURACIÓN DE ROLES Y PERMISOS DE BASE DE DATOS
-- Invariante I7: Principio de Menor Privilegio sobre la Urna
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
        CREATE ROLE app_user WITH LOGIN PASSWORD 'app_secure_password';
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'escrutinio_user') THEN
        CREATE ROLE escrutinio_user WITH LOGIN PASSWORD 'escrutinio_secure_password';
    END IF;
END
$$;

-- Permisos generales para app_user (Operación en vivo)
GRANT USAGE ON SCHEMA public TO app_user;

GRANT SELECT, INSERT, UPDATE, DELETE ON 
    eleccion, aula, docente, partido, puesto, qr_emparejamiento, elector, habilitacion
TO app_user;

GRANT INSERT ON auditoria_log, incidente TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- ============================================================
-- INVARIANTE I7: app_user TIENE ESTRICTAMENTE SOLO 'INSERT' EN URNA
-- ============================================================
REVOKE ALL ON urna FROM app_user;
GRANT INSERT ON urna TO app_user;
-- app_user NO TIENE SELECT, UPDATE NI DELETE SOBRE URNA.

-- Permisos para escrutinio_user (Worker de cómputo final aislado)
GRANT USAGE ON SCHEMA public TO escrutinio_user;
GRANT SELECT ON eleccion, partido, elector, urna TO escrutinio_user;
GRANT INSERT, UPDATE ON resultado_escrutinio TO escrutinio_user;
GRANT SELECT, INSERT ON auditoria_log TO escrutinio_user;

