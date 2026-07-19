import { Injectable } from '@nestjs/common';
import { Prisma, Recibo as ReciboRegistro } from '@prisma/client';
import { PrismaService } from '../../../infra/db/prisma.service';
import { EstadoRecibo } from '../domain/recibo.entity';
import { ReciboSnapshot } from '../domain/recibo-snapshot';
import { Recibo } from '../domain/recibo.entity';
import {
  CrearReciboData,
  ReciboFiltroEmpresa,
  ReciboRepository,
} from '../domain/recibo.repository';

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

  async findAllByEmpresa(empresaId: string, filtro?: ReciboFiltroEmpresa): Promise<Recibo[]> {
    const registros = await this.prisma.recibo.findMany({
      where: {
        importacion: { empresaId },
        empleadoId: filtro?.empleadoId,
      },
      orderBy: [{ fechaEmision: 'desc' }],
    });
    return registros.map(aDominio);
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
