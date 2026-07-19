import { Anchor, Badge, Button, Group, Stack, Switch, Table, Text, TextInput, Title } from '@mantine/core';
import { IconArrowLeft, IconPlus, IconSearch } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useEmpresa, useEmpresas } from '../empresas/queries';
import type { Empleado } from './api';
import { CrearEmpleadoModal } from './CrearEmpleadoModal';
import { EditarEmpleadoModal } from './EditarEmpleadoModal';
import { filtrarEmpleados } from './filtrarEmpleados';
import { useCambiarEstadoEmpleado, useEmpleados } from './queries';

export function EmpleadosPage() {
  const { empresaId } = useParams<{ empresaId: string }>();
  const { isLoading: cargandoEmpresas } = useEmpresas();
  const empresa = useEmpresa(empresaId);
  const { data: empleados, isLoading, isError } = useEmpleados(empresaId ?? '');
  const cambiarEstado = useCambiarEstadoEmpleado(empresaId ?? '');

  const [busqueda, setBusqueda] = useState('');
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [modalAltaAbierto, setModalAltaAbierto] = useState(false);
  const [empleadoAEditar, setEmpleadoAEditar] = useState<Empleado | undefined>(undefined);

  const empleadosFiltrados = useMemo(
    () => (empleados ? filtrarEmpleados(empleados, { busqueda, mostrarInactivos }) : []),
    [empleados, busqueda, mostrarInactivos],
  );

  if (cargandoEmpresas) {
    return <Text c="dimmed">Cargando…</Text>;
  }

  if (!empresa || !empresaId) {
    return <Text c="red">Empresa no encontrada.</Text>;
  }

  return (
    <Stack gap="md">
      <Anchor component={Link} to={`/empresas/${empresaId}`} size="sm">
        <Group gap={4}>
          <IconArrowLeft size={14} />
          {empresa.razonSocial}
        </Group>
      </Anchor>

      <Group justify="space-between">
        <Title order={2}>Empleados</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setModalAltaAbierto(true)}>
          Nuevo empleado
        </Button>
      </Group>

      <Group>
        <TextInput
          placeholder="Buscar por nombre, apellido o CUIL"
          leftSection={<IconSearch size={16} />}
          value={busqueda}
          onChange={(event) => setBusqueda(event.currentTarget.value)}
          style={{ flex: 1 }}
        />
        <Switch
          label="Mostrar inactivos"
          checked={mostrarInactivos}
          onChange={(event) => setMostrarInactivos(event.currentTarget.checked)}
        />
      </Group>

      {isError && <Text c="red">No se pudieron cargar los empleados.</Text>}

      {!isLoading && !isError && empleadosFiltrados.length === 0 && (
        <Text c="dimmed">No hay empleados que coincidan con la búsqueda.</Text>
      )}

      {empleadosFiltrados.length > 0 && (
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Apellido y nombre</Table.Th>
              <Table.Th>CUIL</Table.Th>
              <Table.Th>Categoría</Table.Th>
              <Table.Th>Legajo</Table.Th>
              <Table.Th>Banco</Table.Th>
              <Table.Th>Estado</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {empleadosFiltrados.map((empleado) => (
              <Table.Tr key={empleado.id}>
                <Table.Td>
                  {empleado.apellido}, {empleado.nombre}
                </Table.Td>
                <Table.Td>{empleado.cuil}</Table.Td>
                <Table.Td>{empleado.categoria ?? '—'}</Table.Td>
                <Table.Td>{empleado.legajo ?? '—'}</Table.Td>
                <Table.Td>{empleado.banco ?? '—'}</Table.Td>
                <Table.Td>
                  <Badge color={empleado.estado === 'activo' ? 'green' : 'gray'}>
                    {empleado.estado === 'activo' ? 'Activo' : 'Inactivo'}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs" justify="flex-end" wrap="nowrap">
                    <Button variant="subtle" size="xs" onClick={() => setEmpleadoAEditar(empleado)}>
                      Editar
                    </Button>
                    <Button
                      variant="subtle"
                      size="xs"
                      color={empleado.estado === 'activo' ? 'red' : 'green'}
                      loading={cambiarEstado.isPending}
                      onClick={() =>
                        cambiarEstado.mutate({
                          empleadoId: empleado.id,
                          estado: empleado.estado === 'activo' ? 'inactivo' : 'activo',
                        })
                      }
                    >
                      {empleado.estado === 'activo' ? 'Dar de baja' : 'Reactivar'}
                    </Button>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      <CrearEmpleadoModal
        empresaId={empresaId}
        opened={modalAltaAbierto}
        onClose={() => setModalAltaAbierto(false)}
      />
      <EditarEmpleadoModal
        empresaId={empresaId}
        empleado={empleadoAEditar}
        onClose={() => setEmpleadoAEditar(undefined)}
      />
    </Stack>
  );
}
