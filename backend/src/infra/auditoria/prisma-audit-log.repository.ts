import { Injectable } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { AuditLogEntry, AuditLogRepository } from './audit-log.repository';

@Injectable()
export class PrismaAuditLogRepository implements AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

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
