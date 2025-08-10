import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { $ } from 'bun';

// Docker container names
const POSTGRES_CONTAINER = 'test-postgres-global';
const MYSQL_CONTAINER = 'test-mysql-global';

// Database connection details
const POSTGRES_PASSWORD = 'testpass123';
const MYSQL_PASSWORD = 'testpass123';
const POSTGRES_DB = 'testdb';
const MYSQL_DB = 'testdb';

// Export connection URLs for tests to use
export const TEST_POSTGRES_URL = `postgresql://postgres:${POSTGRES_PASSWORD}@localhost:5433/${POSTGRES_DB}`;
export const TEST_MYSQL_URL = `mysql://root:${MYSQL_PASSWORD}@localhost:3307/${MYSQL_DB}`;

async function cleanupExistingContainers() {
  console.log('🧹 Cleaning up any existing test containers...');

  try {
    // Check if containers exist and remove them
    const existingContainers =
      await $`docker ps -a --format "{{.Names}}" | grep -E "^(${POSTGRES_CONTAINER}|${MYSQL_CONTAINER})$" || true`.text();

    if (existingContainers.trim()) {
      await $`docker stop ${POSTGRES_CONTAINER} ${MYSQL_CONTAINER} 2>/dev/null || true`.quiet();
      await $`docker rm ${POSTGRES_CONTAINER} ${MYSQL_CONTAINER} 2>/dev/null || true`.quiet();
      console.log('  ✅ Cleaned up existing containers');
    }
  } catch {
    // Ignore errors if containers don't exist
  }
}

async function startPostgres() {
  console.log('🐘 Starting PostgreSQL container...');

  await $`docker run -d \
    --name ${POSTGRES_CONTAINER} \
    -e POSTGRES_PASSWORD=${POSTGRES_PASSWORD} \
    -e POSTGRES_DB=${POSTGRES_DB} \
    -p 5433:5432 \
    postgres:15-alpine`.quiet();

  // Wait for PostgreSQL to be ready
  console.log('  ⏳ Waiting for PostgreSQL to be ready...');
  for (let i = 0; i < 30; i++) {
    try {
      // biome-ignore lint/nursery/noAwaitInLoop: Polling for container readiness
      await $`docker exec ${POSTGRES_CONTAINER} pg_isready -U postgres`.quiet();
      console.log('  ✅ PostgreSQL is ready');
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  throw new Error('PostgreSQL container failed to start');
}

async function startMySQL() {
  console.log('🐬 Starting MySQL container...');

  await $`docker run -d \
    --name ${MYSQL_CONTAINER} \
    -e MYSQL_ROOT_PASSWORD=${MYSQL_PASSWORD} \
    -e MYSQL_DATABASE=${MYSQL_DB} \
    -p 3307:3306 \
    mysql:8.0`.quiet();

  // Wait for MySQL to be ready
  console.log('  ⏳ Waiting for MySQL to be ready...');
  for (let i = 0; i < 30; i++) {
    try {
      // biome-ignore lint/nursery/noAwaitInLoop: Polling for container readiness
      await $`docker exec ${MYSQL_CONTAINER} mysqladmin ping -h 127.0.0.1 -u root -p${MYSQL_PASSWORD}`.quiet();
      console.log('  ✅ MySQL is ready');
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Give MySQL extra time to fully initialize
  console.log('  ⏳ Giving MySQL time to fully initialize...');
  await new Promise((resolve) => setTimeout(resolve, 5000));
  console.log('  ✅ MySQL fully initialized');
}

async function seedDatabases() {
  console.log('🌱 Seeding databases...');

  // Read seed files
  const postgresSeed = readFileSync(
    join(__dirname, '..', 'seeds', 'postgres-seed.sql'),
    'utf-8'
  );
  const mysqlSeed = readFileSync(
    join(__dirname, '..', 'seeds', 'mysql-seed.sql'),
    'utf-8'
  );

  // Seed PostgreSQL
  console.log('  📝 Seeding PostgreSQL...');
  const postgresProc = Bun.spawn(
    [
      'docker',
      'exec',
      '-i',
      POSTGRES_CONTAINER,
      'psql',
      '-U',
      'postgres',
      '-d',
      POSTGRES_DB,
    ],
    {
      stdin: 'pipe',
    }
  );
  postgresProc.stdin?.write(postgresSeed);
  postgresProc.stdin?.end();
  await postgresProc.exited;
  console.log('  ✅ PostgreSQL seeded');

  // Seed MySQL
  console.log('  📝 Seeding MySQL...');
  const mysqlProc = Bun.spawn(
    [
      'docker',
      'exec',
      '-i',
      MYSQL_CONTAINER,
      'mysql',
      '-u',
      'root',
      `-p${MYSQL_PASSWORD}`,
      MYSQL_DB,
    ],
    {
      stdin: 'pipe',
    }
  );
  mysqlProc.stdin?.write(mysqlSeed);
  mysqlProc.stdin?.end();
  await mysqlProc.exited;
  console.log('  ✅ MySQL seeded');

  console.log('✅ Database seeding completed');
}

// Global setup function that Bun will call before all tests
export default async function globalSetup() {
  console.log(`\n${'='.repeat(60)}`);
  console.log('🚀 GLOBAL TEST SETUP - Starting Docker containers');
  console.log(`${'='.repeat(60)}\n`);

  try {
    // Clean up any existing containers first
    await cleanupExistingContainers();

    // Start containers in parallel
    await Promise.all([startPostgres(), startMySQL()]);

    // Seed databases
    await seedDatabases();

    // Store connection URLs in environment for tests to use
    process.env.TEST_POSTGRES_URL = TEST_POSTGRES_URL;
    process.env.TEST_MYSQL_URL = TEST_MYSQL_URL;
    process.env.TEST_POSTGRES_CONTAINER = POSTGRES_CONTAINER;
    process.env.TEST_MYSQL_CONTAINER = MYSQL_CONTAINER;

    console.log(`\n${'='.repeat(60)}`);
    console.log('✨ GLOBAL TEST SETUP COMPLETED');
    console.log(`  PostgreSQL: ${TEST_POSTGRES_URL}`);
    console.log(`  MySQL:      ${TEST_MYSQL_URL}`);
    console.log(`${'='.repeat(60)}\n`);

    return async () => {
      // This teardown function will be called after all tests
      console.log(`\n${'='.repeat(60)}`);
      console.log('🧹 GLOBAL TEST TEARDOWN - Cleaning up Docker containers');
      console.log(`${'='.repeat(60)}\n`);

      try {
        console.log('🛑 Stopping containers...');
        await $`docker stop ${POSTGRES_CONTAINER} ${MYSQL_CONTAINER}`.quiet();
        console.log('  ✅ Containers stopped');

        console.log('🗑️  Removing containers...');
        await $`docker rm ${POSTGRES_CONTAINER} ${MYSQL_CONTAINER}`.quiet();
        console.log('  ✅ Containers removed');

        console.log(`\n${'='.repeat(60)}`);
        console.log('✨ GLOBAL TEST TEARDOWN COMPLETED');
        console.log(`${'='.repeat(60)}\n`);
      } catch (error) {
        console.error('❌ Failed to cleanup containers:', error);
      }
    };
  } catch (error) {
    console.error('\n❌ Failed to setup test environment:', error);

    // Try to cleanup on failure
    await cleanupExistingContainers();

    throw error;
  }
}

// Allow running this file directly for testing
if (import.meta.main) {
  const teardown = await globalSetup();
  console.log('\n⏸️  Press Ctrl+C to stop and cleanup containers...\n');

  // Handle Ctrl+C
  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Received SIGINT, cleaning up...');
    if (teardown) {
      await teardown();
    }
    process.exit(0);
  });
}
