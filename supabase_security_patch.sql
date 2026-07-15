-- =====================================================
-- PATCH DE SEGURIDAD — Ejecutar si ya corriste supabase.sql
-- Corrige todos los warnings del Supabase Security Linter
-- =====================================================

-- 1. Corregir search_path mutable en set_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- 1.1 Asegurar columna limite_personas en configuracion_horarios
ALTER TABLE public.configuracion_horarios ADD COLUMN IF NOT EXISTS limite_personas INTEGER NOT NULL DEFAULT 4;

-- 1.2 Asegurar tabla configuracion_general
CREATE TABLE IF NOT EXISTS public.configuracion_general (
  id      TEXT PRIMARY KEY,
  valor   TEXT NOT NULL
);

INSERT INTO public.configuracion_general (id, valor) VALUES
  ('capacidad_maxima_local', '20'),
  ('duracion_reserva_minutos', '120'),
  ('maximo_personas_por_grupo', '6')
ON CONFLICT (id) DO NOTHING;

-- Habilitar RLS en configuracion_general y añadir políticas de lectura pública
ALTER TABLE public.configuracion_general ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_configuracion" ON public.configuracion_general;
CREATE POLICY "anon_read_configuracion" ON public.configuracion_general FOR SELECT TO anon USING (true);

-- 1.3 Asegurar función auxiliar slot_a_minutos
CREATE OR REPLACE FUNCTION public.slot_a_minutos(p_slot TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_hora_str TEXT;
  v_hm TEXT[];
  v_horas INTEGER;
  v_minutos INTEGER;
  v_es_pm BOOLEAN;
BEGIN
  v_hora_str := trim(split_part(p_slot, '-', 1));
  v_es_pm := v_hora_str ILIKE '%PM%';
  v_hora_str := trim(replace(replace(v_hora_str, 'AM', ''), 'PM', ''));
  v_hm := string_to_array(v_hora_str, ':');
  v_horas := v_hm[1]::INTEGER;
  v_minutos := v_hm[2]::INTEGER;
  
  IF v_es_pm AND v_horas < 12 THEN
    v_horas := v_horas + 12;
  ELSIF NOT v_es_pm AND v_horas = 12 THEN
    v_horas := 0;
  END IF;
  
  RETURN v_horas * 60 + v_minutos;
END;
$$;

GRANT EXECUTE ON FUNCTION public.slot_a_minutos(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.slot_a_minutos(TEXT) TO authenticated;

-- 2. Corregir get_disponibilidad: borrar vieja e implementar con soporte capacidad/aforo por superposición de tiempo
DROP FUNCTION IF EXISTS public.get_disponibilidad(p_fecha DATE);
DROP FUNCTION IF EXISTS public.get_disponibilidad(DATE);

CREATE OR REPLACE FUNCTION public.get_disponibilidad(p_fecha DATE)
RETURNS TABLE (
  slot TEXT,
  disponible BOOLEAN,
  motivo TEXT,
  personas_reservadas INTEGER,
  limite_personas INTEGER,
  cupos_restantes INTEGER
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_capacidad_max INTEGER;
  v_duracion_reserva INTEGER;
BEGIN
  -- Obtener configuraciones generales
  SELECT valor::INTEGER INTO v_capacidad_max FROM public.configuracion_general WHERE id = 'capacidad_maxima_local';
  SELECT valor::INTEGER INTO v_duracion_reserva FROM public.configuracion_general WHERE id = 'duracion_reserva_minutos';
  
  -- Fallbacks por si no existen
  IF v_capacidad_max IS NULL THEN v_capacidad_max := 20; END IF;
  IF v_duracion_reserva IS NULL THEN v_duracion_reserva := 120; END IF;

  RETURN QUERY
  WITH slots_con_minutos AS (
    SELECT 
      h.slot,
      h.activo,
      h.orden,
      public.slot_a_minutos(h.slot) AS slot_minutos
    FROM public.configuracion_horarios h
  ),
  reservas_con_intervalos AS (
    SELECT 
      r.personas,
      public.slot_a_minutos(r.hora_slot) AS inicio_minutos
    FROM public.reservas r
    WHERE r.fecha = p_fecha AND r.estado IN ('pendiente', 'confirmada')
  ),
  ocupacion_por_slot AS (
    SELECT 
      s.slot,
      COALESCE(SUM(r.personas), 0)::INTEGER AS total_personas
    FROM slots_con_minutos s
    LEFT JOIN reservas_con_intervalos r ON 
      s.slot_minutos >= r.inicio_minutos AND 
      s.slot_minutos < (r.inicio_minutos + v_duracion_reserva)
    GROUP BY s.slot
  )
  SELECT 
    s.slot,
    CASE
      WHEN s.activo = FALSE THEN FALSE
      WHEN b.id IS NOT NULL THEN FALSE
      WHEN o.total_personas >= v_capacidad_max THEN FALSE
      ELSE TRUE
    END AS disponible,
    CASE
      WHEN s.activo = FALSE THEN 'horario_inactivo'
      WHEN b.id IS NOT NULL THEN 'bloqueado'
      WHEN o.total_personas >= v_capacidad_max THEN 'lleno'
      ELSE NULL
    END AS motivo,
    o.total_personas AS personas_reservadas,
    v_capacidad_max AS limite_personas,
    GREATEST(0, v_capacidad_max - o.total_personas)::INTEGER AS cupos_restantes
  FROM slots_con_minutos s
  JOIN ocupacion_por_slot o ON o.slot = s.slot
  LEFT JOIN public.slots_bloqueados b ON b.hora_slot = s.slot AND b.fecha = p_fecha
  ORDER BY s.orden;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_disponibilidad(DATE) TO anon;
GRANT EXECUTE ON FUNCTION public.get_disponibilidad(DATE) TO authenticated;

-- 3. Reemplazar política INSERT permisiva con validación real
DROP POLICY IF EXISTS "anon_insert_reservas" ON public.reservas;
CREATE POLICY "anon_insert_reservas" ON public.reservas
  FOR INSERT TO anon
  WITH CHECK (
    nombre    IS NOT NULL AND length(trim(nombre))    > 0 AND
    email     IS NOT NULL AND length(trim(email))     > 0 AND
    telefono  IS NOT NULL AND length(trim(telefono))  > 0 AND
    fecha     IS NOT NULL AND fecha >= CURRENT_DATE   AND
    hora_slot IS NOT NULL AND length(trim(hora_slot)) > 0 AND
    personas  >= 1 AND personas <= 20
  );

-- 4. rls_auto_enable() — función interna de Supabase.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;

-- 5. Tabla admins: política restrictiva.
DROP POLICY IF EXISTS "admins_deny_public" ON public.admins;
CREATE POLICY "admins_deny_public"
  ON public.admins
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
