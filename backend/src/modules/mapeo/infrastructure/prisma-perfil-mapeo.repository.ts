import { Injectable } from '@nestjs/common';
import { PerfilMapeoConcepto as PerfilMapeoConceptoRegistro } from '@prisma/client';
import { PrismaService } from '../../../infra/db/prisma.service';
import { ClasificacionConcepto } from '../../../shared/value-objects/clasificacion-concepto';
import { normalizarConcepto } from '../../../shared/utils/normalizar-concepto';
import { PerfilMapeoConcepto } from '../domain/perfil-mapeo-concepto.entity';
import { DefinirMapeoData, PerfilMapeoRepository } from '../domain/perfil-mapeo.repository';

function aDominio(registro: PerfilMapeoConceptoRegistro): PerfilMapeoConcepto {
  return PerfilMapeoConcepto.create({
    id: registro.id,
    empresaId: registro.empresaId,
    conceptoOriginal: registro.conceptoOriginal,
    clasificacion: ClasificacionConcepto.create(registro.tipo, registro.categoriaContribucion),
  });
}

@Injectable()
export class PrismaPerfilMapeoRepository implements PerfilMapeoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(data: DefinirMapeoData): Promise<PerfilMapeoConcepto> {
    const conceptoNormalizado = normalizarConcepto(data.conceptoOriginal);

    const registro = await this.prisma.perfilMapeoConcepto.upsert({
      where: {
        empresaId_conceptoNormalizado: { empresaId: data.empresaId, conceptoNormalizado },
      },
      create: {
        empresaId: data.empresaId,
        conceptoNormalizado,
        conceptoOriginal: data.conceptoOriginal,
        tipo: data.tipo,
        categoriaContribucion: data.categoriaContribucion,
      },
      update: {
        conceptoOriginal: data.conceptoOriginal,
        tipo: data.tipo,
        categoriaContribucion: data.categoriaContribucion,
      },
    });

    return aDominio(registro);
  }

  async findAllByEmpresa(empresaId: string): Promise<PerfilMapeoConcepto[]> {
    const registros = await this.prisma.perfilMapeoConcepto.findMany({ where: { empresaId } });
    return registros.map(aDominio);
  }

  async findByEmpresaAndConceptoNormalizado(
    empresaId: string,
    conceptoNormalizado: string,
  ): Promise<PerfilMapeoConcepto | null> {
    const registro = await this.prisma.perfilMapeoConcepto.findUnique({
      where: { empresaId_conceptoNormalizado: { empresaId, conceptoNormalizado } },
    });
    return registro ? aDominio(registro) : null;
  }

  async findByIdAndEmpresa(id: string, empresaId: string): Promise<PerfilMapeoConcepto | null> {
    const registro = await this.prisma.perfilMapeoConcepto.findFirst({ where: { id, empresaId } });
    return registro ? aDominio(registro) : null;
  }
}
