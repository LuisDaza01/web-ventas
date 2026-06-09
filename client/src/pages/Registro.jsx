// Pantalla de registro: crea una tienda nueva + su usuario administrador.
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ScanBarcode, Store } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { errorMsg } from '../api/client.js';

export default function Registro() {
  const { registrar } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ tienda: '', name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await registrar({
        tienda: form.tienda.trim(),
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
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
          <h1 className="text-2xl font-bold text-slate-800">Crea tu tienda</h1>
          <p className="text-sm text-slate-500">Empieza a vender en minutos</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Nombre de la tienda</label>
            <input
              className="input"
              value={form.tienda}
              onChange={set('tienda')}
              autoFocus
              placeholder="Mi Tiendita"
            />
          </div>
          <div>
            <label className="label">Tu nombre</label>
            <input className="input" value={form.name} onChange={set('name')} placeholder="Juan Pérez" />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={set('email')}
              placeholder="tu@correo.com"
            />
          </div>
          <div>
            <label className="label">Contraseña</label>
            <input
              type="password"
              className="input"
              value={form.password}
              onChange={set('password')}
              placeholder="mínimo 6 caracteres"
            />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            <Store size={18} /> {loading ? 'Creando...' : 'Crear mi tienda'}
          </button>
        </form>

        <p className="mt-5 text-sm text-center text-slate-500">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-brand-600 font-medium hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
