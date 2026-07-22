import { Button, Group, Stack, TextInput, Title } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { ApiError } from '../../shared/api/http';
import { omitirVacios } from '../../shared/forms/omitirVacios';
import { parsearFechaLocal } from '../../shared/forms/parsearFechaLocal';
import { zodValidate } from '../../shared/forms/zodValidate';
import type { Importacion } from './api';
import { useActualizarDatosEmision } from './queries';
import { datosEmisionSchema, type DatosEmisionFormValues } from './schema';

interface DatosEmisionFormProps {
  empresaId: string;
  importacion: Importacion;
}

function aValoresFormulario(importacion: Importacion): DatosEmisionFormValues {
  return {
    fechaPago: importacion.fechaPago ? parsearFechaLocal(importacion.fechaPago) : null,
    lugarPago: importacion.lugarPago ?? '',
    fechaPagoCargasSociales: importacion.fechaPagoCargasSociales
      ? parsearFechaLocal(importacion.fechaPagoCargasSociales)
      : null,
    lugarPagoCargasSociales: importacion.lugarPagoCargasSociales ?? '',
  };
}

export function DatosEmisionForm({ empresaId, importacion }: DatosEmisionFormProps) {
  return <Formulario key={importacion.id} empresaId={empresaId} importacion={importacion} />;
}

function Formulario({ empresaId, importacion }: DatosEmisionFormProps) {
  const actualizar = useActualizarDatosEmision(empresaId, importacion.id);

  const form = useForm<DatosEmisionFormValues>({
    initialValues: aValoresFormulario(importacion),
    validate: zodValidate(datosEmisionSchema),
  });

  async function handleSubmit(values: DatosEmisionFormValues): Promise<void> {
    try {
      await actualizar.mutateAsync(omitirVacios(values));
      notifications.show({ message: 'Datos de emisión guardados', color: 'green' });
    } catch (err) {
      notifications.show({
        message: err instanceof ApiError ? err.message : 'No se pudieron guardar los datos de emisión',
        color: 'red',
      });
    }
  }

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="sm">
        <Title order={4}>Datos de emisión</Title>
        <Group grow>
          <DatePickerInput
            label="Fecha de pago"
            clearable
            valueFormat="DD/MM/YYYY"
            autoFocus
            {...form.getInputProps('fechaPago')}
          />
          <TextInput label="Lugar de pago" {...form.getInputProps('lugarPago')} />
        </Group>
        <Group grow>
          <DatePickerInput
            label="Fecha de pago de cargas sociales"
            clearable
            valueFormat="DD/MM/YYYY"
            {...form.getInputProps('fechaPagoCargasSociales')}
          />
          <TextInput label="Lugar de pago de cargas sociales" {...form.getInputProps('lugarPagoCargasSociales')} />
        </Group>
        <Group justify="flex-end">
          <Button type="submit" size="sm" loading={actualizar.isPending}>
            Guardar
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
