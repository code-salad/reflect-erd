import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import mysql from 'mysql2/promise';
import postgres from 'postgres';
import { env } from '../src/config';

async function seedPostgres() {
  console.log('🌱 Seeding PostgreSQL database...');

  const attemptConnection = async (attempt: number): Promise<void> => {
    const sql = postgres(env.POSTGRES_URL, {
      max: 1,
      connect_timeout: 30,
      onnotice: () => {
        // Suppress notices
      },
    });

    try {
      // Test connection first
      await sql`SELECT 1`;

      // Read the seed SQL file
      const seedSQL = readFileSync(
        join(__dirname, 'postgres-seed.sql'),
        'utf-8'
      );

      // Execute the entire SQL file as a single transaction
      await sql.unsafe(seedSQL);

      console.log('✅ PostgreSQL database seeded successfully');
      await sql.end();
    } catch (error) {
      await sql.end().catch(() => {
        // Ignore connection close errors
      });

      if (attempt >= 5) {
        console.error('❌ Error seeding PostgreSQL after 5 attempts:', error);
        throw error;
      }

      console.warn(
        `⚠️ PostgreSQL connection attempt failed (${attempt}/5):`,
        (error as Error).message
      );

      // Wait before retry with exponential backoff
      await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
      return attemptConnection(attempt + 1);
    }
  };

  await attemptConnection(1);
}

async function seedMySQL() {
  console.log('🌱 Seeding MySQL database...');

  // Parse connection URL
  const url = new URL(env.MYSQL_URL);
  const database = url.pathname.slice(1); // Remove leading slash

  const attemptConnection = async (attempt: number): Promise<void> => {
    let connection: mysql.Connection | null = null;

    try {
      connection = await mysql.createConnection({
        host: url.hostname,
        port: Number.parseInt(url.port || '3306', 10),
        user: url.username,
        password: url.password,
        database: database || undefined,
        multipleStatements: true, // Allow multiple SQL statements
        connectTimeout: 30_000,
      });

      // Test connection
      await connection.query('SELECT 1');

      // Read the seed SQL file
      const seedSQL = readFileSync(join(__dirname, 'mysql-seed.sql'), 'utf-8');

      // Execute the entire seed file
      await connection.query(seedSQL);

      console.log('✅ MySQL database seeded successfully');
      await connection.end();
    } catch (error) {
      if (connection) {
        await connection.end().catch(() => {
          // Ignore connection close errors
        });
      }

      if (attempt >= 5) {
        console.error('❌ Error seeding MySQL after 5 attempts:', error);
        throw error;
      }

      console.warn(
        `⚠️ MySQL connection attempt failed (${attempt}/5):`,
        (error as Error).message
      );

      // Wait before retry with exponential backoff
      await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
      return attemptConnection(attempt + 1);
    }
  };

  await attemptConnection(1);
}

async function setup() {
  console.log('🚀 Starting database setup...\n');

  try {
    // Run both seeds in parallel
    await Promise.all([seedPostgres(), seedMySQL()]);

    console.log('\n✨ Database setup completed successfully!');
  } catch (error) {
    console.error('\n💥 Database setup failed:', error);
    process.exit(1);
  }
}

// Run setup if this file is executed directly
if (import.meta.main) {
  setup();
}

export { setup, seedPostgres, seedMySQL };
