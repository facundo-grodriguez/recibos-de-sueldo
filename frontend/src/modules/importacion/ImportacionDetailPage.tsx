import { useQueryClient } from '@tanstack/react-query';
import { Alert, Anchor, Badge, Button, Group, Stack, Table, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft } from '@tabler/icons-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ApiError } from '../../shared/api/http';
import { EmisionSection } from '../emision/EmisionSection';
import { MapearConceptoModal } from '../mapeo/MapearConceptoModal';
import { useConceptosSinMapear } from '../mapeo/queries';
import type { ImportacionFila } from './api';
import { CorregirFilaModal } from './CorregirFilaModal';
import { formatearMonto } from './formatearMonto';
import { NOMBRES_MES } from './nombresMes';
import { importacionKey, useConfirmarImportacion, useImportacion } from './queries';

export function ImportacionDetailPage() {
  const { empresaId, importacionId } = useParams<{ empresaId: string; importacionId: string }>();
  const { data: importacion, isLoading, isError } = useImportacion(empresaId ?? '', importacionId ?? '');
  const { data: conceptosPendientes } = useConceptosSinMapear(empresaId ?? '');
  const [conceptoAMapear, setConceptoAMapear] = useState<string | undefined>(undefined);
  const [filaACorregir, setFilaACorregir] = useState<ImportacionFila | undefined>(undefined);
  const queryClient = useQueryClient();
  const confirmar = useConfirmarImportacion(empresaId ?? '', importacionId ?? '');

  if (isLoading) {
    return <Text c="dimmed">Cargando…</Text>;
  }

  if (isError || !importacion || !empresaId || !importacionId) {
    return <Alert color="red">Importación no encontrada.</Alert>;
  }

  function refrescarImportacion(): void {
    void queryClient.invalidateQueries({ queryKey: importacionKey(empresaId as string, importacionId as string) });
  }

  async function handleConfirmar(): Promise<void> {
    try {
      await confirmar.mutateAsync();
      notifications.show({ message: 'Importación confirmada', color: 'green' });
    } catch (err) {
      notifications.show({
        message: err instanceof ApiError ? err.message : 'No se pudo confirmar la importación',
        color: 'red',
      });
    }
  }

  return (
    <Stack gap="md">
      <Anchor component={Link} to={`/empresas/${empresaId}/importaciones`} size="sm">
        <Group gap={4}>
          <IconArrowLeft size={14} />
          Importaciones
        </Group>
      </Anchor>

      <Group justify="space-between">
        <Title order={2}>
          {NOMBRES_MES[importacion.mes - 1]} {importacion.anio} — {importacion.nombreArchivo}
        </Title>
        <Group gap="sm">
          <Badge color={importacion.estado === 'confirmada' ? 'green' : 'yellow'} size="lg">
            {importacion.estado === 'confirmada' ? 'Confirmada' : 'Previsualizada'}
          </Badge>
          {importacion.estado === 'previsualizada' && (
            <Button
              size="xs"
              disabled={importacion.filasConError > 0}
              loading={confirmar.isPending}
              onClick={() => void handleConfirmar()}
            >
              Confirmar
            </Button>
          )}
        </Group>
      </Group>

      <Group gap="lg">
        <Text size="sm">
          Total: <b>{importacion.totalFilas}</b>
        </Text>
        <Text size="sm" c="green">
          Válidas: <b>{importacion.filasValidas}</b>
        </Text>
        <Text size="sm" c="red">
          Con error: <b>{importacion.filasConError}</b>
        </Text>
        <Text size="sm" c="dimmed">
          Sin clasificar: <b>{importacion.filasSinClasificar}</b>
        </Text>
        {importacion.filasConCorrecciones > 0 && (
          <Text size="sm" c="blue">
            Con corrección automática: <b>{importacion.filasConCorrecciones}</b>
          </Text>
        )}
      </Group>

      {conceptosPendientes && conceptosPendientes.length > 0 && (
        <Alert color="yellow" title="Conceptos sin mapear en esta empresa">
          <Stack gap="xs">
            {conceptosPendientes.map((concepto) => (
              <Group key={concepto} justify="space-between">
                <Text size="sm">{concepto}</Text>
                <Button size="xs" variant="light" onClick={() => setConceptoAMapear(concepto)}>
                  Mapear
                </Button>
              </Group>
            ))}
          </Stack>
        </Alert>
      )}

      <Table highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>#</Table.Th>
            <Table.Th>Apellido y nombre</Table.Th>
            <Table.Th>CUIL</Table.Th>
            <Table.Th>Concepto</Table.Th>
            <Table.Th>Monto</Table.Th>
            <Table.Th>Estado</Table.Th>
            {importacion.estado === 'previsualizada' && <Table.Th />}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {importacion.filas.map((fila) => (
            <Table.Tr key={fila.id}>
              <Table.Td>{fila.numeroFila}</Table.Td>
              <Table.Td>
                {fila.apellido}, {fila.nombre}
              </Table.Td>
              <Table.Td>{fila.cuil}</Table.Td>
              <Table.Td>{fila.concepto}</Table.Td>
              <Table.Td>{formatearMonto(fila.monto, fila.montoOriginal)}</Table.Td>
              <Table.Td>
                <Stack gap={2}>
                  <Badge color={fila.valida ? 'green' : 'red'}>{fila.valida ? 'Válida' : 'Error'}</Badge>
                  {!fila.valida && fila.errorMensaje && (
                    <Text size="xs" c="red">
                      {fila.errorMensaje}
                    </Text>
                  )}
                  {fila.correcciones.length > 0 && (
                    <Text size="xs" c="blue">
                      {fila.correcciones.join('; ')}
                    </Text>
                  )}
                </Stack>
              </Table.Td>
              {importacion.estado === 'previsualizada' && (
                <Table.Td>
                  <Button size="xs" variant="subtle" onClick={() => setFilaACorregir(fila)}>
                    Corregir
                  </Button>
                </Table.Td>
              )}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      {importacion.estado === 'confirmada' && <EmisionSection empresaId={empresaId} importacion={importacion} />}

      <MapearConceptoModal
        empresaId={empresaId}
        concepto={conceptoAMapear}
        onClose={() => setConceptoAMapear(undefined)}
        onMapeado={refrescarImportacion}
      />
      <CorregirFilaModal
        empresaId={empresaId}
        importacionId={importacionId}
        fila={filaACorregir}
        onClose={() => setFilaACorregir(undefined)}
      />
    </Stack>
  );
}
