// Panel de plataforma (SUPERADMIN): administra las tiendas y los usuarios del SaaS.
// El SUPERADMIN no tiene tiendaId, así que la extensión de Prisma NO filtra:
// estas rutas ven y administran TODAS las tiendas/usuarios. Tienda no es un
// modelo multi-tenant, por lo que sus consultas nunca se filtran.
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, authorize('SUPERADMIN'));

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

// Campos de usuario que se envían al panel (sin la contraseña).
const userSelect = {
  id: true,
  name: true,
  email: true,
  username: true,
  role: true,
  active: true,
  createdAt: true,
  tiendaId: true,
  tienda: { select: { id: true, nombre: true } },
};

// GET /api/platform/stats  -> resumen de la plataforma
router.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const [tiendas, activas, usuarios, productos] = await Promise.all([
      prisma.tienda.count(),
      prisma.tienda.count({ where: { activa: true } }),
      prisma.user.count({ where: { role: { not: 'SUPERADMIN' } } }),
      prisma.product.count(),
    ]);
    res.json({ tiendas, activas, suspendidas: tiendas - activas, usuarios, productos });
  })
);

// GET /api/platform/tiendas  -> lista de tiendas con uso
router.get(
  '/tiendas',
  asyncHandler(async (_req, res) => {
    const tiendas = await prisma.tienda.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { users: true, products: true, sales: true } },
      },
    });
    res.json(tiendas);
  })
);

const updateSchema = z.object({
  nombre: z.string().min(1).optional(),
  plan: z.enum(['FREE', 'BASIC', 'PRO']).optional(),
  activa: z.boolean().optional(),
});

// PATCH /api/platform/tiendas/:id  -> activar/suspender, cambiar plan o nombre
router.patch(
  '/tiendas/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const data = updateSchema.parse(req.body);
    const exists = await prisma.tienda.findUnique({ where: { id } });
    if (!exists) throw new HttpError(404, 'Tienda no encontrada.');

    const tienda = await prisma.tienda.update({ where: { id }, data });
    res.json(tienda);
  })
);

const crearTiendaSchema = z.object({
  nombre: z.string().min(1, 'El nombre de la tienda es obligatorio'),
  plan: z.enum(['FREE', 'BASIC', 'PRO']).optional(),
  admin: z.object({
    name: z.string().min(1, 'El nombre del administrador es obligatorio'),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  }),
});

// POST /api/platform/tiendas  -> crea una tienda nueva + su primer usuario ADMIN
router.post(
  '/tiendas',
  asyncHandler(async (req, res) => {
    const { nombre, plan, admin } = crearTiendaSchema.parse(req.body);
    const email = admin.email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new HttpError(409, 'Ese email ya está registrado.');

    // slug único: si choca, agrega un sufijo numérico.
    const baseSlug = slugify(nombre) || 'tienda';
    let slug = baseSlug;
    for (let i = 2; await prisma.tienda.findUnique({ where: { slug } }); i++) {
      slug = `${baseSlug}-${i}`;
    }

    const tienda = await prisma.$transaction(async (tx) => {
      const nueva = await tx.tienda.create({
        data: { nombre, slug, ...(plan ? { plan } : {}) },
      });
      await tx.user.create({
        data: {
          name: admin.name,
          email,
          username: email.split('@')[0],
          password: bcrypt.hashSync(admin.password, 10),
          role: 'ADMIN',
          tiendaId: nueva.id,
        },
      });
      return nueva;
    });

    res.status(201).json(tienda);
  })
);

// ---- Gestión global de usuarios (SUPERADMIN) ----

// GET /api/platform/users?tiendaId=  -> usuarios de todas las tiendas
router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const where = { role: { not: 'SUPERADMIN' } };
    if (req.query.tiendaId) where.tiendaId = Number(req.query.tiendaId);
    const users = await prisma.user.findMany({
      where,
      select: userSelect,
      orderBy: [{ tiendaId: 'asc' }, { name: 'asc' }],
    });
    res.json(users);
  })
);

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(['ADMIN', 'CAJERO', 'ALMACEN']).optional(),
  active: z.boolean().optional(),
  password: z.string().min(4, 'La contraseña debe tener al menos 4 caracteres').optional(),
});

// PUT /api/platform/users/:id  -> editar nombre, rol, estado o contraseña
router.put(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, 'Usuario no encontrado.');
    if (existing.role === 'SUPERADMIN') {
      throw new HttpError(403, 'No se puede editar a un superadmin desde aquí.');
    }

    const data = updateUserSchema.parse(req.body);
    if (data.password) data.password = bcrypt.hashSync(data.password, 10);
    await prisma.user.update({ where: { id }, data });
    const user = await prisma.user.findUnique({ where: { id }, select: userSelect });
    res.json(user);
  })
);

// DELETE /api/platform/users/:id  -> da de baja (desactiva, conserva historial)
router.delete(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, 'Usuario no encontrado.');
    if (existing.role === 'SUPERADMIN') {
      throw new HttpError(403, 'No se puede dar de baja a un superadmin.');
    }
    await prisma.user.update({ where: { id }, data: { active: false } });
    res.json({ ok: true });
  })
);

export default router;
