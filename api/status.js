const { kv } = require('@vercel/kv');

const FREE_SPINS = 2;

module.exports = async (req, res) => {
  const visitorId = req.query.visitorId;
  if (!visitorId) {
    res.status(400).json({ error: 'Missing visitorId' });
    return;
  }

  const freeUsed = (await kv.get(`free_used:${visitorId}`)) || 0;
  const paidSpins = (await kv.get(`paid:${visitorId}`)) || 0;

  res.status(200).json({
    freeRemaining: Math.max(0, FREE_SPINS - freeUsed),
    paidSpins
  });
};
