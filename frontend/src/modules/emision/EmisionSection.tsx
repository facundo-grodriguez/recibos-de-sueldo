import { useState } from 'react';
import { Alert, Button, Divider, Group, Stack, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { ApiError } from '../../shared/api/http';
import { useAuth } from '../../shared/auth/AuthContext';
import { ConfirmModal } from '../../shared/ui/ConfirmModal';
import { LogoEmpresaUpload } from '../empresas/LogoEmpresaUpload';
import { useEmpresa } from '../empresas/queries';
import type { Importacion } from '../importacion/api';
import { DatosEmisionForm } from '../importacion/DatosEmisionForm';
import { ValidacionPanel } from '../validacion/ValidacionPanel';
import { useValidacion } from '../validacion/queries';
import { descargarLoteRecibos } from './api';
import { RecibosTable } from './RecibosTable';
import { useEmitirRecibos, useEmpleadosPendientesDeEmision, useRecibos } from './queries';

interface EmisionSectionProps {
  empresaId: string;
  importacion: Importacion;
}

export function EmisionSection({ empresaId, importacion }: EmisionSectionProps) {
  const { token } = useAuth();
  const empresa = useEmpresa(empresaId);
  const { data: recibos, isLoading: cargandoRecibos } = useRecibos(empresaId, importacion.id);
  const { data: validacion } = useValidacion(empresaId, importacion.id);
  const { data: pendientes } = useEmpleadosPendientesDeEmision(empresaId, importacion.id);
  const emitir = useEmitirRecibos(empresaId, importacion.id);
  const [confirmarAbierto, setConfirmarAbierto] = useState(false);
  const [confirmarPendientesAbierto, setConfirmarPendientesAbierto] = useState(false);
  const [descargandoLote, setDescargandoLote] = useState(false);

  const yaEmitidos = recibos !== undefined && recibos.length > 0;
  const hayPendientes = pendientes !== undefined && pendientes.length > 0;

  async function handleEmitir(): Promise<void> {
    try {
      await emitir.mutateAsync();
      notifications.show({ message: 'Recibos emitidos correctamente', color: 'green' });
    } catch (err) {
      notifications.show({
        message: err instanceof ApiError ? err.message : 'No se pudieron emitir los recibos',
        color: 'red',
      });
    } finally {
      setConfirmarAbierto(false);
    }
  }

  async function handleEmitirPendientes(): Promise<void> {
    try {
      await emitir.mutateAsync();
      notifications.show({ message: 'Recibos pendientes emitidos correctamente', color: 'green' });
    } catch (err) {
      notifications.show({
        message: err instanceof ApiError ? err.message : 'No se pudieron emitir los recibos pendientes',
        color: 'red',
      });
    } finally {
      setConfirmarPendientesAbierto(false);
    }
  }

  async function handleDescargarLote(): Promise<void> {
    setDescargandoLote(true);
    try {
      await descargarLoteRecibos(token, empresaId, importacion.id);
    } catch {
      notifications.show({ message: 'No se pudo descargar el lote de recibos', color: 'red' });
    } finally {
      setDescargandoLote(false);
    }
  }

  if (cargandoRecibos) {
    return (
      <Stack gap="md">
        <Divider />
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <Divider />
      {empresa && <LogoEmpresaUpload empresa={empresa} />}
      {!yaEmitidos && <DatosEmisionForm empresaId={empresaId} importacion={importacion} />}
      {validacion && <ValidacionPanel validacion={validacion} />}
      {!yaEmitidos && (
        <Button
          disabled={!importacion.datosEmisionCompletos || !validacion?.puedeEmitirse}
          loading={emitir.isPending}
          onClick={() => setConfirmarAbierto(true)}
        >
          Emitir recibos
        </Button>
      )}

      <ConfirmModal
        opened={confirmarAbierto}
        title="Emitir recibos"
        message="Se van a generar los recibos definitivos de este período, con numeración y hash de integridad. ¿Confirmás la emisión?"
        confirmLabel="Emitir"
        loading={emitir.isPending}
        onConfirm={() => void handleEmitir()}
        onCancel={() => setConfirmarAbierto(false)}
      />
      {yaEmitidos && hayPendientes && pendientes && (
        <Alert color="yellow" title="Hay empleados sin recibo en esta importación">
          <Stack gap="xs">
            <Text size="sm">
              {pendientes.map((e) => `${e.nombre} ${e.apellido}`).join(', ')} — probablemente estaban inactivos
              cuando se emitió el resto del lote. Si ya corresponde (ej. se reactivaron), emitilos ahora sin
              reimportar nada.
            </Text>
            <Button
              size="xs"
              loading={emitir.isPending}
              onClick={() => setConfirmarPendientesAbierto(true)}
              style={{ alignSelf: 'flex-start' }}
            >
              Emitir recibos pendientes ({pendientes.length})
            </Button>
          </Stack>
        </Alert>
      )}
      <ConfirmModal
        opened={confirmarPendientesAbierto}
        title="Emitir recibos pendientes"
        message={`Se van a generar los recibos de ${pendientes?.map((e) => `${e.nombre} ${e.apellido}`).join(', ') ?? ''}, con numeración y hash de integridad. El resto del lote no se toca. ¿Confirmás?`}
        confirmLabel="Emitir"
        loading={emitir.isPending}
        onConfirm={() => void handleEmitirPendientes()}
        onCancel={() => setConfirmarPendientesAbierto(false)}
      />
      {yaEmitidos && recibos && (
        <Stack gap="sm">
          <Group justify="space-between">
            <Title order={4}>Recibos emitidos</Title>
            <Button size="xs" variant="light" loading={descargandoLote} onClick={() => void handleDescargarLote()}>
              Descargar todos (ZIP)
            </Button>
          </Group>
          <RecibosTable empresaId={empresaId} recibos={recibos} mostrarLinkImportacion={false} />
        </Stack>
      )}
    </Stack>
  );
}
