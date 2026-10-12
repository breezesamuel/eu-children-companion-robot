const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const DEFAULT_CURRENCY = process.env.DEFAULT_CURRENCY || 'eur';
const TAX_RATE = parseFloat(process.env.TAX_RATE || '0.20');

let stripe = null;
try {
  if (STRIPE_SECRET_KEY) {
    stripe = require('stripe')(STRIPE_SECRET_KEY);
  }
} catch (e) {
  // stripe not available
}

const db = require('../utils/database');
const logger = require('../utils/logger');

const webhookHandlers = new Map();
const refundRequestQueue = [];

function registerWebhookHandler(eventType, handler) {
  const handlers = webhookHandlers.get(eventType) || [];
  handlers.push(handler);
  webhookHandlers.set(eventType, handlers);
}

async function createCheckoutSession(customerId, items, successUrl, cancelUrl, options = {}) {
  const currency = options.currency || DEFAULT_CURRENCY;
  const customerEmail = options.customerEmail || null;
  const allowPromotionCodes = options.allowPromotionCodes !== false;
  const metadata = { customer_id: String(customerId), ...(options.metadata || {}) };

  if (stripe) {
    const lineItems = items.map(item => ({
      price_data: {
        currency: currency,
        product_data: {
          name: item.name,
          description: item.description || '',
          images: item.images || [],
          metadata: item.productMetadata || {},
        },
        unit_amount: Math.round(item.price * (item.quantity || 1)),
        tax_behavior: 'inclusive',
        recurring: item.interval && item.interval !== 'once'
          ? { interval: item.interval, interval_count: item.intervalCount || 1 }
          : undefined,
      },
      quantity: item.quantity || 1,
      adjustable_quantity: item.adjustableQuantity ? { enabled: true, minimum: 1, maximum: item.maxQuantity || 99 } : undefined,
    }));

    const sessionParams = {
      mode: items.some(i => i.interval && i.interval !== 'once') ? 'subscription' : 'payment',
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
      currency,
      allow_promotion_codes: allowPromotionCodes,
      billing_address_collection: 'required',
      shipping_address_collection: { allowed_countries: (options.shippingCountries || ['DE', 'AT', 'CH', 'FR', 'IT', 'ES', 'NL', 'BE', 'GB', 'US']) },
      phone_number_collection: { enabled: true },
      locale: options.locale || 'auto',
    };

    if (customerEmail) sessionParams.customer_email = customerEmail;
    if (options.subscriptionData) {
      sessionParams.subscription_data = options.subscriptionData;
    }
    if (options.discounts) {
      sessionParams.discounts = options.discounts;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    logger.info('Stripe checkout session created', { sessionId: session.id, customerId });
    return { id: session.id, url: session.url, mode: sessionParams.mode };
  }

  // Demo mode
  const orderId = 'demo_' + Date.now();
  logger.info('Demo payment session created', { customerId, items, orderId });
  return { id: orderId, url: `${successUrl}?order_id=${orderId}&demo=true`, mode: 'payment' };
}

async function createPaymentIntent(customerId, amount, currency = DEFAULT_CURRENCY, metadata = {}) {
  if (stripe) {
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      metadata: { customer_id: String(customerId), ...metadata },
      automatic_payment_methods: { enabled: true },
    });
    return { id: intent.id, clientSecret: intent.client_secret, status: intent.status };
  }
  return { id: 'pi_demo_' + Date.now(), clientSecret: 'demo_secret', status: 'requires_payment_method' };
}

async function confirmPaymentIntent(paymentIntentId) {
  if (stripe) {
    const intent = await stripe.paymentIntents.confirm(paymentIntentId);
    return { id: intent.id, status: intent.status };
  }
  return { id: paymentIntentId, status: 'succeeded' };
}

async function handleWebhook(rawBody, signature) {
  if (!stripe) {
    return { type: 'checkout.session.completed', data: { demo: true, id: 'demo_' + Date.now() } };
  }

  const event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
  const eventType = event.type;
  const eventData = event.data.object;

  // Run registered handlers
  const handlers = webhookHandlers.get(eventType) || [];
  for (const handler of handlers) {
    try {
      await handler(eventData);
    } catch (e) {
      logger.error('Webhook handler error', { eventType, error: e.message });
    }
  }

  // Handle common events
  switch (eventType) {
    case 'checkout.session.completed':
      await fulfillOrder(eventData);
      break;
    case 'invoice.paid':
      await handleInvoicePaid(eventData);
      break;
    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(eventData);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(eventData);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(eventData);
      break;
    case 'payment_intent.succeeded':
      logger.info('Payment succeeded', { intentId: eventData.id });
      break;
    case 'payment_intent.payment_failed':
      logger.warn('Payment failed', { intentId: eventData.id, error: eventData.last_payment_error });
      break;
  }

  return { type: eventType, data: eventData };
}

async function fulfillOrder(session) {
  const customerId = parseInt(session.metadata?.customer_id || session.client_reference_id || '0');
  const userId = session.metadata?.user_id || customerId;

  const existingOrder = await db.findOne('orders', { where: { stripe_session_id: session.id } });
  if (existingOrder) {
    logger.info('Order already fulfilled', { sessionId: session.id });
    return existingOrder;
  }

  const order = {
    user_id: userId,
    stripe_session_id: session.id,
    amount_total: session.amount_total || 0,
    amount_subtotal: session.amount_subtotal || 0,
    currency: session.currency || DEFAULT_CURRENCY,
    status: 'completed',
    payment_status: session.payment_status || 'paid',
    payment_intent: session.payment_intent || '',
    customer_details: JSON.stringify(session.customer_details || {}),
    shipping_details: JSON.stringify(session.shipping_details || {}),
    metadata: JSON.stringify(session.metadata || {}),
    completed_at: new Date().toISOString(),
  };

  try {
    const result = await db.insert('orders', order);
    logger.info('Order fulfilled', { userId, sessionId: session.id, orderId: result?.id });
    return result;
  } catch (e) {
    logger.error('Order fulfillment failed', { error: e.message, sessionId: session.id });
    throw e;
  }
}

async function refundPayment(chargeId, amount = null, reason = 'requested_by_customer') {
  if (stripe) {
    const params = { charge: chargeId, reason };
    if (amount) params.amount = Math.round(amount * 100);
    const refund = await stripe.refunds.create(params);
    logger.info('Payment refunded', { chargeId, amount, refundId: refund.id });
    return { id: refund.id, status: refund.status, amount: refund.amount / 100 };
  }
  return { id: 'ref_demo_' + Date.now(), status: 'succeeded', amount };
}

async function createSubscription(userId, priceId, options = {}) {
  if (!stripe) {
    const sub = {
      user_id: userId,
      plan_id: priceId,
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
      stripe_subscription_id: 'demo_sub_' + Date.now(),
      trial_end: options.trialDays ? new Date(Date.now() + options.trialDays * 86400000).toISOString() : null,
    };
    try {
      await db.insert('user_subscriptions', sub);
    } catch (e) {
      await db.run(
        'INSERT INTO user_subscriptions (user_id, plan_id, status, current_period_start, current_period_end, stripe_subscription_id) VALUES ($1, $2, $3, $4, $5, $6)',
        [userId, priceId, 'active', sub.current_period_start, sub.current_period_end, sub.stripe_subscription_id]
      );
    }
    return { ...sub, id: 'demo_sub_' + Date.now() };
  }

  const subscriptionParams = {
    customer: userId,
    items: [{ price: priceId }],
    metadata: { user_id: String(userId), ...(options.metadata || {}) },
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent'],
  };

  if (options.trialDays) {
    subscriptionParams.trial_period_days = options.trialDays;
  }
  if (options.coupon) {
    subscriptionParams.coupon = options.coupon;
  }
  if (options.offSession) {
    subscriptionParams.off_session = true;
  }

  const subscription = await stripe.subscriptions.create(subscriptionParams);
  logger.info('Subscription created', { subscriptionId: subscription.id, userId });
  return { ...subscription, id: subscription.id };
}

async function cancelSubscription(subscriptionId, atPeriodEnd = true) {
  if (!stripe) {
    logger.info('Demo subscription cancelled', { subscriptionId });
    return { status: atPeriodEnd ? 'canceled' : 'canceled', id: subscriptionId };
  }
  const sub = atPeriodEnd
    ? await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true })
    : await stripe.subscriptions.cancel(subscriptionId);
  logger.info('Subscription cancelled', { subscriptionId, atPeriodEnd });
  return sub;
}

async function updateSubscription(subscriptionId, updates) {
  if (!stripe) {
    return { ...updates, id: subscriptionId };
  }
  return stripe.subscriptions.update(subscriptionId, updates);
}

async function listSubscriptions(userId, status = 'all') {
  if (!stripe) {
    return db.find('user_subscriptions', { where: { user_id: userId } });
  }
  const params = { customer: String(userId), limit: 100 };
  if (status !== 'all') params.status = status;
  const subs = await stripe.subscriptions.list(params);
  return subs.data;
}

async function handleInvoicePaid(invoice) {
  logger.info('Invoice paid', { invoiceId: invoice.id, amount: invoice.amount_paid / 100 });
  try {
    const existing = await db.findOne('invoices', { where: { stripe_invoice_id: invoice.id } });
    if (!existing) {
      await db.insert('invoices', {
        user_id: invoice.metadata?.user_id || '',
        stripe_invoice_id: invoice.id,
        subscription_id: invoice.subscription,
        amount_paid: invoice.amount_paid / 100,
        currency: invoice.currency,
        status: 'paid',
        paid_at: new Date().toISOString(),
        invoice_pdf: invoice.invoice_pdf || '',
        lines: JSON.stringify(invoice.lines?.data || []),
      });
    }
  } catch (e) {
    logger.error('Failed to record invoice', { error: e.message, invoiceId: invoice.id });
  }
}

async function handleInvoicePaymentFailed(invoice) {
  logger.warn('Invoice payment failed', { invoiceId: invoice.id, attempt: invoice.attempt_count });
  try {
    await db.run(
      'UPDATE subscriptions SET payment_failures = payment_failures + 1, last_payment_failure = $1 WHERE stripe_subscription_id = $2',
      [new Date().toISOString(), invoice.subscription]
    );
  } catch (e) {
    logger.error('Failed to record payment failure', { error: e.message });
  }
}

async function handleSubscriptionUpdated(subscription) {
  logger.info('Subscription updated', { subscriptionId: subscription.id, status: subscription.status });
  try {
    await db.run(
      'UPDATE user_subscriptions SET status = $1, current_period_start = $2, current_period_end = $3, cancel_at_period_end = $4 WHERE stripe_subscription_id = $5',
      [subscription.status, new Date(subscription.current_period_start * 1000).toISOString(), new Date(subscription.current_period_end * 1000).toISOString(), subscription.cancel_at_period_end, subscription.id]
    );
  } catch (e) {
    logger.error('Failed to update subscription record', { error: e.message });
  }
}

async function handleSubscriptionDeleted(subscription) {
  logger.info('Subscription deleted', { subscriptionId: subscription.id });
  try {
    await db.run(
      "UPDATE user_subscriptions SET status = 'canceled', canceled_at = $1 WHERE stripe_subscription_id = $2",
      [new Date().toISOString(), subscription.id]
    );
  } catch (e) {
    logger.error('Failed to mark subscription canceled', { error: e.message });
  }
}

async function createPlan(name, amount, currency = DEFAULT_CURRENCY, interval = 'month', options = {}) {
  if (!stripe) {
    return {
      id: 'price_demo_' + Date.now(), product: 'prod_demo',
      name, amount, currency, interval, active: true,
    };
  }

  const product = await stripe.products.create({
    name,
    description: options.description || '',
    metadata: options.productMetadata || {},
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: Math.round(amount * 100),
    currency,
    recurring: { interval, interval_count: options.intervalCount || 1 },
    metadata: options.priceMetadata || {},
  });

  return { id: price.id, product: product.id, name, amount, currency, interval };
}

async function listPlans(includeInactive = false) {
  if (!stripe) {
    return [];
  }
  const prices = await stripe.prices.list({ limit: 100, active: !includeInactive ? true : undefined });
  const plans = [];
  for (const price of prices.data) {
    if (price.recurring) {
      const product = await stripe.products.retrieve(price.product);
      plans.push({
        id: price.id,
        productId: price.product,
        name: product.name,
        description: product.description,
        amount: price.unit_amount / 100,
        currency: price.currency,
        interval: price.recurring.interval,
        intervalCount: price.recurring.interval_count,
        active: price.active,
      });
    }
  }
  return plans;
}

async function createCoupon(code, percentOff, duration = 'once', maxRedemptions = null) {
  if (!stripe) {
    return { id: code, percent_off: percentOff, duration, max_redemptions: maxRedemptions };
  }
  return stripe.coupons.create({
    id: code,
    percent_off: percentOff,
    duration,
    max_redemptions,
    redeem_by: Math.floor(Date.now() / 1000) + 365 * 86400,
  });
}

async function getBillingHistory(userId, limit = 10) {
  if (!stripe) {
    const orders = await db.find('orders', { where: { user_id: userId }, limit });
    return orders.map(o => ({
      id: o.stripe_session_id,
      amount: o.amount_total / 100,
      currency: o.currency,
      status: o.status,
      date: o.completed_at,
    }));
  }

  const paymentIntents = await stripe.paymentIntents.list({
    customer: String(userId),
    limit,
  });

  return paymentIntents.data.map(pi => ({
    id: pi.id,
    amount: pi.amount / 100,
    currency: pi.currency,
    status: pi.status,
    date: new Date(pi.created * 1000).toISOString(),
    paymentMethod: pi.payment_method_types?.[0] || 'unknown',
  }));
}

async function getPaymentMethod(userId) {
  if (!stripe) return { brand: 'visa', last4: '4242', expMonth: 12, expYear: 2027, id: 'pm_demo' };
  const methods = await stripe.paymentMethods.list({ customer: String(userId), type: 'card' });
  if (methods.data.length === 0) return null;
  const pm = methods.data[0];
  return {
    id: pm.id,
    brand: pm.card?.brand,
    last4: pm.card?.last4,
    expMonth: pm.card?.exp_month,
    expYear: pm.card?.exp_year,
    billingDetails: pm.billing_details,
  };
}

async function attachPaymentMethod(userId, paymentMethodId) {
  if (!stripe) return { id: paymentMethodId, attached: true };
  return stripe.paymentMethods.attach(paymentMethodId, { customer: String(userId) });
}

async function detachPaymentMethod(paymentMethodId) {
  if (!stripe) return { id: paymentMethodId, detached: true };
  return stripe.paymentMethods.detach(paymentMethodId);
}

async function generateInvoicePdf(invoiceId) {
  if (!stripe) return null;
  const invoice = await stripe.invoices.retrieve(invoiceId);
  return invoice.invoice_pdf || null;
}

module.exports = {
  createCheckoutSession, createPaymentIntent, confirmPaymentIntent,
  handleWebhook, fulfillOrder, refundPayment,
  createSubscription, cancelSubscription, updateSubscription, listSubscriptions,
  createPlan, listPlans, createCoupon,
  getBillingHistory, getPaymentMethod, attachPaymentMethod, detachPaymentMethod,
  generateInvoicePdf, registerWebhookHandler,
  TAX_RATE, DEFAULT_CURRENCY,
};
