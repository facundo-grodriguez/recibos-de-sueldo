import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { NotFoundError } from '../../../shared/errors/not-found-error';
import { ValidarImportacionUseCase } from '../../validacion/application/validar-importacion.use-case';
import { EMPLEADO_REPOSITORY, EmpleadoRepository } from '../../empleados/domain/empleado.repository';
import { EMPRESA_REPOSITORY, EmpresaRepository } from '../../empresas/domain/empresa.repository';
import { IMPORTACION_REPOSITORY, ImportacionRepository } from '../../importacion/domain/importacion.repository';
import { ALMACENAMIENTO_RECIBOS, AlmacenamientoRecibos } from '../domain/almacenamiento-recibos';
import { construirSnapshotRecibo } from '../domain/construir-snapshot-recibo';
import { GENERADOR_PDF, GeneradorPdf } from '../domain/generador-pdf';
import { Recibo } from '../domain/recibo.entity';
import { RECIBO_REPOSITORY, ReciboRepository } from '../domain/recibo.repository';

export interface EmitirRecibosInput {
  importacionId: string;
  empresaId: string;
  usuarioId: string;
}

@Injectable()
export class EmitirRecibosUseCase {
  constructor(
    @Inject(EMPRESA_REPOSITORY) private readonly empresaRepository: EmpresaRepository,
    @Inject(IMPORTACION_REPOSITORY) private readonly importacionRepository: ImportacionRepository,
    @Inject(EMPLEADO_REPOSITORY) private readonly empleadoRepository: EmpleadoRepository,
    @Inject(RECIBO_REPOSITORY) private readonly reciboRepository: ReciboRepository,
    @Inject(GENERADOR_PDF) private readonly generadorPdf: GeneradorPdf,
    @Inject(ALMACENAMIENTO_RECIBOS) private readonly almacenamiento: AlmacenamientoRecibos,
    private readonly validarImportacion: ValidarImportacionUseCase,
  ) {}

  async execute(input: EmitirRecibosInput): Promise<Recibo[]> {
    const empresa = await this.empresaRepository.findByIdAndUsuario(input.empresaId, input.usuarioId);
    if (!empresa) {
      throw new NotFoundError(`Empresa "${input.empresaId}" no encontrada`);
    }

    const importacion = await this.importacionRepository.findByIdAndEmpresa(input.importacionId, empresa.id);
    if (!importacion) {
      throw new NotFoundError(`Importación "${input.importacionId}" no encontrada`);
    }

    if (importacion.estado !== 'confirmada') {
      throw new DomainError('La importación debe estar confirmada antes de emitir recibos');
    }

    if (!importacion.tieneDatosDeEmisionCompletos()) {
      throw new DomainError(
        'Faltan completar los datos de emisión (fecha y lugar de pago, fecha y lugar de pago de cargas sociales) antes de emitir',
      );
    }

    const recibosExistentes = await this.reciboRepository.findAllByImportacion(importacion.id);
    if (recibosExistentes.length > 0) {
      throw new DomainError('Ya se emitieron recibos para esta importación');
    }

    const resultadoValidacion = await this.validarImportacion.execute({
      importacionId: importacion.id,
      empresaId: empresa.id,
      usuarioId: input.usuarioId,
    });
    if (!resultadoValidacion.puedeEmitirse) {
      throw new DomainError(
        'La importación tiene errores de validación pendientes; corregilos antes de emitir',
      );
    }

    // tieneDatosDeEmisionCompletos() ya garantizó que estos 4 campos no son null.
    const datosEmision = {
      fechaPago: importacion.fechaPago as Date,
      lugarPago: importacion.lugarPago as string,
      fechaPagoCargasSociales: importacion.fechaPagoCargasSociales as Date,
      lugarPagoCargasSociales: importacion.lugarPagoCargasSociales as string,
    };

    let numeroSiguiente = (await this.reciboRepository.contarPorEmpresa(empresa.id)) + 1;
    const ahora = new Date();
    const recibosCreados: Recibo[] = [];

    for (const [cuil, filas] of importacion.agruparFilasPorCuilValido()) {
      const empleado = await this.empleadoRepository.findByCuilAndEmpresa(empresa.id, cuil);
      if (!empleado || empleado.estado === 'inactivo') {
        continue;
      }

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
        fechaReferencia: ahora,
      });

      const pdf = await this.generadorPdf.generar(snapshot);
      const hashIntegridad = createHash('sha256').update(pdf).digest('hex');
      const pdfPath = await this.almacenamiento.guardar({
        empresaId: empresa.id,
        importacionId: importacion.id,
        empleadoId: empleado.id,
        numero: numeroSiguiente,
        contenido: pdf,
      });

      const recibo = await this.reciboRepository.create({
        importacionId: importacion.id,
        empleadoId: empleado.id,
        numero: numeroSiguiente,
        snapshot,
        pdfPath,
        hashIntegridad,
      });

      numeroSiguiente += 1;
      recibosCreados.push(recibo);
    }

    return recibosCreados;
  }
}
