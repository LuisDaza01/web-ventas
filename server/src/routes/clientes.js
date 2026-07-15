// Clientes de la tienda y crédito (fiado): deudas por ventas al crédito y
// registro de abonos (pagos parciales).
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { asyncHandler, HttpError, toNumber } from '../utils/http.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, authorize('ADMIN', 'CAJERO'));

const clienteSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  telefono: z.string().optional().nullable(),
  nota: z.string().optional().nullable(),
});

// GET /api/clientes?search= -> lista con la deuda pendiente de cada uno
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { search = '' } = req.query;
    const where = {};
    if (search) {
      where.OR = [
        { nombre: { contains: String(search), mode: 'insensitive' } },
        { telefono: { contains: String(search) } },
      ];
    }
    const clientes = await prisma.cliente.findMany({
      where,
      orderBy: { nombre: 'asc' },
      take: 200,
    });

    // Deuda = suma del saldo pendiente de sus ventas al crédito.
    const deudas = await prisma.sale.groupBy({
      by: ['clienteId'],
      where: { clienteId: { not: null }, saldo: { gt: 0 } },
      _sum: { saldo: true },
    });
    const deudaPor = Object.fromEntries(
      deudas.map((d) => [d.clienteId, toNumber(d._sum.saldo)])
    );

    res.json(clientes.map((c) => ({ ...c, deuda: deudaPor[c.id] || 0 })));
  })
);

// GET /api/clientes/:id -> detalle con ventas al crédito y abonos
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const cliente = await prisma.cliente.findUnique({ where: { id } });
    if (!cliente) throw new HttpError(404, 'Cliente no encontrado.');

    const ventas = await prisma.sale.findMany({
      where: { clienteId: id, metodoPago: 'CREDITO' },
      include: {
        items: { include: { product: { select: { name: true } } } },
        abonos: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const serialized = ventas.map((v) => ({
      ...v,
      total: toNumber(v.total),
      paid: toNumber(v.paid),
      change: toNumber(v.change),
      saldo: toNumber(v.saldo),
      items: v.items.map((it) => ({
        ...it,
        unitPrice: toNumber(it.unitPrice),
        unitCost: undefined,
        subtotal: toNumber(it.subtotal),
      })),
      abonos: v.abonos.map((a) => ({ ...a, monto: toNumber(a.monto) })),
    }));

    const deuda = serialized.reduce((s, v) => s + v.saldo, 0);
    res.json({ ...cliente, deuda, ventas: serialized });
  })
);

// POST /api/clientes -> crear cliente
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = clienteSchema.parse(req.body);
    res.status(201).json(await prisma.cliente.create({ data }));
  })
);

// PUT /api/clientes/:id -> editar cliente
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prisma.cliente.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, 'Cliente no encontrado.');
    const data = clienteSchema.partial().parse(req.body);
    await prisma.cliente.update({ where: { id }, data });
    res.json(await prisma.cliente.findUnique({ where: { id } }));
  })
);

const abonoSchema = z.object({
  monto: z.coerce.number().positive('El monto debe ser mayor a 0'),
  metodoPago: z.enum(['EFECTIVO', 'QR']).default('EFECTIVO'),
  saleId: z.coerce.number().int().positive().optional(), // si falta, se aplica a las deudas más antiguas
});

// POST /api/clientes/:id/abonos -> registrar un pago del cliente.
// Con saleId se abona a esa venta; sin saleId el monto se reparte entre sus
// ventas con saldo, de la más antigua a la más nueva.
router.post(
  '/:id/abonos',
  asyncHandler(async (req, res) => {
    const clienteId = Number(req.params.id);
    const { monto, metodoPago, saleId } = abonoSchema.parse(req.body);

    const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
    if (!cliente) throw new HttpError(404, 'Cliente no encontrado.');

    const result = await prisma.$transaction(async (tx) => {
      const ventas = await tx.sale.findMany({
        where: {
          clienteId,
          saldo: { gt: 0 },
          ...(saleId ? { id: saleId } : {}),
        },
        orderBy: { createdAt: 'asc' },
      });
      if (ventas.length === 0) {
        throw new HttpError(400, 'El cliente no tiene deudas pendientes.');
      }

      const deudaTotal = ventas.reduce((s, v) => s + Number(v.saldo), 0);
      if (monto > deudaTotal + 0.001) {
        throw new HttpError(
          400,
          `El abono (${monto}) supera la deuda pendiente (${deudaTotal.toFixed(2)}).`
        );
      }

      let restante = monto;
      const abonos = [];
      for (const venta of ventas) {
        if (restante <= 0) break;
        const aplicado = Math.min(restante, Number(venta.saldo));
        restante -= aplicado;
        await tx.sale.update({
          where: { id: venta.id },
          data: { saldo: Number(venta.saldo) - aplicado },
        });
        abonos.push(
          await tx.abono.create({
            data: {
              saleId: venta.id,
              clienteId,
              monto: aplicado,
              metodoPago,
              userId: req.user.id,
            },
          })
        );
      }
      return abonos;
    });

    res.status(201).json(result.map((a) => ({ ...a, monto: toNumber(a.monto) })));
  })
);

export default router;
