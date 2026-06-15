// Catálogo visual: tarjetas de productos (foto, nombre, precio, stock) que se
// tocan para agregar al carrito compartido. El cobro se hace en el Punto de
// venta (mismo carrito).
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, Package } from 'lucide-react';
import { api, money, errorMsg } from '../api/client.js';
import { useCart } from '../context/CartContext.jsx';
import { beep } from '../utils/beep.js';

export default function Catalogo() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const { addItem, totalItems, total } = useCart();
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/products', { params: { search, pageSize: 100 } });
      setItems(data.items);
    } catch (e) {
      setError(errorMsg(e));
    } finally {
      setLoading(false);
    }
  }, [search]);

  // Búsqueda con pequeño retardo para no pedir en cada tecla.
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  function agregar(p) {
    const r = addItem(p);
    beep(r.ok);
    setFlash(r.ok ? `Agregado: ${p.name}` : r.message);
    setTimeout(() => setFlash(''), 1500);
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Catálogo</h1>
      </div>

      {/* Buscador */}
      <div className="card p-3 flex items-center gap-2">
        <Search className="text-slate-400 shrink-0" size={20} />
        <input
          className="input border-0 focus:ring-0 px-0"
          placeholder="Buscar por nombre o código…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      {flash && (
        <div className="text-sm bg-emerald-100 text-emerald-700 rounded-lg px-3 py-2">{flash}</div>
      )}

      {loading && items.length === 0 ? (
        <div className="card p-10 text-center text-slate-400">Cargando productos…</div>
      ) : items.length === 0 ? (
        <div className="card p-10 text-center text-slate-400">No hay productos.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {items.map((p) => {
            const agotado = p.stock <= 0;
            return (
              <button
                key={p.id}
                onClick={() => agregar(p)}
                disabled={agotado}
                className="card p-3 text-left flex flex-col hover:shadow-md hover:border-brand-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                title={agotado ? 'Sin stock' : `Agregar ${p.name}`}
              >
                <div className="aspect-square rounded-lg bg-slate-100 mb-2 overflow-hidden flex items-center justify-center">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <Package className="text-slate-300" size={36} />
                  )}
                </div>
                <p className="font-medium text-slate-700 text-sm leading-snug line-clamp-2">{p.name}</p>
                <div className="mt-auto pt-2 flex items-center justify-between">
                  <span className="font-bold text-brand-600">{money(p.salePrice)}</span>
                  <span className={`badge ${agotado ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {agotado ? 'Sin stock' : p.stock}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Barra de cobro (aparece cuando hay items en el carrito) */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 p-3 bg-white/90 backdrop-blur border-t border-slate-200 z-20">
          <button onClick={() => navigate('/pos')} className="btn-primary w-full text-base py-3">
            <ShoppingCart size={20} /> Cobrar {totalItems} artículo(s) · {money(total)}
          </button>
        </div>
      )}
    </div>
  );
}
