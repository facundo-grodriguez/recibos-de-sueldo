import { forwardRef } from 'react';
import { ActionIcon, Badge, Button, Collapse, Group, Paper, Stack, Table, Text } from '@mantine/core';
import { IconAlertTriangle, IconCheck, IconChevronDown, IconChevronRight, IconX } from '@tabler/icons-react';
import { formatearMoneda } from '../../../shared/format/formatearMoneda';
import type { TotalesEmpleado } from '../../validacion/api';
import type { ImportacionFila } from '../api';
import { formatearMonto } from '../formatearMonto';
import { resumenGrupo, tituloGrupo, type GrupoEmpleado as GrupoEmpleadoData } from './agruparFilasPorEmpleado';

/** Juicio de negocio del empleado (comparación contra período anterior, etc.) — a diferencia de `totales`, esto solo se pasa cuando la importación ya está `confirmada` (ver ADR-076): mientras se sigue corrigiendo línea por línea, no corresponde mostrarlo. */
export interface EstadoNegocioEmpleado {
  errores: string[];
  advertencias: string[];
}

interface GrupoEmpleadoProps {
  grupo: GrupoEmpleadoData;
  expandido: boolean;
  onToggle: () => void;
  /** Totales objetivos (Bruto/Neto/Costo laboral) de `GET .../validacion` — solo `.totales`. `undefined` si el grupo no tiene ninguna fila válida agrupable (ADR-072/entity: `agruparFilasPorCuilValido` no lo incluye) o es el grupo "sin identificar". */
  totales: TotalesEmpleado | undefined;
  /** `undefined` mientras la importación sigue `previsualizada` — recién se pasa (y se muestra) una vez confirmada. */
  estadoNegocio: EstadoNegocioEmpleado | undefined;
  puedeCorregir: boolean;
  onCorregir: (fila: ImportacionFila) => void;
  filaErrorActivaId?: string;
}

export const GrupoEmpleado = forwardRef<HTMLDivElement, GrupoEmpleadoProps>(function GrupoEmpleado(
  { grupo, expandido, onToggle, totales, estadoNegocio, puedeCorregir, onCorregir, filaErrorActivaId },
  ref,
) {
  const resumen = resumenGrupo(grupo);
  const mensajesNegocio = estadoNegocio ? [...estadoNegocio.errores, ...estadoNegocio.advertencias] : [];

  return (
    <Paper ref={ref} withBorder p="sm" data-cuil={grupo.cuil || undefined}>
      <Stack gap="xs">
        <Group justify="space-between" wrap="nowrap" style={{ cursor: 'pointer' }} onClick={onToggle}>
          <Group gap="xs" wrap="nowrap">
            <ActionIcon variant="subtle" size="sm" aria-label={expandido ? 'Contraer' : 'Expandir'}>
              {expandido ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
            </ActionIcon>
            <div>
              <Text fw={600} size="sm">
                {tituloGrupo(grupo)}
              </Text>
              {!grupo.sinIdentificar && (grupo.nombre || grupo.apellido) && (
                <Text size="xs" c="dimmed">
                  CUIL {grupo.cuil}
                </Text>
              )}
            </div>
          </Group>

          <Group gap="xs" wrap="nowrap">
            <Badge variant="light" color="gray">
              {resumen.conceptos} concepto{resumen.conceptos === 1 ? '' : 's'}
            </Badge>
            <Badge variant="light" color="green">
              ✔ {resumen.validos}
            </Badge>
            {resumen.tieneAdvertencia && (
              <Badge variant="light" color="yellow" leftSection={<IconAlertTriangle size={12} />}>
                {resumen.correcciones}
              </Badge>
            )}
            {resumen.tieneError && (
              <Badge variant="filled" color="red" leftSection={<IconX size={12} />}>
                {resumen.errores}
              </Badge>
            )}
            {estadoNegocio && <BadgeEstadoNegocio estadoNegocio={estadoNegocio} />}
          </Group>
        </Group>

        {!grupo.sinIdentificar && (
          <Group gap="lg" pl={30}>
            <TotalEmpleado etiqueta="Costo laboral" valor={totales?.costoLaboralTotal} parcial={resumen.tieneError} />
            <TotalEmpleado etiqueta="Bruto" valor={totales?.totalBruto} parcial={resumen.tieneError} />
            <TotalEmpleado etiqueta="Neto" valor={totales?.neto} parcial={resumen.tieneError} />
          </Group>
        )}

        {mensajesNegocio.length > 0 && (
          <Stack gap={2} pl={30}>
            {estadoNegocio?.errores.map((mensaje) => (
              <Text key={mensaje} size="xs" c="red">
                {mensaje}
              </Text>
            ))}
            {estadoNegocio?.advertencias.map((mensaje) => (
              <Text key={mensaje} size="xs" c="yellow.7">
                {mensaje}
              </Text>
            ))}
          </Stack>
        )}

        <Collapse expanded={expandido}>
          <Table highlightOnHover mt="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>#</Table.Th>
                <Table.Th>Concepto</Table.Th>
                <Table.Th>Monto</Table.Th>
                <Table.Th>Estado</Table.Th>
                {puedeCorregir && <Table.Th />}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {grupo.filas.map((fila) => (
                <Table.Tr key={fila.id} bg={fila.id === filaErrorActivaId ? 'yellow.1' : undefined} data-fila-id={fila.id}>
                  <Table.Td>{fila.numeroFila}</Table.Td>
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
                        <Text size="xs" c="yellow.7">
                          {fila.correcciones.join('; ')}
                        </Text>
                      )}
                    </Stack>
                  </Table.Td>
                  {puedeCorregir && (
                    <Table.Td>
                      <Button size="xs" variant="subtle" onClick={() => onCorregir(fila)}>
                        Corregir
                      </Button>
                    </Table.Td>
                  )}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Collapse>
      </Stack>
    </Paper>
  );
});

/** Bruto/Neto/Costo laboral: dato objetivo (`calcularTotalesEmpleado`), nunca un juicio de negocio. */
function TotalEmpleado({ etiqueta, valor, parcial }: { etiqueta: string; valor: number | undefined; parcial: boolean }) {
  return (
    <Text size="xs" c="dimmed">
      {etiqueta}: <b>{valor !== undefined ? formatearMoneda(valor) : '—'}</b>
      {parcial && valor !== undefined && ' (parcial — hay errores sin corregir)'}
    </Text>
  );
}

/** Solo se renderiza una vez confirmada la importación (ver `estadoNegocio` en `GrupoEmpleadoProps`) — reemplaza a la vieja tabla de "Validación" persona por persona (ADR-076). */
function BadgeEstadoNegocio({ estadoNegocio }: { estadoNegocio: EstadoNegocioEmpleado }) {
  if (estadoNegocio.errores.length > 0) {
    return (
      <Badge variant="filled" color="red">
        Con error
      </Badge>
    );
  }
  if (estadoNegocio.advertencias.length > 0) {
    return (
      <Badge variant="light" color="yellow" leftSection={<IconAlertTriangle size={12} />}>
        Advertencia
      </Badge>
    );
  }
  return (
    <Badge variant="light" color="green" leftSection={<IconCheck size={12} />}>
      OK
    </Badge>
  );
}
