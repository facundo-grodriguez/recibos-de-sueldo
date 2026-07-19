import { ResultadoValidacionImportacion } from '../domain/resultado-validacion';

// La forma de respuesta ya coincide 1:1 con el resultado de dominio; el
// mapper existe igual para mantener la capa de presentación desacoplada del
// dominio, consistente con el resto de los módulos.
export type ValidacionResponse = ResultadoValidacionImportacion;

export function toValidacionResponse(resultado: ResultadoValidacionImportacion): ValidacionResponse {
  return resultado;
}
