import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../shared/auth/AuthContext';
import { definirMapeo, listarConceptosSinMapear, listarMapeos } from './api';
import type { DefinirMapeoFormValues } from './schema';

export function conceptosSinMapearKey(empresaId: string) {
  return ['conceptos-sin-mapear', empresaId] as const;
}

export function mapeosKey(empresaId: string) {
  return ['conceptos-mapeados', empresaId] as const;
}

export function useConceptosSinMapear(empresaId: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: conceptosSinMapearKey(empresaId),
    queryFn: () => listarConceptosSinMapear(token as string, empresaId),
    enabled: token !== null && empresaId !== '',
  });
}

export function useMapeos(empresaId: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: mapeosKey(empresaId),
    queryFn: () => listarMapeos(token as string, empresaId),
    enabled: token !== null && empresaId !== '',
  });
}

export function useDefinirMapeo(empresaId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos: DefinirMapeoFormValues) => definirMapeo(token as string, empresaId, datos),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: conceptosSinMapearKey(empresaId) });
      void queryClient.invalidateQueries({ queryKey: mapeosKey(empresaId) });
    },
  });
}
