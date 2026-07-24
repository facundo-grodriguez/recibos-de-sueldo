import { Anchor, Button, Group, Stack, Table, Text, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useEmpresa, useEmpresas } from '../empresas/queries';
import { ClasificarConceptoModal } from './ClasificarConceptoModal';
import { useCatalogoConceptos } from './queries';
import { ETIQUETAS_CATEGORIA_CONTRIBUCION, ETIQUETAS_TIPO_CONCEPTO, type DefinirConceptoCatalogoFormValues } from './schema';

/** Catálogo de conceptos ya clasificados de la empresa — cierra un pendiente viejo (ADR-064) y
 * habilita corregir una clasificación equivocada (Etapa 3): antes, un concepto ya clasificado
 * desaparecía para siempre de la alerta de "sin clasificar" y no había forma de volver a editarlo. */
export function CatalogoConceptosPage() {
  const { empresaId } = useParams<{ empresaId: string }>();
  const { isLoading: cargandoEmpresas } = useEmpresas();
  const empresa = useEmpresa(empresaId);
  const { data: conceptos, isLoading, isError } = useCatalogoConceptos(empresaId ?? '');
  const [conceptoAEditar, setConceptoAEditar] = useState<string | undefined>(undefined);

  if (cargandoEmpresas) {
    return <Text c="dimmed">Cargando…</Text>;
  }

  if (!empresa || !empresaId) {
    return <Text c="red">Empresa no encontrada.</Text>;
  }

  const conceptoEnEdicion = conceptos?.find((c) => c.concepto === conceptoAEditar);
  const conceptoExistente: { tipo: DefinirConceptoCatalogoFormValues['tipo']; categoriaContribucion: DefinirConceptoCatalogoFormValues['categoriaContribucion'] | null } | undefined = conceptoEnEdicion
    ? {
        tipo: conceptoEnEdicion.tipo as DefinirConceptoCatalogoFormValues['tipo'],
        categoriaContribucion: conceptoEnEdicion.categoriaContribucion as DefinirConceptoCatalogoFormValues['categoriaContribucion'] | null,
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

      {!isLoading && !isError && conceptos && conceptos.length === 0 && (
        <Text c="dimmed">Todavía no se clasificó ningún concepto. Se van agregando desde la pantalla de importación.</Text>
      )}

      {conceptos && conceptos.length > 0 && (
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
            {conceptos.map((concepto) => (
              <Table.Tr key={concepto.id}>
                <Table.Td>{concepto.concepto}</Table.Td>
                <Table.Td>{ETIQUETAS_TIPO_CONCEPTO[concepto.tipo as keyof typeof ETIQUETAS_TIPO_CONCEPTO]}</Table.Td>
                <Table.Td>
                  {concepto.categoriaContribucion
                    ? ETIQUETAS_CATEGORIA_CONTRIBUCION[
                        concepto.categoriaContribucion as keyof typeof ETIQUETAS_CATEGORIA_CONTRIBUCION
                      ]
                    : '—'}
                </Table.Td>
                <Table.Td>
                  <Button size="xs" variant="subtle" onClick={() => setConceptoAEditar(concepto.concepto)}>
                    Editar
                  </Button>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      <ClasificarConceptoModal
        empresaId={empresaId}
        concepto={conceptoAEditar}
        onClose={() => setConceptoAEditar(undefined)}
        conceptoExistente={conceptoExistente}
      />
    </Stack>
  );
}
