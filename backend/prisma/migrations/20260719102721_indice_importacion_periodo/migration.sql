-- CreateIndex
CREATE INDEX "importaciones_empresa_id_estado_anio_mes_idx" ON "importaciones"("empresa_id", "estado", "anio", "mes");

