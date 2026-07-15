// Pantalla "Mi plan": plan actual de la tienda, uso vs. límites, comparativa y
// solicitud de cambio de plan con comprobante de pago.
import { useEffect, useState, useCallback } from 'react';
import { Check, Upload, Clock } from 'lucide-react';
import { api, errorMsg } from '../api/client.js';
import Modal from '../components/Modal.jsx';

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
          className={`h-full rounded-full ${full ? 'bg-accent' : 'bg-brand'}`}
          style={{ width: max == null ? '8%' : `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function MiPlan() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  // Solicitud de cambio de plan
  const [pedido, setPedido] = useState(null); // plan elegido, abre el modal
  const [comprobanteUrl, setComprobanteUrl] = useState('');
  const [nota, setNota] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(() => {
    api
      .get('/subscription')
      .then((r) => setData(r.data))
      .catch((e) => setError(errorMsg(e)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function subirComprobante(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setFormError('');
    try {
      const fd = new FormData();
      fd.append('image', file);
      const { data: r } = await api.post('/catalog/upload', fd);
      setComprobanteUrl(r.url);
    } catch (err) {
      setFormError(errorMsg(err));
    } finally {
      setUploading(false);
    }
  }

  async function enviarSolicitud(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      await api.post('/subscription/solicitud', {
        plan: pedido,
        comprobanteUrl: comprobanteUrl || null,
        nota: nota || null,
      });
      setPedido(null);
      setComprobanteUrl('');
      setNota('');
      load();
    } catch (err) {
      setFormError(errorMsg(err));
    } finally {
      setSaving(false);
    }
  }

  if (error) return <p className="note-error">{error}</p>;
  if (!data) return <p className="text-gris">Cargando...</p>;

  const planes = data.planes || {};
  const pendiente = data.solicitud?.estado === 'PENDIENTE' ? data.solicitud : null;

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
            <div key={key} className={`card p-6 ${actual ? 'border-brand ring-4 ring-brand/10' : ''}`}>
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
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-brand text-white shrink-0">
                    <Check size={11} strokeWidth={2.5} />
                  </span>
                  {p.maxProductos == null ? 'Productos ilimitados' : `Hasta ${p.maxProductos} productos`}
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-brand text-white shrink-0">
                    <Check size={11} strokeWidth={2.5} />
                  </span>
                  {p.maxUsuarios == null ? 'Usuarios ilimitados' : `Hasta ${p.maxUsuarios} usuarios`}
                </li>
              </ul>
              {!actual && (
                <button
                  onClick={() => setPedido(key)}
                  disabled={!!pendiente}
                  className="btn-secondary w-full mt-5"
                >
                  Solicitar este plan
                </button>
              )}
            </div>
          );
        })}
      </div>

      {pendiente ? (
        <p className="note text-gris flex items-center gap-2">
          <Clock size={15} strokeWidth={1.5} className="shrink-0 text-ink" />
          Tienes una solicitud pendiente al plan{' '}
          <b className="text-ink">{planes[pendiente.plan]?.nombre || pendiente.plan}</b>. La
          activaremos apenas confirmemos tu pago.
        </p>
      ) : data.solicitud?.estado === 'RECHAZADA' ? (
        <p className="note-error">
          Tu última solicitud fue rechazada. Si crees que es un error, contáctanos y vuelve a
          intentarlo.
        </p>
      ) : (
        <p className="note text-gris">
          Elige un plan, paga por QR o transferencia y sube tu comprobante: lo activamos apenas
          lo confirmemos.
        </p>
      )}

      {/* Modal de solicitud */}
      <Modal
        title={`Solicitar plan ${planes[pedido]?.nombre || ''}`}
        open={!!pedido}
        onClose={() => setPedido(null)}
      >
        {pedido && (
          <form onSubmit={enviarSolicitud} className="space-y-4">
            <p className="text-sm text-gris">
              {planes[pedido]?.precio > 0 ? (
                <>
                  Realiza el pago de{' '}
                  <b className="text-ink">Bs {planes[pedido].precio}/mes</b> por QR o
                  transferencia y sube la foto del comprobante.
                </>
              ) : (
                'Confirma que quieres bajar al plan gratuito.'
              )}
            </p>

            {planes[pedido]?.precio > 0 && (
              <div>
                <label className="label">Comprobante de pago</label>
                <div className="flex items-center gap-3">
                  {comprobanteUrl && (
                    <img
                      src={comprobanteUrl}
                      alt="comprobante"
                      className="h-16 object-contain rounded-sm border border-line"
                    />
                  )}
                  <label className="btn-secondary cursor-pointer">
                    <Upload size={14} strokeWidth={1.5} />{' '}
                    {uploading ? 'Subiendo…' : comprobanteUrl ? 'Cambiar' : 'Subir comprobante'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={subirComprobante}
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>
            )}

            <div>
              <label className="label">Nota (opcional)</label>
              <input
                className="input"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Pagué desde la cuenta de…"
              />
            </div>

            {formError && <p className="note-error">{formError}</p>}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setPedido(null)} className="btn-secondary">
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={saving || uploading}>
                {saving ? 'Enviando…' : 'Enviar solicitud'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
