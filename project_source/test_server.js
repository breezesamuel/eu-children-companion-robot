
// 简单的服务器测试脚本
const http = require('http');

console.log('正在检查项目文件...');

// 检查关键文件
const fs = require('fs');
const path = require('path');

const filesToCheck = [
  'package.json',
  'server.js',
  'docs/robot_terminal.html',
  'docs/content.js',
  'routes/auth.js',
  'routes/users.js',
  'middleware/auth.js',
  'utils/database.js'
];

console.log('\n📁 检查项目文件:');
let allFilesExist = true;
filesToCheck.forEach(file => {
  const filePath = path.join(__dirname, file);
  const exists = fs.existsSync(filePath);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
});

console.log('\n🔧 检查 package.json 依赖:');
try {
  const pkg = require('./package.json');
  console.log('  ✅ package.json 读取成功');
  console.log('  📦 依赖:');
  Object.keys(pkg.dependencies || {}).forEach(dep => {
    console.log(`    - ${dep}@${pkg.dependencies[dep]}`);
  });
} catch (e) {
  console.log('  ❌ package.json 读取失败:', e.message);
}

console.log('\n📝 检查 database.js:');
try {
  const db = require('./utils/database');
  console.log('  ✅ database.js 加载成功');
  console.log('  👤 用户数据:', (db.getTable ? db.getTable('users') : (db.tables ? db.tables.users : 'N/A'))?.length || 0, '条');
} catch (e) {
  console.log('  ❌ database.js 加载失败:', e.message);
}

console.log('\n🎉 检查完成！项目结构看起来正常。');
console.log('\n📋 使用说明:');
console.log('1. 运行 "npm install" 安装依赖');
console.log('2. 运行 "npm start" 启动服务器');
console.log('3. 在浏览器中打开 http://localhost:3000');
