// Caja: apertura del turno con efectivo inicial, resumen en vivo de lo vendido
// y cierre con arqueo (efectivo contado vs. esperado). Historial para el admin.
import { useEffect, useState, useCallback } from 'react';
import { Lock, Unlock, RefreshCw } from 'lucide-react';
import { api, money, errorMsg } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Modal from '../components/Modal.jsx';

function Linea({ label, value, strong }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gris">{label}</span>
      <span className={strong ? 'font-display font-semibold text-ink' : 'text-ink'}>{value}</span>
    </div>
  );
}

export default function Caja() {
  const { can } = useAuth();
  const [sesion, setSesion] = useState(undefined); // undefined = cargando, null = cerrada
  const [historial, setHistorial] = useState([]);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const [montoInicial, setMontoInicial] = useState('');
  const [cerrando, setCerrando] = useState(false); // abre modal de cierre
  const [montoFinal, setMontoFinal] = useState('');
  const [nota, setNota] = useState('');
  const [saving, setSaving] = useState(false);
  const [cierre, setCierre] = useState(null); // resultado del cierre (arqueo)

  const load = useCallback(async () => {
    setError('');
    try {
      const { data } = await api.get('/caja/actual');
      setSesion(data);
      if (can.admin) {
        const h = await api.get('/caja');
        setHistorial(h.data.filter((s) => !s.abierta));
      }
    } catch (e) {
      setError(errorMsg(e));
    }
  }, [can.admin]);

  useEffect(() => {
    load();
  }, [load]);

  async function abrir(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/caja/abrir', { montoInicial: Number(montoInicial) || 0 });
      setMontoInicial('');
      setInfo('Caja abierta. ¡Buenas ventas!');
      setTimeout(() => setInfo(''), 3000);
      load();
    } catch (err) {
      setError(errorMsg(err));
    } finally {
      setSaving(false);
    }
  }

  async function cerrar(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { data } = await api.post('/caja/cerrar', {
        montoFinal: Number(montoFinal),
        nota: nota || null,
      });
      setCierre(data);
      setCerrando(false);
      setMontoFinal('');
      setNota('');
      load();
    } catch (err) {
      setError(errorMsg(err));
    } finally {
      setSaving(false);
    }
  }

  if (sesion === undefined) return <p className="text-gris">Cargando…</p>;

  const r = sesion?.resumen;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="micro mb-2">Turno</p>
          <h1 className="display text-3xl leading-tight">Caja</h1>
        </div>
        {sesion && (
          <button onClick={load} className="btn-secondary !py-2" title="Actualizar resumen">
            <RefreshCw size={14} strokeWidth={1.5} /> Actualizar
          </button>
        )}
      </div>

      {error && <p className="note-error">{error}</p>}
      {info && <p className="note-ok">{info}</p>}

      {!sesion ? (
        /* ---- Caja cerrada: abrir turno ---- */
        <form onSubmit={abrir} className="card p-6 space-y-4 max-w-md">
          <div className="flex items-center gap-2">
            <Lock size={18} strokeWidth={1.5} className="text-gris" />
            <p className="font-display font-medium text-lg text-ink">La caja está cerrada</p>
          </div>
          <div>
            <label className="label">Efectivo inicial en caja</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input text-lg font-display"
              value={montoInicial}
              onChange={(e) => setMontoInicial(e.target.value)}
              placeholder="0.00"
              autoFocus
            />
            <p className="text-xs text-gris mt-1.5">
              El dinero con el que empiezas el turno (para dar cambio).
            </p>
          </div>
          <button type="submit" className="btn-primary w-full py-3" disabled={saving}>
            <Unlock size={15} strokeWidth={1.5} /> {saving ? 'Abriendo…' : 'Abrir caja'}
          </button>
        </form>
      ) : (
        /* ---- Caja abierta: resumen del turno ---- */
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="card p-6 space-y-3">
            <div className="flex items-center justify-between">
              <p className="micro">Turno actual</p>
              <span className="badge badge-ink">Abierta</span>
            </div>
            <Linea label="Abrió" value={sesion.user?.name || '—'} />
            <Linea
              label="Apertura"
              value={new Date(sesion.openedAt).toLocaleString('es-BO')}
            />
            <Linea label="Efectivo inicial" value={money(sesion.montoInicial)} />
            <div className="border-t border-line pt-3">
              <p className="micro mb-1">Efectivo esperado en caja</p>
              <p className="display text-4xl">{money(r.esperadoEfectivo)}</p>
            </div>
            <button onClick={() => setCerrando(true)} className="btn-primary w-full py-3 mt-2">
              <Lock size={15} strokeWidth={1.5} /> Cerrar caja
            </button>
          </div>

          <div className="card p-6 space-y-3">
            <p className="micro">Ventas del turno ({r.numVentas})</p>
            <Linea label="Efectivo" value={money(r.ventasEfectivo)} />
            <Linea label="QR" value={money(r.ventasQr)} />
            <Linea label="Fiado (crédito)" value={money(r.ventasCredito)} />
            {r.creditoInicial > 0 && (
              <Linea label="Abonos iniciales de fiado" value={money(r.creditoInicial)} />
            )}
            {(r.abonosEfectivo > 0 || r.abonosQr > 0) && (
              <>
                <p className="micro pt-2">Cobros de deudas</p>
                <Linea label="Abonos en efectivo" value={money(r.abonosEfectivo)} />
                <Linea label="Abonos por QR" value={money(r.abonosQr)} />
              </>
            )}
            <div className="border-t border-line pt-3">
              <Linea label="Total vendido" value={money(r.totalVendido)} strong />
            </div>
          </div>
        </div>
      )}

      {/* Historial (solo admin) */}
      {can.admin && historial.length > 0 && (
        <div>
          <p className="micro mb-3">Cierres anteriores</p>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left border-b border-line">
                <tr className="micro">
                  <th className="px-5 py-3 font-medium">Cierre</th>
                  <th className="px-5 py-3 font-medium">Cajero</th>
                  <th className="px-5 py-3 font-medium text-right">Esperado</th>
                  <th className="px-5 py-3 font-medium text-right">Contado</th>
                  <th className="px-5 py-3 font-medium text-right">Diferencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {historial.map((s) => (
                  <tr key={s.id}>
                    <td className="px-5 py-3 text-gris">
                      {new Date(s.closedAt).toLocaleString('es-BO')}
                      {s.nota && <p className="text-xs">{s.nota}</p>}
                    </td>
                    <td className="px-5 py-3 text-gris">{s.user?.name}</td>
                    <td className="px-5 py-3 text-right text-gris">{money(s.esperado)}</td>
                    <td className="px-5 py-3 text-right text-ink">{money(s.montoFinal)}</td>
                    <td className="px-5 py-3 text-right">
                      <span
                        className={`font-display font-semibold ${
                          Math.abs(s.diferencia) < 0.005
                            ? 'text-ink'
                            : 'text-accent'
                        }`}
                      >
                        {s.diferencia > 0 ? '+' : ''}
                        {money(s.diferencia)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de cierre (arqueo) */}
      <Modal title="Cerrar caja" open={cerrando} onClose={() => setCerrando(false)}>
        {sesion && (
          <form onSubmit={cerrar} className="space-y-4">
            <p className="text-sm text-gris">
              Cuenta el efectivo de la caja y escribe el total. El sistema lo compara con lo
              esperado: <b className="text-ink">{money(sesion.resumen.esperadoEfectivo)}</b>.
            </p>
            <div>
              <label className="label">Efectivo contado</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input text-lg font-display"
                value={montoFinal}
                onChange={(e) => setMontoFinal(e.target.value)}
                required
                autoFocus
                placeholder="0.00"
              />
            </div>
            {montoFinal !== '' && (
              <p className="text-sm">
                Diferencia:{' '}
                <span
                  className={`font-display font-semibold ${
                    Math.abs(Number(montoFinal) - sesion.resumen.esperadoEfectivo) < 0.005
                      ? 'text-ink'
                      : 'text-accent'
                  }`}
                >
                  {money(Number(montoFinal) - sesion.resumen.esperadoEfectivo)}
                </span>
              </p>
            )}
            <div>
              <label className="label">Nota (opcional)</label>
              <input
                className="input"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Faltó cambio de la mañana…"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setCerrando(false)} className="btn-secondary">
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Cerrando…' : 'Cerrar caja'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Resultado del arqueo */}
      <Modal title="Caja cerrada" open={!!cierre} onClose={() => setCierre(null)}>
        {cierre && (
          <div className="space-y-3">
            <Linea label="Ventas del turno" value={money(cierre.resumen.totalVendido)} />
            <Linea label="Efectivo esperado" value={money(cierre.esperado)} />
            <Linea label="Efectivo contado" value={money(cierre.montoFinal)} />
            <div className="border-t border-line pt-3 flex justify-between items-baseline">
              <span className="micro">Diferencia</span>
              <span
                className={`display text-3xl ${
                  Math.abs(cierre.diferencia) < 0.005 ? 'text-ink' : 'text-accent'
                }`}
              >
                {cierre.diferencia > 0 ? '+' : ''}
                {money(cierre.diferencia)}
              </span>
            </div>
            {Math.abs(cierre.diferencia) < 0.005 && (
              <p className="note-ok">La caja cuadró exacto. 🎯</p>
            )}
            <button onClick={() => setCierre(null)} className="btn-primary w-full">
              Entendido
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
