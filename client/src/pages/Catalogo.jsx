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
  const [categorias, setCategorias] = useState([]);
  const [categoria, setCategoria] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const { addItem, totalItems, total } = useCart();
  const navigate = useNavigate();

  // Categorías para el filtro (una sola vez).
  useEffect(() => {
    api.get('/catalog/categories').then((r) => setCategorias(r.data)).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/products', {
        params: { search, pageSize: 100, categoryId: categoria || undefined },
      });
      setItems(data.items);
    } catch (e) {
      setError(errorMsg(e));
    } finally {
      setLoading(false);
    }
  }, [search, categoria]);

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
    <div className="space-y-5 pb-24">
      <div>
        <p className="micro mb-2">Tienda</p>
        <h1 className="display text-3xl leading-tight">Catálogo</h1>
      </div>

      {/* Buscador */}
      <div className="flex items-center gap-2 border-b border-line pb-2 max-w-md">
        <Search className="text-gris shrink-0" size={18} strokeWidth={1.5} />
        <input
          className="w-full bg-transparent border-0 text-sm text-ink outline-none placeholder:text-gris/50"
          placeholder="Buscar por nombre o código…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Filtro por categoría */}
      {categorias.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setCategoria(null)}
            className={`badge cursor-pointer transition-colors ${!categoria ? '!bg-brand !text-white !border-transparent' : 'bg-white hover:border-brand hover:text-brand'}`}
          >
            Todo
          </button>
          {categorias.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoria(c.id === categoria ? null : c.id)}
              className={`badge cursor-pointer transition-colors ${categoria === c.id ? '!bg-brand !text-white !border-transparent' : 'bg-white hover:border-brand hover:text-brand'}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {error && <p className="note-error">{error}</p>}
      {flash && <div className="note-ok">{flash}</div>}

      {loading && items.length === 0 ? (
        <div className="card p-10 text-center text-gris halftone">Cargando productos…</div>
      ) : items.length === 0 ? (
        <div className="card p-10 text-center text-gris halftone">No hay productos.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {items.map((p) => {
            const agotado = p.stock <= 0;
            return (
              <button
                key={p.id}
                onClick={() => agregar(p)}
                disabled={agotado}
                className="card p-3 text-left flex flex-col hover:border-brand hover:shadow-lift transition disabled:opacity-40 disabled:cursor-not-allowed"
                title={agotado ? 'Sin stock' : `Agregar ${p.name}`}
              >
                <div className="aspect-square rounded-sm bg-paper halftone mb-3 overflow-hidden flex items-center justify-center">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <Package className="text-line" size={34} strokeWidth={1} />
                  )}
                </div>
                <p className="font-display font-medium text-ink text-sm leading-snug line-clamp-2">{p.name}</p>
                <div className="mt-auto pt-2 flex items-baseline justify-between">
                  <span className="font-display font-semibold text-ink">{money(p.salePrice)}</span>
                  <span className={`badge ${agotado ? 'badge-accent' : ''}`}>
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
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 p-3 bg-paper/90 backdrop-blur border-t border-line z-20">
          <button onClick={() => navigate('/pos')} className="btn-primary w-full py-3.5">
            <ShoppingCart size={18} strokeWidth={1.5} /> Cobrar {totalItems} artículo(s) · {money(total)}
          </button>
        </div>
      )}
    </div>
  );
}
