// Categorías, proveedores y subida de imágenes de productos.
import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/http.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// ---------- Categorías ----------
router.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    res.json(await prisma.category.findMany({ orderBy: { name: 'asc' } }));
  })
);

router.post(
  '/categories',
  authorize('ADMIN', 'ALMACEN'),
  asyncHandler(async (req, res) => {
    const { name } = z.object({ name: z.string().min(1) }).parse(req.body);
    res.status(201).json(await prisma.category.create({ data: { name } }));
  })
);

// ---------- Proveedores ----------
router.get(
  '/suppliers',
  asyncHandler(async (_req, res) => {
    res.json(await prisma.supplier.findMany({ orderBy: { name: 'asc' } }));
  })
);

router.post(
  '/suppliers',
  authorize('ADMIN', 'ALMACEN'),
  asyncHandler(async (req, res) => {
    const data = z
      .object({
        name: z.string().min(1),
        phone: z.string().optional().nullable(),
        email: z.string().optional().nullable(),
        address: z.string().optional().nullable(),
      })
      .parse(req.body);
    res.status(201).json(await prisma.supplier.create({ data }));
  })
);

// ---------- Subida de imágenes ----------
// La carpeta es configurable con UPLOAD_DIR para apuntar a un volumen persistente
// (en Railway el disco del contenedor es efímero y se borra en cada deploy).
// Debe coincidir con la carpeta que sirve index.js en /uploads.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${Math.round(performance.now())}${ext}`;
    cb(null, unique);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3 MB
  fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
});

// POST /api/catalog/upload  -> devuelve la URL pública de la imagen
router.post(
  '/upload',
  authorize('ADMIN', 'ALMACEN'),
  upload.single('image'),
  (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna imagen.' });
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  }
);

export default router;
