import { Button, Group, Modal, Stack, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { ApiError } from '../../shared/api/http';
import { omitirVacios } from '../../shared/forms/omitirVacios';
import { zodValidate } from '../../shared/forms/zodValidate';
import type { Empresa } from './api';
import { useActualizarEmpresa, useCrearEmpresa } from './queries';
import { empresaFormSchema, type EmpresaFormValues } from './schema';

interface EmpresaFormModalProps {
  opened: boolean;
  onClose: () => void;
  /** Si viene, el modal edita esta empresa; si no, crea una nueva. */
  empresa?: Empresa;
}

const valoresVacios: EmpresaFormValues = {
  razonSocial: '',
  cuit: '',
  nombreFantasia: '',
  domicilio: '',
  localidad: '',
  provincia: '',
  codigoPostal: '',
};

function aValoresFormulario(empresa: Empresa): EmpresaFormValues {
  return {
    razonSocial: empresa.razonSocial,
    cuit: empresa.cuit,
    nombreFantasia: empresa.nombreFantasia ?? '',
    domicilio: empresa.domicilio ?? '',
    localidad: empresa.localidad ?? '',
    provincia: empresa.provincia ?? '',
    codigoPostal: empresa.codigoPostal ?? '',
  };
}

export function EmpresaFormModal({ opened, onClose, empresa }: EmpresaFormModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title={empresa ? 'Editar empresa' : 'Nueva empresa'}>
      {/* key fuerza un montaje nuevo por cada empresa (o "nueva"), así el formulario siempre arranca con los valores correctos sin necesitar un efecto que los sincronice. */}
      {opened && <EmpresaForm key={empresa?.id ?? 'nueva'} empresa={empresa} onClose={onClose} />}
    </Modal>
  );
}

function EmpresaForm({ empresa, onClose }: { empresa?: Empresa; onClose: () => void }) {
  const crear = useCrearEmpresa();
  const actualizar = useActualizarEmpresa();
  const enCurso = crear.isPending || actualizar.isPending;

  const form = useForm<EmpresaFormValues>({
    initialValues: empresa ? aValoresFormulario(empresa) : valoresVacios,
    validate: zodValidate(empresaFormSchema),
  });

  async function handleSubmit(values: EmpresaFormValues): Promise<void> {
    try {
      const datos = omitirVacios(values);
      if (empresa) {
        await actualizar.mutateAsync({ empresaId: empresa.id, datos });
        notifications.show({ message: 'Empresa actualizada', color: 'green' });
      } else {
        await crear.mutateAsync(datos as EmpresaFormValues);
        notifications.show({ message: 'Empresa creada', color: 'green' });
      }
      onClose();
    } catch (err) {
      notifications.show({
        message: err instanceof ApiError ? err.message : 'No se pudo guardar la empresa',
        color: 'red',
      });
    }
  }

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="sm">
        <TextInput label="Razón social" required autoFocus {...form.getInputProps('razonSocial')} />
        <TextInput label="CUIT" required {...form.getInputProps('cuit')} />
        <TextInput label="Nombre de fantasía" {...form.getInputProps('nombreFantasia')} />
        <TextInput label="Domicilio" required {...form.getInputProps('domicilio')} />
        <TextInput label="Localidad" {...form.getInputProps('localidad')} />
        <TextInput label="Provincia" {...form.getInputProps('provincia')} />
        <TextInput label="Código postal" {...form.getInputProps('codigoPostal')} />
        <Group justify="flex-end" mt="sm">
          <Button variant="subtle" onClick={onClose} disabled={enCurso}>
            Cancelar
          </Button>
          <Button type="submit" loading={enCurso}>
            Guardar
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
