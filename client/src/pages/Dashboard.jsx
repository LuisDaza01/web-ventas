// Inicio: saludo, accesos rápidos según rol, resumen del día (admin) y alertas de stock bajo.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ScanBarcode, Package, TruckIcon, ArrowRight } from 'lucide-react';
import { api, money } from '../api/client.js';
import { dayStartISO, dayEndISO, todayStr } from '../utils/dates.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Dashboard() {
  const { user, can } = useAuth();
  const [lowStock, setLowStock] = useState([]);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api.get('/products/low-stock').then((r) => setLowStock(r.data)).catch(() => {});
    if (can.admin) {
      // Resumen del día local (el servidor corre en UTC).
      const hoy = todayStr();
      const params = { from: dayStartISO(hoy), to: dayEndISO(hoy) };
      api.get('/reports/summary', { params }).then((r) => setSummary(r.data)).catch(() => {});
    }
  }, [can.admin]);

  const shortcuts = [
    { to: '/pos', label: 'Punto de venta', icon: ScanBarcode, show: can.sell },
    { to: '/productos', label: 'Productos', icon: Package, show: can.manageStock },
    { to: '/compras', label: 'Entrada de stock', icon: TruckIcon, show: can.manageStock },
  ].filter((s) => s.show);

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <p className="micro mb-2">Hoy</p>
        <h1 className="display text-3xl sm:text-4xl leading-tight">
          Hola, {user.name}.
        </h1>
        <p className="text-gris mt-2 text-sm">Bienvenido al sistema de inventario y ventas.</p>
      </div>

      {/* Resumen del día (solo admin) */}
      {can.admin && summary && (
        <div className="card grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-line">
          <StatCard label="Ventas de hoy" value={summary.numeroVentas} sub={`${summary.unidadesVendidas} unidades`} />
          <StatCard label="Total vendido hoy" value={money(summary.totalVentas)} sub="Ingresos del día" />
          <StatCard label="Ganancia aprox." value={money(summary.gananciaAproximada)} sub="Venta − costo" />
        </div>
      )}

      {/* Accesos rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {shortcuts.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="card p-5 flex items-center gap-4 group hover:border-brand hover:shadow-lift transition"
          >
            <Icon size={22} strokeWidth={1.25} className="text-ink" />
            <span className="font-display font-medium text-ink">{label}</span>
            <ArrowRight
              size={16}
              strokeWidth={1.5}
              className="ml-auto text-gris group-hover:text-ink transition-colors"
            />
          </Link>
        ))}
      </div>

      {/* Alertas de stock bajo */}
      <div className="card">
        <div className="flex items-center gap-2 border-b border-line px-6 py-4">
          <h2 className="font-display font-medium text-lg text-ink">Alertas de stock bajo</h2>
          <span className={`badge ml-auto ${lowStock.length > 0 ? 'badge-accent' : ''}`}>
            {lowStock.length}
          </span>
        </div>
        {lowStock.length === 0 ? (
          <p className="px-6 py-5 text-sm text-gris">No hay productos con stock bajo.</p>
        ) : (
          <ul className="divide-y divide-line">
            {lowStock.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-6 py-3.5">
                <div>
                  <p className="font-display font-medium text-ink">{p.name}</p>
                  <p className="micro mt-0.5">{p.barcode}</p>
                </div>
                <span className="font-display font-medium text-accent">
                  {p.stock} <span className="text-xs text-gris font-sans">/ mín {p.minStock}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="p-6">
      <p className="micro">{label}</p>
      <p className="display text-3xl sm:text-4xl mt-2">{value}</p>
      <p className="text-xs text-gris mt-1">{sub}</p>
    </div>
  );
}
