# Estructura de la base de datos

Motor: **PostgreSQL**. Definición real en [`server/prisma/schema.prisma`](../server/prisma/schema.prisma).

## Diagrama de relaciones

```
                ┌───────────┐
                │   User    │  (roles: ADMIN / CAJERO / ALMACEN)
                └─────┬─────┘
        ┌─────────────┼───────────────┐
        │ vende       │ compra        │ registra movimientos
        ▼             ▼               ▼
   ┌────────┐   ┌──────────┐   ┌───────────────┐
   │  Sale  │   │ Purchase │   │ StockMovement │
   └───┬────┘   └────┬─────┘   └───────┬───────┘
       │ items       │ items           │
       ▼             ▼                 │
 ┌──────────┐  ┌──────────────┐        │
 │ SaleItem │  │ PurchaseItem │        │
 └────┬─────┘  └──────┬───────┘        │
      └──────┬────────┴────────────────┘
             ▼
        ┌─────────┐     ┌──────────┐     ┌──────────┐
        │ Product │────▶│ Category │     │ Supplier │
        └─────────┘     └──────────┘     └────┬─────┘
             └────────────────────────────────┘
```

## Tablas

### `User` — usuarios del sistema
| Campo | Tipo | Notas |
|---|---|---|
| id | int (PK) | |
| name | string | Nombre para mostrar |
| username | string (único) | Para iniciar sesión |
| password | string | Hash bcrypt (nunca se guarda en texto plano) |
| role | enum | `ADMIN`, `CAJERO`, `ALMACEN` |
| active | bool | Borrado lógico |

### `Category` — categorías de producto
`id`, `name` (único).

### `Supplier` — proveedores
`id`, `name`, `phone?`, `email?`, `address?`.

### `Product` — catálogo (registrado una sola vez)
| Campo | Tipo | Notas |
|---|---|---|
| id | int (PK) | |
| barcode | string (único) | **Código de barras** |
| name | string | Nombre del producto |
| categoryId | int? | FK → Category |
| purchasePrice | decimal(12,2) | Precio de compra |
| salePrice | decimal(12,2) | Precio de venta |
| stock | int | Cantidad en existencia |
| minStock | int | Umbral de alerta de stock bajo |
| expiryDate | date? | Fecha de vencimiento (opcional) |
| supplierId | int? | FK → Supplier (opcional) |
| imageUrl | string? | Imagen (opcional) |
| active | bool | Borrado lógico |

### `Sale` / `SaleItem` — ventas y su detalle
- `Sale`: `userId`, `total`, `paid` (recibido), `change` (cambio), `createdAt`.
- `SaleItem`: `productId`, `quantity`, `unitPrice`, `unitCost` (para calcular ganancia), `subtotal`.

> `unitPrice` y `unitCost` se copian al momento de la venta, así el reporte de
> ganancia no se distorsiona si luego cambian los precios del producto.

### `Purchase` / `PurchaseItem` — entradas de stock
- `Purchase`: `userId`, `supplierId?`, `note?`, `total`, `createdAt`.
- `PurchaseItem`: `productId`, `quantity`, `unitCost`, `subtotal`.

### `StockMovement` — historial de movimientos de stock
| Campo | Notas |
|---|---|
| productId | Producto afectado |
| type | `SALE`, `PURCHASE`, `ADJUSTMENT` |
| quantity | Positivo = entrada, negativo = salida |
| stockAfter | Stock resultante tras el movimiento |
| referenceId | id de la venta o compra que lo originó |
| userId | Quién lo hizo |

Cada venta y cada compra genera automáticamente un registro aquí, de modo que existe
una **bitácora completa y auditable** de cómo cambió el stock de cada producto.

## Decisiones de diseño

- **Borrado lógico** (`active = false`) en productos y usuarios: nunca se borra físico
  para no romper el historial de ventas.
- **Precios como `Decimal(12,2)`**: evita errores de redondeo de los `float`.
- **Transacciones** en ventas y compras: el descuento/aumento de stock y el registro
  ocurren todo-o-nada.
