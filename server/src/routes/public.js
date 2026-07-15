// Catálogo público (sin login): los clientes de una tienda ven sus productos
// en /t/:slug y arman su pedido por WhatsApp. Solo se expone si la tienda
// activó `catalogoPublico` en Ajustes.
//
// OJO: estas rutas corren SIN contexto de tienda (no hay JWT), así que la
// extensión de Prisma no filtra nada: aquí el tiendaId se pasa SIEMPRE
// explícito en cada where. Nunca exponer precio de compra ni datos internos.
import { Router } from 'express';
import { prisma } from '../config/db.js';
import { asyncHandler, HttpError, toNumber } from '../utils/http.js';

const router = Router();

// Busca la tienda por slug y valida que su catálogo sea público.
async function tiendaPublica(slug) {
  const tienda = await prisma.tienda.findUnique({ where: { slug: String(slug) } });
  if (!tienda || !tienda.activa || !tienda.catalogoPublico) {
    throw new HttpError(404, 'Catálogo no disponible.');
  }
  return tienda;
}

// GET /api/public/tiendas/:slug -> datos visibles de la tienda
router.get(
  '/tiendas/:slug',
  asyncHandler(async (req, res) => {
    const t = await tiendaPublica(req.params.slug);
    res.json({
      nombre: t.nombre,
      slug: t.slug,
      descripcion: t.descripcion,
      logoUrl: t.logoUrl,
      whatsapp: t.whatsapp,
      simbolo: t.simbolo,
      direccion: t.direccion,
      telefono: t.telefono,
    });
  })
);

// GET /api/public/tiendas/:slug/categories -> categorías con productos activos
router.get(
  '/tiendas/:slug/categories',
  asyncHandler(async (req, res) => {
    const t = await tiendaPublica(req.params.slug);
    const categories = await prisma.category.findMany({
      where: { tiendaId: t.id, products: { some: { active: true } } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    res.json(categories);
  })
);

// GET /api/public/tiendas/:slug/products?search=&categoryId=
router.get(
  '/tiendas/:slug/products',
  asyncHandler(async (req, res) => {
    const t = await tiendaPublica(req.params.slug);
    const { search = '', categoryId } = req.query;

    const where = { tiendaId: t.id, active: true };
    if (search) where.name = { contains: String(search), mode: 'insensitive' };
    if (categoryId) where.categoryId = Number(categoryId);

    const products = await prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        salePrice: true,
        stock: true,
        imageUrl: true,
        category: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
      take: 300,
    });

    res.json(
      products.map((p) => ({
        ...p,
        salePrice: toNumber(p.salePrice),
        // El cliente solo necesita saber si hay o no; el número exacto es interno.
        disponible: p.stock > 0,
        stock: undefined,
      }))
    );
  })
);

export default router;
