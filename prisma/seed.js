const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  const adminPassword  = await bcrypt.hash('Admin123!', 12);
  const editorPassword = await bcrypt.hash('Editor123!', 12);
  const viewerPassword = await bcrypt.hash('Viewer123!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@guardianapp.com' },
    update: {},
    create: { name: 'Administrador', email: 'admin@guardianapp.com', password: adminPassword, role: 'ADMIN' },
  });

  const editor = await prisma.user.upsert({
    where: { email: 'editor@guardianapp.com' },
    update: {},
    create: { name: 'Editor García', email: 'editor@guardianapp.com', password: editorPassword, role: 'EDITOR' },
  });

  await prisma.user.upsert({
    where: { email: 'viewer@guardianapp.com' },
    update: {},
    create: { name: 'Visor López', email: 'viewer@guardianapp.com', password: viewerPassword, role: 'VIEWER' },
  });

  const asset1 = await prisma.asset.create({
    data: {
      name: 'Base de Datos de Usuarios', type: 'Base de Datos',
      description: 'Almacena credenciales y datos personales de usuarios',
      confidentiality: 'Alta', integrity: 'Alta', availability: 'Alta',
      owner: 'Administrador', location: 'Servidor PostgreSQL',
    },
  });

  const asset2 = await prisma.asset.create({
    data: {
      name: 'Servidor Web', type: 'Hardware',
      description: 'Servidor principal que aloja la aplicación web',
      confidentiality: 'Media', integrity: 'Alta', availability: 'Alta',
      owner: 'Administrador', location: 'Centro de Datos',
    },
  });

  await prisma.risk.create({
    data: {
      name: 'Acceso no autorizado a BD',
      description: 'Un atacante podría acceder a la base de datos mediante inyección SQL',
      probability: 3, impact: 5, riskLevel: 'Alto',
      control: 'Uso de ORM (Prisma), validación de entradas, principio de mínimo privilegio',
      status: 'Mitigado', assetId: asset1.id,
    },
  });

  await prisma.risk.create({
    data: {
      name: 'Robo de credenciales / sesión',
      description: 'Un atacante podría robar el token JWT y suplantar la identidad de un usuario',
      probability: 3, impact: 4, riskLevel: 'Alto',
      control: 'Tokens JWT de corta duración, verificación 2FA con TOTP para cuentas sensibles',
      status: 'Mitigado', assetId: asset1.id,
    },
  });

  await prisma.risk.create({
    data: {
      name: 'Denegación de servicio (DoS)',
      description: 'Saturación del servidor con solicitudes maliciosas',
      probability: 3, impact: 4, riskLevel: 'Alto',
      control: 'Rate limiting por IP, firewall, monitoreo de tráfico',
      status: 'En proceso', assetId: asset2.id,
    },
  });

  await prisma.record.create({
    data: {
      title: 'Política de Seguridad', description: 'Documento con las políticas de seguridad de la organización',
      content: 'Esta política establece los lineamientos de seguridad para todos los sistemas de información, incluyendo el uso obligatorio de doble factor de autenticación para roles administrativos.',
      isPublic: true, authorId: admin.id,
    },
  });

  await prisma.record.create({
    data: {
      title: 'Manual de Procedimientos', description: 'Procedimientos operativos del sistema',
      content: 'Los procedimientos descritos en este manual deben seguirse para garantizar la seguridad de las operaciones diarias.',
      isPublic: false, authorId: editor.id,
    },
  });

  console.log('✅ Seed completado exitosamente!');
  console.log('\n📋 Credenciales de acceso:');
  console.log('  ADMIN  → admin@guardianapp.com   / Admin123!');
  console.log('  EDITOR → editor@guardianapp.com  / Editor123!');
  console.log('  VIEWER → viewer@guardianapp.com  / Viewer123!');
  console.log('\n🔐 Ninguna cuenta tiene 2FA activado por defecto.');
  console.log('   Active el 2FA desde la sección "Seguridad de la cuenta" tras iniciar sesión.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
