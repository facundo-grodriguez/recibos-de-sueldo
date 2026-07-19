-- AlterTable
ALTER TABLE "importacion_filas" ADD COLUMN     "correcciones" TEXT[] DEFAULT ARRAY[]::TEXT[];
