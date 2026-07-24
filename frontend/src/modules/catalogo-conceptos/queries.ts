import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../shared/auth/AuthContext';
import { definirConceptoCatalogo, listarConceptosSinClasificar, listarCatalogoConceptos } from './api';
import type { DefinirConceptoCatalogoFormValues } from './schema';

export function conceptosSinClasificarKey(empresaId: string) {
  return ['conceptos-sin-clasificar', empresaId] as const;
}

export function catalogoConceptosKey(empresaId: string) {
  return ['conceptos-catalogo', empresaId] as const;
}

export function useConceptosSinClasificar(empresaId: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: conceptosSinClasificarKey(empresaId),
    queryFn: () => listarConceptosSinClasificar(token as string, empresaId),
    enabled: token !== null && empresaId !== '',
  });
}

export function useCatalogoConceptos(empresaId: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: catalogoConceptosKey(empresaId),
    queryFn: () => listarCatalogoConceptos(token as string, empresaId),
    enabled: token !== null && empresaId !== '',
  });
}

export function useDefinirConceptoCatalogo(empresaId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos: DefinirConceptoCatalogoFormValues) => definirConceptoCatalogo(token as string, empresaId, datos),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: conceptosSinClasificarKey(empresaId) });
      void queryClient.invalidateQueries({ queryKey: catalogoConceptosKey(empresaId) });
    },
  });
}
