// Módulo de ventas: confirmar venta, descontar stock y consultar historial/recibo.
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { asyncHandler, HttpError, toNumber } from '../utils/http.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const saleSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.coerce.number().int().positive(),
        quantity: z.coerce.number().int().positive('La cantidad debe ser mayor a 0'),
      })
    )
    .min(1, 'La venta debe tener al menos un producto'),
  paid: z.coerce.number().min(0).default(0),
  metodoPago: z.enum(['EFECTIVO', 'QR']).default('EFECTIVO'),
});

// POST /api/sales  (admin o cajero) -> confirma la venta de forma atómica
router.post(
  '/',
  authorize('ADMIN', 'CAJERO'),
  asyncHandler(async (req, res) => {
    const { items, paid, metodoPago } = saleSchema.parse(req.body);

    // Toda la operación va dentro de una transacción: si algo falla, no se
    // descuenta stock ni se guarda la venta a medias.
    const sale = await prisma.$transaction(async (tx) => {
      let total = 0;
      const lineData = [];

      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product || !product.active) {
          throw new HttpError(404, `Producto ID ${item.productId} no existe.`);
        }
        // Validación: no permitir vender más de lo que hay en stock.
        if (product.stock < item.quantity) {
          throw new HttpError(
            400,
            `Stock insuficiente para "${product.name}". Disponible: ${product.stock}, solicitado: ${item.quantity}.`
          );
        }
        const unitPrice = Number(product.salePrice);
        const unitCost = Number(product.purchasePrice);
        const subtotal = unitPrice * item.quantity;
        total += subtotal;
        lineData.push({ product, item, unitPrice, unitCost, subtotal });
      }

      // En pago por QR el cliente paga el monto exacto (sin cambio).
      // En efectivo se valida que el monto recibido alcance.
      const montoPagado = metodoPago === 'QR' ? total : paid;
      if (metodoPago !== 'QR' && paid < total) {
        throw new HttpError(400, `El monto recibido (${paid}) es menor al total (${total}).`);
      }

      const created = await tx.sale.create({
        data: {
          userId: req.user.id,
          total,
          paid: montoPagado,
          change: montoPagado - total,
          metodoPago,
          items: {
            create: lineData.map((l) => ({
              productId: l.product.id,
              quantity: l.item.quantity,
              unitPrice: l.unitPrice,
              unitCost: l.unitCost,
              subtotal: l.subtotal,
            })),
          },
        },
      });

      // Descontar stock y registrar el movimiento de cada producto.
      for (const l of lineData) {
        const stockAfter = l.product.stock - l.item.quantity;
        await tx.product.update({
          where: { id: l.product.id },
          data: { stock: stockAfter },
        });
        await tx.stockMovement.create({
          data: {
            productId: l.product.id,
            type: 'SALE',
            quantity: -l.item.quantity,
            stockAfter,
            referenceId: created.id,
            userId: req.user.id,
            note: `Venta #${created.id}`,
          },
        });
      }

      return created;
    });

    // Devolver la venta completa (recibo).
    const full = await prisma.sale.findUnique({
      where: { id: sale.id },
      include: { items: { include: { product: true } }, user: { select: { name: true } } },
    });
    res.status(201).json(serializeSale(full));
  })
);

// GET /api/sales?from=&to=  -> historial de ventas
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { from, to } = req.query;
    const where = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(String(from));
      if (to) where.createdAt.lte = endOfDay(String(to));
    }
    const sales = await prisma.sale.findMany({
      where,
      include: { user: { select: { name: true } }, _count: { select: { items: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json(
      sales.map((s) => ({
        ...s,
        total: toNumber(s.total),
        paid: toNumber(s.paid),
        change: toNumber(s.change),
      }))
    );
  })
);

// GET /api/sales/:id  -> recibo / comprobante
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const sale = await prisma.sale.findUnique({
      where: { id: Number(req.params.id) },
      include: { items: { include: { product: true } }, user: { select: { name: true } } },
    });
    if (!sale) throw new HttpError(404, 'Venta no encontrada.');
    res.json(serializeSale(sale));
  })
);

function serializeSale(s) {
  return {
    ...s,
    total: toNumber(s.total),
    paid: toNumber(s.paid),
    change: toNumber(s.change),
    items: s.items.map((it) => ({
      ...it,
      unitPrice: toNumber(it.unitPrice),
      unitCost: toNumber(it.unitCost),
      subtotal: toNumber(it.subtotal),
    })),
  };
}

function endOfDay(dateStr) {
  const d = new Date(dateStr);
  d.setHours(23, 59, 59, 999);
  return d;
}

export default router;
