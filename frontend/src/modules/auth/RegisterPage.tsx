import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Alert, Anchor, Button, Checkbox, Paper, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { ApiError } from '../../shared/api/http';
import { useAuth } from '../../shared/auth/AuthContext';
import { zodValidate } from '../../shared/forms/zodValidate';
import { TerminosModal } from '../legal/TerminosModal';
import { login, register } from './api';
import { registerSchema, type RegisterFormValues } from './schema';

export function RegisterPage() {
  const { iniciarSesion } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [terminosAbiertos, setTerminosAbiertos] = useState(false);

  const form = useForm<RegisterFormValues>({
    initialValues: { email: '', nombre: '', password: '', aceptaTerminos: false },
    validate: zodValidate(registerSchema),
  });

  async function handleSubmit(values: RegisterFormValues): Promise<void> {
    setError(null);
    setLoading(true);
    try {
      await register(values);
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
      <Paper withBorder shadow="sm" p="xl" w={380}>
        <Stack gap="md">
          <Title order={2} ta="center">
            Recibos — Crear cuenta
          </Title>
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="sm">
              <TextInput label="Nombre" required {...form.getInputProps('nombre')} />
              <TextInput label="Email" type="email" required {...form.getInputProps('email')} />
              <PasswordInput label="Contraseña" required {...form.getInputProps('password')} />
              <Checkbox
                label={
                  <Text size="sm">
                    Acepto los{' '}
                    <Anchor component="button" type="button" onClick={() => setTerminosAbiertos(true)}>
                      Términos y Condiciones y el Acuerdo de Tratamiento de Datos
                    </Anchor>
                  </Text>
                }
                {...form.getInputProps('aceptaTerminos', { type: 'checkbox' })}
              />
              {error && (
                <Alert color="red" role="alert">
                  {error}
                </Alert>
              )}
              <Button type="submit" loading={loading} fullWidth>
                Crear cuenta
              </Button>
              <Anchor component={Link} to="/login" size="sm" ta="center">
                Ya tengo cuenta — Ingresar
              </Anchor>
            </Stack>
          </form>
        </Stack>
      </Paper>
      <TerminosModal opened={terminosAbiertos} onClose={() => setTerminosAbiertos(false)} />
    </Stack>
  );
}
