// Suscripción de la tienda: plan actual, uso vs. límites, catálogo de planes y
// solicitudes de cambio de plan (con comprobante de pago) que aprueba el
// SUPERADMIN desde la plataforma.
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { PLANS, planLimits } from '../config/plans.js';

const router = Router();
router.use(authenticate);

// GET /api/subscription -> plan, límites, uso actual y catálogo de planes
router.get(
  '/',
  asyncHandler(async (req, res) => {
    // El SUPERADMIN no pertenece a una tienda.
    if (!req.user.tiendaId) {
      return res.json({ plan: null, planes: PLANS });
    }

    const tienda = await prisma.tienda.findUnique({ where: { id: req.user.tiendaId } });
    const [productos, usuarios] = await Promise.all([
      prisma.product.count({ where: { active: true } }),
      prisma.user.count({ where: { active: true } }),
    ]);

    // Última solicitud de cambio de plan (para mostrar su estado).
    const solicitud = await prisma.solicitudPlan.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      plan: tienda.plan,
      activa: tienda.activa,
      limits: planLimits(tienda.plan),
      uso: { productos, usuarios },
      planes: PLANS,
      solicitud,
    });
  })
);

const solicitudSchema = z.object({
  plan: z.enum(['FREE', 'BASIC', 'PRO']),
  comprobanteUrl: z.string().optional().nullable(),
  nota: z.string().optional().nullable(),
});

// POST /api/subscription/solicitud -> pedir cambio de plan (solo ADMIN).
// Sube el comprobante del pago por QR/transferencia; queda PENDIENTE hasta que
// la plataforma la apruebe.
router.post(
  '/solicitud',
  authorize('ADMIN'),
  asyncHandler(async (req, res) => {
    if (!req.user.tiendaId) throw new HttpError(404, 'No perteneces a una tienda.');
    const data = solicitudSchema.parse(req.body);

    const tienda = await prisma.tienda.findUnique({ where: { id: req.user.tiendaId } });
    if (tienda.plan === data.plan) {
      throw new HttpError(400, 'Ese ya es tu plan actual.');
    }
    const pendiente = await prisma.solicitudPlan.findFirst({
      where: { estado: 'PENDIENTE' },
    });
    if (pendiente) {
      throw new HttpError(400, 'Ya tienes una solicitud pendiente. Espera su revisión.');
    }

    const solicitud = await prisma.solicitudPlan.create({ data });
    res.status(201).json(solicitud);
  })
);

export default router;
