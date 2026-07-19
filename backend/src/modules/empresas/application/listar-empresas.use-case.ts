import { Inject, Injectable } from '@nestjs/common';
import { Empresa } from '../domain/empresa.entity';
import { EMPRESA_REPOSITORY, EmpresaRepository } from '../domain/empresa.repository';

@Injectable()
export class ListarEmpresasUseCase {
  constructor(
    @Inject(EMPRESA_REPOSITORY) private readonly empresaRepository: EmpresaRepository,
  ) {}

  async execute(usuarioId: string): Promise<Empresa[]> {
    return this.empresaRepository.findAllByUsuario(usuarioId);
  }
}
