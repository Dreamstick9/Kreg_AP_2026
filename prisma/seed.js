const bcrypt = require('bcryptjs');
const prisma = require('../src/config/db');

async function main() {
  const passwordHash = await bcrypt.hash('demo1234', 10);

  const user = await prisma.user.upsert({
    where: { email: 'demo@kreg.dev' },
    update: { name: 'Demo', passwordHash },
    create: { name: 'Demo', email: 'demo@kreg.dev', passwordHash },
  });

  await prisma.monitor.deleteMany({ where: { userId: user.id } });

  await prisma.monitor.createMany({
    data: [
      { userId: user.id, name: 'Fake OK', url: 'http://localhost:4000/ok', intervalSec: 10, isPublic: true },
      { userId: user.id, name: 'Fake Slow', url: 'http://localhost:4000/slow', intervalSec: 30, isPublic: true },
      { userId: user.id, name: 'Fake Flaky', url: 'http://localhost:4000/flaky', intervalSec: 10, isPublic: true },
      { userId: user.id, name: 'Example', url: 'https://example.com', intervalSec: 60, isPublic: true },
      { userId: user.id, name: 'Private OK', url: 'http://localhost:4000/ok', intervalSec: 60, isPublic: false },
    ],
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
