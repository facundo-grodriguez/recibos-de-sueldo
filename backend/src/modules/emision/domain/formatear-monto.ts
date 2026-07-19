const FORMATO_MONEDA = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatearMonto(monto: number): string {
  return FORMATO_MONEDA.format(monto);
}
