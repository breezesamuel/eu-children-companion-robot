const express = require('express');
const router = express.Router();
const engine = require('../services/learning-engine');
const path = require('path');
const fs = require('fs');

let axios;
try { axios = require('axios'); } catch (_) { axios = null; }

// Generated data files
const GENERATED_GRAMMAR = require('./generated-grammar.json');
const GENERATED_SPEAKING = require('./generated-speaking.json');
const GENERATED_WRITING = require('./generated-writing.json');
const GENERATED_SPELLING = require('./generated-spelling.json');

router.use((req, res, next) => {
  if (engine.ready) return next();
  engine.once('ready', next);
});

// ==================== SEARCH ====================
router.get('/search', (req, res) => {
  const { q, type, category, level, limit = 20, offset = 0 } = req.query;
  const results = engine.search(q, {
    type, category, level,
    limit: parseInt(limit),
    offset: parseInt(offset)
  });
  res.json({ success: true, ...results });
});

// ==================== VOCABULARY STUDY ====================
router.get('/vocabulary', (req, res) => {
  const { count = 10, level } = req.query;
  const words = engine.getVocabularyForStudy(parseInt(count), level);
  res.json({ success: true, data: words, total: words.length });
});

// ==================== FLASHCARDS ====================
router.get('/flashcards', (req, res) => {
  const { type = 'vocabulary', count = 10, level } = req.query;
  let cards = [];
  if (type === 'vocabulary') {
    cards = engine.getVocabularyForStudy(parseInt(count), level).map(w => ({
      front: w.word,
      back: `${w.meaning}<br><small>${w.phonetic}</small><br>${w.example}`,
      level: w.level
    }));
  }
  res.json({ success: true, data: cards, total: cards.length });
});

// ==================== QUIZ ====================
router.get('/quiz', (req, res) => {
  const { type = 'vocabulary', count = 5, level } = req.query;
  const questions = engine.generateQuiz(type, parseInt(count), level);
  res.json({ success: true, data: questions, total: questions.length });
});

// ==================== EXPLORE ====================
router.get('/explore', (req, res) => {
  const categories = engine.getAllCategories();
  res.json({
    success: true,
    data: Object.entries(categories).map(([name, count]) => ({ name, count })),
    structured: engine.getAllStructuredCategories()
  });
});

// ==================== STRUCTURED CONTENT BY CATEGORY ====================
router.get('/content/:category', (req, res) => {
  const { category } = req.params;
  const { limit = 20, offset = 0 } = req.query;
  const result = engine.getByCategory(category, parseInt(limit), parseInt(offset));
  res.json({ success: true, ...result });
});

// ==================== SCRAPED CONTENT ====================
router.get('/scraped', (req, res) => {
  const { category, limit = 20, offset = 0 } = req.query;
  const result = engine.getScrapedContent(category, parseInt(limit), parseInt(offset));
  res.json({ success: true, ...result });
});

// ==================== PROGRESS ====================
router.post('/progress', (req, res) => {
  const userId = req.user?.userId || req.ip || 'anonymous';
  const { contentType, itemId, score = 100, completed = true } = req.body;
  const result = engine.recordProgress(userId, { contentType, itemId, score, completed });
  res.json({ success: true, ...result });
});

router.get('/progress', (req, res) => {
  const userId = req.user?.userId || req.ip || 'anonymous';
  const result = engine.getProgress(userId);
  res.json({ success: true, ...result });
});

// ==================== CONTENT STATS ====================
router.get('/types', (req, res) => {
  const cats = engine.getAllStructuredCategories();
  const allCats = engine.getAllCategories();
  res.json({
    success: true,
    data: [
      { id: 'vocabulary', name: 'English Vocabulary', icon: '📖', count: engine.vocabulary.length },
      { id: 'grammar', name: 'Grammar', icon: '📝', count: cats['grammar'] || 0 },
      { id: 'math', name: 'Mathematics', icon: '🔢', count: Object.entries(cats).filter(([k]) => k.startsWith('math')).reduce((s, [,c]) => s + c, 0) },
      { id: 'science', name: 'Science', icon: '🔬', count: Object.entries(cats).filter(([k]) => k.startsWith('science')).reduce((s, [,c]) => s + c, 0) },
      { id: 'stories', name: 'Stories & Fables', icon: '📚', count: (cats['stories_fairy_tales'] || 0) + (cats['stories_fables'] || 0) + (cats['stories_bedtime'] || 0) },
      { id: 'culture', name: 'Culture & World', icon: '🌍', count: (cats['culture_europe'] || 0) + (cats['culture_world'] || 0) },
      { id: 'fun', name: 'Fun & Games', icon: '🎮', count: (cats['jokes'] || 0) + (cats['riddles'] || 0) + (cats['fun_facts'] || 0) + (cats['tongue_twisters'] || 0) },
      { id: 'life_skills', name: 'Life Skills', icon: '💡', count: cats['life_skills'] || 0 },
      { id: 'scraped', name: 'Scraped Content', icon: '🌐', count: engine.scrapedContent.length },
      { id: 'agent-scraped', name: '采集内容', icon: '🕷️', count: 0 },
    ],
    total: engine.getContentStats()
  });
});

// ==================== ENGLISH MODULES (Comprehensive) ====================
const ENGLISH_SPEAKING = GENERATED_SPEAKING;

const ENGLISH_WRITING = GENERATED_WRITING;

const ENGLISH_READING = [
  { title: 'The Brave Little Seed', zh: '勇敢的小种子', en: 'Once upon a time, a tiny seed lay underground. It was dark and cold. The seed felt scared. "I want to see the sun," it whispered. Day after day, the seed pushed upward. It was hard work. Finally, it broke through the soil. The sun was warm and bright. The seed grew into a beautiful flower. All the other flowers said, "You are so brave!"', zhText: '从前，一颗小小的种子躺在地下。又黑又冷。种子很害怕。"我想看到太阳，"它轻声说。日复一日，种子向上生长。这很辛苦。终于，它破土而出。阳光温暖而明亮。种子长成了一朵美丽的花。所有的花都说："你真勇敢！"', questions: ['What did the seed want to see?', 'How did the seed feel underground?', 'What did the seed become?'] },
  { title: 'The Helpful Dolphin', zh: '助人为乐的海豚', en: 'Tom was swimming in the sea when he felt tired. He could not swim back to shore. Just then, a dolphin appeared. The dolphin let Tom hold its fin. It pulled him safely to the beach. "Thank you, dolphin!" Tom said. The dolphin made a happy sound and swam away.', zhText: '汤姆在海里游泳时感到累了。他游不回岸边了。就在这时，一只海豚出现了。海豚让汤姆抓住它的鳍。它把汤姆安全地拉到了海滩上。"谢谢你，海豚！"汤姆说。海豚发出快乐的声音，游走了。', questions: ['Why could Tom not swim back?', 'How did the dolphin help Tom?', 'How did Tom feel at the end?'] },
  { title: 'The Rainbow Garden', zh: '彩虹花园', en: 'Mia planted seeds of different colors. She watered them every day. First, red flowers grew. Then yellow flowers appeared. Blue and purple flowers came next. Soon, her garden looked like a rainbow. "My rainbow garden!" Mia clapped happily. Her friends came to see the beautiful flowers.', zhText: '米娅种下了不同颜色的种子。她每天都给它们浇水。首先，红色的花开了。然后黄色的花出现了。蓝色和紫色的花接着开放。很快，她的花园看起来像彩虹一样。"我的彩虹花园！"米娅高兴地拍手。她的朋友们都来看这些美丽的花。', questions: ['What did Mia plant?', 'What color flowers grew first?', 'What did Mia call her garden?'] },
  { title: 'The Star Collector', zh: '收集星星的孩子', en: 'Every night, Leo looked at the stars. He wanted to catch one. He climbed the highest hill. He reached up high. A tiny star fell into his hand. It was warm and sparkled. "You are beautiful," Leo said. The star whispered, "I will light up your dreams." Leo smiled and put the star in his pocket.', zhText: '每天晚上，利奥都看着星星。他想抓住一颗。他爬上了最高的山丘。他高高地伸出手。一颗小星星落到了他的手里。它温暖而闪烁。"你真美，"利奥说。星星轻声说："我会照亮你的梦想。"利奥笑了，把星星放进了口袋。', questions: ['What did Leo want to do?', 'Where did Leo climb?', 'What did the star promise?'] },
  { title: 'The Kind Elephant', zh: '善良的大象', en: 'In the jungle, a big elephant named Ella helped everyone. She carried food for the monkeys. She splashed water for the birds to drink. She cleared paths for the rabbits. One day, Ella got stuck in the mud. All the animals came to help. They pushed and pulled until Ella was free. "Thank you, friends!" Ella said.', zhText: '在丛林中，一头名叫艾拉的大象帮助每个人。她为猴子们搬运食物。她为鸟儿们泼水喝。她为兔子们清理道路。一天，艾拉陷进了泥里。所有的动物都来帮忙。它们又推又拉，直到艾拉脱险。"谢谢你们，朋友们！"艾拉说。', questions: ['How did Ella help the monkeys?', 'What happened to Ella one day?', 'Who helped Ella?'] },
  { title: 'The Magic Paintbrush', zh: '神笔马良', en: 'Lily found a magic paintbrush. Everything she painted came to life! She painted a butterfly, and it flew away. She painted a tree, and it grew tall. She painted a rainbow, and it appeared in the sky. Lily decided to paint things that make people happy. She painted food for the hungry and houses for the homeless.', zhText: '莉莉找到了一支神笔。她画的一切都变活了！她画了一只蝴蝶，蝴蝶飞走了。她画了一棵树，树长高了。她画了一道彩虹，彩虹出现在天空中。莉莉决定画让人快乐的东西。她为饥饿的人画了食物，为无家可归的人画了房子。', questions: ['What could the magic paintbrush do?', 'What did Lily paint first?', 'What did Lily decide to paint?'] },
  { title: 'The Friendly Robot', zh: '友好的机器人', en: 'Ben got a robot for his birthday. The robot named Spark could talk and help with homework. "Let\'s learn together!" Spark said. Every day, Spark taught Ben new words. They did math puzzles. Spark told funny jokes. Ben\'s English got better and better. "You are my best friend," Ben told Spark one day.', zhText: '本在生日那天收到了一个机器人。这个名叫斯帕克的机器人会说话，还能帮忙做作业。"我们一起学习吧！"斯帕克说。每天，斯帕克都教本新单词。他们一起做数学谜题。斯帕克讲有趣的笑话。本的英语越来越好了。"你是我最好的朋友，"有一天本对斯帕克说。', questions: ['What could Spark do?', 'What did Spark teach Ben?', 'How did Ben feel about Spark?'] },
  { title: 'The Four Seasons', zh: '四季', en: 'Spring brings warm rain and pretty flowers. Summer brings hot sun and beach days. Fall brings colorful leaves and cool wind. Winter brings snow and warm cocoa. Each season is special and beautiful. Can you name all four seasons? Which one is your favorite?', zhText: '春天带来温暖的雨水和美丽的花朵。夏天带来炎热的阳光和沙滩日。秋天带来五彩的树叶和凉爽的风。冬天带来雪花和热可可。每个季节都很特别、很美丽。你能说出四个季节吗？你最喜欢哪一个？', questions: ['What does spring bring?', 'What can you do in summer?', 'What is special about each season?'] },
  { title: 'The Little Astronaut', zh: '小宇航员', en: 'Maya wanted to be an astronaut. She read books about space. She studied the stars. She practiced flying in her imagination. One night, she dreamed she flew to the moon. She saw Earth from far away. It looked like a blue marble. "I WILL go to space one day," Maya said. And she studied even harder.', zhText: '玛雅想成为一名宇航员。她读关于太空的书。她研究星星。她在想象中练习飞行。一天晚上，她梦见自己飞到了月球。她从远处看到了地球。它看起来像一颗蓝色弹珠。"我总有一天会去太空的，"玛雅说。她更加努力学习了。', questions: ['What did Maya want to be?', 'What did Maya see in her dream?', 'How did Maya work toward her dream?'] },
  { title: 'The Secret Code', zh: '秘密代码', en: 'Sam and Emma found a secret code. It was written on old paper. They tried to crack it. "A=1, B=2," said Sam. "Let\'s decode it!" Emma said. They worked together and decoded the message. It said: "The treasure is under the big tree!" They ran outside and found a box full of books. Reading was the real treasure!', zhText: '山姆和艾玛发现了一个秘密代码。它写在一张旧纸上。他们试图破解它。"A=1，B=2，"山姆说。"我们来解码！"艾玛说。他们一起合作，解码了信息。上面写着："宝藏在大树下面！"他们跑到外面，发现了一个装满书的盒子。阅读才是真正的宝藏！', questions: ['What did Sam and Emma find?', 'How did they decode the message?', 'What was the real treasure?'] },
  { title: 'The Water Cycle', zh: '水循环', en: 'Water is always moving. The sun heats water in rivers and lakes. It turns into vapor and rises to the sky. This is called evaporation. In the sky, the vapor cools and forms clouds. This is condensation. When the clouds get heavy, rain falls. This is precipitation. The water goes back to rivers and lakes, and the cycle starts again. Water never stops moving!', zhText: '水总在运动。太阳加热河流和湖泊中的水。水变成水蒸气升到天空，这叫做蒸发。在天空中，水蒸气冷却形成云，这叫做凝结。当云变重时，雨落下来，这叫做降水。水回到河流和湖泊，循环再次开始。水从不停止运动！', questions: ['What happens to water when the sun heats it?', 'What forms when vapor cools in the sky?', 'What are the three steps of the water cycle called?'] },
  { title: 'The Honest Woodcutter', zh: '诚实的樵夫', en: 'A woodcutter dropped his axe into a river. He was sad because it was his only tool. A water spirit appeared with a golden axe. "Is this yours?" asked the spirit. "No," said the woodcutter. The spirit brought a silver axe. "Is this yours?" "No," said the woodcutter again. Finally, the spirit brought his old iron axe. "Yes, that is mine!" said the woodcutter happily. The spirit was impressed by his honesty and gave him all three axes as a reward.', zhText: '一个樵夫把斧头掉进了河里。他很伤心，因为这是他唯一的工具。一个水精灵出现了，拿着一把金斧头。"这是你的吗？"精灵问。"不是，"樵夫说。精灵拿来一把银斧头。"这是你的吗？""不是，"樵夫再次说。最后，精灵拿来了他的旧铁斧头。"是的，那是我的！"樵夫高兴地说。精灵被他的诚实打动了，把三把斧头都作为奖励给了他。', questions: ['Why was the woodcutter sad?', 'What did the woodcutter say about the golden axe?', 'What was the reward for the woodcutter\'s honesty?'] },
  { title: 'How Bees Make Honey', zh: '蜜蜂如何酿蜜', en: 'Bees work very hard to make honey. First, worker bees fly to flowers. They use their long tongues to drink nectar, a sweet liquid from the flowers. The nectar is stored in their special honey stomach. Back at the hive, the bees pass the nectar to other worker bees. The bees fan their wings to dry the nectar. This turns it into thick, sweet honey. The honey is stored in wax cells. A single bee makes only about 1/12 of a teaspoon of honey in its whole life!', zhText: '蜜蜂非常努力地工作来酿造蜂蜜。首先，工蜂飞到花朵上。它们用长长的舌头喝花蜜，这是来自花朵的甜液体。花蜜储存在它们特殊的蜜胃里。回到蜂巢后，蜜蜂把花蜜传递给其他工蜂。蜜蜂扇动翅膀来干燥花蜜。这使它变成浓稠甜美的蜂蜜。蜂蜜储存在蜡制的蜂巢格里。一只蜜蜂一生只能酿造大约十二分之一茶匙的蜂蜜！', questions: ['What do bees use to drink nectar?', 'Where is nectar stored in a bee?', 'How do bees make nectar into honey?'] },
  { title: 'The Great Wall of China', zh: '中国长城', en: 'The Great Wall of China is one of the most famous structures in the world. It was built over many centuries, starting more than 2,000 years ago. Different Chinese emperors built walls to protect their land from invaders. The wall is about 21,000 kilometers long. It is made of stone, brick, and earth. Millions of people worked to build it. Today, the Great Wall is a UNESCO World Heritage site and millions of tourists visit it every year. Some parts of the wall are being restored to preserve this amazing structure.', zhText: '中国长城是世界上最著名的建筑之一。它历经多个世纪建造而成，始于2000多年前。不同的中国皇帝修建城墙来保护他们的土地免受入侵者的侵扰。长城长约21000公里。它由石头、砖头和泥土建成。数百万人参与了建造。如今，长城是联合国教科文组织世界遗产，每年有数百万游客参观。部分城墙正在修复，以保护这一惊人的建筑。', questions: ['Why was the Great Wall built?', 'How long is the Great Wall?', 'What is the Great Wall made of?'] },
  { title: 'The Curiosity of Cats', zh: '猫的好奇心', en: 'Cats are naturally curious animals. They explore their environment with all their senses. Their whiskers help them measure spaces to see if they can fit through. Cats have excellent night vision and can see in light six times dimmer than humans need. They also have a special reflective layer in their eyes called the tapetum lucidum, which helps them see better in the dark. Cats spend about 70% of their lives sleeping. When they are awake, they love to explore high places, chase moving objects, and investigate new smells.', zhText: '猫天生是好奇的动物。它们用所有感官探索环境。它们的胡须帮助它们测量空间，看是否能通过。猫有极好的夜间视力，可以在比人类所需暗六倍的光线下看东西。它们的眼睛里还有一层特殊的反射层，叫做绒毡层，帮助它们在黑暗中看得更清楚。猫一生中大约70%的时间在睡觉。醒着的时候，它们喜欢探索高处、追逐移动的物体和调查新的气味。', questions: ['What do cats use their whiskers for?', 'How much of their lives do cats spend sleeping?', 'What helps cats see better in the dark?'] },
];

const ENGLISH_GRAMMAR = GENERATED_GRAMMAR;

const ENGLISH_SPELLING_LEVELS = GENERATED_SPELLING;

// Reading comprehension questions with answers
const READING_ANSWERS = [
  // Passage 0: The Brave Little Seed
  ['sun', 'sunlight', 'the sun', 'light'],
  ['scared', 'afraid', 'frightened', 'nervous'],
  ['a flower', 'flower', 'beautiful flower', 'plant'],
  // Passage 1: The Helpful Dolphin
  ['tired', 'too tired', 'he was tired'],
  ['held its fin', 'hold its fin', 'by holding its fin', 'it let tom hold its fin'],
  ['happy', 'thankful', 'grateful', 'glad'],
  // Passage 2: The Rainbow Garden
  ['seeds', 'different colored seeds', 'seeds of different colors'],
  ['red', 'red flowers', 'red ones'],
  ['rainbow garden', 'my rainbow garden', 'a rainbow garden'],
  // Passage 3: The Star Collector
  ['catch a star', 'catch one', 'catch a star'],
  ['the highest hill', 'a hill', 'a high hill'],
  ['light up his dreams', 'light up dreams', 'it will light up your dreams'],
  // Passage 4: The Kind Elephant
  ['carried food', 'by carrying food'],
  ['got stuck in the mud', 'stuck in mud'],
  ['all the animals', 'the animals'],
  // Passage 5: The Magic Paintbrush
  ['bring things to life', 'make things real', 'paint things to life'],
  ['a butterfly', 'butterfly'],
  ['things that make people happy'],
  // Passage 6: The Friendly Robot
  ['talk and help with homework', 'talk and help'],
  ['new words', 'english words'],
  ['best friend', 'his best friend'],
  // Passage 7: The Four Seasons
  ['warm rain and pretty flowers'],
  ['beach days', 'go to beach', 'swim'],
  ['each is special and beautiful'],
  // Passage 8: The Little Astronaut
  ['an astronaut', 'astronaut'],
  ['earth', 'earth from far away'],
  ['by studying', 'reading books', 'studying harder'],
  // Passage 9: The Secret Code
  ['a secret code', 'secret code', 'code'],
  ['using a=1 b=2', 'by decoding', 'working together'],
  ['reading', 'books', 'reading books'],
  // Passage 10: The Water Cycle
  ['turns to vapor', 'evaporates', 'becomes vapor', 'goes up as vapor'],
  ['clouds', 'water vapor forms clouds', 'cloud'],
  ['evaporation', 'condensation', 'precipitation', 'all three'],
  // Passage 11: The Honest Woodcutter
  ['he dropped his axe', 'lost his axe', 'axe fell in river'],
  ['no', 'said no', 'it was not his'],
  ['all three axes', 'three axes', 'axes as reward'],
  // Passage 12: How Bees Make Honey
  ['their long tongues', 'tongues', 'long tongue', 'tongue'],
  ['honey stomach', 'special stomach', 'stomach'],
  ['fan their wings', 'by fanning wings', 'drying with wings'],
  // Passage 13: The Curiosity of Cats
  ['measure spaces', 'to see if they fit', 'check openings'],
  ['about 70 percent', '70%', 'most of their life'],
  ['tapetum lucidum', 'reflective layer', 'special layer'],
  // Passage 14: The Great Wall of China
  ['for protection', 'to defend', 'from invaders', 'to protect land'],
  ['21000 km', '21000 kilometers', 'about 21000 km'],
  ['stone', 'brick', 'earth', 'stone brick and earth'],
];
for (let i = 0; i < ENGLISH_READING.length; i++) {
  const s = ENGLISH_READING[i];
  const qi = i * 3;
  s.answers = READING_ANSWERS.slice(qi, qi + 3) || [];
  s.questions = s.questions || [];
}

router.get('/english/:module', (req, res) => {
  const { module } = req.params;
  const { count = 20, page = 1, level, query } = req.query;
  const limit = Math.min(parseInt(count), 100);
  const offset = (parseInt(page) - 1) * limit;

  switch (module) {
    case 'vocabulary': {
      const words = engine.getVocabularyForStudy(limit, level);
      const total = level ? engine.vocabulary.filter(w => w.level === level).length : engine.vocabulary.length;
      res.json({ success: true, data: words, total, page: parseInt(page), module });
      break;
    }
    case 'grammar': {
      const slice = ENGLISH_GRAMMAR.slice(offset, offset + limit);
      res.json({ success: true, data: slice, total: ENGLISH_GRAMMAR.length, page: parseInt(page), module });
      break;
    }
    case 'speaking': {
      const slice = ENGLISH_SPEAKING.slice(offset, offset + limit);
      res.json({ success: true, data: slice, total: ENGLISH_SPEAKING.length, page: parseInt(page), module });
      break;
    }
    case 'writing': {
      const slice = ENGLISH_WRITING.slice(offset, offset + limit);
      res.json({ success: true, data: slice, total: ENGLISH_WRITING.length, page: parseInt(page), module });
      break;
    }
    case 'reading': {
      const slice = ENGLISH_READING.slice(offset, offset + limit);
      res.json({ success: true, data: slice, total: ENGLISH_READING.length, page: parseInt(page), module });
      break;
    }
    case 'spelling': {
      const lvl = level
        ? ENGLISH_SPELLING_LEVELS.find(l => l.level.includes(level) || level.includes(l.level)) || ENGLISH_SPELLING_LEVELS[0]
        : ENGLISH_SPELLING_LEVELS[0];
      const words = lvl.words.slice(offset, offset + limit);
      res.json({ success: true, data: words, total: lvl.words.length, level: lvl.level, page: parseInt(page), module });
      break;
    }
    case 'search': {
      if (!query) return res.json({ success: true, data: [], total: 0, module });
      const q = query.toLowerCase();
      const results = [];
      ENGLISH_GRAMMAR.filter(g => g.rule.toLowerCase().includes(q) || g.zh.includes(q)).forEach(g => results.push({ type: 'grammar', ...g }));
      ENGLISH_SPEAKING.filter(s => s.topic.toLowerCase().includes(q) || s.zh.includes(q)).forEach(s => results.push({ type: 'speaking', ...s }));
      ENGLISH_WRITING.filter(w => w.title.toLowerCase().includes(q) || w.zh.includes(q)).forEach(w => results.push({ type: 'writing', ...w }));
      ENGLISH_READING.filter(r => r.title.toLowerCase().includes(q) || r.zh.includes(q)).forEach(r => results.push({ type: 'reading', ...r }));
      const engineResults = engine.search(q, { limit: 10 });
      engineResults.data.forEach(item => results.push({ type: 'content', ...item }));
      res.json({ success: true, data: results.slice(offset, offset + limit), total: results.length, page: parseInt(page), module });
      break;
    }
    case 'all': {
      res.json({
        success: true,
        data: {
          grammar: ENGLISH_GRAMMAR.length,
          speaking: ENGLISH_SPEAKING.length,
          writing: ENGLISH_WRITING.length,
          reading: ENGLISH_READING.length,
          spelling: ENGLISH_SPELLING_LEVELS.reduce((s, l) => s + l.words.length, 0),
          vocabulary: engine.vocabulary.length,
        },
        module
      });
      break;
    }
    default:
      res.status(400).json({ success: false, error: `Unknown module: ${module}. Available: vocabulary, grammar, speaking, writing, reading, spelling, search, all` });
  }
});

module.exports = router;
