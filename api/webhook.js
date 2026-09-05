// Stripe calls this endpoint directly (not the browser) once a payment
// finishes. This is the ONLY place spins get credited for a purchase —
// never credit spins from the front-end's "success" callback alone, since
// that can be spoofed or interrupted.

const Stripe = require('stripe');
const { kv } = require('@vercel/kv');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Vercel needs the raw request body to verify the Stripe signature,
// so body parsing must be disabled for this route.
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
      const key = `paid:${visitorId}`;
      const current = (await kv.get(key)) || 0;
      await kv.set(key, current + spinCount);
    } else {
      console.warn('payment_intent.succeeded with no visitorId in metadata', intent.id);
    }
  }

  res.json({ received: true });
};
