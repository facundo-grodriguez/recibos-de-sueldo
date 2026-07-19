import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { NotFoundError } from '../../../shared/errors/not-found-error';
import { EMPRESA_REPOSITORY, EmpresaRepository } from '../../empresas/domain/empresa.repository';
import { FilaCanonica } from '../domain/fila-canonica';
import { ImportacionFila } from '../domain/importacion-fila.entity';
import { Importacion } from '../domain/importacion.entity';
import { ActualizarFilaData, IMPORTACION_REPOSITORY, ImportacionRepository } from '../domain/importacion.repository';
import { validarFilaImportacion } from '../domain/validar-fila-importacion';

export interface CambiosFilaImportacion {
  cuil?: string;
  nombre?: string;
  apellido?: string;
  concepto?: string;
  monto?: string;
  unidad?: string;
  base?: string;
}

export interface CorregirFilaImportacionInput {
  empresaId: string;
  usuarioId: string;
  importacionId: string;
  filaId: string;
  cambios: CambiosFilaImportacion;
}

/** Mezcla los cambios pedidos sobre los valores crudos actuales de la fila, para revalidarla como si fuera una fila recién parseada. */
function construirFilaCanonicaCorregida(filaActual: ImportacionFila, cambios: CambiosFilaImportacion): FilaCanonica {
  return {
    numeroFila: filaActual.numeroFila,
    cuil: cambios.cuil ?? filaActual.cuil,
    nombre: cambios.nombre ?? filaActual.nombre,
    apellido: cambios.apellido ?? filaActual.apellido,
    concepto: cambios.concepto ?? filaActual.concepto,
    monto: cambios.monto ?? filaActual.montoOriginal,
    unidad: cambios.unidad ?? filaActual.unidad ?? undefined,
    base: cambios.base ?? (filaActual.base === null ? undefined : String(filaActual.base)),
  };
}

/**
 * Corrige una fila puntual de una importación sin re-subir el archivo
 * completo. Reutiliza `validarFilaImportacion` tal cual (misma regla de
 * negocio que al importar) sobre la fila ya corregida — nunca duplica lógica
 * de validación. Como solo se toca esa fila, el resto de la importación
 * queda intacto: la "revalidación incremental" pedida es una consecuencia
 * del diseño, no una pieza aparte.
 */
@Injectable()
export class CorregirFilaImportacionUseCase {
  constructor(
    @Inject(EMPRESA_REPOSITORY) private readonly empresaRepository: EmpresaRepository,
    @Inject(IMPORTACION_REPOSITORY) private readonly importacionRepository: ImportacionRepository,
  ) {}

  async execute(input: CorregirFilaImportacionInput): Promise<Importacion> {
    const empresa = await this.empresaRepository.findByIdAndUsuario(input.empresaId, input.usuarioId);
    if (!empresa) {
      throw new NotFoundError(`Empresa "${input.empresaId}" no encontrada`);
    }

    const importacion = await this.importacionRepository.findByIdAndEmpresa(input.importacionId, empresa.id);
    if (!importacion) {
      throw new NotFoundError(`Importación "${input.importacionId}" no encontrada`);
    }

    // Igual que confirmar: una vez que la importación avanzó, corregir una
    // fila suelta ya no tiene el mismo significado (los empleados/mapeo ya
    // se resolvieron con los datos de ese momento).
    if (importacion.estado !== 'previsualizada') {
      throw new DomainError(
        `Solo se puede corregir una fila mientras la importación está en previsualización (estado actual: "${importacion.estado}")`,
      );
    }

    const filaActual = importacion.filas.find((fila) => fila.id === input.filaId);
    if (!filaActual) {
      throw new NotFoundError(`Fila "${input.filaId}" no encontrada en esta importación`);
    }

    const filaCanonica = construirFilaCanonicaCorregida(filaActual, input.cambios);
    const resultado = validarFilaImportacion(filaCanonica);

    const data: ActualizarFilaData = resultado.valida
      ? {
          cuil: resultado.datos.cuil.value,
          nombre: resultado.datos.nombre,
          apellido: resultado.datos.apellido,
          concepto: resultado.datos.concepto,
          montoOriginal: filaCanonica.monto,
          monto: resultado.datos.monto.toDecimal(),
          valida: true,
          errorMensaje: null,
          unidad: resultado.datos.unidad,
          base: resultado.datos.base,
          correcciones: resultado.datos.correcciones,
        }
      : {
          cuil: filaCanonica.cuil,
          nombre: filaCanonica.nombre,
          apellido: filaCanonica.apellido,
          concepto: filaCanonica.concepto,
          montoOriginal: filaCanonica.monto,
          monto: null,
          valida: false,
          errorMensaje: resultado.error,
        };

    return this.importacionRepository.actualizarFila(input.filaId, data);
  }
}
