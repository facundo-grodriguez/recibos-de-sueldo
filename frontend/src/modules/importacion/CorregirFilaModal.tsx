import { Alert, Button, Group, Modal, Stack, Text, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import { ApiError } from '../../shared/api/http';
import { omitirVacios } from '../../shared/forms/omitirVacios';
import { zodValidate } from '../../shared/forms/zodValidate';
import type { ImportacionFila } from './api';
import { useCorregirFilaImportacion } from './queries';
import { corregirFilaSchema, type CorregirFilaFormValues } from './schema';

interface CorregirFilaModalProps {
  empresaId: string;
  importacionId: string;
  fila: ImportacionFila | undefined;
  onClose: () => void;
  /** Se llama solo cuando la corrección se guardó con éxito (no al cancelar) — usado para saltar automáticamente al próximo error. */
  onCorregida?: () => void;
}

export function CorregirFilaModal({ empresaId, importacionId, fila, onClose, onCorregida }: CorregirFilaModalProps) {
  return (
    <Modal opened={fila !== undefined} onClose={onClose} title="Corregir fila" size="md">
      {fila && (
        <Formulario
          key={fila.id}
          empresaId={empresaId}
          importacionId={importacionId}
          fila={fila}
          onClose={onClose}
          onCorregida={onCorregida}
        />
      )}
    </Modal>
  );
}

function aValoresFormulario(fila: ImportacionFila): CorregirFilaFormValues {
  return {
    cuil: fila.cuil,
    nombre: fila.nombre,
    apellido: fila.apellido,
    concepto: fila.concepto,
    monto: fila.montoOriginal,
    unidad: fila.unidad ?? '',
    base: fila.base !== null ? String(fila.base) : '',
  };
}

function Formulario({
  empresaId,
  importacionId,
  fila,
  onClose,
  onCorregida,
}: {
  empresaId: string;
  importacionId: string;
  fila: ImportacionFila;
  onClose: () => void;
  onCorregida?: () => void;
}) {
  const corregir = useCorregirFilaImportacion(empresaId, importacionId);
  const [errorPersistente, setErrorPersistente] = useState<string | undefined>(undefined);

  const form = useForm<CorregirFilaFormValues>({
    initialValues: aValoresFormulario(fila),
    validate: zodValidate(corregirFilaSchema),
  });

  async function handleSubmit(values: CorregirFilaFormValues): Promise<void> {
    setErrorPersistente(undefined);
    try {
      const importacionActualizada = await corregir.mutateAsync({ filaId: fila.id, cambios: omitirVacios(values) });
      const filaActualizada = importacionActualizada.filas.find((f) => f.id === fila.id);

      // El guardado en sí puede tener éxito (200) aunque el dato siga siendo
      // inválido — el backend revalida y solo actualiza el error, no lo
      // rechaza. Si seguimos sin verificar esto acá, el usuario ve "corregida"
      // en verde y la fila sigue con error en la tabla de atrás.
      if (filaActualizada && !filaActualizada.valida) {
        setErrorPersistente(filaActualizada.errorMensaje ?? 'La fila sigue sin ser válida');
        return;
      }

      notifications.show({ message: `Fila ${fila.numeroFila} corregida`, color: 'green' });
      onClose();
      onCorregida?.();
    } catch (err) {
      notifications.show({
        message: err instanceof ApiError ? err.message : 'No se pudo corregir la fila',
        color: 'red',
      });
    }
  }

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="sm">
        <Text size="sm" c="dimmed">
          Fila {fila.numeroFila}
        </Text>
        {errorPersistente && (
          <Alert color="red" title="Sigue sin ser válida">
            {errorPersistente}
          </Alert>
        )}
        <Group grow>
          <TextInput label="CUIL" autoFocus {...form.getInputProps('cuil')} />
          <TextInput label="Monto" {...form.getInputProps('monto')} />
        </Group>
        <Group grow>
          <TextInput label="Nombre" {...form.getInputProps('nombre')} />
          <TextInput label="Apellido" {...form.getInputProps('apellido')} />
        </Group>
        <TextInput label="Concepto" {...form.getInputProps('concepto')} />
        <Group grow>
          <TextInput label="Unidad (opcional)" {...form.getInputProps('unidad')} />
          <TextInput label="Base (opcional)" {...form.getInputProps('base')} />
        </Group>
        <Group justify="flex-end" mt="sm">
          <Button variant="subtle" onClick={onClose} disabled={corregir.isPending}>
            Cancelar
          </Button>
          <Button type="submit" loading={corregir.isPending}>
            Guardar
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
