const express = require('express');
const router = express.Router();
const db = require('../utils/database');
const payment = require('../services/payment');
const logger = require('../utils/logger');

const BILLING_CYCLES = ['monthly', 'quarterly', 'yearly'];
const SUBSCRIPTION_STATUSES = ['active', 'pending', 'past_due', 'canceled', 'expired', 'suspended', 'trialing'];
const PLAN_INTERVALS = ['day', 'week', 'month', 'year'];

router.get('/plans', async (req, res) => {
  try {
    let plans;
    try {
      plans = await db.query('SELECT * FROM subscription_plans WHERE active = true ORDER BY sort_order, price ASC');
    } catch (e) {
      plans = (db.getTable('subscription_plans') || [])
        .filter(p => p.active !== false)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.price - b.price);
    }

    const plansWithFeatures = plans.map(p => ({
      ...p,
      features: p.features ? JSON.parse(p.features) : [],
      limits: p.limits ? JSON.parse(p.limits) : {},
      metadata: p.metadata ? JSON.parse(p.metadata) : {}
    }));

    res.json({ success: true, data: plansWithFeatures });
  } catch (error) {
    logger.error('Get plans error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/plans/:id', async (req, res) => {
  try {
    let plan;
    try {
      plan = await db.queryOne('SELECT * FROM subscription_plans WHERE id = $1', [req.params.id]);
    } catch (e) {
      plan = (db.getTable('subscription_plans') || []).find(p => p.id == req.params.id);
    }

    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    res.json({
      success: true,
      data: {
        ...plan,
        features: plan.features ? JSON.parse(plan.features) : [],
        limits: plan.limits ? JSON.parse(plan.limits) : {},
        metadata: plan.metadata ? JSON.parse(plan.metadata) : {}
      }
    });
  } catch (error) {
    logger.error('Get plan error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/plans', async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

    const { name, description, price, currency = 'eur', interval = 'month', interval_count = 1, trial_days = 0, features, limits, metadata, active = true, sort_order } = req.body;

    if (!name || price === undefined) return res.status(400).json({ error: 'Name and price are required' });
    if (!PLAN_INTERVALS.includes(interval)) {
      return res.status(400).json({ error: `Invalid interval. Must be one of: ${PLAN_INTERVALS.join(', ')}` });
    }

    const plan = {
      name,
      description: description || '',
      price: parseFloat(price),
      currency,
      interval,
      interval_count: parseInt(interval_count) || 1,
      trial_days: parseInt(trial_days) || 0,
      features: features ? JSON.stringify(features) : '[]',
      limits: limits ? JSON.stringify(limits) : '{}',
      metadata: metadata ? JSON.stringify(metadata) : '{}',
      active,
      sort_order: sort_order !== undefined ? parseInt(sort_order) : 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let result;
    try {
      result = await db.insert('subscription_plans', plan);
    } catch (e) {
      if (!db.tables.subscription_plans) db.tables.subscription_plans = [];
      if (!db.ids) db.ids = {};
      const newId = (db.ids.subscription_plans || 0) + 1;
      db.ids.subscription_plans = newId;
      result = { insertId: newId };
      db.tables.subscription_plans.push({ id: newId, ...plan });
    }

    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        ...plan,
        features,
        limits,
        metadata
      }
    });
  } catch (error) {
    logger.error('Create plan error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.put('/plans/:id', async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

    const { name, description, price, interval, interval_count, trial_days, features, limits, metadata, active, sort_order } = req.body;

    let plan;
    try {
      plan = await db.queryOne('SELECT * FROM subscription_plans WHERE id = $1', [req.params.id]);
    } catch (e) {
      plan = (db.getTable('subscription_plans') || []).find(p => p.id == req.params.id);
    }

    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    const updates = { updated_at: new Date().toISOString() };
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (price !== undefined) updates.price = parseFloat(price);
    if (interval && PLAN_INTERVALS.includes(interval)) updates.interval = interval;
    if (interval_count !== undefined) updates.interval_count = parseInt(interval_count);
    if (trial_days !== undefined) updates.trial_days = parseInt(trial_days);
    if (features) updates.features = JSON.stringify(features);
    if (limits) updates.limits = JSON.stringify(limits);
    if (metadata) updates.metadata = JSON.stringify(metadata);
    if (active !== undefined) updates.active = active;
    if (sort_order !== undefined) updates.sort_order = parseInt(sort_order);

    try {
      await db.update('subscription_plans', updates, { id: req.params.id });
    } catch (e) {
      const idx = (db.tables.subscription_plans || []).findIndex(p => p.id == req.params.id);
      if (idx >= 0) db.tables.subscription_plans[idx] = { ...db.tables.subscription_plans[idx], ...updates };
    }

    res.json({ success: true, message: 'Plan updated' });
  } catch (error) {
    logger.error('Update plan error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.delete('/plans/:id', async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

    const activeSubscriptions = (db.getTable('user_subscriptions') || [])
      .filter(s => s.plan_id == req.params.id && s.status === 'active');

    if (activeSubscriptions.length > 0) {
      return res.status(400).json({ error: 'Cannot delete plan with active subscriptions. Archive it instead.' });
    }

    try {
      await db.run('DELETE FROM subscription_plans WHERE id = $1', [req.params.id]);
    } catch (e) {
      if (db.tables.subscription_plans) {
        db.tables.subscription_plans = db.tables.subscription_plans.filter(p => p.id != req.params.id);
      }
    }

    res.json({ success: true, message: 'Plan deleted' });
  } catch (error) {
    logger.error('Delete plan error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.get('/my', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let subs;
    try {
      subs = await db.query(
        `SELECT us.*, sp.name as plan_name, sp.features, sp.limits, sp.price, sp.currency
         FROM user_subscriptions us
         LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
         WHERE us.user_id = $1 ORDER BY us.created_at DESC`,
        [userId]
      );
    } catch (e) {
      const subsRaw = (db.getTable('user_subscriptions') || []).filter(s => s.user_id === userId);
      const plans = db.getTable('subscription_plans') || [];
      subs = subsRaw.map(s => {
        const plan = plans.find(p => p.id == s.plan_id);
        return {
          ...s,
          plan_name: plan?.name,
          features: plan?.features,
          limits: plan?.limits,
          price: plan?.price,
          currency: plan?.currency
        };
      });
    }

    const subsWithParsedData = subs.map(s => ({
      ...s,
      features: s.features ? JSON.parse(s.features) : [],
      limits: s.limits ? JSON.parse(s.limits) : {},
      metadata: s.metadata ? JSON.parse(s.metadata) : {}
    }));

    res.json({ success: true, data: subsWithParsedData });
  } catch (error) {
    logger.error('Subscription list error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/my/:id', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let sub;
    try {
      sub = await db.queryOne(
        `SELECT us.*, sp.name as plan_name, sp.features, sp.limits, sp.price, sp.currency, sp.description as plan_description
         FROM user_subscriptions us
         LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
         WHERE us.id = $1 AND us.user_id = $2`,
        [req.params.id, userId]
      );
    } catch (e) {
      const subsRaw = (db.getTable('user_subscriptions') || []).find(s => s.id == req.params.id && s.user_id === userId);
      if (subsRaw) {
        const plans = db.getTable('subscription_plans') || [];
        const plan = plans.find(p => p.id == subsRaw.plan_id);
        sub = {
          ...subsRaw,
          plan_name: plan?.name,
          features: plan?.features,
          limits: plan?.limits,
          price: plan?.price,
          currency: plan?.currency,
          plan_description: plan?.description
        };
      }
    }

    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    let invoices;
    try {
      invoices = await db.query(
        'SELECT * FROM invoices WHERE subscription_id = $1 ORDER BY created_at DESC',
        [sub.id]
      );
    } catch (e) {
      invoices = (db.getTable('invoices') || []).filter(i => i.subscription_id == sub.id);
    }

    res.json({
      success: true,
      data: {
        ...sub,
        features: sub.features ? JSON.parse(sub.features) : [],
        limits: sub.limits ? JSON.parse(sub.limits) : {},
        metadata: sub.metadata ? JSON.parse(sub.metadata) : {},
        invoices
      }
    });
  } catch (error) {
    logger.error('Get subscription error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/create', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { planId, paymentMethodId, couponCode, billingCycle = 'monthly', metadata } = req.body;
    if (!planId) return res.status(400).json({ error: 'planId required' });

    let plan;
    try {
      plan = await db.queryOne('SELECT * FROM subscription_plans WHERE id = $1 AND active = true', [planId]);
    } catch (e) {
      plan = (db.getTable('subscription_plans') || []).find(p => p.id == planId && p.active !== false);
    }

    if (!plan) return res.status(404).json({ error: 'Plan not found or unavailable' });

    let discount = 0;
    let coupon = null;
    if (couponCode) {
      try {
        coupon = await db.queryOne(
          'SELECT * FROM coupons WHERE code = $1 AND active = true AND (valid_until IS NULL OR valid_until >= CURRENT_TIMESTAMP) AND (max_uses IS NULL OR uses < max_uses)',
          [couponCode]
        );
      } catch (e) {
        coupon = (db.getTable('coupons') || []).find(c => 
          c.code === couponCode && 
          c.active !== false && 
          (!c.valid_until || new Date(c.valid_until) >= new Date()) &&
          (c.max_uses === null || c.max_uses === undefined || (c.uses || 0) < c.max_uses)
        );
      }
      if (coupon) {
        if (coupon.discount_type === 'percentage') {
          discount = plan.price * (coupon.discount_amount / 100);
        } else {
          discount = coupon.discount_amount;
        }
        discount = Math.min(discount, plan.price);
      }
    }

    const subscription = await payment.createSubscription(userId, planId, {
      paymentMethodId,
      billingCycle,
      coupon: couponCode,
      metadata
    });

    const now = new Date();
    const trialEnds = plan.trial_days > 0 
      ? new Date(now.getTime() + plan.trial_days * 24 * 60 * 60 * 1000)
      : null;

    const subData = {
      user_id: userId,
      plan_id: planId,
      stripe_subscription_id: subscription?.id || null,
      status: trialEnds ? 'trialing' : 'pending',
      current_period_start: now.toISOString(),
      current_period_end: trialEnds?.toISOString() || null,
      trial_start: trialEnds ? now.toISOString() : null,
      trial_end: trialEnds?.toISOString() || null,
      cancel_at_period_end: false,
      canceled_at: null,
      price: plan.price - discount,
      currency: plan.currency,
      billing_cycle: billingCycle,
      discount_amount: discount,
      coupon_id: coupon?.id || null,
      metadata: metadata ? JSON.stringify(metadata) : null,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    };

    let result;
    try {
      result = await db.insert('user_subscriptions', subData);
    } catch (e) {
      if (!db.tables.user_subscriptions) db.tables.user_subscriptions = [];
      if (!db.ids) db.ids = {};
      const newId = (db.ids.user_subscriptions || 0) + 1;
      db.ids.user_subscriptions = newId;
      result = { insertId: newId };
      db.tables.user_subscriptions.push({ id: newId, ...subData });
    }

    if (coupon) {
      try {
        await db.run('UPDATE coupons SET uses = COALESCE(uses, 0) + 1 WHERE id = $1', [coupon.id]);
      } catch (e) {
        const idx = (db.tables.coupons || []).findIndex(c => c.id == coupon.id);
        if (idx >= 0) db.tables.coupons[idx].uses = (db.tables.coupons[idx].uses || 0) + 1;
      }
    }

    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        ...subData,
        features: plan.features ? JSON.parse(plan.features) : [],
        metadata
      }
    });
  } catch (error) {
    logger.error('Subscription creation error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/upgrade', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { newPlanId, prorationBehavior = 'create_prorations', paymentMethodId } = req.body;
    if (!newPlanId) return res.status(400).json({ error: 'newPlanId required' });

    let sub;
    try {
      sub = await db.queryOne('SELECT * FROM user_subscriptions WHERE id = $1 AND user_id = $2', [req.params.id, userId]);
    } catch (e) {
      sub = (db.getTable('user_subscriptions') || []).find(s => s.id == req.params.id && s.user_id === userId);
    }

    if (!sub) return res.status(404).json({ error: 'Subscription not found' });
    if (sub.status !== 'active' && sub.status !== 'trialing') {
      return res.status(400).json({ error: 'Only active subscriptions can be upgraded' });
    }

    let newPlan;
    try {
      newPlan = await db.queryOne('SELECT * FROM subscription_plans WHERE id = $1 AND active = true', [newPlanId]);
    } catch (e) {
      newPlan = (db.getTable('subscription_plans') || []).find(p => p.id == newPlanId && p.active !== false);
    }

    if (!newPlan) return res.status(404).json({ error: 'New plan not found' });

    const result = await payment.upgradeSubscription(
      sub.stripe_subscription_id || sub.id,
      newPlanId,
      { prorationBehavior, paymentMethodId }
    );

    try {
      await db.run(
        'UPDATE user_subscriptions SET plan_id = $1, price = $2, currency = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4',
        [newPlanId, newPlan.price, newPlan.currency, req.params.id]
      );
    } catch (e) {
      const idx = (db.tables.user_subscriptions || []).findIndex(s => s.id == req.params.id);
      if (idx >= 0) {
        db.tables.user_subscriptions[idx].plan_id = newPlanId;
        db.tables.user_subscriptions[idx].price = newPlan.price;
        db.tables.user_subscriptions[idx].currency = newPlan.currency;
        db.tables.user_subscriptions[idx].updated_at = new Date().toISOString();
      }
    }

    const upgradeRecord = {
      subscription_id: req.params.id,
      old_plan_id: sub.plan_id,
      new_plan_id: newPlanId,
      old_price: sub.price,
      new_price: newPlan.price,
      proration_behavior: prorationBehavior,
      created_at: new Date().toISOString()
    };

    try {
      await db.insert('subscription_upgrades', upgradeRecord);
    } catch (e) {
      if (!db.tables.subscription_upgrades) db.tables.subscription_upgrades = [];
      db.tables.subscription_upgrades.push(upgradeRecord);
    }

    res.json({
      success: true,
      message: 'Subscription upgraded successfully',
      data: {
        oldPlanId: sub.plan_id,
        newPlanId,
        oldPrice: sub.price,
        newPrice: newPlan.price
      }
    });
  } catch (error) {
    logger.error('Subscription upgrade error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/downgrade', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { newPlanId, paymentMethodId } = req.body;
    if (!newPlanId) return res.status(400).json({ error: 'newPlanId required' });

    let sub;
    try {
      sub = await db.queryOne('SELECT * FROM user_subscriptions WHERE id = $1 AND user_id = $2', [req.params.id, userId]);
    } catch (e) {
      sub = (db.getTable('user_subscriptions') || []).find(s => s.id == req.params.id && s.user_id === userId);
    }

    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    let newPlan;
    try {
      newPlan = await db.queryOne('SELECT * FROM subscription_plans WHERE id = $1 AND active = true', [newPlanId]);
    } catch (e) {
      newPlan = (db.getTable('subscription_plans') || []).find(p => p.id == newPlanId && p.active !== false);
    }

    if (!newPlan) return res.status(404).json({ error: 'New plan not found' });

    try {
      await db.run(
        'UPDATE user_subscriptions SET plan_id_at_period_end = $1, cancel_at_period_end = true, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newPlanId, req.params.id]
      );
    } catch (e) {
      const idx = (db.tables.user_subscriptions || []).findIndex(s => s.id == req.params.id);
      if (idx >= 0) {
        db.tables.user_subscriptions[idx].plan_id_at_period_end = newPlanId;
        db.tables.user_subscriptions[idx].cancel_at_period_end = true;
        db.tables.user_subscriptions[idx].updated_at = new Date().toISOString();
      }
    }

    res.json({
      success: true,
      message: 'Downgrade scheduled for next billing cycle',
      data: {
        currentPlanId: sub.plan_id,
        nextPlanId: newPlanId,
        effectiveAt: sub.current_period_end
      }
    });
  } catch (error) {
    logger.error('Subscription downgrade error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.post('/cancel/:id', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { reason, cancelImmediately = false, feedback } = req.body;

    let sub;
    try {
      sub = await db.queryOne('SELECT * FROM user_subscriptions WHERE id = $1 AND user_id = $2', [req.params.id, userId]);
    } catch (e) {
      sub = (db.getTable('user_subscriptions') || []).find(s => s.id == req.params.id && s.user_id === userId);
    }

    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    if (cancelImmediately) {
      await payment.cancelSubscription(sub.stripe_subscription_id || sub.id);

      try {
        await db.run(
          'UPDATE user_subscriptions SET status = $1, canceled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          ['canceled', req.params.id]
        );
      } catch (e) {
        const idx = (db.tables.user_subscriptions || []).findIndex(s => s.id == req.params.id);
        if (idx >= 0) {
          db.tables.user_subscriptions[idx].status = 'canceled';
          db.tables.user_subscriptions[idx].canceled_at = new Date().toISOString();
          db.tables.user_subscriptions[idx].updated_at = new Date().toISOString();
        }
      }
    } else {
      try {
        await db.run(
          'UPDATE user_subscriptions SET cancel_at_period_end = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
          [req.params.id]
        );
      } catch (e) {
        const idx = (db.tables.user_subscriptions || []).findIndex(s => s.id == req.params.id);
        if (idx >= 0) {
          db.tables.user_subscriptions[idx].cancel_at_period_end = true;
          db.tables.user_subscriptions[idx].updated_at = new Date().toISOString();
        }
      }
    }

    if (reason || feedback) {
      const retentionRecord = {
        subscription_id: req.params.id,
        user_id: userId,
        cancel_reason: reason || null,
        feedback: feedback || null,
        canceled_immediately: cancelImmediately,
        created_at: new Date().toISOString()
      };

      try {
        await db.insert('subscription_cancellations', retentionRecord);
      } catch (e) {
        if (!db.tables.subscription_cancellations) db.tables.subscription_cancellations = [];
        db.tables.subscription_cancellations.push(retentionRecord);
      }
    }

    res.json({
      success: true,
      message: cancelImmediately ? 'Subscription canceled immediately' : 'Subscription scheduled to cancel at period end',
      data: {
        canceledAt: cancelImmediately ? new Date().toISOString() : null,
        effectiveAt: cancelImmediately ? new Date().toISOString() : sub.current_period_end
      }
    });
  } catch (error) {
    logger.error('Subscription cancel error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/reactivate', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let sub;
    try {
      sub = await db.queryOne('SELECT * FROM user_subscriptions WHERE id = $1 AND user_id = $2', [req.params.id, userId]);
    } catch (e) {
      sub = (db.getTable('user_subscriptions') || []).find(s => s.id == req.params.id && s.user_id === userId);
    }

    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    if (sub.status === 'canceled') {
      return res.status(400).json({ error: 'Cannot reactivate canceled subscription. Please create a new subscription.' });
    }

    if (!sub.cancel_at_period_end) {
      return res.json({ success: true, message: 'Subscription is already active with no pending cancellation' });
    }

    try {
      await db.run(
        'UPDATE user_subscriptions SET cancel_at_period_end = false, plan_id_at_period_end = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [req.params.id]
      );
    } catch (e) {
      const idx = (db.tables.user_subscriptions || []).findIndex(s => s.id == req.params.id);
      if (idx >= 0) {
        db.tables.user_subscriptions[idx].cancel_at_period_end = false;
        db.tables.user_subscriptions[idx].plan_id_at_period_end = null;
        db.tables.user_subscriptions[idx].updated_at = new Date().toISOString();
      }
    }

    res.json({ success: true, message: 'Subscription reactivated - pending cancellation removed' });
  } catch (error) {
    logger.error('Subscription reactivate error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.get('/coupons', async (req, res) => {
  try {
    let coupons;
    try {
      coupons = await db.query(
        `SELECT * FROM coupons 
         WHERE active = true 
         AND (valid_until IS NULL OR valid_until >= CURRENT_TIMESTAMP)
         AND (max_uses IS NULL OR uses < max_uses)
         ORDER BY created_at DESC`
      );
    } catch (e) {
      coupons = (db.getTable('coupons') || [])
        .filter(c => 
          c.active !== false && 
          (!c.valid_until || new Date(c.valid_until) >= new Date()) &&
          (c.max_uses === null || c.max_uses === undefined || (c.uses || 0) < c.max_uses)
        )
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    res.json({ success: true, data: coupons });
  } catch (error) {
    logger.error('Get coupons error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/coupons', async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

    const { code, name, description, discount_type, discount_amount, max_uses, valid_from, valid_until, applicable_plans, metadata } = req.body;

    if (!code || !discount_type || discount_amount === undefined) {
      return res.status(400).json({ error: 'code, discount_type, and discount_amount are required' });
    }

    const existing = (db.getTable('coupons') || []).find(c => c.code === code);
    if (existing) return res.status(400).json({ error: 'Coupon code already exists' });

    const coupon = {
      code,
      name: name || code,
      description: description || null,
      discount_type,
      discount_amount: parseFloat(discount_amount),
      max_uses: max_uses !== undefined ? parseInt(max_uses) : null,
      uses: 0,
      valid_from: valid_from || null,
      valid_until: valid_until || null,
      applicable_plans: applicable_plans ? JSON.stringify(applicable_plans) : null,
      metadata: metadata ? JSON.stringify(metadata) : null,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let result;
    try {
      result = await db.insert('coupons', coupon);
    } catch (e) {
      if (!db.tables.coupons) db.tables.coupons = [];
      if (!db.ids) db.ids = {};
      const newId = (db.ids.coupons || 0) + 1;
      db.ids.coupons = newId;
      result = { insertId: newId };
      db.tables.coupons.push({ id: newId, ...coupon });
    }

    res.status(201).json({ success: true, data: { id: result.insertId, ...coupon } });
  } catch (error) {
    logger.error('Create coupon error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.post('/coupons/validate', async (req, res) => {
  try {
    const { code, planId } = req.body;
    if (!code) return res.status(400).json({ error: 'code required' });

    let coupon;
    try {
      coupon = await db.queryOne(
        `SELECT * FROM coupons 
         WHERE code = $1 
         AND active = true 
         AND (valid_until IS NULL OR valid_until >= CURRENT_TIMESTAMP)
         AND (max_uses IS NULL OR uses < max_uses)`,
        [code]
      );
    } catch (e) {
      coupon = (db.getTable('coupons') || []).find(c => 
        c.code === code && 
        c.active !== false && 
        (!c.valid_until || new Date(c.valid_until) >= new Date()) &&
        (c.max_uses === null || c.max_uses === undefined || (c.uses || 0) < c.max_uses)
      );
    }

    if (!coupon) return res.status(404).json({ valid: false, error: 'Invalid or expired coupon' });

    if (planId && coupon.applicable_plans) {
      const applicablePlans = JSON.parse(coupon.applicable_plans);
      if (applicablePlans && !applicablePlans.includes(planId) && !applicablePlans.includes(String(planId))) {
        return res.status(400).json({ valid: false, error: 'Coupon not applicable to this plan' });
      }
    }

    let plan = null;
    if (planId) {
      try {
        plan = await db.queryOne('SELECT * FROM subscription_plans WHERE id = $1', [planId]);
      } catch (e) {
        plan = (db.getTable('subscription_plans') || []).find(p => p.id == planId);
      }
    }

    let discount = coupon.discount_amount;
    let savings = null;
    if (plan) {
      if (coupon.discount_type === 'percentage') {
        savings = plan.price * (coupon.discount_amount / 100);
        discount = `${coupon.discount_amount}%`;
      } else {
        savings = Math.min(coupon.discount_amount, plan.price);
        discount = `${coupon.discount_amount} ${plan.currency}`;
      }
    }

    res.json({
      valid: true,
      data: {
        coupon: {
          id: coupon.id,
          code: coupon.code,
          name: coupon.name,
          description: coupon.description,
          discount_type: coupon.discount_type,
          discount_amount: coupon.discount_amount,
          discount_display: discount,
          max_uses: coupon.max_uses,
          uses: coupon.uses,
          valid_until: coupon.valid_until
        },
        savings: savings !== null ? {
          amount: savings,
          currency: plan?.currency || 'eur'
        } : null
      }
    });
  } catch (error) {
    logger.error('Validate coupon error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.get('/invoices', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { status, limit = 50, offset = 0 } = req.query;

    let invoices;
    try {
      let query = `SELECT i.*, us.plan_id, sp.name as plan_name
                   FROM invoices i
                   LEFT JOIN user_subscriptions us ON i.subscription_id = us.id
                   LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
                   WHERE i.user_id = $1`;
      const params = [userId];
      let paramIndex = 2;

      if (status) {
        query += ` AND i.status = $${paramIndex++}`;
        params.push(status);
      }

      query += ' ORDER BY i.created_at DESC LIMIT $' + paramIndex++ + ' OFFSET $' + paramIndex++;
      params.push(parseInt(limit), parseInt(offset));

      invoices = await db.query(query, params);
    } catch (e) {
      invoices = (db.getTable('invoices') || [])
        .filter(i => i.user_id === userId)
        .filter(i => !status || i.status === status)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    }

    res.json({
      success: true,
      data: invoices,
      pagination: { limit: parseInt(limit), offset: parseInt(offset) }
    });
  } catch (error) {
    logger.error('Get invoices error', { error: error.message });
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
        `SELECT i.*, us.plan_id, sp.name as plan_name, sp.features, sp.limits
         FROM invoices i
         LEFT JOIN user_subscriptions us ON i.subscription_id = us.id
         LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
         WHERE i.id = $1 AND i.user_id = $2`,
        [req.params.id, userId]
      );
    } catch (e) {
      invoice = (db.getTable('invoices') || []).find(i => i.id == req.params.id && i.user_id === userId);
    }

    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    res.json({
      success: true,
      data: {
        ...invoice,
        features: invoice.features ? JSON.parse(invoice.features) : [],
        limits: invoice.limits ? JSON.parse(invoice.limits) : {}
      }
    });
  } catch (error) {
    logger.error('Get invoice error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/payment-methods', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let paymentMethods;
    try {
      paymentMethods = await db.query(
        'SELECT * FROM payment_methods WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
        [userId]
      );
    } catch (e) {
      paymentMethods = (db.getTable('payment_methods') || [])
        .filter(p => p.user_id === userId)
        .sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0) || new Date(b.created_at) - new Date(a.created_at));
    }

    res.json({ success: true, data: paymentMethods });
  } catch (error) {
    logger.error('Get payment methods error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/payment-methods', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { paymentMethodId, is_default = false, metadata } = req.body;
    if (!paymentMethodId) return res.status(400).json({ error: 'paymentMethodId required' });

    const pmData = {
      user_id: userId,
      stripe_payment_method_id: paymentMethodId,
      is_default,
      metadata: metadata ? JSON.stringify(metadata) : null,
      created_at: new Date().toISOString()
    };

    if (is_default) {
      try {
        await db.run('UPDATE payment_methods SET is_default = false WHERE user_id = $1', [userId]);
      } catch (e) {
        const methods = db.tables.payment_methods || [];
        methods.forEach(pm => {
          if (pm.user_id === userId) pm.is_default = false;
        });
      }
    }

    let result;
    try {
      result = await db.insert('payment_methods', pmData);
    } catch (e) {
      if (!db.tables.payment_methods) db.tables.payment_methods = [];
      if (!db.ids) db.ids = {};
      const newId = (db.ids.payment_methods || 0) + 1;
      db.ids.payment_methods = newId;
      result = { insertId: newId };
      db.tables.payment_methods.push({ id: newId, ...pmData });
    }

    res.status(201).json({ success: true, data: { id: result.insertId, ...pmData } });
  } catch (error) {
    logger.error('Add payment method error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.delete('/payment-methods/:id', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let pm;
    try {
      pm = await db.queryOne('SELECT * FROM payment_methods WHERE id = $1 AND user_id = $2', [req.params.id, userId]);
    } catch (e) {
      pm = (db.getTable('payment_methods') || []).find(p => p.id == req.params.id && p.user_id === userId);
    }

    if (!pm) return res.status(404).json({ error: 'Payment method not found' });

    try {
      await db.run('DELETE FROM payment_methods WHERE id = $1', [req.params.id]);
    } catch (e) {
      if (db.tables.payment_methods) {
        db.tables.payment_methods = db.tables.payment_methods.filter(p => p.id != req.params.id);
      }
    }

    if (pm.is_default) {
      const remaining = (db.getTable('payment_methods') || []).filter(p => p.user_id === userId);
      if (remaining.length > 0) {
        try {
          await db.run('UPDATE payment_methods SET is_default = true WHERE id = $1', [remaining[0].id]);
        } catch (e) {
          const idx = (db.tables.payment_methods || []).findIndex(p => p.id == remaining[0].id);
          if (idx >= 0) db.tables.payment_methods[idx].is_default = true;
        }
      }
    }

    res.json({ success: true, message: 'Payment method removed' });
  } catch (error) {
    logger.error('Remove payment method error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.get('/analytics', async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

    const subscriptions = db.getTable('user_subscriptions') || [];
    const plans = db.getTable('subscription_plans') || [];

    const now = new Date();
    const last30d = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const analytics = {
      summary: {
        total: subscriptions.length,
        active: subscriptions.filter(s => s.status === 'active').length,
        trialing: subscriptions.filter(s => s.status === 'trialing').length,
        pastDue: subscriptions.filter(s => s.status === 'past_due').length,
        canceled: subscriptions.filter(s => s.status === 'canceled').length,
        pendingCancellation: subscriptions.filter(s => s.cancel_at_period_end).length
      },
      byPlan: {},
      revenue: {
        mrr: 0,
        monthlyActive: subscriptions.filter(s => s.status === 'active' || s.status === 'trialing').length
      },
      churn: {
        last30d: subscriptions.filter(s => 
          s.status === 'canceled' && 
          s.canceled_at && 
          new Date(s.canceled_at) >= last30d
        ).length
      },
      newSubscriptions: {
        last30d: subscriptions.filter(s => 
          new Date(s.created_at) >= last30d
        ).length
      }
    };

    plans.forEach(plan => {
      const planSubs = subscriptions.filter(s => s.plan_id == plan.id);
      analytics.byPlan[plan.name || plan.id] = {
        total: planSubs.length,
        active: planSubs.filter(s => s.status === 'active').length,
        revenue: planSubs.filter(s => s.status === 'active').reduce((sum, s) => sum + (s.price || plan.price || 0), 0)
      };
    });

    const activeSubs = subscriptions.filter(s => s.status === 'active');
    analytics.revenue.mrr = activeSubs.reduce((sum, s) => {
      const plan = plans.find(p => p.id == s.plan_id);
      const price = s.price || plan?.price || 0;
      const interval = plan?.interval || 'month';
      
      if (interval === 'year') {
        return sum + (price / 12);
      }
      return sum + price;
    }, 0);

    res.json({ success: true, data: analytics });
  } catch (error) {
    logger.error('Subscription analytics error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
