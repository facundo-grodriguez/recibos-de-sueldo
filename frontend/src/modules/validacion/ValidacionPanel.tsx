import { Alert, Stack } from '@mantine/core';
import type { ResultadoValidacionImportacion } from './api';

interface ValidacionPanelProps {
  validacion: ResultadoValidacionImportacion;
}

/**
 * El detalle de validación por empleado (OK/advertencia/error) vive en cada tarjeta de la
 * pantalla de revisión (`GrupoEmpleado`, `estadoNegocio`) desde ADR-076 — repetirlo acá era
 * redundante. Lo único que sigue siendo exclusivo de este panel son los errores globales, no
 * atados a ningún empleado en particular (ej. conceptos sin clasificar), que pueden seguir
 * bloqueando la emisión aunque la importación ya esté confirmada.
 */
export function ValidacionPanel({ validacion }: ValidacionPanelProps) {
  if (validacion.erroresGlobales.length === 0) return null;

  return (
    <Stack gap="sm">
      {validacion.erroresGlobales.map((error) => (
        <Alert key={error} color="red">
          {error}
        </Alert>
      ))}
    </Stack>
  );
}
