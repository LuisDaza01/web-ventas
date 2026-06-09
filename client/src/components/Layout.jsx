// Estructura general: barra lateral con navegación según el rol + contenido.
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ScanBarcode,
  Package,
  TruckIcon,
  BarChart3,
  Users as UsersIcon,
  Store,
  Crown,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const NAV = [
  { to: '/plataforma', label: 'Tiendas', icon: Store, roles: ['SUPERADMIN'] },
  { to: '/', label: 'Inicio', icon: LayoutDashboard, roles: ['ADMIN', 'CAJERO', 'ALMACEN'] },
  { to: '/pos', label: 'Punto de venta', icon: ScanBarcode, roles: ['ADMIN', 'CAJERO'] },
  { to: '/productos', label: 'Productos', icon: Package, roles: ['ADMIN', 'ALMACEN'] },
  { to: '/compras', label: 'Entrada de stock', icon: TruckIcon, roles: ['ADMIN', 'ALMACEN'] },
  { to: '/reportes', label: 'Reportes', icon: BarChart3, roles: ['ADMIN'] },
  { to: '/usuarios', label: 'Usuarios', icon: UsersIcon, roles: ['ADMIN'] },
  { to: '/plan', label: 'Mi plan', icon: Crown, roles: ['ADMIN'] },
  { to: '/ajustes', label: 'Ajustes', icon: Settings, roles: ['ADMIN'] },
];

const ROLE_LABEL = {
  SUPERADMIN: 'Plataforma',
  ADMIN: 'Administrador',
  CAJERO: 'Cajero',
  ALMACEN: 'Almacén',
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const items = NAV.filter((n) => n.roles.includes(user.role));

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex">
      {/* Barra lateral */}
      <aside
        className={`fixed lg:static z-30 inset-y-0 left-0 w-64 bg-slate-900 text-slate-200 flex flex-col transform transition-transform ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-16 flex items-center gap-2 px-5 border-b border-slate-800">
          <ScanBarcode className="text-brand-500" />
          <span className="font-bold text-white">Web Ventas</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? 'bg-brand-600 text-white' : 'hover:bg-slate-800'
                }`
              }
            >
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-800">
          <div className="px-3 py-2 text-sm">
            <p className="font-medium text-white">{user.name}</p>
            <p className="text-xs text-slate-400">{ROLE_LABEL[user.role]}</p>
          </div>
          <button onClick={handleLogout} className="btn-secondary w-full mt-2 !bg-slate-800 !text-slate-200 !border-slate-700 hover:!bg-slate-700">
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Fondo oscuro en móvil cuando el menú está abierto */}
      {open && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Contenido */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 lg:hidden">
          <button onClick={() => setOpen(true)} className="p-2">
            {open ? <X /> : <Menu />}
          </button>
          <span className="font-bold ml-2">Web Ventas</span>
        </header>
        <main className="flex-1 p-4 sm:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
