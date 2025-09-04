import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { env } from '../src/config';

const $ = promisify(exec);

// Database connection details for Docker health checks
const POSTGRES_USER = 'dbuser';
const POSTGRES_DB = 'reflect_erd';
const MYSQL_USER = 'root';
const MYSQL_PASSWORD = 'rootpassword';

// Export test database URLs from centralized configuration
export const TEST_POSTGRES_URL = env.POSTGRES_URL;
export const TEST_MYSQL_URL = env.MYSQL_URL;

async function stopDockerCompose() {
  console.log('🧹 Stopping docker compose if running...');
  try {
    await $(
      'docker compose -f tests/docker-compose.yml down 2>/dev/null || true'
    );
    console.log('  ✅ Stopped docker compose');
  } catch {
    // Ignore errors if not running
  }
}

async function startDockerCompose() {
  console.log('🚀 Starting databases with docker compose...');

  await $('docker compose -f tests/docker-compose.yml up -d');

  // Wait for PostgreSQL to be ready
  console.log('  ⏳ Waiting for PostgreSQL to be ready...');
  for (let i = 0; i < 30; i++) {
    try {
      // biome-ignore lint/nursery/noAwaitInLoop: Polling for container readiness
      await $(
        `docker exec vsequel-postgres pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}`
      );
      console.log('  ✅ PostgreSQL is ready');
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Wait for MySQL to be ready
  console.log('  ⏳ Waiting for MySQL to be ready...');
  for (let i = 0; i < 30; i++) {
    try {
      // biome-ignore lint/nursery/noAwaitInLoop: Polling for container readiness
      await $(
        `docker exec vsequel-mysql mysqladmin ping -h 127.0.0.1 -u ${MYSQL_USER} -p${MYSQL_PASSWORD}`
      );
      console.log('  ✅ MySQL is ready');
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Give databases extra time to fully initialize
  console.log('  ⏳ Giving databases time to fully initialize...');
  await new Promise((resolve) => setTimeout(resolve, 5000));
  console.log('  ✅ Databases fully initialized');

  // Run the seed script to initialize test data
  console.log('  🌱 Running seed script...');
  await $('npm run seed');
  console.log('  ✅ Databases seeded');
}

// seedDatabases function removed - we now use the seed script in startDockerCompose

// Global setup function that the test runner will call before all tests
export default async function globalSetup() {
  console.log(`\n${'='.repeat(60)}`);
  console.log('🚀 GLOBAL TEST SETUP - Starting Docker Compose');
  console.log(`${'='.repeat(60)}\n`);

  try {
    // Stop any existing docker compose first
    await stopDockerCompose();

    // Start databases with docker compose (includes seeding)
    await startDockerCompose();

    // Store connection URLs in environment for tests to use
    process.env.TEST_POSTGRES_URL = TEST_POSTGRES_URL;
    process.env.TEST_MYSQL_URL = TEST_MYSQL_URL;

    console.log(`\n${'='.repeat(60)}`);
    console.log('✨ GLOBAL TEST SETUP COMPLETED');
    console.log(`  PostgreSQL: ${TEST_POSTGRES_URL}`);
    console.log(`  MySQL:      ${TEST_MYSQL_URL}`);
    console.log(`${'='.repeat(60)}\n`);

    return async () => {
      // This teardown function will be called after all tests
      console.log(`\n${'='.repeat(60)}`);
      console.log('🧹 GLOBAL TEST TEARDOWN - Cleaning up Docker Compose');
      console.log(`${'='.repeat(60)}\n`);

      try {
        console.log('🛑 Stopping docker compose...');
        await $('docker compose -f tests/docker-compose.yml down');
        console.log('  ✅ Docker compose stopped');

        console.log(`\n${'='.repeat(60)}`);
        console.log('✨ GLOBAL TEST TEARDOWN COMPLETED');
        console.log(`${'='.repeat(60)}\n`);
      } catch (error) {
        console.error('❌ Failed to cleanup docker compose:', error);
      }
    };
  } catch (error) {
    console.error('\n❌ Failed to setup test environment:', error);

    // Try to cleanup on failure
    await stopDockerCompose();

    throw error;
  }
}

// Allow running this file directly for testing
if (process.argv[1] === new URL(import.meta.url).pathname) {
  (async () => {
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
  })();
}
