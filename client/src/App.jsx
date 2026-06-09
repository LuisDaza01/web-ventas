// Enrutado principal con control de acceso por rol.
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Registro from './pages/Registro.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Products from './pages/Products.jsx';
import POS from './pages/POS.jsx';
import Purchases from './pages/Purchases.jsx';
import Reports from './pages/Reports.jsx';
import Users from './pages/Users.jsx';
import MiPlan from './pages/MiPlan.jsx';
import PanelPlataforma from './pages/PanelPlataforma.jsx';

// Envuelve rutas privadas; redirige al login o muestra "sin acceso" según el rol.
function Protected({ children, allow }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (allow && !allow.includes(user.role)) return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/registro" element={user ? <Navigate to="/" replace /> : <Registro />} />

      <Route
        path="/"
        element={
          user?.role === 'SUPERADMIN' ? (
            <Navigate to="/plataforma" replace />
          ) : (
            <Protected>
              <Dashboard />
            </Protected>
          )
        }
      />
      <Route
        path="/plataforma"
        element={<Protected allow={['SUPERADMIN']}><PanelPlataforma /></Protected>}
      />
      <Route path="/pos" element={<Protected allow={['ADMIN', 'CAJERO']}><POS /></Protected>} />
      <Route
        path="/productos"
        element={<Protected allow={['ADMIN', 'ALMACEN']}><Products /></Protected>}
      />
      <Route
        path="/compras"
        element={<Protected allow={['ADMIN', 'ALMACEN']}><Purchases /></Protected>}
      />
      <Route path="/reportes" element={<Protected allow={['ADMIN']}><Reports /></Protected>} />
      <Route path="/usuarios" element={<Protected allow={['ADMIN']}><Users /></Protected>} />
      <Route path="/plan" element={<Protected allow={['ADMIN']}><MiPlan /></Protected>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
