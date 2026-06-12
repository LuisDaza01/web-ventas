// Pantalla de inicio de sesión.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanBarcode, LogIn } from 'lucide-react';
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
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="card w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-brand-600 text-white rounded-2xl p-3 mb-3">
            <ScanBarcode size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Web Ventas</h1>
          <p className="text-sm text-slate-500">Inventario y Punto de Venta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            <LogIn size={18} /> {loading ? 'Entrando...' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="mt-6 text-xs text-slate-400 border-t border-slate-100 pt-4">
          <p className="font-medium text-slate-500 mb-1">Cuenta de prueba:</p>
          <p>admin@demo.com / admin123</p>
        </div>
      </div>
    </div>
  );
}
