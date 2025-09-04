import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import mysql from 'mysql2/promise';
import postgres from 'postgres';
import { env } from '../src/config';

async function seedPostgres() {
  console.log('🌱 Seeding PostgreSQL database...');

  const sql = postgres(env.POSTGRES_URL, {
    max: 1,
    onnotice: () => {
      // Suppress notices
    },
  });

  try {
    // Read the seed SQL file
    const seedSQL = readFileSync(join(__dirname, 'postgres-seed.sql'), 'utf-8');

    // Execute the entire SQL file as a single transaction
    await sql.unsafe(seedSQL);

    console.log('✅ PostgreSQL database seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding PostgreSQL:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

async function seedMySQL() {
  console.log('🌱 Seeding MySQL database...');

  // Parse connection URL
  const url = new URL(env.MYSQL_URL);
  const database = url.pathname.slice(1); // Remove leading slash

  const connection = await mysql.createConnection({
    host: url.hostname,
    port: Number.parseInt(url.port || '3306', 10),
    user: url.username,
    password: url.password,
    database: database || undefined,
    multipleStatements: true, // Allow multiple SQL statements
  });

  try {
    // Read the seed SQL file
    const seedSQL = readFileSync(join(__dirname, 'mysql-seed.sql'), 'utf-8');

    // Execute the entire seed file
    await connection.query(seedSQL);

    console.log('✅ MySQL database seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding MySQL:', error);
    throw error;
  } finally {
    await connection.end();
  }
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
