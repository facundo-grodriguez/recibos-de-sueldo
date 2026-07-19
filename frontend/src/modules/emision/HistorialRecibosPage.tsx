import { Anchor, Group, Select, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useEmpleados } from '../empleados/queries';
import { RecibosTable } from './RecibosTable';
import { useHistorialRecibos } from './queries';

export function HistorialRecibosPage() {
  const { empresaId } = useParams<{ empresaId: string }>();
  const [empleadoId, setEmpleadoId] = useState<string | null>(null);
  const { data: empleados } = useEmpleados(empresaId ?? '');
  const { data: recibos, isLoading } = useHistorialRecibos(empresaId ?? '', empleadoId ?? undefined);

  const opcionesEmpleado = (empleados ?? []).map((empleado) => ({
    value: empleado.id,
    label: `${empleado.apellido}, ${empleado.nombre}`,
  }));

  return (
    <Stack gap="md">
      <Anchor component={Link} to={`/empresas/${empresaId}`} size="sm">
        <Group gap={4}>
          <IconArrowLeft size={14} />
          Empresa
        </Group>
      </Anchor>

      <Title order={2}>Historial de recibos</Title>

      <Select
        label="Filtrar por empleado"
        placeholder="Todos los empleados"
        clearable
        data={opcionesEmpleado}
        value={empleadoId}
        onChange={setEmpleadoId}
        w={320}
      />

      {isLoading && <Text c="dimmed">Cargando…</Text>}
      {recibos && recibos.length === 0 && <Text c="dimmed">No hay recibos emitidos todavía.</Text>}
      {recibos && recibos.length > 0 && empresaId && <RecibosTable empresaId={empresaId} recibos={recibos} />}
    </Stack>
  );
}
