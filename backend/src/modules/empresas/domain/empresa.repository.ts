import { Empresa } from './empresa.entity';

export interface CrearEmpresaData {
  usuarioId: string;
  razonSocial: string;
  cuit: string;
  nombreFantasia?: string;
  domicilio?: string;
  localidad?: string;
  provincia?: string;
  codigoPostal?: string;
}

export interface ActualizarEmpresaData {
  razonSocial?: string;
  cuit?: string;
  nombreFantasia?: string;
  domicilio?: string;
  localidad?: string;
  provincia?: string;
  codigoPostal?: string;
}

export interface EmpresaRepository {
  create(data: CrearEmpresaData): Promise<Empresa>;
  /** Siempre filtrado por usuarioId: una empresa nunca se ve fuera de su dueño. */
  findAllByUsuario(usuarioId: string): Promise<Empresa[]>;
  findByIdAndUsuario(id: string, usuarioId: string): Promise<Empresa | null>;
  actualizar(id: string, data: ActualizarEmpresaData): Promise<Empresa>;
}

export const EMPRESA_REPOSITORY = Symbol('EmpresaRepository');
