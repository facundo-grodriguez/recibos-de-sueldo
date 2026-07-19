import { describe, expect, it } from 'vitest';
import { construirContentDisposition } from '../../src/shared/utils/content-disposition';

describe('construirContentDisposition', () => {
  it('arma un filename ASCII (sin tildes) para clientes viejos', () => {
    const header = construirContentDisposition('Recibo - Pérez Juan - Junio 2026.pdf');
    expect(header).toContain('filename="Recibo - Perez Juan - Junio 2026.pdf"');
  });

  it('arma un filename* UTF-8 completo (con tildes) para clientes modernos', () => {
    const header = construirContentDisposition('Recibo - Pérez Juan - Junio 2026.pdf');
    expect(header).toContain("filename*=UTF-8''Recibo%20-%20P%C3%A9rez%20Juan%20-%20Junio%202026.pdf");
  });

  it('empieza siempre con attachment', () => {
    const header = construirContentDisposition('x.pdf');
    expect(header.startsWith('attachment; ')).toBe(true);
  });

  it('no rompe con nombres que ya son ASCII puro', () => {
    const header = construirContentDisposition('Recibo - Gomez Ana - Julio 2026.pdf');
    expect(header).toContain('filename="Recibo - Gomez Ana - Julio 2026.pdf"');
  });
});
