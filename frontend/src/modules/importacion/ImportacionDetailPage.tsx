import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, Anchor, Badge, Button, Grid, Group, Stack, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft } from '@tabler/icons-react';
import { Link, useParams } from 'react-router';
import { ApiError } from '../../shared/api/http';
import { ConfirmModal } from '../../shared/ui/ConfirmModal';
import { EmisionSection } from '../emision/EmisionSection';
import { MapearConceptoModal } from '../mapeo/MapearConceptoModal';
import { useConceptosSinMapear } from '../mapeo/queries';
import { useValidacion } from '../validacion/queries';
import type { ImportacionFila } from './api';
import { CorregirFilaModal } from './CorregirFilaModal';
import { NOMBRES_MES } from './nombresMes';
import { importacionKey, useConfirmarImportacion, useImportacion } from './queries';
import { agruparFilasPorEmpleado } from './revision/agruparFilasPorEmpleado';
import { BarraLateralNavegacion } from './revision/BarraLateralNavegacion';
import { BarraResumenSticky } from './revision/BarraResumenSticky';
import { filtrarGrupos, type FiltroEstadoRevision } from './revision/filtrarGrupos';
import { GrupoEmpleado, type EstadoNegocioEmpleado } from './revision/GrupoEmpleado';
import { NavegadorErrores, type ErrorNavegable } from './revision/NavegadorErrores';

export function ImportacionDetailPage() {
  const { empresaId, importacionId } = useParams<{ empresaId: string; importacionId: string }>();
  const { data: importacion, isLoading, isError } = useImportacion(empresaId ?? '', importacionId ?? '');
  const { data: conceptosPendientes } = useConceptosSinMapear(empresaId ?? '');
  // Reutiliza el mismo endpoint que EmisionSection (Paso 2). `.totales` se muestra siempre;
  // `.errores`/`.advertencias` (juicio de negocio) solo se leen una vez confirmada la
  // importación (ver `estadoNegocioPorCuil` más abajo y ADR-076) — nunca durante la corrección
  // línea por línea.
  const { data: validacion } = useValidacion(empresaId ?? '', importacionId ?? '');
  const [conceptoAMapear, setConceptoAMapear] = useState<string | undefined>(undefined);
  const [filaACorregir, setFilaACorregir] = useState<ImportacionFila | undefined>(undefined);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<FiltroEstadoRevision>('todos');
  const [expandidoOverride, setExpandidoOverride] = useState<Map<string, boolean>>(new Map());
  const [filaResaltadaId, setFilaResaltadaId] = useState<string | undefined>(undefined);
  const [confirmarAbierto, setConfirmarAbierto] = useState(false);
  const refsGrupo = useRef(new Map<string, HTMLDivElement>());
  const queryClient = useQueryClient();
  const confirmar = useConfirmarImportacion(empresaId ?? '', importacionId ?? '');

  const grupos = useMemo(() => (importacion ? agruparFilasPorEmpleado(importacion.filas) : []), [importacion]);
  const hayFiltroActivo = busqueda.trim() !== '' || filtro !== 'todos';
  const gruposFiltrados = useMemo(() => filtrarGrupos(grupos, { busqueda, filtro }), [grupos, busqueda, filtro]);
  const totalesPorCuil = useMemo(
    () => new Map((validacion?.empleados ?? []).map((empleado) => [empleado.cuil, empleado.totales])),
    [validacion],
  );
  const estadoNegocioPorCuil = useMemo(() => {
    if (importacion?.estado !== 'confirmada') return new Map<string, EstadoNegocioEmpleado>();
    return new Map(
      (validacion?.empleados ?? []).map((empleado) => [
        empleado.cuil,
        { errores: empleado.errores, advertencias: empleado.advertencias },
      ]),
    );
  }, [validacion, importacion?.estado]);
  const erroresNavegables: ErrorNavegable[] = useMemo(
    () =>
      gruposFiltrados.flatMap((grupo) =>
        grupo.filas.filter((fila) => !fila.valida).map((fila) => ({ claveGrupo: grupo.clave, filaId: fila.id })),
      ),
    [gruposFiltrados],
  );

  // Auto-avance tras corregir una fila (Etapa 2 UX): saltar al próximo error sin que el
  // contador tenga que volver a ubicarlo a mano. Espera al refetch real (erroresNavegables
  // se recalcula solo cuando cambian los datos) en vez de asumir el resultado al cerrar el modal.
  // Los hooks van antes de los `return` condicionales de más abajo (Rules of Hooks) — por eso
  // usa un ref a `irAGrupo` en vez de llamar a la función directamente (se define después).
  const saltarAlProximoErrorRef = useRef(false);
  const irAGrupoRef = useRef<(clave: string) => void>(() => {});
  useEffect(() => {
    if (saltarAlProximoErrorRef.current) {
      saltarAlProximoErrorRef.current = false;
      if (erroresNavegables.length > 0) {
        setFilaResaltadaId(erroresNavegables[0].filaId);
        irAGrupoRef.current(erroresNavegables[0].claveGrupo);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [erroresNavegables]);

  if (isLoading) {
    return <Text c="dimmed">Cargando…</Text>;
  }

  if (isError || !importacion || !empresaId || !importacionId) {
    return <Alert color="red">Importación no encontrada.</Alert>;
  }

  function refrescarImportacion(): void {
    void queryClient.invalidateQueries({ queryKey: importacionKey(empresaId as string, importacionId as string) });
  }

  async function handleConfirmar(): Promise<void> {
    try {
      await confirmar.mutateAsync();
      notifications.show({ message: 'Importación confirmada', color: 'green' });
    } catch (err) {
      notifications.show({
        message: err instanceof ApiError ? err.message : 'No se pudo confirmar la importación',
        color: 'red',
      });
    } finally {
      setConfirmarAbierto(false);
    }
  }

  /** Expandido por defecto si tiene error; forzado si hay un filtro/búsqueda activos (no esconder lo que se encontró); el toggle manual pisa ambos. */
  function estaExpandido(clave: string, tieneError: boolean): boolean {
    if (expandidoOverride.has(clave)) return expandidoOverride.get(clave) as boolean;
    return tieneError || hayFiltroActivo;
  }

  function toggleExpandido(clave: string, tieneError: boolean): void {
    setExpandidoOverride((anterior) => {
      const copia = new Map(anterior);
      copia.set(clave, !estaExpandido(clave, tieneError));
      return copia;
    });
  }

  function expandirTodos(): void {
    setExpandidoOverride(new Map(grupos.map((grupo) => [grupo.clave, true])));
  }

  function contraerTodos(): void {
    setExpandidoOverride(new Map(grupos.map((grupo) => [grupo.clave, false])));
  }

  function irAGrupo(clave: string): void {
    setExpandidoOverride((anterior) => new Map(anterior).set(clave, true));
    refsGrupo.current.get(clave)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  irAGrupoRef.current = irAGrupo;

  function irAError(error: ErrorNavegable): void {
    setFilaResaltadaId(error.filaId);
    irAGrupo(error.claveGrupo);
  }

  function handleFilaCorregida(): void {
    saltarAlProximoErrorRef.current = true;
  }

  return (
    <Stack gap="md">
      <Anchor component={Link} to={`/empresas/${empresaId}/importaciones`} size="sm">
        <Group gap={4}>
          <IconArrowLeft size={14} />
          Importaciones
        </Group>
      </Anchor>

      <Group justify="space-between">
        <Title order={2}>
          {NOMBRES_MES[importacion.mes - 1]} {importacion.anio} — {importacion.nombreArchivo}
        </Title>
        <Group gap="sm">
          <Badge color={importacion.estado === 'confirmada' ? 'green' : 'yellow'} size="lg">
            {importacion.estado === 'confirmada' ? 'Confirmada' : 'Previsualizada'}
          </Badge>
          {importacion.estado === 'previsualizada' && (
            <Button
              size="xs"
              disabled={importacion.filasConError > 0}
              loading={confirmar.isPending}
              onClick={() => setConfirmarAbierto(true)}
            >
              Confirmar
            </Button>
          )}
        </Group>
      </Group>

      <ConfirmModal
        opened={confirmarAbierto}
        title="Confirmar importación"
        message="Después de confirmar, las filas ya no se pueden corregir línea por línea. ¿Confirmar esta importación?"
        confirmLabel="Confirmar"
        loading={confirmar.isPending}
        onConfirm={() => void handleConfirmar()}
        onCancel={() => setConfirmarAbierto(false)}
      />

      {conceptosPendientes && conceptosPendientes.length > 0 && (
        <Alert color="yellow" title="Conceptos sin mapear en esta empresa">
          <Stack gap="xs">
            {conceptosPendientes.map((concepto) => (
              <Group key={concepto} justify="space-between">
                <Text size="sm">{concepto}</Text>
                <Button size="xs" variant="light" onClick={() => setConceptoAMapear(concepto)}>
                  Mapear
                </Button>
              </Group>
            ))}
          </Stack>
        </Alert>
      )}

      <BarraResumenSticky
        importacion={importacion}
        filtro={filtro}
        onFiltroChange={setFiltro}
        busqueda={busqueda}
        onBusquedaChange={setBusqueda}
        onExpandirTodos={expandirTodos}
        onContraerTodos={contraerTodos}
      />

      <Grid>
        <Grid.Col span={9}>
          {gruposFiltrados.length === 0 && (
            <Text c="dimmed" ta="center" py="xl">
              Ningún empleado coincide con la búsqueda o el filtro actual.
            </Text>
          )}
          <Stack gap="xs">
            {gruposFiltrados.map((grupo) => {
              const expandido = estaExpandido(grupo.clave, grupo.filas.some((fila) => !fila.valida));
              return (
                <GrupoEmpleado
                  key={grupo.clave}
                  ref={(el) => {
                    if (el) refsGrupo.current.set(grupo.clave, el);
                    else refsGrupo.current.delete(grupo.clave);
                  }}
                  grupo={grupo}
                  expandido={expandido}
                  onToggle={() => toggleExpandido(grupo.clave, grupo.filas.some((fila) => !fila.valida))}
                  totales={totalesPorCuil.get(grupo.cuil)}
                  estadoNegocio={estadoNegocioPorCuil.get(grupo.cuil)}
                  puedeCorregir={importacion.estado === 'previsualizada'}
                  onCorregir={setFilaACorregir}
                  filaErrorActivaId={filaResaltadaId}
                />
              );
            })}
          </Stack>
        </Grid.Col>
        <Grid.Col span={3}>
          <BarraLateralNavegacion grupos={gruposFiltrados} onSeleccionar={irAGrupo} />
        </Grid.Col>
      </Grid>

      <NavegadorErrores errores={erroresNavegables} onNavegar={irAError} />

      {importacion.estado === 'confirmada' && <EmisionSection empresaId={empresaId} importacion={importacion} />}

      <MapearConceptoModal
        empresaId={empresaId}
        concepto={conceptoAMapear}
        onClose={() => setConceptoAMapear(undefined)}
        onMapeado={refrescarImportacion}
      />
      <CorregirFilaModal
        empresaId={empresaId}
        importacionId={importacionId}
        fila={filaACorregir}
        onClose={() => setFilaACorregir(undefined)}
        onCorregida={handleFilaCorregida}
      />
    </Stack>
  );
}
