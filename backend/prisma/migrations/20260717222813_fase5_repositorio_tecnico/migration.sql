-- DropIndex
DROP INDEX "recibos_importacion_id_empleado_id_key";

-- AlterTable
ALTER TABLE "recibos" ADD COLUMN     "estado" TEXT NOT NULL DEFAULT 'vigente',
ADD COLUMN     "motivo_anulacion" TEXT,
ADD COLUMN     "reemplaza_a_id" TEXT;

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "acepto_terminos_en" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "recibos_reemplaza_a_id_key" ON "recibos"("reemplaza_a_id");

-- CreateIndex
CREATE INDEX "recibos_importacion_id_empleado_id_idx" ON "recibos"("importacion_id", "empleado_id");

-- AddForeignKey
ALTER TABLE "recibos" ADD CONSTRAINT "recibos_reemplaza_a_id_fkey" FOREIGN KEY ("reemplaza_a_id") REFERENCES "recibos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

