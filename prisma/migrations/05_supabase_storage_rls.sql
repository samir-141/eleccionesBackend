-- ==============================================================================
-- MIGRACIÓN 05: BUCKETS DE SUPABASE STORAGE Y POLÍTICAS RLS DE SEGURIDAD
-- Ejecutar en Supabase SQL Editor (Dashboard -> SQL Editor)
-- ==============================================================================

-- 1. Crear Buckets (Público para boletas/portada y Privado para perfiles internos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'elecciones-media',
    'elecciones-media',
    TRUE,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
  ),
  (
    'elecciones-privado',
    'elecciones-privado',
    FALSE,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
  )
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Políticas de Supabase Storage sobre storage.objects
-- IMPORTANTE: La carga/edición/eliminación desde el backend NestJS usa SUPABASE_SERVICE_ROLE_KEY
-- con validación previa de permisos RBAC en servidor. Estas políticas restringen el acceso directo
-- vía ANON/Authenticated Key desde navegadores externos.

-- Limpiar políticas previas si se re-ejecuta el script
DROP POLICY IF EXISTS "Lectura publica solo en elecciones-media" ON storage.objects;
DROP POLICY IF EXISTS "Denegar escritura anonima en elecciones-media" ON storage.objects;
DROP POLICY IF EXISTS "Acceso privado solo via backend o URL firmada" ON storage.objects;
DROP POLICY IF EXISTS "Administradores autenticados gestionan media publica" ON storage.objects;

-- A) Lectura pública ÚNICAMENTE de archivos en el bucket público 'elecciones-media'
CREATE POLICY "Lectura publica solo en elecciones-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'elecciones-media');

-- B) Escritura / actualización / borrado restringida a roles administrativos autenticados o service_role
CREATE POLICY "Administradores autenticados gestionan media publica"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'elecciones-media'
  AND (auth.jwt() ->> 'role' = 'ADMIN' OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN')
)
WITH CHECK (
  bucket_id = 'elecciones-media'
  AND (auth.jwt() ->> 'role' = 'ADMIN' OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN')
);

-- C) Bucket privado 'elecciones-privado': un usuario autenticado solo puede leer/modificar su carpeta usuarios/{role}/{uid}/
CREATE POLICY "Acceso privado restringido al propietario o admin"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'elecciones-privado'
  AND (
    (auth.jwt() ->> 'role' = 'ADMIN' OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN')
    OR (
      name LIKE ('usuarios/%/' || auth.uid()::text || '/%')
    )
  )
)
WITH CHECK (
  bucket_id = 'elecciones-privado'
  AND (
    (auth.jwt() ->> 'role' = 'ADMIN' OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN')
    OR (
      name LIKE ('usuarios/%/' || auth.uid()::text || '/%')
    )
  )
);

-- 3. Políticas RLS en tablas públicas de PostgreSQL para archivo_media y configuracion_institucional
ALTER TABLE archivo_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidato ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion_institucional ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura publica de archivos no privados" ON archivo_media;
CREATE POLICY "Lectura publica de archivos no privados"
ON archivo_media FOR SELECT
USING (es_privado = FALSE);

DROP POLICY IF EXISTS "Lectura publica de candidatos" ON candidato;
CREATE POLICY "Lectura publica de candidatos"
ON candidato FOR SELECT
USING (TRUE);

DROP POLICY IF EXISTS "Lectura publica de configuracion institucional" ON configuracion_institucional;
CREATE POLICY "Lectura publica de configuracion institucional"
ON configuracion_institucional FOR SELECT
USING (TRUE);

-- Nota: El backend NestJS (cuando opera como postgres / service_role / app_user con bypass o backend autorizado)
-- aplica validación RBAC estricta antes de insertar/modificar/eliminar.
-- Para app_user si RLS está habilitado, aseguramos política explícita de aplicación:
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
        DROP POLICY IF EXISTS "Operacion backend app_user en media" ON archivo_media;
        CREATE POLICY "Operacion backend app_user en media" ON archivo_media FOR ALL TO app_user USING (TRUE) WITH CHECK (TRUE);
        DROP POLICY IF EXISTS "Operacion backend app_user en candidato" ON candidato;
        CREATE POLICY "Operacion backend app_user en candidato" ON candidato FOR ALL TO app_user USING (TRUE) WITH CHECK (TRUE);
        DROP POLICY IF EXISTS "Operacion backend app_user en institucion" ON configuracion_institucional;
        CREATE POLICY "Operacion backend app_user en institucion" ON configuracion_institucional FOR ALL TO app_user USING (TRUE) WITH CHECK (TRUE);
    END IF;
END
$$;
