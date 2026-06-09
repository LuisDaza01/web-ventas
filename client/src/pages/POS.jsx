// Punto de venta: escanear código de barras, carrito, totales, cambio y recibo.
import { useState, useRef, useEffect } from 'react';
import { ScanBarcode, Trash2, Plus, Minus, CheckCircle2, Printer } from 'lucide-react';
import { api, errorMsg, money } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Modal from '../components/Modal.jsx';

export default function POS() {
  const [code, setCode] = useState('');
  const [cart, setCart] = useState([]); // { id, name, salePrice, stock, qty }
  const [message, setMessage] = useState(null); // { type: 'error'|'ok', text }
  const [paid, setPaid] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  // Mantener el foco en el campo del escáner (el lector USB/Bluetooth "teclea" el código).
  const focusInput = () => inputRef.current?.focus();
  useEffect(() => { focusInput(); }, []);

  const total = cart.reduce((s, i) => s + i.salePrice * i.qty, 0);
  const change = (Number(paid) || 0) - total;

  function flash(type, text) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }

  // Al escanear (Enter) o buscar el código.
  async function handleScan(e) {
    e.preventDefault();
    const barcode = code.trim();
    if (!barcode) return;
    setCode('');
    try {
      const { data: p } = await api.get(`/products/barcode/${encodeURIComponent(barcode)}`);
      addToCart(p);
    } catch (err) {
      flash('error', err?.response?.status === 404 ? `Producto no registrado (${barcode}).` : errorMsg(err));
    }
    focusInput();
  }

  function addToCart(p) {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === p.id);
      const currentQty = existing?.qty || 0;
      if (currentQty + 1 > p.stock) {
        flash('error', `Stock insuficiente de "${p.name}" (disponible: ${p.stock}).`);
        return prev;
      }
      if (existing) {
        return prev.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { id: p.id, name: p.name, salePrice: p.salePrice, stock: p.stock, qty: 1 }];
    });
  }

  function changeQty(id, delta) {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.id !== id) return i;
          const qty = i.qty + delta;
          if (qty > i.stock) {
            flash('error', `Solo hay ${i.stock} en stock de "${i.name}".`);
            return i;
          }
          return { ...i, qty };
        })
        .filter((i) => i.qty > 0)
    );
  }

  function removeItem(id) {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }

  async function confirmSale() {
    if (cart.length === 0) return flash('error', 'El carrito está vacío.');
    if ((Number(paid) || 0) < total) return flash('error', 'El monto recibido es menor al total.');
    setSaving(true);
    try {
      const { data } = await api.post('/sales', {
        items: cart.map((i) => ({ productId: i.id, quantity: i.qty })),
        paid: Number(paid),
      });
      setReceipt(data);
      setCart([]);
      setPaid('');
    } catch (err) {
      flash('error', errorMsg(err));
    } finally {
      setSaving(false);
      focusInput();
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 h-full">
      {/* Columna izquierda: escáner + carrito */}
      <div className="lg:col-span-2 space-y-4">
        <form onSubmit={handleScan} className="card p-4 flex items-center gap-3">
          <ScanBarcode className="text-brand-600 shrink-0" size={28} />
          <input
            ref={inputRef}
            className="input text-lg"
            placeholder="Escanea o escribe el código de barras y presiona Enter"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button type="submit" className="btn-primary shrink-0">Agregar</button>
        </form>

        {message && (
          <div className={`rounded-lg px-4 py-2 text-sm ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {message.text}
          </div>
        )}

        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Producto</th>
                <th className="px-4 py-3 font-medium text-right">Precio</th>
                <th className="px-4 py-3 font-medium text-center">Cantidad</th>
                <th className="px-4 py-3 font-medium text-right">Subtotal</th>
                <th className="px-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cart.map((i) => (
                <tr key={i.id}>
                  <td className="px-4 py-3 font-medium text-slate-700">{i.name}</td>
                  <td className="px-4 py-3 text-right">{money(i.salePrice)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => changeQty(i.id, -1)} className="p-1 rounded bg-slate-100 hover:bg-slate-200"><Minus size={14} /></button>
                      <span className="w-8 text-center font-medium">{i.qty}</span>
                      <button onClick={() => changeQty(i.id, 1)} className="p-1 rounded bg-slate-100 hover:bg-slate-200"><Plus size={14} /></button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{money(i.salePrice * i.qty)}</td>
                  <td className="px-2">
                    <button onClick={() => removeItem(i.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
              {cart.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-400">Escanea un producto para empezar la venta.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Columna derecha: cobro */}
      <div className="card p-5 h-fit lg:sticky lg:top-6 space-y-4">
        <h2 className="font-semibold text-slate-800 text-lg">Cobro</h2>
        <div className="space-y-1 text-sm">
          <Row label="Artículos" value={cart.reduce((s, i) => s + i.qty, 0)} />
          <div className="flex justify-between text-xl font-bold text-slate-800 pt-2 border-t border-slate-200">
            <span>Total</span>
            <span>{money(total)}</span>
          </div>
        </div>

        <div>
          <label className="label">Monto recibido</label>
          <input
            type="number" step="0.01" min="0" className="input text-lg"
            value={paid} onChange={(e) => setPaid(e.target.value)}
            placeholder="0.00"
          />
        </div>

        <div className={`flex justify-between font-semibold rounded-lg px-3 py-2 ${change >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-400'}`}>
          <span>Cambio</span>
          <span>{money(change >= 0 ? change : 0)}</span>
        </div>

        <button onClick={confirmSale} disabled={saving || cart.length === 0} className="btn-primary w-full text-base py-3">
          <CheckCircle2 size={20} /> {saving ? 'Procesando...' : 'Confirmar venta'}
        </button>
      </div>

      {/* Recibo */}
      <Receipt receipt={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-slate-600">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function Receipt({ receipt, onClose }) {
  const { tienda } = useAuth();
  if (!receipt) return null;
  return (
    <Modal title="Venta realizada ✅" open={!!receipt} onClose={onClose}>
      <div id="recibo" className="font-mono text-sm text-slate-700">
        <div className="text-center mb-3">
          {tienda?.logoUrl && (
            <img src={tienda.logoUrl} alt="logo" className="h-12 mx-auto mb-2 object-contain" />
          )}
          <p className="font-bold text-base">{(tienda?.nombre || 'WEB VENTAS').toUpperCase()}</p>
          {tienda?.direccion && <p className="text-xs text-slate-500">{tienda.direccion}</p>}
          {tienda?.telefono && <p className="text-xs text-slate-500">Tel: {tienda.telefono}</p>}
          <p className="text-xs text-slate-500">Recibo de venta #{receipt.id}</p>
          <p className="text-xs text-slate-500">{new Date(receipt.createdAt).toLocaleString('es-BO')}</p>
          <p className="text-xs text-slate-500">Atendió: {receipt.user?.name}</p>
        </div>
        <div className="border-y border-dashed border-slate-300 py-2 space-y-1">
          {receipt.items.map((it) => (
            <div key={it.id} className="flex justify-between">
              <span>{it.quantity} x {it.product?.name}</span>
              <span>{money(it.subtotal)}</span>
            </div>
          ))}
        </div>
        <div className="pt-2 space-y-1">
          <div className="flex justify-between font-bold text-base"><span>TOTAL</span><span>{money(receipt.total)}</span></div>
          <div className="flex justify-between"><span>Recibido</span><span>{money(receipt.paid)}</span></div>
          <div className="flex justify-between"><span>Cambio</span><span>{money(receipt.change)}</span></div>
        </div>
        <p className="text-center text-xs text-slate-400 mt-3">
          {tienda?.mensajeRecibo || '¡Gracias por su compra!'}
        </p>
      </div>
      <div className="flex justify-end gap-2 mt-4 print:hidden">
        <button onClick={onClose} className="btn-secondary">Cerrar</button>
        <button onClick={() => window.print()} className="btn-primary"><Printer size={16} /> Imprimir</button>
      </div>
    </Modal>
  );
}
