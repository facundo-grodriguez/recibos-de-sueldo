import { DomainError } from '../../../shared/errors/domain-error';
import { Cuit } from '../../../shared/value-objects/cuit';

export interface EmpresaProps {
  id: string;
  usuarioId: string;
  razonSocial: string;
  cuit: string;
  nombreFantasia?: string | null;
  domicilio?: string | null;
  localidad?: string | null;
  provincia?: string | null;
  codigoPostal?: string | null;
  logoPath?: string | null;
}

/**
 * Entidad de dominio. El CUIT nunca existe en un estado inválido: se valida
 * (formato + dígito verificador) en la construcción, ya sea al crear una
 * Empresa nueva o al reconstruirla desde la base de datos.
 */
export class Empresa {
  public readonly id: string;
  public readonly usuarioId: string;
  public readonly razonSocial: string;
  public readonly cuit: Cuit;
  public readonly nombreFantasia: string | null;
  public readonly domicilio: string | null;
  public readonly localidad: string | null;
  public readonly provincia: string | null;
  public readonly codigoPostal: string | null;
  public readonly logoPath: string | null;

  private constructor(props: EmpresaProps) {
    if (!props.razonSocial.trim()) {
      throw new DomainError('La razón social es obligatoria');
    }

    this.id = props.id;
    this.usuarioId = props.usuarioId;
    this.razonSocial = props.razonSocial.trim();
    this.cuit = Cuit.create(props.cuit);
    this.nombreFantasia = props.nombreFantasia ?? null;
    this.domicilio = props.domicilio ?? null;
    this.localidad = props.localidad ?? null;
    this.provincia = props.provincia ?? null;
    this.codigoPostal = props.codigoPostal ?? null;
    this.logoPath = props.logoPath ?? null;
  }

  static create(props: EmpresaProps): Empresa {
    return new Empresa(props);
  }
}
