import { beforeAll } from 'bun:test';
import { setup } from '../seeds/setup';

// Run database seeds before all tests
beforeAll(async () => {
  console.log('🚀 Running database seeds before tests...\n');
  await setup();
  console.log('\n📝 Starting tests...\n');
});
