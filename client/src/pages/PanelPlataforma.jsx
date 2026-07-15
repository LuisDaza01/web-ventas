// Panel de plataforma (SUPERADMIN): administra todas las tiendas del SaaS.
import { useEffect, useState, useCallback } from 'react';
import { Power, Plus, Trash2, Check, X as XIcon, ExternalLink } from 'lucide-react';
import { api, errorMsg } from '../api/client.js';
import { useConfirm } from '../context/ConfirmContext.jsx';
import Modal from '../components/Modal.jsx';

const TIENDA_VACIA = { nombre: '', plan: 'FREE', adminName: '', adminEmail: '', adminPassword: '' };

function Stat({ label, value }) {
  return (
    <div className="p-5">
      <p className="micro">{label}</p>
      <p className="display text-3xl mt-1">{value}</p>
    </div>
  );
}

export default function PanelPlataforma() {
  const [tiendas, setTiendas] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(TIENDA_VACIA);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const confirm = useConfirm();

  const [solicitudes, setSolicitudes] = useState([]);

  const load = useCallback(async () => {
    try {
      const [t, s, sol] = await Promise.all([
        api.get('/platform/tiendas'),
        api.get('/platform/stats'),
        api.get('/platform/solicitudes', { params: { estado: 'PENDIENTE' } }),
      ]);
      setTiendas(t.data);
      setStats(s.data);
      setSolicitudes(sol.data);
    } catch (err) {
      setError(errorMsg(err));
    }
  }, []);

  // Aprueba (cambia el plan de la tienda) o rechaza una solicitud.
  async function resolverSolicitud(s, estado) {
    setError('');
    setInfo('');
    try {
      await api.patch(`/platform/solicitudes/${s.id}`, { estado });
      setInfo(
        estado === 'APROBADA'
          ? `Plan ${s.plan} activado para "${s.tienda.nombre}".`
          : `Solicitud de "${s.tienda.nombre}" rechazada.`
      );
      load();
    } catch (err) {
      setError(errorMsg(err));
    }
  }
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

  async function toggleActiva(t) {
    if (t.activa) {
      const ok = await confirm({
        title: 'Suspender tienda',
        message: `¿Suspender la tienda "${t.nombre}"? No podrá iniciar sesión.`,
        confirmText: 'Suspender',
        danger: true,
      });
      if (!ok) return;
    }
    patch(t.id, { activa: !t.activa });
  }

  async function eliminarTienda(t) {
    const ok = await confirm({
      title: 'Eliminar tienda',
      message: `¿Eliminar "${t.nombre}"? Si no tiene ventas se borra por completo; si tiene historial, se suspende para conservar los reportes.`,
      confirmText: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    setError('');
    setInfo('');
    try {
      const { data } = await api.delete(`/platform/tiendas/${t.id}`);
      setInfo(
        data.deleted
          ? `Tienda "${t.nombre}" eliminada por completo.`
          : `"${t.nombre}" tiene historial: se suspendió en lugar de eliminarse.`
      );
      load();
    } catch (err) {
      setError(errorMsg(err));
    }
  }

  function abrirNueva() {
    setForm(TIENDA_VACIA);
    setFormError('');
    setOpen(true);
  }

  async function crearTienda(e) {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await api.post('/platform/tiendas', {
        nombre: form.nombre.trim(),
        plan: form.plan,
        admin: {
          name: form.adminName.trim(),
          email: form.adminEmail.trim().toLowerCase(),
          password: form.adminPassword,
        },
      });
      setOpen(false);
      load();
    } catch (err) {
      setFormError(errorMsg(err));
    } finally {
      setSaving(false);
    }
  }

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="micro mb-2">Plataforma</p>
          <h1 className="display text-3xl leading-tight">Tiendas de la plataforma</h1>
        </div>
        <button onClick={abrirNueva} className="btn-primary">
          <Plus size={16} strokeWidth={1.5} /> Nueva tienda
        </button>
      </div>

      {error && <p className="note-error">{error}</p>}
      {info && <p className="note-ok">{info}</p>}

      {stats && (
        <div className="card grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 divide-x divide-line">
          <Stat label="Tiendas" value={stats.tiendas} />
          <Stat label="Activas" value={stats.activas} />
          <Stat label="Usuarios" value={stats.usuarios} />
          <Stat label="Productos" value={stats.productos} />
        </div>
      )}

      {/* Solicitudes de cambio de plan pendientes */}
      {solicitudes.length > 0 && (
        <div>
          <p className="micro mb-3">
            Solicitudes de plan pendientes ({solicitudes.length})
          </p>
          <div className="space-y-2">
            {solicitudes.map((s) => (
              <div key={s.id} className="card p-4 flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-48">
                  <p className="font-display font-medium text-ink">
                    {s.tienda.nombre}{' '}
                    <span className="text-gris font-sans text-xs">/{s.tienda.slug}</span>
                  </p>
                  <p className="text-xs text-gris mt-0.5">
                    {s.tienda.plan} → <b className="text-ink">{s.plan}</b> ·{' '}
                    {new Date(s.createdAt).toLocaleString('es-BO')}
                    {s.nota && <> · “{s.nota}”</>}
                  </p>
                </div>
                {s.comprobanteUrl && (
                  <a
                    href={s.comprobanteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary !py-1 !px-2 !text-[10px]"
                  >
                    <ExternalLink size={13} strokeWidth={1.5} /> Comprobante
                  </a>
                )}
                <div className="flex gap-1.5">
                  <button
                    onClick={() => resolverSolicitud(s, 'APROBADA')}
                    className="btn-primary !py-1 !px-2 !text-[10px]"
                  >
                    <Check size={13} strokeWidth={1.5} /> Aprobar
                  </button>
                  <button
                    onClick={() => resolverSolicitud(s, 'RECHAZADA')}
                    className="btn-danger !py-1 !px-2 !text-[10px]"
                  >
                    <XIcon size={13} strokeWidth={1.5} /> Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left border-b border-line">
            <tr className="micro">
              <th className="px-5 py-3 font-medium">Tienda</th>
              <th className="px-5 py-3 font-medium">Plan</th>
              <th className="px-5 py-3 font-medium text-center">Usuarios</th>
              <th className="px-5 py-3 font-medium text-center">Productos</th>
              <th className="px-5 py-3 font-medium text-center">Ventas</th>
              <th className="px-5 py-3 font-medium text-center">Estado</th>
              <th className="px-5 py-3 font-medium text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {tiendas.map((t) => (
              <tr key={t.id} className={t.activa ? '' : 'opacity-60'}>
                <td className="px-5 py-3">
                  <p className="font-display font-medium text-ink">{t.nombre}</p>
                  <p className="text-xs text-gris">/{t.slug}</p>
                </td>
                <td className="px-5 py-3">
                  <select
                    value={t.plan}
                    onChange={(e) => patch(t.id, { plan: e.target.value })}
                    className="badge badge-ink cursor-pointer bg-transparent"
                  >
                    <option value="FREE">FREE</option>
                    <option value="BASIC">BASIC</option>
                    <option value="PRO">PRO</option>
                  </select>
                </td>
                <td className="px-5 py-3 text-center text-gris">{t._count.users}</td>
                <td className="px-5 py-3 text-center text-gris">{t._count.products}</td>
                <td className="px-5 py-3 text-center text-gris">{t._count.sales}</td>
                <td className="px-5 py-3 text-center">
                  <span className={`badge ${t.activa ? 'badge-ink' : 'badge-accent'}`}>
                    {t.activa ? 'Activa' : 'Suspendida'}
                  </span>
                </td>
                <td className="px-5 py-3 text-right whitespace-nowrap">
                  <button onClick={() => toggleActiva(t)} className="btn-secondary !py-1 !px-2 !text-[10px] mr-1">
                    <Power size={13} strokeWidth={1.5} /> {t.activa ? 'Suspender' : 'Activar'}
                  </button>
                  <button onClick={() => eliminarTienda(t)} className="btn-danger !py-1 !px-2 !text-[10px]">
                    <Trash2 size={13} strokeWidth={1.5} /> Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {tiendas.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-gris halftone">
                  Aún no hay tiendas registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal title="Nueva tienda" open={open} onClose={() => setOpen(false)}>
        <form onSubmit={crearTienda} className="space-y-4">
          <div>
            <label className="label">Nombre de la tienda</label>
            <input className="input" value={form.nombre} onChange={setField('nombre')} required autoFocus placeholder="Mi Tiendita" />
          </div>
          <div>
            <label className="label">Plan</label>
            <select className="input" value={form.plan} onChange={setField('plan')}>
              <option value="FREE">FREE</option>
              <option value="BASIC">BASIC</option>
              <option value="PRO">PRO</option>
            </select>
          </div>
          <div className="border-t border-line pt-4">
            <p className="micro mb-3">Administrador de la tienda</p>
            <div className="space-y-3">
              <div>
                <label className="label">Nombre</label>
                <input className="input" value={form.adminName} onChange={setField('adminName')} required placeholder="Juan Pérez" />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" value={form.adminEmail} onChange={setField('adminEmail')} required placeholder="admin@tienda.com" />
              </div>
              <div>
                <label className="label">Contraseña</label>
                <input type="password" className="input" value={form.adminPassword} onChange={setField('adminPassword')} required placeholder="mínimo 6 caracteres" />
              </div>
            </div>
          </div>
          {formError && <p className="note-error">{formError}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Creando...' : 'Crear tienda'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
