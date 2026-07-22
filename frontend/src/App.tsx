import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { LoginPage } from './modules/auth/LoginPage';
import { RegisterPage } from './modules/auth/RegisterPage';
import { EmpleadosPage } from './modules/empleados/EmpleadosPage';
import { HistorialRecibosPage } from './modules/emision/HistorialRecibosPage';
import { DashboardPage } from './modules/empresas/DashboardPage';
import { EmpresaHomePage } from './modules/empresas/EmpresaHomePage';
import { ImportacionDetailPage } from './modules/importacion/ImportacionDetailPage';
import { ImportacionesPage } from './modules/importacion/ImportacionesPage';
import { ConceptosMapeadosPage } from './modules/mapeo/ConceptosMapeadosPage';
import { ProtectedRoute } from './shared/auth/ProtectedRoute';
import { AppShellLayout } from './shared/ui/AppShellLayout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShellLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/empresas/:empresaId" element={<EmpresaHomePage />} />
            <Route path="/empresas/:empresaId/empleados" element={<EmpleadosPage />} />
            <Route path="/empresas/:empresaId/recibos" element={<HistorialRecibosPage />} />
            <Route path="/empresas/:empresaId/importaciones" element={<ImportacionesPage />} />
            <Route path="/empresas/:empresaId/conceptos" element={<ConceptosMapeadosPage />} />
            <Route
              path="/empresas/:empresaId/importaciones/:importacionId"
              element={<ImportacionDetailPage />}
            />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
