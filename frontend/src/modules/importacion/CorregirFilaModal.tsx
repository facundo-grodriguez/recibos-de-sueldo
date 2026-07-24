import { Alert, Button, Group, Modal, Stack, Text, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import { ApiError } from '../../shared/api/http';
import { omitirVacios } from '../../shared/forms/omitirVacios';
import { zodValidate } from '../../shared/forms/zodValidate';
import type { Importacion, ImportacionFila } from './api';
import { useCorregirFilaImportacion } from './queries';
import { agruparFilasPorEmpleado, tituloGrupo } from './revision/agruparFilasPorEmpleado';
import { corregirFilaSchema, type CorregirFilaFormValues } from './schema';

/** Campos de identidad del empleado — corregir uno se propaga a todas sus líneas (ver CorregirFilaImportacionUseCase). */
const CAMPOS_IDENTIDAD = ['cuil', 'nombre', 'apellido'] as const;

/**
 * Mensaje de éxito según lo que se corrigió. Si se tocó la identidad
 * (CUIL/nombre/apellido), el backend la propaga a todas las líneas de esa
 * persona — el aviso lo refleja contando cuántas quedaron con el CUIL nuevo.
 * Se cuenta sobre el CUIL YA normalizado por el backend (la fila editada tal
 * como volvió en la respuesta), no sobre lo tipeado, que puede traer guiones.
 */
function mensajeExito(fila: ImportacionFila, cambios: Record<string, unknown>, importacion: Importacion): string {
  const tocoIdentidad = CAMPOS_IDENTIDAD.some((campo) => campo in cambios);
  const filaActualizada = importacion.filas.find((f) => f.id === fila.id);
  if (!tocoIdentidad || !filaActualizada) {
    return `Fila ${fila.numeroFila} corregida`;
  }

  const grupo = agruparFilasPorEmpleado(importacion.filas).find(
    (g) => g.cuil.trim() === filaActualizada.cuil.trim(),
  );
  const cantidad = grupo?.filas.length ?? 1;
  const nombre = grupo ? tituloGrupo(grupo) : `${fila.apellido}, ${fila.nombre}`;

  return cantidad > 1
    ? `Se corrigió la identidad en las ${cantidad} líneas de ${nombre}`
    : `Fila ${fila.numeroFila} corregida`;
}

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
      const cambios = omitirVacios(values);
      const importacionActualizada = await corregir.mutateAsync({ filaId: fila.id, cambios });
      const filaActualizada = importacionActualizada.filas.find((f) => f.id === fila.id);

      // El guardado en sí puede tener éxito (200) aunque el dato siga siendo
      // inválido — el backend revalida y solo actualiza el error, no lo
      // rechaza. Si seguimos sin verificar esto acá, el usuario ve "corregida"
      // en verde y la fila sigue con error en la tabla de atrás.
      if (filaActualizada && !filaActualizada.valida) {
        setErrorPersistente(filaActualizada.errorMensaje ?? 'La fila sigue sin ser válida');
        return;
      }

      notifications.show({ message: mensajeExito(fila, cambios, importacionActualizada), color: 'green' });
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
