const express = require('express');
const router = express.Router();
const db = require('../utils/database');
const logger = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');

const productCatalog = new Map();
const shoppingCarts = new Map();
const productCategories = new Map();
const productReviews = new Map();
const orderHistory = new Map();
const productInventory = new Map();
const productVariants = new Map();

['hardware', 'subscription', 'accessory', 'course', 'service'].forEach(c => productCategories.set(c, { id: c, name: c.charAt(0).toUpperCase() + c.slice(1) }));

router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const user = await db.queryOne('SELECT * FROM users WHERE id = ?', [userId]);
    const orders = (db.getTable('orders') || []).filter(o => o.user_id === userId).sort((a, b) => new Date(b.created_at||0) - new Date(a.created_at||0)).slice(0, 5);
    const children = (db.getTable('children') || []).filter(c => c.parent_id === userId);
    const subs = (db.getTable('user_subscriptions') || []).filter(s => s.user_id === userId);
    res.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: [user.first_name, user.last_name].filter(Boolean).join(' '), role: user.role, memberSince: user.created_at },
        recentOrders: orders,
        children: children.map(c => ({ id: c.id, name: c.name, age: c.age, grade: c.grade, status: c.status })),
        subscriptions: subs
      }
    });
  } catch (error) {
    logger.error('Dashboard error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/pricing', (req, res) => {
  const { PRODUCTS } = require('./products');
  res.json({
    success: true,
    data: {
      devices: PRODUCTS.filter(p => p.type === 'device'),
      subscriptions: PRODUCTS.filter(p => p.type === 'subscription'),
      addons: PRODUCTS.filter(p => p.type === 'addon')
    }
  });
});

router.get('/features', (req, res) => {
  res.json({
    success: true,
    data: [
      { icon: 'brain', title: 'AI-Powered Learning', description: 'Adaptive AI tutor that personalizes lessons to your child\'s pace and learning style' },
      { icon: 'book', title: 'Complete K-8 Curriculum', description: 'Math, science, languages, coding, and arts aligned with European education standards' },
      { icon: 'heart', title: 'Emotion Recognition', description: 'Built-in emotional intelligence that responds to your child\'s mood and engagement' },
      { icon: 'globe', title: 'Multi-Language Support', description: 'Full support for English, German, French, Dutch, and more' },
      { icon: 'phone', title: 'Parent Dashboard', description: 'Real-time progress tracking, reports, and activity monitoring via mobile app' },
      { icon: 'shield', title: 'GDPR Compliant', description: 'Your child\'s data is encrypted and protected. Full GDPR compliance with EU data hosting' }
    ]
  });
});

router.post('/products', (req, res) => {
  const { id, name, description, price, currency, category, image, tags } = req.body;
  if (!id || !name || price === undefined) return res.status(400).json({ error: 'id, name, and price required' });
  productCatalog.set(id, { id, name, description: description || '', price: parseFloat(price), currency: currency || 'EUR', category: category || 'general', image: image || '', tags: tags || [], active: true, createdAt: new Date().toISOString() });
  res.status(201).json({ success: true, data: productCatalog.get(id) });
});

router.get('/products', (req, res) => {
  const { category, tag, search, minPrice, maxPrice, active } = req.query;
  let items = Array.from(productCatalog.values());
  if (category) items = items.filter(p => p.category === category);
  if (tag) items = items.filter(p => p.tags.includes(tag));
  if (search) items = items.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase()));
  if (minPrice) items = items.filter(p => p.price >= parseFloat(minPrice));
  if (maxPrice) items = items.filter(p => p.price <= parseFloat(maxPrice));
  if (active !== undefined) items = items.filter(p => p.active === (active === 'true'));
  res.json({ success: true, data: items });
});

router.get('/products/:id', (req, res) => {
  const product = productCatalog.get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json({ success: true, data: product });
});

router.put('/products/:id', (req, res) => {
  const product = productCatalog.get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  Object.assign(product, req.body, { updatedAt: new Date().toISOString() });
  res.json({ success: true, data: product });
});

router.delete('/products/:id', (req, res) => {
  if (!productCatalog.has(req.params.id)) return res.status(404).json({ error: 'Product not found' });
  productCatalog.delete(req.params.id);
  res.json({ success: true });
});

router.post('/categories', (req, res) => {
  const { id, name, description, parent } = req.body;
  if (!id || !name) return res.status(400).json({ error: 'id and name required' });
  productCategories.set(id, { id, name, description: description || '', parent: parent || null, productCount: 0, createdAt: new Date().toISOString() });
  res.status(201).json({ success: true, data: productCategories.get(id) });
});

router.get('/categories', (req, res) => {
  res.json({ success: true, data: Array.from(productCategories.values()) });
});

router.get('/categories/:id', (req, res) => {
  const cat = productCategories.get(req.params.id);
  if (!cat) return res.status(404).json({ error: 'Category not found' });
  res.json({ success: true, data: cat });
});

router.put('/categories/:id', (req, res) => {
  const cat = productCategories.get(req.params.id);
  if (!cat) return res.status(404).json({ error: 'Category not found' });
  Object.assign(cat, req.body, { updatedAt: new Date().toISOString() });
  res.json({ success: true, data: cat });
});

router.delete('/categories/:id', (req, res) => {
  if (!productCategories.has(req.params.id)) return res.status(404).json({ error: 'Category not found' });
  productCategories.delete(req.params.id);
  res.json({ success: true });
});

router.post('/variants', (req, res) => {
  const { productId, name, sku, price, attributes } = req.body;
  if (!productId || !name || sku === undefined) return res.status(400).json({ error: 'productId, name, sku required' });
  if (!productVariants.has(productId)) productVariants.set(productId, []);
  const variant = { id: 'var-' + Date.now(), productId, name, sku, price: price !== undefined ? parseFloat(price) : null, attributes: attributes || {}, createdAt: new Date().toISOString() };
  productVariants.get(productId).push(variant);
  res.status(201).json({ success: true, data: variant });
});

router.get('/variants/:productId', (req, res) => {
  res.json({ success: true, data: productVariants.get(req.params.productId) || [] });
});

router.post('/inventory', (req, res) => {
  const { productId, quantity, warehouse } = req.body;
  if (!productId || quantity === undefined) return res.status(400).json({ error: 'productId and quantity required' });
  productInventory.set(productId, { productId, quantity: parseInt(quantity), warehouse: warehouse || 'main', updatedAt: new Date().toISOString() });
  res.status(201).json({ success: true, data: productInventory.get(productId) });
});

router.get('/inventory/:productId', (req, res) => {
  res.json({ success: true, data: productInventory.get(req.params.productId) || { productId: req.params.productId, quantity: 0 } });
});

router.put('/inventory/:productId', (req, res) => {
  const inv = productInventory.get(req.params.productId);
  if (!inv) return res.status(404).json({ error: 'Inventory not found' });
  Object.assign(inv, req.body, { updatedAt: new Date().toISOString() });
  res.json({ success: true, data: inv });
});

router.post('/cart', (req, res) => {
  const { userId } = req.body;
  const uid = userId || req.user?.userId || 'anon';
  shoppingCarts.set(uid, { userId: uid, items: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  res.status(201).json({ success: true, data: shoppingCarts.get(uid) });
});

router.get('/cart', (req, res) => {
  const userId = req.query.userId || req.user?.userId || 'anon';
  const cart = shoppingCarts.get(userId) || { userId, items: [] };
  const subtotal = cart.items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
  const tax = subtotal * 0.19;
  res.json({ success: true, data: { ...cart, subtotal, tax, total: subtotal + tax } });
});

router.post('/cart/items', (req, res) => {
  const { productId, quantity, variantId } = req.body;
  if (!productId) return res.status(400).json({ error: 'productId required' });
  const userId = req.user?.userId || 'anon';
  if (!shoppingCarts.has(userId)) shoppingCarts.set(userId, { userId, items: [], createdAt: new Date().toISOString() });
  const cart = shoppingCarts.get(userId);
  const existing = cart.items.find(i => i.productId === productId && i.variantId === (variantId || null));
  if (existing) {
    existing.quantity += parseInt(quantity) || 1;
  } else {
    const product = productCatalog.get(productId);
    cart.items.push({ productId, name: product?.name || productId, price: product?.price || 0, quantity: parseInt(quantity) || 1, variantId: variantId || null });
  }
  cart.updatedAt = new Date().toISOString();
  res.json({ success: true, data: cart });
});

router.delete('/cart/items/:productId', (req, res) => {
  const userId = req.user?.userId || 'anon';
  const cart = shoppingCarts.get(userId);
  if (!cart) return res.status(404).json({ error: 'Cart not found' });
  cart.items = cart.items.filter(i => i.productId !== req.params.productId);
  cart.updatedAt = new Date().toISOString();
  res.json({ success: true, data: cart });
});

router.delete('/cart', (req, res) => {
  const userId = req.user?.userId || 'anon';
  shoppingCarts.delete(userId);
  res.json({ success: true });
});

router.post('/checkout', (req, res) => {
  const { paymentMethod, shippingAddress } = req.body;
  const userId = req.user?.userId || 'anon';
  const cart = shoppingCarts.get(userId);
  if (!cart || cart.items.length === 0) return res.status(400).json({ error: 'Cart is empty' });
  const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.19;
  const orderId = 'ORD-' + Date.now();
  const order = { id: orderId, userId, items: [...cart.items], subtotal, tax, total: subtotal + tax, paymentMethod: paymentMethod || 'card', shippingAddress: shippingAddress || {}, status: 'confirmed', createdAt: new Date().toISOString() };
  orderHistory.set(orderId, order);
  cart.items = [];
  cart.updatedAt = new Date().toISOString();
  res.status(201).json({ success: true, data: order });
});

router.get('/orders', (req, res) => {
  const { userId, status, limit } = req.query;
  const uid = userId || req.user?.userId || 'anon';
  let orders = Array.from(orderHistory.values()).filter(o => o.userId === uid);
  if (status) orders = orders.filter(o => o.status === status);
  orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ success: true, data: orders.slice(0, parseInt(limit) || 50) });
});

router.get('/orders/:id', (req, res) => {
  const order = orderHistory.get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json({ success: true, data: order });
});

router.put('/orders/:id/status', (req, res) => {
  const order = orderHistory.get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  order.status = req.body.status || order.status;
  order.updatedAt = new Date().toISOString();
  res.json({ success: true, data: order });
});

router.post('/reviews', (req, res) => {
  const { productId, rating, comment, userId } = req.body;
  if (!productId || !rating) return res.status(400).json({ error: 'productId and rating required' });
  const revId = 'rev-' + Date.now();
  const review = { id: revId, productId, userId: userId || 'anon', rating: Math.min(5, Math.max(1, parseInt(rating))), comment: comment || '', createdAt: new Date().toISOString() };
  if (!productReviews.has(productId)) productReviews.set(productId, []);
  productReviews.get(productId).push(review);
  res.status(201).json({ success: true, data: review });
});

router.get('/reviews/:productId', (req, res) => {
  const reviews = productReviews.get(req.params.productId) || [];
  const avg = reviews.length > 0 ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0;
  res.json({ success: true, data: { productId: req.params.productId, averageRating: avg, count: reviews.length, reviews } });
});

router.get('/search', (req, res) => {
  const { q, category, sort, page, limit } = req.query;
  if (!q) return res.status(400).json({ error: 'query (q) required' });
  let items = Array.from(productCatalog.values()).filter(p => p.name.toLowerCase().includes(q.toLowerCase()) || p.description.toLowerCase().includes(q.toLowerCase()) || p.tags.some(t => t.toLowerCase().includes(q.toLowerCase())));
  if (category) items = items.filter(p => p.category === category);
  if (sort === 'price_asc') items.sort((a, b) => a.price - b.price);
  if (sort === 'price_desc') items.sort((a, b) => b.price - a.price);
  if (sort === 'name') items.sort((a, b) => a.name.localeCompare(b.name));
  const pg = parseInt(page) || 1;
  const lim = parseInt(limit) || 20;
  const start = (pg - 1) * lim;
  res.json({ success: true, data: items.slice(start, start + lim), total: items.length, page: pg, pages: Math.ceil(items.length / lim) });
});

router.get('/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      products: productCatalog.size,
      categories: productCategories.size,
      reviews: Array.from(productReviews.values()).reduce((a, r) => a + r.length, 0),
      orders: orderHistory.size,
      activeCarts: shoppingCarts.size
    }
  });
});

module.exports = router;
