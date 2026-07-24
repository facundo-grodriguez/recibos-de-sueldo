import { Injectable } from '@nestjs/common';
import { ConceptoCatalogo as ConceptoCatalogoRegistro } from '@prisma/client';
import { PrismaService } from '../../../infra/db/prisma.service';
import { ClasificacionConcepto } from '../../../shared/value-objects/clasificacion-concepto';
import { normalizarConcepto } from '../../../shared/utils/normalizar-concepto';
import { ConceptoCatalogo } from '../domain/concepto-catalogo.entity';
import { DefinirConceptoCatalogoData, ConceptoCatalogoRepository } from '../domain/concepto-catalogo.repository';

function aDominio(registro: ConceptoCatalogoRegistro): ConceptoCatalogo {
  return ConceptoCatalogo.create({
    id: registro.id,
    empresaId: registro.empresaId,
    conceptoOriginal: registro.conceptoOriginal,
    clasificacion: ClasificacionConcepto.create(registro.tipo, registro.categoriaContribucion),
  });
}

@Injectable()
export class PrismaConceptoCatalogoRepository implements ConceptoCatalogoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(data: DefinirConceptoCatalogoData): Promise<ConceptoCatalogo> {
    const conceptoNormalizado = normalizarConcepto(data.conceptoOriginal);

    const registro = await this.prisma.conceptoCatalogo.upsert({
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

  async findAllByEmpresa(empresaId: string): Promise<ConceptoCatalogo[]> {
    const registros = await this.prisma.conceptoCatalogo.findMany({ where: { empresaId } });
    return registros.map(aDominio);
  }

  async findByEmpresaAndConceptoNormalizado(
    empresaId: string,
    conceptoNormalizado: string,
  ): Promise<ConceptoCatalogo | null> {
    const registro = await this.prisma.conceptoCatalogo.findUnique({
      where: { empresaId_conceptoNormalizado: { empresaId, conceptoNormalizado } },
    });
    return registro ? aDominio(registro) : null;
  }

  async findByIdAndEmpresa(id: string, empresaId: string): Promise<ConceptoCatalogo | null> {
    const registro = await this.prisma.conceptoCatalogo.findFirst({ where: { id, empresaId } });
    return registro ? aDominio(registro) : null;
  }
}
