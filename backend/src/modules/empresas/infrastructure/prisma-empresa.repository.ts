import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infra/db/prisma.service';
import { Empresa } from '../domain/empresa.entity';
import { ActualizarEmpresaData, CrearEmpresaData, EmpresaRepository } from '../domain/empresa.repository';

@Injectable()
export class PrismaEmpresaRepository implements EmpresaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CrearEmpresaData): Promise<Empresa> {
    const registro = await this.prisma.empresa.create({
      data: {
        usuarioId: data.usuarioId,
        razonSocial: data.razonSocial,
        cuit: data.cuit,
        nombreFantasia: data.nombreFantasia,
        domicilio: data.domicilio,
        localidad: data.localidad,
        provincia: data.provincia,
        codigoPostal: data.codigoPostal,
      },
    });
    return Empresa.create(registro);
  }

  async findAllByUsuario(usuarioId: string): Promise<Empresa[]> {
    const registros = await this.prisma.empresa.findMany({ where: { usuarioId } });
    return registros.map((registro) => Empresa.create(registro));
  }

  async findByIdAndUsuario(id: string, usuarioId: string): Promise<Empresa | null> {
    const registro = await this.prisma.empresa.findFirst({ where: { id, usuarioId } });
    return registro ? Empresa.create(registro) : null;
  }

  async actualizar(id: string, data: ActualizarEmpresaData): Promise<Empresa> {
    const registro = await this.prisma.empresa.update({
      where: { id },
      data: {
        razonSocial: data.razonSocial,
        cuit: data.cuit,
        nombreFantasia: data.nombreFantasia,
        domicilio: data.domicilio,
        localidad: data.localidad,
        provincia: data.provincia,
        codigoPostal: data.codigoPostal,
      },
    });
    return Empresa.create(registro);
  }
}
