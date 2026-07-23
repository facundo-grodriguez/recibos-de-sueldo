import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_LOG_REPOSITORY, AuditLogRepository } from '../../../infra/auditoria/audit-log.repository';
import { DomainError } from '../../../shared/errors/domain-error';
import { NotFoundError } from '../../../shared/errors/not-found-error';
import { ValidarImportacionUseCase } from '../../validacion/application/validar-importacion.use-case';
import { EMPLEADO_REPOSITORY, EmpleadoRepository } from '../../empleados/domain/empleado.repository';
import { EMPRESA_REPOSITORY, EmpresaRepository } from '../../empresas/domain/empresa.repository';
import {
  CambiosFilaImportacion,
  construirFilaCanonicaCorregida,
} from '../../importacion/domain/construir-fila-canonica-corregida';
import { ImportacionFila } from '../../importacion/domain/importacion-fila.entity';
import { IMPORTACION_REPOSITORY, ImportacionRepository } from '../../importacion/domain/importacion.repository';
import { validarFilaImportacion } from '../../importacion/domain/validar-fila-importacion';
import { ALMACENAMIENTO_RECIBOS, AlmacenamientoRecibos } from '../domain/almacenamiento-recibos';
import { construirSnapshotRecibo } from '../domain/construir-snapshot-recibo';
import { GENERADOR_PDF, GeneradorPdf } from '../domain/generador-pdf';
import { Recibo } from '../domain/recibo.entity';
import { RECIBO_REPOSITORY, ReciboRepository } from '../domain/recibo.repository';

export interface AjusteFilaReemision {
  filaId: string;
  cambios: CambiosFilaImportacion;
}

export interface ReemitirReciboInput {
  empresaId: string;
  usuarioId: string;
  importacionId: string;
  reciboId: string;
  /**
   * Correcciones puntuales para este recibo de reemplazo únicamente (ADR-071:
   * la fila original de la importación nunca se toca, queda intacta para
   * siempre — ver `aplicarAjustes`). Si una fila ajustada queda inválida,
   * se rechaza toda la reemisión antes de generar nada.
   */
  ajustes?: AjusteFilaReemision[];
}

@Injectable()
export class ReemitirReciboUseCase {
  constructor(
    @Inject(EMPRESA_REPOSITORY) private readonly empresaRepository: EmpresaRepository,
    @Inject(IMPORTACION_REPOSITORY) private readonly importacionRepository: ImportacionRepository,
    @Inject(EMPLEADO_REPOSITORY) private readonly empleadoRepository: EmpleadoRepository,
    @Inject(RECIBO_REPOSITORY) private readonly reciboRepository: ReciboRepository,
    @Inject(GENERADOR_PDF) private readonly generadorPdf: GeneradorPdf,
    @Inject(ALMACENAMIENTO_RECIBOS) private readonly almacenamiento: AlmacenamientoRecibos,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogRepository: AuditLogRepository,
    private readonly validarImportacion: ValidarImportacionUseCase,
  ) {}

  async execute(input: ReemitirReciboInput): Promise<Recibo> {
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
      throw new DomainError('Solo se puede reemitir un recibo anulado; anulalo primero');
    }

    const reemplazoExistente = await this.reciboRepository.findByReemplazaAId(reciboAnulado.id);
    if (reemplazoExistente) {
      throw new DomainError('Este recibo ya fue reemitido');
    }

    const empleado = await this.empleadoRepository.findByIdAndEmpresa(reciboAnulado.empleadoId, empresa.id);
    if (!empleado) {
      throw new NotFoundError(`Empleado "${reciboAnulado.empleadoId}" no encontrado`);
    }

    const resultadoValidacion = await this.validarImportacion.execute({
      importacionId: importacion.id,
      empresaId: empresa.id,
      usuarioId: input.usuarioId,
    });
    const resultadoEmpleado = resultadoValidacion.empleados.find((e) => e.cuil === empleado.cuil.value);
    if (resultadoValidacion.erroresGlobales.length > 0 || !resultadoEmpleado || resultadoEmpleado.errores.length > 0) {
      throw new DomainError(
        'Los datos actuales de la importación no pasan la validación; corregilos antes de reemitir',
      );
    }

    const filasOriginales = importacion.agruparFilasPorCuilValido().get(empleado.cuil.value);
    if (!filasOriginales || filasOriginales.length === 0) {
      throw new DomainError('No se encontraron filas de esta importación para el empleado');
    }

    const filas = this.aplicarAjustes(filasOriginales, input.ajustes ?? []);

    // tieneDatosDeEmisionCompletos() ya se cumplió en la emisión original: el
    // período no cambia al corregir, así que estos 4 campos siguen completos.
    const datosEmision = {
      fechaPago: importacion.fechaPago as Date,
      lugarPago: importacion.lugarPago as string,
      fechaPagoCargasSociales: importacion.fechaPagoCargasSociales as Date,
      lugarPagoCargasSociales: importacion.lugarPagoCargasSociales as string,
    };

    const snapshot = construirSnapshotRecibo({
      empresa: {
        razonSocial: empresa.razonSocial,
        cuit: empresa.cuit.formatted,
        domicilio: empresa.domicilio,
        localidad: empresa.localidad,
        provincia: empresa.provincia,
        codigoPostal: empresa.codigoPostal,
      },
      empleado: {
        nombre: empleado.nombre,
        apellido: empleado.apellido,
        cuil: empleado.cuil.formatted,
        categoria: empleado.categoria,
        fechaIngreso: empleado.fechaIngreso,
        legajo: empleado.legajo,
        banco: empleado.banco,
      },
      periodo: { anio: importacion.anio, mes: importacion.mes, ...datosEmision },
      filas,
      // Mismo criterio que la emisión original (ver EmitirRecibosUseCase): la
      // antigüedad es "a la fecha de pago del período", no al momento real de
      // reemitir — un reemplazo meses después no debe mostrar una antigüedad
      // distinta a la del recibo que reemplaza.
      fechaReferencia: datosEmision.fechaPago,
    });

    const numero = (await this.reciboRepository.contarPorEmpresa(empresa.id)) + 1;

    const pdf = await this.generadorPdf.generar(snapshot);
    const hashIntegridad = createHash('sha256').update(pdf).digest('hex');
    const pdfPath = await this.almacenamiento.guardar({
      empresaId: empresa.id,
      importacionId: importacion.id,
      empleadoId: empleado.id,
      numero,
      contenido: pdf,
    });

    const reciboNuevo = await this.reciboRepository.create({
      importacionId: importacion.id,
      empleadoId: empleado.id,
      numero,
      snapshot,
      pdfPath,
      hashIntegridad,
      reemplazaAId: reciboAnulado.id,
    });

    if (input.ajustes && input.ajustes.length > 0) {
      await this.auditarAjustes(reciboNuevo.id, input.usuarioId, filasOriginales, input.ajustes);
    }

    return reciboNuevo;
  }

  /**
   * Aplica las correcciones puntuales pedidas para este reemplazo, revalidando
   * cada fila tocada con la misma regla de negocio de siempre
   * (`validarFilaImportacion`) — nunca se persiste sobre `ImportacionFila`
   * (ADR-071: la importación original es inmutable). Si algún ajuste deja una
   * fila inválida, se rechaza toda la reemisión antes de generar el PDF.
   */
  private aplicarAjustes(
    filasOriginales: ImportacionFila[],
    ajustes: AjusteFilaReemision[],
  ): ImportacionFila[] {
    if (ajustes.length === 0) {
      return filasOriginales;
    }

    const ajustesPorFilaId = new Map(ajustes.map((ajuste) => [ajuste.filaId, ajuste.cambios]));

    return filasOriginales.map((fila) => {
      const cambios = ajustesPorFilaId.get(fila.id);
      if (!cambios) {
        return fila;
      }

      const filaCanonica = construirFilaCanonicaCorregida(fila, cambios);
      const resultado = validarFilaImportacion(filaCanonica);
      if (!resultado.valida) {
        throw new DomainError(`Fila ${fila.numeroFila}: ${resultado.error}`);
      }

      return ImportacionFila.create({
        id: fila.id,
        numeroFila: fila.numeroFila,
        cuil: resultado.datos.cuil.value,
        nombre: resultado.datos.nombre,
        apellido: resultado.datos.apellido,
        concepto: resultado.datos.concepto,
        montoOriginal: filaCanonica.monto,
        monto: resultado.datos.monto.toDecimal(),
        valida: true,
        errorMensaje: null,
        clasificacion: fila.clasificacion,
        unidad: resultado.datos.unidad,
        base: resultado.datos.base,
        correcciones: resultado.datos.correcciones,
      });
    });
  }

  /** Deja constancia de qué se ajustó en este reemplazo puntual — la fila de origen no cambia, así que sin esto se perdería el rastro del porqué el recibo nuevo difiere del anulado. */
  private async auditarAjustes(
    reciboId: string,
    usuarioId: string,
    filasOriginales: ImportacionFila[],
    ajustes: AjusteFilaReemision[],
  ): Promise<void> {
    const filasPorId = new Map(filasOriginales.map((fila) => [fila.id, fila]));

    for (const ajuste of ajustes) {
      const filaOriginal = filasPorId.get(ajuste.filaId);
      await this.auditLogRepository.create({
        entidad: 'Recibo',
        entidadId: reciboId,
        accion: 'ajuste-reemision',
        usuarioId,
        campo: `fila-${filaOriginal?.numeroFila ?? ajuste.filaId}`,
        valorAnterior: filaOriginal
          ? JSON.stringify({
              cuil: filaOriginal.cuil,
              nombre: filaOriginal.nombre,
              apellido: filaOriginal.apellido,
              concepto: filaOriginal.concepto,
              monto: filaOriginal.montoOriginal,
              unidad: filaOriginal.unidad,
              base: filaOriginal.base,
            })
          : null,
        valorNuevo: JSON.stringify(ajuste.cambios),
      });
    }
  }
}
