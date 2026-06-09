// Reportes: ventas por fecha, ganancia, productos más vendidos y stock actual.
import { useEffect, useState, useCallback } from 'react';
import { DollarSign, ShoppingCart, Package, TrendingUp } from 'lucide-react';
import { api, money } from '../api/client.js';

// Fecha de hoy en formato YYYY-MM-DD (hora local).
function todayStr() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export default function Reports() {
  const [from, setFrom] = useState(todayStr());
  const [to, setTo] = useState(todayStr());
  const [summary, setSummary] = useState(null);
  const [top, setTop] = useState([]);
  const [stock, setStock] = useState(null);

  const loadRange = useCallback(async () => {
    const params = { from, to };
    const [s, t] = await Promise.all([
      api.get('/reports/summary', { params }),
      api.get('/reports/top-products', { params: { ...params, limit: 10 } }),
    ]);
    setSummary(s.data);
    setTop(t.data);
  }, [from, to]);

  useEffect(() => { loadRange(); }, [loadRange]);
  useEffect(() => { api.get('/reports/stock').then((r) => setStock(r.data)); }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Reportes</h1>

      {/* Filtro de fechas */}
      <div className="card p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Desde</label>
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">Hasta</label>
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button onClick={() => { setFrom(todayStr()); setTo(todayStr()); }} className="btn-secondary">Hoy</button>
      </div>

      {/* Tarjetas de resumen */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat icon={ShoppingCart} color="bg-brand-600" label="N.º de ventas" value={summary.numeroVentas} />
          <Stat icon={Package} color="bg-slate-600" label="Unidades vendidas" value={summary.unidadesVendidas} />
          <Stat icon={DollarSign} color="bg-emerald-600" label="Total vendido" value={money(summary.totalVentas)} />
          <Stat icon={TrendingUp} color="bg-amber-600" label="Ganancia aprox." value={money(summary.gananciaAproximada)} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Más vendidos */}
        <div className="card">
          <h2 className="font-semibold text-slate-800 px-5 py-3 border-b border-slate-200">Productos más vendidos</h2>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr><th className="px-5 py-2 font-medium">Producto</th><th className="px-5 py-2 font-medium text-center">Unidades</th><th className="px-5 py-2 font-medium text-right">Ingresos</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {top.map((p) => (
                <tr key={p.productId}>
                  <td className="px-5 py-2 font-medium text-slate-700">{p.nombre}</td>
                  <td className="px-5 py-2 text-center">{p.unidades}</td>
                  <td className="px-5 py-2 text-right">{money(p.ingresos)}</td>
                </tr>
              ))}
              {top.length === 0 && <tr><td colSpan={3} className="px-5 py-6 text-center text-slate-400">Sin ventas en el rango.</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Stock actual */}
        <div className="card">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
            <h2 className="font-semibold text-slate-800">Stock actual</h2>
            {stock && <span className="text-sm text-slate-500">Valor inventario: <b>{money(stock.valorInventario)}</b></span>}
          </div>
          <div className="max-h-80 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left sticky top-0">
                <tr><th className="px-5 py-2 font-medium">Producto</th><th className="px-5 py-2 font-medium text-center">Stock</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stock?.items.map((p) => (
                  <tr key={p.id}>
                    <td className="px-5 py-2 text-slate-700">{p.nombre}</td>
                    <td className="px-5 py-2 text-center">
                      <span className={`badge ${p.bajoStock ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{p.stock}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, color, label, value }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`${color} text-white rounded-xl p-3`}><Icon size={22} /></div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}
