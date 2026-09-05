const Stripe = require('stripe');
const { withRedis } = require('./lib/redis');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

module.exports.config = {
  api: { bodyParser: false }
};

function buffer(readable) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readable.on('data', (chunk) => chunks.push(chunk));
    readable.on('end', () => resolve(Buffer.concat(chunks)));
    readable.on('error', reject);
  });
}

module.exports = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const buf = await buffer(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object;
    const visitorId = intent.metadata && intent.metadata.visitorId;
    const spinCount = parseInt((intent.metadata && intent.metadata.spinCount) || '5', 10);

    if (visitorId) {
      await withRedis(async (client) => {
        const key = `paid:${visitorId}`;
        const current = parseInt((await client.get(key)) || '0', 10);
        await client.set(key, String(current + spinCount));
      });
    } else {
      console.warn('payment_intent.succeeded with no visitorId in metadata', intent.id);
    }
  }

  res.json({ received: true });
};
