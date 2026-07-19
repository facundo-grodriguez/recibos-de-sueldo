import { Button, Divider, Group, Stack, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { ApiError } from '../../shared/api/http';
import { useAuth } from '../../shared/auth/AuthContext';
import type { Importacion } from '../importacion/api';
import { DatosEmisionForm } from '../importacion/DatosEmisionForm';
import { ValidacionPanel } from '../validacion/ValidacionPanel';
import { useValidacion } from '../validacion/queries';
import { descargarLoteRecibos } from './api';
import { RecibosTable } from './RecibosTable';
import { useEmitirRecibos, useRecibos } from './queries';

interface EmisionSectionProps {
  empresaId: string;
  importacion: Importacion;
}

export function EmisionSection({ empresaId, importacion }: EmisionSectionProps) {
  const { token } = useAuth();
  const { data: recibos } = useRecibos(empresaId, importacion.id);
  const { data: validacion } = useValidacion(empresaId, importacion.id);
  const emitir = useEmitirRecibos(empresaId, importacion.id);

  const yaEmitidos = recibos !== undefined && recibos.length > 0;

  async function handleEmitir(): Promise<void> {
    try {
      await emitir.mutateAsync();
      notifications.show({ message: 'Recibos emitidos correctamente', color: 'green' });
    } catch (err) {
      notifications.show({
        message: err instanceof ApiError ? err.message : 'No se pudieron emitir los recibos',
        color: 'red',
      });
    }
  }

  async function handleDescargarLote(): Promise<void> {
    try {
      await descargarLoteRecibos(token, empresaId, importacion.id);
    } catch {
      notifications.show({ message: 'No se pudo descargar el lote de recibos', color: 'red' });
    }
  }

  return (
    <Stack gap="md">
      <Divider />
      {!yaEmitidos && <DatosEmisionForm empresaId={empresaId} importacion={importacion} />}
      {validacion && <ValidacionPanel validacion={validacion} />}
      {!yaEmitidos && (
        <Button
          disabled={!importacion.datosEmisionCompletos || !validacion?.puedeEmitirse}
          loading={emitir.isPending}
          onClick={() => void handleEmitir()}
        >
          Emitir recibos
        </Button>
      )}
      {yaEmitidos && recibos && (
        <Stack gap="sm">
          <Group justify="space-between">
            <Title order={4}>Recibos emitidos</Title>
            <Button size="xs" variant="light" onClick={() => void handleDescargarLote()}>
              Descargar todos (ZIP)
            </Button>
          </Group>
          <RecibosTable empresaId={empresaId} recibos={recibos} />
        </Stack>
      )}
    </Stack>
  );
}
