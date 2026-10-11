#!/usr/bin/env node
/**
 * Meantvo icon derivatives. The monogram PNG is the source of truth.
 * This used to paint a gift box — do not bring that back.
 */
const { spawnSync } = require('child_process');
const path = require('path');

const result = spawnSync('python3', [path.join(__dirname, 'generate-meantvo-assets.py')], {
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
