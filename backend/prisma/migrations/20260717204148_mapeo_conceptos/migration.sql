-- AlterTable
ALTER TABLE "importacion_filas" ADD COLUMN     "categoria_contribucion" TEXT,
ADD COLUMN     "tipo" TEXT;

-- CreateTable
CREATE TABLE "perfil_mapeo_conceptos" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "concepto_normalizado" TEXT NOT NULL,
    "concepto_original" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "categoria_contribucion" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "perfil_mapeo_conceptos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "perfil_mapeo_conceptos_empresa_id_idx" ON "perfil_mapeo_conceptos"("empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "perfil_mapeo_conceptos_empresa_id_concepto_normalizado_key" ON "perfil_mapeo_conceptos"("empresa_id", "concepto_normalizado");

-- AddForeignKey
ALTER TABLE "perfil_mapeo_conceptos" ADD CONSTRAINT "perfil_mapeo_conceptos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
