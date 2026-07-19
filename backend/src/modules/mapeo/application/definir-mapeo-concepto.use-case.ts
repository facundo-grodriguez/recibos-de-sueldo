import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_LOG_REPOSITORY, AuditLogRepository } from '../../../infra/auditoria/audit-log.repository';
import { NotFoundError } from '../../../shared/errors/not-found-error';
import { ClasificacionConcepto } from '../../../shared/value-objects/clasificacion-concepto';
import { normalizarConcepto } from '../../../shared/utils/normalizar-concepto';
import { EMPRESA_REPOSITORY, EmpresaRepository } from '../../empresas/domain/empresa.repository';
import { IMPORTACION_REPOSITORY, ImportacionRepository } from '../../importacion/domain/importacion.repository';
import { PerfilMapeoConcepto } from '../domain/perfil-mapeo-concepto.entity';
import { PERFIL_MAPEO_REPOSITORY, PerfilMapeoRepository } from '../domain/perfil-mapeo.repository';

function serializarClasificacion(tipo: string, categoriaContribucion: string | null): string {
  return JSON.stringify({ tipo, categoriaContribucion });
}

export interface DefinirMapeoConceptoInput {
  empresaId: string;
  usuarioId: string;
  concepto: string;
  tipo: string;
  categoriaContribucion: string | null;
}

export interface DefinirMapeoConceptoResultado {
  perfil: PerfilMapeoConcepto;
  filasActualizadas: number;
}

@Injectable()
export class DefinirMapeoConceptoUseCase {
  constructor(
    @Inject(EMPRESA_REPOSITORY) private readonly empresaRepository: EmpresaRepository,
    @Inject(PERFIL_MAPEO_REPOSITORY) private readonly perfilMapeoRepository: PerfilMapeoRepository,
    @Inject(IMPORTACION_REPOSITORY) private readonly importacionRepository: ImportacionRepository,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: DefinirMapeoConceptoInput): Promise<DefinirMapeoConceptoResultado> {
    const empresa = await this.empresaRepository.findByIdAndUsuario(input.empresaId, input.usuarioId);
    if (!empresa) {
      throw new NotFoundError(`Empresa "${input.empresaId}" no encontrada`);
    }

    // Falla rápido si la combinación tipo/categoría no es válida, antes de tocar la BD.
    const clasificacion = ClasificacionConcepto.create(input.tipo, input.categoriaContribucion);
    const conceptoNormalizado = normalizarConcepto(input.concepto);

    // Se lee el valor previo (si existe) ANTES de sobrescribirlo con el
    // upsert — es la única forma de auditar el diff campo a campo; el
    // interceptor transversal (@Auditable) no tiene acceso al valor anterior
    // (ver ADR-058/064).
    const anterior = await this.perfilMapeoRepository.findByEmpresaAndConceptoNormalizado(
      empresa.id,
      conceptoNormalizado,
    );

    const perfil = await this.perfilMapeoRepository.upsert({
      empresaId: empresa.id,
      conceptoOriginal: input.concepto,
      tipo: clasificacion.tipo,
      categoriaContribucion: clasificacion.categoriaContribucion,
    });

    const cambioReal =
      !anterior ||
      anterior.clasificacion.tipo !== clasificacion.tipo ||
      anterior.clasificacion.categoriaContribucion !== clasificacion.categoriaContribucion;
    if (cambioReal) {
      await this.auditLogRepository.create({
        entidad: 'PerfilMapeoConcepto',
        entidadId: perfil.id,
        accion: anterior ? 'modificar' : 'crear',
        usuarioId: input.usuarioId,
        campo: 'clasificacion',
        valorAnterior: anterior
          ? serializarClasificacion(anterior.clasificacion.tipo, anterior.clasificacion.categoriaContribucion)
          : null,
        valorNuevo: serializarClasificacion(clasificacion.tipo, clasificacion.categoriaContribucion),
      });
    }

    // Reutilización retroactiva: aplica de inmediato a todas las filas sin
    // clasificar de ese concepto en toda la empresa, no solo la importación
    // que el usuario tenía abierta cuando definió el mapeo.
    const filasActualizadas = await this.importacionRepository.aplicarClasificacion(
      empresa.id,
      conceptoNormalizado,
      { tipo: clasificacion.tipo, categoriaContribucion: clasificacion.categoriaContribucion },
    );

    return { perfil, filasActualizadas };
  }
}
