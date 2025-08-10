#!/usr/bin/env bun
import { $ } from 'bun';
import globalSetup from './tests/global-setup';

async function runTests() {
  let teardown: (() => Promise<void>) | undefined;
  let exitCode = 0;

  try {
    // Run global setup
    console.log('🚀 Running global setup...\n');
    teardown = await globalSetup();

    // Run tests
    console.log('📝 Running tests...\n');
    const result = await $`bun test`.nothrow();
    exitCode = result.exitCode || 0;
  } catch (error) {
    console.error('❌ Error running tests:', error);
    exitCode = 1;
  } finally {
    // Run teardown
    if (teardown) {
      console.log('\n🧹 Running teardown...');
      await teardown();
    }
  }

  process.exit(exitCode);
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n🛑 Received SIGINT, exiting...');
  process.exit(130);
});

runTests();
