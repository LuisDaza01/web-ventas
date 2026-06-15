// Módulo de reportes: ventas del día, por fecha, más vendidos, ganancia y stock.
import { Router } from 'express';
import { prisma } from '../config/db.js';
import { asyncHandler, toNumber } from '../utils/http.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, authorize('ADMIN')); // Solo el administrador ve reportes.

// Convierte un parámetro de fecha del query a un instante exacto.
//   - Instante ISO con hora ("2026-06-12T04:00:00.000Z"): se usa tal cual. El
//     cliente ya calculó el límite del día EN SU ZONA LOCAL, así que aquí no
//     hay que adivinar la zona (clave porque el servidor corre en UTC).
//   - Fecha simple "YYYY-MM-DD" o sin valor: respaldo para clientes antiguos;
//     se interpreta como inicio/fin del día en la zona del servidor.
function boundary(value, isEnd, fallback) {
  if (value && String(value).includes('T')) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const m = value && /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(fallback);
  if (isEnd) d.setHours(23, 59, 59, 999);
  else d.setHours(0, 0, 0, 0);
  return d;
}

function rangeFromQuery(query) {
  const now = new Date(); // Por defecto: el día de hoy (zona del servidor).
  return {
    start: boundary(query.from, false, now),
    end: boundary(query.to, true, now),
  };
}

// GET /api/reports/series?from=&to=&tzOffset=  -> ventas y ganancia POR DÍA.
// tzOffset (minutos, como Date.getTimezoneOffset del cliente) permite agrupar
// por el día LOCAL del usuario aunque el servidor corra en UTC.
router.get(
  '/series',
  asyncHandler(async (req, res) => {
    const { start, end } = rangeFromQuery(req.query);
    const tzOffset = Number(req.query.tzOffset) || 0;

    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: start, lte: end } },
      include: { items: true },
    });

    const byDay = new Map();
    for (const s of sales) {
      // Instante desplazado a hora local -> su fecha YYYY-MM-DD es el día local.
      const day = new Date(s.createdAt.getTime() - tzOffset * 60000).toISOString().slice(0, 10);
      let b = byDay.get(day);
      if (!b) {
        b = { day, ventas: 0, ganancia: 0, numeroVentas: 0 };
        byDay.set(day, b);
      }
      b.ventas += Number(s.total);
      b.numeroVentas += 1;
      for (const it of s.items) {
        b.ganancia += (Number(it.unitPrice) - Number(it.unitCost)) * it.quantity;
      }
    }

    const series = [...byDay.values()]
      .map((b) => ({
        day: b.day,
        ventas: Number(b.ventas.toFixed(2)),
        ganancia: Number(b.ganancia.toFixed(2)),
        numeroVentas: b.numeroVentas,
      }))
      .sort((a, b) => a.day.localeCompare(b.day));

    res.json(series);
  })
);

// GET /api/reports/summary?from=&to=  -> resumen de ventas y ganancia del rango
router.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const { start, end } = rangeFromQuery(req.query);

    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: start, lte: end } },
      include: { items: true },
    });

    let totalVentas = 0;
    let ganancia = 0;
    let unidades = 0;
    for (const s of sales) {
      totalVentas += Number(s.total);
      for (const it of s.items) {
        unidades += it.quantity;
        ganancia += (Number(it.unitPrice) - Number(it.unitCost)) * it.quantity;
      }
    }

    res.json({
      from: start,
      to: end,
      numeroVentas: sales.length,
      unidadesVendidas: unidades,
      totalVentas: Number(totalVentas.toFixed(2)),
      gananciaAproximada: Number(ganancia.toFixed(2)),
    });
  })
);

// GET /api/reports/top-products?from=&to=&limit=10  -> productos más vendidos
router.get(
  '/top-products',
  asyncHandler(async (req, res) => {
    const { start, end } = rangeFromQuery(req.query);
    const limit = Math.min(Number(req.query.limit) || 10, 50);

    const grouped = await prisma.saleItem.groupBy({
      by: ['productId'],
      where: { sale: { createdAt: { gte: start, lte: end } } },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });

    const products = await prisma.product.findMany({
      where: { id: { in: grouped.map((g) => g.productId) } },
      select: { id: true, name: true, barcode: true },
    });
    const byId = Object.fromEntries(products.map((p) => [p.id, p]));

    res.json(
      grouped.map((g) => ({
        productId: g.productId,
        nombre: byId[g.productId]?.name || 'Producto eliminado',
        barcode: byId[g.productId]?.barcode || '',
        unidades: g._sum.quantity || 0,
        ingresos: toNumber(g._sum.subtotal) || 0,
      }))
    );
  })
);

// GET /api/reports/stock  -> stock actual y valor de inventario
router.get(
  '/stock',
  asyncHandler(async (_req, res) => {
    const products = await prisma.product.findMany({
      where: { active: true },
      include: { category: true },
      orderBy: { name: 'asc' },
    });
    const valorInventario = products.reduce(
      (acc, p) => acc + Number(p.purchasePrice) * p.stock,
      0
    );
    res.json({
      valorInventario: Number(valorInventario.toFixed(2)),
      totalProductos: products.length,
      items: products.map((p) => ({
        id: p.id,
        nombre: p.name,
        barcode: p.barcode,
        categoria: p.category?.name || '-',
        stock: p.stock,
        minStock: p.minStock,
        bajoStock: p.stock <= p.minStock,
        precioCompra: toNumber(p.purchasePrice),
        precioVenta: toNumber(p.salePrice),
      })),
    });
  })
);

// GET /api/reports/low-stock  -> productos con bajo stock
router.get(
  '/low-stock',
  asyncHandler(async (_req, res) => {
    const all = await prisma.product.findMany({
      where: { active: true },
      orderBy: { stock: 'asc' },
    });
    res.json(
      all
        .filter((p) => p.stock <= p.minStock)
        .map((p) => ({
          id: p.id,
          nombre: p.name,
          barcode: p.barcode,
          stock: p.stock,
          minStock: p.minStock,
        }))
    );
  })
);

export default router;
