# Pantallas y diseño de interfaz

Estilo: limpio, moderno, tipo POS. Layout con **barra lateral** (navegación filtrada
por rol) y contenido principal. Totalmente **responsive** (escritorio, tablet, celular):
en pantallas pequeñas la barra lateral se convierte en menú deslizable.

## Mapa de pantallas

| Pantalla | Ruta | Acceso | Archivo |
|---|---|---|---|
| Inicio de sesión | `/login` | Público | `client/src/pages/Login.jsx` |
| Inicio / Dashboard | `/` | Todos | `client/src/pages/Dashboard.jsx` |
| Punto de venta | `/pos` | Admin, Cajero | `client/src/pages/POS.jsx` |
| Productos | `/productos` | Admin, Almacén | `client/src/pages/Products.jsx` |
| Entrada de stock | `/compras` | Admin, Almacén | `client/src/pages/Purchases.jsx` |
| Reportes | `/reportes` | Admin | `client/src/pages/Reports.jsx` |
| Usuarios | `/usuarios` | Admin | `client/src/pages/Users.jsx` |

## 1. Login
Tarjeta centrada con logo, usuario y contraseña. Muestra los usuarios de prueba.

## 2. Dashboard
- Saludo al usuario.
- (Admin) Tarjetas con ventas del día, total vendido y ganancia.
- Accesos rápidos según rol.
- **Panel de alertas de stock bajo.**

## 3. Punto de venta (la pantalla principal del cajero)
```
┌─────────────────────────────────────────┬──────────────────┐
│ [🔳] Escanea el código y Enter   [Agregar]│  COBRO           │
├─────────────────────────────────────────┤  Artículos:   3  │
│ Producto      Precio   Cant.    Subtotal │  ───────────────  │
│ Coca-Cola     $15   [- 2 +]      $30     │  TOTAL    $76.00 │
│ Galletas      $16   [- 1 +]      $16     │                  │
│ Arroz         $22   [- 1 +]      $22     │  Recibido [____] │
│                                          │  Cambio    $24.0 │
│                                          │  [Confirmar venta]│
└─────────────────────────────────────────┴──────────────────┘
```
- El campo de código mantiene el **foco automático** para el lector.
- Al escanear: busca el producto y lo añade al carrito; si no existe → "Producto no registrado".
- Valida stock en cada `+`. Calcula total y cambio en vivo.
- Al confirmar: descuenta stock y abre el **recibo** (imprimible con `window.print()`).

## 4. Productos
- Buscador por nombre o código de barras (con debounce).
- Tabla con imagen, código, categoría, precio y stock (badge rojo si está bajo).
- Modal de crear/editar con todos los campos: código, nombre, categoría, precios,
  stock, mínimo, vencimiento, proveedor e imagen (subida de archivo).
- Eliminar = borrado lógico.

## 5. Entrada de stock
- Escanea productos, ajusta cantidad y costo por línea.
- Opción de actualizar el precio de compra del producto.
- Proveedor y nota opcionales. Al guardar, **aumenta el stock** y registra la compra.

## 6. Reportes
- Filtro por rango de fechas (atajo "Hoy").
- Tarjetas: n.º de ventas, unidades, total vendido, ganancia aproximada.
- Tabla de **productos más vendidos** y tabla de **stock actual** con valor de inventario.

## 7. Usuarios
- Lista con rol y estado. Crear usuario (nombre, usuario, contraseña, rol).
- Activar/desactivar.

## Paleta y componentes
- Color de marca: azul `#2563eb`. Acentos: verde (ok), rojo (alerta), ámbar (stock).
- Componentes utilitarios en `client/src/index.css`: `.btn-primary`, `.card`, `.input`, `.badge`, etc.
- Iconos: `lucide-react`.
