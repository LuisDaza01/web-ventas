// Clientes de la tienda: libreta de fiados. Lista con deuda pendiente,
// detalle de ventas al crédito y registro de abonos (pagos parciales).
import { useEffect, useState, useCallback } from 'react';
import { Search, Plus, Pencil, HandCoins, Banknote, QrCode, Phone } from 'lucide-react';
import { api, money, errorMsg } from '../api/client.js';
import Modal from '../components/Modal.jsx';

const VACIO = { nombre: '', telefono: '', nota: '' };

export default function Clientes() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // Modal crear/editar
  const [form, setForm] = useState(null); // null = cerrado; {id?} = abierto
  const [saving, setSaving] = useState(false);

  // Modal detalle / abono
  const [detalle, setDetalle] = useState(null);
  const [abono, setAbono] = useState({ monto: '', metodoPago: 'EFECTIVO' });
  const [abonando, setAbonando] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/clientes', { params: { search } });
      setItems(data);
    } catch (e) {
      setError(errorMsg(e));
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  async function guardar(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        nombre: form.nombre.trim(),
        telefono: form.telefono || null,
        nota: form.nota || null,
      };
      if (form.id) await api.put(`/clientes/${form.id}`, payload);
      else await api.post('/clientes', payload);
      setForm(null);
      load();
    } catch (err) {
      setError(errorMsg(err));
    } finally {
      setSaving(false);
    }
  }

  async function abrirDetalle(id) {
    setError('');
    try {
      const { data } = await api.get(`/clientes/${id}`);
      setDetalle(data);
      setAbono({ monto: '', metodoPago: 'EFECTIVO' });
    } catch (e) {
      setError(errorMsg(e));
    }
  }

  async function registrarAbono(e) {
    e.preventDefault();
    setAbonando(true);
    setError('');
    try {
      await api.post(`/clientes/${detalle.id}/abonos`, {
        monto: Number(abono.monto),
        metodoPago: abono.metodoPago,
      });
      setInfo(`Abono de ${money(abono.monto)} registrado para ${detalle.nombre}.`);
      setTimeout(() => setInfo(''), 3000);
      await abrirDetalle(detalle.id); // recargar detalle
      load();
    } catch (err) {
      setError(errorMsg(err));
    } finally {
      setAbonando(false);
    }
  }

  const totalDeuda = items.reduce((s, c) => s + (c.deuda || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-2 flex-wrap">
        <div>
          <p className="micro mb-2">Fiados y contactos</p>
          <h1 className="display text-3xl leading-tight">Clientes</h1>
        </div>
        <button onClick={() => setForm(VACIO)} className="btn-primary">
          <Plus size={16} strokeWidth={1.5} /> Nuevo cliente
        </button>
      </div>

      {error && <p className="note-error">{error}</p>}
      {info && <p className="note-ok">{info}</p>}

      <div className="flex flex-wrap items-center gap-4 justify-between">
        <div className="flex items-center gap-2 border-b border-line pb-2 max-w-md flex-1 min-w-56">
          <Search className="text-gris shrink-0" size={18} strokeWidth={1.5} />
          <input
            className="w-full bg-transparent border-0 text-sm text-ink outline-none placeholder:text-gris/50"
            placeholder="Buscar por nombre o teléfono…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {totalDeuda > 0 && (
          <p className="text-sm text-gris">
            Deuda total: <span className="font-display font-semibold text-accent">{money(totalDeuda)}</span>
          </p>
        )}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left border-b border-line">
            <tr className="micro">
              <th className="px-5 py-3 font-medium">Cliente</th>
              <th className="px-5 py-3 font-medium">Teléfono</th>
              <th className="px-5 py-3 font-medium text-right">Deuda</th>
              <th className="px-5 py-3 font-medium text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((c) => (
              <tr key={c.id}>
                <td className="px-5 py-3">
                  <p className="font-display font-medium text-ink">{c.nombre}</p>
                  {c.nota && <p className="text-xs text-gris">{c.nota}</p>}
                </td>
                <td className="px-5 py-3 text-gris">
                  {c.telefono ? (
                    <span className="inline-flex items-center gap-1">
                      <Phone size={13} strokeWidth={1.5} /> {c.telefono}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  {c.deuda > 0 ? (
                    <span className="font-display font-semibold text-accent">{money(c.deuda)}</span>
                  ) : (
                    <span className="text-gris">—</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right whitespace-nowrap">
                  <button
                    onClick={() => abrirDetalle(c.id)}
                    className="btn-secondary !py-1 !px-2 !text-[10px] mr-1"
                  >
                    <HandCoins size={13} strokeWidth={1.5} /> Cuenta
                  </button>
                  <button
                    onClick={() => setForm({ id: c.id, nombre: c.nombre, telefono: c.telefono || '', nota: c.nota || '' })}
                    className="btn-secondary !py-1 !px-2 !text-[10px]"
                  >
                    <Pencil size={13} strokeWidth={1.5} /> Editar
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center text-gris halftone">
                  Aún no registras clientes. Los necesitas para vender al crédito (fiado).
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Crear / editar */}
      <Modal
        title={form?.id ? 'Editar cliente' : 'Nuevo cliente'}
        open={!!form}
        onClose={() => setForm(null)}
      >
        {form && (
          <form onSubmit={guardar} className="space-y-4">
            <div>
              <label className="label">Nombre</label>
              <input
                className="input"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                required
                autoFocus
                placeholder="María Pérez"
              />
            </div>
            <div>
              <label className="label">Teléfono / WhatsApp</label>
              <input
                className="input"
                value={form.telefono}
                onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                placeholder="70000000"
              />
            </div>
            <div>
              <label className="label">Nota</label>
              <input
                className="input"
                value={form.nota}
                onChange={(e) => setForm((f) => ({ ...f, nota: e.target.value }))}
                placeholder="Vecina de la esquina, paga los viernes…"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setForm(null)} className="btn-secondary">
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Detalle de cuenta + abonos */}
      <Modal
        title={detalle ? `Cuenta de ${detalle.nombre}` : ''}
        open={!!detalle}
        onClose={() => setDetalle(null)}
        maxWidth="max-w-2xl"
      >
        {detalle && (
          <div className="space-y-5">
            <div className="flex items-baseline justify-between">
              <span className="micro">Deuda pendiente</span>
              <span className={`display text-3xl ${detalle.deuda > 0 ? 'text-accent' : ''}`}>
                {money(detalle.deuda)}
              </span>
            </div>

            {detalle.deuda > 0 && (
              <form onSubmit={registrarAbono} className="card p-4 space-y-3">
                <p className="micro">Registrar abono</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Monto</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={detalle.deuda}
                      className="input"
                      value={abono.monto}
                      onChange={(e) => setAbono((a) => ({ ...a, monto: e.target.value }))}
                      required
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="label">Método</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setAbono((a) => ({ ...a, metodoPago: 'EFECTIVO' }))}
                        className={abono.metodoPago === 'EFECTIVO' ? 'btn-primary !py-1.5' : 'btn-secondary !py-1.5'}
                      >
                        <Banknote size={13} strokeWidth={1.5} /> Efectivo
                      </button>
                      <button
                        type="button"
                        onClick={() => setAbono((a) => ({ ...a, metodoPago: 'QR' }))}
                        className={abono.metodoPago === 'QR' ? 'btn-primary !py-1.5' : 'btn-secondary !py-1.5'}
                      >
                        <QrCode size={13} strokeWidth={1.5} /> QR
                      </button>
                    </div>
                  </div>
                </div>
                <button type="submit" className="btn-primary w-full" disabled={abonando}>
                  {abonando ? 'Registrando…' : 'Registrar abono'}
                </button>
                <p className="text-xs text-gris">
                  El abono se aplica a las ventas más antiguas primero.
                </p>
              </form>
            )}

            <div>
              <p className="micro mb-2">Ventas al crédito</p>
              {detalle.ventas.length === 0 ? (
                <p className="text-sm text-gris">Sin ventas al crédito registradas.</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-auto">
                  {detalle.ventas.map((v) => (
                    <div key={v.id} className="card p-3 text-sm">
                      <div className="flex justify-between items-baseline">
                        <span className="font-display font-medium text-ink">
                          Venta #{v.id} · {new Date(v.createdAt).toLocaleDateString('es-BO')}
                        </span>
                        <span className={v.saldo > 0 ? 'badge badge-accent' : 'badge badge-ink'}>
                          {v.saldo > 0 ? `Debe ${money(v.saldo)}` : 'Pagada'}
                        </span>
                      </div>
                      <p className="text-xs text-gris mt-1">
                        {v.items.map((it) => `${it.quantity}x ${it.product?.name}`).join(', ')} ·
                        Total {money(v.total)}
                      </p>
                      {v.abonos.length > 0 && (
                        <p className="text-xs text-gris mt-1">
                          Abonos:{' '}
                          {v.abonos
                            .map((a) => `${money(a.monto)} (${new Date(a.createdAt).toLocaleDateString('es-BO')})`)
                            .join(' · ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
