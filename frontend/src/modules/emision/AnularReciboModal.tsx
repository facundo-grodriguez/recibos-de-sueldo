import { Button, Group, Modal, Stack, Text, Textarea } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { ApiError } from '../../shared/api/http';
import type { Recibo } from './api';
import { useAnularRecibo } from './queries';

interface AnularReciboModalProps {
  empresaId: string;
  recibo: Recibo | undefined;
  onClose: () => void;
}

interface FormValues {
  motivo: string;
}

export function AnularReciboModal({ empresaId, recibo, onClose }: AnularReciboModalProps) {
  return (
    <Modal opened={recibo !== undefined} onClose={onClose} title="Anular recibo">
      {recibo && <Formulario key={recibo.id} empresaId={empresaId} recibo={recibo} onClose={onClose} />}
    </Modal>
  );
}

function Formulario({ empresaId, recibo, onClose }: { empresaId: string; recibo: Recibo; onClose: () => void }) {
  const anular = useAnularRecibo(empresaId);
  const form = useForm<FormValues>({
    initialValues: { motivo: '' },
    validate: { motivo: (valor) => (valor.trim().length > 0 ? null : 'El motivo es obligatorio') },
  });

  async function handleSubmit(values: FormValues): Promise<void> {
    try {
      await anular.mutateAsync({ importacionId: recibo.importacionId, reciboId: recibo.id, motivo: values.motivo });
      notifications.show({ message: 'Recibo anulado', color: 'green' });
      onClose();
    } catch (err) {
      notifications.show({
        message: err instanceof ApiError ? err.message : 'No se pudo anular el recibo',
        color: 'red',
      });
    }
  }

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="sm">
        <Text size="sm" c="dimmed">
          Recibo N° {recibo.numero} — {recibo.apellido}, {recibo.nombre}
        </Text>
        <Textarea label="Motivo" required autosize minRows={2} autoFocus {...form.getInputProps('motivo')} />
        <Group justify="flex-end" mt="sm">
          <Button variant="subtle" onClick={onClose} disabled={anular.isPending}>
            Cancelar
          </Button>
          <Button type="submit" color="red" loading={anular.isPending}>
            Anular
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
