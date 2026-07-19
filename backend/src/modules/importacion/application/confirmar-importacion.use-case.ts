import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { NotFoundError } from '../../../shared/errors/not-found-error';
import { EMPLEADO_REPOSITORY, EmpleadoRepository } from '../../empleados/domain/empleado.repository';
import { EMPRESA_REPOSITORY, EmpresaRepository } from '../../empresas/domain/empresa.repository';
import { PERFIL_MAPEO_REPOSITORY, PerfilMapeoRepository } from '../../mapeo/domain/perfil-mapeo.repository';
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
    @Inject(PERFIL_MAPEO_REPOSITORY) private readonly perfilMapeoRepository: PerfilMapeoRepository,
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

    for (const cuil of importacion.cuilsUnicosValidos()) {
      const existente = await this.empleadoRepository.findByCuilAndEmpresa(empresa.id, cuil);
      if (!existente) {
        const filaEjemplo = importacion.filas.find((fila) => fila.cuil === cuil);
        if (!filaEjemplo) {
          continue;
        }
        await this.empleadoRepository.create({
          empresaId: empresa.id,
          nombre: filaEjemplo.nombre,
          apellido: filaEjemplo.apellido,
          cuil,
        });
      }
    }

    // Mapeo automático (Fase 2): los conceptos que la empresa ya mapeó antes
    // se clasifican solos; los que nunca vio quedan sin clasificar, visibles
    // como pendientes, sin bloquear esta confirmación (ver ADR correspondiente).
    await this.autoclasificar(empresa.id, importacion);

    return this.importacionRepository.marcarConfirmada(importacion.id);
  }

  private async autoclasificar(empresaId: string, importacion: Importacion): Promise<void> {
    const conceptosSinClasificar = importacion.conceptosNormalizadosSinClasificar();
    if (conceptosSinClasificar.length === 0) {
      return;
    }

    const perfiles = await this.perfilMapeoRepository.findAllByEmpresa(empresaId);
    const perfilPorConcepto = new Map(perfiles.map((perfil) => [perfil.conceptoNormalizado(), perfil]));

    for (const conceptoNormalizado of conceptosSinClasificar) {
      const perfil = perfilPorConcepto.get(conceptoNormalizado);
      if (perfil) {
        await this.importacionRepository.aplicarClasificacion(empresaId, conceptoNormalizado, {
          tipo: perfil.clasificacion.tipo,
          categoriaContribucion: perfil.clasificacion.categoriaContribucion,
        });
      }
    }
  }
}
