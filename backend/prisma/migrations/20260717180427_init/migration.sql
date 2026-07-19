-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empresas" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "razon_social" TEXT NOT NULL,
    "nombre_fantasia" TEXT,
    "cuit" TEXT NOT NULL,
    "domicilio" TEXT,
    "localidad" TEXT,
    "provincia" TEXT,
    "codigo_postal" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empleados" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "cuil" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empleados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entidad" TEXT NOT NULL,
    "entidad_id" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "campo" TEXT,
    "valor_anterior" TEXT,
    "valor_nuevo" TEXT,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "empresas_usuario_id_idx" ON "empresas"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "empresas_usuario_id_cuit_key" ON "empresas"("usuario_id", "cuit");

-- CreateIndex
CREATE INDEX "empleados_empresa_id_idx" ON "empleados"("empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "empleados_empresa_id_cuil_key" ON "empleados"("empresa_id", "cuil");

-- CreateIndex
CREATE INDEX "audit_log_entidad_entidad_id_idx" ON "audit_log"("entidad", "entidad_id");

-- CreateIndex
CREATE INDEX "audit_log_usuario_id_idx" ON "audit_log"("usuario_id");

-- AddForeignKey
ALTER TABLE "empresas" ADD CONSTRAINT "empresas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleados" ADD CONSTRAINT "empleados_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
