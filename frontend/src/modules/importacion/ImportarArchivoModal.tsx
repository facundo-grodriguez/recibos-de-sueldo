import { Anchor, Button, FileInput, Group, Modal, NumberInput, Select, Stack, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconDownload } from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ApiError } from '../../shared/api/http';
import { zodValidate } from '../../shared/forms/zodValidate';
import { useImportarArchivo } from './queries';
import { importarArchivoSchema, type ImportarArchivoFormValues } from './schema';

const MESES = [
  { value: '1', label: 'Enero' },
  { value: '2', label: 'Febrero' },
  { value: '3', label: 'Marzo' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Mayo' },
  { value: '6', label: 'Junio' },
  { value: '7', label: 'Julio' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
];

interface ImportarArchivoModalProps {
  empresaId: string;
  opened: boolean;
  onClose: () => void;
}

export function ImportarArchivoModal({ empresaId, opened, onClose }: ImportarArchivoModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title="Importar archivo">
      {opened && <Formulario empresaId={empresaId} onClose={onClose} />}
    </Modal>
  );
}

function Formulario({ empresaId, onClose }: { empresaId: string; onClose: () => void }) {
  const importar = useImportarArchivo(empresaId);
  const navigate = useNavigate();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);

  const hoy = new Date();
  const form = useForm<ImportarArchivoFormValues>({
    initialValues: { anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 },
    validate: zodValidate(importarArchivoSchema),
  });

  async function handleSubmit(values: ImportarArchivoFormValues): Promise<void> {
    if (!archivo) {
      setErrorArchivo('Elegí un archivo Excel Oficial de Importación (.xlsx)');
      return;
    }
    setErrorArchivo(null);

    try {
      const importacion = await importar.mutateAsync({ datos: values, archivo });
      notifications.show({ message: 'Archivo importado', color: 'green' });
      onClose();
      navigate(`/empresas/${empresaId}/importaciones/${importacion.id}`);
    } catch (err) {
      notifications.show({
        message: err instanceof ApiError ? err.message : 'No se pudo importar el archivo',
        color: 'red',
      });
    }
  }

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="sm">
        <Text size="sm" c="dimmed">
          ¿No tenés el archivo armado todavía?{' '}
          <Anchor href="/plantilla-excel-oficial-importacion-v1.xlsx" download>
            <Group gap={4} component="span" style={{ display: 'inline-flex' }}>
              <IconDownload size={14} />
              Descargar plantilla de ejemplo
            </Group>
          </Anchor>
        </Text>
        <Group grow>
          <NumberInput label="Año" required {...form.getInputProps('anio')} />
          <Select
            label="Mes"
            required
            data={MESES}
            allowDeselect={false}
            value={String(form.values.mes)}
            onChange={(valor) => form.setFieldValue('mes', Number(valor))}
          />
        </Group>
        <FileInput
          label="Archivo"
          placeholder="Excel Oficial de Importación (.xlsx)"
          required
          accept=".xlsx"
          value={archivo}
          onChange={(file) => {
            setArchivo(file);
            setErrorArchivo(null);
          }}
          error={errorArchivo}
        />
        <Group justify="flex-end" mt="sm">
          <Button variant="subtle" onClick={onClose} disabled={importar.isPending}>
            Cancelar
          </Button>
          <Button type="submit" loading={importar.isPending}>
            Importar
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
