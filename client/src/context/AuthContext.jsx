// Contexto de autenticación: guarda el usuario/token y expone login/logout.
import { createContext, useContext, useState } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  });

  async function login(username, password) {
    const { data } = await api.post('/auth/login', { username, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }

  // Atajos para comprobar permisos en la interfaz.
  const can = {
    sell: ['ADMIN', 'CAJERO'].includes(user?.role),
    manageStock: ['ADMIN', 'ALMACEN'].includes(user?.role),
    admin: user?.role === 'ADMIN',
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, can }}>{children}</AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
