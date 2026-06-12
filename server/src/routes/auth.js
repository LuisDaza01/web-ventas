// Rutas de autenticación: login (por email) y usuario actual.
// El alta de tiendas la hace SOLO el SUPERADMIN (ver routes/platform.js); ya no
// hay registro público de tiendas.
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { asyncHandler, HttpError, toNumber } from '../utils/http.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Datos de la tienda que se envían al cliente (incluye personalización).
function tiendaPublic(t) {
  if (!t) return null;
  return {
    id: t.id,
    nombre: t.nombre,
    slug: t.slug,
    moneda: t.moneda,
    simbolo: t.simbolo,
    impuesto: toNumber(t.impuesto),
    logoUrl: t.logoUrl,
    qrPagoUrl: t.qrPagoUrl,
    direccion: t.direccion,
    telefono: t.telefono,
    mensajeRecibo: t.mensajeRecibo,
  };
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, tiendaId: user.tiendaId, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
  );
}

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

// POST /api/auth/login  -> login global por email
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    // Sin contexto de tienda: la búsqueda por email es global.
    const user = await prisma.user.findUnique({
      where: { email },
      include: { tienda: true },
    });
    if (!user || !user.active) throw new HttpError(401, 'Email o contraseña incorrectos.');

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new HttpError(401, 'Email o contraseña incorrectos.');

    // Si pertenece a una tienda, debe estar activa (suscripción al día).
    if (user.tienda && !user.tienda.activa) {
      throw new HttpError(403, 'La tienda está suspendida. Contacta al administrador.');
    }

    const token = signToken(user);
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tiendaId: user.tiendaId,
      },
      tienda: tiendaPublic(user.tienda),
    });
  })
);

// GET /api/auth/me
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        tiendaId: true,
        tienda: {
          select: {
            id: true,
            nombre: true,
            slug: true,
            activa: true,
            moneda: true,
            simbolo: true,
            logoUrl: true,
          },
        },
      },
    });
    if (!user) throw new HttpError(404, 'Usuario no encontrado.');
    res.json(user);
  })
);

export default router;
