-- Dos empleados de la misma empresa nunca comparten legajo (Postgres no
-- choca dos NULL entre sí, así que los que todavía no tienen legajo cargado
-- conviven sin problema).
CREATE UNIQUE INDEX "empleados_empresa_id_legajo_key" ON "empleados"("empresa_id", "legajo");
