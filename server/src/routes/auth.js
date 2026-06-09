// Rutas de autenticación: login y datos del usuario actual.
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1, 'Usuario requerido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

// POST /api/auth/login
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { username, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !user.active) throw new HttpError(401, 'Usuario o contraseña incorrectos.');

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new HttpError(401, 'Usuario o contraseña incorrectos.');

    const token = jwt.sign(
      { sub: user.id, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, username: user.username, role: user.role },
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
      select: { id: true, name: true, username: true, role: true, active: true },
    });
    if (!user) throw new HttpError(404, 'Usuario no encontrado.');
    res.json(user);
  })
);

export default router;
