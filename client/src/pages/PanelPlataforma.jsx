// Panel de plataforma (SUPERADMIN): administra todas las tiendas del SaaS.
import { useEffect, useState, useCallback } from 'react';
import { Store, Power, Building2, Package, Users as UsersIcon } from 'lucide-react';
import { api, errorMsg } from '../api/client.js';

const PLAN_BADGE = {
  FREE: 'bg-slate-100 text-slate-600',
  BASIC: 'bg-brand-100 text-brand-700',
  PRO: 'bg-purple-100 text-purple-700',
};

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className="bg-brand-50 text-brand-600 rounded-xl p-2">
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

export default function PanelPlataforma() {
  const [tiendas, setTiendas] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [t, s] = await Promise.all([api.get('/platform/tiendas'), api.get('/platform/stats')]);
      setTiendas(t.data);
      setStats(s.data);
    } catch (err) {
      setError(errorMsg(err));
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function patch(id, data) {
    try {
      await api.patch(`/platform/tiendas/${id}`, data);
      load();
    } catch (err) {
      setError(errorMsg(err));
    }
  }

  function toggleActiva(t) {
    if (t.activa && !confirm(`¿Suspender la tienda "${t.nombre}"? No podrá iniciar sesión.`)) return;
    patch(t.id, { activa: !t.activa });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Store className="text-brand-600" />
        <h1 className="text-2xl font-bold text-slate-800">Tiendas de la plataforma</h1>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat icon={Building2} label="Tiendas" value={stats.tiendas} />
          <Stat icon={Power} label="Activas" value={stats.activas} />
          <Stat icon={UsersIcon} label="Usuarios" value={stats.usuarios} />
          <Stat icon={Package} label="Productos" value={stats.productos} />
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Tienda</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium text-center">Usuarios</th>
              <th className="px-4 py-3 font-medium text-center">Productos</th>
              <th className="px-4 py-3 font-medium text-center">Ventas</th>
              <th className="px-4 py-3 font-medium text-center">Estado</th>
              <th className="px-4 py-3 font-medium text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tiendas.map((t) => (
              <tr key={t.id} className={t.activa ? '' : 'opacity-60'}>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-700">{t.nombre}</p>
                  <p className="text-xs text-slate-400">/{t.slug}</p>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={t.plan}
                    onChange={(e) => patch(t.id, { plan: e.target.value })}
                    className={`badge border-0 cursor-pointer ${PLAN_BADGE[t.plan]}`}
                  >
                    <option value="FREE">FREE</option>
                    <option value="BASIC">BASIC</option>
                    <option value="PRO">PRO</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-center text-slate-600">{t._count.users}</td>
                <td className="px-4 py-3 text-center text-slate-600">{t._count.products}</td>
                <td className="px-4 py-3 text-center text-slate-600">{t._count.sales}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`badge ${t.activa ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {t.activa ? 'Activa' : 'Suspendida'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => toggleActiva(t)} className="btn-secondary !py-1 !px-2 text-xs">
                    <Power size={14} /> {t.activa ? 'Suspender' : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}
            {tiendas.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  Aún no hay tiendas registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
