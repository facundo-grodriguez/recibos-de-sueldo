import { Alert, Anchor, Button, Group, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft, IconEdit, IconFileImport, IconHistory, IconUsers } from '@tabler/icons-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { EmpresaFormModal } from './EmpresaFormModal';
import { useEmpresa, useEmpresas } from './queries';

/** Home de una empresa puntual: accesos a empleados, importaciones e historial de recibos. */
export function EmpresaHomePage() {
  const { empresaId } = useParams<{ empresaId: string }>();
  const { isLoading } = useEmpresas();
  const empresa = useEmpresa(empresaId);
  const [modalAbierto, setModalAbierto] = useState(false);
  const navigate = useNavigate();

  if (isLoading) {
    return <Text c="dimmed">Cargando…</Text>;
  }

  if (!empresa) {
    return <Alert color="red">Empresa no encontrada.</Alert>;
  }

  const ubicacion = [empresa.domicilio, empresa.localidad, empresa.provincia].filter(Boolean).join(', ');

  return (
    <Stack gap="md">
      <Anchor component={Link} to="/" size="sm">
        <Group gap={4}>
          <IconArrowLeft size={14} />
          Empresas
        </Group>
      </Anchor>

      <Group justify="space-between">
        <Title order={2}>{empresa.razonSocial}</Title>
        <Button variant="subtle" leftSection={<IconEdit size={16} />} onClick={() => setModalAbierto(true)}>
          Editar
        </Button>
      </Group>
      <Text c="dimmed">
        CUIT {empresa.cuit}
        {ubicacion ? ` — ${ubicacion}` : ''}
      </Text>

      <Group>
        <Button
          variant="light"
          leftSection={<IconUsers size={16} />}
          onClick={() => navigate(`/empresas/${empresaId}/empleados`)}
        >
          Empleados
        </Button>
        <Button
          variant="light"
          leftSection={<IconFileImport size={16} />}
          onClick={() => navigate(`/empresas/${empresaId}/importaciones`)}
        >
          Importaciones
        </Button>
        <Button
          variant="light"
          leftSection={<IconHistory size={16} />}
          onClick={() => navigate(`/empresas/${empresaId}/recibos`)}
        >
          Historial de recibos
        </Button>
      </Group>

      <EmpresaFormModal opened={modalAbierto} onClose={() => setModalAbierto(false)} empresa={empresa} />
    </Stack>
  );
}
