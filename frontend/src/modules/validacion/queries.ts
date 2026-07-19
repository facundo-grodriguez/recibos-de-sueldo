import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../shared/auth/AuthContext';
import { obtenerValidacion } from './api';

export function validacionKey(empresaId: string, importacionId: string) {
  return ['validacion', empresaId, importacionId] as const;
}

export function useValidacion(empresaId: string, importacionId: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: validacionKey(empresaId, importacionId),
    queryFn: () => obtenerValidacion(token as string, empresaId, importacionId),
    enabled: token !== null && empresaId !== '' && importacionId !== '',
  });
}
