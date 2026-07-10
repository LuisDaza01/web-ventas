// Usuarios de la plataforma (SUPERADMIN): ve y administra los usuarios de TODAS
// las tiendas. Puede editar nombre/rol, cambiar la contraseña y dar de baja.
import { useEffect, useState, useCallback } from 'react';
import { Pencil, Trash2, UserCheck } from 'lucide-react';
import { api, errorMsg } from '../api/client.js';
import { useConfirm } from '../context/ConfirmContext.jsx';
import Modal from '../components/Modal.jsx';

const ROLE_LABEL = { ADMIN: 'Administrador', CAJERO: 'Cajero', ALMACEN: 'Almacén' };

export default function UsuariosPlataforma() {
  const [users, setUsers] = useState([]);
  const [tiendas, setTiendas] = useState([]);
  const [filtro, setFiltro] = useState(''); // tiendaId o '' (todas)
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const confirm = useConfirm();

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

  async function eliminar(u) {
    const ok = await confirm({
      title: 'Eliminar usuario',
      message: `¿Eliminar a ${u.name}? Si no tiene ventas registradas se borra por completo; si tiene historial, se da de baja para conservar los reportes.`,
      confirmText: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    setError('');
    setInfo('');
    try {
      const { data } = await api.delete(`/platform/users/${u.id}`);
      setInfo(
        data.deleted
          ? `Usuario "${u.name}" eliminado por completo.`
          : `"${u.name}" tiene historial: se dio de baja en lugar de eliminarse.`
      );
      load();
    } catch (err) {
      setError(errorMsg(err));
    }
  }

  async function activar(u) {
    try {
      await api.put(`/platform/users/${u.id}`, { active: true });
      load();
    } catch (err) {
      setError(errorMsg(err));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="micro mb-2">Plataforma</p>
        <h1 className="display text-3xl leading-tight">Usuarios de la plataforma</h1>
      </div>

      {error && <p className="note-error">{error}</p>}
      {info && <p className="note-ok">{info}</p>}

      {/* Filtro por tienda */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-52">
          <label className="label">Tienda</label>
          <select className="input" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="">Todas las tiendas</option>
            {tiendas.map((t) => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </select>
        </div>
        <span className="micro pb-2">{users.length} usuario(s)</span>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left border-b border-line">
            <tr className="micro">
              <th className="px-5 py-3 font-medium">Nombre</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Tienda</th>
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
                <td className="px-5 py-3 text-gris">{u.tienda?.nombre || '—'}</td>
                <td className="px-5 py-3"><span className="badge badge-ink">{ROLE_LABEL[u.role] || u.role}</span></td>
                <td className="px-5 py-3 text-center">
                  <span className={`badge ${u.active ? 'badge-ink' : ''}`}>{u.active ? 'Activo' : 'Inactivo'}</span>
                </td>
                <td className="px-5 py-3 text-right whitespace-nowrap">
                  <button onClick={() => abrirEdicion(u)} className="btn-secondary !py-1 !px-2 !text-[10px] mr-1"><Pencil size={13} strokeWidth={1.5} /> Editar</button>
                  {u.active ? (
                    <button onClick={() => eliminar(u)} className="btn-danger !py-1 !px-2 !text-[10px]"><Trash2 size={13} strokeWidth={1.5} /> Eliminar</button>
                  ) : (
                    <button onClick={() => activar(u)} className="btn-secondary !py-1 !px-2 !text-[10px]"><UserCheck size={13} strokeWidth={1.5} /> Activar</button>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-gris halftone">No hay usuarios.</td></tr>
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
          {formError && <p className="note-error">{formError}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
