// The single source of truth for "is this visitor allowed to spin right now".
// The front end calls this BEFORE animating the wheel. Doing the accounting
// here (not in the browser) means someone editing the page's JS in devtools
// can't just grant themselves infinite spins.

const { kv } = require('@vercel/kv');

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

  const freeUsedKey = `free_used:${visitorId}`;
  const paidKey = `paid:${visitorId}`;

  const freeUsed = (await kv.get(freeUsedKey)) || 0;
  const paidSpins = (await kv.get(paidKey)) || 0;

  let ok = false;
  let source = null;

  if (freeUsed < FREE_SPINS) {
    await kv.set(freeUsedKey, freeUsed + 1);
    ok = true;
    source = 'free';
  } else if (paidSpins > 0) {
    await kv.set(paidKey, paidSpins - 1);
    ok = true;
    source = 'paid';
  }

  const updatedFreeUsed = ok && source === 'free' ? freeUsed + 1 : freeUsed;
  const updatedPaid = ok && source === 'paid' ? paidSpins - 1 : paidSpins;

  res.status(200).json({
    ok,
    source,
    freeRemaining: Math.max(0, FREE_SPINS - updatedFreeUsed),
    paidSpins: updatedPaid
  });
};
