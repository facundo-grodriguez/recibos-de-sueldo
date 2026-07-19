-- AlterTable
ALTER TABLE "empleados" ADD COLUMN     "legajo" TEXT;

-- AlterTable
ALTER TABLE "importacion_filas" ADD COLUMN     "base" DECIMAL(12,2),
ADD COLUMN     "unidad" TEXT;

