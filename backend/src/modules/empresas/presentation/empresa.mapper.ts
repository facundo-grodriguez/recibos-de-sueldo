import { Empresa } from '../domain/empresa.entity';

export interface EmpresaResponse {
  id: string;
  razonSocial: string;
  cuit: string;
  nombreFantasia: string | null;
  domicilio: string | null;
  localidad: string | null;
  provincia: string | null;
  codigoPostal: string | null;
  /** Nunca se manda la ruta interna del archivo — solo si hay uno, para que el frontend decida si pide GET /logo. */
  tieneLogo: boolean;
}

/**
 * Los value objects de dominio (Cuit) no se serializan directamente: el
 * mapper decide explícitamente qué forma tiene la respuesta HTTP.
 */
export function toEmpresaResponse(empresa: Empresa): EmpresaResponse {
  return {
    id: empresa.id,
    razonSocial: empresa.razonSocial,
    cuit: empresa.cuit.formatted,
    nombreFantasia: empresa.nombreFantasia,
    domicilio: empresa.domicilio,
    localidad: empresa.localidad,
    provincia: empresa.provincia,
    codigoPostal: empresa.codigoPostal,
    tieneLogo: empresa.logoPath !== null,
  };
}
