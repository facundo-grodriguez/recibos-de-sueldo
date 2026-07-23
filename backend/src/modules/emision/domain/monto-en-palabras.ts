// Convierte un monto a su expresión en palabras (español rioplatense), para
// la leyenda "Recibí conforme la suma de..." del pie de firma — convención
// estándar de un recibo/cheque: el monto en letras, además de en números,
// dificulta una alteración posterior del documento.
const UNIDADES = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
const ESPECIALES_10_19 = [
  'diez', 'once', 'doce', 'trece', 'catorce', 'quince',
  'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve',
];
const DECENAS = ['', 'diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const CENTENAS = [
  '', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos',
  'seiscientos', 'setecientos', 'ochocientos', 'novecientos',
];

/** Convierte un entero de 0 a 999 a palabras. */
function grupoEnPalabras(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'cien';

  const centena = Math.floor(n / 100);
  const resto = n % 100;
  const partes: string[] = [];

  if (centena > 0) partes.push(CENTENAS[centena]);

  if (resto > 0) {
    if (resto < 10) {
      partes.push(UNIDADES[resto]);
    } else if (resto < 20) {
      partes.push(ESPECIALES_10_19[resto - 10]);
    } else {
      const decena = Math.floor(resto / 10);
      const unidad = resto % 10;
      if (decena === 2 && unidad > 0) {
        partes.push(`veinti${UNIDADES[unidad]}`);
      } else if (unidad > 0) {
        partes.push(`${DECENAS[decena]} y ${UNIDADES[unidad]}`);
      } else {
        partes.push(DECENAS[decena]);
      }
    }
  }

  return partes.join(' ');
}

/** Convierte un entero de 0 a 999.999.999 a palabras. */
function enteroEnPalabras(n: number): string {
  if (n === 0) return 'cero';

  const millones = Math.floor(n / 1_000_000);
  const restoMillones = n % 1_000_000;
  const miles = Math.floor(restoMillones / 1000);
  const restoMiles = restoMillones % 1000;

  const partes: string[] = [];

  if (millones > 0) {
    partes.push(millones === 1 ? 'un millón' : `${grupoEnPalabras(millones)} millones`);
  }
  if (miles > 0) {
    partes.push(miles === 1 ? 'mil' : `${grupoEnPalabras(miles)} mil`);
  }
  if (restoMiles > 0) {
    partes.push(grupoEnPalabras(restoMiles));
  }

  return partes.join(' ');
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * "Pesos setecientos catorce mil con 00/100" — formato estándar de un
 * recibo/cheque argentino. `monto` en pesos, con centavos (2 decimales).
 */
export function montoEnPalabras(monto: number): string {
  const montoRedondeado = Math.round(monto * 100) / 100;
  const parteEntera = Math.trunc(montoRedondeado);
  const centavos = Math.round((montoRedondeado - parteEntera) * 100);

  const centavosTexto = String(centavos).padStart(2, '0');
  return `${capitalizar(enteroEnPalabras(parteEntera))} pesos con ${centavosTexto}/100`;
}
