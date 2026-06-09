// Contexto de autenticación: guarda el usuario/token y expone login/logout.
import { createContext, useContext, useState } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  });
  const [tienda, setTiendaState] = useState(() => {
    const raw = localStorage.getItem('tienda');
    return raw ? JSON.parse(raw) : null;
  });

  // Guarda (y publica) la configuración de la tienda; afecta moneda y recibo.
  function setTienda(t) {
    if (t) localStorage.setItem('tienda', JSON.stringify(t));
    else localStorage.removeItem('tienda');
    setTiendaState(t);
  }

  function persist(data) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    if (data.tienda !== undefined) setTienda(data.tienda);
    return data.user;
  }

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    return persist(data);
  }

  // Alta de una tienda nueva + su primer usuario administrador.
  async function registrar({ tienda, name, email, password }) {
    const { data } = await api.post('/auth/registro', { tienda, name, email, password });
    return persist(data);
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tienda');
    setUser(null);
    setTiendaState(null);
  }

  // Atajos para comprobar permisos en la interfaz.
  const can = {
    sell: ['ADMIN', 'CAJERO'].includes(user?.role),
    manageStock: ['ADMIN', 'ALMACEN'].includes(user?.role),
    admin: user?.role === 'ADMIN',
  };

  return (
    <AuthContext.Provider value={{ user, tienda, setTienda, login, registrar, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
