// Creates a $1.00 PaymentIntent for a 5-spin pack.
// The webhook (api/webhook.js) is what actually credits the spins once
// Stripe confirms the charge succeeded — never trust the client alone.

const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const SPIN_PACK_PRICE_CENTS = 100; // $1.00
const SPIN_PACK_COUNT = 5;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { visitorId } = req.body || {};
    if (!visitorId) {
      res.status(400).json({ error: 'Missing visitorId' });
      return;
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: SPIN_PACK_PRICE_CENTS,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: {
        visitorId,
        product: 'spin_pack_5',
        spinCount: String(SPIN_PACK_COUNT)
      }
    });

    res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error('create-payment-intent error', err);
    res.status(500).json({ error: err.message });
  }
};
