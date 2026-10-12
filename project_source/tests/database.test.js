const db = require('../utils/database');

async function runTests() {
  let passed = 0;
  let failed = 0;

  function assert(condition, msg) {
    if (condition) { passed++; }
    else { failed++; console.error(`  FAIL: ${msg}`); }
  }

  // Test 1: get existing user
  const user = await db.get('SELECT * FROM users WHERE id = ?', [1]);
  assert(user?.email === 'admin@robot.com', 'get existing user');

  // Test 2: all users
  const users = await db.all('SELECT * FROM users');
  assert(users.length >= 2, 'all users count');

  // Test 3: insert child
  const ins = await db.insert('children', { parent_id: 2, name: 'Test', age: 6, grade: 'Grade 1' });
  assert(ins.insertId > 0, 'insert child returns insertId');

  // Test 4: queryOne child
  const child = await db.queryOne('SELECT * FROM children WHERE id = ?', [ins.insertId]);
  assert(child?.name === 'Test', 'queryOne child by id');

  // Test 5: update child
  await db.update('children', { name: 'Updated' }, { id: ins.insertId });
  const updated = await db.queryOne('SELECT * FROM children WHERE id = ?', [ins.insertId]);
  assert(updated?.name === 'Updated', 'update child name');

  // Test 6: query with WHERE
  const kids = await db.query('SELECT * FROM children WHERE parent_id = ?', [2]);
  assert(kids.length > 0, 'query children by parent_id');

  // Test 7: delete child
  await db.delete('children', { id: ins.insertId });
  const gone = await db.queryOne('SELECT * FROM children WHERE id = ?', [ins.insertId]);
  assert(gone === null, 'delete child');

  // Test 8: get table
  const table = db.getTable('users');
  assert(table.length > 0, 'getTable users');

  // Test 9: run INSERT SQL
  const sqlIns = await db.run("INSERT INTO children (parent_id, name, age) VALUES ('2', 'SQL Test', '5')");
  assert(sqlIns.lastID > 0, 'run INSERT SQL');

  // Test 10: run DELETE SQL
  const sqlDel = await db.run('DELETE FROM children WHERE id = ?', [sqlIns.lastID]);
  assert(sqlDel.changes > 0, 'run DELETE SQL');

  console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => { console.error('Test suite error:', e); process.exit(1); });
