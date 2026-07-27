import { ActionIcon, Anchor, Badge, Group, Pagination, Paper, Select, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft, IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useEmpresa } from '../empresas/queries';
import { useEmpleados } from '../empleados/queries';
import { NOMBRES_MES } from '../importacion/nombresMes';
import { useImportaciones } from '../importacion/queries';
import type { Recibo } from './api';
import { RecibosTable } from './RecibosTable';
import { useHistorialRecibos } from './queries';

interface GrupoPeriodo {
  importacionId: string;
  label: string;
  recibos: Recibo[];
}

/** Agrupa la página actual de recibos por importación (mes), preservando el orden de llegada
 * (la lista ya viene ordenada por número descendente — ver ListarHistorialRecibosEmpresaUseCase). */
function agruparPorPeriodo(recibos: Recibo[], labelsPorImportacion: Map<string, string>): GrupoPeriodo[] {
  const porImportacion = new Map<string, Recibo[]>();
  for (const recibo of recibos) {
    const lista = porImportacion.get(recibo.importacionId) ?? [];
    lista.push(recibo);
    porImportacion.set(recibo.importacionId, lista);
  }
  return [...porImportacion.entries()].map(([importacionId, lista]) => ({
    importacionId,
    label: labelsPorImportacion.get(importacionId) ?? 'Período desconocido',
    recibos: lista,
  }));
}

export function HistorialRecibosPage() {
  const { empresaId } = useParams<{ empresaId: string }>();
  const empresa = useEmpresa(empresaId);
  const [searchParams] = useSearchParams();
  const [empleadoId, setEmpleadoId] = useState<string | null>(searchParams.get('empleadoId'));
  const [pagina, setPagina] = useState(1);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const { data: empleados } = useEmpleados(empresaId ?? '');
  const { data: importaciones } = useImportaciones(empresaId ?? '');
  const { data, isLoading } = useHistorialRecibos(empresaId ?? '', empleadoId ?? undefined, pagina);

  const opcionesEmpleado = (empleados ?? []).map((empleado) => ({
    value: empleado.id,
    label: `${empleado.apellido}, ${empleado.nombre}`,
  }));

  // Mismo formato "Mes Año" que la columna "Período" de la pantalla de Importaciones —
  // el nombre del período tiene que coincidir en las dos pantallas.
  const labelsPorImportacion = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const importacion of importaciones ?? []) {
      mapa.set(importacion.id, `${NOMBRES_MES[importacion.mes - 1]} ${importacion.anio}`);
    }
    return mapa;
  }, [importaciones]);

  const grupos = useMemo(
    () => (data ? agruparPorPeriodo(data.recibos, labelsPorImportacion) : []),
    [data, labelsPorImportacion],
  );

  function handleCambiarEmpleado(valor: string | null): void {
    setEmpleadoId(valor);
    setPagina(1);
  }

  function toggleExpandido(importacionId: string): void {
    setExpandidos((anterior) => {
      const copia = new Set(anterior);
      if (copia.has(importacionId)) {
        copia.delete(importacionId);
      } else {
        copia.add(importacionId);
      }
      return copia;
    });
  }

  const totalPaginas = data ? Math.max(1, Math.ceil(data.total / data.porPagina)) : 1;

  return (
    <Stack gap="md">
      <Anchor component={Link} to={`/empresas/${empresaId}`} size="sm">
        <Group gap={4}>
          <IconArrowLeft size={14} />
          {empresa?.razonSocial ?? 'Empresa'}
        </Group>
      </Anchor>

      <Title order={2}>Historial de recibos</Title>

      <Select
        label="Filtrar por empleado"
        placeholder="Todos los empleados"
        clearable
        data={opcionesEmpleado}
        value={empleadoId}
        onChange={handleCambiarEmpleado}
        w={320}
      />

      {isLoading && <Text c="dimmed">Cargando…</Text>}
      {data && data.total === 0 && <Text c="dimmed">No hay recibos emitidos todavía.</Text>}

      {empresaId &&
        grupos.map((grupo) => {
          const expandido = expandidos.has(grupo.importacionId);
          return (
            <Paper key={grupo.importacionId} withBorder p="sm">
              <Group justify="space-between" style={{ cursor: 'pointer' }} onClick={() => toggleExpandido(grupo.importacionId)}>
                <Group gap="xs">
                  <ActionIcon variant="subtle" size="sm">
                    {expandido ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                  </ActionIcon>
                  <Text fw={600}>{grupo.label}</Text>
                </Group>
                <Badge variant="light">
                  {grupo.recibos.length} recibo{grupo.recibos.length > 1 ? 's' : ''}
                </Badge>
              </Group>
              {expandido && (
                <Stack mt="sm">
                  <RecibosTable empresaId={empresaId} recibos={grupo.recibos} />
                </Stack>
              )}
            </Paper>
          );
        })}

      {totalPaginas > 1 && <Pagination value={pagina} onChange={setPagina} total={totalPaginas} />}
    </Stack>
  );
}
