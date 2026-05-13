module.exports = async function globalTeardown() {
  if (global.__MONGO_SERVER__) {
    await global.__MONGO_SERVER__.stop();
  }
  console.log('[Test Teardown] Stopped in-memory MongoDB');
};
