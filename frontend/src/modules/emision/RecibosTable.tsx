import { ActionIcon, Badge, Button, Group, Stack, Table, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { Fragment, useMemo, useState } from 'react';
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
  /** "Ver importación" tiene sentido en el historial global (recibos de varias importaciones
   * distintas), pero no dentro de la propia pantalla de una importación — ahí apuntaría a la
   * misma página en la que ya se está. Default true (historial global). */
  mostrarLinkImportacion?: boolean;
}

/** Vigente primero, después todos los anulados juntos (nunca intercalados entre sí). */
const ORDEN_ESTADO: Record<string, number> = { vigente: 0, anulado: 1 };

interface GrupoRecibosPersona {
  clave: string;
  cuil: string;
  /** Fila que se ve siempre: el vigente si hay uno, o el más reciente de sus anulados si no. */
  representante: Recibo;
  /** El resto de los recibos de la misma persona en el mismo período (historial de
   * anulaciones/reemisiones), más viejo a más nuevo — solo visible al desplegar. Vacío si la
   * persona tiene un único recibo en ese período. */
  resto: Recibo[];
}

/** Agrupa por CUIL + importación: una persona con varios recibos en el mismo período
 * (típicamente una cadena anular→reemitir repetida) pasa a ser un solo grupo con una flechita de
 * despliegue, en vez de una fila por recibo repitiendo el nombre. Agrupar solo por CUIL mezclaría
 * el vigente de un período con el de otro (una persona tiene un vigente por período, no uno solo
 * en total) y el vigente "perdedor" quedaría escondido en el historial etiquetado como anulado. */
function agruparPorPersona(recibos: Recibo[]): GrupoRecibosPersona[] {
  const porClave = new Map<string, Recibo[]>();
  for (const recibo of recibos) {
    const clave = `${recibo.cuil}|${recibo.importacionId}`;
    const lista = porClave.get(clave) ?? [];
    lista.push(recibo);
    porClave.set(clave, lista);
  }

  const grupos: GrupoRecibosPersona[] = [];
  for (const [clave, lista] of porClave) {
    const ordenados = [...lista].sort((a, b) => b.numero - a.numero);
    const representante = ordenados.find((r) => r.estado === 'vigente') ?? ordenados[0];
    const resto = ordenados.filter((r) => r.id !== representante.id).reverse();
    grupos.push({ clave, cuil: representante.cuil, representante, resto });
  }

  grupos.sort((a, b) => {
    const ordenA = ORDEN_ESTADO[a.representante.estado] ?? 99;
    const ordenB = ORDEN_ESTADO[b.representante.estado] ?? 99;
    if (ordenA !== ordenB) return ordenA - ordenB;
    return a.representante.apellido.localeCompare(b.representante.apellido, 'es');
  });

  return grupos;
}

export function RecibosTable({ empresaId, recibos, mostrarLinkImportacion = true }: RecibosTableProps) {
  const { token } = useAuth();
  const [reciboAAnular, setReciboAAnular] = useState<Recibo | undefined>(undefined);
  const [reciboAuditoria, setReciboAuditoria] = useState<Recibo | undefined>(undefined);
  const [reciboAReemitir, setReciboAReemitir] = useState<Recibo | undefined>(undefined);
  const [descargandoId, setDescargandoId] = useState<string | undefined>(undefined);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const grupos = useMemo(() => agruparPorPersona(recibos), [recibos]);

  // Un recibo anulado ya reemitido no debe ofrecer "Reemitir" de nuevo (el backend lo rechazaría).
  const yaReemplazados = new Set(recibos.map((r) => r.reemplazaAId).filter((id): id is string => id !== null));

  function toggleExpandido(clave: string): void {
    setExpandidos((anterior) => {
      const copia = new Set(anterior);
      if (copia.has(clave)) {
        copia.delete(clave);
      } else {
        copia.add(clave);
      }
      return copia;
    });
  }

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

  function filaAcciones(recibo: Recibo) {
    return (
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
        {mostrarLinkImportacion && (
          <Button
            size="xs"
            variant="subtle"
            component={Link}
            to={`/empresas/${empresaId}/importaciones/${recibo.importacionId}`}
          >
            Ver importación
          </Button>
        )}
      </Group>
    );
  }

  return (
    <Stack gap="sm">
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th />
            <Table.Th>N°</Table.Th>
            <Table.Th>Apellido y nombre</Table.Th>
            <Table.Th>CUIL</Table.Th>
            <Table.Th>Neto</Table.Th>
            <Table.Th>Estado</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {grupos.map((grupo) => {
            const tieneHistorial = grupo.resto.length > 0;
            const expandido = expandidos.has(grupo.clave);
            return (
              <Fragment key={grupo.clave}>
                <Table.Tr>
                  <Table.Td>
                    {tieneHistorial && (
                      <ActionIcon variant="subtle" size="sm" onClick={() => toggleExpandido(grupo.clave)}>
                        {expandido ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                      </ActionIcon>
                    )}
                  </Table.Td>
                  <Table.Td>{grupo.representante.numero}</Table.Td>
                  <Table.Td>
                    {grupo.representante.apellido}, {grupo.representante.nombre}
                  </Table.Td>
                  <Table.Td>{grupo.representante.cuil}</Table.Td>
                  <Table.Td>
                    {grupo.representante.neto.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
                  </Table.Td>
                  <Table.Td>
                    <Group gap={6} wrap="nowrap">
                      <Badge color={grupo.representante.estado === 'vigente' ? 'green' : 'red'}>
                        {grupo.representante.estado === 'vigente' ? 'Vigente' : 'Anulado'}
                      </Badge>
                      {tieneHistorial && (
                        <Text size="xs" c="dimmed">
                          +{grupo.resto.length} anulado{grupo.resto.length > 1 ? 's' : ''}
                        </Text>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td>{filaAcciones(grupo.representante)}</Table.Td>
                </Table.Tr>
                {expandido &&
                  grupo.resto.map((recibo) => (
                    <Table.Tr key={recibo.id} c="dimmed">
                      <Table.Td />
                      <Table.Td>{recibo.numero}</Table.Td>
                      <Table.Td />
                      <Table.Td />
                      <Table.Td>{recibo.neto.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</Table.Td>
                      <Table.Td>
                        <Badge color={recibo.estado === 'vigente' ? 'green' : 'red'} variant="light">
                          {recibo.estado === 'vigente' ? 'Vigente' : 'Anulado'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{filaAcciones(recibo)}</Table.Td>
                    </Table.Tr>
                  ))}
              </Fragment>
            );
          })}
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
