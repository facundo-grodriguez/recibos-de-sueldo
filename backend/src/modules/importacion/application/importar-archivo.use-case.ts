import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { NotFoundError } from '../../../shared/errors/not-found-error';
import { EMPRESA_REPOSITORY, EmpresaRepository } from '../../empresas/domain/empresa.repository';
import {
  CONECTOR_IMPORTACION_EXCEL,
  ConectorImportacion,
  EXTENSION_ARCHIVO_OFICIAL,
} from '../domain/conector-importacion';
import { Importacion } from '../domain/importacion.entity';
import {
  CrearImportacionFilaData,
  IMPORTACION_REPOSITORY,
  ImportacionRepository,
} from '../domain/importacion.repository';
import { validarFilaImportacion } from '../domain/validar-fila-importacion';

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
  ) {}

  async execute(input: ImportarArchivoInput): Promise<Importacion> {
    const empresa = await this.empresaRepository.findByIdAndUsuario(input.empresaId, input.usuarioId);
    if (!empresa) {
      throw new NotFoundError(`Empresa "${input.empresaId}" no encontrada`);
    }

    this.validarExtensionOficial(input.nombreArchivo);
    const filasCanonicas = await this.conectorExcel.parse(input.contenido);
    const filas: CrearImportacionFilaData[] = filasCanonicas.map((fila) => {
      const resultado = validarFilaImportacion(fila);

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
          correcciones: resultado.datos.correcciones,
        };
      }

      return {
        numeroFila: fila.numeroFila,
        cuil: fila.cuil,
        nombre: fila.nombre,
        apellido: fila.apellido,
        concepto: fila.concepto,
        montoOriginal: fila.monto,
        monto: null,
        valida: false,
        errorMensaje: resultado.error,
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
