import { AppShell, Button, Group, Text } from '@mantine/core';
import { Link, Outlet } from 'react-router';
import { useAuth } from '../auth/AuthContext';

/** Shell de las rutas protegidas: header con logo (vuelve al dashboard), sesión actual y logout. */
export function AppShellLayout() {
  const { email, cerrarSesion } = useAuth();

  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Text component={Link} to="/" fw={700} c="inherit" style={{ textDecoration: 'none' }}>
            Recibos de sueldo
          </Text>
          <Group gap="sm">
            <Text size="sm" c="dimmed">
              {email}
            </Text>
            <Button variant="subtle" size="sm" onClick={cerrarSesion}>
              Salir
            </Button>
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
