const { MongoMemoryServer } = require('mongodb-memory-server');

// Polyfill crypto for Node.js < 20.19.0 (required by mongodb driver's uuidV4)
if (typeof globalThis.crypto === 'undefined') {
  const crypto = require('crypto');
  globalThis.crypto = {
    getRandomValues: (buffer) => crypto.randomFillSync(buffer),
    randomUUID: () => crypto.randomUUID(),
  };
}

let mongoServer;

module.exports = async function globalSetup() {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  process.env.NODE_ENV = 'test';
  process.env.PORT = '0';

  // Store the mongod instance for teardown
  global.__MONGO_SERVER__ = mongoServer;

  console.log(`[Test Setup] In-memory MongoDB URI: ${uri}`);
};
