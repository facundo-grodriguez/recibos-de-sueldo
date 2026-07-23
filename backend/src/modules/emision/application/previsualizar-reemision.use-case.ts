import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { NotFoundError } from '../../../shared/errors/not-found-error';
import { EMPLEADO_REPOSITORY, EmpleadoRepository } from '../../empleados/domain/empleado.repository';
import { EMPRESA_REPOSITORY, EmpresaRepository } from '../../empresas/domain/empresa.repository';
import { ImportacionFila } from '../../importacion/domain/importacion-fila.entity';
import { IMPORTACION_REPOSITORY, ImportacionRepository } from '../../importacion/domain/importacion.repository';
import { RECIBO_REPOSITORY, ReciboRepository } from '../domain/recibo.repository';

export interface PrevisualizarReemisionInput {
  empresaId: string;
  usuarioId: string;
  importacionId: string;
  reciboId: string;
}

/**
 * Muestra, sin generar nada todavía, las filas que se usarían para reemitir
 * un recibo anulado — para que el usuario pueda revisar y corregir antes de
 * confirmar (ver ReemitirReciboUseCase.aplicarAjustes: la corrección se
 * aplica solo al recibo nuevo, nunca a estas filas de origen).
 */
@Injectable()
export class PrevisualizarReemisionUseCase {
  constructor(
    @Inject(EMPRESA_REPOSITORY) private readonly empresaRepository: EmpresaRepository,
    @Inject(IMPORTACION_REPOSITORY) private readonly importacionRepository: ImportacionRepository,
    @Inject(EMPLEADO_REPOSITORY) private readonly empleadoRepository: EmpleadoRepository,
    @Inject(RECIBO_REPOSITORY) private readonly reciboRepository: ReciboRepository,
  ) {}

  async execute(input: PrevisualizarReemisionInput): Promise<ImportacionFila[]> {
    const empresa = await this.empresaRepository.findByIdAndUsuario(input.empresaId, input.usuarioId);
    if (!empresa) {
      throw new NotFoundError(`Empresa "${input.empresaId}" no encontrada`);
    }

    const importacion = await this.importacionRepository.findByIdAndEmpresa(input.importacionId, empresa.id);
    if (!importacion) {
      throw new NotFoundError(`Importación "${input.importacionId}" no encontrada`);
    }

    const reciboAnulado = await this.reciboRepository.findByIdAndImportacion(input.reciboId, importacion.id);
    if (!reciboAnulado) {
      throw new NotFoundError(`Recibo "${input.reciboId}" no encontrado`);
    }

    if (reciboAnulado.estaVigente()) {
      throw new DomainError('Solo se puede previsualizar la reemisión de un recibo anulado');
    }

    const empleado = await this.empleadoRepository.findByIdAndEmpresa(reciboAnulado.empleadoId, empresa.id);
    if (!empleado) {
      throw new NotFoundError(`Empleado "${reciboAnulado.empleadoId}" no encontrado`);
    }

    const filas = importacion.agruparFilasPorCuilValido().get(empleado.cuil.value);
    if (!filas || filas.length === 0) {
      throw new DomainError('No se encontraron filas de esta importación para el empleado');
    }

    return filas;
  }
}
