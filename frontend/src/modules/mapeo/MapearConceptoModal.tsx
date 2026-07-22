import { Button, Group, Modal, Select, Stack, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { ApiError } from '../../shared/api/http';
import { zodValidate } from '../../shared/forms/zodValidate';
import { useDefinirMapeo } from './queries';
import {
  CATEGORIAS_CONTRIBUCION,
  definirMapeoSchema,
  ETIQUETAS_CATEGORIA_CONTRIBUCION,
  ETIQUETAS_TIPO_CONCEPTO,
  TIPOS_CONCEPTO,
  type DefinirMapeoFormValues,
} from './schema';

interface MapearConceptoModalProps {
  empresaId: string;
  concepto: string | undefined;
  onClose: () => void;
  /** Se llama además de invalidar la lista de pendientes propia — para que quien la use también refresque lo que necesite (ej. la importación en pantalla). */
  onMapeado?: () => void;
}

const opcionesTipo = TIPOS_CONCEPTO.map((tipo) => ({ value: tipo, label: ETIQUETAS_TIPO_CONCEPTO[tipo] }));
const opcionesCategoria = CATEGORIAS_CONTRIBUCION.map((categoria) => ({
  value: categoria,
  label: ETIQUETAS_CATEGORIA_CONTRIBUCION[categoria],
}));

export function MapearConceptoModal({ empresaId, concepto, onClose, onMapeado }: MapearConceptoModalProps) {
  return (
    <Modal opened={concepto !== undefined} onClose={onClose} title="Mapear concepto">
      {concepto && (
        <Formulario key={concepto} empresaId={empresaId} concepto={concepto} onClose={onClose} onMapeado={onMapeado} />
      )}
    </Modal>
  );
}

function Formulario({
  empresaId,
  concepto,
  onClose,
  onMapeado,
}: {
  empresaId: string;
  concepto: string;
  onClose: () => void;
  onMapeado?: () => void;
}) {
  const definir = useDefinirMapeo(empresaId);

  const form = useForm<DefinirMapeoFormValues>({
    initialValues: { concepto, tipo: 'remunerativo', categoriaContribucion: undefined },
    validate: zodValidate(definirMapeoSchema),
  });

  const requiereCategoria = form.values.tipo === 'contribucion_patronal' || form.values.tipo === 'deduccion';

  async function handleSubmit(values: DefinirMapeoFormValues): Promise<void> {
    try {
      const resultado = await definir.mutateAsync(values);
      notifications.show({
        message: `Concepto mapeado (${resultado.filasActualizadas} fila(s) actualizadas en toda la empresa)`,
        color: 'green',
      });
      onMapeado?.();
      onClose();
    } catch (err) {
      notifications.show({
        message: err instanceof ApiError ? err.message : 'No se pudo mapear el concepto',
        color: 'red',
      });
    }
  }

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="sm">
        <Text size="sm" c="dimmed">
          Concepto: <Text component="span" fw={600} c="black">{concepto}</Text>
        </Text>
        <Select
          label="Tipo"
          data={opcionesTipo}
          allowDeselect={false}
          autoFocus
          {...form.getInputProps('tipo')}
          onChange={(valor) => {
            form.setFieldValue('tipo', valor as DefinirMapeoFormValues['tipo']);
            if (valor !== 'contribucion_patronal' && valor !== 'deduccion') {
              form.setFieldValue('categoriaContribucion', undefined);
            }
          }}
        />
        {requiereCategoria && (
          <Select
            label="Categoría de contribución"
            placeholder="Elegí una categoría"
            data={opcionesCategoria}
            {...form.getInputProps('categoriaContribucion')}
          />
        )}
        <Group justify="flex-end" mt="sm">
          <Button variant="subtle" onClick={onClose} disabled={definir.isPending}>
            Cancelar
          </Button>
          <Button type="submit" loading={definir.isPending}>
            Guardar
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
