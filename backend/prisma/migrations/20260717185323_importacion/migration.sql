-- CreateTable
CREATE TABLE "importaciones" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "nombre_archivo" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'previsualizada',
    "fecha_importacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "importaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "importacion_filas" (
    "id" TEXT NOT NULL,
    "importacion_id" TEXT NOT NULL,
    "numero_fila" INTEGER NOT NULL,
    "cuil" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "monto_original" TEXT NOT NULL,
    "monto" DECIMAL(12,2),
    "valida" BOOLEAN NOT NULL,
    "error_mensaje" TEXT,

    CONSTRAINT "importacion_filas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "importaciones_empresa_id_idx" ON "importaciones"("empresa_id");

-- CreateIndex
CREATE INDEX "importacion_filas_importacion_id_idx" ON "importacion_filas"("importacion_id");

-- AddForeignKey
ALTER TABLE "importaciones" ADD CONSTRAINT "importaciones_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "importacion_filas" ADD CONSTRAINT "importacion_filas_importacion_id_fkey" FOREIGN KEY ("importacion_id") REFERENCES "importaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
