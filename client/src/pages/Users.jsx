// Gestión de usuarios y roles (solo administrador).
import { useEffect, useState, useCallback } from 'react';
import { Plus, UserX } from 'lucide-react';
import { api, errorMsg } from '../api/client.js';
import Modal from '../components/Modal.jsx';

const ROLE_LABEL = { ADMIN: 'Administrador', CAJERO: 'Cajero', ALMACEN: 'Almacén' };
const ROLE_BADGE = { ADMIN: 'bg-purple-100 text-purple-700', CAJERO: 'bg-brand-100 text-brand-700', ALMACEN: 'bg-amber-100 text-amber-700' };

export default function Users() {
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'CAJERO' });
  const [error, setError] = useState('');

  const load = useCallback(() => api.get('/users').then((r) => setUsers(r.data)), []);
  useEffect(() => { load(); }, [load]);

  async function create(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/users', form);
      setOpen(false);
      setForm({ name: '', username: '', password: '', role: 'CAJERO' });
      load();
    } catch (err) {
      setError(errorMsg(err));
    }
  }

  async function toggleActive(u) {
    if (u.active) {
      if (!confirm(`¿Desactivar a ${u.name}?`)) return;
      await api.delete(`/users/${u.id}`);
    } else {
      await api.put(`/users/${u.id}`, { active: true });
    }
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Usuarios</h1>
        <button onClick={() => setOpen(true)} className="btn-primary"><Plus size={18} /> Nuevo usuario</button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Email</th>
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
                <td className="px-4 py-3"><span className={`badge ${ROLE_BADGE[u.role]}`}>{ROLE_LABEL[u.role]}</span></td>
                <td className="px-4 py-3 text-center">
                  <span className={`badge ${u.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>{u.active ? 'Activo' : 'Inactivo'}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => toggleActive(u)} className="btn-secondary !py-1 !px-2 text-xs"><UserX size={14} /> {u.active ? 'Desactivar' : 'Activar'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal title="Nuevo usuario" open={open} onClose={() => setOpen(false)}>
        <form onSubmit={create} className="space-y-4">
          <div><label className="label">Nombre completo</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
          <div><label className="label">Contraseña</label><input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></div>
          <div>
            <label className="label">Rol</label>
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="CAJERO">Cajero (solo vende)</option>
              <option value="ALMACEN">Almacén (productos y stock)</option>
              <option value="ADMIN">Administrador (todo)</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Crear</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
