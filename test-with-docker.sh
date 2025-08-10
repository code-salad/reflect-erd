#!/bin/bash

# Run the global setup to start Docker containers
echo "🚀 Starting Docker containers for tests..."
bun run tests/global-setup.ts &
SETUP_PID=$!

# Wait for setup to complete (it will keep running to handle teardown)
sleep 2

# Run all tests
echo "📝 Running tests..."
bun test

# Store test exit code
TEST_EXIT_CODE=$?

# Send SIGINT to setup process to trigger teardown
echo "🧹 Triggering cleanup..."
kill -INT $SETUP_PID 2>/dev/null

# Wait for cleanup to complete
wait $SETUP_PID 2>/dev/null

# Exit with the test exit code
exit $TEST_EXIT_CODE