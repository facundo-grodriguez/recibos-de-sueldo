import { Anchor, Button, Group, Stack, Table, Text, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useEmpresa, useEmpresas } from '../empresas/queries';
import { MapearConceptoModal } from './MapearConceptoModal';
import { useMapeos } from './queries';
import { ETIQUETAS_CATEGORIA_CONTRIBUCION, ETIQUETAS_TIPO_CONCEPTO, type DefinirMapeoFormValues } from './schema';

/** Catálogo de conceptos ya clasificados de la empresa — cierra un pendiente viejo (ADR-064) y
 * habilita corregir una clasificación equivocada (Etapa 3): antes, un concepto ya mapeado
 * desaparecía para siempre de la alerta de "sin mapear" y no había forma de volver a editarlo. */
export function ConceptosMapeadosPage() {
  const { empresaId } = useParams<{ empresaId: string }>();
  const { isLoading: cargandoEmpresas } = useEmpresas();
  const empresa = useEmpresa(empresaId);
  const { data: mapeos, isLoading, isError } = useMapeos(empresaId ?? '');
  const [conceptoAEditar, setConceptoAEditar] = useState<string | undefined>(undefined);

  if (cargandoEmpresas) {
    return <Text c="dimmed">Cargando…</Text>;
  }

  if (!empresa || !empresaId) {
    return <Text c="red">Empresa no encontrada.</Text>;
  }

  const mapeoEnEdicion = mapeos?.find((m) => m.concepto === conceptoAEditar);
  const mapeoExistente: { tipo: DefinirMapeoFormValues['tipo']; categoriaContribucion: DefinirMapeoFormValues['categoriaContribucion'] | null } | undefined = mapeoEnEdicion
    ? {
        tipo: mapeoEnEdicion.tipo as DefinirMapeoFormValues['tipo'],
        categoriaContribucion: mapeoEnEdicion.categoriaContribucion as DefinirMapeoFormValues['categoriaContribucion'] | null,
      }
    : undefined;

  return (
    <Stack gap="md">
      <Anchor component={Link} to={`/empresas/${empresaId}`} size="sm">
        <Group gap={4}>
          <IconArrowLeft size={14} />
          {empresa.razonSocial}
        </Group>
      </Anchor>

      <Title order={2}>Conceptos de la empresa</Title>

      {isError && <Text c="red">No se pudieron cargar los conceptos.</Text>}

      {isLoading && <Text c="dimmed">Cargando…</Text>}

      {!isLoading && !isError && mapeos && mapeos.length === 0 && (
        <Text c="dimmed">Todavía no se clasificó ningún concepto. Se van agregando desde la pantalla de importación.</Text>
      )}

      {mapeos && mapeos.length > 0 && (
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Concepto</Table.Th>
              <Table.Th>Tipo</Table.Th>
              <Table.Th>Categoría de contribución</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {mapeos.map((mapeo) => (
              <Table.Tr key={mapeo.id}>
                <Table.Td>{mapeo.concepto}</Table.Td>
                <Table.Td>{ETIQUETAS_TIPO_CONCEPTO[mapeo.tipo as keyof typeof ETIQUETAS_TIPO_CONCEPTO]}</Table.Td>
                <Table.Td>
                  {mapeo.categoriaContribucion
                    ? ETIQUETAS_CATEGORIA_CONTRIBUCION[
                        mapeo.categoriaContribucion as keyof typeof ETIQUETAS_CATEGORIA_CONTRIBUCION
                      ]
                    : '—'}
                </Table.Td>
                <Table.Td>
                  <Button size="xs" variant="subtle" onClick={() => setConceptoAEditar(mapeo.concepto)}>
                    Editar
                  </Button>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      <MapearConceptoModal
        empresaId={empresaId}
        concepto={conceptoAEditar}
        onClose={() => setConceptoAEditar(undefined)}
        mapeoExistente={mapeoExistente}
      />
    </Stack>
  );
}
