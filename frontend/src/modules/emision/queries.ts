import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../shared/auth/AuthContext';
import {
  anularRecibo,
  emitirRecibos,
  listarHistorialRecibos,
  listarRecibos,
  obtenerAuditoriaRecibo,
  reemitirRecibo,
} from './api';

export function recibosKey(empresaId: string, importacionId: string) {
  return ['recibos', empresaId, importacionId] as const;
}

export function historialRecibosKey(empresaId: string, empleadoId?: string, pagina?: number) {
  return ['recibos-historial', empresaId, empleadoId ?? null, pagina ?? 1] as const;
}

export function auditoriaReciboKey(empresaId: string, importacionId: string, reciboId: string) {
  return ['auditoria-recibo', empresaId, importacionId, reciboId] as const;
}

export function useRecibos(empresaId: string, importacionId: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: recibosKey(empresaId, importacionId),
    queryFn: () => listarRecibos(token as string, empresaId, importacionId),
    enabled: token !== null && empresaId !== '' && importacionId !== '',
  });
}

export function useHistorialRecibos(empresaId: string, empleadoId?: string, pagina?: number) {
  const { token } = useAuth();
  return useQuery({
    queryKey: historialRecibosKey(empresaId, empleadoId, pagina),
    queryFn: () => listarHistorialRecibos(token as string, empresaId, empleadoId, pagina),
    enabled: token !== null && empresaId !== '',
  });
}

export function useAuditoriaRecibo(empresaId: string, importacionId: string, reciboId: string | undefined) {
  const { token } = useAuth();
  return useQuery({
    queryKey: auditoriaReciboKey(empresaId, importacionId, reciboId ?? ''),
    queryFn: () => obtenerAuditoriaRecibo(token as string, empresaId, importacionId, reciboId as string),
    enabled: token !== null && reciboId !== undefined,
  });
}

export function useEmitirRecibos(empresaId: string, importacionId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => emitirRecibos(token as string, empresaId, importacionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: recibosKey(empresaId, importacionId) });
    },
  });
}

function invalidarRecibos(queryClient: ReturnType<typeof useQueryClient>, empresaId: string, importacionId: string) {
  void queryClient.invalidateQueries({ queryKey: recibosKey(empresaId, importacionId) });
  void queryClient.invalidateQueries({ queryKey: ['recibos-historial', empresaId] });
}

export function useAnularRecibo(empresaId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ importacionId, reciboId, motivo }: { importacionId: string; reciboId: string; motivo: string }) =>
      anularRecibo(token as string, empresaId, importacionId, reciboId, motivo),
    onSuccess: (_recibo, variables) => invalidarRecibos(queryClient, empresaId, variables.importacionId),
  });
}

export function useReemitirRecibo(empresaId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ importacionId, reciboId }: { importacionId: string; reciboId: string }) =>
      reemitirRecibo(token as string, empresaId, importacionId, reciboId),
    onSuccess: (_recibo, variables) => invalidarRecibos(queryClient, empresaId, variables.importacionId),
  });
}
