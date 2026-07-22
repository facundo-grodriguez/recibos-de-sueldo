import { Injectable } from '@nestjs/common';
import { Importacion as ImportacionRegistro, ImportacionFila as ImportacionFilaRegistro } from '@prisma/client';
import { PrismaService } from '../../../infra/db/prisma.service';
import { ClasificacionConcepto } from '../../../shared/value-objects/clasificacion-concepto';
import { normalizarConcepto } from '../../../shared/utils/normalizar-concepto';
import { EstadoImportacion, Importacion } from '../domain/importacion.entity';
import { ImportacionFila } from '../domain/importacion-fila.entity';
import {
  ActualizarDatosEmisionData,
  ActualizarFilaData,
  AplicarClasificacionData,
  CrearImportacionData,
  ImportacionRepository,
} from '../domain/importacion.repository';

type RegistroConFilas = ImportacionRegistro & { filas: ImportacionFilaRegistro[] };

// Ver comentario en `findConfirmadasAnteriores`: cuántos períodos anteriores
// como máximo se traen para buscar el neto de comparación de un empleado.
const LIMITE_PERIODOS_ANTERIORES = 3;

function aDominio(registro: RegistroConFilas): Importacion {
  return Importacion.create({
    id: registro.id,
    empresaId: registro.empresaId,
    usuarioId: registro.usuarioId,
    anio: registro.anio,
    mes: registro.mes,
    nombreArchivo: registro.nombreArchivo,
    estado: registro.estado as EstadoImportacion,
    fechaImportacion: registro.fechaImportacion,
    fechaPago: registro.fechaPago,
    lugarPago: registro.lugarPago,
    fechaPagoCargasSociales: registro.fechaPagoCargasSociales,
    lugarPagoCargasSociales: registro.lugarPagoCargasSociales,
    filas: registro.filas
      .sort((a, b) => a.numeroFila - b.numeroFila)
      .map((fila) =>
        ImportacionFila.create({
          id: fila.id,
          numeroFila: fila.numeroFila,
          cuil: fila.cuil,
          nombre: fila.nombre,
          apellido: fila.apellido,
          concepto: fila.concepto,
          montoOriginal: fila.montoOriginal,
          monto: fila.monto === null ? null : Number(fila.monto),
          valida: fila.valida,
          errorMensaje: fila.errorMensaje,
          clasificacion:
            fila.tipo === null ? null : ClasificacionConcepto.create(fila.tipo, fila.categoriaContribucion),
          unidad: fila.unidad,
          base: fila.base === null ? null : Number(fila.base),
          correcciones: fila.correcciones,
        }),
      ),
  });
}

@Injectable()
export class PrismaImportacionRepository implements ImportacionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CrearImportacionData): Promise<Importacion> {
    const registro = await this.prisma.importacion.create({
      data: {
        empresaId: data.empresaId,
        usuarioId: data.usuarioId,
        anio: data.anio,
        mes: data.mes,
        nombreArchivo: data.nombreArchivo,
        filas: {
          create: data.filas.map((fila) => ({
            numeroFila: fila.numeroFila,
            cuil: fila.cuil,
            nombre: fila.nombre,
            apellido: fila.apellido,
            concepto: fila.concepto,
            montoOriginal: fila.montoOriginal,
            monto: fila.monto,
            valida: fila.valida,
            errorMensaje: fila.errorMensaje,
            unidad: fila.unidad,
            base: fila.base,
            correcciones: fila.correcciones ?? [],
          })),
        },
      },
      include: { filas: true },
    });
    return aDominio(registro);
  }

  async findAllByEmpresa(empresaId: string): Promise<Importacion[]> {
    const registros = await this.prisma.importacion.findMany({
      where: { empresaId },
      orderBy: { fechaImportacion: 'desc' },
      include: { filas: true },
    });
    return registros.map(aDominio);
  }

  async findByIdAndEmpresa(id: string, empresaId: string): Promise<Importacion | null> {
    const registro = await this.prisma.importacion.findFirst({
      where: { id, empresaId },
      include: { filas: true },
    });
    return registro ? aDominio(registro) : null;
  }

  async marcarConfirmada(id: string): Promise<Importacion> {
    const registro = await this.prisma.importacion.update({
      where: { id },
      data: { estado: 'confirmada' satisfies EstadoImportacion },
      include: { filas: true },
    });
    return aDominio(registro);
  }

  async marcarDescartada(id: string): Promise<Importacion> {
    const registro = await this.prisma.importacion.update({
      where: { id },
      data: { estado: 'descartada' satisfies EstadoImportacion },
      include: { filas: true },
    });
    return aDominio(registro);
  }

  async actualizarDatosEmision(id: string, data: ActualizarDatosEmisionData): Promise<Importacion> {
    const registro = await this.prisma.importacion.update({
      where: { id },
      data: {
        fechaPago: data.fechaPago,
        lugarPago: data.lugarPago,
        fechaPagoCargasSociales: data.fechaPagoCargasSociales,
        lugarPagoCargasSociales: data.lugarPagoCargasSociales,
      },
      include: { filas: true },
    });
    return aDominio(registro);
  }

  async actualizarFila(filaId: string, data: ActualizarFilaData): Promise<Importacion> {
    const filaActualizada = await this.prisma.importacionFila.update({
      where: { id: filaId },
      data: {
        cuil: data.cuil,
        nombre: data.nombre,
        apellido: data.apellido,
        concepto: data.concepto,
        montoOriginal: data.montoOriginal,
        monto: data.monto,
        valida: data.valida,
        errorMensaje: data.errorMensaje,
        unidad: data.unidad,
        base: data.base,
        correcciones: data.correcciones ?? [],
      },
    });

    const registro = await this.prisma.importacion.findUniqueOrThrow({
      where: { id: filaActualizada.importacionId },
      include: { filas: true },
    });
    return aDominio(registro);
  }

  async aplicarClasificacion(
    empresaId: string,
    conceptoNormalizado: string,
    clasificacion: AplicarClasificacionData,
  ): Promise<number> {
    // El filtro por concepto normalizado se hace en memoria (no en SQL) porque
    // el motor de mapeo opera sobre pocos miles de filas por empresa, no
    // millones — evita depender de funciones SQL específicas del motor.
    const candidatas = await this.prisma.importacionFila.findMany({
      where: { valida: true, tipo: null, importacion: { empresaId } },
      select: { id: true, concepto: true },
    });

    const idsAActualizar = candidatas
      .filter((fila) => normalizarConcepto(fila.concepto) === conceptoNormalizado)
      .map((fila) => fila.id);

    if (idsAActualizar.length === 0) {
      return 0;
    }

    const resultado = await this.prisma.importacionFila.updateMany({
      where: { id: { in: idsAActualizar } },
      data: {
        tipo: clasificacion.tipo,
        categoriaContribucion: clasificacion.categoriaContribucion,
      },
    });

    return resultado.count;
  }

  async agruparFilasSinClasificarPorConcepto(empresaId: string): Promise<Map<string, string[]>> {
    const filas = await this.prisma.importacionFila.findMany({
      where: { valida: true, tipo: null, importacion: { empresaId } },
      select: { id: true, concepto: true },
    });

    const idsPorConcepto = new Map<string, string[]>();
    for (const fila of filas) {
      const clave = normalizarConcepto(fila.concepto);
      const ids = idsPorConcepto.get(clave) ?? [];
      ids.push(fila.id);
      idsPorConcepto.set(clave, ids);
    }
    return idsPorConcepto;
  }

  async actualizarClasificacionPorIds(ids: string[], clasificacion: AplicarClasificacionData): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }
    const resultado = await this.prisma.importacionFila.updateMany({
      where: { id: { in: ids } },
      data: {
        tipo: clasificacion.tipo,
        categoriaContribucion: clasificacion.categoriaContribucion,
      },
    });
    return resultado.count;
  }

  async listarConceptosPendientes(empresaId: string): Promise<string[]> {
    const filas = await this.prisma.importacionFila.findMany({
      where: { valida: true, tipo: null, importacion: { empresaId } },
      select: { concepto: true },
    });

    const porNormalizado = new Map<string, string>();
    for (const fila of filas) {
      const clave = normalizarConcepto(fila.concepto);
      if (!porNormalizado.has(clave)) {
        porNormalizado.set(clave, fila.concepto);
      }
    }

    return [...porNormalizado.values()];
  }

  async findConfirmadasAnteriores(empresaId: string, anio: number, mes: number): Promise<Importacion[]> {
    const registros = await this.prisma.importacion.findMany({
      where: {
        empresaId,
        estado: 'confirmada',
        OR: [{ anio: { lt: anio } }, { anio, mes: { lt: mes } }],
      },
      orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
      // `ValidarImportacionUseCase.buscarNetoAnterior` solo usa la PRIMERA
      // importación anterior (la más reciente) donde el empleado esté 100%
      // clasificado, y se detiene ahí — sin este límite, esta query traía
      // TODO el historial confirmado de la empresa (con todas sus filas) en
      // cada validación, un costo que crece sin fin con la antigüedad de la
      // empresa, no con el tamaño del lote actual (perfil de rendimiento,
      // 2026-07-19). `LIMITE_PERIODOS_ANTERIORES` da margen para el caso en
      // que el período inmediato anterior tenga algún concepto sin
      // clasificar todavía, sin volver a traer toda la historia.
      take: LIMITE_PERIODOS_ANTERIORES,
      include: { filas: true },
    });

    return registros.map(aDominio);
  }

  async existeOtraEnMismoPeriodo(empresaId: string, anio: number, mes: number, idAExcluir: string): Promise<boolean> {
    const cantidad = await this.prisma.importacion.count({
      where: { empresaId, anio, mes, id: { not: idAExcluir } },
    });
    return cantidad > 0;
  }
}
