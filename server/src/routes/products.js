// Módulo de productos: CRUD, búsqueda por nombre/código y alerta de stock bajo.
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { asyncHandler, HttpError, toNumber } from '../utils/http.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { assertWithinLimit } from '../config/plans.js';

const router = Router();

// Convierte los Decimal a número para la respuesta JSON.
const serialize = (p) =>
  p && {
    ...p,
    purchasePrice: toNumber(p.purchasePrice),
    salePrice: toNumber(p.salePrice),
  };

const productSchema = z.object({
  barcode: z.string().min(1, 'El código de barras es obligatorio'),
  name: z.string().min(1, 'El nombre es obligatorio'),
  categoryId: z.coerce.number().int().positive().optional().nullable(),
  purchasePrice: z.coerce.number().min(0).default(0),
  salePrice: z.coerce.number().min(0).default(0),
  stock: z.coerce.number().int().min(0).default(0),
  minStock: z.coerce.number().int().min(0).default(5),
  expiryDate: z.coerce.date().optional().nullable(),
  supplierId: z.coerce.number().int().positive().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
});

// Todas las rutas requieren sesión.
router.use(authenticate);

// GET /api/products?search=&lowStock=true&page=1&pageSize=20
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { search = '', lowStock, page = '1', pageSize = '20', categoryId } = req.query;
    const take = Math.min(Number(pageSize) || 20, 100);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    const where = { active: true };
    if (categoryId) where.categoryId = Number(categoryId);
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { barcode: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    let items = await prisma.product.findMany({
      where,
      include: { category: true, supplier: true },
      orderBy: { name: 'asc' },
      skip,
      take,
    });

    // Filtro de stock bajo (stock <= minStock). Se aplica en memoria porque
    // Prisma no compara dos columnas directamente en el where.
    if (lowStock === 'true') items = items.filter((p) => p.stock <= p.minStock);

    const total = await prisma.product.count({ where });
    res.json({ items: items.map(serialize), total, page: Number(page), pageSize: take });
  })
);

// GET /api/products/low-stock  -> productos con stock <= minStock
router.get(
  '/low-stock',
  asyncHandler(async (_req, res) => {
    const all = await prisma.product.findMany({
      where: { active: true },
      include: { category: true },
      orderBy: { stock: 'asc' },
    });
    res.json(all.filter((p) => p.stock <= p.minStock).map(serialize));
  })
);

// GET /api/products/barcode/:code  -> búsqueda exacta para el escáner
router.get(
  '/barcode/:code',
  asyncHandler(async (req, res) => {
    // barcode es único POR TIENDA (no global), así que se busca con findFirst;
    // la extensión inyecta el tiendaId del contexto.
    const product = await prisma.product.findFirst({
      where: { barcode: req.params.code.trim() },
      include: { category: true, supplier: true },
    });
    if (!product || !product.active) {
      throw new HttpError(404, 'Producto no registrado.');
    }
    res.json(serialize(product));
  })
);

// GET /api/products/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({
      where: { id: Number(req.params.id) },
      include: { category: true, supplier: true },
    });
    if (!product) throw new HttpError(404, 'Producto no encontrado.');
    res.json(serialize(product));
  })
);

// POST /api/products  (admin o almacén)
router.post(
  '/',
  authorize('ADMIN', 'ALMACEN'),
  asyncHandler(async (req, res) => {
    const data = productSchema.parse(req.body);

    // Límite del plan de la tienda.
    const tienda = await prisma.tienda.findUnique({ where: { id: req.user.tiendaId } });
    const current = await prisma.product.count({ where: { active: true } });
    assertWithinLimit({ plan: tienda?.plan, kind: 'productos', current, HttpError });

    const product = await prisma.product.create({ data });
    res.status(201).json(serialize(product));
  })
);

// PUT /api/products/:id  (admin o almacén)
router.put(
  '/:id',
  authorize('ADMIN', 'ALMACEN'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    // Verificar pertenencia a la tienda antes de actualizar (findUnique aislado).
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, 'Producto no encontrado.');

    const data = productSchema.partial().parse(req.body);
    await prisma.product.update({ where: { id }, data });
    // update -> updateMany devuelve { count }; recargamos el registro.
    const product = await prisma.product.findUnique({ where: { id } });
    res.json(serialize(product));
  })
);

// DELETE /api/products/:id  (admin) -> borrado lógico para conservar historial
router.delete(
  '/:id',
  authorize('ADMIN'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, 'Producto no encontrado.');

    await prisma.product.update({ where: { id }, data: { active: false } });
    res.json({ ok: true });
  })
);

export default router;
