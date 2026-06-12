// Asegura el usuario SUPERADMIN de la plataforma al desplegar (idempotente).
// Configura con variables de entorno:
//   SUPERADMIN_EMAIL     (por defecto superadmin@webventas.app)
//   SUPERADMIN_PASSWORD  (por defecto super123 SOLO al crear)
//
// Comportamiento:
//   - Si no existe: lo crea.
//   - Si existe y definiste SUPERADMIN_PASSWORD: sincroniza la contraseña
//     (solo escribe si cambió). Así puedes rotar la clave desde Railway.
//   - Si existe y NO definiste SUPERADMIN_PASSWORD: no toca la contraseña,
//     para que un deploy nunca la resetee al valor por defecto sin querer.
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const email = (process.env.SUPERADMIN_EMAIL || 'superadmin@webventas.app').toLowerCase();
const password = process.env.SUPERADMIN_PASSWORD || 'super123';
const passwordFromEnv = Boolean(process.env.SUPERADMIN_PASSWORD);

try {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
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
  } else if (passwordFromEnv && !bcrypt.compareSync(password, existing.password)) {
    await prisma.user.update({
      where: { email },
      data: { password: bcrypt.hashSync(password, 10) },
    });
    console.log(`🔑 Contraseña del superadmin actualizada: ${email}`);
  } else {
    console.log(`ℹ️  Superadmin ya existe (sin cambios): ${email}`);
  }
} catch (e) {
  console.error('Error asegurando el superadmin:', e.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
