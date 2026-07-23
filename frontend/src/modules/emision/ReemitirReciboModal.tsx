import { Alert, Badge, Button, Group, Modal, Stack, Table, Text, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import { ApiError } from '../../shared/api/http';
import { omitirVacios } from '../../shared/forms/omitirVacios';
import type { ImportacionFila } from '../importacion/api';
import { corregirFilaSchema, type CorregirFilaFormValues } from '../importacion/schema';
import { zodValidate } from '../../shared/forms/zodValidate';
import type { AjusteFilaReemision, Recibo } from './api';
import { useReemitirRecibo, usePrevisualizarReemision } from './queries';

interface ReemitirReciboModalProps {
  empresaId: string;
  recibo: Recibo | undefined;
  onClose: () => void;
}

/**
 * Previsualiza las filas del empleado antes de reemitir, permitiendo corregir
 * un dato puntual (el mismo formulario que "Corregir fila" en la importación)
 * sin tocar la fila original — la corrección se aplica solo al recibo nuevo
 * (ver ReemitirReciboUseCase.aplicarAjustes en el backend).
 */
export function ReemitirReciboModal({ empresaId, recibo, onClose }: ReemitirReciboModalProps) {
  return (
    <Modal opened={recibo !== undefined} onClose={onClose} title="Previsualizar reemisión" size="lg">
      {recibo && <Contenido empresaId={empresaId} recibo={recibo} onClose={onClose} />}
    </Modal>
  );
}

function Contenido({ empresaId, recibo, onClose }: { empresaId: string; recibo: Recibo; onClose: () => void }) {
  const { data, isLoading, isError } = usePrevisualizarReemision(empresaId, recibo.importacionId, recibo.id);
  const reemitir = useReemitirRecibo(empresaId);
  const [ajustes, setAjustes] = useState<Map<string, Partial<CorregirFilaFormValues>>>(new Map());
  const [filaEnEdicion, setFilaEnEdicion] = useState<ImportacionFila | undefined>(undefined);

  async function handleConfirmar(): Promise<void> {
    const ajustesEnviados: AjusteFilaReemision[] = [...ajustes.entries()].map(([filaId, cambios]) => ({
      filaId,
      cambios,
    }));

    try {
      await reemitir.mutateAsync({ importacionId: recibo.importacionId, reciboId: recibo.id, ajustes: ajustesEnviados });
      notifications.show({ message: 'Recibo reemitido', color: 'green' });
      onClose();
    } catch (err) {
      notifications.show({
        message: err instanceof ApiError ? err.message : 'No se pudo reemitir el recibo',
        color: 'red',
      });
    }
  }

  if (isLoading) {
    return <Text c="dimmed">Cargando…</Text>;
  }

  if (isError || !data) {
    return <Text c="red">No se pudo cargar la previsualización.</Text>;
  }

  return (
    <Stack gap="sm">
      <Text size="sm" c="dimmed">
        Recibo N° {recibo.numero} — {recibo.apellido}, {recibo.nombre}. Se genera un recibo nuevo con estos datos; el
        anulado no se modifica.
      </Text>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Concepto</Table.Th>
            <Table.Th>Monto</Table.Th>
            <Table.Th>Estado</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {data.filas.map((fila) => {
            const ajuste = ajustes.get(fila.id);
            return (
              <Table.Tr key={fila.id}>
                <Table.Td>{ajuste?.concepto ?? fila.concepto}</Table.Td>
                <Table.Td>{ajuste?.monto ?? fila.montoOriginal}</Table.Td>
                <Table.Td>{ajuste && <Badge color="blue">Corregido</Badge>}</Table.Td>
                <Table.Td>
                  <Button size="xs" variant="subtle" onClick={() => setFilaEnEdicion(fila)}>
                    {ajuste ? 'Editar corrección' : 'Corregir'}
                  </Button>
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
      {ajustes.size > 0 && (
        <Alert color="blue">
          {ajustes.size} fila{ajustes.size === 1 ? '' : 's'} con corrección puntual para este recibo.
        </Alert>
      )}
      <Group justify="flex-end" mt="sm">
        <Button variant="subtle" onClick={onClose} disabled={reemitir.isPending}>
          Cancelar
        </Button>
        <Button onClick={() => void handleConfirmar()} loading={reemitir.isPending}>
          Confirmar reemisión
        </Button>
      </Group>

      <EditarFilaLocalModal
        fila={filaEnEdicion}
        valorInicial={filaEnEdicion ? ajustes.get(filaEnEdicion.id) : undefined}
        onClose={() => setFilaEnEdicion(undefined)}
        onAplicar={(filaId, cambios) => {
          // omitirVacios: el form siempre manda los 7 campos (unidad/base
          // vacíos incluidos si la fila no los traía) — el backend rechaza
          // un string vacío en un campo opcional, solo acepta que falte.
          setAjustes((actual) => new Map(actual).set(filaId, omitirVacios(cambios)));
          setFilaEnEdicion(undefined);
        }}
      />
    </Stack>
  );
}

function aValoresFormulario(
  fila: ImportacionFila,
  valorInicial: Partial<CorregirFilaFormValues> | undefined,
): CorregirFilaFormValues {
  return {
    cuil: fila.cuil,
    nombre: fila.nombre,
    apellido: fila.apellido,
    concepto: fila.concepto,
    monto: fila.montoOriginal,
    unidad: fila.unidad ?? '',
    base: fila.base !== null ? String(fila.base) : '',
    ...valorInicial,
  };
}

/** Corrección puramente local: no llama al backend hasta confirmar toda la reemisión. */
function EditarFilaLocalModal({
  fila,
  valorInicial,
  onClose,
  onAplicar,
}: {
  fila: ImportacionFila | undefined;
  valorInicial: Partial<CorregirFilaFormValues> | undefined;
  onClose: () => void;
  onAplicar: (filaId: string, cambios: CorregirFilaFormValues) => void;
}) {
  return (
    <Modal opened={fila !== undefined} onClose={onClose} title="Corregir fila (solo para este recibo)" size="md">
      {fila && (
        <FormularioEdicionLocal
          fila={fila}
          valorInicial={valorInicial}
          onClose={onClose}
          onAplicar={onAplicar}
        />
      )}
    </Modal>
  );
}

function FormularioEdicionLocal({
  fila,
  valorInicial,
  onClose,
  onAplicar,
}: {
  fila: ImportacionFila;
  valorInicial: Partial<CorregirFilaFormValues> | undefined;
  onClose: () => void;
  onAplicar: (filaId: string, cambios: CorregirFilaFormValues) => void;
}) {
  const form = useForm<CorregirFilaFormValues>({
    initialValues: aValoresFormulario(fila, valorInicial),
    validate: zodValidate(corregirFilaSchema),
  });

  return (
    <form onSubmit={form.onSubmit((valores) => onAplicar(fila.id, valores))}>
      <Stack gap="sm">
        <Text size="sm" c="dimmed">
          Fila {fila.numeroFila} — esta corrección solo aplica al recibo nuevo
        </Text>
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
          <Button variant="subtle" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Aplicar</Button>
        </Group>
      </Stack>
    </form>
  );
}
