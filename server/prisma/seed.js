// Datos de prueba: usuarios de cada rol, categorías, proveedores y productos.
// Ejecuta:  npm run seed
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Sembrando datos de prueba...');

  // ---- Usuarios (uno por rol) ----
  const hash = (p) => bcrypt.hashSync(p, 10);
  const users = [
    { name: 'Administrador', username: 'admin', password: hash('admin123'), role: 'ADMIN' },
    { name: 'Cajero Demo', username: 'cajero', password: hash('cajero123'), role: 'CAJERO' },
    { name: 'Almacén Demo', username: 'almacen', password: hash('almacen123'), role: 'ALMACEN' },
  ];
  for (const u of users) {
    await prisma.user.upsert({ where: { username: u.username }, update: {}, create: u });
  }

  // ---- Categorías ----
  const catNames = ['Bebidas', 'Snacks', 'Limpieza', 'Lácteos', 'Abarrotes'];
  const categories = {};
  for (const name of catNames) {
    const c = await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
    categories[name] = c.id;
  }

  // ---- Proveedor ----
  const supplier = await prisma.supplier.create({
    data: { name: 'Distribuidora Central', phone: '555-1234', email: 'ventas@central.com' },
  });

  // ---- Productos de ejemplo (con códigos de barras reales de prueba) ----
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
      where: { barcode: p.barcode },
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
      },
    });
  }

  console.log('✅ Listo. Usuarios de prueba:');
  console.log('   admin / admin123      (administrador)');
  console.log('   cajero / cajero123    (cajero)');
  console.log('   almacen / almacen123  (almacén)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
