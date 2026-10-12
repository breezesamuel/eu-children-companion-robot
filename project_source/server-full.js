// Learning Companion Robot - Complete Backend Server
// This server provides REST API for educational content and AI chat
const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('docs'));
// Import Grade Curriculum Data
const gradeCurriculum = require('./docs/grade-curriculum');
// ==================== CURRICULUM API ====================
// Get all grade levels
app.get('/api/curriculum/levels', (req, res) => {
    res.json({ levels: gradeCurriculum.gradeLevels });
});
// Get curriculum for specific grade
app.get('/api/curriculum/grade/:grade', (req, res) => {
    const grade = req.params.grade;
    const curriculum = gradeCurriculum.fullCurriculum[grade];
    if (curriculum) {
        res.json({ grade, curriculum });
    } else {
        res.status(404).json({ error: 'Grade not found' });
    }
});
// Get specific subject for a grade
app.get('/api/curriculum/grade/:grade/subject/:subject', (req, res) => {
    const grade = req.params.grade;
    const subject = req.params.subject;
    const curriculum = gradeCurriculum.fullCurriculum[grade];
    if (curriculum && curriculum[subject]) {
        res.json({ grade, subject, data: curriculum[subject] });
    } else {
        res.status(404).json({ error: 'Curriculum not found' });
    }
});
// Get STEM activities for grade
app.get('/api/curriculum/stem/:grade', (req, res) => {
    const grade = req.params.grade;
    const activities = gradeCurriculum.stemActivities[grade];
    if (activities) {
        res.json({ grade, activities });
    } else {
        res.status(404).json({ error: 'Activities not found' });
    }
});
// ==================== AI CHAT API ====================
// AI Chat endpoint
app.post('/api/ai/chat', (req, res) => {
    const { message, grade, subject } = req.body;
    let response = generateAIResponse(message, grade, subject);
    res.json({
        userMessage: message,
        aiResponse: response,
        timestamp: new Date().toISOString()
    });
});
// Generate AI Response based on message
function generateAIResponse(message, grade = 'Grade 1', subject = 'general') {
    const ai = gradeCurriculum.aiKnowledge;
    const lowerMessage = message.toLowerCase();
    // Greetings
    if (lowerMessage.includes('你好') || lowerMessage.includes('hi') || lowerMessage.includes('hello')) {
        const greetings = ['你好！很高兴见到你！', '嗨！今天想学点什么呢？', '你好呀！有什么我可以帮忙的吗？'];
        return greetings[Math.floor(Math.random() * greetings.length)];
    }
    // Math questions
    if (lowerMessage.includes('数学') || lowerMessage.includes('math')) {
        if (lowerMessage.includes('加法')) {
            return ai.math.explain('加法', grade);
        } else if (lowerMessage.includes('减法')) {
            return ai.math.explain('减法', grade);
        } else if (lowerMessage.includes('乘法')) {
            return ai.math.explain('乘法', grade);
        } else if (lowerMessage.includes('除法')) {
            return ai.math.explain('除法', grade);
        } else if (lowerMessage.includes('题') || lowerMessage.includes('练习')) {
            const problems = ai.math.problems(grade);
            return `好的！来做一道练习题吧：${problems[Math.floor(Math.random() * problems.length)]}`;
        } else {
            return '数学很有趣！你可以问我加法、减法、乘法、除法，或者让我出题。';
        }
    }
    // English questions
    if (lowerMessage.includes('英语') || lowerMessage.includes('english')) {
        if (lowerMessage.includes('翻译')) {
            const word = message.replace(/.*翻译/g, '').trim();
            if (word) {
                return ai.english.translate(word);
            }
            return '你想让我翻译哪个单词？';
        } else if (lowerMessage.includes('语法')) {
            return '你想了解哪个语法知识点？比如：现在进行时、一般过去时、比较级...';
        }
        return '英语学习很重要！你可以让我翻译单词或解释语法。';
    }
    // Science questions
    if (lowerMessage.includes('科学') || lowerMessage.includes('science') || lowerMessage.includes('为什么')) {
        for (let topic in ai.science.explain) {
            if (lowerMessage.includes(topic)) {
                return ai.science.explain(topic);
            }
        }
        if (lowerMessage.includes('天') && lowerMessage.includes('蓝')) {
            return ai.science.explain('为什么天是蓝的');
        }
        if (lowerMessage.includes('雨')) {
            return ai.science.explain('为什么会下雨');
        }
        if (lowerMessage.includes('植物') || lowerMessage.includes('生长')) {
            return ai.science.explain('植物怎么生长');
        }
        if (lowerMessage.includes('光合作用')) {
            return ai.science.explain('什么是光合作用');
        }
        return '科学世界很奇妙！你可以问我"为什么天是蓝的"、"什么是DNA"等问题。';
    }
    // History questions
    if (lowerMessage.includes('历史') || lowerMessage.includes('history')) {
        for (let event in ai.history.events) {
            if (lowerMessage.includes(event)) {
                return ai.history.events[event];
            }
        }
        return '历史很有趣！你可以问我"古埃及"、"文艺复兴"等。';
    }
    // Stories
    if (lowerMessage.includes('故事') || lowerMessage.includes('story')) {
        const storyTitles = Object.keys(ai.stories);
        for (let title of storyTitles) {
            if (lowerMessage.includes(title)) {
                return ai.stories[title];
            }
        }
        return `我有很多故事：${Object.keys(ai.stories).join('、')}。你想听哪个？`;
    }
    // Jokes
    if (lowerMessage.includes('笑话') || lowerMessage.includes('joke')) {
        return ai.jokes[Math.floor(Math.random() * ai.jokes.length)];
    }
    // Encouragement
    if (lowerMessage.includes('棒') || lowerMessage.includes('好') || lowerMessage.includes('厉害')) {
        return ai.encouragements[Math.floor(Math.random() * ai.encouragements.length)];
    }
    // Help
    if (lowerMessage.includes('帮助') || lowerMessage.includes('help') || lowerMessage.includes('怎么')) {
        return `我可以帮你：\n1. 学习数学（加法、减法、乘法、除法）\n2. 学习英语（翻译单词、解释语法）\n3. 探索科学（回答"为什么"问题）\n4. 讲故事\n5. 讲笑话\n试试看吧！`;
    }
    // Default responses
    const defaults = [
        '很有趣的问题！让我们一起探索吧。',
        '这个问题问得好！你觉得呢？',
        '我理解了。还有什么想知道的吗？',
        '谢谢提问！继续努力学习！',
        '好问题！让我想想怎么解释...',
        '学习新知识真开心！'
    ];
    return defaults[Math.floor(Math.random() * defaults.length)];
}
// ==================== MATH QUESTIONS API ====================
function generateMathQuestions(count, type, level = 'random') {
    const questions = [];
    const levels = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'];
    for (let i = 0; i < count; i++) {
        let num1, num2, num3, answer, question;
        const selectedLevel = level === 'random' ? levels[Math.floor(Math.random() * levels.length)] : level;
        switch (type) {
            case 'addition':
                switch (selectedLevel) {
                    case 'Grade 1': num1 = Math.floor(Math.random() * 10) + 1; num2 = Math.floor(Math.random() * 10) + 1; answer = num1 + num2; question = `${num1} + ${num2} = ?`; break;
                    case 'Grade 2': num1 = Math.floor(Math.random() * 50) + 1; num2 = Math.floor(Math.random() * 50) + 1; answer = num1 + num2; question = `${num1} + ${num2} = ?`; break;
                    case 'Grade 3': num1 = Math.floor(Math.random() * 100) + 1; num2 = Math.floor(Math.random() * 100) + 1; answer = num1 + num2; question = `${num1} + ${num2} = ?`; break;
                    default: num1 = Math.floor(Math.random() * 1000) + 1; num2 = Math.floor(Math.random() * 1000) + 1; answer = num1 + num2; question = `${num1} + ${num2} = ?`;
                }
                break;
            case 'subtraction':
                switch (selectedLevel) {
                    case 'Grade 1': num1 = Math.floor(Math.random() * 10) + 1; num2 = Math.floor(Math.random() * num1) + 1; answer = num1 - num2; question = `${num1} - ${num2} = ?`; break;
                    case 'Grade 2': num1 = Math.floor(Math.random() * 50) + 1; num2 = Math.floor(Math.random() * num1) + 1; answer = num1 - num2; question = `${num1} - ${num2} = ?`; break;
                    default: num1 = Math.floor(Math.random() * 100) + 1; num2 = Math.floor(Math.random() * num1) + 1; answer = num1 - num2; question = `${num1} - ${num2} = ?`;
                }
                break;
            case 'multiplication':
                switch (selectedLevel) {
                    case 'Grade 2': num1 = Math.floor(Math.random() * 9) + 1; num2 = Math.floor(Math.random() * 9) + 1; answer = num1 * num2; question = `${num1} × ${num2} = ?`; break;
                    case 'Grade 3': num1 = Math.floor(Math.random() * 12) + 1; num2 = Math.floor(Math.random() * 12) + 1; answer = num1 * num2; question = `${num1} × ${num2} = ?`; break;
                    default: num1 = Math.floor(Math.random() * 20) + 1; num2 = Math.floor(Math.random() * 20) + 1; answer = num1 * num2; question = `${num1} × ${num2} = ?`;
                }
                break;
            case 'division':
                switch (selectedLevel) {
                    case 'Grade 3': num2 = Math.floor(Math.random() * 9) + 1; answer = Math.floor(Math.random() * 9) + 1; num1 = num2 * answer; question = `${num1} ÷ ${num2} = ?`; break;
                    default: num2 = Math.floor(Math.random() * 12) + 1; answer = Math.floor(Math.random() * 12) + 1; num1 = num2 * answer; question = `${num1} ÷ ${num2} = ?`;
                }
                break;
            default:
                const ops = ['+', '-', '×', '÷'];
                const op = ops[Math.floor(Math.random() * ops.length)];
                num1 = Math.floor(Math.random() * 50) + 1;
                num2 = Math.floor(Math.random() * 50) + 1;
                if (op === '+') { answer = num1 + num2; }
                else if (op === '-') { num1 = Math.max(num1, num2); num2 = Math.min(num1, num2); answer = num1 - num2; }
                else if (op === '×') { answer = num1 * num2; }
                else { num2 = Math.floor(Math.random() * 10) + 1; answer = Math.floor(Math.random() * 10) + 1; num1 = num2 * answer; }
                question = `${num1} ${op} ${num2} = ?`;
        }
        questions.push({
            id: i + 1,
            question: question,
            answer: answer,
            level: selectedLevel,
            difficulty: getDifficulty(selectedLevel)
        });
    }
    return questions;
}
function getDifficulty(level) {
    if (level.includes('Kindergarten') || level.includes('Grade 1') || level.includes('Grade 2')) return 'easy';
    if (level.includes('Grade 3') || level.includes('Grade 4') || level.includes('Grade 5')) return 'medium';
    return 'hard';
}
app.get('/api/math/questions', (req, res) => {
    const count = parseInt(req.query.count) || 10;
    const type = req.query.type || 'mixed';
    const level = req.query.level || 'random';
    const questions = generateMathQuestions(count, type, level);
    res.json({ questions, count: questions.length, type, level });
});
// ==================== EDUCATIONAL CONTENT APIS ====================
const englishVocabulary = [
    { word: 'apple', meaning: '苹果', example: 'I eat an apple every day.', level: 'Grade 1' },
    { word: 'book', meaning: '书', example: 'I like to read books.', level: 'Grade 1' },
    { word: 'cat', meaning: '猫', example: 'The cat is sleeping.', level: 'Grade 1' },
    { word: 'dog', meaning: '狗', example: 'My dog likes to play.', level: 'Grade 1' },
    { word: 'school', meaning: '学校', example: 'I go to school at 8 AM.', level: 'Grade 1' },
    { word: 'teacher', meaning: '老师', example: 'My teacher is very kind.', level: 'Grade 2' },
    { word: 'friend', meaning: '朋友', example: 'I have a best friend.', level: 'Grade 2' },
    { word: 'happy', meaning: '快乐', example: 'I feel very happy today.', level: 'Grade 2' },
    { word: 'beautiful', meaning: '美丽', example: 'The flower is beautiful.', level: 'Grade 3' },
    { word: 'important', meaning: '重要', example: 'Education is important.', level: 'Grade 4' },
    { word: 'different', meaning: '不同', example: 'We are all different.', level: 'Grade 4' },
    { word: 'wonderful', meaning: '精彩', example: 'That was wonderful!', level: 'Grade 5' }
];
app.get('/api/english/vocabulary', (req, res) => {
    const level = req.query.level;
    let vocab = englishVocabulary;
    if (level) {
        vocab = vocab.filter(v => v.level === level);
    }
    res.json({ vocabulary: vocab, count: vocab.length });
});
const grammarRules = [
    { rule: 'Present Simple', example: 'I eat apples every day.', level: 'Grade 1' },
    { rule: 'Present Continuous', example: 'I am eating now.', level: 'Grade 2' },
    { rule: 'Past Simple', example: 'I ate an apple yesterday.', level: 'Grade 3' },
    { rule: 'Future Simple', example: 'I will eat an apple tomorrow.', level: 'Grade 4' },
    { rule: 'Comparatives', example: 'Apples are bigger than grapes.', level: 'Grade 4' },
    { rule: 'Superlatives', example: 'Watermelon is the biggest fruit.', level: 'Grade 5' }
];
app.get('/api/english/grammar', (req, res) => {
    const level = req.query.level;
    let rules = grammarRules;
    if (level) {
        rules = rules.filter(r => r.level === level);
    }
    res.json({ rules, count: rules.length });
});
const scienceFacts = [
    { topic: 'Animals', fact: 'Dolphins are very smart animals.' },
    { topic: 'Plants', fact: 'Plants give us oxygen to breathe.' },
    { topic: 'Space', fact: 'The Sun is a star.' },
    { topic: 'Earth', fact: 'The Earth is round like a ball.' },
    { topic: 'Water', fact: 'Water can be ice, liquid, or steam.' },
    { topic: 'Light', fact: 'Light travels very fast.' },
    { topic: 'Sound', fact: 'Sound needs air to travel.' },
    { topic: 'Gravity', fact: 'Gravity keeps us on the ground.' }
];
app.get('/api/science/facts', (req, res) => {
    const topic = req.query.topic;
    let facts = scienceFacts;
    if (topic) {
        facts = facts.filter(f => f.topic.toLowerCase() === topic.toLowerCase());
    }
    res.json({ facts, count: facts.length });
});
const geometryShapes = {
    '2D': [
        { name: 'Circle', sides: 0, vertices: 0, description: 'Round shape' },
        { name: 'Square', sides: 4, vertices: 4, description: 'Four equal sides' },
        { name: 'Triangle', sides: 3, vertices: 3, description: 'Three sides' },
        { name: 'Rectangle', sides: 4, vertices: 4, description: 'Four sides, right angles' }
    ],
    '3D': [
        { name: 'Cube', vertices: 8, edges: 12, faces: 6, description: 'Six square faces' },
        { name: 'Sphere', vertices: 0, edges: 0, faces: 1, description: 'Round 3D shape' },
        { name: 'Cylinder', vertices: 0, edges: 2, faces: 3, description: 'Two circular bases' }
    ]
};
app.get('/api/geometry/shapes', (req, res) => {
    const type = req.query.type || '2D';
    res.json({ shapes: geometryShapes[type] || geometryShapes['2D'], type });
});
const healthTips = [
    'Eat fruits and vegetables every day.',
    'Drink lots of water.',
    'Sleep 8-10 hours each night.',
    'Exercise for 30 minutes daily.',
    'Wash your hands before eating.',
    'Brush your teeth twice a day.',
    'Sit up straight when reading.',
    'Take breaks from screens.'
];
app.get('/api/health/tips', (req, res) => {
    const count = parseInt(req.query.count) || 3;
    const tips = healthTips.sort(() => Math.random() - 0.5).slice(0, count);
    res.json({ tips, count: tips.length });
});
const storyLibrary = [
    { title: 'The Little Red Riding Hood', genre: 'Fairy Tale', length: 'Short' },
    { title: 'Goldilocks and the Three Bears', genre: 'Fairy Tale', length: 'Short' },
    { title: 'The Three Little Pigs', genre: 'Fairy Tale', length: 'Medium' },
    { title: 'Cinderella', genre: 'Fairy Tale', length: 'Medium' },
    { title: 'The Lion and the Mouse', genre: 'Aesop', length: 'Short' },
    { title: 'The Tortoise and the Hare', genre: 'Aesop', length: 'Short' }
];
app.get('/api/stories', (req, res) => {
    const genre = req.query.genre;
    let stories = storyLibrary;
    if (genre) {
        stories = stories.filter(s => s.genre.toLowerCase() === genre.toLowerCase());
    }
    res.json({ stories, count: stories.length });
});
const affirmations = [
    'You are smart and capable!',
    'You can learn anything!',
    'Mistakes help us grow.',
    'Keep trying your best.',
    'Your brain is amazing!',
    'You are unique and special.',
    'Kindness matters.',
    'Practice makes progress!'
];
app.get('/api/affirmations', (req, res) => {
    const count = parseInt(req.query.count) || 1;
    const selected = affirmations.sort(() => Math.random() - 0.5).slice(0, count);
    res.json({ affirmations: selected, count: selected.length });
});
const jokes = [
    'Why did the math book look sad? It had too many problems!',
    'What is a tree\'s favorite subject? Geometry!',
    'Why was the computer cold? It left its Windows open!',
    'What do you call a fish with no eyes? A fsh!',
    'Why do seagulls fly over the sea? Because if they flew over the bay they would be bagels!',
    'What is a witch\'s favorite subject? Spelling!'
];
app.get('/api/jokes', (req, res) => {
    const count = parseInt(req.query.count) || 3;
    const selectedJokes = jokes.sort(() => Math.random() - 0.5).slice(0, count);
    res.json({ jokes: selectedJokes, count: selectedJokes.length });
});
const europeanCulture = [
    { country: 'France', fact: 'Paris is the capital city.', famous: 'Eiffel Tower' },
    { country: 'United Kingdom', fact: 'London is the capital city.', famous: 'Big Ben' },
    { country: 'Italy', fact: 'Rome is the capital city.', famous: 'Colosseum' },
    { country: 'Germany', fact: 'Berlin is the capital city.', famous: 'Brandenburg Gate' },
    { country: 'Spain', fact: 'Madrid is the capital city.', famous: 'Sagrada Família' }
];
app.get('/api/culture/europe', (req, res) => {
    const country = req.query.country;
    let culture = europeanCulture;
    if (country) {
        culture = culture.filter(c => c.country.toLowerCase() === country.toLowerCase());
    }
    res.json({ culture, count: culture.length });
});
const funFacts = [
    'A group of flamingos is called a "flamboyance".',
    'Honey never spoils. 3000-year-old honey is still edible!',
    'A day on Venus is longer than its year.',
    'Octopuses have three hearts and blue blood.',
    'The shortest war in history lasted 38 minutes.',
    'Bananas are berries, but strawberries are not!'
];
app.get('/api/funfacts', (req, res) => {
    const count = parseInt(req.query.count) || 3;
    const facts = funFacts.sort(() => Math.random() - 0.5).slice(0, count);
    res.json({ facts, count: facts.length });
});
// ==================== SERVER START ====================
app.listen(PORT, () => {
    console.log(`\n🚀 Learning Companion Robot Server running on http://localhost:${PORT}`);
    console.log(`📁 Static files served from: ${path.join(__dirname, 'docs')}`);
    console.log(`📚 Curriculum API available`);
    console.log(`🤖 AI Chat API available`);
    console.log(`\n📖 Available endpoints:`);
    console.log(`   - GET  /api/curriculum/levels`);
    console.log(`   - GET  /api/curriculum/grade/:grade`);
    console.log(`   - POST /api/ai/chat`);
    console.log(`   - GET  /api/math/questions`);
    console.log(`   - And many more educational APIs!`);
});
