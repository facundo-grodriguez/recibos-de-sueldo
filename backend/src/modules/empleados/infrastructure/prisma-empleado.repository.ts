import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infra/db/prisma.service';
import { Empleado } from '../domain/empleado.entity';
import {
  ActualizarEmpleadoData,
  CrearEmpleadoData,
  EmpleadoRepository,
} from '../domain/empleado.repository';

@Injectable()
export class PrismaEmpleadoRepository implements EmpleadoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CrearEmpleadoData): Promise<Empleado> {
    const registro = await this.prisma.empleado.create({
      data: {
        empresaId: data.empresaId,
        nombre: data.nombre,
        apellido: data.apellido,
        cuil: data.cuil,
        categoria: data.categoria,
        fechaIngreso: data.fechaIngreso,
        legajo: data.legajo,
        banco: data.banco,
      },
    });
    return Empleado.create(registro);
  }

  async crearVarios(datos: CrearEmpleadoData[]): Promise<void> {
    if (datos.length === 0) {
      return;
    }
    await this.prisma.empleado.createMany({
      data: datos.map((dato) => ({
        empresaId: dato.empresaId,
        nombre: dato.nombre,
        apellido: dato.apellido,
        cuil: dato.cuil,
        categoria: dato.categoria,
        fechaIngreso: dato.fechaIngreso,
        legajo: dato.legajo,
        banco: dato.banco,
      })),
      skipDuplicates: true,
    });
  }

  async findAllByEmpresa(empresaId: string): Promise<Empleado[]> {
    const registros = await this.prisma.empleado.findMany({ where: { empresaId } });
    return registros.map((registro) => Empleado.create(registro));
  }

  async findByCuilAndEmpresa(empresaId: string, cuil: string): Promise<Empleado | null> {
    const registro = await this.prisma.empleado.findFirst({ where: { empresaId, cuil } });
    return registro ? Empleado.create(registro) : null;
  }

  async findAllByCuilsAndEmpresa(empresaId: string, cuils: string[]): Promise<Empleado[]> {
    if (cuils.length === 0) {
      return [];
    }
    const registros = await this.prisma.empleado.findMany({ where: { empresaId, cuil: { in: cuils } } });
    return registros.map((registro) => Empleado.create(registro));
  }

  async findByIdAndEmpresa(id: string, empresaId: string): Promise<Empleado | null> {
    const registro = await this.prisma.empleado.findFirst({ where: { id, empresaId } });
    return registro ? Empleado.create(registro) : null;
  }

  async findByLegajoAndEmpresa(empresaId: string, legajo: string): Promise<Empleado | null> {
    const registro = await this.prisma.empleado.findFirst({ where: { empresaId, legajo } });
    return registro ? Empleado.create(registro) : null;
  }

  async actualizar(id: string, data: ActualizarEmpleadoData): Promise<Empleado> {
    const registro = await this.prisma.empleado.update({
      where: { id },
      data: {
        nombre: data.nombre,
        apellido: data.apellido,
        categoria: data.categoria,
        fechaIngreso: data.fechaIngreso,
        legajo: data.legajo,
        banco: data.banco,
        estado: data.estado,
      },
    });
    return Empleado.create(registro);
  }
}
