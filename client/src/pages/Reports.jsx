// Reportes: comparativos, tendencia, ventas por fecha, ganancia, top y stock.
import { useEffect, useState, useCallback } from 'react';
import { DollarSign, ShoppingCart, Package, TrendingUp, RefreshCw, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { api, money, errorMsg } from '../api/client.js';
import { dayStartISO, dayEndISO, todayStr } from '../utils/dates.js';

const TZ_OFFSET = new Date().getTimezoneOffset(); // minutos, para agrupar por día local

// Fecha en formato YYYY-MM-DD (hora local).
function fmt(d) {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

// Lista de días "YYYY-MM-DD" entre dos fechas (inclusive), para el eje del gráfico.
function daysBetween(fromStr, toStr) {
  const [fy, fm, fd] = fromStr.split('-').map(Number);
  const [ty, tm, td] = toStr.split('-').map(Number);
  const cur = new Date(fy, fm - 1, fd);
  const end = new Date(ty, tm - 1, td);
  const out = [];
  while (cur <= end && out.length < 186) {
    out.push(fmt(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
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
  const [series, setSeries] = useState([]);
  const [metric, setMetric] = useState('ganancia'); // 'ventas' | 'ganancia'
  const [comps, setComps] = useState([]);
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
      const [s, t, se] = await Promise.all([
        api.get('/reports/summary', { params }),
        api.get('/reports/top-products', { params: { ...params, limit: 10 } }),
        api.get('/reports/series', { params: { ...params, tzOffset: TZ_OFFSET } }),
      ]);
      setSummary(s.data);
      setTop(t.data);
      setSeries(se.data);
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

  // Comparativos: hoy/ayer, esta semana vs anterior, este mes vs anterior.
  // Se cargan una vez (no dependen del periodo elegido arriba).
  useEffect(() => {
    const now = new Date();
    const hoy = fmt(now);
    const ayer = fmt(addDays(now, -1));
    const dow = (now.getDay() + 6) % 7; // 0 = lunes
    const lunes = addDays(now, -dow);
    const finMesPrev = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    const diaClamp = Math.min(now.getDate(), finMesPrev);

    const defs = [
      { key: 'dia', label: 'Hoy vs ayer', a: [hoy, hoy], b: [ayer, ayer] },
      {
        key: 'sem',
        label: 'Esta semana vs anterior',
        a: [fmt(lunes), hoy],
        b: [fmt(addDays(lunes, -7)), fmt(addDays(now, -7))],
      },
      {
        key: 'mes',
        label: 'Este mes vs anterior',
        a: [fmt(new Date(now.getFullYear(), now.getMonth(), 1)), hoy],
        b: [
          fmt(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
          fmt(new Date(now.getFullYear(), now.getMonth() - 1, diaClamp)),
        ],
      },
    ];

    const sum = ([f, t]) =>
      api.get('/reports/summary', { params: { from: dayStartISO(f), to: dayEndISO(t) } }).then((r) => r.data);

    Promise.all(
      defs.map(async (d) => {
        const [a, b] = await Promise.all([sum(d.a), sum(d.b)]);
        return { key: d.key, label: d.label, actual: a, previo: b };
      })
    )
      .then(setComps)
      .catch(() => {});
  }, []);

  // Serie diaria rellenada con ceros para los días sin ventas (eje continuo).
  const chartData = (() => {
    const dias = daysBetween(from, to);
    if (!dias.length) return [];
    const byDay = Object.fromEntries(series.map((d) => [d.day, d]));
    return dias.map((day) => byDay[day] || { day, ventas: 0, ganancia: 0, numeroVentas: 0 });
  })();

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

      {/* Comparativos: ¿gané más que antes? */}
      {comps.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {comps.map((c) => (
            <CompareCard key={c.key} data={c} />
          ))}
        </div>
      )}

      {/* Gráfico de tendencia por día */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-800">Tendencia por día</h2>
          <div className="flex gap-1">
            <button
              onClick={() => setMetric('ganancia')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium border transition ${metric === 'ganancia' ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              Ganancia
            </button>
            <button
              onClick={() => setMetric('ventas')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium border transition ${metric === 'ventas' ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              Ventas
            </button>
          </div>
        </div>
        <BarChart data={chartData} metric={metric} />
      </div>

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

// Tarjeta comparativa de ganancia: actual vs periodo anterior, con % y flecha.
function CompareCard({ data }) {
  const actual = data.actual?.gananciaAproximada || 0;
  const previo = data.previo?.gananciaAproximada || 0;
  const diff = actual - previo;
  const pct = previo > 0 ? (diff / previo) * 100 : actual > 0 ? 100 : 0;
  const sube = diff > 0;
  const baja = diff < 0;
  const Icon = sube ? ArrowUp : baja ? ArrowDown : Minus;
  const color = sube ? 'text-emerald-600' : baja ? 'text-red-600' : 'text-slate-400';
  const bg = sube ? 'bg-emerald-50' : baja ? 'bg-red-50' : 'bg-slate-50';

  return (
    <div className="card p-5">
      <p className="text-sm text-slate-500">{data.label}</p>
      <p className="text-2xl font-bold text-slate-800 mt-1">{money(actual)}</p>
      <div className="flex items-center gap-2 mt-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${bg} ${color}`}>
          <Icon size={14} /> {previo > 0 ? `${Math.abs(pct).toFixed(0)}%` : '—'}
        </span>
        <span className="text-xs text-slate-400">antes: {money(previo)}</span>
      </div>
    </div>
  );
}

// Gráfico de barras simple (sin librerías): una barra por día.
function BarChart({ data, metric }) {
  const hayDatos = data.some((d) => d[metric] > 0);
  if (!data.length || !hayDatos) {
    return <div className="h-40 flex items-center justify-center text-sm text-slate-400">Sin ventas en el periodo.</div>;
  }
  const max = Math.max(...data.map((d) => d[metric]));
  const pocos = data.length <= 31;

  return (
    <div>
      <div className="flex items-end gap-1 h-56">
        {data.map((d) => (
          <div
            key={d.day}
            className="flex-1 min-w-0 h-full flex flex-col justify-end"
            title={`${d.day}: ${money(d[metric])}`}
          >
            <div
              className="w-full bg-brand-500 hover:bg-brand-600 rounded-t transition-colors"
              style={{ height: `${max > 0 ? (d[metric] / max) * 100 : 0}%` }}
            />
          </div>
        ))}
      </div>
      {pocos && (
        <div className="flex gap-1 mt-1">
          {data.map((d) => (
            <div key={d.day} className="flex-1 min-w-0 text-center text-[10px] text-slate-400">
              {Number(d.day.slice(8, 10))}
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-slate-400 mt-2 text-center">
        Máximo del periodo: <b>{money(max)}</b>
      </p>
    </div>
  );
}
