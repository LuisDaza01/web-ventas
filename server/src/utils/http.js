// Utilidades para respuestas HTTP y manejo de errores controlados.

// Error de aplicación con código HTTP. Lo capturamos en el middleware de errores.
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Envuelve un controlador async para que los errores lleguen a Express.
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Convierte los Decimal de Prisma a número en las respuestas JSON.
// (Prisma devuelve Decimal como objeto; el frontend espera números.)
export const toNumber = (value) =>
  value === null || value === undefined ? value : Number(value);
