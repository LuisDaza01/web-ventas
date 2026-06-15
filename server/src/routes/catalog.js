// Categorías, proveedores y subida de imágenes de productos.
import { Router } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
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
// Con Cloudinary configurado (CLOUDINARY_URL o las CLOUDINARY_* en el entorno),
// las imágenes se guardan ahí: almacenamiento persistente + CDN + optimización
// (se redimensionan y se entregan en WebP/AVIF con calidad automática). Si no
// hay Cloudinary, cae a disco local (útil en desarrollo). OJO: en Railway el
// disco del contenedor es efímero y se borra en cada deploy.
const useCloudinary = Boolean(process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME);

// Si pasan las variables sueltas, configuramos el SDK; si usan CLOUDINARY_URL,
// el SDK la lee solo.
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads');
if (!useCloudinary) fs.mkdirSync(uploadDir, { recursive: true });

const storage = useCloudinary
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, uploadDir),
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${Math.round(performance.now())}${ext}`);
      },
    });

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB (Cloudinary luego la optimiza)
  fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
});

// Sube el buffer a Cloudinary optimizando al vuelo; resuelve con el resultado.
function subirACloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'web-ventas',
        resource_type: 'image',
        // Optimización al subir: limita el tamaño máximo y calidad automática.
        transformation: [{ width: 1200, height: 1200, crop: 'limit' }, { quality: 'auto' }],
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

// POST /api/catalog/upload  -> devuelve la URL pública de la imagen
router.post(
  '/upload',
  authorize('ADMIN', 'ALMACEN'),
  upload.single('image'),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna imagen.' });

    if (useCloudinary) {
      const result = await subirACloudinary(req.file.buffer);
      // URL de entrega optimizada: formato automático (WebP/AVIF) + calidad auto.
      const url = cloudinary.url(result.public_id, {
        secure: true,
        fetch_format: 'auto',
        quality: 'auto',
      });
      return res.status(201).json({ url });
    }

    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  })
);

export default router;
