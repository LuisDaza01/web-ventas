// Pantalla de inicio de sesión.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { errorMsg } from '../api/client.js';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      navigate('/');
    } catch (err) {
      setError(errorMsg(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-paper halftone flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-white border border-line rounded-2xl shadow-lift overflow-hidden">
        {/* Blob de color anclado a la esquina superior derecha */}
        <div
          aria-hidden
          className="absolute -top-14 -right-14 w-40 h-40 bg-brand"
          style={{ borderRadius: '62% 38% 55% 45% / 55% 60% 40% 45%' }}
        />

        <div className="relative p-8 sm:p-10">
          <p className="micro mb-3">Inventario · Punto de venta</p>
          <h1 className="display text-4xl sm:text-5xl leading-[1.05] mb-10">
            Web
            <br />
            Ventas
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                placeholder="tu@correo.com"
              />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && <p className="note-error">{error}</p>}

            <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
              <LogIn size={16} strokeWidth={1.5} /> {loading ? 'Entrando...' : 'Iniciar sesión'}
            </button>
          </form>

          <div className="mt-8 pt-4 border-t border-line">
            <p className="micro mb-1">Cuenta de prueba</p>
            <p className="text-xs text-gris">admin@demo.com / admin123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
