import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { NotFoundError } from '../../../shared/errors/not-found-error';
import { EMPRESA_REPOSITORY, EmpresaRepository } from '../../empresas/domain/empresa.repository';
import { CambiosFilaImportacion, construirFilaCanonicaCorregida } from '../domain/construir-fila-canonica-corregida';
import { ImportacionFila } from '../domain/importacion-fila.entity';
import { Importacion } from '../domain/importacion.entity';
import { ActualizarFilaData, IMPORTACION_REPOSITORY, ImportacionRepository } from '../domain/importacion.repository';
import { validarFilaImportacion } from '../domain/validar-fila-importacion';

export type { CambiosFilaImportacion };

/** Campos de identidad del empleado — se propagan a todas sus líneas; el resto (concepto/monto/...) es por línea. */
const CAMPOS_IDENTIDAD = ['cuil', 'nombre', 'apellido'] as const;

export interface CorregirFilaImportacionInput {
  empresaId: string;
  usuarioId: string;
  importacionId: string;
  filaId: string;
  cambios: CambiosFilaImportacion;
}

/**
 * Corrige una fila de una importación sin re-subir el archivo completo.
 * Reutiliza `validarFilaImportacion` tal cual (misma regla de negocio que al
 * importar) sobre la fila ya corregida — nunca duplica lógica de validación.
 *
 * Un dato de **identidad** (CUIL/nombre/apellido) pertenece a la persona, no a
 * la línea: corregirlo se propaga a **todas** las filas de esa persona (mismo
 * CUIL actual — mismo criterio que agrupa la vista de revisión), revalidando
 * cada una por separado. Concepto/monto/unidad/base son por línea: solo tocan
 * la fila editada.
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
    // fila suelta ya no tiene el mismo significado (los empleados/catálogo ya
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

    const cambiosIdentidad = this.soloIdentidad(input.cambios);
    const propagaIdentidad = Object.keys(cambiosIdentidad).length > 0;

    if (!propagaIdentidad) {
      // Sin cambio de identidad, solo la fila editada — comportamiento de siempre.
      const data = this.revalidar(filaActual, input.cambios);
      return this.importacionRepository.actualizarVariasFilas([{ filaId: filaActual.id, data }]);
    }

    // La identidad cambió: aplicar a todas las líneas de esa persona (mismo
    // CUIL actual). A la fila editada, todos los cambios; a las demás, solo la
    // identidad (conservan su propio concepto/monto/unidad/base).
    const cuilViejo = filaActual.cuil.trim();
    const grupo = importacion.filas.filter((fila) => fila.cuil.trim() === cuilViejo);
    const numeroFilaAncla = Math.min(...grupo.map((fila) => fila.numeroFila));

    const cambios = grupo.map((fila) => {
      const cambiosDeEstaFila = fila.id === filaActual.id ? input.cambios : cambiosIdentidad;
      // El aviso de normalización de identidad se emite una sola vez, en la
      // ancla (ADR-072, Opción B): las demás filas se revalidan como heredadas.
      const identidadHeredada = fila.numeroFila !== numeroFilaAncla;
      return { filaId: fila.id, data: this.revalidar(fila, cambiosDeEstaFila, identidadHeredada) };
    });

    return this.importacionRepository.actualizarVariasFilas(cambios);
  }

  /** Subconjunto de `cambios` que toca la identidad del empleado (los que efectivamente vinieron). */
  private soloIdentidad(cambios: CambiosFilaImportacion): CambiosFilaImportacion {
    const identidad: CambiosFilaImportacion = {};
    for (const campo of CAMPOS_IDENTIDAD) {
      if (cambios[campo] !== undefined) {
        identidad[campo] = cambios[campo];
      }
    }
    return identidad;
  }

  /** Revalida una fila con los cambios aplicados y arma el dato a persistir (misma regla que al importar). */
  private revalidar(
    fila: ImportacionFila,
    cambios: CambiosFilaImportacion,
    identidadHeredada?: boolean,
  ): ActualizarFilaData {
    const filaCanonica = construirFilaCanonicaCorregida(fila, cambios, identidadHeredada);
    const resultado = validarFilaImportacion(filaCanonica);

    if (resultado.valida) {
      return {
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
      };
    }

    return {
      cuil: filaCanonica.cuil,
      nombre: filaCanonica.nombre,
      apellido: filaCanonica.apellido,
      concepto: filaCanonica.concepto,
      montoOriginal: filaCanonica.monto,
      monto: null,
      valida: false,
      errorMensaje: resultado.error,
    };
  }
}
