// Crea el usuario SUPERADMIN de la plataforma si no existe (idempotente).
// Se ejecuta al desplegar. Configura con variables de entorno:
//   SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const email = (process.env.SUPERADMIN_EMAIL || 'superadmin@webventas.app').toLowerCase();
const password = process.env.SUPERADMIN_PASSWORD || 'super123';

try {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`ℹ️  Superadmin ya existe: ${email}`);
  } else {
    await prisma.user.create({
      data: {
        name: 'Super Admin',
        email,
        password: bcrypt.hashSync(password, 10),
        role: 'SUPERADMIN',
        tiendaId: null,
      },
    });
    console.log(`✅ Superadmin creado: ${email}`);
  }
} catch (e) {
  console.error('Error creando superadmin:', e.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
