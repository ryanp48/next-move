const { createClient } = require('redis');

async function withRedis(fn) {
  const client = createClient({ url: process.env.REDIS_URL });
  client.on('error', (err) => console.error('Redis Client Error', err));
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.quit();
  }
}

module.exports = { withRedis };
