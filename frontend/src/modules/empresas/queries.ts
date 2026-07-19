import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../shared/auth/AuthContext';
import { actualizarEmpresa, crearEmpresa, listarEmpresas, type Empresa } from './api';
import type { EmpresaFormValues } from './schema';

const EMPRESAS_KEY = ['empresas'] as const;

export function useEmpresas() {
  const { token } = useAuth();
  return useQuery({
    queryKey: EMPRESAS_KEY,
    queryFn: () => listarEmpresas(token as string),
    enabled: token !== null,
  });
}

/** No hay GET /empresas/:id en el backend (solo listado) — se deriva de la lista ya cacheada. */
export function useEmpresa(empresaId: string | undefined): Empresa | undefined {
  const { data } = useEmpresas();
  return data?.find((empresa) => empresa.id === empresaId);
}

export function useCrearEmpresa() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos: EmpresaFormValues) => crearEmpresa(token as string, datos),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: EMPRESAS_KEY });
    },
  });
}

export function useActualizarEmpresa() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ empresaId, datos }: { empresaId: string; datos: Partial<EmpresaFormValues> }) =>
      actualizarEmpresa(token as string, empresaId, datos),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: EMPRESAS_KEY });
    },
  });
}
