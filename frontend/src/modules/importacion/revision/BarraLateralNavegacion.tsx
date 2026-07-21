import { ScrollArea, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconAlertTriangle, IconCheck, IconX } from '@tabler/icons-react';
import { resumenGrupo, tituloGrupo, type GrupoEmpleado } from './agruparFilasPorEmpleado';

interface BarraLateralNavegacionProps {
  /** Mismo conjunto ya filtrado/buscado que la lista principal — nunca una vista independiente. */
  grupos: GrupoEmpleado[];
  onSeleccionar: (clave: string) => void;
}

function IconoEstado({ tieneError, tieneAdvertencia }: { tieneError: boolean; tieneAdvertencia: boolean }) {
  if (tieneError) return <IconX size={14} color="var(--mantine-color-red-6)" />;
  if (tieneAdvertencia) return <IconAlertTriangle size={14} color="var(--mantine-color-yellow-7)" />;
  return <IconCheck size={14} color="var(--mantine-color-green-6)" />;
}

export function BarraLateralNavegacion({ grupos, onSeleccionar }: BarraLateralNavegacionProps) {
  return (
    <ScrollArea mah="calc(100vh - 200px)" style={{ position: 'sticky', top: 70 }}>
      <Stack gap={4}>
        {grupos.map((grupo) => {
          const resumen = resumenGrupo(grupo);
          return (
            <UnstyledButton
              key={grupo.clave}
              onClick={() => onSeleccionar(grupo.clave)}
              px="xs"
              py={4}
              style={{ borderRadius: 4 }}
            >
              <Text size="xs" component="span" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                <IconoEstado tieneError={resumen.tieneError} tieneAdvertencia={resumen.tieneAdvertencia} />
                {tituloGrupo(grupo)}
              </Text>
            </UnstyledButton>
          );
        })}
      </Stack>
    </ScrollArea>
  );
}
