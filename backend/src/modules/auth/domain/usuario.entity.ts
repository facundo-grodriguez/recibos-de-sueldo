/**
 * Entidad de dominio. No conoce Prisma ni HTTP; el passwordHash es un detalle
 * de autenticación que la capa de aplicación maneja a través de PasswordHasher,
 * nunca expuesto fuera de infraestructura/aplicación.
 */
export class Usuario {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly nombre: string,
    public readonly aceptoTerminosEn: Date | null = null,
  ) {}
}
