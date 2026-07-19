import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infra/db/prisma.service';
import { Usuario } from '../domain/usuario.entity';
import { UsuarioRepository } from '../domain/usuario.repository';

@Injectable()
export class PrismaUsuarioRepository implements UsuarioRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<{ usuario: Usuario; passwordHash: string } | null> {
    const registro = await this.prisma.usuario.findUnique({ where: { email } });
    if (!registro) {
      return null;
    }
    return {
      usuario: new Usuario(registro.id, registro.email, registro.nombre, registro.aceptoTerminosEn),
      passwordHash: registro.passwordHash,
    };
  }

  async create(datos: {
    email: string;
    nombre: string;
    passwordHash: string;
    aceptoTerminosEn: Date;
  }): Promise<Usuario> {
    const registro = await this.prisma.usuario.create({ data: datos });
    return new Usuario(registro.id, registro.email, registro.nombre, registro.aceptoTerminosEn);
  }
}
