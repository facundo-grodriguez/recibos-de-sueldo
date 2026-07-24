import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../shared/errors/not-found-error';
import { Empleado } from '../../empleados/domain/empleado.entity';
import { EMPLEADO_REPOSITORY, EmpleadoRepository } from '../../empleados/domain/empleado.repository';
import { EMPRESA_REPOSITORY, EmpresaRepository } from '../../empresas/domain/empresa.repository';
import { Importacion } from '../../importacion/domain/importacion.entity';
import { IMPORTACION_REPOSITORY, ImportacionRepository } from '../../importacion/domain/importacion.repository';
import { calcularTotalesEmpleado } from '../domain/calcular-totales-empleado';
import { evaluarReglasEmpleado, FichaEmpleadoValidacion } from '../domain/evaluar-reglas-empleado';
import { ResultadoValidacionEmpleado, ResultadoValidacionImportacion } from '../domain/resultado-validacion';

export interface ValidarImportacionInput {
  importacionId: string;
  empresaId: string;
  usuarioId: string;
}

@Injectable()
export class ValidarImportacionUseCase {
  constructor(
    @Inject(EMPRESA_REPOSITORY) private readonly empresaRepository: EmpresaRepository,
    @Inject(IMPORTACION_REPOSITORY) private readonly importacionRepository: ImportacionRepository,
    @Inject(EMPLEADO_REPOSITORY) private readonly empleadoRepository: EmpleadoRepository,
  ) {}

  async execute(input: ValidarImportacionInput): Promise<ResultadoValidacionImportacion> {
    const empresa = await this.empresaRepository.findByIdAndUsuario(input.empresaId, input.usuarioId);
    if (!empresa) {
      throw new NotFoundError(`Empresa "${input.empresaId}" no encontrada`);
    }

    const importacion = await this.importacionRepository.findByIdAndEmpresa(input.importacionId, empresa.id);
    if (!importacion) {
      throw new NotFoundError(`Importación "${input.importacionId}" no encontrada`);
    }

    const erroresGlobales: string[] = [];
    if (importacion.conceptosNormalizadosSinClasificar().length > 0) {
      erroresGlobales.push('Hay conceptos sin clasificar. Definí su mapeo antes de continuar.');
    }

    // Domicilio del empleador es parte de la información mínima para
    // reconstruir el Anexo III (docs/modelo-funcional-anexo-iii.md, sección
    // 10) — a diferencia de categoría/fecha de ingreso (por empleado, más
    // abajo), este es un dato único de la empresa, así que bloquea a nivel
    // global en vez de repetirse por cada empleado.
    if (!empresa.domicilio?.trim()) {
      erroresGlobales.push(
        'La empresa no tiene domicilio cargado; completalo en la ficha de la empresa antes de emitir recibos.',
      );
    }

    const anteriores = await this.importacionRepository.findConfirmadasAnteriores(
      empresa.id,
      importacion.anio,
      importacion.mes,
    );

    const cuils = [...importacion.agruparFilasPorCuilValido().keys()];
    const empleadosPorCuil = new Map(
      (await this.empleadoRepository.findAllByCuilsAndEmpresa(empresa.id, cuils)).map((empleado) => [
        empleado.cuil.value,
        empleado,
      ]),
    );

    const empleados: ResultadoValidacionEmpleado[] = [];
    for (const [cuil, filas] of importacion.agruparFilasPorCuilValido()) {
      const totales = calcularTotalesEmpleado(filas);
      const netoAnterior = this.buscarNetoAnterior(anteriores, cuil);
      const ficha = this.fichaParaValidar(empleadosPorCuil.get(cuil));
      const { errores, advertencias } = evaluarReglasEmpleado(totales, netoAnterior, ficha);

      empleados.push({
        cuil,
        nombre: filas[0].nombre,
        apellido: filas[0].apellido,
        totales,
        errores,
        advertencias,
      });
    }

    const puedeEmitirse =
      erroresGlobales.length === 0 && empleados.every((empleado) => empleado.errores.length === 0);

    return { importacionId: importacion.id, puedeEmitirse, erroresGlobales, empleados };
  }

  /**
   * `null` = no corresponde validar la ficha: empleado inactivo (no se le
   * emite recibo, ver `EmitirRecibosUseCase`) — bloquear por su ficha
   * incompleta sería un falso bloqueo para el resto de la emisión. Si el
   * empleado no se encontró (no debería ocurrir: `confirmar-importacion`
   * garantiza el alta), se trata como ficha vacía en vez de omitir la
   * validación en silencio.
   */
  private fichaParaValidar(empleado: Empleado | undefined): FichaEmpleadoValidacion | null {
    if (empleado && empleado.estado === 'inactivo') {
      return null;
    }
    return {
      categoria: empleado?.categoria ?? null,
      fechaIngreso: empleado?.fechaIngreso ?? null,
      legajo: empleado?.legajo ?? null,
      banco: empleado?.banco ?? null,
    };
  }

  /**
   * Busca, desde la más reciente hacia atrás, la primera importación anterior
   * donde este empleado esté 100% clasificado — para no comparar contra un
   * neto parcial/engañoso. Si ninguna califica, no hay base de comparación.
   */
  private buscarNetoAnterior(anteriores: Importacion[], cuil: string): number | null {
    for (const anterior of anteriores) {
      const filasDelCuil = anterior.agruparFilasPorCuilValido().get(cuil);
      if (!filasDelCuil || filasDelCuil.length === 0) {
        continue;
      }
      const todasClasificadas = filasDelCuil.every((fila) => fila.estaClasificada());
      if (!todasClasificadas) {
        continue;
      }
      return calcularTotalesEmpleado(filasDelCuil).neto;
    }
    return null;
  }
}
