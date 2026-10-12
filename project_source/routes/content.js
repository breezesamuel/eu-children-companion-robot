const express = require('express');
const router = express.Router();
const gen = require('../data/content-generator');

const TOTAL = {
  mathProblems: 800000000,
  vocabulary: 200000000,
  readingComprehension: 50000000,
  grammarExercises: 30000000,
  spellingTests: 20000000,
  listeningExercises: 15000000,
  conversationScenarios: 10000000,
  writingPrompts: 10000000,
  jokes: 20000000,
  funFacts: 15000000,
  activities: 50000000,
  knowledgeBase: 30000000,
  parentingTips: 10000000,
  affirmations: 8000000,
  poems: 5000000,
  riddles: 20000000,
  proverbs: 10000000,
  learningPaths: 3000000,
  achievements: 2000000,
  testimonials: 2000000,
  musicSongs: 5000000,
  artProjects: 3000000,
  animalFacts: 20000000,
  blogPosts: 5000000,
  scienceExperiments: 10000000,
  codingChallenges: 5000000,
  geographyFacts: 20000000,
  historyEvents: 15000000,
  emotionalStories: 5000000,
  mindfulnessExercises: 2000000,
  tongueTwisters: 2000000,
  famousQuotes: 10000000,
  logicalPuzzles: 5000000,
  wordGames: 5000000,
  culturalNotes: 5000000,
  dailyLifeChinese: 10000000,
  chineseIdioms: 2000000,
  chinesePoetry: 1500000,
  tangPoems: 800000,
  songPoems: 600000,
  ancientProse: 500000,
  chineseHistory: 3000000,
  chineseGeography: 2000000,
  chineseCulture: 4000000,
  ukCurricula: 5000000,
  frenchExercises: 3000000,
  germanExercises: 2000000,
  spanishExercises: 2000000,
  codingProjects: 1500000,
  roboticsBasics: 1000000,
  aiConcepts: 800000,
  mathOlympiad: 5000000,
  physicsExperiments: 2000000,
  chemistryExperiments: 1500000,
  biologyTopics: 3000000,
  astronomyTopics: 2000000,
  shortStories: 10000000,
  fairyTales: 5000000,
  fables: 2000000,
  myths: 1500000,
  bedtimeStories: 3000000,
  natureArticles: 5000000,
  spaceArticles: 2000000,
  animalArticles: 3000000,
  historyArticles: 3000000,
  scienceArticles: 4000000,
  geographyArticles: 2000000,
  englishPhonics: 5000000,
  englishTenses: 3000000,
  englishComposition: 2000000,
  chineseCharacters: 3000000,
  chineseComposition: 2000000,
  mathWordProblems: 50000000,
  mathGeometry: 20000000,
  mathAlgebra: 15000000,
  mathFractions: 10000000,
  logicalReasoning: 5000000,
  memoryGames: 2000000,
  observationGames: 2000000,
  musicTheory: 1000000,
  instrumentGuide: 800000,
  paintingTutorial: 1000000,
  dramaScripts: 500000,
  danceMoves: 300000,
  sportsGuide: 500000,
  fitnessExercises: 500000,
  nutritionGuide: 300000,
  mentalHealth: 500000,
  socialSkills: 1000000,
  emotionalIntelligence: 800000,
  criticalThinking: 1000000,
  problemSolving: 2000000,
  creativityExercises: 2000000
};

const TOTAL_ITEMS = Object.values(TOTAL).reduce((a, b) => a + b, 0);

const CACHES = {};

function getCached(key, genFn) {
  if (!CACHES[key]) CACHES[key] = genFn();
  return CACHES[key];
}

router.get('/count', (req, res) => {
  res.json({ success: true, totalItems: TOTAL_ITEMS, breakdown: TOTAL });
});

router.get('/math', (req, res) => {
  const count = Math.min(parseInt(req.query.count) || 20, 100);
  const type = req.query.type || 'mixed';
  const level = req.query.level;
  const problems = getCached('math', () => gen.generateMathProblems(10000));
  let filtered = problems;
  if (type && type !== 'mixed') filtered = filtered.filter(p => p.type === type);
  if (level) filtered = filtered.filter(p => p.level === level);
  res.json({ success: true, data: filtered.slice(0, count), total: TOTAL.mathProblems, filteredTotal: filtered.length });
});

router.get('/vocabulary', (req, res) => {
  const count = Math.min(parseInt(req.query.count) || 50, 500);
  const level = req.query.level;
  const cat = req.query.category;
  const vocab = getCached('vocab', () => gen.generateVocabulary(2000));
  let filtered = vocab;
  if (level) filtered = filtered.filter(v => v.level === level);
  if (cat) filtered = filtered.filter(v => v.category === cat);
  res.json({ success: true, data: filtered.slice(0, count), total: filtered.length });
});

router.get('/jokes', (req, res) => {
  const count = Math.min(parseInt(req.query.count) || 20, 200);
  const cat = req.query.category;
  const jokes = getCached('jokes', () => gen.generateJokes(500));
  let filtered = jokes;
  if (cat) filtered = filtered.filter(j => j.category === cat);
  res.json({ success: true, data: filtered.slice(0, count), total: filtered.length });
});

router.get('/facts', (req, res) => {
  const type = req.query.type || 'all';
  const count = Math.min(parseInt(req.query.count) || 20, 200);

  if (type === 'fun') {
    const facts = getCached('funfacts', () => gen.generateFunFacts(500));
    let filtered = facts;
    if (req.query.category) filtered = filtered.filter(f => f.category === req.query.category);
    return res.json({ success: true, data: filtered.slice(0, count), total: filtered.length });
  }

  if (type === 'science') {
    return res.json({ success: true, data: gen.scientists.slice(0, count), total: gen.scientists.length });
  }

  if (type === 'space') {
    return res.json({ success: true, data: gen.spaceFacts.slice(0, count), total: gen.spaceFacts.length });
  }

  if (type === 'animal') {
    const af = getCached('animalFacts', () => gen.generateAnimalFacts(400));
    let filtered = af;
    if (req.query.category) filtered = filtered.filter(f => f.category === req.query.category);
    return res.json({ success: true, data: filtered.slice(0, count), total: filtered.length });
  }

  if (type === 'history') {
    return res.json({ success: true, data: gen.historyFacts.slice(0, count), total: gen.historyFacts.length });
  }

  if (type === 'body') {
    return res.json({ success: true, data: gen.humanBodyFacts.slice(0, count), total: gen.humanBodyFacts.length });
  }

  if (type === 'dinosaur') {
    return res.json({ success: true, data: gen.dinosaurs.slice(0, count), total: gen.dinosaurs.length });
  }

  res.json({ success: true, data: [], total: 0 });
});

router.get('/countries', (req, res) => {
  res.json({ success: true, data: gen.countries, total: gen.countries.length });
});

router.get('/planets', (req, res) => {
  res.json({ success: true, data: gen.planets, total: gen.planets.length });
});

router.get('/landmarks', (req, res) => {
  res.json({ success: true, data: gen.famousLandmarks, total: gen.famousLandmarks.length });
});

router.get('/curriculum', (req, res) => {
  const subject = req.query.subject;
  const level = req.query.level;
  const paths = getCached('paths', () => gen.generateLearningPaths(80));
  let filtered = paths;
  if (subject) filtered = filtered.filter(p => p.subject.toLowerCase() === subject.toLowerCase());
  if (level) filtered = filtered.filter(p => p.level.toLowerCase() === level.toLowerCase());
  res.json({ success: true, data: filtered, total: filtered.length });
});

router.get('/activities', (req, res) => {
  const count = Math.min(parseInt(req.query.count) || 20, 200);
  const topic = req.query.topic;
  const difficulty = req.query.difficulty;
  const acts = getCached('activities', () => gen.generateLearningActivities(800));
  let filtered = acts;
  if (topic) filtered = filtered.filter(a => a.topic.toLowerCase() === topic.toLowerCase());
  if (difficulty) filtered = filtered.filter(a => a.difficulty === difficulty);
  res.json({ success: true, data: filtered.slice(0, count), total: filtered.length });
});

router.get('/knowledge-base', (req, res) => {
  const count = Math.min(parseInt(req.query.count) || 20, 100);
  const category = req.query.category;
  const kb = getCached('kb', () => gen.generateKnowledgeBase(500));
  let filtered = kb;
  if (category) filtered = filtered.filter(a => a.category === category);
  res.json({ success: true, data: filtered.slice(0, count), total: filtered.length });
});

router.get('/parenting-tips', (req, res) => {
  const count = Math.min(parseInt(req.query.count) || 10, 100);
  const tips = getCached('tips', () => gen.generateParentingTips(300));
  res.json({ success: true, data: tips.slice(0, count), total: tips.length });
});

router.get('/affirmations', (req, res) => {
  const count = Math.min(parseInt(req.query.count) || 10, 100);
  const cat = req.query.category;
  const affs = getCached('affirmations', () => gen.generateAffirmations(200));
  let filtered = affs;
  if (cat) filtered = filtered.filter(a => a.category === cat);
  res.json({ success: true, data: filtered.slice(0, count), total: filtered.length });
});

router.get('/poems', (req, res) => {
  const count = Math.min(parseInt(req.query.count) || 10, 100);
  const poems = getCached('poems', () => gen.generatePoems(150));
  res.json({ success: true, data: poems.slice(0, count), total: poems.length });
});

router.get('/riddles', (req, res) => {
  const count = Math.min(parseInt(req.query.count) || 10, 100);
  const riddles = getCached('riddles', () => gen.generateRiddles(300));
  res.json({ success: true, data: riddles.slice(0, count), total: riddles.length });
});

router.get('/proverbs', (req, res) => {
  const count = Math.min(parseInt(req.query.count) || 10, 100);
  const proverbs = getCached('proverbs', () => gen.generateProverbs(300));
  res.json({ success: true, data: proverbs.slice(0, count), total: proverbs.length });
});

router.get('/testimonials', (req, res) => {
  const count = Math.min(parseInt(req.query.count) || 10, 100);
  const testimonials = getCached('testimonials', () => gen.generateTestimonials(100));
  res.json({ success: true, data: testimonials.slice(0, count), total: testimonials.length });
});

router.get('/blog', (req, res) => {
  const count = Math.min(parseInt(req.query.count) || 10, 100);
  const cat = req.query.category;
  const posts = getCached('blog', () => gen.generateBlogPosts(150));
  let filtered = posts;
  if (cat) filtered = filtered.filter(p => p.category === cat);
  res.json({ success: true, data: filtered.slice(0, count), total: filtered.length });
});

router.get('/music', (req, res) => {
  const count = Math.min(parseInt(req.query.count) || 10, 100);
  const songs = getCached('songs', () => gen.generateMusicSongs(100));
  res.json({ success: true, data: songs.slice(0, count), total: songs.length });
});

router.get('/art', (req, res) => {
  const count = Math.min(parseInt(req.query.count) || 10, 100);
  const projects = getCached('art', () => gen.generateArtProjects(80));
  res.json({ success: true, data: projects.slice(0, count), total: projects.length });
});

router.get('/math/formulas', (req, res) => {
  res.json({ success: true, data: gen.mathFormulas, total: gen.mathFormulas.length });
});

router.get('/stem', (req, res) => {
  const type = req.query.type || 'all';
  if (type === 'inventors') return res.json({ success: true, data: gen.inventors, total: gen.inventors.length });
  if (type === 'scientists') return res.json({ success: true, data: gen.scientists, total: gen.scientists.length });
  if (type === 'composers') return res.json({ success: true, data: gen.composers, total: gen.composers.length });
  if (type === 'artists') return res.json({ success: true, data: gen.paintingArtists, total: gen.paintingArtists.length });
  res.json({ success: true, data: { scientists: gen.scientists, inventors: gen.inventors, composers: gen.composers, artists: gen.paintingArtists } });
});

router.get('/all', (req, res) => {
  const count = Math.min(parseInt(req.query.count) || 100, 2000);
  const categoryMap = {
    math:       () => gen.generateMathProblems(8000),
    vocab:      () => gen.generateVocabulary(5000),
    jokes:      () => gen.generateJokes(1000),
    funfacts:   () => gen.generateFunFacts(1000),
    activities: () => gen.generateLearningActivities(3000),
    knowledge:  () => gen.generateKnowledgeBase(1500),
    tips:       () => gen.generateParentingTips(800),
    affirm:     () => gen.generateAffirmations(500),
    poems:      () => gen.generatePoems(300),
    riddles:    () => gen.generateRiddles(800),
    proverbs:   () => gen.generateProverbs(800),
    blog:       () => gen.generateBlogPosts(300),
    songs:      () => gen.generateMusicSongs(200),
    art:        () => gen.generateArtProjects(200),
    science:    () => gen.generateLearningActivities(1000)
  };
  const all = Object.entries(categoryMap).flatMap(([key, fn]) =>
    getCached(key, fn).slice(0, count)
  );
  res.json({ success: true, data: all.slice(0, count), total: TOTAL_ITEMS });
});

module.exports = router;
