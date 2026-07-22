import { Button, Group, Modal, Stack, TextInput } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { ApiError } from '../../shared/api/http';
import { omitirVacios } from '../../shared/forms/omitirVacios';
import { parsearFechaLocal } from '../../shared/forms/parsearFechaLocal';
import { zodValidate } from '../../shared/forms/zodValidate';
import type { Empleado } from './api';
import { useActualizarEmpleado } from './queries';
import { editarEmpleadoSchema, type EditarEmpleadoFormValues } from './schema';

interface EditarEmpleadoModalProps {
  empresaId: string;
  empleado: Empleado | undefined;
  onClose: () => void;
}

function aValoresFormulario(empleado: Empleado): EditarEmpleadoFormValues {
  return {
    categoria: empleado.categoria ?? '',
    fechaIngreso: empleado.fechaIngreso ? parsearFechaLocal(empleado.fechaIngreso) : null,
    legajo: empleado.legajo ?? '',
    banco: empleado.banco ?? '',
  };
}

export function EditarEmpleadoModal({ empresaId, empleado, onClose }: EditarEmpleadoModalProps) {
  return (
    <Modal opened={empleado !== undefined} onClose={onClose} title="Editar empleado">
      {empleado && <Formulario key={empleado.id} empresaId={empresaId} empleado={empleado} onClose={onClose} />}
    </Modal>
  );
}

function Formulario({
  empresaId,
  empleado,
  onClose,
}: {
  empresaId: string;
  empleado: Empleado;
  onClose: () => void;
}) {
  const actualizar = useActualizarEmpleado(empresaId);

  const form = useForm<EditarEmpleadoFormValues>({
    initialValues: aValoresFormulario(empleado),
    validate: zodValidate(editarEmpleadoSchema),
  });

  async function handleSubmit(values: EditarEmpleadoFormValues): Promise<void> {
    try {
      const datos = omitirVacios(values);
      await actualizar.mutateAsync({ empleadoId: empleado.id, datos });
      notifications.show({ message: 'Empleado actualizado', color: 'green' });
      onClose();
    } catch (err) {
      notifications.show({
        message: err instanceof ApiError ? err.message : 'No se pudo actualizar el empleado',
        color: 'red',
      });
    }
  }

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="sm">
        <TextInput label="Categoría" autoFocus {...form.getInputProps('categoria')} />
        <DatePickerInput
          label="Fecha de ingreso"
          clearable
          valueFormat="DD/MM/YYYY"
          defaultLevel="decade"
          {...form.getInputProps('fechaIngreso')}
        />
        <TextInput label="Legajo" {...form.getInputProps('legajo')} />
        <TextInput label="Banco" {...form.getInputProps('banco')} />
        <Group justify="flex-end" mt="sm">
          <Button variant="subtle" onClick={onClose} disabled={actualizar.isPending}>
            Cancelar
          </Button>
          <Button type="submit" loading={actualizar.isPending}>
            Guardar
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
