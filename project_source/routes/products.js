const express = require('express');
const router = express.Router();
const db = require('../utils/database');

const PRODUCTS = [
  { id: 'robot-basic', name: 'RoboBuddy Basic', type: 'device', price: 29900, currency: 'eur', interval: 'once', description: 'Entry-level companion robot with basic learning features', features: ['Voice interaction', 'Basic math tutoring', 'Storytelling', '10hr battery'], popular: false },
  { id: 'robot-premium', name: 'RoboBuddy Premium', type: 'device', price: 59900, currency: 'eur', interval: 'once', description: 'Advanced learning companion with full curriculum', features: ['Everything in Basic', 'Full curriculum (K-8)', 'Multi-language support', 'Parent monitoring app', '20hr battery', 'Emotion recognition'], popular: true },
  { id: 'robot-enterprise', name: 'RoboBuddy Enterprise', type: 'device', price: 99900, currency: 'eur', interval: 'once', description: 'Classroom & institutional solution with management console', features: ['Everything in Premium', 'Classroom management', 'Teacher dashboard', 'Batch provisioning', 'API access', 'Priority support'], popular: false },
  { id: 'sub-learning', name: 'Learning Passport', type: 'subscription', price: 999, currency: 'eur', interval: 'month', description: 'Unlimited access to all learning content & AI tutoring', features: ['AI-powered tutoring', 'All courses K-8', 'Progress tracking', 'Monthly reports', 'Gamified achievements'], popular: false },
  { id: 'sub-premium', name: 'Premium Family Pass', type: 'subscription', price: 1999, currency: 'eur', interval: 'month', description: 'Full family plan with advanced AI & multi-child support', features: ['Everything in Learning Passport', 'Up to 4 children', 'Advanced AI chat', 'Parent coaching tips', 'Priority support', 'Early access to new features'], popular: true },
  { id: 'sub-school', name: 'School License', type: 'subscription', price: 4999, currency: 'eur', interval: 'month', description: 'Complete school solution for up to 30 students', features: ['Everything in Premium Family', 'Up to 30 students', 'Teacher dashboard', 'Curriculum management', 'Student analytics', 'API integration', 'Dedicated support'], popular: false },
  { id: 'addon-care', name: 'Extended Care Package', type: 'addon', price: 4999, currency: 'eur', interval: 'year', description: 'Extended warranty & priority hardware support', features: ['2-year warranty', '24h replacement', 'Priority repairs', 'Free firmware updates'], popular: false }
];

const productCatalog = new Map(PRODUCTS.map(p => [p.id, { ...p, variants: [], images: [], reviews: [], analytics: { views: 0, purchases: 0 } }]));
const productCategories = new Map();
const productImages = new Map();
const productComments = new Map();
const productAnalytics = new Map();

router.get('/', (req, res) => {
  const { type, category, search, sort, minPrice, maxPrice, popular } = req.query;
  let result = Array.from(productCatalog.values());
  if (type) result = result.filter(p => p.type === type);
  if (category) result = result.filter(p => p.category === category);
  if (search) result = result.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase()));
  if (minPrice) result = result.filter(p => p.price >= parseInt(minPrice));
  if (maxPrice) result = result.filter(p => p.price <= parseInt(maxPrice));
  if (popular !== undefined) result = result.filter(p => p.popular === (popular === 'true'));
  if (sort === 'price_asc') result.sort((a, b) => a.price - b.price);
  if (sort === 'price_desc') result.sort((a, b) => b.price - a.price);
  if (sort === 'name') result.sort((a, b) => a.name.localeCompare(b.name));
  res.json({ success: true, data: result });
});

router.get('/:id', (req, res) => {
  const product = productCatalog.get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  product.analytics.views++;
  res.json({ success: true, data: product });
});

router.get('/pricing/plans', (req, res) => {
  res.json({
    success: true,
    data: {
      devices: PRODUCTS.filter(p => p.type === 'device'),
      subscriptions: PRODUCTS.filter(p => p.type === 'subscription'),
      addons: PRODUCTS.filter(p => p.type === 'addon')
    }
  });
});

router.get('/features/list', (req, res) => {
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

router.post('/', (req, res) => {
  const { id, name, type, price, currency, interval, description, features, popular, category, variants, images } = req.body;
  if (!id || !name || price === undefined) return res.status(400).json({ error: 'id, name, and price required' });
  const product = { id, name, type: type || 'device', price: parseInt(price), currency: currency || 'eur', interval: interval || 'once', description: description || '', features: features || [], popular: popular || false, category: category || 'general', variants: variants || [], images: images || [], reviews: [], analytics: { views: 0, purchases: 0 }, createdAt: new Date().toISOString() };
  productCatalog.set(id, product);
  res.status(201).json({ success: true, data: product });
});

router.put('/:id', (req, res) => {
  const product = productCatalog.get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  Object.assign(product, req.body, { updatedAt: new Date().toISOString() });
  res.json({ success: true, data: product });
});

router.delete('/:id', (req, res) => {
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

router.post('/:id/variants', (req, res) => {
  const product = productCatalog.get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  const { name, sku, price, attributes } = req.body;
  if (!name || !sku) return res.status(400).json({ error: 'name and sku required' });
  const variant = { id: 'var-' + Date.now(), name, sku, price: price !== undefined ? parseInt(price) : product.price, attributes: attributes || {} };
  product.variants.push(variant);
  res.status(201).json({ success: true, data: variant });
});

router.get('/:id/variants', (req, res) => {
  const product = productCatalog.get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json({ success: true, data: product.variants });
});

router.put('/:id/variants/:variantId', (req, res) => {
  const product = productCatalog.get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  const variant = product.variants.find(v => v.id === req.params.variantId);
  if (!variant) return res.status(404).json({ error: 'Variant not found' });
  Object.assign(variant, req.body, { updatedAt: new Date().toISOString() });
  res.json({ success: true, data: variant });
});

router.delete('/:id/variants/:variantId', (req, res) => {
  const product = productCatalog.get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  product.variants = product.variants.filter(v => v.id !== req.params.variantId);
  res.json({ success: true });
});

router.post('/:id/inventory', (req, res) => {
  const product = productCatalog.get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  const { quantity, warehouse } = req.body;
  product.inventory = { quantity: parseInt(quantity) || 0, warehouse: warehouse || 'main', updatedAt: new Date().toISOString() };
  res.status(201).json({ success: true, data: product.inventory });
});

router.get('/:id/inventory', (req, res) => {
  const product = productCatalog.get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json({ success: true, data: product.inventory || { quantity: 0, warehouse: 'main' } });
});

router.put('/:id/inventory', (req, res) => {
  const product = productCatalog.get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  product.inventory = { ...(product.inventory || { quantity: 0 }), ...req.body, updatedAt: new Date().toISOString() };
  res.json({ success: true, data: product.inventory });
});

router.post('/:id/images', (req, res) => {
  const product = productCatalog.get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  const { url, alt, order } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });
  const image = { id: 'img-' + Date.now(), url, alt: alt || product.name, order: order || product.images.length };
  product.images.push(image);
  productImages.set(image.id, { productId: req.params.id, ...image });
  res.status(201).json({ success: true, data: image });
});

router.get('/:id/images', (req, res) => {
  const product = productCatalog.get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json({ success: true, data: product.images });
});

router.delete('/:id/images/:imageId', (req, res) => {
  const product = productCatalog.get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  product.images = product.images.filter(i => i.id !== req.params.imageId);
  productImages.delete(req.params.imageId);
  res.json({ success: true });
});

router.post('/:id/reviews', (req, res) => {
  const product = productCatalog.get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  const { rating, comment, userId } = req.body;
  if (!rating) return res.status(400).json({ error: 'rating required' });
  const review = { id: 'rev-' + Date.now(), userId: userId || 'anon', rating: Math.min(5, Math.max(1, parseInt(rating))), comment: comment || '', createdAt: new Date().toISOString() };
  product.reviews.push(review);
  res.status(201).json({ success: true, data: review });
});

router.get('/:id/reviews', (req, res) => {
  const product = productCatalog.get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  const avg = product.reviews.length > 0 ? product.reviews.reduce((a, r) => a + r.rating, 0) / product.reviews.length : 0;
  res.json({ success: true, data: { average: avg, count: product.reviews.length, reviews: product.reviews } });
});

router.post('/:id/comments', (req, res) => {
  const product = productCatalog.get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  const { text, userId } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });
  if (!productComments.has(req.params.id)) productComments.set(req.params.id, []);
  const comment = { id: 'cmt-' + Date.now(), userId: userId || 'anon', text, createdAt: new Date().toISOString() };
  productComments.get(req.params.id).push(comment);
  res.status(201).json({ success: true, data: comment });
});

router.get('/:id/comments', (req, res) => {
  res.json({ success: true, data: productComments.get(req.params.id) || [] });
});

router.get('/:id/analytics', (req, res) => {
  const product = productCatalog.get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json({ success: true, data: product.analytics });
});

router.post('/:id/analytics/purchase', (req, res) => {
  const product = productCatalog.get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  product.analytics.purchases++;
  res.json({ success: true, data: product.analytics });
});

router.post('/export', (req, res) => {
  const { format, type } = req.body;
  let items = Array.from(productCatalog.values());
  if (type) items = items.filter(p => p.type === type);
  if (format === 'csv') {
    const header = 'id,name,type,price,currency,interval,popular';
    const rows = items.map(p => `${p.id},"${p.name}",${p.type},${p.price},${p.currency},${p.interval},${p.popular}`);
    res.json({ success: true, data: { format: 'csv', content: [header, ...rows].join('\n') } });
  } else {
    res.json({ success: true, data: { format: 'json', products: items } });
  }
});

router.post('/import', (req, res) => {
  const { products } = req.body;
  if (!products || !Array.isArray(products)) return res.status(400).json({ error: 'products array required' });
  let count = 0;
  for (const p of products) {
    if (p.id && p.name && p.price !== undefined) {
      productCatalog.set(p.id, { ...p, variants: p.variants || [], images: p.images || [], reviews: p.reviews || [], analytics: p.analytics || { views: 0, purchases: 0 }, createdAt: new Date().toISOString() });
      count++;
    }
  }
  res.json({ success: true, data: { imported: count } });
});

router.get('/stats/overview', (req, res) => {
  const allProducts = Array.from(productCatalog.values());
  const totalViews = allProducts.reduce((a, p) => a + (p.analytics?.views || 0), 0);
  const totalPurchases = allProducts.reduce((a, p) => a + (p.analytics?.purchases || 0), 0);
  const totalRevenue = allProducts.reduce((a, p) => a + (p.analytics?.purchases || 0) * p.price, 0);
  res.json({
    success: true,
    data: {
      totalProducts: productCatalog.size,
      categories: productCategories.size,
      totalViews,
      totalPurchases,
      totalRevenue,
      popularProducts: allProducts.filter(p => p.popular).length,
      totalVariants: allProducts.reduce((a, p) => a + p.variants.length, 0),
      totalImages: allProducts.reduce((a, p) => a + p.images.length, 0),
      totalReviews: allProducts.reduce((a, p) => a + p.reviews.length, 0)
    }
  });
});

module.exports = router;
module.exports.PRODUCTS = PRODUCTS;
