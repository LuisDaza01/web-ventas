// Punto de entrada del servidor Express.
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import saleRoutes from './routes/sales.js';
import purchaseRoutes from './routes/purchases.js';
import reportRoutes from './routes/reports.js';
import userRoutes from './routes/users.js';
import catalogRoutes from './routes/catalog.js';
import platformRoutes from './routes/platform.js';
import { notFound, errorHandler } from './middleware/error.js';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(
  cors({ origin: process.env.CLIENT_ORIGIN?.split(',') || '*' })
);
app.use(express.json());

// Imágenes subidas, servidas de forma estática.
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Salud del servicio.
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'web-ventas-api' }));

// Rutas de la API.
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/platform', platformRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ API de web-ventas escuchando en http://localhost:${PORT}`);
});
