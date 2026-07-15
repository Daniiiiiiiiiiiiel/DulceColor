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

-- 2. Corregir get_disponibilidad: SECURITY INVOKER + search_path fijo
CREATE OR REPLACE FUNCTION public.get_disponibilidad(p_fecha DATE)
RETURNS TABLE (slot TEXT, disponible BOOLEAN, motivo TEXT)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT h.slot,
    CASE
      WHEN h.activo = FALSE THEN FALSE
      WHEN b.id IS NOT NULL THEN FALSE
      WHEN r.id IS NOT NULL THEN FALSE
      ELSE TRUE
    END,
    CASE
      WHEN h.activo = FALSE THEN 'horario_inactivo'
      WHEN b.id IS NOT NULL THEN 'bloqueado'
      WHEN r.id IS NOT NULL THEN 'reservado'
      ELSE NULL
    END
  FROM public.configuracion_horarios h
  LEFT JOIN public.slots_bloqueados b ON b.hora_slot = h.slot AND b.fecha = p_fecha
  LEFT JOIN public.reservas r ON r.hora_slot = h.slot AND r.fecha = p_fecha
    AND r.estado IN ('pendiente','confirmada')
  ORDER BY h.orden;
END;
$$;

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
-- El permiso viene del rol PUBLIC (padre de anon y authenticated),
-- así que hay que revocarlo desde ahí.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;

-- 5. Tabla admins: añadir política explícita de denegación.
-- RLS con cero políticas genera warning aunque el efecto sea el mismo.
-- El panel admin usa service_role key, que bypasea RLS por defecto en Supabase.
CREATE POLICY "admins_deny_public"
  ON public.admins
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
