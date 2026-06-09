// Cliente Axios central. Agrega el token JWT a cada petición y maneja el 401.
import axios from 'axios';

export const api = axios.create({ baseURL: '/api' });

// Inyecta el token guardado en cada petición.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Si el token expira (401), limpia la sesión y vuelve al login.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Extrae un mensaje de error legible desde la respuesta de la API.
export const errorMsg = (err) =>
  err?.response?.data?.error ||
  err?.response?.data?.details?.[0]?.mensaje ||
  err?.message ||
  'Ocurrió un error inesperado.';

// Formato de moneda.
export const money = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n) || 0);
