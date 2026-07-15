// Gestión de usuarios y roles (solo administrador).
import { useEffect, useState, useCallback } from 'react';
import { Plus, UserX } from 'lucide-react';
import { api, errorMsg } from '../api/client.js';
import { useConfirm } from '../context/ConfirmContext.jsx';
import Modal from '../components/Modal.jsx';

const ROLE_LABEL = { ADMIN: 'Administrador', CAJERO: 'Cajero', ALMACEN: 'Almacén' };

export default function Users() {
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'CAJERO' });
  const [error, setError] = useState('');
  const confirm = useConfirm();

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
      const ok = await confirm({
        title: 'Desactivar usuario',
        message: `¿Desactivar a ${u.name}? No podrá iniciar sesión.`,
        confirmText: 'Desactivar',
        danger: true,
      });
      if (!ok) return;
      await api.delete(`/users/${u.id}`);
    } else {
      await api.put(`/users/${u.id}`, { active: true });
    }
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="micro mb-2">Equipo</p>
          <h1 className="display text-3xl leading-tight">Usuarios</h1>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary"><Plus size={16} strokeWidth={1.5} /> Nuevo usuario</button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left border-b border-line">
            <tr className="micro">
              <th className="px-5 py-3 font-medium">Nombre</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Rol</th>
              <th className="px-5 py-3 font-medium text-center">Estado</th>
              <th className="px-5 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((u) => (
              <tr key={u.id} className={u.active ? '' : 'opacity-50'}>
                <td className="px-5 py-3 font-display font-medium text-ink">{u.name}</td>
                <td className="px-5 py-3 text-gris">{u.email}</td>
                <td className="px-5 py-3"><span className="badge badge-ink">{ROLE_LABEL[u.role]}</span></td>
                <td className="px-5 py-3 text-center">
                  <span className={`badge ${u.active ? 'badge-ink' : ''}`}>{u.active ? 'Activo' : 'Inactivo'}</span>
                </td>
                <td className="px-5 py-3 text-right">
                  <button onClick={() => toggleActive(u)} className="btn-secondary !py-1 !px-2 !text-[10px]"><UserX size={13} strokeWidth={1.5} /> {u.active ? 'Desactivar' : 'Activar'}</button>
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
            </select>
          </div>
          {error && <p className="note-error">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Crear</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
