// Middleware central de manejo de errores.
import { HttpError } from '../utils/http.js';

export function notFound(_req, res) {
  res.status(404).json({ error: 'Ruta no encontrada.' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  // Errores de validación de Zod
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Datos inválidos.',
      details: err.errors?.map((e) => ({ campo: e.path.join('.'), mensaje: e.message })),
    });
  }

  // Violación de restricción única de Prisma (p. ej. código de barras repetido)
  if (err.code === 'P2002') {
    const field = err.meta?.target?.join(', ') || 'campo único';
    return res.status(409).json({ error: `Ya existe un registro con ese ${field}.` });
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }

  console.error('Error no controlado:', err);
  res.status(500).json({ error: 'Error interno del servidor.' });
}
