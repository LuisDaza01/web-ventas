// Carrito de venta COMPARTIDO entre el Punto de venta (escáner) y el Catálogo
// (tarjetas). Así se puede agregar productos desde cualquiera de los dos y
// cobrar en el POS con el mismo carrito.
//
// Cada item: { id, name, salePrice, stock, qty }. Las operaciones respetan el
// stock disponible y devuelven { ok, message } para que la pantalla muestre el
// aviso/sonido que corresponda.
import { createContext, useContext, useState, useRef, useMemo, useCallback } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  // Espejo síncrono del carrito: permite agregar varios productos seguidos
  // (escaneo rápido) sin leer un estado viejo.
  const cartRef = useRef(cart);
  cartRef.current = cart;

  const commit = useCallback((next) => {
    cartRef.current = next;
    setCart(next);
  }, []);

  // Agrega una unidad del producto (o crea la línea). Respeta el stock.
  const addItem = useCallback((p) => {
    const prev = cartRef.current;
    const existing = prev.find((i) => i.id === p.id);
    const qty = (existing?.qty || 0) + 1;
    if (qty > p.stock) {
      return { ok: false, message: `Stock insuficiente de "${p.name}" (disponible: ${p.stock}).` };
    }
    commit(
      existing
        ? prev.map((i) => (i.id === p.id ? { ...i, qty } : i))
        : [...prev, { id: p.id, name: p.name, salePrice: p.salePrice, stock: p.stock, qty: 1 }]
    );
    return { ok: true };
  }, [commit]);

  const incQty = useCallback((id) => {
    const prev = cartRef.current;
    const item = prev.find((i) => i.id === id);
    if (!item) return { ok: false };
    if (item.qty + 1 > item.stock) {
      return { ok: false, message: `Solo hay ${item.stock} en stock de "${item.name}".` };
    }
    commit(prev.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i)));
    return { ok: true };
  }, [commit]);

  const decQty = useCallback((id) => {
    commit(
      cartRef.current
        .map((i) => (i.id === id ? { ...i, qty: i.qty - 1 } : i))
        .filter((i) => i.qty > 0)
    );
  }, [commit]);

  const removeItem = useCallback((id) => {
    commit(cartRef.current.filter((i) => i.id !== id));
  }, [commit]);

  const clear = useCallback(() => commit([]), [commit]);

  const total = useMemo(() => cart.reduce((s, i) => s + i.salePrice * i.qty, 0), [cart]);
  const totalItems = useMemo(() => cart.reduce((s, i) => s + i.qty, 0), [cart]);

  const value = { cart, addItem, incQty, decQty, removeItem, clear, total, totalItems };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
