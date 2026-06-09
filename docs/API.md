# API REST — Endpoints

Base: `http://localhost:4000/api`. Todas las rutas (excepto login y health) requieren
cabecera `Authorization: Bearer <token>`.

## Autenticación
| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/auth/login` | público | `{ username, password }` → `{ token, user }` |
| GET | `/auth/me` | autenticado | Datos del usuario actual |

## Productos
| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/products?search=&lowStock=&page=&pageSize=` | autenticado | Lista paginada |
| GET | `/products/low-stock` | autenticado | Productos con stock bajo |
| GET | `/products/barcode/:code` | autenticado | Búsqueda exacta (escáner). 404 = no registrado |
| GET | `/products/:id` | autenticado | Detalle |
| POST | `/products` | admin, almacén | Crear |
| PUT | `/products/:id` | admin, almacén | Editar / actualizar precio y datos |
| DELETE | `/products/:id` | admin | Borrado lógico |

## Ventas
| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/sales` | admin, cajero | `{ items:[{productId,quantity}], paid }` → recibo. Descuenta stock |
| GET | `/sales?from=&to=` | autenticado | Historial |
| GET | `/sales/:id` | autenticado | Recibo |

## Compras / entrada de stock
| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/purchases` | admin, almacén | `{ supplierId?, note?, updatePrices?, items:[{productId,quantity,unitCost}] }`. Aumenta stock |
| GET | `/purchases` | autenticado | Historial |

## Reportes (solo admin)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/reports/summary?from=&to=` | N.º de ventas, unidades, total y ganancia |
| GET | `/reports/top-products?from=&to=&limit=` | Más vendidos |
| GET | `/reports/stock` | Stock actual y valor de inventario |
| GET | `/reports/low-stock` | Productos con bajo stock |

## Usuarios (solo admin)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/users` | Lista |
| POST | `/users` | `{ name, username, password, role }` |
| PUT | `/users/:id` | Editar nombre/rol/activo/contraseña |
| DELETE | `/users/:id` | Desactivar |

## Catálogo
| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/catalog/categories` | autenticado | Lista de categorías |
| POST | `/catalog/categories` | admin, almacén | Crear categoría |
| GET | `/catalog/suppliers` | autenticado | Lista de proveedores |
| POST | `/catalog/suppliers` | admin, almacén | Crear proveedor |
| POST | `/catalog/upload` | admin, almacén | Subir imagen (form-data `image`) → `{ url }` |

## Códigos de error
- `400` datos inválidos / stock insuficiente / pago insuficiente.
- `401` no autenticado o token expirado.
- `403` rol sin permiso.
- `404` recurso o producto no encontrado.
- `409` valor único duplicado (p. ej. código de barras repetido).
