export function formatearMoneda(monto: number): string {
  return monto.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
}
