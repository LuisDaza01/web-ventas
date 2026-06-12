// Módulo de usuarios: gestión de cuentas y roles (solo administrador).
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { assertWithinLimit } from '../config/plans.js';

const router = Router();
router.use(authenticate, authorize('ADMIN'));

const select = {
  id: true,
  name: true,
  email: true,
  username: true,
  role: true,
  active: true,
  createdAt: true,
};

// El ADMIN de una tienda solo crea/asigna Cajero o Almacén. El rol ADMIN lo
// asigna únicamente el SUPERADMIN (ver routes/platform.js).
const createSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  email: z.string().email('Email inválido'),
  username: z.string().min(3, 'El usuario debe tener al menos 3 caracteres').optional(),
  password: z.string().min(4, 'La contraseña debe tener al menos 4 caracteres'),
  role: z.enum(['CAJERO', 'ALMACEN']),
});

// GET /api/users
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({ select, orderBy: { name: 'asc' } });
    res.json(users);
  })
);

// POST /api/users
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);

    // Límite del plan de la tienda.
    const tienda = await prisma.tienda.findUnique({ where: { id: req.user.tiendaId } });
    const current = await prisma.user.count({ where: { active: true } });
    assertWithinLimit({ plan: tienda?.plan, kind: 'usuarios', current, HttpError });

    const user = await prisma.user.create({
      data: { ...data, password: await bcrypt.hash(data.password, 10) },
      select,
    });
    res.status(201).json(user);
  })
);

// PUT /api/users/:id  (nombre, rol, activo y opcionalmente contraseña)
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      name: z.string().min(1).optional(),
      role: z.enum(['CAJERO', 'ALMACEN']).optional(),
      active: z.boolean().optional(),
      password: z.string().min(4).optional(),
    });
    const id = Number(req.params.id);
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, 'Usuario no encontrado.');

    const data = schema.parse(req.body);
    if (data.password) data.password = await bcrypt.hash(data.password, 10);
    await prisma.user.update({ where: { id }, data });
    // update -> updateMany devuelve { count }; recargamos el registro.
    const user = await prisma.user.findUnique({ where: { id }, select });
    res.json(user);
  })
);

// DELETE /api/users/:id  -> desactiva (no borra, para conservar historial)
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (id === req.user.id) {
      throw new HttpError(400, 'No puedes desactivar tu propio usuario.');
    }
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, 'Usuario no encontrado.');

    await prisma.user.update({ where: { id }, data: { active: false } });
    res.json({ ok: true });
  })
);

export default router;
