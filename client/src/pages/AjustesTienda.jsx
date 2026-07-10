// Ajustes de la tienda (solo ADMIN): nombre, moneda, impuesto, datos del recibo y logo.
import { useEffect, useState } from 'react';
import { Upload, Save } from 'lucide-react';
import { api, errorMsg } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function AjustesTienda() {
  const { setTienda } = useAuth();
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState(null); // { type, text }
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api
      .get('/tienda')
      .then((r) => setForm(r.data))
      .catch((e) => setMsg({ type: 'error', text: errorMsg(e) }));
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Sube una imagen y guarda su URL en el campo indicado (logoUrl o qrPagoUrl).
  function subirImagen(campo) {
    return async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const data = new FormData();
        data.append('image', file);
        const { data: r } = await api.post('/catalog/upload', data);
        setForm((f) => ({ ...f, [campo]: r.url }));
      } catch (err) {
        setMsg({ type: 'error', text: errorMsg(err) });
      } finally {
        setUploading(false);
      }
    };
  }

  async function guardar(e) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const { data } = await api.put('/tienda', {
        nombre: form.nombre,
        moneda: form.moneda,
        simbolo: form.simbolo,
        impuesto: Number(form.impuesto) || 0,
        direccion: form.direccion || null,
        telefono: form.telefono || null,
        mensajeRecibo: form.mensajeRecibo || null,
        logoUrl: form.logoUrl || null,
        qrPagoUrl: form.qrPagoUrl || null,
      });
      setForm(data);
      setTienda(data); // aplica moneda/recibo de inmediato en toda la app
      setMsg({ type: 'ok', text: 'Cambios guardados.' });
    } catch (err) {
      setMsg({ type: 'error', text: errorMsg(err) });
    } finally {
      setSaving(false);
    }
  }

  if (!form) return <p className="text-gris">Cargando...</p>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p className="micro mb-2">Configuración</p>
        <h1 className="display text-3xl leading-tight">Ajustes de la tienda</h1>
      </div>

      {msg && (
        <p className={msg.type === 'error' ? 'note-error' : 'note-ok'}>{msg.text}</p>
      )}

      <form onSubmit={guardar} className="card p-6 space-y-5">
        <div>
          <label className="label">Nombre de la tienda</label>
          <input className="input" value={form.nombre || ''} onChange={set('nombre')} required />
        </div>

        <div className="grid sm:grid-cols-3 gap-5">
          <div>
            <label className="label">Símbolo de moneda</label>
            <input className="input" value={form.simbolo || ''} onChange={set('simbolo')} placeholder="Bs" />
          </div>
          <div>
            <label className="label">Código moneda</label>
            <input className="input" value={form.moneda || ''} onChange={set('moneda')} placeholder="BOB" />
          </div>
          <div>
            <label className="label">Impuesto (%)</label>
            <input type="number" step="0.01" min="0" max="100" className="input" value={form.impuesto ?? 0} onChange={set('impuesto')} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className="label">Dirección (recibo)</label>
            <input className="input" value={form.direccion || ''} onChange={set('direccion')} />
          </div>
          <div>
            <label className="label">Teléfono (recibo)</label>
            <input className="input" value={form.telefono || ''} onChange={set('telefono')} />
          </div>
        </div>

        <div>
          <label className="label">Mensaje al pie del recibo</label>
          <input className="input" value={form.mensajeRecibo || ''} onChange={set('mensajeRecibo')} placeholder="¡Gracias por su compra!" />
        </div>

        <div className="grid sm:grid-cols-2 gap-5 pt-2 border-t border-line">
          <div>
            <label className="label">Logo</label>
            <div className="flex items-center gap-3">
              {form.logoUrl && <img src={form.logoUrl} alt="logo" className="h-12 object-contain rounded-sm border border-line" />}
              <label className="btn-secondary cursor-pointer">
                <Upload size={14} strokeWidth={1.5} /> {uploading ? 'Subiendo...' : 'Subir logo'}
                <input type="file" accept="image/*" className="hidden" onChange={subirImagen('logoUrl')} disabled={uploading} />
              </label>
            </div>
          </div>
          <div>
            <label className="label">QR de cobro</label>
            <div className="flex items-center gap-3">
              {form.qrPagoUrl && <img src={form.qrPagoUrl} alt="QR" className="h-12 object-contain rounded-sm border border-line" />}
              <label className="btn-secondary cursor-pointer">
                <Upload size={14} strokeWidth={1.5} /> {uploading ? 'Subiendo...' : 'Subir QR'}
                <input type="file" accept="image/*" className="hidden" onChange={subirImagen('qrPagoUrl')} disabled={uploading} />
              </label>
            </div>
            <p className="text-xs text-gris mt-1.5">El cliente lo escanea para pagar (QR Simple, banco, etc.).</p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save size={14} strokeWidth={1.5} /> {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}
