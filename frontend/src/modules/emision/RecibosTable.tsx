import { Badge, Button, Group, Stack, Table, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../../shared/auth/AuthContext';
import { AnularReciboModal } from './AnularReciboModal';
import type { Recibo } from './api';
import { descargarRecibo } from './api';
import { AuditoriaReciboModal } from './AuditoriaReciboModal';
import { ReemitirReciboModal } from './ReemitirReciboModal';

interface RecibosTableProps {
  empresaId: string;
  recibos: Recibo[];
}

export function RecibosTable({ empresaId, recibos }: RecibosTableProps) {
  const { token } = useAuth();
  const [reciboAAnular, setReciboAAnular] = useState<Recibo | undefined>(undefined);
  const [reciboAuditoria, setReciboAuditoria] = useState<Recibo | undefined>(undefined);
  const [reciboAReemitir, setReciboAReemitir] = useState<Recibo | undefined>(undefined);
  const [descargandoId, setDescargandoId] = useState<string | undefined>(undefined);

  // Un recibo anulado ya reemitido no debe ofrecer "Reemitir" de nuevo (el backend lo rechazaría).
  const yaReemplazados = new Set(recibos.map((r) => r.reemplazaAId).filter((id): id is string => id !== null));

  async function handleDescargar(recibo: Recibo): Promise<void> {
    setDescargandoId(recibo.id);
    try {
      await descargarRecibo(token, empresaId, recibo.importacionId, recibo);
    } catch {
      notifications.show({ message: 'No se pudo descargar el recibo', color: 'red' });
    } finally {
      setDescargandoId(undefined);
    }
  }

  return (
    <Stack gap="sm">
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>N°</Table.Th>
            <Table.Th>Apellido y nombre</Table.Th>
            <Table.Th>CUIL</Table.Th>
            <Table.Th>Neto</Table.Th>
            <Table.Th>Estado</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {recibos.map((recibo) => (
            <Table.Tr key={recibo.id}>
              <Table.Td>{recibo.numero}</Table.Td>
              <Table.Td>
                {recibo.apellido}, {recibo.nombre}
              </Table.Td>
              <Table.Td>{recibo.cuil}</Table.Td>
              <Table.Td>
                {recibo.neto.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
              </Table.Td>
              <Table.Td>
                <Stack gap={2}>
                  <Badge color={recibo.estado === 'vigente' ? 'green' : 'red'}>
                    {recibo.estado === 'vigente' ? 'Vigente' : 'Anulado'}
                  </Badge>
                  {recibo.motivoAnulacion && (
                    <Text size="xs" c="dimmed">
                      {recibo.motivoAnulacion}
                    </Text>
                  )}
                </Stack>
              </Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <Button
                    size="xs"
                    variant="light"
                    loading={descargandoId === recibo.id}
                    onClick={() => void handleDescargar(recibo)}
                  >
                    Descargar
                  </Button>
                  {recibo.estado === 'vigente' && (
                    <Button size="xs" variant="light" color="red" onClick={() => setReciboAAnular(recibo)}>
                      Anular
                    </Button>
                  )}
                  {recibo.estado === 'anulado' && !yaReemplazados.has(recibo.id) && (
                    <Button size="xs" variant="light" onClick={() => setReciboAReemitir(recibo)}>
                      Reemitir
                    </Button>
                  )}
                  <Button size="xs" variant="subtle" onClick={() => setReciboAuditoria(recibo)}>
                    Ver auditoría
                  </Button>
                  <Button
                    size="xs"
                    variant="subtle"
                    component={Link}
                    to={`/empresas/${empresaId}/importaciones/${recibo.importacionId}`}
                  >
                    Ver importación
                  </Button>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <AnularReciboModal empresaId={empresaId} recibo={reciboAAnular} onClose={() => setReciboAAnular(undefined)} />
      <AuditoriaReciboModal
        empresaId={empresaId}
        recibo={reciboAuditoria}
        onClose={() => setReciboAuditoria(undefined)}
      />
      <ReemitirReciboModal
        empresaId={empresaId}
        recibo={reciboAReemitir}
        onClose={() => setReciboAReemitir(undefined)}
      />
    </Stack>
  );
}
