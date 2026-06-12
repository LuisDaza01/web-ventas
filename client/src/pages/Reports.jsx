// Reportes: ventas por fecha, ganancia, productos más vendidos y stock actual.
import { useEffect, useState, useCallback } from 'react';
import { DollarSign, ShoppingCart, Package, TrendingUp, RefreshCw } from 'lucide-react';
import { api, money, errorMsg } from '../api/client.js';
import { dayStartISO, dayEndISO, todayStr } from '../utils/dates.js';

// Fecha en formato YYYY-MM-DD (hora local).
function fmt(d) {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

// Rango de fechas para cada periodo rápido.
function presetRange(preset) {
  const now = new Date();
  if (preset === 'ayer') {
    const y = new Date(now);
    y.setDate(now.getDate() - 1);
    return { from: fmt(y), to: fmt(y) };
  }
  if (preset === 'semana') {
    // Semana actual: de lunes a hoy.
    const dow = (now.getDay() + 6) % 7; // 0 = lunes
    const start = new Date(now);
    start.setDate(now.getDate() - dow);
    return { from: fmt(start), to: fmt(now) };
  }
  if (preset === 'mes') {
    // Mes actual: del día 1 a hoy.
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: fmt(start), to: fmt(now) };
  }
  return { from: fmt(now), to: fmt(now) }; // 'hoy'
}

const PRESETS = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'ayer', label: 'Ayer' },
  { key: 'semana', label: 'Esta semana' },
  { key: 'mes', label: 'Este mes' },
];

export default function Reports() {
  const [from, setFrom] = useState(todayStr());
  const [to, setTo] = useState(todayStr());
  const [preset, setPreset] = useState('hoy');
  const [summary, setSummary] = useState(null);
  const [top, setTop] = useState([]);
  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Aplica un periodo rápido (Hoy / Ayer / Esta semana / Este mes).
  function applyPreset(key) {
    const r = presetRange(key);
    setFrom(r.from);
    setTo(r.to);
    setPreset(key);
  }

  // Selector de mes (input type="month" -> "YYYY-MM").
  function applyMonth(ym) {
    if (!ym) return;
    const [y, m] = ym.split('-').map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0); // día 0 del mes siguiente = último día del mes
    setFrom(fmt(start));
    setTo(fmt(end));
    setPreset('custom');
  }

  // Edición manual de fechas: deja de resaltar los botones rápidos.
  function setFromManual(v) { setFrom(v); setPreset('custom'); }
  function setToManual(v) { setTo(v); setPreset('custom'); }

  const loadRange = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Mandamos el inicio/fin del día en hora local como instante ISO, para
      // que el servidor (UTC) cuente las ventas del día correcto.
      const params = { from: dayStartISO(from), to: dayEndISO(to) };
      const [s, t] = await Promise.all([
        api.get('/reports/summary', { params }),
        api.get('/reports/top-products', { params: { ...params, limit: 10 } }),
      ]);
      setSummary(s.data);
      setTop(t.data);
    } catch (e) {
      setError(errorMsg(e));
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { loadRange(); }, [loadRange]);
  useEffect(() => {
    api.get('/reports/stock').then((r) => setStock(r.data)).catch(() => {});
  }, []);

  // Valor del selector de mes: refleja el mes elegido cuando el rango cabe en uno.
  const monthValue = from.slice(0, 7) === to.slice(0, 7) ? from.slice(0, 7) : '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Reportes</h1>
        <button onClick={loadRange} disabled={loading} className="btn-secondary" title="Actualizar">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Actualizar
        </button>
      </div>

      {/* Filtro de periodo */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => applyPreset(p.key)}
              className={`rounded-lg px-3 py-2 text-sm font-medium border transition ${
                preset === p.key ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label">Desde</label>
            <input type="date" className="input" value={from} onChange={(e) => setFromManual(e.target.value)} />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input type="date" className="input" value={to} onChange={(e) => setToManual(e.target.value)} />
          </div>
          <div>
            <label className="label">Elegir mes</label>
            <input type="month" className="input" value={monthValue} onChange={(e) => applyMonth(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Error de carga */}
      {error && (
        <div className="card p-4 flex items-center justify-between gap-3 bg-red-50 border border-red-100">
          <span className="text-sm text-red-700">No se pudieron cargar los reportes: {error}</span>
          <button onClick={loadRange} className="btn-secondary shrink-0">Reintentar</button>
        </div>
      )}

      {/* Tarjetas de resumen */}
      {summary && (
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${loading ? 'opacity-60' : ''}`}>
          <Stat icon={ShoppingCart} color="bg-brand-600" label="N.º de ventas" value={summary.numeroVentas} />
          <Stat icon={Package} color="bg-slate-600" label="Unidades vendidas" value={summary.unidadesVendidas} />
          <Stat icon={DollarSign} color="bg-emerald-600" label="Total vendido" value={money(summary.totalVentas)} />
          <Stat icon={TrendingUp} color="bg-amber-600" label="Ganancia aprox." value={money(summary.gananciaAproximada)} />
        </div>
      )}

      {/* Estado de carga inicial (aún sin datos) */}
      {loading && !summary && (
        <div className="card p-8 text-center text-slate-400">Cargando reportes…</div>
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
