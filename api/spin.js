const { withRedis } = require('./lib/redis');

const FREE_SPINS = 2;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { visitorId } = req.body || {};
  if (!visitorId) {
    res.status(400).json({ error: 'Missing visitorId' });
    return;
  }

  try {
    const result = await withRedis(async (client) => {
      const freeUsedKey = `free_used:${visitorId}`;
      const paidKey = `paid:${visitorId}`;

      const freeUsed = parseInt((await client.get(freeUsedKey)) || '0', 10);
      const paidSpins = parseInt((await client.get(paidKey)) || '0', 10);

      let ok = false;
      let source = null;
      let updatedFreeUsed = freeUsed;
      let updatedPaid = paidSpins;

      if (freeUsed < FREE_SPINS) {
        updatedFreeUsed = freeUsed + 1;
        await client.set(freeUsedKey, String(updatedFreeUsed));
        ok = true;
        source = 'free';
      } else if (paidSpins > 0) {
        updatedPaid = paidSpins - 1;
        await client.set(paidKey, String(updatedPaid));
        ok = true;
        source = 'paid';
      }

      return {
        ok,
        source,
        freeRemaining: Math.max(0, FREE_SPINS - updatedFreeUsed),
        paidSpins: updatedPaid
      };
    });

    res.status(200).json(result);
  } catch (err) {
    console.error('spin error', err);
    res.status(500).json({ error: err.message });
  }
};
