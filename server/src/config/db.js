// Cliente Prisma multi-tenant.
//
// El aislamiento entre tiendas se centraliza aquí con una extensión de Prisma
// (`$extends`). Cada petición autenticada corre dentro de un contexto
// (AsyncLocalStorage) que guarda el `tiendaId` del usuario. La extensión:
//   - inyecta `tiendaId` en el `where` de lecturas por filtro y en `data` de
//     escrituras;
//   - en `findUnique`/`findUniqueOrThrow` (operaciones por id, donde Prisma
//     IGNORA los campos extra del where) filtra el RESULTADO por tiendaId.
//
// Limitación de Prisma: las extensiones no pueden reescribir `update`/`delete`
// por id a sus variantes filtradas, y Prisma ignora el `tiendaId` extra en su
// where. Por eso esas escrituras se protegen en las rutas con un `findUnique`
// previo (que sí queda aislado) que verifica la pertenencia antes de escribir.
// Regla del proyecto: NUNCA hacer update/delete por id sin ese findUnique.
//
// Sin contexto de tienda (login, registro, tareas de SUPERADMIN) no se filtra:
// esa responsabilidad recae en el código de plataforma, que es explícito.
import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'node:async_hooks';

// Contexto por petición. store = { tiendaId }
export const tenantContext = new AsyncLocalStorage();

// Ejecuta `fn` con el tiendaId fijado para toda la petición.
export function runWithTienda(tiendaId, fn) {
  return tenantContext.run({ tiendaId }, fn);
}

function currentTiendaId() {
  const store = tenantContext.getStore();
  return store ? store.tiendaId : null;
}

// Modelos que pertenecen a una tienda (llevan columna tiendaId).
// SaleItem y PurchaseItem heredan la tienda de su venta/compra (no se filtran).
const TENANT_MODELS = new Set([
  'User',
  'Category',
  'Supplier',
  'Product',
  'Sale',
  'Purchase',
  'StockMovement',
  'Cliente',
  'Abono',
  'CajaSesion',
  'SolicitudPlan',
]);

const base = new PrismaClient({ log: ['warn', 'error'] });

export const prisma = base.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const tiendaId = currentTiendaId();

        // Sin contexto de tienda o modelo no multi-tenant -> no se toca nada.
        if (tiendaId == null || !TENANT_MODELS.has(model)) {
          return query(args);
        }

        switch (operation) {
          // Operaciones por id único: Prisma ignora filtros extra en el where,
          // así que filtramos el resultado por tiendaId. Si la consulta usa
          // `select`, nos aseguramos de incluir tiendaId y luego lo quitamos.
          case 'findUnique':
          case 'findUniqueOrThrow': {
            let injected = false;
            if (args.select && args.select.tiendaId !== true) {
              args.select = { ...args.select, tiendaId: true };
              injected = true;
            }
            const r = await query(args);
            const owned = r && r.tiendaId === tiendaId;
            if (!owned) {
              if (operation === 'findUniqueOrThrow') {
                throw new Error('Registro no encontrado para esta tienda.');
              }
              return null;
            }
            if (injected) delete r.tiendaId;
            return r;
          }

          // Lecturas por filtro: inyectar tiendaId en el where SÍ funciona.
          case 'findFirst':
          case 'findFirstOrThrow':
          case 'findMany':
          case 'count':
          case 'aggregate':
          case 'groupBy':
          case 'updateMany':
          case 'deleteMany':
            args.where = { ...args.where, tiendaId };
            return query(args);

          // Escrituras por id: el where extra se ignora. La protección real es
          // el findUnique de la ruta (ya aislado). Lo inyectamos igualmente.
          case 'update':
          case 'delete':
            args.where = { ...args.where, tiendaId };
            return query(args);

          case 'create':
            args.data = { ...args.data, tiendaId };
            return query(args);

          case 'createMany':
            args.data = Array.isArray(args.data)
              ? args.data.map((d) => ({ ...d, tiendaId }))
              : { ...args.data, tiendaId };
            return query(args);

          case 'upsert':
            args.where = { ...args.where, tiendaId };
            args.create = { ...args.create, tiendaId };
            return query(args);

          default:
            return query(args);
        }
      },
    },
  },
});
