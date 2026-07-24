import { Button, Group, Modal, Select, Stack, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { ApiError } from '../../shared/api/http';
import { zodValidate } from '../../shared/forms/zodValidate';
import { useDefinirConceptoCatalogo } from './queries';
import {
  CATEGORIAS_CONTRIBUCION,
  definirConceptoCatalogoSchema,
  ETIQUETAS_CATEGORIA_CONTRIBUCION,
  ETIQUETAS_TIPO_CONCEPTO,
  TIPOS_CONCEPTO,
  type DefinirConceptoCatalogoFormValues,
} from './schema';

interface ConceptoExistente {
  tipo: DefinirConceptoCatalogoFormValues['tipo'];
  categoriaContribucion: DefinirConceptoCatalogoFormValues['categoriaContribucion'] | null;
}

interface ClasificarConceptoModalProps {
  empresaId: string;
  concepto: string | undefined;
  onClose: () => void;
  /** Se llama además de invalidar la lista de pendientes propia — para que quien la use también refresque lo que necesite (ej. la importación en pantalla). */
  onClasificado?: () => void;
  /** Si viene, el modal edita un concepto ya clasificado (precarga tipo/categoría) en vez de asumir "Remunerativo" (Etapa 3). */
  conceptoExistente?: ConceptoExistente;
}

const opcionesTipo = TIPOS_CONCEPTO.map((tipo) => ({ value: tipo, label: ETIQUETAS_TIPO_CONCEPTO[tipo] }));
const opcionesCategoria = CATEGORIAS_CONTRIBUCION.map((categoria) => ({
  value: categoria,
  label: ETIQUETAS_CATEGORIA_CONTRIBUCION[categoria],
}));

export function ClasificarConceptoModal({
  empresaId,
  concepto,
  onClose,
  onClasificado,
  conceptoExistente,
}: ClasificarConceptoModalProps) {
  return (
    <Modal opened={concepto !== undefined} onClose={onClose} title="Clasificar concepto">
      {concepto && (
        <Formulario
          key={concepto}
          empresaId={empresaId}
          concepto={concepto}
          onClose={onClose}
          onClasificado={onClasificado}
          conceptoExistente={conceptoExistente}
        />
      )}
    </Modal>
  );
}

function Formulario({
  empresaId,
  concepto,
  onClose,
  onClasificado,
  conceptoExistente,
}: {
  empresaId: string;
  concepto: string;
  onClose: () => void;
  onClasificado?: () => void;
  conceptoExistente?: ConceptoExistente;
}) {
  const definir = useDefinirConceptoCatalogo(empresaId);

  const form = useForm<DefinirConceptoCatalogoFormValues>({
    initialValues: {
      concepto,
      tipo: conceptoExistente?.tipo ?? 'remunerativo',
      categoriaContribucion: conceptoExistente?.categoriaContribucion ?? undefined,
    },
    validate: zodValidate(definirConceptoCatalogoSchema),
  });

  const requiereCategoria = form.values.tipo === 'contribucion_patronal' || form.values.tipo === 'deduccion';

  async function handleSubmit(values: DefinirConceptoCatalogoFormValues): Promise<void> {
    try {
      const resultado = await definir.mutateAsync(values);
      notifications.show({
        message: `Concepto clasificado (${resultado.filasActualizadas} fila(s) actualizadas en toda la empresa)`,
        color: 'green',
      });
      onClasificado?.();
      onClose();
    } catch (err) {
      notifications.show({
        message: err instanceof ApiError ? err.message : 'No se pudo clasificar el concepto',
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
            form.setFieldValue('tipo', valor as DefinirConceptoCatalogoFormValues['tipo']);
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
