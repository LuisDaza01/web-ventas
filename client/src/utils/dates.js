// Utilidades de fecha para enviar rangos al servidor SIN ambigüedad de zona
// horaria.
//
// El servidor corre en UTC (Railway), pero la tienda está en otra zona
// (p. ej. Bolivia, UTC−4). Si solo mandáramos "YYYY-MM-DD", el servidor
// interpretaría el día en UTC y las ventas de la tarde/noche aparecerían en el
// día equivocado. Por eso el cliente calcula el inicio/fin del día EN SU HORA
// LOCAL y lo manda como instante ISO (UTC), que el servidor usa tal cual.

// "YYYY-MM-DD" (día local) -> inicio del día (00:00:00 local) como ISO/UTC.
export function dayStartISO(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
}

// "YYYY-MM-DD" (día local) -> fin del día (23:59:59.999 local) como ISO/UTC.
export function dayEndISO(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
}

// Fecha de hoy "YYYY-MM-DD" en hora local.
export function todayStr() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}
