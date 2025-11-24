#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Watch for changes and rebuild
const srcDir = path.join(__dirname, '../src');
const buildDir = path.join(__dirname, '../dist');

console.log('Watching for changes...');
console.log(`Source: ${srcDir}`);
console.log(`Output: ${buildDir}\n`);

function buildExtension() {
  require('./build.js');
}

// Initial build
buildExtension();

// Watch for changes
fs.watch(srcDir, { recursive: true }, (eventType, filename) => {
  console.log(`\nDetected change in: ${filename}`);
  console.log('Rebuilding...');
  buildExtension();
});

console.log('Watching for changes (Ctrl+C to stop)...');
