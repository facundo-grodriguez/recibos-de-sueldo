import { Inject, Injectable } from '@nestjs/common';
import { Cuit } from '../../../shared/value-objects/cuit';
import { Empresa } from '../domain/empresa.entity';
import { CrearEmpresaData, EMPRESA_REPOSITORY, EmpresaRepository } from '../domain/empresa.repository';

@Injectable()
export class CrearEmpresaUseCase {
  constructor(
    @Inject(EMPRESA_REPOSITORY) private readonly empresaRepository: EmpresaRepository,
  ) {}

  async execute(data: CrearEmpresaData): Promise<Empresa> {
    // Falla rápido (CUIT inválido) antes de tocar la base de datos.
    const cuit = Cuit.create(data.cuit);
    return this.empresaRepository.create({ ...data, cuit: cuit.value });
  }
}
