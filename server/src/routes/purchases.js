// Módulo de compras / entrada de stock: registra ingreso de productos y aumenta stock.
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { asyncHandler, HttpError, toNumber } from '../utils/http.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const purchaseSchema = z.object({
  supplierId: z.coerce.number().int().positive().optional().nullable(),
  note: z.string().optional().nullable(),
  // Si updatePrices = true, también actualiza el precio de compra del producto.
  updatePrices: z.boolean().optional().default(false),
  items: z
    .array(
      z.object({
        productId: z.coerce.number().int().positive(),
        quantity: z.coerce.number().int().positive('La cantidad debe ser mayor a 0'),
        unitCost: z.coerce.number().min(0).default(0),
      })
    )
    .min(1, 'Debe registrar al menos un producto'),
});

// POST /api/purchases  (admin o almacén) -> entrada de stock atómica
router.post(
  '/',
  authorize('ADMIN', 'ALMACEN'),
  asyncHandler(async (req, res) => {
    const { supplierId, note, items, updatePrices } = purchaseSchema.parse(req.body);

    const purchase = await prisma.$transaction(async (tx) => {
      let total = 0;
      const lines = [];
      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new HttpError(404, `Producto ID ${item.productId} no existe.`);
        const subtotal = item.unitCost * item.quantity;
        total += subtotal;
        lines.push({ product, item, subtotal });
      }

      const created = await tx.purchase.create({
        data: {
          userId: req.user.id,
          supplierId: supplierId || null,
          note: note || null,
          total,
          items: {
            create: lines.map((l) => ({
              productId: l.product.id,
              quantity: l.item.quantity,
              unitCost: l.item.unitCost,
              subtotal: l.subtotal,
            })),
          },
        },
      });

      for (const l of lines) {
        const stockAfter = l.product.stock + l.item.quantity;
        await tx.product.update({
          where: { id: l.product.id },
          data: {
            stock: stockAfter,
            ...(updatePrices && l.item.unitCost > 0 ? { purchasePrice: l.item.unitCost } : {}),
            ...(supplierId ? { supplierId } : {}),
          },
        });
        await tx.stockMovement.create({
          data: {
            productId: l.product.id,
            type: 'PURCHASE',
            quantity: l.item.quantity,
            stockAfter,
            referenceId: created.id,
            userId: req.user.id,
            note: `Compra #${created.id}`,
          },
        });
      }
      return created;
    });

    const full = await prisma.purchase.findUnique({
      where: { id: purchase.id },
      include: { items: { include: { product: true } }, supplier: true },
    });
    res.status(201).json(serializePurchase(full));
  })
);

// GET /api/purchases -> historial de entradas de stock
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const purchases = await prisma.purchase.findMany({
      include: { supplier: true, user: { select: { name: true } }, _count: { select: { items: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json(purchases.map((p) => ({ ...p, total: toNumber(p.total) })));
  })
);

function serializePurchase(p) {
  return {
    ...p,
    total: toNumber(p.total),
    items: p.items.map((it) => ({
      ...it,
      unitCost: toNumber(it.unitCost),
      subtotal: toNumber(it.subtotal),
    })),
  };
}

export default router;
