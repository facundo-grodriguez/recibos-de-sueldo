import { describe, expect, it } from 'vitest';
import { AlmacenamientoLogo, leerLogoComoDataUri, mimeTypeDeExtension } from '../../src/modules/empresas/domain/almacenamiento-logo';
import { Empresa } from '../../src/modules/empresas/domain/empresa.entity';

const EMPRESA_ID = 'empresa-1';
const USUARIO_ID = 'usuario-1';

class AlmacenamientoLogoFake implements AlmacenamientoLogo {
  archivos = new Map<string, Buffer>();
  lecturas: string[] = [];

  async guardar(): Promise<string> {
    throw new Error('no usado en este test');
  }

  async leer(logoPath: string): Promise<Buffer> {
    this.lecturas.push(logoPath);
    const contenido = this.archivos.get(logoPath);
    if (!contenido) throw new Error('archivo no encontrado en el fake');
    return contenido;
  }
}

describe('mimeTypeDeExtension', () => {
  it('reconoce los formatos aceptados', () => {
    expect(mimeTypeDeExtension('png')).toBe('image/png');
    expect(mimeTypeDeExtension('jpg')).toBe('image/jpeg');
    expect(mimeTypeDeExtension('jpeg')).toBe('image/jpeg');
    expect(mimeTypeDeExtension('webp')).toBe('image/webp');
    expect(mimeTypeDeExtension('svg')).toBe('image/svg+xml');
  });

  it('no distingue mayúsculas/minúsculas', () => {
    expect(mimeTypeDeExtension('PNG')).toBe('image/png');
  });

  it('devuelve un mime genérico ante una extensión desconocida', () => {
    expect(mimeTypeDeExtension('bmp')).toBe('application/octet-stream');
  });
});

describe('leerLogoComoDataUri', () => {
  it('devuelve null sin leer nada si la empresa no tiene logoPath', async () => {
    const almacenamiento = new AlmacenamientoLogoFake();
    const empresa = Empresa.create({ id: EMPRESA_ID, usuarioId: USUARIO_ID, razonSocial: 'Acme SA', cuit: '20123456786' });

    const resultado = await leerLogoComoDataUri(empresa, almacenamiento);

    expect(resultado).toBeNull();
    expect(almacenamiento.lecturas).toEqual([]);
  });

  it('arma un data URI con el mime type correcto a partir del contenido leído', async () => {
    const almacenamiento = new AlmacenamientoLogoFake();
    almacenamiento.archivos.set(`${EMPRESA_ID}.png`, Buffer.from('fake-png'));
    const empresa = Empresa.create({
      id: EMPRESA_ID,
      usuarioId: USUARIO_ID,
      razonSocial: 'Acme SA',
      cuit: '20123456786',
      logoPath: `${EMPRESA_ID}.png`,
    });

    const resultado = await leerLogoComoDataUri(empresa, almacenamiento);

    expect(resultado).toBe(`data:image/png;base64,${Buffer.from('fake-png').toString('base64')}`);
  });
});
