// Inicio: saludo, accesos rápidos según rol, resumen del día (admin) y alertas de stock bajo.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ScanBarcode, Package, TruckIcon, AlertTriangle, DollarSign, ShoppingCart } from 'lucide-react';
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
    { to: '/pos', label: 'Punto de venta', icon: ScanBarcode, show: can.sell, color: 'bg-brand-600' },
    { to: '/productos', label: 'Productos', icon: Package, show: can.manageStock, color: 'bg-emerald-600' },
    { to: '/compras', label: 'Entrada de stock', icon: TruckIcon, show: can.manageStock, color: 'bg-amber-600' },
  ].filter((s) => s.show);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Hola, {user.name} 👋</h1>
        <p className="text-slate-500">Bienvenido al sistema de inventario y ventas.</p>
      </div>

      {/* Resumen del día (solo admin) */}
      {can.admin && summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={ShoppingCart} label="Ventas de hoy" value={summary.numeroVentas} sub={`${summary.unidadesVendidas} unidades`} />
          <StatCard icon={DollarSign} label="Total vendido hoy" value={money(summary.totalVentas)} sub="Ingresos del día" />
          <StatCard icon={DollarSign} label="Ganancia aprox." value={money(summary.gananciaAproximada)} sub="Venta - costo" />
        </div>
      )}

      {/* Accesos rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {shortcuts.map(({ to, label, icon: Icon, color }) => (
          <Link key={to} to={to} className="card p-5 flex items-center gap-4 hover:shadow-md transition">
            <div className={`${color} text-white rounded-xl p-3`}>
              <Icon size={24} />
            </div>
            <span className="font-semibold text-slate-700">{label}</span>
          </Link>
        ))}
      </div>

      {/* Alertas de stock bajo */}
      <div className="card">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-3">
          <AlertTriangle className="text-amber-500" size={20} />
          <h2 className="font-semibold text-slate-800">Alertas de stock bajo</h2>
          <span className="badge bg-amber-100 text-amber-700 ml-auto">{lowStock.length}</span>
        </div>
        {lowStock.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No hay productos con stock bajo. ✅</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {lowStock.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="font-medium text-slate-700">{p.name}</p>
                  <p className="text-xs text-slate-400">{p.barcode}</p>
                </div>
                <span className="badge bg-red-100 text-red-700">
                  {p.stock} / mín {p.minStock}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-slate-500 text-sm">
        <Icon size={18} /> {label}
      </div>
      <p className="text-2xl font-bold text-slate-800 mt-2">{value}</p>
      <p className="text-xs text-slate-400">{sub}</p>
    </div>
  );
}
