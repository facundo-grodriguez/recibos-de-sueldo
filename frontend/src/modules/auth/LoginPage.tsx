import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Alert, Anchor, Button, Paper, PasswordInput, Stack, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { ApiError } from '../../shared/api/http';
import { useAuth } from '../../shared/auth/AuthContext';
import { login } from './api';

interface FormValues {
  email: string;
  password: string;
}

export function LoginPage() {
  const { iniciarSesion } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    initialValues: { email: '', password: '' },
    validate: {
      email: (valor) => (/^\S+@\S+\.\S+$/.test(valor) ? null : 'Email inválido'),
      password: (valor) => (valor.length > 0 ? null : 'La contraseña es obligatoria'),
    },
  });

  async function handleSubmit(values: FormValues): Promise<void> {
    setError(null);
    setLoading(true);
    try {
      const resultado = await login(values.email, values.password);
      iniciarSesion(resultado.accessToken, values.email);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Stack align="center" justify="center" mih="100vh" p="md">
      <Paper withBorder shadow="sm" p="xl" w={360}>
        <Stack gap="md">
          <Title order={2} ta="center">
            Recibos — Ingresar
          </Title>
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="sm">
              <TextInput label="Email" type="email" required {...form.getInputProps('email')} />
              <PasswordInput label="Contraseña" required {...form.getInputProps('password')} />
              {error && (
                <Alert color="red" role="alert">
                  {error}
                </Alert>
              )}
              <Button type="submit" loading={loading} fullWidth>
                Ingresar
              </Button>
              <Anchor component={Link} to="/register" size="sm" ta="center">
                Crear una cuenta nueva
              </Anchor>
            </Stack>
          </form>
        </Stack>
      </Paper>
    </Stack>
  );
}
