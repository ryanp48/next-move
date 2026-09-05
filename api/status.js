const { withRedis } = require('./lib/redis')const FREE_SPINS = 2;

module.exports = async (req, res) => {
  const visitorId = req.query.visitorId;
  if (!visitorId) {
    res.status(400).json({ error: 'Missing visitorId' });
    return;
  }

  try {
    const { freeUsed, paidSpins } = await withRedis(async (client) => {
      const freeUsed = parseInt((await client.get(`free_used:${visitorId}`)) || '0', 10);
      const paidSpins = parseInt((await client.get(`paid:${visitorId}`)) || '0', 10);
      return { freeUsed, paidSpins };
    });

    res.status(200).json({
      freeRemaining: Math.max(0, FREE_SPINS - freeUsed),
      paidSpins
    });
  } catch (err) {
    console.error('status error', err);
    res.status(500).json({ error: err.message });
  }
};
