import { describe, expect, it } from 'vitest';
import { omitirVacios } from './omitirVacios';

describe('omitirVacios', () => {
  it('quita las claves cuyo valor es una cadena vacía', () => {
    const resultado = omitirVacios({ razonSocial: 'Acme SA', nombreFantasia: '', domicilio: '' });
    expect(resultado).toEqual({ razonSocial: 'Acme SA' });
  });

  it('conserva valores no vacíos tal cual', () => {
    const resultado = omitirVacios({ razonSocial: 'Acme SA', cuit: '20123456786' });
    expect(resultado).toEqual({ razonSocial: 'Acme SA', cuit: '20123456786' });
  });

  it('no confunde 0 o false con vacío (solo compara contra la cadena vacía)', () => {
    const resultado = omitirVacios({ activo: false, cantidad: 0 });
    expect(resultado).toEqual({ activo: false, cantidad: 0 });
  });

  it('quita también valores null y undefined (ej. una fecha borrada en un date picker)', () => {
    const resultado = omitirVacios({ nombre: 'Juan', fechaIngreso: null, legajo: undefined });
    expect(resultado).toEqual({ nombre: 'Juan' });
  });
});
