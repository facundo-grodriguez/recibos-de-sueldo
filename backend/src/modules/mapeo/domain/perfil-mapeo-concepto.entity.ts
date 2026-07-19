import { ClasificacionConcepto } from '../../../shared/value-objects/clasificacion-concepto';
import { normalizarConcepto } from '../../../shared/utils/normalizar-concepto';

export interface PerfilMapeoConceptoProps {
  id: string;
  empresaId: string;
  conceptoOriginal: string;
  clasificacion: ClasificacionConcepto;
}

/**
 * Una entrada del diccionario reutilizable de una empresa: "el concepto X
 * es de tal tipo/categoría". Se define una vez y se reutiliza en todos los
 * períodos siguientes (ver docs/vision-adaptador.md).
 */
export class PerfilMapeoConcepto {
  public readonly id: string;
  public readonly empresaId: string;
  public readonly conceptoOriginal: string;
  public readonly clasificacion: ClasificacionConcepto;

  private constructor(props: PerfilMapeoConceptoProps) {
    this.id = props.id;
    this.empresaId = props.empresaId;
    this.conceptoOriginal = props.conceptoOriginal;
    this.clasificacion = props.clasificacion;
  }

  static create(props: PerfilMapeoConceptoProps): PerfilMapeoConcepto {
    return new PerfilMapeoConcepto(props);
  }

  conceptoNormalizado(): string {
    return normalizarConcepto(this.conceptoOriginal);
  }
}
