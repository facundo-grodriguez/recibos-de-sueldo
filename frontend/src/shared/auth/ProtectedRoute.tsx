import { Navigate, Outlet } from 'react-router';
import { useAuth } from './AuthContext';

/** Layout route: si no hay sesión, redirige a /login; si hay, renderiza el subárbol protegido. */
export function ProtectedRoute() {
  const { estaAutenticado } = useAuth();

  if (!estaAutenticado) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
