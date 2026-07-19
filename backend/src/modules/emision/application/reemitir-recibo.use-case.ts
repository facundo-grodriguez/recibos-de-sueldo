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

export interface ReemitirReciboInput {
  empresaId: string;
  usuarioId: string;
  importacionId: string;
  reciboId: string;
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

    const filas = importacion.agruparFilasPorCuilValido().get(empleado.cuil.value);
    if (!filas || filas.length === 0) {
      throw new DomainError('No se encontraron filas de esta importación para el empleado');
    }

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
      fechaReferencia: new Date(),
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

    return this.reciboRepository.create({
      importacionId: importacion.id,
      empleadoId: empleado.id,
      numero,
      snapshot,
      pdfPath,
      hashIntegridad,
      reemplazaAId: reciboAnulado.id,
    });
  }
}
