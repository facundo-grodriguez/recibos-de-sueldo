import { Badge, Button, Group, Paper, Progress, Stack, Text, TextInput } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import type { Importacion } from '../api';
import type { FiltroEstadoRevision } from './filtrarGrupos';

interface BarraResumenStickyProps {
  importacion: Importacion;
  filtro: FiltroEstadoRevision;
  onFiltroChange: (filtro: FiltroEstadoRevision) => void;
  busqueda: string;
  onBusquedaChange: (busqueda: string) => void;
  onExpandirTodos: () => void;
  onContraerTodos: () => void;
}

interface ContadorClickeableProps {
  etiqueta: string;
  valor: number;
  color: string;
  filtroAsociado: FiltroEstadoRevision;
  filtroActivo: FiltroEstadoRevision;
  onClick: (filtro: FiltroEstadoRevision) => void;
}

/**
 * Cada conteo del resumen es también un atajo de filtro: click en "Con error" filtra los
 * grupos a ese estado (reduce clics — decisión explícita del usuario). El filtro opera
 * sobre EMPLEADOS (ver `filtrarGrupos`), no sobre filas sueltas.
 */
function ContadorClickeable({ etiqueta, valor, color, filtroAsociado, filtroActivo, onClick }: ContadorClickeableProps) {
  return (
    <Badge
      variant={filtroActivo === filtroAsociado ? 'filled' : 'light'}
      color={color}
      size="lg"
      style={{ cursor: 'pointer' }}
      onClick={() => onClick(filtroActivo === filtroAsociado ? 'todos' : filtroAsociado)}
    >
      {etiqueta}: {valor}
    </Badge>
  );
}

export function BarraResumenSticky({
  importacion,
  filtro,
  onFiltroChange,
  busqueda,
  onBusquedaChange,
  onExpandirTodos,
  onContraerTodos,
}: BarraResumenStickyProps) {
  const porcentaje = importacion.totalFilas > 0 ? Math.round((importacion.filasValidas / importacion.totalFilas) * 100) : 0;

  return (
    <Paper withBorder p="sm" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
      <Stack gap="xs">
        <Group justify="space-between" wrap="nowrap">
          <Text size="sm">
            <b>{importacion.totalFilas}</b> conceptos — <b>{importacion.filasValidas}</b> revisados,{' '}
            <b>{importacion.filasConError}</b> pendientes ({porcentaje}%)
          </Text>
          <Group gap="xs">
            <Button variant="subtle" size="xs" onClick={onExpandirTodos}>
              Expandir todos
            </Button>
            <Button variant="subtle" size="xs" onClick={onContraerTodos}>
              Contraer todos
            </Button>
          </Group>
        </Group>

        <Progress value={porcentaje} color={porcentaje === 100 ? 'green' : 'blue'} />

        <Group gap="xs" wrap="wrap">
          <ContadorClickeable
            etiqueta="Total"
            valor={importacion.totalFilas}
            color="gray"
            filtroAsociado="todos"
            filtroActivo={filtro}
            onClick={onFiltroChange}
          />
          <ContadorClickeable
            etiqueta="Con error"
            valor={importacion.filasConError}
            color="red"
            filtroAsociado="error"
            filtroActivo={filtro}
            onClick={onFiltroChange}
          />
          <ContadorClickeable
            etiqueta="Sin clasificar"
            valor={importacion.filasSinClasificar}
            color="gray"
            filtroAsociado="sinClasificar"
            filtroActivo={filtro}
            onClick={onFiltroChange}
          />
          {importacion.filasConCorrecciones > 0 && (
            <ContadorClickeable
              etiqueta="Con corrección automática"
              valor={importacion.filasConCorrecciones}
              color="yellow"
              filtroAsociado="advertencia"
              filtroActivo={filtro}
              onClick={onFiltroChange}
            />
          )}
        </Group>

        <TextInput
          placeholder="Buscar por nombre, apellido, CUIL o concepto"
          leftSection={<IconSearch size={16} />}
          value={busqueda}
          onChange={(event) => onBusquedaChange(event.currentTarget.value)}
        />
      </Stack>
    </Paper>
  );
}
