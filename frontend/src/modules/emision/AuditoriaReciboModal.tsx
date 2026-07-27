import { Modal, Stack, Text, Timeline } from '@mantine/core';
import type { Recibo } from './api';
import { useAuditoriaRecibo } from './queries';

interface AuditoriaReciboModalProps {
  empresaId: string;
  recibo: Recibo | undefined;
  onClose: () => void;
}

const ETIQUETAS_ACCION: Record<string, string> = {
  emitir: 'Emitido',
  anular: 'Anulado',
  reemitir: 'Reemitido',
};

export function AuditoriaReciboModal({ empresaId, recibo, onClose }: AuditoriaReciboModalProps) {
  const { data: entradas, isLoading } = useAuditoriaRecibo(empresaId, recibo?.importacionId ?? '', recibo?.id);

  return (
    <Modal opened={recibo !== undefined} onClose={onClose} title="Historial de auditoría">
      {recibo && (
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Recibo N° {recibo.numero} — {recibo.apellido}, {recibo.nombre}
          </Text>
          {isLoading && <Text c="dimmed">Cargando…</Text>}
          {entradas && entradas.length === 0 && <Text c="dimmed">Sin eventos registrados.</Text>}
          {entradas && entradas.length > 0 && (
            <Timeline active={entradas.length}>
              {entradas.map((entrada) => (
                <Timeline.Item key={entrada.id} title={ETIQUETAS_ACCION[entrada.accion] ?? entrada.accion}>
                  <Text size="xs" c="dimmed">
                    {new Date(entrada.timestamp).toLocaleString('es-AR')}
                  </Text>
                  {entrada.accion === 'anular' && recibo.motivoAnulacion && (
                    <Text size="xs" c="dimmed">
                      Motivo: {recibo.motivoAnulacion}
                    </Text>
                  )}
                </Timeline.Item>
              ))}
            </Timeline>
          )}
        </Stack>
      )}
    </Modal>
  );
}
