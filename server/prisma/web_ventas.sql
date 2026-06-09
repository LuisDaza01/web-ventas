-- ============================================================
--  Web Ventas — Esquema completo + datos de prueba (PostgreSQL)
--  Equivalente a server/prisma/schema.prisma
--
--  Cómo ejecutarlo:
--    1) Crear la base (una sola vez):
--         createdb -U postgres web_ventas
--    2) Cargar este script:
--         psql -U postgres -d web_ventas -f web_ventas.sql
--    (o abrir el archivo en pgAdmin y ejecutarlo sobre la base web_ventas)
--
--  Usuarios de prueba:
--    admin   / admin123    (ADMIN)
--    cajero  / cajero123    (CAJERO)
--    almacen / almacen123   (ALMACEN)
-- ============================================================

-- Limpieza previa (permite re-ejecutar el script sin errores)
DROP TABLE IF EXISTS "StockMovement" CASCADE;
DROP TABLE IF EXISTS "PurchaseItem"  CASCADE;
DROP TABLE IF EXISTS "Purchase"      CASCADE;
DROP TABLE IF EXISTS "SaleItem"      CASCADE;
DROP TABLE IF EXISTS "Sale"          CASCADE;
DROP TABLE IF EXISTS "Product"       CASCADE;
DROP TABLE IF EXISTS "Supplier"      CASCADE;
DROP TABLE IF EXISTS "Category"      CASCADE;
DROP TABLE IF EXISTS "User"          CASCADE;
DROP TYPE  IF EXISTS "MovementType";
DROP TYPE  IF EXISTS "Role";

-- ---------- Enumeraciones ----------
CREATE TYPE "Role"         AS ENUM ('ADMIN', 'CAJERO', 'ALMACEN');
CREATE TYPE "MovementType" AS ENUM ('SALE', 'PURCHASE', 'ADJUSTMENT');

-- ---------- Usuarios ----------
CREATE TABLE "User" (
    "id"        SERIAL        NOT NULL,
    "name"      TEXT          NOT NULL,
    "username"  TEXT          NOT NULL,
    "password"  TEXT          NOT NULL,
    "role"      "Role"        NOT NULL DEFAULT 'CAJERO',
    "active"    BOOLEAN       NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- ---------- Catálogo ----------
CREATE TABLE "Category" (
    "id"        SERIAL        NOT NULL,
    "name"      TEXT          NOT NULL,
    "createdAt" TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

CREATE TABLE "Supplier" (
    "id"        SERIAL        NOT NULL,
    "name"      TEXT          NOT NULL,
    "phone"     TEXT,
    "email"     TEXT,
    "address"   TEXT,
    "createdAt" TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Product" (
    "id"            SERIAL         NOT NULL,
    "barcode"       TEXT           NOT NULL,
    "name"          TEXT           NOT NULL,
    "categoryId"    INTEGER,
    "purchasePrice" DECIMAL(12,2)  NOT NULL DEFAULT 0,
    "salePrice"     DECIMAL(12,2)  NOT NULL DEFAULT 0,
    "stock"         INTEGER        NOT NULL DEFAULT 0,
    "minStock"      INTEGER        NOT NULL DEFAULT 5,
    "expiryDate"    TIMESTAMP(3),
    "supplierId"    INTEGER,
    "imageUrl"      TEXT,
    "active"        BOOLEAN        NOT NULL DEFAULT true,
    "createdAt"     TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Product_barcode_key" ON "Product"("barcode");
CREATE INDEX "Product_name_idx"       ON "Product"("name");
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- ---------- Ventas ----------
CREATE TABLE "Sale" (
    "id"        SERIAL        NOT NULL,
    "userId"    INTEGER       NOT NULL,
    "total"     DECIMAL(12,2) NOT NULL,
    "paid"      DECIMAL(12,2) NOT NULL,
    "change"    DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Sale_createdAt_idx" ON "Sale"("createdAt");

CREATE TABLE "SaleItem" (
    "id"        SERIAL        NOT NULL,
    "saleId"    INTEGER       NOT NULL,
    "productId" INTEGER       NOT NULL,
    "quantity"  INTEGER       NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "unitCost"  DECIMAL(12,2) NOT NULL DEFAULT 0,
    "subtotal"  DECIMAL(12,2) NOT NULL,
    CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

-- ---------- Compras / Entrada de stock ----------
CREATE TABLE "Purchase" (
    "id"         SERIAL        NOT NULL,
    "userId"     INTEGER       NOT NULL,
    "supplierId" INTEGER,
    "note"       TEXT,
    "total"      DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt"  TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Purchase_createdAt_idx" ON "Purchase"("createdAt");

CREATE TABLE "PurchaseItem" (
    "id"         SERIAL        NOT NULL,
    "purchaseId" INTEGER       NOT NULL,
    "productId"  INTEGER       NOT NULL,
    "quantity"   INTEGER       NOT NULL,
    "unitCost"   DECIMAL(12,2) NOT NULL,
    "subtotal"   DECIMAL(12,2) NOT NULL,
    CONSTRAINT "PurchaseItem_pkey" PRIMARY KEY ("id")
);

-- ---------- Historial de movimientos de stock ----------
CREATE TABLE "StockMovement" (
    "id"          SERIAL         NOT NULL,
    "productId"   INTEGER        NOT NULL,
    "type"        "MovementType" NOT NULL,
    "quantity"    INTEGER        NOT NULL,
    "stockAfter"  INTEGER        NOT NULL,
    "referenceId" INTEGER,
    "note"        TEXT,
    "userId"      INTEGER,
    "createdAt"   TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StockMovement_productId_idx" ON "StockMovement"("productId");
CREATE INDEX "StockMovement_createdAt_idx" ON "StockMovement"("createdAt");

-- ---------- Llaves foráneas ----------
ALTER TABLE "Product"
    ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId")
    REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Product"
    ADD CONSTRAINT "Product_supplierId_fkey" FOREIGN KEY ("supplierId")
    REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Sale"
    ADD CONSTRAINT "Sale_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SaleItem"
    ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId")
    REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SaleItem"
    ADD CONSTRAINT "SaleItem_productId_fkey" FOREIGN KEY ("productId")
    REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Purchase"
    ADD CONSTRAINT "Purchase_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Purchase"
    ADD CONSTRAINT "Purchase_supplierId_fkey" FOREIGN KEY ("supplierId")
    REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PurchaseItem"
    ADD CONSTRAINT "PurchaseItem_purchaseId_fkey" FOREIGN KEY ("purchaseId")
    REFERENCES "Purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseItem"
    ADD CONSTRAINT "PurchaseItem_productId_fkey" FOREIGN KEY ("productId")
    REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StockMovement"
    ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId")
    REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovement"
    ADD CONSTRAINT "StockMovement_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
--  Datos de prueba (equivalente a prisma/seed.js)
-- ============================================================

-- Usuarios (contraseñas con hash bcrypt: admin123 / cajero123 / almacen123)
INSERT INTO "User" ("name", "username", "password", "role") VALUES
  ('Administrador', 'admin',   '$2a$10$PnPv9T7ziH0PjZ3V6ClQE.ikQJflX.sItJSxkZbGAgHbTogO4ABL.', 'ADMIN'),
  ('Cajero Demo',   'cajero',  '$2a$10$5elIoMIF9lqKmPgtyKDKV.qFza7g8zjllJ040r0L3yhFM4G.R9f8O', 'CAJERO'),
  ('Almacén Demo',  'almacen', '$2a$10$VQ417xkxcrGqB29vyIb3kOQKH38xMt.CRoxi3fo0LvOezu9gTCP.6', 'ALMACEN');

-- Categorías
INSERT INTO "Category" ("name") VALUES
  ('Bebidas'),    -- id 1
  ('Snacks'),     -- id 2
  ('Limpieza'),   -- id 3
  ('Lácteos'),    -- id 4
  ('Abarrotes');  -- id 5

-- Proveedor
INSERT INTO "Supplier" ("name", "phone", "email") VALUES
  ('Distribuidora Central', '555-1234', 'ventas@central.com');  -- id 1

-- Productos de ejemplo (código de barras, categoría, precio compra/venta, stock)
INSERT INTO "Product" ("barcode", "name", "categoryId", "purchasePrice", "salePrice", "stock", "minStock", "supplierId") VALUES
  ('7501055300013', 'Coca-Cola 600ml', 1,  8, 15, 40, 5, 1),
  ('7501055363513', 'Agua Mineral 1L', 1,  5, 10, 60, 5, 1),
  ('7622300336738', 'Galletas Oreo',   2,  9, 16, 25, 5, 1),
  ('7501000910014', 'Papas Sabritas',  2, 10, 18,  4, 5, 1),
  ('7501025401016', 'Leche Entera 1L', 4, 18, 26, 30, 5, 1),
  ('7501035910013', 'Detergente 1kg',  3, 25, 40,  3, 5, 1),
  ('7501008042016', 'Arroz 1kg',       5, 14, 22, 50, 5, 1),
  ('7501008013015', 'Azúcar 1kg',      5, 16, 24, 20, 5, 1);
