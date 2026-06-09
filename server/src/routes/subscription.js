// Suscripción de la tienda: plan actual, uso vs. límites y catálogo de planes.
import { Router } from 'express';
import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/http.js';
import { authenticate } from '../middleware/auth.js';
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

    res.json({
      plan: tienda.plan,
      activa: tienda.activa,
      limits: planLimits(tienda.plan),
      uso: { productos, usuarios },
      planes: PLANS,
    });
  })
);

export default router;
