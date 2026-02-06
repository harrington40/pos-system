// Simple server starter for Smart SIP Web App
// Run with: node start-server.js

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Smart SIP Web Application...');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const webDir = path.join(__dirname, 'apps', 'web');
process.chdir(webDir);

console.log('📂 Working directory:', process.cwd());
console.log('🔥 Starting Vite development server...');
console.log('');

// Start vite
const vite = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true
});

vite.on('error', (err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

vite.on('close', (code) => {
  if (code !== 0) {
    console.error(`❌ Server exited with code ${code}`);
  }
  process.exit(code);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down server...');
  vite.kill();
  process.exit(0);
});
