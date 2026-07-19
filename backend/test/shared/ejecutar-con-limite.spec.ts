import { describe, expect, it } from 'vitest';
import { ejecutarConLimite } from '../../src/shared/utils/ejecutar-con-limite';

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('ejecutarConLimite', () => {
  it('devuelve los resultados en el mismo orden que los items, sin importar cuál termina primero', async () => {
    const items = [30, 10, 20];

    const resultados = await ejecutarConLimite(items, 3, async (ms) => {
      await esperar(ms);
      return ms;
    });

    expect(resultados).toEqual([30, 10, 20]);
  });

  it('nunca corre más tareas en simultáneo que el límite indicado', async () => {
    const items = Array.from({ length: 12 }, (_, i) => i);
    let enCurso = 0;
    let maximoObservado = 0;

    await ejecutarConLimite(items, 3, async (item) => {
      enCurso += 1;
      maximoObservado = Math.max(maximoObservado, enCurso);
      await esperar(5);
      enCurso -= 1;
      return item;
    });

    expect(maximoObservado).toBeLessThanOrEqual(3);
  });

  it('procesa todos los items aunque haya menos items que el límite', async () => {
    const resultados = await ejecutarConLimite([1, 2], 10, async (item) => item * 2);
    expect(resultados).toEqual([2, 4]);
  });

  it('devuelve un array vacío para una lista vacía, sin llamar a la tarea', async () => {
    let llamadas = 0;
    const resultados = await ejecutarConLimite([], 5, async () => {
      llamadas += 1;
      return 0;
    });

    expect(resultados).toEqual([]);
    expect(llamadas).toBe(0);
  });

  it('propaga el error de una tarea que falla', async () => {
    await expect(
      ejecutarConLimite([1, 2, 3], 2, async (item) => {
        if (item === 2) throw new Error('falló el item 2');
        return item;
      }),
    ).rejects.toThrow('falló el item 2');
  });
});
