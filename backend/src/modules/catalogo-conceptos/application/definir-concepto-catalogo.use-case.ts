import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_LOG_REPOSITORY, AuditLogRepository } from '../../../infra/auditoria/audit-log.repository';
import { NotFoundError } from '../../../shared/errors/not-found-error';
import { ClasificacionConcepto } from '../../../shared/value-objects/clasificacion-concepto';
import { normalizarConcepto } from '../../../shared/utils/normalizar-concepto';
import { EMPRESA_REPOSITORY, EmpresaRepository } from '../../empresas/domain/empresa.repository';
import { IMPORTACION_REPOSITORY, ImportacionRepository } from '../../importacion/domain/importacion.repository';
import { ConceptoCatalogo } from '../domain/concepto-catalogo.entity';
import { CATALOGO_CONCEPTOS_REPOSITORY, ConceptoCatalogoRepository } from '../domain/concepto-catalogo.repository';

function serializarClasificacion(tipo: string, categoriaContribucion: string | null): string {
  return JSON.stringify({ tipo, categoriaContribucion });
}

export interface DefinirConceptoCatalogoInput {
  empresaId: string;
  usuarioId: string;
  concepto: string;
  tipo: string;
  categoriaContribucion: string | null;
}

export interface DefinirConceptoCatalogoResultado {
  concepto: ConceptoCatalogo;
  filasActualizadas: number;
}

@Injectable()
export class DefinirConceptoCatalogoUseCase {
  constructor(
    @Inject(EMPRESA_REPOSITORY) private readonly empresaRepository: EmpresaRepository,
    @Inject(CATALOGO_CONCEPTOS_REPOSITORY) private readonly catalogoConceptosRepository: ConceptoCatalogoRepository,
    @Inject(IMPORTACION_REPOSITORY) private readonly importacionRepository: ImportacionRepository,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: DefinirConceptoCatalogoInput): Promise<DefinirConceptoCatalogoResultado> {
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
    const anterior = await this.catalogoConceptosRepository.findByEmpresaAndConceptoNormalizado(
      empresa.id,
      conceptoNormalizado,
    );

    const concepto = await this.catalogoConceptosRepository.upsert({
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
        // Se mantiene el valor histórico "PerfilMapeoConcepto" (nombre previo de esta
        // entidad, ver ADR-058/rename): es un valor persistido en filas de auditoría ya
        // existentes, y ListarAuditoriaCatalogoConceptosUseCase filtra por este mismo
        // string — cambiarlo dejaría inaccesible el historial anterior al rename.
        entidad: 'PerfilMapeoConcepto',
        entidadId: concepto.id,
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
    // que el usuario tenía abierta cuando lo clasificó.
    const filasActualizadas = await this.importacionRepository.aplicarClasificacion(
      empresa.id,
      conceptoNormalizado,
      { tipo: clasificacion.tipo, categoriaContribucion: clasificacion.categoriaContribucion },
    );

    return { concepto, filasActualizadas };
  }
}
