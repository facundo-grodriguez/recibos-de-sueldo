/**
 * Corre `tarea` sobre cada elemento de `items`, con a lo sumo `limite`
 * ejecuciones en simultáneo — sin depender de una librería externa para algo
 * tan chico. El resultado preserva el orden de `items` sin importar en qué
 * orden termine cada tarea.
 */
export async function ejecutarConLimite<T, R>(
  items: readonly T[],
  limite: number,
  tarea: (item: T, indice: number) => Promise<R>,
): Promise<R[]> {
  const resultados: R[] = new Array(items.length);
  let siguiente = 0;

  async function trabajador(): Promise<void> {
    while (siguiente < items.length) {
      const indice = siguiente;
      siguiente += 1;
      resultados[indice] = await tarea(items[indice], indice);
    }
  }

  const cantidadTrabajadores = Math.max(1, Math.min(limite, items.length));
  await Promise.all(Array.from({ length: cantidadTrabajadores }, () => trabajador()));

  return resultados;
}
