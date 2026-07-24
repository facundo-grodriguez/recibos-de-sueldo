import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { NotFoundError } from '../../../shared/errors/not-found-error';
import { parsearFechaTolerante } from '../../../shared/utils/parsear-fecha-tolerante';
import { EMPLEADO_REPOSITORY, EmpleadoRepository } from '../../empleados/domain/empleado.repository';
import { EMPRESA_REPOSITORY, EmpresaRepository } from '../../empresas/domain/empresa.repository';
import { CATALOGO_CONCEPTOS_REPOSITORY, ConceptoCatalogoRepository } from '../../catalogo-conceptos/domain/concepto-catalogo.repository';
import { Importacion } from '../domain/importacion.entity';
import { IMPORTACION_REPOSITORY, ImportacionRepository } from '../domain/importacion.repository';

export interface ConfirmarImportacionInput {
  importacionId: string;
  empresaId: string;
  usuarioId: string;
}

@Injectable()
export class ConfirmarImportacionUseCase {
  constructor(
    @Inject(EMPRESA_REPOSITORY) private readonly empresaRepository: EmpresaRepository,
    @Inject(IMPORTACION_REPOSITORY) private readonly importacionRepository: ImportacionRepository,
    @Inject(EMPLEADO_REPOSITORY) private readonly empleadoRepository: EmpleadoRepository,
    @Inject(CATALOGO_CONCEPTOS_REPOSITORY) private readonly catalogoConceptosRepository: ConceptoCatalogoRepository,
  ) {}

  async execute(input: ConfirmarImportacionInput): Promise<Importacion> {
    const empresa = await this.empresaRepository.findByIdAndUsuario(input.empresaId, input.usuarioId);
    if (!empresa) {
      throw new NotFoundError(`Empresa "${input.empresaId}" no encontrada`);
    }

    const importacion = await this.importacionRepository.findByIdAndEmpresa(input.importacionId, empresa.id);
    if (!importacion) {
      throw new NotFoundError(`Importación "${input.importacionId}" no encontrada`);
    }

    if (importacion.estado !== 'previsualizada') {
      throw new DomainError(`La importación ya está en estado "${importacion.estado}"`);
    }

    if (importacion.tieneErrores()) {
      throw new DomainError(
        'No se puede confirmar: hay filas con errores. Corregí el archivo y volvé a importarlo.',
      );
    }

    await this.crearEmpleadosFaltantes(empresa.id, importacion);

    // Auto-clasificación (Fase 2): los conceptos que ya están en el catálogo de la empresa
    // se clasifican solos; los que nunca vio quedan sin clasificar, visibles
    // como pendientes, sin bloquear esta confirmación (ver ADR correspondiente).
    await this.autoclasificar(empresa.id, importacion);

    return this.importacionRepository.marcarConfirmada(importacion.id);
  }

  /**
   * Alta en lote de los empleados nuevos del archivo: una consulta para ver
   * cuáles ya existen + una única alta en lote para el resto — reemplaza el
   * patrón anterior de un `findByCuilAndEmpresa` + `create` por CUIL adentro
   * de un `for` (perfil de rendimiento, 2026-07-19: hasta 2 round-trips por
   * empleado, secuenciales).
   *
   * Etapa "primera importación": junto con nombre/apellido/cuil, un empleado
   * NUEVO se da de alta con su ficha (categoría/fecha de ingreso/legajo/
   * banco) si el Excel la trajo en su fila ancla (`filas.find` ya devuelve
   * esa fila — es la primera del archivo con ese CUIL). Un empleado que YA
   * existía nunca se toca acá, aunque el Excel traiga estos datos: esta
   * etapa es solo alta, no sincroniza empleados existentes.
   */
  private async crearEmpleadosFaltantes(empresaId: string, importacion: Importacion): Promise<void> {
    const cuils = importacion.cuilsUnicosValidos();
    if (cuils.length === 0) {
      return;
    }

    const existentes = await this.empleadoRepository.findAllByCuilsAndEmpresa(empresaId, cuils);
    const cuilsExistentes = new Set(existentes.map((empleado) => empleado.cuil.value));

    const datosNuevos = cuils
      .filter((cuil) => !cuilsExistentes.has(cuil))
      .map((cuil) => importacion.filas.find((fila) => fila.cuil === cuil))
      .filter((fila): fila is NonNullable<typeof fila> => fila !== undefined)
      .map((fila) => ({
        empresaId,
        nombre: fila.nombre,
        apellido: fila.apellido,
        cuil: fila.cuil,
        categoria: fila.categoria,
        fechaIngreso: parsearFechaTolerante(fila.fechaIngreso),
        legajo: fila.legajo,
        banco: fila.banco,
      }));

    await this.empleadoRepository.crearVarios(datosNuevos);
  }

  private async autoclasificar(empresaId: string, importacion: Importacion): Promise<void> {
    const conceptosSinClasificar = importacion.conceptosNormalizadosSinClasificar();
    if (conceptosSinClasificar.length === 0) {
      return;
    }

    // Una sola consulta que trae TODAS las filas sin clasificar de la
    // empresa, en vez de que `aplicarClasificacion` la repita una vez por
    // cada concepto (perfil de rendimiento, 2026-07-19).
    const [conceptosCatalogo, idsPorConcepto] = await Promise.all([
      this.catalogoConceptosRepository.findAllByEmpresa(empresaId),
      this.importacionRepository.agruparFilasSinClasificarPorConcepto(empresaId),
    ]);
    const conceptoCatalogoPorNormalizado = new Map(
      conceptosCatalogo.map((concepto) => [concepto.conceptoNormalizado(), concepto]),
    );

    await Promise.all(
      conceptosSinClasificar.map((conceptoNormalizado) => {
        const concepto = conceptoCatalogoPorNormalizado.get(conceptoNormalizado);
        const ids = idsPorConcepto.get(conceptoNormalizado);
        if (!concepto || !ids) {
          return Promise.resolve();
        }
        return this.importacionRepository.actualizarClasificacionPorIds(ids, {
          tipo: concepto.clasificacion.tipo,
          categoriaContribucion: concepto.clasificacion.categoriaContribucion,
        });
      }),
    );
  }
}
