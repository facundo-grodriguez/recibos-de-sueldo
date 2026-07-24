import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../shared/auth/AuthContext';
import { conceptosSinClasificarKey } from '../catalogo-conceptos/queries';
import { empleadosKey } from '../empleados/queries';
import {
  actualizarDatosEmision,
  confirmarImportacion,
  corregirFilaImportacion,
  descartarImportacion,
  importarArchivo,
  listarImportaciones,
  obtenerImportacion,
} from './api';
import type { CorregirFilaFormValues, DatosEmisionFormValues, ImportarArchivoFormValues } from './schema';

function importacionesKey(empresaId: string) {
  return ['importaciones', empresaId] as const;
}

export function importacionKey(empresaId: string, importacionId: string) {
  return ['importacion', empresaId, importacionId] as const;
}

export function useImportaciones(empresaId: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: importacionesKey(empresaId),
    queryFn: () => listarImportaciones(token as string, empresaId),
    enabled: token !== null && empresaId !== '',
  });
}

export function useImportacion(empresaId: string, importacionId: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: importacionKey(empresaId, importacionId),
    queryFn: () => obtenerImportacion(token as string, empresaId, importacionId),
    enabled: token !== null && empresaId !== '' && importacionId !== '',
  });
}

export function useImportarArchivo(empresaId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ datos, archivo }: { datos: ImportarArchivoFormValues; archivo: File }) =>
      importarArchivo(token as string, empresaId, datos, archivo),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: importacionesKey(empresaId) });
    },
  });
}

export function useCorregirFilaImportacion(empresaId: string, importacionId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ filaId, cambios }: { filaId: string; cambios: Partial<CorregirFilaFormValues> }) =>
      corregirFilaImportacion(token as string, empresaId, importacionId, filaId, cambios),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: importacionKey(empresaId, importacionId) });
    },
  });
}

export function useActualizarDatosEmision(empresaId: string, importacionId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos: Partial<DatosEmisionFormValues>) =>
      actualizarDatosEmision(token as string, empresaId, importacionId, datos),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: importacionKey(empresaId, importacionId) });
    },
  });
}

export function useConfirmarImportacion(empresaId: string, importacionId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => confirmarImportacion(token as string, empresaId, importacionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: importacionKey(empresaId, importacionId) });
      void queryClient.invalidateQueries({ queryKey: importacionesKey(empresaId) });
      // Confirmar dispara auto-clasificación (Fase 2): puede cambiar qué conceptos siguen pendientes a nivel empresa.
      void queryClient.invalidateQueries({ queryKey: conceptosSinClasificarKey(empresaId) });
      // Confirmar puede dar de alta empleados nuevos (crearEmpleadosFaltantes) que aún no están en la lista cacheada.
      void queryClient.invalidateQueries({ queryKey: empleadosKey(empresaId) });
    },
  });
}

export function useDescartarImportacion(empresaId: string, importacionId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => descartarImportacion(token as string, empresaId, importacionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: importacionKey(empresaId, importacionId) });
      void queryClient.invalidateQueries({ queryKey: importacionesKey(empresaId) });
    },
  });
}
