#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Build directory
const buildDir = path.join(__dirname, '../dist');
const srcDir = path.join(__dirname, '../src');

console.log('Building AdBlock Pro extension...');

// Clean dist folder
if (fs.existsSync(buildDir)) {
  fs.rmSync(buildDir, { recursive: true, force: true });
}

// Create dist folder
fs.mkdirSync(buildDir, { recursive: true });

// Copy manifest.json
const manifestSrc = path.join(__dirname, '../manifest.json');
const manifestDest = path.join(buildDir, 'manifest.json');
fs.copyFileSync(manifestSrc, manifestDest);
console.log('✓ Copied manifest.json');

// Copy src files
function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const files = fs.readdirSync(src);
  
  files.forEach(file => {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    
    if (fs.statSync(srcPath).isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

copyDirRecursive(srcDir, path.join(buildDir, 'src'));
console.log('✓ Copied source files');

console.log('\n✓ Extension built successfully!');
console.log(`Output: ${buildDir}\n`);
