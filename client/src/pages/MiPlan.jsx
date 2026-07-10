// Pantalla "Mi plan": plan actual de la tienda, uso vs. límites y comparativa.
import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { api, errorMsg } from '../api/client.js';

const ORDER = ['FREE', 'BASIC', 'PRO'];

// Barra de uso (actual / límite). límite null = ilimitado.
function UsoBar({ label, current, max }) {
  const pct = max == null ? 0 : Math.min(100, Math.round((current / max) * 100));
  const full = max != null && current >= max;
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="micro">{label}</span>
        <span className={`font-display font-medium ${full ? 'text-accent' : 'text-ink'}`}>
          {current} {max == null ? '/ ∞' : `/ ${max}`}
        </span>
      </div>
      <div className="h-1 bg-line overflow-hidden">
        <div
          className={`h-full ${full ? 'bg-accent' : 'bg-ink'}`}
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

  if (error) return <p className="note-error">{error}</p>;
  if (!data) return <p className="text-gris">Cargando...</p>;

  const planes = data.planes || {};

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <p className="micro mb-2">Suscripción</p>
        <h1 className="display text-3xl leading-tight">Mi plan</h1>
      </div>

      {/* Plan actual + uso */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="micro">Plan actual</p>
            <p className="display text-3xl mt-1">
              {planes[data.plan]?.nombre || data.plan}
            </p>
          </div>
          <span className={`badge ${data.activa ? 'badge-ink' : 'badge-accent'}`}>
            {data.activa ? 'Activa' : 'Suspendida'}
          </span>
        </div>
        <div className="grid sm:grid-cols-2 gap-6">
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
            <div key={key} className={`card p-6 ${actual ? 'border-ink' : ''}`}>
              <div className="flex items-center justify-between">
                <h3 className="micro">{p.nombre}</h3>
                {actual && <span className="badge badge-ink">Actual</span>}
              </div>
              <p className="display text-3xl mt-3">
                {p.precio === 0 ? 'Gratis' : `Bs ${p.precio}`}
                {p.precio !== 0 && <span className="text-sm font-sans font-normal text-gris tracking-normal"> /mes</span>}
              </p>
              <ul className="mt-5 pt-4 border-t border-line space-y-2.5 text-sm text-gris">
                <li className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-4 h-4 bg-ink text-white shrink-0">
                    <Check size={11} strokeWidth={2.5} />
                  </span>
                  {p.maxProductos == null ? 'Productos ilimitados' : `Hasta ${p.maxProductos} productos`}
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-4 h-4 bg-ink text-white shrink-0">
                    <Check size={11} strokeWidth={2.5} />
                  </span>
                  {p.maxUsuarios == null ? 'Usuarios ilimitados' : `Hasta ${p.maxUsuarios} usuarios`}
                </li>
              </ul>
            </div>
          );
        })}
      </div>

      <p className="note text-gris">
        Para cambiar de plan, realiza el pago y contáctanos: activaremos tu nuevo plan en el momento.
      </p>
    </div>
  );
}
