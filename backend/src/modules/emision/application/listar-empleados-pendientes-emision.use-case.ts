import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../shared/errors/not-found-error';
import { Empleado } from '../../empleados/domain/empleado.entity';
import { EMPLEADO_REPOSITORY, EmpleadoRepository } from '../../empleados/domain/empleado.repository';
import { EMPRESA_REPOSITORY, EmpresaRepository } from '../../empresas/domain/empresa.repository';
import { IMPORTACION_REPOSITORY, ImportacionRepository } from '../../importacion/domain/importacion.repository';
import { calcularEmpleadosPendientesDeEmision } from '../domain/calcular-pendientes-emision';
import { RECIBO_REPOSITORY, ReciboRepository } from '../domain/recibo.repository';

export interface ListarEmpleadosPendientesDeEmisionInput {
  importacionId: string;
  empresaId: string;
  usuarioId: string;
}

/**
 * Empleados activos con filas válidas en esta importación que todavía no tienen
 * recibo — típicamente porque se saltearon al emitir (estaban inactivos en ese
 * momento) y después alguien los reactivó. Habilita "Emitir pendientes" en la UI
 * sin tener que reimportar el archivo (ver ADR sobre esto en DECISIONS.md).
 */
@Injectable()
export class ListarEmpleadosPendientesDeEmisionUseCase {
  constructor(
    @Inject(EMPRESA_REPOSITORY) private readonly empresaRepository: EmpresaRepository,
    @Inject(IMPORTACION_REPOSITORY) private readonly importacionRepository: ImportacionRepository,
    @Inject(EMPLEADO_REPOSITORY) private readonly empleadoRepository: EmpleadoRepository,
    @Inject(RECIBO_REPOSITORY) private readonly reciboRepository: ReciboRepository,
  ) {}

  async execute(input: ListarEmpleadosPendientesDeEmisionInput): Promise<Empleado[]> {
    const empresa = await this.empresaRepository.findByIdAndUsuario(input.empresaId, input.usuarioId);
    if (!empresa) {
      throw new NotFoundError(`Empresa "${input.empresaId}" no encontrada`);
    }

    const importacion = await this.importacionRepository.findByIdAndEmpresa(input.importacionId, empresa.id);
    if (!importacion) {
      throw new NotFoundError(`Importación "${input.importacionId}" no encontrada`);
    }

    // Antes de confirmar no hay filas definitivas ni recibos posibles todavía —
    // uso puramente informativo, así que devuelve vacío en vez de rechazar.
    if (importacion.estado !== 'confirmada') {
      return [];
    }

    const recibosExistentes = await this.reciboRepository.findAllByImportacion(importacion.id);
    const empleadosYaEmitidos = new Set(recibosExistentes.map((r) => r.empleadoId));

    const filasPorCuil = importacion.agruparFilasPorCuilValido();
    const empleadosPorCuil = new Map(
      (await this.empleadoRepository.findAllByCuilsAndEmpresa(empresa.id, [...filasPorCuil.keys()])).map(
        (empleado) => [empleado.cuil.value, empleado],
      ),
    );

    return calcularEmpleadosPendientesDeEmision(filasPorCuil, empleadosPorCuil, empleadosYaEmitidos).map(
      ({ empleado }) => empleado,
    );
  }
}
