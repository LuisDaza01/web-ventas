// Módulo de productos: lista, búsqueda por nombre/código, crear, editar y eliminar.
import { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { Plus, Search, Pencil, Trash2, AlertTriangle, Camera } from 'lucide-react';
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
    setModalOpen(true);
  }

  // Crea una categoría al vuelo y la deja seleccionada.
  async function crearCategoria() {
    const name = window.prompt('Nombre de la nueva categoría:');
    if (!name || !name.trim()) return;
    try {
      const { data } = await api.post('/catalog/categories', { name: name.trim() });
      setCategories((cs) => [...cs, data].sort((a, b) => a.name.localeCompare(b.name)));
      setForm((f) => ({ ...f, categoryId: data.id }));
    } catch (err) {
      setError(errorMsg(err));
    }
  }

  // Crea un proveedor (solo nombre) al vuelo y lo deja seleccionado.
  async function crearProveedor() {
    const name = window.prompt('Nombre del nuevo proveedor:');
    if (!name || !name.trim()) return;
    try {
      const { data } = await api.post('/catalog/suppliers', { name: name.trim() });
      setSuppliers((ss) => [...ss, data].sort((a, b) => a.name.localeCompare(b.name)));
      setForm((f) => ({ ...f, supplierId: data.id }));
    } catch (err) {
      setError(errorMsg(err));
    }
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Productos</h1>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={18} /> Nuevo producto
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
        <input
          className="input pl-10"
          placeholder="Buscar por nombre o código de barras..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Producto</th>
                <th className="px-4 py-3 font-medium">Código</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 font-medium text-right">P. venta</th>
                <th className="px-4 py-3 font-medium text-center">Stock</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt="" className="w-9 h-9 rounded object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded bg-slate-100" />
                      )}
                      <span className="font-medium text-slate-700">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{p.barcode}</td>
                  <td className="px-4 py-3 text-slate-500">{p.category?.name || '-'}</td>
                  <td className="px-4 py-3 text-right font-medium">{money(p.salePrice)}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`badge ${
                        p.stock <= p.minStock ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {p.stock <= p.minStock && <AlertTriangle size={12} className="mr-1" />}
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(p)} className="p-2 text-slate-500 hover:text-brand-600">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => handleDelete(p)} className="p-2 text-slate-500 hover:text-red-600">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
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
                <Camera size={18} /> Escanear
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
              <button type="button" onClick={crearCategoria} className="btn-secondary shrink-0" title="Nueva categoría">
                <Plus size={16} />
              </button>
            </div>
          </Field>
          <Field label="Proveedor (opcional)">
            <div className="flex gap-2">
              <select className="input" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
                <option value="">— Ninguno —</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button type="button" onClick={crearProveedor} className="btn-secondary shrink-0" title="Nuevo proveedor">
                <Plus size={16} />
              </button>
            </div>
          </Field>
          <Field label="Precio de compra">
            <input type="number" step="0.01" min="0" className="input" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} />
          </Field>
          <Field label="Precio de venta *">
            <input type="number" step="0.01" min="0" className="input" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} required />
          </Field>
          <Field label="Stock inicial">
            <input type="number" min="0" className="input" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} disabled={!!editingId} />
            {editingId && <p className="text-xs text-slate-400 mt-1">El stock se ajusta desde Entrada de stock o ventas.</p>}
          </Field>
          <Field label="Alerta de stock bajo (mín.)">
            <input type="number" min="0" className="input" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} />
          </Field>
          <Field label="Fecha de vencimiento (opcional)">
            <input type="date" className="input" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
          </Field>
          <Field label="Imagen (opcional)">
            <input type="file" accept="image/*" className="input" onChange={handleImage} />
            {form.imageUrl && <img src={form.imageUrl} alt="" className="mt-2 w-16 h-16 rounded object-cover" />}
          </Field>

          {error && <p className="sm:col-span-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

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

function Field({ label, children, full }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
