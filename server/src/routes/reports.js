// Módulo de reportes: ventas del día, por fecha, más vendidos, ganancia y stock.
import { Router } from 'express';
import { prisma } from '../config/db.js';
import { asyncHandler, toNumber } from '../utils/http.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, authorize('ADMIN')); // Solo el administrador ve reportes.

// Interpreta "YYYY-MM-DD" como fecha LOCAL (no UTC), para que el rango coincida
// con el día del usuario. Sin valor, usa la fecha indicada por defecto.
function parseLocalDate(str, fallback) {
  const m = str && /^(\d{4})-(\d{2})-(\d{2})/.exec(String(str));
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(fallback);
}

function rangeFromQuery(query) {
  // Por defecto: el día de hoy.
  const now = new Date();
  const start = parseLocalDate(query.from, now);
  const end = parseLocalDate(query.to, now);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

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
