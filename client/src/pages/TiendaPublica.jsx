// Catálogo público de una tienda (/t/:slug): página SIN login donde los
// clientes ven los productos, arman su carrito y envían el pedido por
// WhatsApp. Es el escaparate digital de la tienda.
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Search, Package, Plus, Minus, ShoppingBag, X, MapPin, Phone } from 'lucide-react';
import { api } from '../api/client.js';

// Ícono de WhatsApp (lucide no lo trae).
function WhatsAppIcon({ size = 16 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.1-.198.05-.371-.025-.52-.074-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export default function TiendaPublica() {
  const { slug } = useParams();
  const [tienda, setTienda] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [items, setItems] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoria, setCategoria] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]); // { id, name, salePrice, qty }
  const [carritoAbierto, setCarritoAbierto] = useState(false);

  // Formato de precio con el símbolo de ESTA tienda (no la sesión interna).
  const money = (n) =>
    `${tienda?.simbolo || 'Bs'} ${new Intl.NumberFormat('es-BO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(n) || 0)}`;

  // Datos de la tienda + categorías (una sola vez).
  useEffect(() => {
    Promise.all([
      api.get(`/public/tiendas/${slug}`),
      api.get(`/public/tiendas/${slug}/categories`),
    ])
      .then(([t, c]) => {
        setTienda(t.data);
        setCategorias(c.data);
        document.title = `${t.data.nombre} · Catálogo`;
      })
      .catch(() => setNotFound(true));
  }, [slug]);

  // Productos, con búsqueda (debounce) y filtro por categoría.
  useEffect(() => {
    if (!tienda) return;
    const t = setTimeout(() => {
      setLoading(true);
      api
        .get(`/public/tiendas/${slug}/products`, {
          params: { search, categoryId: categoria || undefined },
        })
        .then((r) => setItems(r.data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [slug, tienda, search, categoria]);

  const total = useMemo(() => cart.reduce((s, i) => s + i.salePrice * i.qty, 0), [cart]);
  const totalItems = useMemo(() => cart.reduce((s, i) => s + i.qty, 0), [cart]);

  function agregar(p) {
    setCart((prev) => {
      const ex = prev.find((i) => i.id === p.id);
      return ex
        ? prev.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i))
        : [...prev, { id: p.id, name: p.name, salePrice: p.salePrice, qty: 1 }];
    });
  }

  function cambiarQty(id, delta) {
    setCart((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, qty: i.qty + delta } : i))
        .filter((i) => i.qty > 0)
    );
  }

  // Arma el mensaje del pedido y abre WhatsApp.
  function pedirPorWhatsApp() {
    const numero = String(tienda.whatsapp || '').replace(/\D/g, '');
    const lineas = cart.map((i) => `• ${i.qty} x ${i.name} — ${money(i.salePrice * i.qty)}`);
    const msg = [
      `Hola *${tienda.nombre}* 👋, quiero hacer este pedido:`,
      '',
      ...lineas,
      '',
      `*Total: ${money(total)}*`,
    ].join('\n');
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper p-6">
        <div className="card p-10 text-center max-w-md">
          <p className="display text-2xl mb-2">Catálogo no disponible</p>
          <p className="text-sm text-gris">
            Esta tienda no existe o su catálogo público está desactivado.
          </p>
        </div>
      </div>
    );
  }
  if (!tienda) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper text-gris">
        Cargando…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper pb-28">
      {/* Cabecera de la tienda */}
      <header className="border-b border-line bg-white">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center gap-4">
          {tienda.logoUrl ? (
            <img
              src={tienda.logoUrl}
              alt={tienda.nombre}
              className="h-14 w-14 object-contain rounded-sm border border-line bg-white"
            />
          ) : (
            <div className="h-14 w-14 rounded-2xl bg-brand flex items-center justify-center text-white font-display font-extrabold text-2xl">
              {tienda.nombre.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <p className="micro">Catálogo</p>
            <h1 className="display text-2xl leading-tight truncate">{tienda.nombre}</h1>
            {tienda.descripcion && (
              <p className="text-sm text-gris truncate">{tienda.descripcion}</p>
            )}
          </div>
        </div>
        {(tienda.direccion || tienda.telefono) && (
          <div className="max-w-5xl mx-auto px-4 pb-4 flex flex-wrap gap-4 text-xs text-gris">
            {tienda.direccion && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={13} strokeWidth={1.5} /> {tienda.direccion}
              </span>
            )}
            {tienda.telefono && (
              <span className="inline-flex items-center gap-1">
                <Phone size={13} strokeWidth={1.5} /> {tienda.telefono}
              </span>
            )}
          </div>
        )}
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {/* Buscador */}
        <div className="flex items-center gap-2 border-b border-line pb-2 max-w-md">
          <Search className="text-gris shrink-0" size={18} strokeWidth={1.5} />
          <input
            className="w-full bg-transparent border-0 text-sm text-ink outline-none placeholder:text-gris/50"
            placeholder="Buscar producto…"
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

        {/* Productos */}
        {loading && items.length === 0 ? (
          <div className="card p-10 text-center text-gris halftone">Cargando productos…</div>
        ) : items.length === 0 ? (
          <div className="card p-10 text-center text-gris halftone">No hay productos.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {items.map((p) => {
              const enCarrito = cart.find((i) => i.id === p.id);
              return (
                <div key={p.id} className="card p-3 flex flex-col">
                  <div className="aspect-square rounded-sm bg-paper halftone mb-3 overflow-hidden flex items-center justify-center">
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <Package className="text-line" size={34} strokeWidth={1} />
                    )}
                  </div>
                  <p className="font-display font-medium text-ink text-sm leading-snug line-clamp-2">
                    {p.name}
                  </p>
                  <div className="mt-auto pt-2 flex items-center justify-between gap-2">
                    <span className="font-display font-semibold text-ink">
                      {money(p.salePrice)}
                    </span>
                    {!p.disponible ? (
                      <span className="badge badge-accent">Agotado</span>
                    ) : enCarrito ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => cambiarQty(p.id, -1)}
                          className="p-1 border border-line rounded-lg text-ink hover:border-brand hover:text-brand"
                        >
                          <Minus size={13} strokeWidth={1.5} />
                        </button>
                        <span className="w-6 text-center text-sm font-medium text-ink">
                          {enCarrito.qty}
                        </span>
                        <button
                          onClick={() => cambiarQty(p.id, 1)}
                          className="p-1 border border-line rounded-lg text-ink hover:border-brand hover:text-brand"
                        >
                          <Plus size={13} strokeWidth={1.5} />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => agregar(p)} className="btn-secondary !px-2.5 !py-1 !text-[10px]">
                        <Plus size={12} strokeWidth={2} /> Agregar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Barra del pedido */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-paper/95 backdrop-blur border-t border-line z-20">
          <div className="max-w-5xl mx-auto flex gap-2">
            <button
              onClick={() => setCarritoAbierto(true)}
              className="btn-secondary shrink-0 !px-4"
              title="Ver pedido"
            >
              <ShoppingBag size={16} strokeWidth={1.5} /> {totalItems}
            </button>
            <button
              onClick={pedirPorWhatsApp}
              disabled={!tienda.whatsapp}
              className="btn-primary flex-1 py-3.5"
            >
              <WhatsAppIcon size={16} /> Pedir por WhatsApp · {money(total)}
            </button>
          </div>
          {!tienda.whatsapp && (
            <p className="max-w-5xl mx-auto text-xs text-gris mt-1.5">
              Esta tienda aún no configuró su WhatsApp; visítala o llámala para pedir.
            </p>
          )}
        </div>
      )}

      {/* Detalle del pedido */}
      {carritoAbierto && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/40">
          <div className="card w-full sm:max-w-md max-h-[80vh] overflow-auto rounded-b-none sm:rounded-md">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h3 className="font-display font-medium text-lg text-ink">Tu pedido</h3>
              <button onClick={() => setCarritoAbierto(false)} className="text-gris hover:text-ink">
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {cart.map((i) => (
                <div key={i.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-ink flex-1 min-w-0 truncate">{i.name}</span>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => cambiarQty(i.id, -1)} className="p-1 border border-line rounded-lg text-ink hover:border-brand hover:text-brand"><Minus size={12} strokeWidth={1.5} /></button>
                    <span className="w-6 text-center font-medium text-ink">{i.qty}</span>
                    <button onClick={() => cambiarQty(i.id, 1)} className="p-1 border border-line rounded-lg text-ink hover:border-brand hover:text-brand"><Plus size={12} strokeWidth={1.5} /></button>
                  </div>
                  <span className="font-display font-medium text-ink w-20 text-right">
                    {money(i.salePrice * i.qty)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between border-t border-line pt-3">
                <span className="micro">Total</span>
                <span className="display text-xl">{money(total)}</span>
              </div>
              <button
                onClick={pedirPorWhatsApp}
                disabled={!tienda.whatsapp}
                className="btn-primary w-full py-3"
              >
                <WhatsAppIcon size={16} /> Enviar pedido por WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="max-w-5xl mx-auto px-4 py-8 text-center text-xs text-gris">
        Catálogo creado con <span className="font-semibold text-ink">Web Ventas</span>
      </footer>
    </div>
  );
}
