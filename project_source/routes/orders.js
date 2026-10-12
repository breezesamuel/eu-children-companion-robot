const express = require('express');
const router = express.Router();
const db = require('../utils/database');
const payment = require('../services/payment');
const logger = require('../utils/logger');

const { PRODUCTS } = require('./products');

const ORDER_STATUSES = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded', 'failed'];
const FULFILLMENT_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'failed'];

router.get('/statuses', (req, res) => {
  res.json({
    success: true,
    data: {
      orderStatuses: ORDER_STATUSES,
      fulfillmentStatuses: FULFILLMENT_STATUSES
    }
  });
});

router.get('/my', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { status, limit = 50, offset = 0, startDate, endDate } = req.query;

    let orders;
    try {
      let query = 'SELECT * FROM orders WHERE user_id = $1';
      const params = [userId];
      let paramIndex = 2;

      if (status) {
        query += ` AND status = $${paramIndex++}`;
        params.push(status);
      }
      if (startDate) {
        query += ` AND created_at >= $${paramIndex++}`;
        params.push(startDate);
      }
      if (endDate) {
        query += ` AND created_at <= $${paramIndex++}`;
        params.push(endDate);
      }

      query += ' ORDER BY created_at DESC LIMIT $' + paramIndex++ + ' OFFSET $' + paramIndex++;
      params.push(parseInt(limit), parseInt(offset));

      orders = await db.query(query, params);
    } catch (e) {
      orders = (db.getTable('orders') || [])
        .filter(o => o.user_id === userId)
        .filter(o => !status || o.status === status)
        .filter(o => !startDate || new Date(o.created_at) >= new Date(startDate))
        .filter(o => !endDate || new Date(o.created_at) <= new Date(endDate))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    }

    const ordersWithParsedItems = orders.map(o => ({
      ...o,
      items: o.items ? (typeof o.items === 'string' ? JSON.parse(o.items) : o.items) : []
    }));

    res.json({
      success: true,
      data: ordersWithParsedItems,
      pagination: { limit: parseInt(limit), offset: parseInt(offset) }
    });
  } catch (error) {
    logger.error('Order list error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/my/:id', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let order;
    try {
      order = await db.queryOne('SELECT * FROM orders WHERE id = $1 AND user_id = $2', [req.params.id, userId]);
    } catch (e) {
      order = (db.getTable('orders') || []).find(o => o.id == req.params.id && o.user_id === userId);
    }

    if (!order) return res.status(404).json({ error: 'Order not found' });

    let shipments;
    try {
      shipments = await db.query('SELECT * FROM shipments WHERE order_id = $1 ORDER BY created_at DESC', [order.id]);
    } catch (e) {
      shipments = (db.getTable('shipments') || []).filter(s => s.order_id == order.id);
    }

    let orderHistory;
    try {
      orderHistory = await db.query('SELECT * FROM order_history WHERE order_id = $1 ORDER BY created_at ASC', [order.id]);
    } catch (e) {
      orderHistory = (db.getTable('order_history') || []).filter(h => h.order_id == order.id);
    }

    let refunds;
    try {
      refunds = await db.query('SELECT * FROM refunds WHERE order_id = $1 ORDER BY created_at DESC', [order.id]);
    } catch (e) {
      refunds = (db.getTable('refunds') || []).filter(r => r.order_id == order.id);
    }

    res.json({
      success: true,
      data: {
        ...order,
        items: order.items ? (typeof order.items === 'string' ? JSON.parse(order.items) : order.items) : [],
        shipments,
        history: orderHistory,
        refunds
      }
    });
  } catch (error) {
    logger.error('Get order error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/create', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { items, shippingAddress, billingAddress, couponCode, metadata } = req.body;
    if (!items || !items.length) return res.status(400).json({ error: 'Items required' });

    const resolvedItems = items.map(item => {
      const product = PRODUCTS.find(p => p.id === item.productId);
      if (!product) throw new Error(`Product ${item.productId} not found`);
      return {
        ...product,
        productId: item.productId,
        quantity: item.quantity || 1,
        price: item.price || product.price,
        currency: item.currency || product.currency || 'eur'
      };
    });

    let discount = 0;
    let coupon = null;
    if (couponCode) {
      try {
        coupon = await db.queryOne(
          'SELECT * FROM coupons WHERE code = $1 AND active = true AND (valid_until IS NULL OR valid_until >= CURRENT_TIMESTAMP)',
          [couponCode]
        );
      } catch (e) {
        coupon = (db.getTable('coupons') || []).find(c =>
          c.code === couponCode &&
          c.active !== false &&
          (!c.valid_until || new Date(c.valid_until) >= new Date())
        );
      }
      if (coupon) {
        const subtotal = resolvedItems.reduce((sum, i) => sum + (i.price * (i.quantity || 1)), 0);
        if (coupon.discount_type === 'percentage') {
          discount = subtotal * (coupon.discount_amount / 100);
        } else {
          discount = coupon.discount_amount;
        }
        discount = Math.min(discount, subtotal);
      }
    }

    const subtotal = resolvedItems.reduce((sum, i) => sum + (i.price * (i.quantity || 1)), 0);
    const shipping = 0;
    const tax = subtotal * 0.2;
    const total = Math.max(0, subtotal + shipping + tax - discount);

    const orderData = {
      user_id: userId,
      order_number: generateOrderNumber(),
      items: JSON.stringify(resolvedItems.map(i => ({
        productId: i.productId,
        name: i.name,
        quantity: i.quantity,
        price: i.price,
        currency: i.currency
      }))),
      subtotal,
      shipping,
      tax,
      discount,
      amount_total: total,
      currency: resolvedItems[0]?.currency || 'eur',
      status: 'pending',
      shipping_address: shippingAddress ? JSON.stringify(shippingAddress) : null,
      billing_address: billingAddress ? JSON.stringify(billingAddress) : null,
      coupon_id: coupon?.id || null,
      metadata: metadata ? JSON.stringify(metadata) : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let result;
    try {
      result = await db.insert('orders', orderData);
    } catch (e) {
      if (!db.tables.orders) db.tables.orders = [];
      if (!db.ids) db.ids = {};
      const newId = (db.ids.orders || 0) + 1;
      db.ids.orders = newId;
      result = { insertId: newId };
      db.tables.orders.push({ id: newId, ...orderData });
    }

    await addOrderHistory(result.insertId, 'order_created', userId, { status: 'pending' });

    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        order_number: orderData.order_number,
        ...orderData,
        items: resolvedItems,
        shippingAddress,
        billingAddress,
        metadata
      }
    });
  } catch (error) {
    logger.error('Order creation error', { error: error.message });
    res.status(500).json({ error: error.message || 'Order creation failed' });
  }
});

router.post('/create-checkout', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { items, successUrl, cancelUrl, shippingAddress, billingAddress, couponCode, metadata } = req.body;
    if (!items || !items.length) return res.status(400).json({ error: 'Items required' });

    const resolvedItems = items.map(item => {
      const product = PRODUCTS.find(p => p.id === item.productId);
      if (!product) throw new Error(`Product ${item.productId} not found`);
      return { ...product, quantity: item.quantity || 1 };
    });

    const session = await payment.createCheckoutSession(
      userId,
      resolvedItems,
      successUrl || `${req.protocol}://${req.get('host')}/checkout/success`,
      cancelUrl || `${req.protocol}://${req.get('host')}/checkout/cancel`
    );

    const orderData = {
      user_id: userId,
      order_number: generateOrderNumber(),
      stripe_session_id: session.id,
      items: JSON.stringify(resolvedItems.map(i => ({ id: i.id, qty: i.quantity, price: i.price }))),
      subtotal: resolvedItems.reduce((sum, i) => sum + i.price * (i.quantity || 1), 0),
      shipping: 0,
      tax: 0,
      discount: 0,
      amount_total: resolvedItems.reduce((sum, i) => sum + i.price * (i.quantity || 1), 0),
      currency: resolvedItems[0]?.currency || 'eur',
      status: 'pending',
      shipping_address: shippingAddress ? JSON.stringify(shippingAddress) : null,
      billing_address: billingAddress ? JSON.stringify(billingAddress) : null,
      metadata: metadata ? JSON.stringify(metadata) : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let result;
    try {
      result = await db.insert('orders', orderData);
      await addOrderHistory(result.insertId, 'checkout_created', userId, { sessionId: session.id });
    } catch (e) {
      await db.run(
        'INSERT INTO orders (user_id, order_number, stripe_session_id, items, subtotal, shipping, tax, discount, amount_total, currency, status, shipping_address, billing_address, metadata, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)',
        [orderData.user_id, orderData.order_number, orderData.stripe_session_id, orderData.items, orderData.subtotal, orderData.shipping, orderData.tax, orderData.discount, orderData.amount_total, orderData.currency, orderData.status, orderData.shipping_address, orderData.billing_address, orderData.metadata, orderData.created_at, orderData.updated_at]
      );
    }

    res.json({ success: true, sessionId: session.id, url: session.url, orderNumber: orderData.order_number });
  } catch (error) {
    logger.error('Checkout creation error', { error: error.message });
    res.status(500).json({ error: error.message || 'Checkout creation failed' });
  }
});

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const event = await payment.handleWebhook(req.body, sig);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      await payment.fulfillOrder(event.data);

      try {
        const order = await db.queryOne('SELECT * FROM orders WHERE stripe_session_id = $1', [session.id]);
        if (order) {
          await db.run(
            'UPDATE orders SET status = $1, paid_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE stripe_session_id = $2',
            ['paid', session.id]
          );
          await addOrderHistory(order.id, 'payment_received', order.user_id, { sessionId: session.id });
        }
      } catch (e) {
        const orders = db.tables.orders || [];
        const order = orders.find(o => o.stripe_session_id === session.id);
        if (order) {
          order.status = 'paid';
          order.paid_at = new Date().toISOString();
          order.updated_at = new Date().toISOString();
          await addOrderHistory(order.id, 'payment_received', order.user_id, { sessionId: session.id });
        }
      }
    }

    if (event.type === 'invoice.paid') {
      const invoice = event.data.object;
      try {
        await db.run(
          'UPDATE user_subscriptions SET status = $1, current_period_start = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE stripe_subscription_id = $2',
          ['active', invoice.subscription]
        );
      } catch (e) { /* ignore */ }
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object;
      try {
        await db.run(
          'UPDATE user_subscriptions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE stripe_subscription_id = $2',
          ['past_due', invoice.subscription]
        );
      } catch (e) { /* ignore */ }
    }

    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      try {
        await db.run(
          'UPDATE user_subscriptions SET status = $1, cancel_at_period_end = $2, updated_at = CURRENT_TIMESTAMP WHERE stripe_subscription_id = $3',
          [subscription.status, subscription.cancel_at_period_end, subscription.id]
        );
      } catch (e) { /* ignore */ }
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook error', { error: error.message });
    res.status(400).json({ error: error.message });
  }
});

router.put('/my/:id/status', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { status, reason } = req.body;
    if (!status) return res.status(400).json({ error: 'Status required' });

    let order;
    try {
      order = await db.queryOne('SELECT * FROM orders WHERE id = $1 AND user_id = $2', [req.params.id, userId]);
    } catch (e) {
      order = (db.getTable('orders') || []).find(o => o.id == req.params.id && o.user_id === userId);
    }

    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (status === 'cancelled' && !['pending', 'paid'].includes(order.status)) {
      return res.status(400).json({ error: 'Cannot cancel order in current status' });
    }

    const oldStatus = order.status;

    try {
      await db.run(
        'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [status, req.params.id]
      );
    } catch (e) {
      const idx = (db.tables.orders || []).findIndex(o => o.id == req.params.id);
      if (idx >= 0) {
        db.tables.orders[idx].status = status;
        db.tables.orders[idx].updated_at = new Date().toISOString();
      }
    }

    await addOrderHistory(req.params.id, 'status_changed', userId, {
      oldStatus,
      newStatus: status,
      reason
    });

    res.json({ success: true, message: 'Order status updated', data: { oldStatus, newStatus: status } });
  } catch (error) {
    logger.error('Update order status error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.post('/my/:id/cancel', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { reason } = req.body;

    let order;
    try {
      order = await db.queryOne('SELECT * FROM orders WHERE id = $1 AND user_id = $2', [req.params.id, userId]);
    } catch (e) {
      order = (db.getTable('orders') || []).find(o => o.id == req.params.id && o.user_id === userId);
    }

    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (!['pending', 'paid'].includes(order.status)) {
      return res.status(400).json({ error: 'Cannot cancel order in current status' });
    }

    const oldStatus = order.status;

    try {
      await db.run(
        'UPDATE orders SET status = $1, cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['cancelled', req.params.id]
      );
    } catch (e) {
      const idx = (db.tables.orders || []).findIndex(o => o.id == req.params.id);
      if (idx >= 0) {
        db.tables.orders[idx].status = 'cancelled';
        db.tables.orders[idx].cancelled_at = new Date().toISOString();
        db.tables.orders[idx].updated_at = new Date().toISOString();
      }
    }

    await addOrderHistory(req.params.id, 'order_cancelled', userId, { oldStatus, reason });

    res.json({ success: true, message: 'Order cancelled' });
  } catch (error) {
    logger.error('Cancel order error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.post('/my/:id/refund', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { reason, amount, items, fullRefund = true } = req.body;

    let order;
    try {
      order = await db.queryOne('SELECT * FROM orders WHERE id = $1 AND user_id = $2', [req.params.id, userId]);
    } catch (e) {
      order = (db.getTable('orders') || []).find(o => o.id == req.params.id && o.user_id === userId);
    }

    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.status !== 'paid' && order.status !== 'delivered' && order.status !== 'completed') {
      return res.status(400).json({ error: 'Cannot refund order in current status' });
    }

    const refundAmount = fullRefund ? order.amount_total : (amount || 0);
    if (refundAmount > order.amount_total) {
      return res.status(400).json({ error: 'Refund amount cannot exceed order total' });
    }

    let stripeRefundId = null;
    if (order.stripe_payment_intent_id) {
      try {
        const refund = await payment.createRefund(order.stripe_payment_intent_id, refundAmount, reason);
        stripeRefundId = refund.id;
      } catch (e) {
        logger.warn('Stripe refund failed', { error: e.message });
      }
    }

    const refundRecord = {
      order_id: order.id,
      user_id: userId,
      stripe_refund_id: stripeRefundId,
      amount: refundAmount,
      currency: order.currency,
      reason: reason || null,
      items: items ? JSON.stringify(items) : null,
      status: stripeRefundId ? 'processed' : 'pending',
      full_refund: fullRefund,
      created_at: new Date().toISOString()
    };

    let result;
    try {
      result = await db.insert('refunds', refundRecord);
    } catch (e) {
      if (!db.tables.refunds) db.tables.refunds = [];
      if (!db.ids) db.ids = {};
      const newId = (db.ids.refunds || 0) + 1;
      db.ids.refunds = newId;
      result = { insertId: newId };
      db.tables.refunds.push({ id: newId, ...refundRecord });
    }

    if (fullRefund && refundAmount >= order.amount_total) {
      try {
        await db.run(
          'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          ['refunded', req.params.id]
        );
      } catch (e) {
        const idx = (db.tables.orders || []).findIndex(o => o.id == req.params.id);
        if (idx >= 0) {
          db.tables.orders[idx].status = 'refunded';
          db.tables.orders[idx].updated_at = new Date().toISOString();
        }
      }
    }

    await addOrderHistory(req.params.id, 'refund_created', userId, {
      refundId: result.insertId,
      amount: refundAmount,
      reason,
      fullRefund
    });

    res.status(201).json({
      success: true,
      message: 'Refund processed',
      data: { id: result.insertId, ...refundRecord }
    });
  } catch (error) {
    logger.error('Create refund error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.get('/my/:id/shipments', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let order;
    try {
      order = await db.queryOne('SELECT * FROM orders WHERE id = $1 AND user_id = $2', [req.params.id, userId]);
    } catch (e) {
      order = (db.getTable('orders') || []).find(o => o.id == req.params.id && o.user_id === userId);
    }

    if (!order) return res.status(404).json({ error: 'Order not found' });

    let shipments;
    try {
      shipments = await db.query(
        `SELECT s.*, t.tracking_events
         FROM shipments s
         LEFT JOIN tracking t ON s.id = t.shipment_id
         WHERE s.order_id = $1
         ORDER BY s.created_at DESC`,
        [req.params.id]
      );
    } catch (e) {
      shipments = (db.getTable('shipments') || []).filter(s => s.order_id == req.params.id);
    }

    const shipmentsWithTracking = shipments.map(s => ({
      ...s,
      tracking_events: s.tracking_events ? JSON.parse(s.tracking_events) : []
    }));

    res.json({ success: true, data: shipmentsWithTracking });
  } catch (error) {
    logger.error('Get shipments error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/my/:id/return', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { reason, items, description } = req.body;
    if (!reason) return res.status(400).json({ error: 'Reason required' });

    let order;
    try {
      order = await db.queryOne('SELECT * FROM orders WHERE id = $1 AND user_id = $2', [req.params.id, userId]);
    } catch (e) {
      order = (db.getTable('orders') || []).find(o => o.id == req.params.id && o.user_id === userId);
    }

    if (!order) return res.status(404).json({ error: 'Order not found' });

    const returnRecord = {
      order_id: order.id,
      user_id: userId,
      reason,
      items: items ? JSON.stringify(items) : null,
      description: description || null,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let result;
    try {
      result = await db.insert('returns', returnRecord);
    } catch (e) {
      if (!db.tables.returns) db.tables.returns = [];
      if (!db.ids) db.ids = {};
      const newId = (db.ids.returns || 0) + 1;
      db.ids.returns = newId;
      result = { insertId: newId };
      db.tables.returns.push({ id: newId, ...returnRecord });
    }

    await addOrderHistory(req.params.id, 'return_requested', userId, {
      returnId: result.insertId,
      reason,
      items
    });

    res.status(201).json({
      success: true,
      message: 'Return request submitted',
      data: { id: result.insertId, ...returnRecord }
    });
  } catch (error) {
    logger.error('Create return error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.get('/search', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { q, status, orderNumber, limit = 50, offset = 0 } = req.query;

    let orders = (db.getTable('orders') || [])
      .filter(o => o.user_id === userId);

    if (q) {
      const searchTerm = q.toLowerCase();
      orders = orders.filter(o =>
        (o.order_number && o.order_number.toLowerCase().includes(searchTerm)) ||
        (o.status && o.status.toLowerCase().includes(searchTerm))
      );
    }

    if (status) {
      orders = orders.filter(o => o.status === status);
    }

    if (orderNumber) {
      orders = orders.filter(o => o.order_number === orderNumber);
    }

    orders = orders
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    const ordersWithParsedItems = orders.map(o => ({
      ...o,
      items: o.items ? (typeof o.items === 'string' ? JSON.parse(o.items) : o.items) : []
    }));

    res.json({
      success: true,
      data: ordersWithParsedItems,
      pagination: { limit: parseInt(limit), offset: parseInt(offset) }
    });
  } catch (error) {
    logger.error('Order search error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/invoices/:id', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let invoice;
    try {
      invoice = await db.queryOne(
        `SELECT i.*, o.order_number, o.shipping_address, o.billing_address
         FROM invoices i
         JOIN orders o ON i.order_id = o.id
         WHERE i.id = $1 AND i.user_id = $2`,
        [req.params.id, userId]
      );
    } catch (e) {
      const invoices = db.getTable('invoices') || [];
      const orders = db.getTable('orders') || [];
      const inv = invoices.find(i => i.id == req.params.id && i.user_id === userId);
      if (inv) {
        const order = orders.find(o => o.id == inv.order_id);
        invoice = {
          ...inv,
          order_number: order?.order_number,
          shipping_address: order?.shipping_address,
          billing_address: order?.billing_address
        };
      }
    }

    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    res.json({
      success: true,
      data: {
        ...invoice,
        shipping_address: invoice.shipping_address ? JSON.parse(invoice.shipping_address) : null,
        billing_address: invoice.billing_address ? JSON.parse(invoice.billing_address) : null,
        items: invoice.items ? JSON.parse(invoice.items) : []
      }
    });
  } catch (error) {
    logger.error('Get invoice error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/my/:id/invoice', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let order;
    try {
      order = await db.queryOne('SELECT * FROM orders WHERE id = $1 AND user_id = $2', [req.params.id, userId]);
    } catch (e) {
      order = (db.getTable('orders') || []).find(o => o.id == req.params.id && o.user_id === userId);
    }

    if (!order) return res.status(404).json({ error: 'Order not found' });

    const existingInvoice = (db.getTable('invoices') || []).find(i => i.order_id == order.id);
    if (existingInvoice) {
      return res.json({ success: true, data: existingInvoice, message: 'Invoice already exists' });
    }

    const invoiceData = {
      user_id: userId,
      order_id: order.id,
      invoice_number: `INV-${order.order_number}`,
      items: order.items,
      subtotal: order.subtotal || order.amount_total,
      shipping: order.shipping || 0,
      tax: order.tax || 0,
      discount: order.discount || 0,
      total: order.amount_total,
      currency: order.currency,
      status: 'generated',
      billing_address: order.billing_address,
      shipping_address: order.shipping_address,
      issued_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    let result;
    try {
      result = await db.insert('invoices', invoiceData);
    } catch (e) {
      if (!db.tables.invoices) db.tables.invoices = [];
      if (!db.ids) db.ids = {};
      const newId = (db.ids.invoices || 0) + 1;
      db.ids.invoices = newId;
      result = { insertId: newId };
      db.tables.invoices.push({ id: newId, ...invoiceData });
    }

    await addOrderHistory(req.params.id, 'invoice_generated', userId, { invoiceId: result.insertId });

    res.status(201).json({
      success: true,
      message: 'Invoice generated',
      data: { id: result.insertId, ...invoiceData }
    });
  } catch (error) {
    logger.error('Generate invoice error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.post('/bulk-action', async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

    const { action, orderIds, data } = req.body;
    if (!action || !orderIds || !orderIds.length) {
      return res.status(400).json({ error: 'action and orderIds are required' });
    }

    const results = { success: [], failed: [] };

    for (const orderId of orderIds) {
      try {
        switch (action) {
          case 'cancel':
            await db.run(
              'UPDATE orders SET status = $1, cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
              ['cancelled', orderId]
            );
            results.success.push(orderId);
            break;

          case 'update_status':
            if (data?.status) {
              await db.run(
                'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                [data.status, orderId]
              );
              results.success.push(orderId);
            }
            break;

          default:
            results.failed.push({ orderId, reason: 'Unknown action' });
        }
      } catch (e) {
        results.failed.push({ orderId, reason: e.message });
      }
    }

    res.json({
      success: true,
      data: {
        action,
        total: orderIds.length,
        successCount: results.success.length,
        failedCount: results.failed.length,
        success: results.success,
        failed: results.failed
      }
    });
  } catch (error) {
    logger.error('Bulk order action error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.get('/analytics', async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

    const orders = db.getTable('orders') || [];
    const now = new Date();
    const last30d = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const last7d = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const analytics = {
      summary: {
        total: orders.length,
        totalRevenue: orders.filter(o => o.status === 'paid' || o.status === 'completed' || o.status === 'delivered')
          .reduce((sum, o) => sum + (o.amount_total || 0), 0),
        averageOrderValue: orders.length > 0
          ? Math.round(orders.reduce((sum, o) => sum + (o.amount_total || 0), 0) / orders.length)
          : 0
      },
      byStatus: {},
      byPeriod: {
        last30d: orders.filter(o => new Date(o.created_at) >= last30d).length,
        last7d: orders.filter(o => new Date(o.created_at) >= last7d).length
      },
      recentOrders: orders
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10)
        .map(o => ({
          ...o,
          items: o.items ? (typeof o.items === 'string' ? JSON.parse(o.items) : o.items) : []
        }))
    };

    ORDER_STATUSES.forEach(status => {
      analytics.byStatus[status] = orders.filter(o => o.status === status).length;
    });

    res.json({ success: true, data: analytics });
  } catch (error) {
    logger.error('Order analytics error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

function generateOrderNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${year}${month}-${random}`;
}

async function addOrderHistory(orderId, event, userId, details = {}) {
  const history = {
    order_id: orderId,
    user_id: userId,
    event,
    details: Object.keys(details).length > 0 ? JSON.stringify(details) : null,
    created_at: new Date().toISOString()
  };

  try {
    await db.insert('order_history', history);
  } catch (e) {
    if (!db.tables.order_history) db.tables.order_history = [];
    db.tables.order_history.push(history);
  }
}

module.exports = router;
