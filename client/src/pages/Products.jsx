// Módulo de productos: lista, búsqueda por nombre/código, crear, editar y eliminar.
import { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { Plus, Search, Pencil, Trash2, Camera } from 'lucide-react';
import { api, errorMsg, money } from '../api/client.js';
import { useConfirm } from '../context/ConfirmContext.jsx';
import Modal from '../components/Modal.jsx';

const BarcodeScanner = lazy(() => import('../components/BarcodeScanner.jsx'));

const EMPTY = {
  barcode: '', name: '', categoryId: '', purchasePrice: '', salePrice: '',
  stock: 0, minStock: 5, expiryDate: '', supplierId: '', imageUrl: '',
};

export default function Products() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const confirm = useConfirm();
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  const load = useCallback(async () => {
    const { data } = await api.get('/products', { params: { search, pageSize: 100 } });
    setItems(data.items);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 250); // debounce de búsqueda
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    api.get('/catalog/categories').then((r) => setCategories(r.data));
    api.get('/catalog/suppliers').then((r) => setSuppliers(r.data));
  }, []);

  function openCreate() {
    setForm(EMPTY);
    setEditingId(null);
    setError('');
    setQuick(null);
    setModalOpen(true);
  }

  function openEdit(p) {
    setForm({
      barcode: p.barcode, name: p.name, categoryId: p.categoryId || '',
      purchasePrice: p.purchasePrice, salePrice: p.salePrice, stock: p.stock,
      minStock: p.minStock, supplierId: p.supplierId || '', imageUrl: p.imageUrl || '',
      expiryDate: p.expiryDate ? p.expiryDate.slice(0, 10) : '',
    });
    setEditingId(p.id);
    setError('');
    setQuick(null);
    setModalOpen(true);
  }

  // Alta rápida de categoría/proveedor SIN prompt del navegador: un mini-form
  // integrado que aparece bajo el select. quick = { tipo, nombre } | null.
  const [quick, setQuick] = useState(null);
  const [quickSaving, setQuickSaving] = useState(false);

  async function guardarQuick() {
    const nombre = quick?.nombre?.trim();
    if (!nombre) return;
    setQuickSaving(true);
    setError('');
    try {
      if (quick.tipo === 'categoria') {
        const { data } = await api.post('/catalog/categories', { name: nombre });
        setCategories((cs) => [...cs, data].sort((a, b) => a.name.localeCompare(b.name)));
        setForm((f) => ({ ...f, categoryId: data.id }));
      } else {
        const { data } = await api.post('/catalog/suppliers', { name: nombre });
        setSuppliers((ss) => [...ss, data].sort((a, b) => a.name.localeCompare(b.name)));
        setForm((f) => ({ ...f, supplierId: data.id }));
      }
      setQuick(null);
    } catch (err) {
      setError(errorMsg(err));
    } finally {
      setQuickSaving(false);
    }
  }

  // El alta rápida vive dentro del <form> del producto: interceptamos Enter
  // para que guarde la categoría/proveedor y no envíe el producto entero.
  function quickKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      guardarQuick();
    }
    if (e.key === 'Escape') setQuick(null);
  }

  async function handleImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('image', file);
    try {
      const { data } = await api.post('/catalog/upload', fd);
      setForm((f) => ({ ...f, imageUrl: data.url }));
    } catch (err) {
      setError(errorMsg(err));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    // Limpia campos vacíos opcionales antes de enviar.
    const payload = {
      ...form,
      categoryId: form.categoryId || null,
      supplierId: form.supplierId || null,
      expiryDate: form.expiryDate || null,
      imageUrl: form.imageUrl || null,
    };
    try {
      if (editingId) await api.put(`/products/${editingId}`, payload);
      else await api.post('/products', payload);
      setModalOpen(false);
      load();
    } catch (err) {
      setError(errorMsg(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(p) {
    const ok = await confirm({
      title: 'Eliminar producto',
      message: `¿Eliminar "${p.name}"? Se ocultará pero se conserva el historial.`,
      confirmText: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    await api.delete(`/products/${p.id}`);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="micro mb-2">Inventario</p>
          <h1 className="display text-3xl leading-tight">Productos</h1>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={16} strokeWidth={1.5} /> Nuevo producto
        </button>
      </div>

      <div className="flex items-center gap-2 border-b border-line pb-2 max-w-md">
        <Search className="text-gris shrink-0" size={18} strokeWidth={1.5} />
        <input
          className="w-full bg-transparent border-0 text-sm text-ink outline-none placeholder:text-gris/50"
          placeholder="Buscar por nombre o código de barras..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left border-b border-line">
              <tr className="micro">
                <th className="px-5 py-3 font-medium">Producto</th>
                <th className="px-5 py-3 font-medium">Código</th>
                <th className="px-5 py-3 font-medium">Categoría</th>
                <th className="px-5 py-3 font-medium text-right">P. venta</th>
                <th className="px-5 py-3 font-medium text-center">Stock</th>
                <th className="px-5 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((p) => (
                <tr key={p.id} className="hover:bg-paper transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt="" className="w-9 h-9 rounded-sm object-cover border border-line" />
                      ) : (
                        <div className="w-9 h-9 rounded-sm bg-paper halftone border border-line" />
                      )}
                      <span className="font-display font-medium text-ink">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gris font-mono text-xs">{p.barcode}</td>
                  <td className="px-5 py-3 text-gris">{p.category?.name || '—'}</td>
                  <td className="px-5 py-3 text-right font-display font-medium text-ink">{money(p.salePrice)}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`font-display font-medium ${p.stock <= p.minStock ? 'text-accent' : 'text-ink'}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(p)} className="p-2 text-gris hover:text-ink">
                        <Pencil size={15} strokeWidth={1.5} />
                      </button>
                      <button onClick={() => handleDelete(p)} className="p-2 text-gris hover:text-accent">
                        <Trash2 size={15} strokeWidth={1.5} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-gris halftone">
                    No hay productos que coincidan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal title={editingId ? 'Editar producto' : 'Nuevo producto'} open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="max-w-2xl">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Código de barras *" full>
            <div className="flex gap-2">
              <input className="input" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} required autoFocus />
              <button type="button" onClick={() => setScannerOpen(true)} className="btn-secondary shrink-0" title="Escanear con la cámara">
                <Camera size={16} strokeWidth={1.5} /> Escanear
              </button>
            </div>
          </Field>
          <Field label="Nombre *" full>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="Categoría">
            <div className="flex gap-2">
              <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                <option value="">— Sin categoría —</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button
                type="button"
                onClick={() => setQuick({ tipo: 'categoria', nombre: '' })}
                className="btn-secondary shrink-0"
                title="Nueva categoría"
              >
                <Plus size={14} strokeWidth={1.5} />
              </button>
            </div>
            {quick?.tipo === 'categoria' && (
              <QuickCreate
                placeholder="Nombre de la categoría (ej. Bebidas)"
                value={quick.nombre}
                onChange={(nombre) => setQuick((q) => ({ ...q, nombre }))}
                onKeyDown={quickKeyDown}
                onSave={guardarQuick}
                onCancel={() => setQuick(null)}
                saving={quickSaving}
              />
            )}
          </Field>
          <Field label="Proveedor (opcional)">
            <div className="flex gap-2">
              <select className="input" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
                <option value="">— Ninguno —</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button
                type="button"
                onClick={() => setQuick({ tipo: 'proveedor', nombre: '' })}
                className="btn-secondary shrink-0"
                title="Nuevo proveedor"
              >
                <Plus size={14} strokeWidth={1.5} />
              </button>
            </div>
            {quick?.tipo === 'proveedor' && (
              <QuickCreate
                placeholder="Nombre del proveedor (ej. Distribuidora Sur)"
                value={quick.nombre}
                onChange={(nombre) => setQuick((q) => ({ ...q, nombre }))}
                onKeyDown={quickKeyDown}
                onSave={guardarQuick}
                onCancel={() => setQuick(null)}
                saving={quickSaving}
              />
            )}
          </Field>
          <Field label="Precio de compra">
            <input type="number" step="0.01" min="0" className="input" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} />
          </Field>
          <Field label="Precio de venta *">
            <input type="number" step="0.01" min="0" className="input" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} required />
          </Field>
          <Field label="Stock inicial">
            <input type="number" min="0" className="input" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} disabled={!!editingId} />
            {editingId && <p className="text-xs text-gris mt-1">El stock se ajusta desde Entrada de stock o ventas.</p>}
          </Field>
          <Field label="Alerta de stock bajo (mín.)">
            <input type="number" min="0" className="input" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} />
          </Field>
          <Field label="Fecha de vencimiento (opcional)">
            <input type="date" className="input" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
          </Field>
          <Field label="Imagen (opcional)">
            <input type="file" accept="image/*" className="input" onChange={handleImage} />
            {form.imageUrl && <img src={form.imageUrl} alt="" className="mt-2 w-16 h-16 rounded-sm object-cover border border-line" />}
          </Field>

          {error && <p className="sm:col-span-2 note-error">{error}</p>}

          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </Modal>

      {/* Escáner: llena el código de barras (lectura única). */}
      {scannerOpen && (
        <Suspense fallback={null}>
          <BarcodeScanner
            open
            onDetected={(c) => {
              setForm((f) => ({ ...f, barcode: String(c).trim() }));
              setScannerOpen(false);
            }}
            onClose={() => setScannerOpen(false)}
          />
        </Suspense>
      )}
    </div>
  );
}

// Mini-formulario de alta rápida (categoría/proveedor) que aparece bajo el
// select, en lugar del prompt nativo del navegador.
function QuickCreate({ placeholder, value, onChange, onKeyDown, onSave, onCancel, saving }) {
  return (
    <div className="mt-2 p-3 rounded-xl bg-brandSoft/50 border border-brand/20 space-y-2">
      <input
        className="input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        autoFocus
      />
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary !py-1.5 !px-3 !text-xs">
          Cancelar
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !value.trim()}
          className="btn-primary !py-1.5 !px-3 !text-xs"
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children, full }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
