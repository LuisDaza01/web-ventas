// Usuarios de la plataforma (SUPERADMIN): ve y administra los usuarios de TODAS
// las tiendas. Puede editar nombre/rol, cambiar la contraseña y dar de baja.
import { useEffect, useState, useCallback } from 'react';
import { Users as UsersIcon, Pencil, UserX, UserCheck } from 'lucide-react';
import { api, errorMsg } from '../api/client.js';
import Modal from '../components/Modal.jsx';

const ROLE_LABEL = { ADMIN: 'Administrador', CAJERO: 'Cajero', ALMACEN: 'Almacén' };
const ROLE_BADGE = {
  ADMIN: 'bg-purple-100 text-purple-700',
  CAJERO: 'bg-brand-100 text-brand-700',
  ALMACEN: 'bg-amber-100 text-amber-700',
};

export default function UsuariosPlataforma() {
  const [users, setUsers] = useState([]);
  const [tiendas, setTiendas] = useState([]);
  const [filtro, setFiltro] = useState(''); // tiendaId o '' (todas)
  const [error, setError] = useState('');

  // Edición de un usuario.
  const [editing, setEditing] = useState(null); // objeto usuario o null
  const [form, setForm] = useState({ name: '', role: 'CAJERO', password: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const params = filtro ? { tiendaId: filtro } : {};
      const u = await api.get('/platform/users', { params });
      setUsers(u.data);
    } catch (err) {
      setError(errorMsg(err));
    }
  }, [filtro]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get('/platform/tiendas').then((r) => setTiendas(r.data)).catch(() => {});
  }, []);

  function abrirEdicion(u) {
    setEditing(u);
    setForm({ name: u.name, role: u.role, password: '' });
    setFormError('');
  }

  async function guardar(e) {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const data = { name: form.name.trim(), role: form.role };
      if (form.password) data.password = form.password; // solo si se escribió
      await api.put(`/platform/users/${editing.id}`, data);
      setEditing(null);
      load();
    } catch (err) {
      setFormError(errorMsg(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(u) {
    try {
      if (u.active) {
        if (!confirm(`¿Dar de baja a ${u.name}? No podrá iniciar sesión.`)) return;
        await api.delete(`/platform/users/${u.id}`);
      } else {
        await api.put(`/platform/users/${u.id}`, { active: true });
      }
      load();
    } catch (err) {
      setError(errorMsg(err));
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <UsersIcon className="text-brand-600" />
        <h1 className="text-2xl font-bold text-slate-800">Usuarios de la plataforma</h1>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      {/* Filtro por tienda */}
      <div className="card p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Tienda</label>
          <select className="input" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="">Todas las tiendas</option>
            {tiendas.map((t) => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </select>
        </div>
        <span className="text-sm text-slate-500 pb-2">{users.length} usuario(s)</span>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Tienda</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium text-center">Estado</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className={u.active ? '' : 'opacity-50'}>
                <td className="px-4 py-3 font-medium text-slate-700">{u.name}</td>
                <td className="px-4 py-3 text-slate-500">{u.email}</td>
                <td className="px-4 py-3 text-slate-500">{u.tienda?.nombre || '—'}</td>
                <td className="px-4 py-3"><span className={`badge ${ROLE_BADGE[u.role]}`}>{ROLE_LABEL[u.role] || u.role}</span></td>
                <td className="px-4 py-3 text-center">
                  <span className={`badge ${u.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>{u.active ? 'Activo' : 'Inactivo'}</span>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button onClick={() => abrirEdicion(u)} className="btn-secondary !py-1 !px-2 text-xs mr-1"><Pencil size={14} /> Editar</button>
                  <button onClick={() => toggleActive(u)} className="btn-secondary !py-1 !px-2 text-xs">
                    {u.active ? <><UserX size={14} /> Baja</> : <><UserCheck size={14} /> Activar</>}
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No hay usuarios.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal title={`Editar usuario`} open={!!editing} onClose={() => setEditing(null)}>
        <form onSubmit={guardar} className="space-y-4">
          <div>
            <label className="label">Nombre</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Rol</label>
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="ADMIN">Administrador (todo en su tienda)</option>
              <option value="CAJERO">Cajero (solo vende)</option>
              <option value="ALMACEN">Almacén (productos y stock)</option>
            </select>
          </div>
          <div>
            <label className="label">Nueva contraseña</label>
            <input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Dejar en blanco para no cambiarla" />
          </div>
          {formError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{formError}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
