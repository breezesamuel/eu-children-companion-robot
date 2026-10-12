const express = require('express');
const router = express.Router();
const curriculum = require('../services/european-curriculum');
const db = require('../utils/database');
const logger = require('../utils/logger');

// Get all sections (Nursery, Primary, Secondary)
router.get('/sections', (req, res) => {
  try {
    res.json({ success: true, data: curriculum.getAllSections() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get all grade levels
router.get('/levels', (req, res) => {
  try {
    const { section } = req.query;
    let levels = curriculum.getAllLevels();
    if (section) {
      levels = curriculum.getLevelsBySection(section);
    }
    res.json({ success: true, data: levels });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get grade level by age
router.get('/level-by-age/:age', (req, res) => {
  try {
    const age = parseInt(req.params.age);
    const level = curriculum.getLevelByAge(age);
    if (!level) {
      return res.status(404).json({ success: false, error: 'No grade level for this age' });
    }
    res.json({ success: true, data: level });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get grade level by ID
router.get('/level/:levelId', (req, res) => {
  try {
    const level = curriculum.getLevelById(req.params.levelId);
    if (!level) {
      return res.status(404).json({ success: false, error: 'Grade level not found' });
    }
    res.json({ success: true, data: level });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get subjects for a grade level
router.get('/level/:levelId/subjects', (req, res) => {
  try {
    const subjects = curriculum.getSubjects(req.params.levelId);
    res.json({ success: true, data: subjects });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get topics for a subject at a grade level
router.get('/level/:levelId/subjects/:subject', (req, res) => {
  try {
    const topics = curriculum.getTopics(req.params.levelId, req.params.subject);
    const objectives = curriculum.getObjectives(req.params.levelId, req.params.subject);
    res.json({ success: true, data: { topics, objectives } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get system prompt for a grade level
router.get('/level/:levelId/prompt', (req, res) => {
  try {
    const { language = 'en' } = req.query;
    const prompt = curriculum.buildSystemPrompt(req.params.levelId, language);
    res.json({ success: true, data: { prompt, levelId: req.params.levelId, language } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get learning path (full progression)
router.get('/learning-path', (req, res) => {
  try {
    const path = curriculum.getLearningPath();
    res.json({ success: true, data: path });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get next level progression
router.get('/level/:levelId/next', (req, res) => {
  try {
    const next = curriculum.getNextLevel(req.params.levelId);
    if (!next) {
      return res.json({ success: true, data: null, message: 'Already at highest level' });
    }
    res.json({ success: true, data: next });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get previous level
router.get('/level/:levelId/previous', (req, res) => {
  try {
    const prev = curriculum.getPreviousLevel(req.params.levelId);
    if (!prev) {
      return res.json({ success: true, data: null, message: 'Already at lowest level' });
    }
    res.json({ success: true, data: prev });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Check if topic is appropriate for level
router.get('/level/:levelId/check-topic', (req, res) => {
  try {
    const { subject, topic } = req.query;
    if (!subject || !topic) {
      return res.status(400).json({ success: false, error: 'subject and topic required' });
    }
    const appropriate = curriculum.isTopicAppropriate(req.params.levelId, subject, topic);
    res.json({ success: true, data: { appropriate, levelId: req.params.levelId, subject, topic } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update child grade level
router.put('/child/:childId/grade-level', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { levelId } = req.body;
    if (!levelId) return res.status(400).json({ success: false, error: 'levelId required' });

    const level = curriculum.getLevelById(levelId);
    if (!level) return res.status(404).json({ success: false, error: 'Invalid grade level' });

    const child = await db.get('SELECT * FROM children WHERE id = ? AND parent_id = ?', [req.params.childId, userId]);
    if (!child) return res.status(404).json({ error: 'Child not found' });

    await db.run('UPDATE children SET grade_level = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [levelId, req.params.childId]);

    logger.info('Child grade level updated', { childId: req.params.childId, levelId, userId });
    res.json({ success: true, data: { childId: req.params.childId, levelId, level: level.name } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get recommended level by child age
router.get('/child/:childId/recommended-level', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const child = await db.get('SELECT * FROM children WHERE id = ? AND parent_id = ?', [req.params.childId, userId]);
    if (!child) return res.status(404).json({ error: 'Child not found' });

    const recommended = curriculum.getLevelByAge(child.age);
    if (!recommended) {
      return res.json({ success: true, data: null, message: 'No recommended level for this age' });
    }

    res.json({ success: true, data: { recommended, currentLevel: child.grade_level || null } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get grade-appropriate content recommendations
router.get('/level/:levelId/content', (req, res) => {
  try {
    const level = curriculum.getLevelById(req.params.levelId);
    if (!level) return res.status(404).json({ success: false, error: 'Grade level not found' });

    const recommendations = {
      level: level.name,
      subjects: {},
      aiStyle: level.aiStyle
    };

    for (const [subject, data] of Object.entries(level.subjects)) {
      recommendations.subjects[subject] = {
        topics: data.topics,
        objectives: data.objectives,
        sampleQuestions: generateSampleQuestions(subject, level)
      };
    }

    res.json({ success: true, data: recommendations });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

function generateSampleQuestions(subject, level) {
  const questions = {
    math: {
      nursery_early: ['How many fingers do you have?', 'Can you find a circle?'],
      nursery_middle: ['What is 1+1?', 'Can you count to 10?'],
      nursery_late: ['What is 5+3?', 'How many sides does a triangle have?'],
      primary_1: ['What is 7+5?', 'What time is it when the short hand points to 3?'],
      primary_2: ['What is 15+27?', 'What is 2x3?'],
      primary_3: ['What is 8x7?', 'What is 1/2 + 1/4?'],
      primary_4: ['What is 123x45?', 'What is 0.5 + 0.3?'],
      primary_5: ['What is 1/2 + 1/3?', 'What is 25% of 80?'],
      primary_6: ['What is the area of a circle with radius 5?', 'Solve x+5=10'],
      secondary_lower_1: ['Solve 2x+3=7', 'What is the slope of y=3x+2?'],
      secondary_lower_2: ['Solve x+y=5 and 2x-y=4', 'Graph y=2x-1'],
      secondary_lower_3: ['Solve x^2-5x+6=0', 'What is sin(30)?'],
      secondary_upper_1: ['Find the derivative of x^2', 'What is the limit of sin(x)/x as x->0?'],
      secondary_upper_2: ['Calculate the integral of 2x', 'What is the derivative of e^x?'],
      secondary_upper_3: ['Solve the differential equation dy/dx = y', 'What is the eigenvalue of a matrix?']
    },
    science: {
      nursery_early: ['What color is the sky?', 'Can you name an animal?'],
      nursery_middle: ['What happens when it rains?', 'What do plants need to grow?'],
      nursery_late: ['Why do leaves change color?', 'What is the water cycle?'],
      primary_1: ['What is a living thing?', 'How do plants grow?'],
      primary_2: ['What is a butterfly life cycle?', 'What causes wind?'],
      primary_3: ['What do plants need to survive?', 'What is a food chain?'],
      primary_4: ['What is an ecosystem?', 'How does a circuit work?'],
      primary_5: ['What is a cell?', 'How does the heart work?'],
      primary_6: ['What is an atom?', 'What causes earthquakes?'],
      secondary_lower_1: ['What is Newton first law?', 'What is a chemical reaction?'],
      secondary_lower_2: ['What is F=ma?', 'What is photosynthesis?'],
      secondary_lower_3: ['What is Ohm law?', 'What is DNA?'],
      secondary_upper_1: ['What is thermodynamics?', 'What is gene expression?'],
      secondary_upper_2: ['What is electromagnetic induction?', 'What is natural selection?'],
      secondary_upper_3: ['What is quantum mechanics?', 'What is CRISPR?']
    }
  };

  return (questions[subject] && questions[subject][level.id]) || ['Ask me anything about this subject!'];
}

module.exports = router;
