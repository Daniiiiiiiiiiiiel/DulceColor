-- =====================================================
-- SWEET STUDIO — Script SQL completo para Supabase
-- Ejecuta esto en: Supabase > SQL Editor > New query
-- =====================================================

-- 1. TABLA: reservas
CREATE TABLE IF NOT EXISTS public.reservas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre        TEXT NOT NULL,
  email         TEXT NOT NULL,
  telefono      TEXT NOT NULL,
  personas      INTEGER NOT NULL DEFAULT 1 CHECK (personas >= 1 AND personas <= 20),
  fecha         DATE NOT NULL,
  hora_slot     TEXT NOT NULL,
  comentarios   TEXT,
  estado        TEXT NOT NULL DEFAULT 'pendiente'
                CHECK (estado IN ('pendiente','confirmada','cancelada')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. TABLA: slots_bloqueados
CREATE TABLE IF NOT EXISTS public.slots_bloqueados (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha       DATE NOT NULL,
  hora_slot   TEXT NOT NULL,
  motivo      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (fecha, hora_slot)
);

-- 3. TABLA: configuracion_horarios
CREATE TABLE IF NOT EXISTS public.configuracion_horarios (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot    TEXT NOT NULL UNIQUE,
  activo  BOOLEAN NOT NULL DEFAULT TRUE,
  orden   INTEGER NOT NULL DEFAULT 0,
  limite_personas INTEGER NOT NULL DEFAULT 4
);

-- 4. Insertar slots por defecto (9 AM – 5 PM cada 15 min)
INSERT INTO public.configuracion_horarios (slot, activo, orden) VALUES
  ('9:00 AM - 9:15 AM',TRUE,1),('9:15 AM - 9:30 AM',TRUE,2),
  ('9:30 AM - 9:45 AM',TRUE,3),('9:45 AM - 10:00 AM',TRUE,4),
  ('10:00 AM - 10:15 AM',TRUE,5),('10:15 AM - 10:30 AM',TRUE,6),
  ('10:30 AM - 10:45 AM',TRUE,7),('10:45 AM - 11:00 AM',TRUE,8),
  ('11:00 AM - 11:15 AM',TRUE,9),('11:15 AM - 11:30 AM',TRUE,10),
  ('11:30 AM - 11:45 AM',TRUE,11),('11:45 AM - 12:00 PM',TRUE,12),
  ('12:00 PM - 12:15 PM',TRUE,13),('12:15 PM - 12:30 PM',TRUE,14),
  ('12:30 PM - 12:45 PM',TRUE,15),('12:45 PM - 1:00 PM',TRUE,16),
  ('1:00 PM - 1:15 PM',TRUE,17),('1:15 PM - 1:30 PM',TRUE,18),
  ('1:30 PM - 1:45 PM',TRUE,19),('1:45 PM - 2:00 PM',TRUE,20),
  ('2:00 PM - 2:15 PM',TRUE,21),('2:15 PM - 2:30 PM',TRUE,22),
  ('2:30 PM - 2:45 PM',TRUE,23),('2:45 PM - 3:00 PM',TRUE,24),
  ('3:00 PM - 3:15 PM',TRUE,25),('3:15 PM - 3:30 PM',TRUE,26),
  ('3:30 PM - 3:45 PM',TRUE,27),('3:45 PM - 4:00 PM',TRUE,28),
  ('4:00 PM - 4:15 PM',TRUE,29),('4:15 PM - 4:30 PM',TRUE,30),
  ('4:30 PM - 4:45 PM',TRUE,31),('4:45 PM - 5:00 PM',TRUE,32)
ON CONFLICT (slot) DO NOTHING;

-- 5. TABLA: admins (sin registro público — solo admin manual)
CREATE TABLE IF NOT EXISTS public.admins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  nombre        TEXT NOT NULL DEFAULT 'Administrador',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Admin por defecto (las credenciales reales van en sistema/env.js)
INSERT INTO public.admins (email, nombre)
VALUES ('admin@sweetstudio.cr','Administrador Sweet Studio')
ON CONFLICT (email) DO NOTHING;

-- 5.1 TABLA: configuracion_general (aforo e intervalos globales)
CREATE TABLE IF NOT EXISTS public.configuracion_general (
  id      TEXT PRIMARY KEY,
  valor   TEXT NOT NULL
);

INSERT INTO public.configuracion_general (id, valor) VALUES
  ('capacidad_maxima_local', '20'),
  ('duracion_reserva_minutos', '120'),
  ('maximo_personas_por_grupo', '6')
ON CONFLICT (id) DO NOTHING;

-- 6. Trigger para updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_reservas_updated_at ON public.reservas;
CREATE TRIGGER trg_reservas_updated_at
  BEFORE UPDATE ON public.reservas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. FUNCIÓN AUXILIAR: Convertir Slot a Minutos del día
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
  -- Extraer la hora de inicio del slot, ej: "9:15 AM - 9:30 AM" -> "9:15 AM"
  v_hora_str := trim(split_part(p_slot, '-', 1));
  
  -- Verificar si es PM
  v_es_pm := v_hora_str ILIKE '%PM%';
  
  -- Quitar AM/PM y recortar espacios
  v_hora_str := trim(replace(replace(v_hora_str, 'AM', ''), 'PM', ''));
  
  -- Separar por ":"
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

-- 8. FUNCIÓN: disponibilidad por fecha con capacidad acumulada por intervalos
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

-- 9. Índices
CREATE INDEX IF NOT EXISTS idx_reservas_fecha      ON public.reservas (fecha);
CREATE INDEX IF NOT EXISTS idx_reservas_estado     ON public.reservas (estado);
CREATE INDEX IF NOT EXISTS idx_reservas_fecha_slot ON public.reservas (fecha, hora_slot);
CREATE INDEX IF NOT EXISTS idx_bloq_fecha_slot     ON public.slots_bloqueados (fecha, hora_slot);

-- 10. RLS
ALTER TABLE public.reservas               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slots_bloqueados       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion_horarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion_general  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins                 ENABLE ROW LEVEL SECURITY;

-- Web pública: solo insertar reservas con campos válidos y leer datos necesarios
CREATE POLICY "anon_insert_reservas"     ON public.reservas               FOR INSERT TO anon WITH CHECK (
  nombre    IS NOT NULL AND length(trim(nombre))    > 0 AND
  email     IS NOT NULL AND length(trim(email))     > 0 AND
  telefono  IS NOT NULL AND length(trim(telefono))  > 0 AND
  fecha     IS NOT NULL AND fecha >= CURRENT_DATE   AND
  hora_slot IS NOT NULL AND length(trim(hora_slot)) > 0 AND
  personas  >= 1 AND personas <= 20
);
CREATE POLICY "anon_read_horarios"       ON public.configuracion_horarios FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_bloqueados"     ON public.slots_bloqueados        FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_configuracion"  ON public.configuracion_general  FOR SELECT TO anon USING (true);

-- Denegar admins por completo a anon
CREATE POLICY "admins_deny_public"
  ON public.admins
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- Función disponibilidad accesible por anon
GRANT EXECUTE ON FUNCTION public.slot_a_minutos(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.slot_a_minutos(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_disponibilidad(DATE) TO anon;
GRANT EXECUTE ON FUNCTION public.get_disponibilidad(DATE) TO authenticated;

-- Revocar privilegios de ejecución en funciones críticas para evitar abuso
REVOKE EXECUTE ON FUNCTION public.generar_slots(INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generar_slots(INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION public.generar_slots(INTEGER) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.trg_actualizar_duracion_slots() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_actualizar_duracion_slots() FROM anon;
REVOKE EXECUTE ON FUNCTION public.trg_actualizar_duracion_slots() FROM authenticated;

-- service_role (usado por el panel admin) ya tiene acceso total por defecto en Supabase
