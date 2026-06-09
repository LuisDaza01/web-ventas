# Arquitectura y lógica del sistema

## Visión general

```
   Navegador (React/Vite :5173)
        │  fetch /api/*  (token JWT en cabecera)
        ▼
   API REST (Express :4000)
        │  Prisma ORM
        ▼
   PostgreSQL (web_ventas)
```

El frontend es una SPA que consume la API REST. La API valida cada petición
(autenticación + rol), aplica reglas de negocio y persiste con Prisma.

## Capas del backend (`server/src`)

- `index.js` — arranque de Express, CORS, archivos estáticos y montaje de rutas.
- `config/db.js` — cliente Prisma único.
- `middleware/auth.js` — `authenticate` (verifica JWT) y `authorize(...roles)`.
- `middleware/error.js` — manejo central de errores (Zod, Prisma, HttpError).
- `routes/*.js` — un módulo por área: auth, products, sales, purchases, reports, users, catalog.
- `utils/http.js` — `HttpError`, `asyncHandler`, conversión de `Decimal`.

## Roles y permisos

| Acción | Admin | Cajero | Almacén |
|---|:---:|:---:|:---:|
| Iniciar sesión | ✓ | ✓ | ✓ |
| Vender (POS) | ✓ | ✓ | |
| Crear/editar productos | ✓ | | ✓ |
| Entrada de stock | ✓ | | ✓ |
| Eliminar producto | ✓ | | |
| Reportes | ✓ | | |
| Gestionar usuarios | ✓ | | |

El control se aplica en **dos niveles**: la interfaz oculta lo que el rol no puede usar,
y la API lo rechaza (`authorize`) aunque alguien llame al endpoint directamente.

## Lógica clave

### Flujo de venta (atómico)
1. El cajero escanea → `GET /api/products/barcode/:code`.
2. Si existe, se agrega al carrito; si no, "Producto no registrado".
3. Al confirmar → `POST /api/sales` con `{ items, paid }`. Dentro de una **transacción**:
   - Por cada ítem: verifica que exista y que `stock >= cantidad` (si no, error y se
     aborta toda la venta).
   - Valida que `paid >= total`.
   - Crea `Sale` + `SaleItem` (guardando precio y costo del momento).
   - Descuenta el stock y crea un `StockMovement` tipo `SALE`.
4. Devuelve la venta completa = **recibo**.

### Flujo de entrada de stock (atómico)
`POST /api/purchases` crea `Purchase` + `PurchaseItem`, **aumenta** el stock y registra
`StockMovement` tipo `PURCHASE`. Opcionalmente actualiza el precio de compra.

### Alerta de stock bajo
Un producto está "bajo" cuando `stock <= minStock`. Se muestra en el Dashboard y como
badge rojo en la lista de productos. Endpoint: `GET /api/products/low-stock`.

### Ganancia aproximada
`Σ (precioVenta − costo) × cantidad` sobre los `SaleItem` del rango. Como el costo se
copia en cada venta, el reporte es fiel aunque cambien los precios después.

## Seguridad
- Contraseñas con **bcrypt**. Tokens **JWT** firmados con `JWT_SECRET` (configurable).
- Validación de entrada con **Zod** en cada endpoint que recibe datos.
- Borrado lógico para no perder historial.

## Decisiones técnicas
- **Prisma**: migraciones versionadas y consultas tipadas; fácil de migrar de PostgreSQL
  a otro motor si hiciera falta.
- **Proxy de Vite**: en desarrollo el frontend llama a rutas relativas (`/api`, `/uploads`)
  y Vite las redirige al backend, evitando configurar CORS manualmente.
- **Decimal** para dinero, **transacciones** para integridad de stock.

## Pasos siguientes sugeridos
- Paginación/virtualización en listas grandes de productos.
- Exportar reportes a PDF/Excel.
- Caja/turnos (apertura y cierre de caja).
- Códigos de barras propios para productos a granel.
