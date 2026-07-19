-- AlterTable
ALTER TABLE "empleados" ADD COLUMN     "categoria" TEXT,
ADD COLUMN     "fecha_ingreso" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "importaciones" ADD COLUMN     "fecha_pago" TIMESTAMP(3),
ADD COLUMN     "fecha_pago_cargas_sociales" TIMESTAMP(3),
ADD COLUMN     "lugar_pago" TEXT,
ADD COLUMN     "lugar_pago_cargas_sociales" TEXT;

-- CreateTable
CREATE TABLE "recibos" (
    "id" TEXT NOT NULL,
    "importacion_id" TEXT NOT NULL,
    "empleado_id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "pdf_path" TEXT NOT NULL,
    "hash_integridad" TEXT NOT NULL,
    "fecha_emision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recibos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recibos_importacion_id_idx" ON "recibos"("importacion_id");

-- CreateIndex
CREATE INDEX "recibos_empleado_id_idx" ON "recibos"("empleado_id");

-- CreateIndex
CREATE UNIQUE INDEX "recibos_importacion_id_empleado_id_key" ON "recibos"("importacion_id", "empleado_id");

-- AddForeignKey
ALTER TABLE "recibos" ADD CONSTRAINT "recibos_importacion_id_fkey" FOREIGN KEY ("importacion_id") REFERENCES "importaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recibos" ADD CONSTRAINT "recibos_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
