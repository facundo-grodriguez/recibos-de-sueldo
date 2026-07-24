import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { NotFoundError } from '../../../shared/errors/not-found-error';
import { EMPLEADO_REPOSITORY, EmpleadoRepository } from '../../empleados/domain/empleado.repository';
import {
  indexarEmpleadosConocidos,
  normalizarCuil,
  reconocerEmpleado,
} from '../../empleados/domain/reconocer-empleado';
import { EMPRESA_REPOSITORY, EmpresaRepository } from '../../empresas/domain/empresa.repository';
import {
  CONECTOR_IMPORTACION_EXCEL,
  ConectorImportacion,
  CorreccionAdaptador,
  EXTENSION_ARCHIVO_OFICIAL,
} from '../domain/conector-importacion';
import { Importacion } from '../domain/importacion.entity';
import {
  CrearImportacionFilaData,
  IMPORTACION_REPOSITORY,
  ImportacionRepository,
} from '../domain/importacion.repository';
import { validarFilaImportacion } from '../domain/validar-fila-importacion';

/**
 * Ficha del empleado (etapa "primera importación", ver FilaCanonica): dato
 * crudo opcional → texto recortado o `null` si vino vacío/ausente. Mismo
 * criterio que `unidad`/`base` en `validar-fila-importacion.ts`, pero estos 4
 * campos no participan de la validación de la fila (nunca bloquean, no son
 * datos de liquidación) — por eso se normalizan acá y no ahí.
 */
function datoFichaOpcional(valor: string | undefined): string | null {
  const texto = valor?.trim();
  return texto ? texto : null;
}

export interface ImportarArchivoInput {
  empresaId: string;
  usuarioId: string;
  anio: number;
  mes: number;
  nombreArchivo: string;
  contenido: Buffer;
}

@Injectable()
export class ImportarArchivoUseCase {
  constructor(
    @Inject(EMPRESA_REPOSITORY) private readonly empresaRepository: EmpresaRepository,
    @Inject(IMPORTACION_REPOSITORY) private readonly importacionRepository: ImportacionRepository,
    @Inject(CONECTOR_IMPORTACION_EXCEL) private readonly conectorExcel: ConectorImportacion,
    @Inject(EMPLEADO_REPOSITORY) private readonly empleadoRepository: EmpleadoRepository,
  ) {}

  async execute(input: ImportarArchivoInput): Promise<Importacion> {
    const empresa = await this.empresaRepository.findByIdAndUsuario(input.empresaId, input.usuarioId);
    if (!empresa) {
      throw new NotFoundError(`Empresa "${input.empresaId}" no encontrada`);
    }

    this.validarExtensionOficial(input.nombreArchivo);
    const { filas: filasCanonicas, correcciones: correccionesAdaptador } = await this.conectorExcel.parse(
      input.contenido,
    );
    const correccionesAdaptadorPorFila = this.agruparCorreccionesPorFila(correccionesAdaptador);

    // Reconocimiento de empleado (ADR-077/078): una sola consulta trae los empleados ya
    // registrados de la empresa que coinciden con algún CUIL del archivo, para completar
    // nombre/apellido de las filas que ya los tienen guardados — "pedir una sola vez".
    const cuilsDelArchivo = [...new Set(filasCanonicas.map((fila) => normalizarCuil(fila.cuil)))].filter(
      (cuil) => cuil.length > 0,
    );
    const empleadosConocidos =
      cuilsDelArchivo.length > 0
        ? await this.empleadoRepository.findAllByCuilsAndEmpresa(empresa.id, cuilsDelArchivo)
        : [];
    const indiceEmpleados = indexarEmpleadosConocidos(
      empleadosConocidos.map((empleado) => ({
        cuil: empleado.cuil.value,
        nombre: empleado.nombre,
        apellido: empleado.apellido,
        estado: empleado.estado,
      })),
    );

    const filas: CrearImportacionFilaData[] = filasCanonicas.map((fila) => {
      const reconocimiento = reconocerEmpleado(
        { cuil: fila.cuil, nombre: fila.nombre, apellido: fila.apellido },
        indiceEmpleados,
      );
      const filaReconocida = { ...fila, ...reconocimiento.identidad };
      const resultado = validarFilaImportacion(filaReconocida);
      const correccionesDeEstaFila = [
        ...(correccionesAdaptadorPorFila.get(fila.numeroFila) ?? []),
        ...reconocimiento.correcciones,
      ];

      if (resultado.valida) {
        return {
          numeroFila: fila.numeroFila,
          cuil: resultado.datos.cuil.value,
          nombre: resultado.datos.nombre,
          apellido: resultado.datos.apellido,
          concepto: resultado.datos.concepto,
          montoOriginal: fila.monto,
          monto: resultado.datos.monto.toDecimal(),
          valida: true,
          errorMensaje: null,
          unidad: resultado.datos.unidad,
          base: resultado.datos.base,
          correcciones: [...correccionesDeEstaFila, ...resultado.datos.correcciones],
          legajo: datoFichaOpcional(fila.legajo),
          categoria: datoFichaOpcional(fila.categoria),
          fechaIngreso: datoFichaOpcional(fila.fechaIngreso),
          banco: datoFichaOpcional(fila.banco),
        };
      }

      return {
        numeroFila: fila.numeroFila,
        cuil: filaReconocida.cuil,
        nombre: filaReconocida.nombre,
        apellido: filaReconocida.apellido,
        concepto: filaReconocida.concepto,
        montoOriginal: fila.monto,
        monto: null,
        valida: false,
        errorMensaje: resultado.error,
        correcciones: correccionesDeEstaFila,
        legajo: datoFichaOpcional(fila.legajo),
        categoria: datoFichaOpcional(fila.categoria),
        fechaIngreso: datoFichaOpcional(fila.fechaIngreso),
        banco: datoFichaOpcional(fila.banco),
      };
    });

    return this.importacionRepository.create({
      empresaId: empresa.id,
      usuarioId: input.usuarioId,
      anio: input.anio,
      mes: input.mes,
      nombreArchivo: input.nombreArchivo,
      filas,
    });
  }

  /** Agrupa por fila las correcciones que reportó el adaptador (ADR-072), para fusionarlas con las de validación. */
  private agruparCorreccionesPorFila(correcciones: CorreccionAdaptador[]): Map<number, string[]> {
    const porFila = new Map<number, string[]>();
    for (const correccion of correcciones) {
      const existentes = porFila.get(correccion.numeroFila) ?? [];
      existentes.push(correccion.mensaje);
      porFila.set(correccion.numeroFila, existentes);
    }
    return porFila;
  }

  /** Único formato oficial de entrada (ver ConectorImportacion) — rechaza cualquier otro con un mensaje claro. */
  private validarExtensionOficial(nombreArchivo: string): void {
    const extension = nombreArchivo.split('.').pop()?.toLowerCase() ?? '';
    if (extension !== EXTENSION_ARCHIVO_OFICIAL) {
      throw new DomainError(
        `Formato de archivo no soportado: ".${extension}". Formato aceptado: .xlsx (Excel Oficial de Importación v1)`,
      );
    }
  }
}
