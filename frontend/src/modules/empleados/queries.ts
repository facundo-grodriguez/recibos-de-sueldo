import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../shared/auth/AuthContext';
import { actualizarEmpleado, cambiarEstadoEmpleado, crearEmpleado, listarEmpleados, type EstadoEmpleado } from './api';
import type { CrearEmpleadoFormValues, EditarEmpleadoFormValues } from './schema';

export function empleadosKey(empresaId: string) {
  return ['empleados', empresaId] as const;
}

export function useEmpleados(empresaId: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: empleadosKey(empresaId),
    queryFn: () => listarEmpleados(token as string, empresaId),
    enabled: token !== null,
  });
}

export function useCrearEmpleado(empresaId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos: CrearEmpleadoFormValues) => crearEmpleado(token as string, empresaId, datos),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: empleadosKey(empresaId) });
    },
  });
}

export function useActualizarEmpleado(empresaId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ empleadoId, datos }: { empleadoId: string; datos: Partial<EditarEmpleadoFormValues> }) =>
      actualizarEmpleado(token as string, empresaId, empleadoId, datos),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: empleadosKey(empresaId) });
    },
  });
}

export function useCambiarEstadoEmpleado(empresaId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ empleadoId, estado }: { empleadoId: string; estado: EstadoEmpleado }) =>
      cambiarEstadoEmpleado(token as string, empresaId, empleadoId, estado),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: empleadosKey(empresaId) });
    },
  });
}
