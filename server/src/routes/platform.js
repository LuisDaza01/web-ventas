// Panel de plataforma (SUPERADMIN): administra las tiendas del SaaS.
// El SUPERADMIN no tiene tiendaId, así que la extensión de Prisma NO filtra:
// estas rutas ven y administran TODAS las tiendas. Tienda no es un modelo
// multi-tenant, por lo que sus consultas nunca se filtran.
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, authorize('SUPERADMIN'));

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

export default router;
