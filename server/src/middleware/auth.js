// Middleware de autenticación (JWT) y autorización por rol.
import jwt from 'jsonwebtoken';
import { HttpError } from '../utils/http.js';

// Verifica el token Bearer y adjunta el usuario a req.user.
export function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new HttpError(401, 'No autenticado: falta el token.'));

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, role: payload.role, name: payload.name };
    next();
  } catch {
    next(new HttpError(401, 'Token inválido o expirado.'));
  }
}

// Restringe el acceso a ciertos roles. Uso: authorize('ADMIN', 'ALMACEN')
export function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(new HttpError(401, 'No autenticado.'));
    if (roles.length && !roles.includes(req.user.role)) {
      return next(new HttpError(403, 'No tienes permiso para esta acción.'));
    }
    next();
  };
}
