import { Injectable } from '@nestjs/common';
import { Prisma, Recibo as ReciboRegistro } from '@prisma/client';
import { PrismaService } from '../../../infra/db/prisma.service';
import { EstadoRecibo } from '../domain/recibo.entity';
import { ReciboSnapshot } from '../domain/recibo-snapshot';
import { Recibo } from '../domain/recibo.entity';
import {
  CrearReciboData,
  ReciboFiltroEmpresa,
  ReciboHistorialPagina,
  ReciboRepository,
} from '../domain/recibo.repository';

const PAGINA_POR_DEFECTO = 1;
const TAMANIO_PAGINA_HISTORIAL_POR_DEFECTO = 20;

function aDominio(registro: ReciboRegistro): Recibo {
  return Recibo.create({
    id: registro.id,
    importacionId: registro.importacionId,
    empleadoId: registro.empleadoId,
    numero: registro.numero,
    snapshot: registro.snapshot as unknown as ReciboSnapshot,
    pdfPath: registro.pdfPath,
    hashIntegridad: registro.hashIntegridad,
    fechaEmision: registro.fechaEmision,
    estado: registro.estado as EstadoRecibo,
    motivoAnulacion: registro.motivoAnulacion,
    reemplazaAId: registro.reemplazaAId,
  });
}

@Injectable()
export class PrismaReciboRepository implements ReciboRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CrearReciboData): Promise<Recibo> {
    const registro = await this.prisma.recibo.create({
      data: {
        importacionId: data.importacionId,
        empleadoId: data.empleadoId,
        numero: data.numero,
        snapshot: data.snapshot as unknown as Prisma.InputJsonValue,
        pdfPath: data.pdfPath,
        hashIntegridad: data.hashIntegridad,
        reemplazaAId: data.reemplazaAId,
      },
    });
    return aDominio(registro);
  }

  async findAllByImportacion(importacionId: string): Promise<Recibo[]> {
    const registros = await this.prisma.recibo.findMany({
      where: { importacionId },
      orderBy: { numero: 'asc' },
    });
    return registros.map(aDominio);
  }

  async findVigentesByImportacion(importacionId: string): Promise<Recibo[]> {
    const registros = await this.prisma.recibo.findMany({
      where: { importacionId, estado: 'vigente' satisfies EstadoRecibo },
      orderBy: { numero: 'asc' },
    });
    return registros.map(aDominio);
  }

  async findByIdAndImportacion(id: string, importacionId: string): Promise<Recibo | null> {
    const registro = await this.prisma.recibo.findFirst({ where: { id, importacionId } });
    return registro ? aDominio(registro) : null;
  }

  async findAllByEmpresa(empresaId: string, filtro?: ReciboFiltroEmpresa): Promise<ReciboHistorialPagina> {
    const pagina = filtro?.pagina ?? PAGINA_POR_DEFECTO;
    const porPagina = filtro?.porPagina ?? TAMANIO_PAGINA_HISTORIAL_POR_DEFECTO;
    const where: Prisma.ReciboWhereInput = {
      importacion: { empresaId },
      empleadoId: filtro?.empleadoId,
    };

    const [registros, total] = await Promise.all([
      this.prisma.recibo.findMany({
        where,
        // Ordenar por `numero` (correlativo por empresa, asignado antes de
        // paralelizar) en vez de por `fechaEmision`: con la emisión en lote
        // paralelizada (perfil de rendimiento, 2026-07-19), el orden real de
        // finalización de cada PDF ya no coincide con el orden lógico de
        // numeración — ordenar por fecha podía mostrar, por ejemplo, el
        // recibo Nº89 antes que el Nº90 del mismo lote. `numero` es
        // monótono y sin ambigüedad incluso bajo concurrencia.
        orderBy: [{ numero: 'desc' }],
        skip: (pagina - 1) * porPagina,
        take: porPagina,
      }),
      this.prisma.recibo.count({ where }),
    ]);

    return { recibos: registros.map(aDominio), total, pagina, porPagina };
  }

  async findByReemplazaAId(reciboId: string): Promise<Recibo | null> {
    const registro = await this.prisma.recibo.findUnique({ where: { reemplazaAId: reciboId } });
    return registro ? aDominio(registro) : null;
  }

  async contarPorEmpresa(empresaId: string): Promise<number> {
    return this.prisma.recibo.count({ where: { importacion: { empresaId } } });
  }

  async anular(id: string, motivo: string): Promise<Recibo> {
    const registro = await this.prisma.recibo.update({
      where: { id },
      data: { estado: 'anulado' satisfies EstadoRecibo, motivoAnulacion: motivo },
    });
    return aDominio(registro);
  }
}
