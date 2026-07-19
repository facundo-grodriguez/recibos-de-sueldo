import { Injectable } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { AuditLogEntry, AuditLogRepository, CrearAuditLogEntryData } from './audit-log.repository';

@Injectable()
export class PrismaAuditLogRepository implements AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CrearAuditLogEntryData): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        entidad: data.entidad,
        entidadId: data.entidadId,
        accion: data.accion,
        usuarioId: data.usuarioId,
        campo: data.campo ?? null,
        valorAnterior: data.valorAnterior ?? null,
        valorNuevo: data.valorNuevo ?? null,
      },
    });
  }

  async findByEntidad(entidad: string, entidadId: string): Promise<AuditLogEntry[]> {
    const registros = await this.prisma.auditLog.findMany({
      where: { entidad, entidadId },
      orderBy: { timestamp: 'asc' },
    });

    return registros.map((registro) => ({
      id: registro.id,
      timestamp: registro.timestamp,
      entidad: registro.entidad,
      entidadId: registro.entidadId,
      accion: registro.accion,
      campo: registro.campo,
      valorAnterior: registro.valorAnterior,
      valorNuevo: registro.valorNuevo,
      usuarioId: registro.usuarioId,
    }));
  }
}
