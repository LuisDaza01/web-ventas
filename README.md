# Web Ventas — Inventario y Punto de Venta (POS)

Sistema web para una tienda: registro de productos con código de barras, ventas con
escáner, control de stock, compras/entradas, reportes y usuarios con roles.

- **Frontend:** React + Vite + Tailwind CSS (diseño tipo POS, responsive).
- **Backend:** Node.js + Express + Prisma (API REST).
- **Base de datos:** PostgreSQL.
- **Autenticación:** usuario/contraseña con JWT y roles (Administrador, Cajero, Almacén).

```
web-ventas/
├── server/        API (Express + Prisma)
├── client/        Interfaz web (React + Vite)
└── docs/          Esquema de BD, pantallas, arquitectura y lógica
```

---

## 1. Requisitos

- Node.js 18+ (tienes v24 ✅)
- PostgreSQL 17 (ya instalado y corriendo como servicio `postgresql-x64-17`)

## 2. Configurar la base de datos

1. Copia el archivo de ejemplo y pon tu contraseña de PostgreSQL:

   ```powershell
   cd C:\Users\dazaj\web-ventas\server
   Copy-Item .env.example .env
   ```

   Abre `server\.env` y reemplaza `TU_PASSWORD` por la contraseña que pusiste al
   instalar PostgreSQL. Ejemplo:

   ```
   DATABASE_URL="postgresql://postgres:miClave123@localhost:5432/web_ventas?schema=public"
   ```

2. Crea la base de datos `web_ventas` (una sola vez):

   ```powershell
   & "C:\Program Files\PostgreSQL\17\bin\createdb.exe" -U postgres web_ventas
   ```

## 3. Levantar el backend

```powershell
cd C:\Users\dazaj\web-ventas\server
npm install                 # ya ejecutado
npm run prisma:migrate      # crea las tablas
npm run seed                # carga usuarios y productos de prueba
npm run dev                 # API en http://localhost:4000
```

## 4. Levantar el frontend (en otra terminal)

```powershell
cd C:\Users\dazaj\web-ventas\client
npm install                 # ya ejecutado
npm run dev                 # interfaz en http://localhost:5173
```

Abre **http://localhost:5173** en el navegador.

## 5. Usuarios de prueba

| Usuario   | Contraseña   | Rol           | Puede                                   |
| --------- | ------------ | ------------- | --------------------------------------- |
| `admin`   | `admin123`   | Administrador | Todo                                    |
| `cajero`  | `cajero123`  | Cajero        | Solo vender (Punto de venta)            |
| `almacen` | `almacen123` | Almacén       | Registrar productos y entradas de stock |

---

## Lector de código de barras

El lector USB o Bluetooth funciona como un **teclado**: al escanear, "escribe" el
código y presiona Enter. En las pantallas de **Punto de venta** y **Entrada de stock**
el cursor se mantiene en el campo de código, así que basta con escanear para que el
producto se agregue automáticamente. No requiere ninguna librería especial.

## Documentación

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — arquitectura y lógica del sistema.
- [`docs/DATABASE.md`](docs/DATABASE.md) — estructura de la base de datos.
- [`docs/SCREENS.md`](docs/SCREENS.md) — pantallas y diseño de interfaz.
- [`docs/API.md`](docs/API.md) — endpoints de la API.
