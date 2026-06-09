// Configuración de la tienda actual (solo ADMIN): nombre, moneda, impuesto,
// datos y mensaje del recibo, logo.
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { asyncHandler, HttpError, toNumber } from '../utils/http.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const serialize = (t) =>
  t && { ...t, impuesto: toNumber(t.impuesto) };

// GET /api/tienda -> configuración de la tienda del usuario
router.get(
  '/',
  asyncHandler(async (req, res) => {
    if (!req.user.tiendaId) throw new HttpError(404, 'No perteneces a una tienda.');
    const tienda = await prisma.tienda.findUnique({ where: { id: req.user.tiendaId } });
    res.json(serialize(tienda));
  })
);

const updateSchema = z.object({
  nombre: z.string().min(1).optional(),
  moneda: z.string().min(1).max(8).optional(),
  simbolo: z.string().min(1).max(6).optional(),
  impuesto: z.coerce.number().min(0).max(100).optional(),
  direccion: z.string().optional().nullable(),
  telefono: z.string().optional().nullable(),
  mensajeRecibo: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
});

// PUT /api/tienda -> actualiza la configuración (solo ADMIN)
router.put(
  '/',
  authorize('ADMIN'),
  asyncHandler(async (req, res) => {
    if (!req.user.tiendaId) throw new HttpError(404, 'No perteneces a una tienda.');
    const data = updateSchema.parse(req.body);
    const tienda = await prisma.tienda.update({ where: { id: req.user.tiendaId }, data });
    res.json(serialize(tienda));
  })
);

export default router;
