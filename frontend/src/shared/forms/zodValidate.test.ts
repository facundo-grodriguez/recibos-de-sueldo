import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { zodValidate } from './zodValidate';

const schema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  email: z.string().email('Email inválido'),
});

describe('zodValidate', () => {
  it('no devuelve errores cuando los valores son válidos', () => {
    const validate = zodValidate(schema);
    expect(validate({ nombre: 'Juan', email: 'juan@test.com' })).toEqual({});
  });

  it('devuelve un mensaje por cada campo inválido, indexado por nombre de campo', () => {
    const validate = zodValidate(schema);
    const errores = validate({ nombre: '', email: 'no-es-un-email' });

    expect(errores.nombre).toBe('El nombre es obligatorio');
    expect(errores.email).toBe('Email inválido');
  });

  it('solo guarda el primer mensaje de error por campo', () => {
    const schemaConDosReglas = z.object({
      password: z.string().min(8, 'Mínimo 8 caracteres').regex(/[0-9]/, 'Debe tener un número'),
    });
    const validate = zodValidate(schemaConDosReglas);

    const errores = validate({ password: 'abc' });

    expect(errores.password).toBe('Mínimo 8 caracteres');
  });
});
