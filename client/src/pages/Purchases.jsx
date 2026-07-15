// Entrada de stock: escanear/seleccionar productos, definir cantidad y costo, guardar.
import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { ScanBarcode, Trash2, Save, Camera } from 'lucide-react';
import { api, errorMsg, money } from '../api/client.js';

const BarcodeScanner = lazy(() => import('../components/BarcodeScanner.jsx'));

export default function Purchases() {
  const [code, setCode] = useState('');
  const [lines, setLines] = useState([]); // { id, name, barcode, qty, unitCost }
  const [suppliers, setSuppliers] = useState([]);
  const [supplierId, setSupplierId] = useState('');
  const [note, setNote] = useState('');
  const [updatePrices, setUpdatePrices] = useState(false);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    api.get('/catalog/suppliers').then((r) => setSuppliers(r.data));
    inputRef.current?.focus();
  }, []);

  const total = lines.reduce((s, l) => s + (Number(l.unitCost) || 0) * (Number(l.qty) || 0), 0);

  function flash(type, text) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }

  // Busca por código y agrega (o suma) una línea. La usan el lector y la cámara.
  async function lookupAndAddLine(barcode) {
    const bc = String(barcode).trim();
    if (!bc) return;
    try {
      const { data: p } = await api.get(`/products/barcode/${encodeURIComponent(bc)}`);
      setLines((prev) => {
        const existing = prev.find((l) => l.id === p.id);
        if (existing) return prev.map((l) => (l.id === p.id ? { ...l, qty: l.qty + 1 } : l));
        return [...prev, { id: p.id, name: p.name, barcode: p.barcode, qty: 1, unitCost: p.purchasePrice }];
      });
      flash('ok', `Agregado: ${p.name}`);
    } catch (err) {
      flash('error', err?.response?.status === 404 ? `Producto no registrado (${bc}).` : errorMsg(err));
    }
  }

  async function handleScan(e) {
    e.preventDefault();
    const barcode = code.trim();
    if (!barcode) return;
    setCode('');
    await lookupAndAddLine(barcode);
    inputRef.current?.focus();
  }

  function update(id, field, value) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  }

  async function save() {
    if (lines.length === 0) return flash('error', 'Agrega al menos un producto.');
    setSaving(true);
    try {
      await api.post('/purchases', {
        supplierId: supplierId || null,
        note: note || null,
        updatePrices,
        items: lines.map((l) => ({ productId: l.id, quantity: Number(l.qty), unitCost: Number(l.unitCost) })),
      });
      flash('ok', 'Entrada de stock registrada correctamente. ✅');
      setLines([]);
      setNote('');
    } catch (err) {
      flash('error', errorMsg(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-800">Entrada de stock</h1>

      <form onSubmit={handleScan} className="card p-4 flex items-center gap-3">
        <ScanBarcode className="text-amber-600 shrink-0" size={28} />
        <input
          ref={inputRef}
          className="input"
          placeholder="Escanea o escribe el código de barras del producto que ingresa..."
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button type="submit" className="btn-primary shrink-0">Agregar</button>
        <button
          type="button"
          onClick={() => setScannerOpen(true)}
          className="btn-secondary shrink-0"
          title="Escanear con la cámara"
        >
          <Camera size={18} /> Cámara
        </button>
      </form>

      {scannerOpen && (
        <Suspense fallback={null}>
          <BarcodeScanner
            open
            onDetected={lookupAndAddLine}
            onClose={() => {
              setScannerOpen(false);
              inputRef.current?.focus();
            }}
          />
        </Suspense>
      )}

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
              <th className="px-4 py-3 font-medium text-center">Cantidad</th>
              <th className="px-4 py-3 font-medium text-right">Costo unitario</th>
              <th className="px-4 py-3 font-medium text-right">Subtotal</th>
              <th className="px-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lines.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-700">{l.name}</p>
                  <p className="text-xs text-slate-400 font-mono">{l.barcode}</p>
                </td>
                <td className="px-4 py-3 text-center">
                  <input type="number" min="1" className="input w-20 text-center" value={l.qty} onChange={(e) => update(l.id, 'qty', e.target.value)} />
                </td>
                <td className="px-4 py-3 text-right">
                  <input type="number" min="0" step="0.01" className="input w-28 text-right ml-auto" value={l.unitCost} onChange={(e) => update(l.id, 'unitCost', e.target.value)} />
                </td>
                <td className="px-4 py-3 text-right font-medium">{money((Number(l.unitCost) || 0) * (Number(l.qty) || 0))}</td>
                <td className="px-2">
                  <button onClick={() => setLines((p) => p.filter((x) => x.id !== l.id))} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
            {lines.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-400">Escanea un producto para registrar su ingreso.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Proveedor (opcional)</label>
          <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">— Ninguno —</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Nota (opcional)</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Factura, observaciones..." />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={updatePrices} onChange={(e) => setUpdatePrices(e.target.checked)} />
          Actualizar el precio de compra del producto con el costo ingresado
        </label>
        <div className="flex items-center justify-end gap-4">
          <span className="text-lg font-bold text-slate-800">Total: {money(total)}</span>
          <button onClick={save} disabled={saving || lines.length === 0} className="btn-primary"><Save size={18} /> {saving ? 'Guardando...' : 'Guardar entrada'}</button>
        </div>
      </div>
    </div>
  );
}
