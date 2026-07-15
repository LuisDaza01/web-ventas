// Estructura general: barra lateral con navegación según el rol + contenido.
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ScanBarcode,
  LayoutGrid,
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
  Contact,
  Wallet,
  MessageCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

// WhatsApp de soporte de la plataforma (con código de país), configurable por
// entorno. Sin él, el botón de soporte no se muestra.
const SOPORTE_WHATSAPP = (import.meta.env.VITE_WHATSAPP_SOPORTE || '').replace(/\D/g, '');

const NAV = [
  { to: '/plataforma', label: 'Tiendas', icon: Store, roles: ['SUPERADMIN'] },
  { to: '/plataforma/usuarios', label: 'Usuarios', icon: UsersIcon, roles: ['SUPERADMIN'] },
  { to: '/', label: 'Inicio', icon: LayoutDashboard, roles: ['ADMIN', 'CAJERO', 'ALMACEN'] },
  { to: '/catalogo', label: 'Catálogo', icon: LayoutGrid, roles: ['ADMIN', 'CAJERO'] },
  { to: '/pos', label: 'Punto de venta', icon: ScanBarcode, roles: ['ADMIN', 'CAJERO'] },
  { to: '/caja', label: 'Caja', icon: Wallet, roles: ['ADMIN', 'CAJERO'] },
  { to: '/clientes', label: 'Clientes', icon: Contact, roles: ['ADMIN', 'CAJERO'] },
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
  const { totalItems } = useCart();
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
        className={`fixed lg:static z-30 inset-y-0 left-0 w-64 bg-paper border-r border-line flex flex-col transform transition-transform ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="relative h-20 flex items-end px-6 pb-4 border-b border-line overflow-hidden">
          {/* Forma orgánica de color anclada a la esquina */}
          <div
            aria-hidden
            className="absolute -top-8 -right-8 w-24 h-24 bg-brand"
            style={{ borderRadius: '58% 42% 63% 37% / 55% 48% 52% 45%' }}
          />
          <div className="relative">
            <p className="micro mb-0.5">Tienda</p>
            <span className="font-display font-semibold text-xl tracking-tight text-ink">
              Web Ventas
            </span>
          </div>
        </div>
        <nav className="flex-1 px-3 py-5 space-y-0.5">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/' || to === '/plataforma'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-brandSoft text-brandDark font-bold'
                    : 'text-gris hover:bg-paper hover:text-ink'
                }`
              }
            >
              <Icon size={17} strokeWidth={1.5} /> {label}
              {to === '/pos' && totalItems > 0 && (
                <span className="ml-auto bg-brand text-white text-[10px] font-bold rounded-full px-2 py-0.5">
                  {totalItems}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-line halftone">
          <div className="px-2 py-2 bg-paper">
            <p className="font-display font-medium text-ink">{user.name}</p>
            <p className="micro mt-0.5">{ROLE_LABEL[user.role]}</p>
          </div>
          {SOPORTE_WHATSAPP && (
            <a
              href={`https://wa.me/${SOPORTE_WHATSAPP}?text=${encodeURIComponent('Hola, necesito ayuda con Web Ventas')}`}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary w-full mt-2"
            >
              <MessageCircle size={14} strokeWidth={1.5} /> Soporte
            </a>
          )}
          <button onClick={handleLogout} className="btn-secondary w-full mt-2">
            <LogOut size={14} strokeWidth={1.5} /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Fondo oscuro en móvil cuando el menú está abierto */}
      {open && (
        <div className="fixed inset-0 bg-ink/40 z-20 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Contenido */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-paper border-b border-line flex items-center px-4 lg:hidden">
          <button onClick={() => setOpen(true)} className="p-2 text-ink">
            {open ? <X strokeWidth={1.5} /> : <Menu strokeWidth={1.5} />}
          </button>
          <span className="font-display font-semibold text-lg ml-1 text-ink">Web Ventas</span>
        </header>
        <main className="flex-1 p-5 sm:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
