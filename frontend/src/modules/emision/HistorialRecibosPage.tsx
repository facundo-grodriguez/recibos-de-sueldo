import { Anchor, Group, Pagination, Select, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useEmpresa } from '../empresas/queries';
import { useEmpleados } from '../empleados/queries';
import { RecibosTable } from './RecibosTable';
import { useHistorialRecibos } from './queries';

export function HistorialRecibosPage() {
  const { empresaId } = useParams<{ empresaId: string }>();
  const empresa = useEmpresa(empresaId);
  const [searchParams] = useSearchParams();
  const [empleadoId, setEmpleadoId] = useState<string | null>(searchParams.get('empleadoId'));
  const [pagina, setPagina] = useState(1);
  const { data: empleados } = useEmpleados(empresaId ?? '');
  const { data, isLoading } = useHistorialRecibos(empresaId ?? '', empleadoId ?? undefined, pagina);

  const opcionesEmpleado = (empleados ?? []).map((empleado) => ({
    value: empleado.id,
    label: `${empleado.apellido}, ${empleado.nombre}`,
  }));

  function handleCambiarEmpleado(valor: string | null): void {
    setEmpleadoId(valor);
    setPagina(1);
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
      {data && data.recibos.length > 0 && empresaId && (
        <>
          <RecibosTable empresaId={empresaId} recibos={data.recibos} />
          {totalPaginas > 1 && <Pagination value={pagina} onChange={setPagina} total={totalPaginas} />}
        </>
      )}
    </Stack>
  );
}
