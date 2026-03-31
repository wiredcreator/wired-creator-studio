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
): Promise<{ isPaid: boolean; customerId?: string; customerName?: string; reason?: string }> {
  const stripe = getStripeClient();

  // No Stripe key = dev mode, allow everyone
  if (!stripe) {
    return { isPaid: true, customerName: '', reason: 'dev mode' };
  }

  try {
    const customers = await stripe.customers.list({ email: email.toLowerCase(), limit: 1 });
    if (customers.data.length === 0) return { isPaid: false, reason: 'no customer found' };

    const customer = customers.data[0];

    // Check active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1,
    });
    if (subscriptions.data.length > 0) {
      return { isPaid: true, customerId: customer.id, customerName: customer.name || undefined, reason: 'active subscription' };
    }

    // Check for canceled/past_due subscriptions
    const allSubs = await stripe.subscriptions.list({ customer: customer.id, limit: 5 });
    if (allSubs.data.length > 0) {
      const latest = allSubs.data[0];
      if (latest.status === 'canceled') {
        return { isPaid: false, customerId: customer.id, reason: 'subscription canceled' };
      }
      if (latest.status === 'past_due') {
        return { isPaid: false, customerId: customer.id, reason: 'payment past due' };
      }
      if (latest.status === 'unpaid') {
        return { isPaid: false, customerId: customer.id, reason: 'subscription unpaid' };
      }
    }

    // Check successful one-time payments (PaymentIntents)
    const paymentIntents = await stripe.paymentIntents.list({ customer: customer.id, limit: 10 });
    const hasSuccessfulPI = paymentIntents.data.some((pi) => pi.status === 'succeeded');
    if (hasSuccessfulPI) {
      return { isPaid: true, customerId: customer.id, customerName: customer.name || undefined, reason: 'one-time payment' };
    }

    // Check successful charges (covers manual/dashboard payments and GHL)
    const charges = await stripe.charges.list({ customer: customer.id, limit: 10 });
    console.log(`[Stripe] Customer ${customer.id}: ${paymentIntents.data.length} PaymentIntents, ${charges.data.length} Charges`);
    const hasSuccessfulCharge = charges.data.some((ch) => ch.status === 'succeeded');
    if (hasSuccessfulCharge) {
      return { isPaid: true, customerId: customer.id, customerName: customer.name || undefined, reason: 'successful charge' };
    }

    if (paymentIntents.data.length > 0 || charges.data.length > 0) {
      return { isPaid: false, customerId: customer.id, reason: 'no successful payments' };
    }

    return { isPaid: false, customerId: customer.id, reason: 'customer exists, no payments' };
  } catch (error) {
    console.error('[Stripe] Customer check failed:', error);
    return { isPaid: false, reason: 'stripe API error' };
  }
}
