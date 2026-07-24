import { ClasificacionConcepto } from '../../../shared/value-objects/clasificacion-concepto';
import { normalizarConcepto } from '../../../shared/utils/normalizar-concepto';

export interface ConceptoCatalogoProps {
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
export class ConceptoCatalogo {
  public readonly id: string;
  public readonly empresaId: string;
  public readonly conceptoOriginal: string;
  public readonly clasificacion: ClasificacionConcepto;

  private constructor(props: ConceptoCatalogoProps) {
    this.id = props.id;
    this.empresaId = props.empresaId;
    this.conceptoOriginal = props.conceptoOriginal;
    this.clasificacion = props.clasificacion;
  }

  static create(props: ConceptoCatalogoProps): ConceptoCatalogo {
    return new ConceptoCatalogo(props);
  }

  conceptoNormalizado(): string {
    return normalizarConcepto(this.conceptoOriginal);
  }
}
