import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { NotFoundError } from '../../../shared/errors/not-found-error';
import { ejecutarConLimite } from '../../../shared/utils/ejecutar-con-limite';
import { ValidarImportacionUseCase } from '../../validacion/application/validar-importacion.use-case';
import { Empleado } from '../../empleados/domain/empleado.entity';
import { EMPLEADO_REPOSITORY, EmpleadoRepository } from '../../empleados/domain/empleado.repository';
import { EMPRESA_REPOSITORY, EmpresaRepository } from '../../empresas/domain/empresa.repository';
import { Empresa } from '../../empresas/domain/empresa.entity';
import { ImportacionFila } from '../../importacion/domain/importacion-fila.entity';
import { IMPORTACION_REPOSITORY, ImportacionRepository } from '../../importacion/domain/importacion.repository';
import { ALMACENAMIENTO_RECIBOS, AlmacenamientoRecibos } from '../domain/almacenamiento-recibos';
import { construirSnapshotRecibo } from '../domain/construir-snapshot-recibo';
import { GENERADOR_PDF, GeneradorPdf } from '../domain/generador-pdf';
import { Recibo } from '../domain/recibo.entity';
import { RECIBO_REPOSITORY, ReciboRepository } from '../domain/recibo.repository';

// Puppeteer es el costo dominante de la emisión (perfil de rendimiento real,
// prueba de carga 2026-07-19: ~530ms/empleado, puramente lineal). Se
// paraleliza con un límite acotado en vez de sin límite: cada página de
// Chromium consume memoria propia, y esto sigue siendo un único request
// HTTP síncrono (ADR-037) — un valor moderado baja el tiempo total varias
// veces sin arriesgar la memoria del proceso.
const CONCURRENCIA_EMISION_PDF = 5;

interface ItemAEmitir {
  empleado: Empleado;
  filas: ImportacionFila[];
  numero: number;
}

interface ContextoEmision {
  empresa: Empresa;
  importacionId: string;
  anio: number;
  mes: number;
  datosEmision: { fechaPago: Date; lugarPago: string; fechaPagoCargasSociales: Date; lugarPagoCargasSociales: string };
  fechaReferencia: Date;
  usuarioId: string;
}

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

    // El guard es por-empleado, no por-importación: si un lote se corta a
    // mitad de camino (crash, reinicio, caída de red), los recibos ya
    // creados quedan vigentes y volver a llamar a este mismo endpoint
    // completa únicamente los empleados que faltan, en vez de rechazar todo
    // el reintento (ADR-057 dejaba esto como límite conocido sin resolver;
    // ver ADR-066). Se cuenta cualquier recibo existente (vigente o
    // anulado): la reemisión de un anulado es responsabilidad explícita de
    // `ReemitirReciboUseCase`, no de este flujo de emisión inicial.
    const recibosExistentes = await this.reciboRepository.findAllByImportacion(importacion.id);
    const empleadosYaEmitidos = new Set(recibosExistentes.map((r) => r.empleadoId));

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

    const numeroInicial = (await this.reciboRepository.contarPorEmpresa(empresa.id)) + 1;

    const filasPorCuil = importacion.agruparFilasPorCuilValido();
    // Una sola consulta para todos los empleados del lote, en vez de un
    // `findByCuilAndEmpresa` por empleado adentro del loop (perfil de
    // rendimiento, 2026-07-19).
    const empleadosPorCuil = new Map(
      (await this.empleadoRepository.findAllByCuilsAndEmpresa(empresa.id, [...filasPorCuil.keys()])).map(
        (empleado) => [empleado.cuil.value, empleado],
      ),
    );

    // La numeración correlativa se asigna acá, antes de paralelizar, para que
    // no dependa del orden real de finalización de cada PDF.
    const itemsAEmitir: ItemAEmitir[] = [];
    for (const [cuil, filas] of filasPorCuil) {
      const empleado = empleadosPorCuil.get(cuil);
      if (!empleado || empleado.estado === 'inactivo' || empleadosYaEmitidos.has(empleado.id)) {
        continue;
      }
      itemsAEmitir.push({ empleado, filas, numero: numeroInicial + itemsAEmitir.length });
    }

    if (itemsAEmitir.length === 0 && recibosExistentes.length > 0) {
      throw new DomainError('Ya se emitieron recibos para todos los empleados de esta importación');
    }

    const contexto: ContextoEmision = {
      empresa,
      importacionId: importacion.id,
      anio: importacion.anio,
      mes: importacion.mes,
      datosEmision,
      // La antigüedad se calcula "a la fecha de pago de este período", no al
      // momento real de hacer clic en Emitir — evita que un recibo emitido
      // tarde (o reemitido meses después) muestre una antigüedad de hoy que
      // no corresponde al período que el resto del documento describe.
      fechaReferencia: datosEmision.fechaPago,
      usuarioId: input.usuarioId,
    };

    return ejecutarConLimite(itemsAEmitir, CONCURRENCIA_EMISION_PDF, (item) => this.emitirUnRecibo(contexto, item));
  }

  private async emitirUnRecibo(contexto: ContextoEmision, { empleado, filas, numero }: ItemAEmitir): Promise<Recibo> {
    const { empresa } = contexto;
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
      periodo: { anio: contexto.anio, mes: contexto.mes, ...contexto.datosEmision },
      filas,
      fechaReferencia: contexto.fechaReferencia,
    });

    const pdf = await this.generadorPdf.generar(snapshot);
    const hashIntegridad = createHash('sha256').update(pdf).digest('hex');
    const pdfPath = await this.almacenamiento.guardar({
      empresaId: empresa.id,
      importacionId: contexto.importacionId,
      empleadoId: empleado.id,
      numero,
      contenido: pdf,
    });

    // El recibo y su entrada de auditoría "emitir" se escriben en la misma
    // transacción (ver ADR-066): sin esto, un corte justo entre ambas
    // escrituras podía dejar un recibo vigente sin ningún rastro de
    // auditoría de su emisión.
    return this.reciboRepository.crearConAuditoria(
      {
        importacionId: contexto.importacionId,
        empleadoId: empleado.id,
        numero,
        snapshot,
        pdfPath,
        hashIntegridad,
      },
      contexto.usuarioId,
    );
  }
}
