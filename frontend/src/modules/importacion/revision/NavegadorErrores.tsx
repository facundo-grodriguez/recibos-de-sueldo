import { useEffect, useState } from 'react';
import { ActionIcon, Group, Paper, Text } from '@mantine/core';
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';

export interface ErrorNavegable {
  claveGrupo: string;
  filaId: string;
}

interface NavegadorErroresProps {
  /** Errores del conjunto actualmente visible (mismo set filtrado que el resto de la pantalla) — no todos los de la importación si hay un filtro/búsqueda activos. */
  errores: ErrorNavegable[];
  onNavegar: (error: ErrorNavegable) => void;
}

/** Botón fijo "Error N de M" para saltar entre filas con error sin scrollear a mano. */
export function NavegadorErrores({ errores, onNavegar }: NavegadorErroresProps) {
  const [indice, setIndice] = useState(0);

  // Si el conjunto de errores cambia (se corrigió uno, cambió el filtro), el índice se recorta al rango válido.
  useEffect(() => {
    if (indice >= errores.length) {
      setIndice(0);
    }
  }, [errores.length, indice]);

  if (errores.length === 0) return null;

  function ir(nuevoIndice: number): void {
    const acotado = (nuevoIndice + errores.length) % errores.length;
    setIndice(acotado);
    onNavegar(errores[acotado]);
  }

  return (
    <Paper withBorder p="xs" style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 100 }} shadow="md">
      <Group gap="xs" wrap="nowrap">
        <ActionIcon variant="subtle" onClick={() => ir(indice - 1)} aria-label="Error anterior">
          <IconChevronUp size={16} />
        </ActionIcon>
        <Text size="sm">
          Error {indice + 1} de {errores.length}
        </Text>
        <ActionIcon variant="subtle" onClick={() => ir(indice + 1)} aria-label="Siguiente error">
          <IconChevronDown size={16} />
        </ActionIcon>
      </Group>
    </Paper>
  );
}
