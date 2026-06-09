// Pantalla "Mi plan": plan actual de la tienda, uso vs. límites y comparativa.
import { useEffect, useState } from 'react';
import { Crown, Check } from 'lucide-react';
import { api, errorMsg } from '../api/client.js';

const ORDER = ['FREE', 'BASIC', 'PRO'];

// Barra de uso (actual / límite). límite null = ilimitado.
function UsoBar({ label, current, max }) {
  const pct = max == null ? 0 : Math.min(100, Math.round((current / max) * 100));
  const full = max != null && current >= max;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-600">{label}</span>
        <span className={`font-medium ${full ? 'text-red-600' : 'text-slate-700'}`}>
          {current} {max == null ? '/ ∞' : `/ ${max}`}
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full ${full ? 'bg-red-500' : 'bg-brand-500'}`}
          style={{ width: max == null ? '8%' : `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function MiPlan() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/subscription')
      .then((r) => setData(r.data))
      .catch((e) => setError(errorMsg(e)));
  }, []);

  if (error) return <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>;
  if (!data) return <p className="text-slate-400">Cargando...</p>;

  const planes = data.planes || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Crown className="text-brand-600" />
        <h1 className="text-2xl font-bold text-slate-800">Mi plan</h1>
      </div>

      {/* Plan actual + uso */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Plan actual</p>
            <p className="text-xl font-bold text-slate-800">
              {planes[data.plan]?.nombre || data.plan}
            </p>
          </div>
          <span className={`badge ${data.activa ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
            {data.activa ? 'Activa' : 'Suspendida'}
          </span>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <UsoBar label="Productos" current={data.uso.productos} max={data.limits.maxProductos} />
          <UsoBar label="Usuarios" current={data.uso.usuarios} max={data.limits.maxUsuarios} />
        </div>
      </div>

      {/* Comparativa de planes */}
      <div className="grid sm:grid-cols-3 gap-4">
        {ORDER.map((key) => {
          const p = planes[key];
          if (!p) return null;
          const actual = key === data.plan;
          return (
            <div key={key} className={`card p-5 ${actual ? 'ring-2 ring-brand-500' : ''}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800">{p.nombre}</h3>
                {actual && <span className="badge bg-brand-100 text-brand-700">Actual</span>}
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-800">
                {p.precio === 0 ? 'Gratis' : `Bs ${p.precio}`}
                {p.precio !== 0 && <span className="text-sm font-normal text-slate-400">/mes</span>}
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-emerald-500" />
                  {p.maxProductos == null ? 'Productos ilimitados' : `Hasta ${p.maxProductos} productos`}
                </li>
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-emerald-500" />
                  {p.maxUsuarios == null ? 'Usuarios ilimitados' : `Hasta ${p.maxUsuarios} usuarios`}
                </li>
              </ul>
            </div>
          );
        })}
      </div>

      <p className="text-sm text-slate-500 bg-slate-50 rounded-lg px-4 py-3">
        Para cambiar de plan, realiza el pago y contáctanos: activaremos tu nuevo plan en el momento.
      </p>
    </div>
  );
}
