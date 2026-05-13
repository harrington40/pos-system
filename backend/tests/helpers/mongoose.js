// Polyfill crypto for Node.js < 20.19.0 (required by mongodb driver's uuidV4)
if (typeof globalThis.crypto === 'undefined' || !globalThis.crypto.getRandomValues) {
  const nodeCrypto = require('crypto');
  globalThis.crypto = {
    getRandomValues: (buffer) => nodeCrypto.randomFillSync(buffer),
    randomUUID: () => nodeCrypto.randomUUID(),
  };
}

const mongoose = require('mongoose');

/**
 * Connect mongoose to the in-memory MongoDB (URI set by globalSetup).
 * Call this in beforeAll() of each test file that needs a database connection.
 */
async function connect() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI not set. Ensure globalSetup ran correctly.');
  }
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }
}

/**
 * Disconnect mongoose after tests complete.
 * Call this in afterAll() of each test file that uses connect().
 */
async function disconnect() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

/**
 * Clear all collections in the database.
 * Call this in beforeEach() to ensure test isolation.
 */
async function clearDatabase() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

module.exports = { connect, disconnect, clearDatabase };
