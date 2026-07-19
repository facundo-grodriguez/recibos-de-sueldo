import { Usuario } from './usuario.entity';

/**
 * Puerto de salida (Clean Architecture): el Dominio/Aplicación declara qué
 * necesita persistir; Infraestructura decide cómo (Prisma).
 */
export interface UsuarioRepository {
  findByEmail(email: string): Promise<{ usuario: Usuario; passwordHash: string } | null>;
  create(datos: {
    email: string;
    nombre: string;
    passwordHash: string;
    aceptoTerminosEn: Date;
  }): Promise<Usuario>;
}

export const USUARIO_REPOSITORY = Symbol('UsuarioRepository');
