// Módulo de usuarios: gestión de cuentas y roles (solo administrador).
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, authorize('ADMIN'));

const select = { id: true, name: true, username: true, role: true, active: true, createdAt: true };

const createSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  username: z.string().min(3, 'El usuario debe tener al menos 3 caracteres'),
  password: z.string().min(4, 'La contraseña debe tener al menos 4 caracteres'),
  role: z.enum(['ADMIN', 'CAJERO', 'ALMACEN']),
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
      role: z.enum(['ADMIN', 'CAJERO', 'ALMACEN']).optional(),
      active: z.boolean().optional(),
      password: z.string().min(4).optional(),
    });
    const data = schema.parse(req.body);
    if (data.password) data.password = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data,
      select,
    });
    res.json(user);
  })
);

// DELETE /api/users/:id  -> desactiva (no borra, para conservar historial)
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    if (Number(req.params.id) === req.user.id) {
      throw new HttpError(400, 'No puedes desactivar tu propio usuario.');
    }
    await prisma.user.update({
      where: { id: Number(req.params.id) },
      data: { active: false },
    });
    res.json({ ok: true });
  })
);

export default router;
