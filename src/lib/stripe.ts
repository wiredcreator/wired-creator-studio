import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.warn('[Stripe] STRIPE_SECRET_KEY not set — Stripe verification disabled');
    return null;
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

export async function checkPaidCustomer(
  email: string
): Promise<{ isPaid: boolean; customerId?: string; customerName?: string }> {
  const stripe = getStripeClient();

  // No Stripe key = dev mode, allow everyone
  if (!stripe) {
    return { isPaid: true, customerName: '' };
  }

  try {
    const customers = await stripe.customers.list({ email: email.toLowerCase(), limit: 1 });
    if (customers.data.length === 0) return { isPaid: false };

    const customer = customers.data[0];

    // Check active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1,
    });
    if (subscriptions.data.length > 0) {
      return { isPaid: true, customerId: customer.id, customerName: customer.name || undefined };
    }

    // Check successful one-time payments
    const paymentIntents = await stripe.paymentIntents.list({ customer: customer.id, limit: 10 });
    const hasSuccessful = paymentIntents.data.some((pi) => pi.status === 'succeeded');
    if (hasSuccessful) {
      return { isPaid: true, customerId: customer.id, customerName: customer.name || undefined };
    }

    return { isPaid: false };
  } catch (error) {
    console.error('[Stripe] Customer check failed:', error);
    return { isPaid: false };
  }
}
