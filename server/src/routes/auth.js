// Rutas de autenticación: registro de tienda, login (por email) y usuario actual.
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

// Convierte un nombre de tienda en un slug único-ish para URL/soporte.
function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);
}

const registroSchema = z.object({
  tienda: z.string().min(1, 'El nombre de la tienda es obligatorio'),
  name: z.string().min(1, 'Tu nombre es obligatorio'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

// POST /api/auth/registro  -> crea una tienda nueva + su primer usuario ADMIN
router.post(
  '/registro',
  asyncHandler(async (req, res) => {
    const { tienda, name, email, password } = registroSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new HttpError(409, 'Ese email ya está registrado.');

    // slug único: si choca, agrega un sufijo numérico.
    const baseSlug = slugify(tienda) || 'tienda';
    let slug = baseSlug;
    for (let i = 2; await prisma.tienda.findUnique({ where: { slug } }); i++) {
      slug = `${baseSlug}-${i}`;
    }

    const result = await prisma.$transaction(async (tx) => {
      const nuevaTienda = await tx.tienda.create({ data: { nombre: tienda, slug } });
      const user = await tx.user.create({
        data: {
          name,
          email,
          username: email.split('@')[0],
          password: bcrypt.hashSync(password, 10),
          role: 'ADMIN',
          tiendaId: nuevaTienda.id,
        },
      });
      return { tienda: nuevaTienda, user };
    });

    const token = signToken(result.user);
    res.status(201).json({
      token,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        tiendaId: result.user.tiendaId,
      },
      tienda: tiendaPublic(result.tienda),
    });
  })
);

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
