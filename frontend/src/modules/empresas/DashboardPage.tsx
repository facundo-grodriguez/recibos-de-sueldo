import { Alert, Button, Group, Table, Text, Title } from '@mantine/core';
import { IconEdit, IconPlus } from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import type { Empresa } from './api';
import { EmpresaFormModal } from './EmpresaFormModal';
import { useEmpresas } from './queries';

export function DashboardPage() {
  const { data: empresas, isLoading, isError } = useEmpresas();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [empresaAEditar, setEmpresaAEditar] = useState<Empresa | undefined>(undefined);
  const navigate = useNavigate();

  function abrirNueva(): void {
    setEmpresaAEditar(undefined);
    setModalAbierto(true);
  }

  function abrirEdicion(empresa: Empresa): void {
    setEmpresaAEditar(empresa);
    setModalAbierto(true);
  }

  return (
    <>
      <Group justify="space-between" mb="md">
        <Title order={2}>Empresas</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={abrirNueva}>
          Nueva empresa
        </Button>
      </Group>

      {isError && <Alert color="red">No se pudieron cargar las empresas.</Alert>}

      {!isLoading && !isError && empresas?.length === 0 && (
        <Text c="dimmed">Todavía no hay empresas. Creá la primera con &quot;Nueva empresa&quot;.</Text>
      )}

      {empresas && empresas.length > 0 && (
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Razón social</Table.Th>
              <Table.Th>CUIT</Table.Th>
              <Table.Th>Localidad</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {empresas.map((empresa) => (
              <Table.Tr
                key={empresa.id}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/empresas/${empresa.id}`)}
              >
                <Table.Td>{empresa.razonSocial}</Table.Td>
                <Table.Td>{empresa.cuit}</Table.Td>
                <Table.Td>{empresa.localidad ?? '—'}</Table.Td>
                <Table.Td onClick={(event) => event.stopPropagation()}>
                  <Button
                    variant="subtle"
                    size="xs"
                    leftSection={<IconEdit size={14} />}
                    onClick={() => abrirEdicion(empresa)}
                  >
                    Editar
                  </Button>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      <EmpresaFormModal opened={modalAbierto} onClose={() => setModalAbierto(false)} empresa={empresaAEditar} />
    </>
  );
}
