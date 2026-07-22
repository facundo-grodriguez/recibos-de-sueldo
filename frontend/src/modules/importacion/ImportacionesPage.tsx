import { Anchor, Badge, Group, Stack, Switch, Table, Text, TextInput, Title, Button } from '@mantine/core';
import { IconArrowLeft, IconSearch, IconUpload } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useEmpresa, useEmpresas } from '../empresas/queries';
import { filtrarImportaciones } from './filtrarImportaciones';
import { ImportarArchivoModal } from './ImportarArchivoModal';
import { NOMBRES_MES } from './nombresMes';
import { useImportaciones } from './queries';

export function ImportacionesPage() {
  const { empresaId } = useParams<{ empresaId: string }>();
  const { isLoading: cargandoEmpresas } = useEmpresas();
  const empresa = useEmpresa(empresaId);
  const { data: importaciones, isLoading, isError } = useImportaciones(empresaId ?? '');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarDescartadas, setMostrarDescartadas] = useState(false);
  const navigate = useNavigate();

  const importacionesFiltradas = useMemo(
    () => (importaciones ? filtrarImportaciones(importaciones, { busqueda, mostrarDescartadas }) : []),
    [importaciones, busqueda, mostrarDescartadas],
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
        <Title order={2}>Importaciones</Title>
        <Button leftSection={<IconUpload size={16} />} onClick={() => setModalAbierto(true)}>
          Importar archivo
        </Button>
      </Group>

      {isError && <Text c="red">No se pudieron cargar las importaciones.</Text>}

      {!isLoading && !isError && importaciones && importaciones.length === 0 && (
        <Text c="dimmed">Todavía no se importó ningún archivo. Empezá con &quot;Importar archivo&quot;.</Text>
      )}

      {isLoading && <Text c="dimmed">Cargando…</Text>}

      {importaciones && importaciones.length > 0 && (
        <Group>
          <TextInput
            placeholder="Buscar por archivo, mes o año"
            leftSection={<IconSearch size={16} />}
            value={busqueda}
            onChange={(event) => setBusqueda(event.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <Switch
            label="Mostrar descartadas"
            checked={mostrarDescartadas}
            onChange={(event) => setMostrarDescartadas(event.currentTarget.checked)}
          />
        </Group>
      )}

      {importaciones && importaciones.length > 0 && importacionesFiltradas.length === 0 && (
        <Text c="dimmed">Ninguna importación coincide con la búsqueda.</Text>
      )}

      {importacionesFiltradas.length > 0 && (
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Período</Table.Th>
              <Table.Th>Archivo</Table.Th>
              <Table.Th>Filas</Table.Th>
              <Table.Th>Estado</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {importacionesFiltradas.map((importacion) => (
              <Table.Tr
                key={importacion.id}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/empresas/${empresaId}/importaciones/${importacion.id}`)}
              >
                <Table.Td>
                  {NOMBRES_MES[importacion.mes - 1]} {importacion.anio}
                </Table.Td>
                <Table.Td>{importacion.nombreArchivo}</Table.Td>
                <Table.Td>
                  {importacion.filasValidas}/{importacion.totalFilas} válidas
                  {importacion.filasConError > 0 ? ` (${importacion.filasConError} con error)` : ''}
                </Table.Td>
                <Table.Td>
                  <Badge
                    color={
                      importacion.estado === 'confirmada'
                        ? 'green'
                        : importacion.estado === 'descartada'
                          ? 'gray'
                          : 'yellow'
                    }
                  >
                    {importacion.estado === 'confirmada'
                      ? 'Confirmada'
                      : importacion.estado === 'descartada'
                        ? 'Descartada'
                        : 'Previsualizada'}
                  </Badge>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      <ImportarArchivoModal empresaId={empresaId} opened={modalAbierto} onClose={() => setModalAbierto(false)} />
    </Stack>
  );
}
