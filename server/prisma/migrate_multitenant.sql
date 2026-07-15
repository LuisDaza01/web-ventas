-- ============================================================
--  MIGRACIÓN: de "una tienda" a MULTI-TIENDA (multi-tenant)
--  Transforma una base `web_ventas` existente (esquema v1) al esquema
--  multi-tienda, metiendo TODOS los datos actuales en una "Tienda #1".
--
--  ⚠️  ESTO MODIFICA TU BASE REAL. Antes de ejecutarlo, HAZ UN RESPALDO:
--      & "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe" -U postgres ^
--        -d web_ventas -F c -f "C:\Users\dazaj\Documents\web_ventas_backup.dump"
--
--  Ejecutar (cuando estés listo para el cambio a producción):
--      $env:PGPASSWORD="7434"
--      & "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres ^
--        -d web_ventas -f "server\prisma\migrate_multitenant.sql"
--
--  Es re-ejecutable (idempotente): usa IF [NOT] EXISTS y guardas.
-- ============================================================

-- 0) Enumeraciones --------------------------------------------------------
-- ADD VALUE no puede USARSE en la misma transacción donde se crea, por eso
-- va fuera del bloque BEGIN/COMMIT (psql lo confirma inmediatamente).
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPERADMIN';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Plan') THEN
    CREATE TYPE "Plan" AS ENUM ('FREE', 'BASIC', 'PRO');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MetodoPago') THEN
    CREATE TYPE "MetodoPago" AS ENUM ('EFECTIVO', 'QR');
  END IF;
END $$;

BEGIN;

-- 1) Tabla Tienda ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Tienda" (
  "id"            SERIAL        PRIMARY KEY,
  "nombre"        TEXT          NOT NULL,
  "slug"          TEXT          NOT NULL,
  "plan"          "Plan"        NOT NULL DEFAULT 'FREE',
  "activa"        BOOLEAN       NOT NULL DEFAULT true,
  "moneda"        TEXT          NOT NULL DEFAULT 'BOB',
  "simbolo"       TEXT          NOT NULL DEFAULT 'Bs',
  "impuesto"      NUMERIC(5,2)  NOT NULL DEFAULT 0,
  "direccion"     TEXT,
  "telefono"      TEXT,
  "mensajeRecibo" TEXT,
  "logoUrl"       TEXT,
  "createdAt"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "Tienda_slug_key" ON "Tienda"("slug");
-- Personalización (por si la tabla Tienda ya existía de una versión previa).
ALTER TABLE "Tienda" ADD COLUMN IF NOT EXISTS "moneda"        TEXT NOT NULL DEFAULT 'BOB';
ALTER TABLE "Tienda" ADD COLUMN IF NOT EXISTS "simbolo"       TEXT NOT NULL DEFAULT 'Bs';
ALTER TABLE "Tienda" ADD COLUMN IF NOT EXISTS "impuesto"      NUMERIC(5,2) NOT NULL DEFAULT 0;
ALTER TABLE "Tienda" ADD COLUMN IF NOT EXISTS "direccion"     TEXT;
ALTER TABLE "Tienda" ADD COLUMN IF NOT EXISTS "telefono"      TEXT;
ALTER TABLE "Tienda" ADD COLUMN IF NOT EXISTS "mensajeRecibo" TEXT;
ALTER TABLE "Tienda" ADD COLUMN IF NOT EXISTS "logoUrl"       TEXT;
ALTER TABLE "Tienda" ADD COLUMN IF NOT EXISTS "qrPagoUrl"     TEXT;

-- Método de pago en las ventas (efectivo por defecto).
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "metodoPago" "MetodoPago" NOT NULL DEFAULT 'EFECTIVO';

-- 2) Crear la Tienda #1 (recibe todos los datos actuales) -----------------
INSERT INTO "Tienda" ("id", "nombre", "slug")
SELECT 1, 'Mi Tienda', 'mi-tienda'
WHERE NOT EXISTS (SELECT 1 FROM "Tienda" WHERE "id" = 1);
-- Mantener la secuencia por encima del id usado.
SELECT setval('"Tienda_id_seq"', GREATEST((SELECT MAX("id") FROM "Tienda"), 1));

-- 3) Usuarios: email (login global) + tiendaId ----------------------------
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tiendaId" INTEGER;
ALTER TABLE "User" ALTER COLUMN "username" DROP NOT NULL;

-- Backfill: email a partir del username (ajústalo luego a emails reales).
UPDATE "User" SET "email" = lower("username") || '@tienda1.local'
WHERE "email" IS NULL;
-- Los usuarios actuales pertenecen a la Tienda #1 (excepto el SUPERADMIN, que
-- no pertenece a ninguna tienda — importante al re-ejecutar la migración).
UPDATE "User" SET "tiendaId" = 1 WHERE "tiendaId" IS NULL AND "role" <> 'SUPERADMIN';

-- 4) tiendaId en las demás tablas de negocio (nullable -> backfill -> NOT NULL)
ALTER TABLE "Category"      ADD COLUMN IF NOT EXISTS "tiendaId" INTEGER;
ALTER TABLE "Supplier"      ADD COLUMN IF NOT EXISTS "tiendaId" INTEGER;
ALTER TABLE "Product"       ADD COLUMN IF NOT EXISTS "tiendaId" INTEGER;
ALTER TABLE "Sale"          ADD COLUMN IF NOT EXISTS "tiendaId" INTEGER;
ALTER TABLE "Purchase"      ADD COLUMN IF NOT EXISTS "tiendaId" INTEGER;
ALTER TABLE "StockMovement" ADD COLUMN IF NOT EXISTS "tiendaId" INTEGER;

UPDATE "Category"      SET "tiendaId" = 1 WHERE "tiendaId" IS NULL;
UPDATE "Supplier"      SET "tiendaId" = 1 WHERE "tiendaId" IS NULL;
UPDATE "Product"       SET "tiendaId" = 1 WHERE "tiendaId" IS NULL;
UPDATE "Sale"          SET "tiendaId" = 1 WHERE "tiendaId" IS NULL;
UPDATE "Purchase"      SET "tiendaId" = 1 WHERE "tiendaId" IS NULL;
UPDATE "StockMovement" SET "tiendaId" = 1 WHERE "tiendaId" IS NULL;

ALTER TABLE "Category"      ALTER COLUMN "tiendaId" SET NOT NULL;
ALTER TABLE "Supplier"      ALTER COLUMN "tiendaId" SET NOT NULL;
ALTER TABLE "Product"       ALTER COLUMN "tiendaId" SET NOT NULL;
ALTER TABLE "Sale"          ALTER COLUMN "tiendaId" SET NOT NULL;
ALTER TABLE "Purchase"      ALTER COLUMN "tiendaId" SET NOT NULL;
ALTER TABLE "StockMovement" ALTER COLUMN "tiendaId" SET NOT NULL;
-- (User.tiendaId queda NULLABLE: el SUPERADMIN no pertenece a una tienda.)

-- 5) Restricciones únicas: de globales a POR TIENDA -----------------------
DROP INDEX IF EXISTS "User_username_key";
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

DROP INDEX IF EXISTS "Product_barcode_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Product_tiendaId_barcode_key" ON "Product"("tiendaId", "barcode");

DROP INDEX IF EXISTS "Category_name_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Category_tiendaId_name_key" ON "Category"("tiendaId", "name");

-- 6) Índices por tiendaId -------------------------------------------------
CREATE INDEX IF NOT EXISTS "User_tiendaId_idx"          ON "User"("tiendaId");
CREATE INDEX IF NOT EXISTS "Category_tiendaId_idx"      ON "Category"("tiendaId");
CREATE INDEX IF NOT EXISTS "Supplier_tiendaId_idx"      ON "Supplier"("tiendaId");
CREATE INDEX IF NOT EXISTS "Product_tiendaId_idx"       ON "Product"("tiendaId");
CREATE INDEX IF NOT EXISTS "Sale_tiendaId_idx"          ON "Sale"("tiendaId");
CREATE INDEX IF NOT EXISTS "Purchase_tiendaId_idx"      ON "Purchase"("tiendaId");
CREATE INDEX IF NOT EXISTS "StockMovement_tiendaId_idx" ON "StockMovement"("tiendaId");

-- 7) Llaves foráneas hacia Tienda ----------------------------------------
DO $$
DECLARE
  fk RECORD;
BEGIN
  FOR fk IN
    SELECT * FROM (VALUES
      ('User',          'SET NULL'),
      ('Category',      'RESTRICT'),
      ('Supplier',      'RESTRICT'),
      ('Product',       'RESTRICT'),
      ('Sale',          'RESTRICT'),
      ('Purchase',      'RESTRICT'),
      ('StockMovement', 'RESTRICT')
    ) AS t(tbl, ondelete)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = fk.tbl || '_tiendaId_fkey'
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY ("tiendaId") '
        || 'REFERENCES "Tienda"("id") ON UPDATE CASCADE ON DELETE %s',
        fk.tbl, fk.tbl || '_tiendaId_fkey', fk.ondelete
      );
    END IF;
  END LOOP;
END $$;

COMMIT;

-- 8) (OPCIONAL) Crear el SUPERADMIN de la plataforma ----------------------
--     El valor de enum 'SUPERADMIN' ya fue confirmado al inicio.
--     Contraseña del hash de abajo: super123  (¡cámbiala luego!)
INSERT INTO "User" ("name", "email", "password", "role", "tiendaId", "updatedAt")
SELECT 'Super Admin', 'superadmin@webventas.app',
       '$2a$10$BIes5i6z15A4RAxI1SffhupdDvP7xLOxgAfpyBjOQh0XzPvIXCgMe',
       'SUPERADMIN', NULL, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "User" WHERE "email" = 'superadmin@webventas.app');

-- ============================================================
--  Tras ejecutar: los usuarios actuales quedan con email
--  <usuario>@tienda1.local (ej. admin@tienda1.local / su contraseña actual).
--  Cámbialos a emails reales con:
--    UPDATE "User" SET email='dueño@correo.com' WHERE username='admin';
-- ============================================================
