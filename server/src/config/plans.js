// Definición de planes de suscripción y sus límites.
// El cobro es manual por ahora: el SUPERADMIN cambia el plan de la tienda desde
// el panel de plataforma tras confirmar el pago externo. Aquí solo se definen
// los límites y se exponen para mostrarlos y hacerlos cumplir.
//
// `null` en un límite = ilimitado. Precios en bolivianos (Bs) por mes.
export const PLANS = {
  FREE: { nombre: 'Gratis', precio: 0, maxProductos: 50, maxUsuarios: 3 },
  BASIC: { nombre: 'Básico', precio: 99, maxProductos: 1000, maxUsuarios: 10 },
  PRO: { nombre: 'Pro', precio: 249, maxProductos: null, maxUsuarios: null },
};

export function planLimits(plan) {
  return PLANS[plan] || PLANS.FREE;
}

// Lanza si la tienda alcanzó el límite del recurso para su plan.
// `current` es el conteo actual; `kind` es 'productos' | 'usuarios'.
export function assertWithinLimit({ plan, kind, current, HttpError }) {
  const limits = planLimits(plan);
  const max = kind === 'usuarios' ? limits.maxUsuarios : limits.maxProductos;
  if (max != null && current >= max) {
    throw new HttpError(
      403,
      `Alcanzaste el límite de ${max} ${kind} del plan ${limits.nombre}. ` +
        `Mejora tu plan para agregar más.`
    );
  }
}
