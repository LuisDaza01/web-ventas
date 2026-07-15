// Caja: apertura y cierre de turno con arqueo. El "esperado" se calcula con
// las ventas y abonos registrados entre la apertura y el cierre:
//   esperado = monto inicial + ventas en efectivo + abonos en efectivo
//              + abonos iniciales de ventas al crédito (se cobran en efectivo).
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { asyncHandler, HttpError, toNumber } from '../utils/http.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, authorize('ADMIN', 'CAJERO'));

const serialize = (c) =>
  c && {
    ...c,
    montoInicial: toNumber(c.montoInicial),
    montoFinal: c.montoFinal == null ? null : toNumber(c.montoFinal),
    esperado: c.esperado == null ? null : toNumber(c.esperado),
    diferencia: c.diferencia == null ? null : toNumber(c.diferencia),
  };

// Resumen de ventas/abonos desde la apertura (hasta `hasta` si se pasa).
async function resumenSesion(sesion, hasta = null) {
  const rango = { gte: sesion.openedAt, ...(hasta ? { lte: hasta } : {}) };

  const [ventas, abonos] = await Promise.all([
    prisma.sale.groupBy({
      by: ['metodoPago'],
      where: { createdAt: rango },
      _sum: { total: true, paid: true },
      _count: true,
    }),
    prisma.abono.groupBy({
      by: ['metodoPago'],
      where: { createdAt: rango },
      _sum: { monto: true },
      _count: true,
    }),
  ]);

  const v = Object.fromEntries(
    ventas.map((x) => [
      x.metodoPago,
      { total: toNumber(x._sum.total), paid: toNumber(x._sum.paid), count: x._count },
    ])
  );
  const a = Object.fromEntries(
    abonos.map((x) => [x.metodoPago, { monto: toNumber(x._sum.monto), count: x._count }])
  );

  const efectivoVentas = v.EFECTIVO?.total || 0;
  const qrVentas = v.QR?.total || 0;
  const creditoVentas = v.CREDITO?.total || 0;
  const creditoInicial = v.CREDITO?.paid || 0; // abono inicial de ventas fiadas
  const abonosEfectivo = a.EFECTIVO?.monto || 0;
  const abonosQr = a.QR?.monto || 0;

  return {
    ventasEfectivo: efectivoVentas,
    ventasQr: qrVentas,
    ventasCredito: creditoVentas,
    creditoInicial,
    abonosEfectivo,
    abonosQr,
    numVentas: (v.EFECTIVO?.count || 0) + (v.QR?.count || 0) + (v.CREDITO?.count || 0),
    totalVendido: efectivoVentas + qrVentas + creditoVentas,
    esperadoEfectivo:
      toNumber(sesion.montoInicial) + efectivoVentas + abonosEfectivo + creditoInicial,
  };
}

// GET /api/caja/actual -> sesión abierta de la tienda (o null) + resumen en vivo
router.get(
  '/actual',
  asyncHandler(async (_req, res) => {
    const sesion = await prisma.cajaSesion.findFirst({
      where: { abierta: true },
      include: { user: { select: { name: true } } },
    });
    if (!sesion) return res.json(null);
    const resumen = await resumenSesion(sesion);
    res.json({ ...serialize(sesion), resumen });
  })
);

// POST /api/caja/abrir { montoInicial }
router.post(
  '/abrir',
  asyncHandler(async (req, res) => {
    const { montoInicial } = z
      .object({ montoInicial: z.coerce.number().min(0).default(0) })
      .parse(req.body);

    const abierta = await prisma.cajaSesion.findFirst({ where: { abierta: true } });
    if (abierta) throw new HttpError(400, 'Ya hay una caja abierta. Ciérrala primero.');

    const sesion = await prisma.cajaSesion.create({
      data: { userId: req.user.id, montoInicial },
    });
    res.status(201).json(serialize(sesion));
  })
);

// POST /api/caja/cerrar { montoFinal, nota? } -> arqueo y cierre
router.post(
  '/cerrar',
  asyncHandler(async (req, res) => {
    const { montoFinal, nota } = z
      .object({
        montoFinal: z.coerce.number().min(0),
        nota: z.string().optional().nullable(),
      })
      .parse(req.body);

    const sesion = await prisma.cajaSesion.findFirst({ where: { abierta: true } });
    if (!sesion) throw new HttpError(400, 'No hay ninguna caja abierta.');

    const closedAt = new Date();
    const resumen = await resumenSesion(sesion, closedAt);
    const esperado = resumen.esperadoEfectivo;

    await prisma.cajaSesion.update({
      where: { id: sesion.id },
      data: {
        abierta: false,
        closedAt,
        montoFinal,
        esperado,
        diferencia: montoFinal - esperado,
        nota: nota || null,
      },
    });
    const cerrada = await prisma.cajaSesion.findUnique({
      where: { id: sesion.id },
      include: { user: { select: { name: true } } },
    });
    res.json({ ...serialize(cerrada), resumen });
  })
);

// GET /api/caja -> historial de cierres (solo ADMIN)
router.get(
  '/',
  authorize('ADMIN'),
  asyncHandler(async (_req, res) => {
    const sesiones = await prisma.cajaSesion.findMany({
      include: { user: { select: { name: true } } },
      orderBy: { openedAt: 'desc' },
      take: 60,
    });
    res.json(sesiones.map(serialize));
  })
);

export default router;
