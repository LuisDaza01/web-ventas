// Datos de prueba multi-tenant:
//  - 1 SUPERADMIN de plataforma (sin tienda)
//  - 1 "Tienda Demo" con sus usuarios (admin/cajero/almacén), categorías,
//    proveedor y productos.
//
// El seed corre SIN contexto de tienda, así que el tiendaId se pone explícito.
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const hash = (p) => bcrypt.hashSync(p, 10);

async function main() {
  console.log('🌱 Sembrando datos de prueba (multi-tenant)...');

  // ---- Superadmin de la plataforma ----
  await prisma.user.upsert({
    where: { email: 'superadmin@webventas.app' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'superadmin@webventas.app',
      password: hash('super123'),
      role: 'SUPERADMIN',
      tiendaId: null,
    },
  });

  // ---- Tienda Demo ----
  const tienda = await prisma.tienda.upsert({
    where: { slug: 'demo' },
    update: {},
    create: { nombre: 'Tienda Demo', slug: 'demo', plan: 'FREE' },
  });
  const tiendaId = tienda.id;

  // ---- Usuarios de la tienda ----
  const users = [
    { name: 'Administrador', email: 'admin@demo.com', password: hash('admin123'), role: 'ADMIN' },
    { name: 'Cajero Demo', email: 'cajero@demo.com', password: hash('cajero123'), role: 'CAJERO' },
    { name: 'Almacén Demo', email: 'almacen@demo.com', password: hash('almacen123'), role: 'ALMACEN' },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, username: u.email.split('@')[0], tiendaId },
    });
  }

  // ---- Categorías ----
  const catNames = ['Bebidas', 'Snacks', 'Limpieza', 'Lácteos', 'Abarrotes'];
  const categories = {};
  for (const name of catNames) {
    const c = await prisma.category.upsert({
      where: { tiendaId_name: { tiendaId, name } },
      update: {},
      create: { name, tiendaId },
    });
    categories[name] = c.id;
  }

  // ---- Proveedor ----
  let supplier = await prisma.supplier.findFirst({ where: { tiendaId, name: 'Distribuidora Central' } });
  if (!supplier) {
    supplier = await prisma.supplier.create({
      data: { name: 'Distribuidora Central', phone: '555-1234', email: 'ventas@central.com', tiendaId },
    });
  }

  // ---- Productos ----
  const productos = [
    { barcode: '7501055300013', name: 'Coca-Cola 600ml', categoria: 'Bebidas', compra: 8, venta: 15, stock: 40 },
    { barcode: '7501055363513', name: 'Agua Mineral 1L', categoria: 'Bebidas', compra: 5, venta: 10, stock: 60 },
    { barcode: '7622300336738', name: 'Galletas Oreo', categoria: 'Snacks', compra: 9, venta: 16, stock: 25 },
    { barcode: '7501000910014', name: 'Papas Sabritas', categoria: 'Snacks', compra: 10, venta: 18, stock: 4 },
    { barcode: '7501025401016', name: 'Leche Entera 1L', categoria: 'Lácteos', compra: 18, venta: 26, stock: 30 },
    { barcode: '7501035910013', name: 'Detergente 1kg', categoria: 'Limpieza', compra: 25, venta: 40, stock: 3 },
    { barcode: '7501008042016', name: 'Arroz 1kg', categoria: 'Abarrotes', compra: 14, venta: 22, stock: 50 },
    { barcode: '7501008013015', name: 'Azúcar 1kg', categoria: 'Abarrotes', compra: 16, venta: 24, stock: 20 },
  ];
  for (const p of productos) {
    await prisma.product.upsert({
      where: { tiendaId_barcode: { tiendaId, barcode: p.barcode } },
      update: {},
      create: {
        barcode: p.barcode,
        name: p.name,
        categoryId: categories[p.categoria],
        purchasePrice: p.compra,
        salePrice: p.venta,
        stock: p.stock,
        minStock: 5,
        supplierId: supplier.id,
        tiendaId,
      },
    });
  }

  console.log('✅ Listo.');
  console.log('   Plataforma: superadmin@webventas.app / super123');
  console.log(`   Tienda Demo (id ${tiendaId}):`);
  console.log('     admin@demo.com / admin123      (ADMIN)');
  console.log('     cajero@demo.com / cajero123    (CAJERO)');
  console.log('     almacen@demo.com / almacen123  (ALMACEN)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
