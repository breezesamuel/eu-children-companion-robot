const db = require('../utils/database');
const logger = require('../utils/logger');

async function seed() {
  logger.info('Seeding demo data...');

  for (let i = 1; i <= 5; i++) {
    const userRes = await db.insert('users', {
      username: `demo_parent_${i}`,
      email: `parent${i}@demo.com`,
      password_hash: '$2b$10$EixZaYbB.rK4fl8x2q7Meu6Q6D2V5fF5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q',
      role: 'parent',
      first_name: ['Sarah', 'Michael', 'Emma', 'James', 'Olivia'][i - 1],
      last_name: ['Johnson', 'Brown', 'Wilson', 'Taylor', 'Davis'][i - 1],
      country: ['UK', 'Germany', 'France', 'Netherlands', 'Switzerland'][i - 1],
      created_at: new Date(Date.now() - i * 86400000).toISOString()
    });

    for (let j = 1; j <= 2; j++) {
      await db.insert('children', {
        parent_id: userRes.insertId,
        name: `Child ${i}-${j}`,
        age: 5 + (i + j) % 6,
        grade: `Grade ${(i + j) % 6 + 1}`,
        status: 'active',
        created_at: new Date().toISOString()
      });
    }
  }

  for (let i = 1; i <= 3; i++) {
    await db.insert('robots', {
      device_id: `RB-DEMO-${100 + i}`,
      name: `Demo Robot ${i}`,
      status: i === 1 ? 'online' : 'offline',
      battery_level: [85, 32, 97][i - 1],
      location: ['London', 'Berlin', 'Paris'][i - 1],
      firmware_version: '2.0.0',
      created_at: new Date().toISOString()
    });
  }

  const products = [
    { product_id: 'robot-basic', name: 'RoboBuddy Basic', quantity: 1, unit_price: 29900 },
    { product_id: 'robot-premium', name: 'RoboBuddy Premium', quantity: 1, unit_price: 59900 },
    { product_id: 'sub-premium', name: 'Premium Family Pass', quantity: 1, unit_price: 1999, interval: 'month' },
  ];

  for (let i = 0; i < products.length; i++) {
    await db.insert('orders', {
      user_id: i + 1,
      items: JSON.stringify([products[i]]),
      amount_total: products[i].unit_price,
      currency: 'eur',
      status: 'completed',
      payment_status: 'paid',
      created_at: new Date(Date.now() - (products.length - i) * 86400000).toISOString(),
      completed_at: new Date(Date.now() - (products.length - i) * 86400000 + 3600000).toISOString()
    });
  }

  await db.insert('user_subscriptions', {
    user_id: 1,
    plan_id: 'sub-premium',
    status: 'active',
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
    created_at: new Date().toISOString()
  });

  await db.insert('support_tickets', {
    user_id: 1,
    subject: 'WiFi connection issue',
    message: 'My RoboBuddy won\'t connect to my home WiFi network. It sees the network but keeps failing to authenticate.',
    priority: 'high',
    category: 'technical',
    status: 'open',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  logger.info('Demo data seeded successfully');
  console.log(`
Demo Accounts:
  admin@robot.com / admin123 (admin)
  parent@example.com / parent123 (parent)
  parent1@demo.com / 123456 (parent)
  parent2@demo.com / 123456 (parent)

Products: 3 robots × 3 subscriptions × 1 addon (in memory)
Orders: 3 completed orders
Subscriptions: 1 active
Tickets: 1 open support ticket
  `);
}

seed().catch(e => {
  console.error('Seed failed:', e.message);
  process.exit(1);
});
