# Plan: Arquitectura SaaS multi-tienda (multi-tenant)

> Objetivo: convertir Web Ventas de "una sola tienda" a un **SaaS** donde muchos
> negocios independientes usan la misma instalación, cada uno ve solo sus datos,
> y se pueda cobrar una suscripción.

## 1. Estrategia de aislamiento elegida

**Una sola base de datos, esquema compartido, columna discriminadora `tiendaId`.**

Cada fila de las tablas de negocio lleva un `tiendaId` que indica a qué tienda
pertenece. Todas las consultas se filtran por ese `tiendaId`.

| Estrategia | Aislamiento | Costo/operación | Veredicto |
| --- | --- | --- | --- |
| **BD compartida + `tiendaId`** | Lógico (por código) | Bajo: una sola BD | ✅ **Elegido** — ideal para muchos negocios pequeños |
| Esquema por tienda | Medio | Medio | ❌ complejidad innecesaria al inicio |
| BD por tienda | Físico (máximo) | Alto (N bases) | ❌ sobre-ingeniería para esta etapa |

**Regla de oro de seguridad:** una tienda **jamás** debe poder leer ni modificar
datos de otra. Esto se garantiza centralizando el filtro `tiendaId` (ver §4),
no confiando en que cada consulta lo recuerde.

## 2. Cambios al modelo de datos (Prisma)

### Nueva entidad raíz
```prisma
model Tienda {
  id        Int      @id @default(autoincrement())
  nombre    String
  slug      String   @unique          // identificador para URL / login
  plan      Plan     @default(FREE)   // suscripción
  activa    Boolean  @default(true)
  // futuros: moneda, logoUrl, impuesto %, datos de facturación
  createdAt DateTime @default(now())

  users      User[]
  categories Category[]
  suppliers  Supplier[]
  products   Product[]
  sales      Sale[]
  purchases  Purchase[]
  movements  StockMovement[]
}

enum Plan { FREE BASIC PRO }
```

### Agregar `tiendaId` a TODAS las tablas de negocio
`User`, `Category`, `Supplier`, `Product`, `Sale`, `Purchase`, `StockMovement`:
```prisma
tiendaId Int
tienda   Tienda @relation(fields: [tiendaId], references: [id])
@@index([tiendaId])
```

### Las restricciones únicas pasan a ser **compuestas con `tiendaId`**
Hoy son globales; deben ser únicas *por tienda*:
- `Product.barcode`  → `@@unique([tiendaId, barcode])`
- `Category.name`    → `@@unique([tiendaId, name])`
- `User`: el login será por **email global único** (ver §3), así que
  `email String @unique` global; `username` deja de ser la llave de login.

### Rol de plataforma
Agregar `SUPERADMIN` al enum `Role`. El superadmin es el dueño de la plataforma
(tú): administra tiendas y no pertenece a ninguna (`tiendaId` nullable solo para
este rol, o se maneja con una bandera `esSuperadmin`).

## 3. Autenticación y registro

### Login por email global
- Hoy se entra con `username`. En SaaS dos tiendas distintas pueden tener un
  "admin", así que el identificador de login pasa a ser el **email** (único en
  toda la plataforma). El `tiendaId` se deduce del usuario encontrado.
- El **JWT** incluye `tiendaId`:
  ```js
  jwt.sign({ sub: user.id, role: user.role, tiendaId: user.tiendaId, name: user.name }, ...)
  ```
- El middleware `authenticate` adjunta `req.user.tiendaId`.

### Registro de una tienda nueva (alta de cliente)
`POST /api/auth/registro` → en una transacción crea la `Tienda` + su primer
usuario `ADMIN`. Es el "sign up" del SaaS.

## 4. Aislamiento de datos en el backend (lo crítico)

En vez de escribir `where: { tiendaId }` a mano en cada consulta (un olvido = fuga
de datos entre clientes), se centraliza:

**Opción recomendada — Prisma Client Extension + AsyncLocalStorage:**
- Un middleware guarda el `tiendaId` del request en un contexto por petición.
- Una extensión de Prisma inyecta automáticamente `tiendaId` en `where` (lecturas)
  y en `data` (escrituras) de los modelos de negocio.
- Resultado: las rutas (`products.js`, `sales.js`, etc.) casi no cambian; el filtro
  es automático y a prueba de olvidos.

**Opción simple — factory `prismaForTienda(tiendaId)`:**
- Helper que devuelve consultas ya filtradas. Más explícito, algo más de código.

> Recomiendo la extensión: menos superficie de error en lo que es un tema de
> seguridad. El superadmin usa un cliente sin filtro para administrar todas.

## 5. Migración de los datos actuales
La tienda actual (3 usuarios, 8 productos…) se asigna a una **Tienda #1 "Demo"**:
1. Migración Prisma que crea la tabla `Tienda` y las columnas `tiendaId` (nullable).
2. Script: crear Tienda #1 y poner `tiendaId = 1` en todas las filas existentes.
3. Volver `tiendaId` obligatorio (NOT NULL) y agregar índices/uniques compuestos.

## 6. Frontend
- Pantalla de **registro de tienda** (sign up) además del login.
- Login por **email** en vez de usuario.
- (Más adelante) panel de **superadmin** para listar/activar/suspender tiendas.
- (Más adelante) ajustes por tienda: nombre, logo, moneda, impuesto, recibo.

## 7. Suscripción / cobro (fase posterior)
- Campo `plan` y `activa` en `Tienda`; bloquear acceso si `activa = false`.
- Integrar pasarela (Stripe / Mercado Pago) y webhooks para activar/suspender.
- Límites por plan (nº de productos, usuarios, etc.).

## 8. Fases de implementación (orden sugerido)
1. **Modelo + aislamiento** — `Tienda`, `tiendaId`, extensión de Prisma, migrar datos a Tienda #1. *(núcleo)*
2. **Auth** — login por email, `tiendaId` en JWT, endpoint de registro de tienda.
3. **Frontend** — registro + login por email funcionando end-to-end.
4. **Superadmin** — panel para administrar tiendas.
5. **Suscripción** — planes, bloqueo por estado, pasarela de pago.
6. **Personalización por tienda** — logo, moneda, impuestos, recibo.

## Decisiones a confirmar antes de empezar
1. **Login por email global** (recomendado) vs. usuario + nombre de tienda.
2. **Aislamiento por extensión de Prisma** (recomendado) vs. factory explícita.
3. ¿Hacemos la **Fase 1 completa** (toca toda la BD y rutas) o primero una rama de
   prueba para validar el enfoque?
