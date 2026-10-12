
// 简化版启动脚本 - 不依赖额外模块即可运行
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(express.static('docs'));

// 简单的数学题目生成 API
app.get('/api/math/questions', (req, res) => {
  const count = parseInt(req.query.count) || 10;
  const questions = [];
  
  for (let i = 0; i &lt; count; i++) {
    const a = Math.floor(Math.random() * 50) + 1;
    const b = Math.floor(Math.random() * 50) + 1;
    const ops = ['+', '-', '×', '÷'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let answer;
    
    if (op === '+') answer = a + b;
    else if (op === '-') answer = Math.max(a, b) - Math.min(a, b);
    else if (op === '×') answer = a * b;
    else answer = a; // 简化除法
    
    questions.push({
      id: i + 1,
      question: `${Math.max(a, b)} ${op} ${Math.min(a, b)} = ?`,
      answer: answer
    });
  }
  
  res.json({ success: true, data: questions });
});

// 根路由
app.get('/', (req, res) =&gt; {
  res.sendFile(path.join(__dirname, 'docs', 'robot_terminal.html'));
});

app.listen(PORT, () =&gt; {
  console.log('\n🚀 服务器已启动！');
  console.log(`📱 访问地址: http://localhost:${PORT}`);
  console.log(`🧮 测试 API: http://localhost:${PORT}/api/math/questions`);
  console.log('\n按 Ctrl+C 停止服务器\n');
});
