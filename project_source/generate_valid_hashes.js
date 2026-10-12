
// 生成有效的 bcrypt 哈希值
const bcrypt = require('bcryptjs');

async function generate() {
  console.log('正在生成密码哈希...\n');
  
  const passwords = ['admin123', 'parent123', '123456'];
  
  for (const password of passwords) {
    const hash = await bcrypt.hash(password, 10);
    console.log(`密码 "${password}":`);
    console.log(`哈希: ${hash}\n`);
  }
  
  console.log('完成！请将这些哈希值复制到 database.js 中。');
}

// 同时创建一个简单的测试验证
async function test() {
  console.log('\n测试哈希验证...');
  const testHash = '$2b$10$EixZaYbB.rK4fl8x2q7Meu6Q6D2V5fF5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q';
  const testPass = '123456';
  const valid = await bcrypt.compare(testPass, testHash);
  console.log(`测试 "${testPass}": ${valid ? '✅ 有效' : '❌ 无效'}`);
}

generate().then(test).catch(console.error);
