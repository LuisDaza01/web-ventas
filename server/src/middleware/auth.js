// Middleware de autenticación (JWT) y autorización por rol.
import jwt from 'jsonwebtoken';
import { HttpError } from '../utils/http.js';
import { tenantContext } from '../config/db.js';

// Verifica el token Bearer, adjunta el usuario a req.user y activa el contexto
// de tienda (para que la extensión de Prisma aísle los datos). El resto del
// pipeline corre dentro de ese contexto.
export function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new HttpError(401, 'No autenticado: falta el token.'));

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return next(new HttpError(401, 'Token inválido o expirado.'));
  }

  req.user = {
    id: payload.sub,
    role: payload.role,
    tiendaId: payload.tiendaId ?? null,
    name: payload.name,
  };

  // El SUPERADMIN administra la plataforma: corre sin filtro de tienda.
  if (req.user.role === 'SUPERADMIN' || req.user.tiendaId == null) {
    return next();
  }

  // Toda la petición se ejecuta con el tiendaId activo.
  tenantContext.run({ tiendaId: req.user.tiendaId }, () => next());
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
