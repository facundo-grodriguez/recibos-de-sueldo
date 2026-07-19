import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { onUnauthorized } from '../api/session-events';

const STORAGE_KEY = 'recibos.sesion';

interface SesionPersistida {
  token: string;
  email: string;
}

interface AuthContextValue {
  token: string | null;
  email: string | null;
  estaAutenticado: boolean;
  iniciarSesion: (token: string, email: string) => void;
  cerrarSesion: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function leerSesionGuardada(): SesionPersistida | null {
  const crudo = localStorage.getItem(STORAGE_KEY);
  if (!crudo) return null;
  try {
    return JSON.parse(crudo) as SesionPersistida;
  } catch {
    return null;
  }
}

/** Sesión persistida en localStorage (sobrevive a un refresh) y expuesta vía useAuth(). Se cierra sola ante cualquier 401 (ver session-events). */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<SesionPersistida | null>(() => leerSesionGuardada());

  const cerrarSesion = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSesion(null);
  }, []);

  const iniciarSesion = useCallback((token: string, email: string) => {
    const nuevaSesion: SesionPersistida = { token, email };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevaSesion));
    setSesion(nuevaSesion);
  }, []);

  useEffect(() => {
    onUnauthorized(cerrarSesion);
  }, [cerrarSesion]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token: sesion?.token ?? null,
      email: sesion?.email ?? null,
      estaAutenticado: sesion !== null,
      iniciarSesion,
      cerrarSesion,
    }),
    [sesion, iniciarSesion, cerrarSesion],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return context;
}
