import { Button, Group, Modal, Stack, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { ApiError } from '../../shared/api/http';
import { zodValidate } from '../../shared/forms/zodValidate';
import { useCrearEmpleado } from './queries';
import { crearEmpleadoSchema, type CrearEmpleadoFormValues } from './schema';

interface CrearEmpleadoModalProps {
  empresaId: string;
  opened: boolean;
  onClose: () => void;
}

const valoresVacios: CrearEmpleadoFormValues = { nombre: '', apellido: '', cuil: '' };

export function CrearEmpleadoModal({ empresaId, opened, onClose }: CrearEmpleadoModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title="Nuevo empleado">
      {opened && <Formulario empresaId={empresaId} onClose={onClose} />}
    </Modal>
  );
}

function Formulario({ empresaId, onClose }: { empresaId: string; onClose: () => void }) {
  const crear = useCrearEmpleado(empresaId);

  const form = useForm<CrearEmpleadoFormValues>({
    initialValues: valoresVacios,
    validate: zodValidate(crearEmpleadoSchema),
  });

  async function handleSubmit(values: CrearEmpleadoFormValues): Promise<void> {
    try {
      await crear.mutateAsync(values);
      notifications.show({ message: 'Empleado creado', color: 'green' });
      onClose();
    } catch (err) {
      notifications.show({
        message: err instanceof ApiError ? err.message : 'No se pudo crear el empleado',
        color: 'red',
      });
    }
  }

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="sm">
        <TextInput label="Nombre" required autoFocus {...form.getInputProps('nombre')} />
        <TextInput label="Apellido" required {...form.getInputProps('apellido')} />
        <TextInput label="CUIL" required placeholder="20-12345678-6" {...form.getInputProps('cuil')} />
        <Group justify="flex-end" mt="sm">
          <Button variant="subtle" onClick={onClose} disabled={crear.isPending}>
            Cancelar
          </Button>
          <Button type="submit" loading={crear.isPending}>
            Guardar
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
