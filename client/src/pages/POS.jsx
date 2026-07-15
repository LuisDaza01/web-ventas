// Punto de venta: escanear código de barras, carrito, totales, cambio y recibo.
import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { ScanBarcode, Trash2, Plus, Minus, Printer, Camera, Banknote, QrCode, NotebookPen, UserPlus } from 'lucide-react';
import { api, errorMsg, money } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { beep } from '../utils/beep.js';
import Modal from '../components/Modal.jsx';

// El escáner (con ZXing) se carga solo al abrir la cámara, para no inflar el bundle.
const BarcodeScanner = lazy(() => import('../components/BarcodeScanner.jsx'));

export default function POS() {
  const { tienda } = useAuth();
  const { cart, addItem, incQty, decQty, removeItem, clear, total } = useCart();
  const [code, setCode] = useState('');
  const [message, setMessage] = useState(null); // { type: 'error'|'ok', text }
  const [paid, setPaid] = useState('');
  const [metodoPago, setMetodoPago] = useState('EFECTIVO'); // 'EFECTIVO' | 'QR' | 'CREDITO'
  const [receipt, setReceipt] = useState(null);
  const [saving, setSaving] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const inputRef = useRef(null);

  // Venta al crédito (fiado): cliente al que se le anota la deuda.
  const [clientes, setClientes] = useState(null); // null = aún no cargados
  const [clienteId, setClienteId] = useState('');
  const [nuevoCliente, setNuevoCliente] = useState(null); // { nombre, telefono } | null

  // Carga los clientes la primera vez que se elige "Fiado".
  useEffect(() => {
    if (metodoPago === 'CREDITO' && clientes === null) {
      api
        .get('/clientes')
        .then((r) => setClientes(r.data))
        .catch(() => setClientes([]));
    }
  }, [metodoPago, clientes]);

  async function crearClienteRapido(e) {
    e.preventDefault();
    try {
      const { data } = await api.post('/clientes', {
        nombre: nuevoCliente.nombre.trim(),
        telefono: nuevoCliente.telefono || null,
      });
      setClientes((prev) => [...(prev || []), data]);
      setClienteId(String(data.id));
      setNuevoCliente(null);
    } catch (err) {
      flash('error', errorMsg(err));
    }
  }

  // Mantener el foco en el campo del escáner (el lector USB/Bluetooth "teclea" el código).
  const focusInput = () => inputRef.current?.focus();
  useEffect(() => { focusInput(); }, []);

  const change = (Number(paid) || 0) - total;

  function flash(type, text) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }

  // Busca un producto por código de barras y lo agrega al carrito.
  // La usan tanto el lector/teclado como el escáner por cámara.
  async function lookupAndAdd(barcode) {
    const bc = String(barcode).trim();
    if (!bc) return;
    try {
      const { data: p } = await api.get(`/products/barcode/${encodeURIComponent(bc)}`);
      const r = addItem(p);
      beep(r.ok); // bip agudo si se agregó; grave si no había stock
      flash(r.ok ? 'ok' : 'error', r.ok ? `Agregado: ${p.name}` : r.message);
    } catch (err) {
      beep(false); // bip grave: no se encontró o hubo error
      flash('error', err?.response?.status === 404 ? `Producto no registrado (${bc}).` : errorMsg(err));
    }
  }

  // Al escanear (Enter) o buscar el código con el lector/teclado.
  async function handleScan(e) {
    e.preventDefault();
    const barcode = code.trim();
    if (!barcode) return;
    setCode('');
    await lookupAndAdd(barcode);
    focusInput();
  }

  // Sube/baja la cantidad de una línea; avisa si choca con el stock.
  function changeQty(id, delta) {
    const r = delta > 0 ? incQty(id) : decQty(id);
    if (r && r.ok === false && r.message) flash('error', r.message);
  }

  async function confirmSale() {
    if (cart.length === 0) return flash('error', 'El carrito está vacío.');
    if (metodoPago === 'EFECTIVO' && (Number(paid) || 0) < total) {
      return flash('error', 'El monto recibido es menor al total.');
    }
    if (metodoPago === 'QR' && !tienda?.qrPagoUrl) {
      return flash('error', 'Sube tu QR de cobro en Ajustes para cobrar por QR.');
    }
    if (metodoPago === 'CREDITO') {
      if (!clienteId) return flash('error', 'Elige el cliente al que se fía la venta.');
      if ((Number(paid) || 0) >= total) {
        return flash('error', 'El abono inicial cubre el total: cóbrala en efectivo.');
      }
    }
    setSaving(true);
    try {
      const { data } = await api.post('/sales', {
        items: cart.map((i) => ({ productId: i.id, quantity: i.qty })),
        paid: metodoPago === 'QR' ? total : Number(paid) || 0,
        metodoPago,
        ...(metodoPago === 'CREDITO' ? { clienteId: Number(clienteId) } : {}),
      });
      setReceipt(data);
      clear();
      setPaid('');
      setMetodoPago('EFECTIVO');
      setClienteId('');
    } catch (err) {
      flash('error', errorMsg(err));
    } finally {
      setSaving(false);
      focusInput();
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Columna izquierda: escáner + carrito */}
      <div className="lg:col-span-2 space-y-4">
        <div>
          <p className="micro mb-2">Caja</p>
          <h1 className="display text-3xl leading-tight">Punto de venta</h1>
        </div>

        <form onSubmit={handleScan} className="card p-4 flex items-center gap-3">
          <ScanBarcode className="text-ink shrink-0" size={26} strokeWidth={1.25} />
          <input
            ref={inputRef}
            className="input text-base"
            placeholder="Escanea o escribe el código de barras y presiona Enter"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button type="submit" className="btn-primary shrink-0">Agregar</button>
          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            className="btn-secondary shrink-0"
            title="Escanear con la cámara del dispositivo"
          >
            <Camera size={16} strokeWidth={1.5} /> Cámara
          </button>
        </form>

        {message && (
          <div className={message.type === 'error' ? 'note-error' : 'note-ok'}>
            {message.text}
          </div>
        )}

        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-left border-b border-line">
              <tr className="micro">
                <th className="px-5 py-3 font-medium">Producto</th>
                <th className="px-5 py-3 font-medium text-right">Precio</th>
                <th className="px-5 py-3 font-medium text-center">Cantidad</th>
                <th className="px-5 py-3 font-medium text-right">Subtotal</th>
                <th className="px-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {cart.map((i) => (
                <tr key={i.id}>
                  <td className="px-5 py-3 font-display font-medium text-ink">{i.name}</td>
                  <td className="px-5 py-3 text-right text-gris">{money(i.salePrice)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => changeQty(i.id, -1)} className="p-1 border border-line rounded-lg text-ink hover:border-brand hover:text-brand transition-colors"><Minus size={13} strokeWidth={1.5} /></button>
                      <span className="w-8 text-center font-medium text-ink">{i.qty}</span>
                      <button onClick={() => changeQty(i.id, 1)} className="p-1 border border-line rounded-lg text-ink hover:border-brand hover:text-brand transition-colors"><Plus size={13} strokeWidth={1.5} /></button>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right font-display font-medium text-ink">{money(i.salePrice * i.qty)}</td>
                  <td className="px-2">
                    <button onClick={() => removeItem(i.id)} className="p-2 text-gris hover:text-accent"><Trash2 size={15} strokeWidth={1.5} /></button>
                  </td>
                </tr>
              ))}
              {cart.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-14 text-center text-gris halftone">Escanea un producto para empezar la venta.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Columna derecha: cobro */}
      <div className="card p-6 h-fit lg:sticky lg:top-6 space-y-5">
        <p className="micro">Cobro</p>
        <div>
          <div className="flex justify-between text-sm text-gris">
            <span>Artículos</span>
            <span>{cart.reduce((s, i) => s + i.qty, 0)}</span>
          </div>
          <div className="mt-3 pt-3 border-t border-line">
            <p className="micro mb-1">Total</p>
            <p className="display text-5xl">{money(total)}</p>
          </div>
        </div>

        {/* Método de pago */}
        <div>
          <label className="label">Método de pago</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setMetodoPago('EFECTIVO')}
              className={`!px-2 ${metodoPago === 'EFECTIVO' ? 'btn-primary' : 'btn-secondary !border-line !text-gris hover:!bg-white hover:!border-brand hover:!text-brand'}`}
            >
              <Banknote size={15} strokeWidth={1.5} /> Efectivo
            </button>
            <button
              type="button"
              onClick={() => setMetodoPago('QR')}
              className={`!px-2 ${metodoPago === 'QR' ? 'btn-primary' : 'btn-secondary !border-line !text-gris hover:!bg-white hover:!border-brand hover:!text-brand'}`}
            >
              <QrCode size={15} strokeWidth={1.5} /> QR
            </button>
            <button
              type="button"
              onClick={() => setMetodoPago('CREDITO')}
              className={`!px-2 ${metodoPago === 'CREDITO' ? 'btn-primary' : 'btn-secondary !border-line !text-gris hover:!bg-white hover:!border-brand hover:!text-brand'}`}
            >
              <NotebookPen size={15} strokeWidth={1.5} /> Fiado
            </button>
          </div>
        </div>

        {metodoPago === 'CREDITO' && (
          <div className="space-y-3">
            <div>
              <label className="label">Cliente</label>
              <div className="flex items-center gap-2">
                <select
                  className="input flex-1"
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                >
                  <option value="">— Elegir cliente —</option>
                  {(clientes || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                      {c.deuda > 0 ? ` (debe ${money(c.deuda)})` : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setNuevoCliente({ nombre: '', telefono: '' })}
                  className="btn-secondary shrink-0 !px-2.5"
                  title="Registrar cliente nuevo"
                >
                  <UserPlus size={14} strokeWidth={1.5} />
                </button>
              </div>
            </div>
            {nuevoCliente && (
              <form onSubmit={crearClienteRapido} className="card p-3 space-y-2 bg-paper">
                <p className="micro">Cliente nuevo</p>
                <input
                  className="input"
                  placeholder="Nombre"
                  value={nuevoCliente.nombre}
                  onChange={(e) => setNuevoCliente((c) => ({ ...c, nombre: e.target.value }))}
                  required
                  autoFocus
                />
                <input
                  className="input"
                  placeholder="Teléfono (opcional)"
                  value={nuevoCliente.telefono}
                  onChange={(e) => setNuevoCliente((c) => ({ ...c, telefono: e.target.value }))}
                />
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setNuevoCliente(null)} className="btn-secondary !py-1 !px-2 !text-[10px]">
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary !py-1 !px-2 !text-[10px]">
                    Guardar
                  </button>
                </div>
              </form>
            )}
            <div>
              <label className="label">Abono inicial (opcional)</label>
              <input
                type="number" step="0.01" min="0" className="input text-lg font-display"
                value={paid} onChange={(e) => setPaid(e.target.value)}
                placeholder="0.00"
              />
              <div className="flex items-baseline justify-between border-t border-line pt-3 mt-3">
                <span className="micro">Queda debiendo</span>
                <span className="display text-2xl text-accent">
                  {money(Math.max(total - (Number(paid) || 0), 0))}
                </span>
              </div>
            </div>
          </div>
        )}

        {metodoPago === 'EFECTIVO' ? (
          <>
            <div>
              <label className="label">Monto recibido</label>
              <input
                type="number" step="0.01" min="0" className="input text-lg font-display"
                value={paid} onChange={(e) => setPaid(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="flex items-baseline justify-between border-t border-line pt-3">
              <span className="micro">Cambio</span>
              <span className={`display text-2xl ${change >= 0 ? 'text-ink' : 'text-gris/50'}`}>
                {money(change >= 0 ? change : 0)}
              </span>
            </div>
          </>
        ) : metodoPago === 'QR' ? (
          <div className="text-center">
            {tienda?.qrPagoUrl ? (
              <>
                <p className="text-sm text-gris mb-2">El cliente escanea para pagar <b className="text-ink">{money(total)}</b></p>
                <img src={tienda.qrPagoUrl} alt="QR de pago" className="mx-auto max-h-56 object-contain rounded-md border border-line p-2 bg-white" />
              </>
            ) : (
              <p className="note-error text-left">
                Aún no subes tu QR de cobro. Ve a <b>Ajustes → QR de cobro</b>.
              </p>
            )}
          </div>
        ) : null}

        <button
          onClick={confirmSale}
          disabled={
            saving ||
            cart.length === 0 ||
            (metodoPago === 'QR' && !tienda?.qrPagoUrl) ||
            (metodoPago === 'CREDITO' && !clienteId)
          }
          className="btn-primary w-full py-3.5"
        >
          {saving
            ? 'Procesando...'
            : metodoPago === 'QR'
              ? 'Confirmar pago recibido'
              : metodoPago === 'CREDITO'
                ? 'Anotar fiado'
                : 'Cobrar'}
        </button>
      </div>

      {/* Escáner por cámara (se carga bajo demanda) */}
      {scannerOpen && (
        <Suspense fallback={null}>
          <BarcodeScanner
            open
            onDetected={lookupAndAdd}
            onClose={() => {
              setScannerOpen(false);
              focusInput();
            }}
          />
        </Suspense>
      )}

      {/* Recibo */}
      <Receipt receipt={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}

function Receipt({ receipt, onClose }) {
  const { tienda } = useAuth();
  if (!receipt) return null;
  return (
    <Modal title="Venta realizada" open={!!receipt} onClose={onClose}>
      <div id="recibo" className="font-mono text-sm text-ink">
        <div className="text-center mb-3">
          {tienda?.logoUrl && (
            <img src={tienda.logoUrl} alt="logo" className="h-12 mx-auto mb-2 object-contain" />
          )}
          <p className="font-bold text-base">{(tienda?.nombre || 'WEB VENTAS').toUpperCase()}</p>
          {tienda?.direccion && <p className="text-xs text-gris">{tienda.direccion}</p>}
          {tienda?.telefono && <p className="text-xs text-gris">Tel: {tienda.telefono}</p>}
          <p className="text-xs text-gris">Recibo de venta #{receipt.id}</p>
          <p className="text-xs text-gris">{new Date(receipt.createdAt).toLocaleString('es-BO')}</p>
          <p className="text-xs text-gris">Atendió: {receipt.user?.name}</p>
        </div>
        <div className="border-y border-dashed border-line py-2 space-y-1">
          {receipt.items.map((it) => (
            <div key={it.id} className="flex justify-between">
              <span>{it.quantity} x {it.product?.name}</span>
              <span>{money(it.subtotal)}</span>
            </div>
          ))}
        </div>
        <div className="pt-2 space-y-1">
          <div className="flex justify-between font-bold text-base"><span>TOTAL</span><span>{money(receipt.total)}</span></div>
          <div className="flex justify-between">
            <span>Pago</span>
            <span>{receipt.metodoPago === 'QR' ? 'QR' : receipt.metodoPago === 'CREDITO' ? 'Fiado' : 'Efectivo'}</span>
          </div>
          {receipt.metodoPago === 'EFECTIVO' && (
            <>
              <div className="flex justify-between"><span>Recibido</span><span>{money(receipt.paid)}</span></div>
              <div className="flex justify-between"><span>Cambio</span><span>{money(receipt.change)}</span></div>
            </>
          )}
          {receipt.metodoPago === 'CREDITO' && (
            <>
              {receipt.cliente && (
                <div className="flex justify-between"><span>Cliente</span><span>{receipt.cliente.nombre}</span></div>
              )}
              <div className="flex justify-between"><span>Abono</span><span>{money(receipt.paid)}</span></div>
              <div className="flex justify-between font-bold"><span>SALDO PENDIENTE</span><span>{money(receipt.saldo)}</span></div>
            </>
          )}
        </div>
        <p className="text-center text-xs text-gris mt-3">
          {tienda?.mensajeRecibo || '¡Gracias por su compra!'}
        </p>
      </div>
      <div className="flex justify-end gap-2 mt-4 print:hidden">
        <button onClick={onClose} className="btn-secondary">Cerrar</button>
        <button onClick={() => window.print()} className="btn-primary"><Printer size={15} strokeWidth={1.5} /> Imprimir</button>
      </div>
    </Modal>
  );
}
