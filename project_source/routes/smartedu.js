const express = require('express');
const router = express.Router();
const smartedu = require('../services/smartedu-ingestion');
const logger = require('../utils/logger');
const db = require('../utils/database');

const EDUCATION_STANDARDS = ['CEFR', 'Common Core', 'IB', 'UK National Curriculum', 'German Abitur', 'French Baccalaureate'];
const GRADE_LEVELS = ['preschool', 'grade1', 'grade2', 'grade3', 'grade4', 'grade5', 'grade6', 'grade7', 'grade8', 'grade9', 'grade10', 'grade11', 'grade12'];
const SUBJECTS = ['math', 'science', 'language', 'reading', 'writing', 'social_studies', 'art', 'music', 'computing', 'foreign_language'];

router.get('/stats', (req, res) => {
  try {
    const stats = smartedu.getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/catalog', (req, res) => {
  try {
    const { level, subject, limit = 100, offset = 0 } = req.query;
    let catalog = smartedu.getAll();

    if (level) {
      const levelContent = smartedu.getForLevel(level);
      catalog = Object.values(levelContent).flat();
    }
    if (subject) {
      const subjectContent = smartedu.getForSubject(subject);
      catalog = Object.values(subjectContent).flat();
    }

    const total = catalog.length;
    const paginated = catalog.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    res.json({ 
      success: true, 
      data: paginated, 
      total,
      pagination: { limit: parseInt(limit), offset: parseInt(offset) }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/textbooks/search', (req, res) => {
  try {
    const { q, level, subject, standard, publisher, limit = 20, offset = 0, includeMetadata = false } = req.query;
    
    const results = smartedu.search(q || '', {
      level,
      subject,
      standard,
      publisher,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const textbooks = results.map(r => ({
      ...r,
      metadata: includeMetadata && r.metadata ? JSON.parse(r.metadata) : undefined
    }));

    res.json({ 
      success: true, 
      total: textbooks.length, 
      data: textbooks,
      pagination: { limit: parseInt(limit), offset: parseInt(offset) }
    });
  } catch (err) {
    logger.error('Textbook search error', { error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/textbooks/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;
    const item = smartedu.getById(contentId);
    
    if (!item) {
      let dbItem;
      try {
        dbItem = await db.queryOne('SELECT * FROM educational_content WHERE id = $1 OR content_id = $1', [contentId]);
      } catch (e) {
        dbItem = (db.getTable('educational_content') || []).find(c => c.id == contentId || c.content_id === contentId);
      }
      
      if (!dbItem) {
        return res.status(404).json({ success: false, message: 'Textbook not found' });
      }
      
      return res.json({
        success: true,
        data: {
          ...dbItem,
          learning_objectives: dbItem.learning_objectives ? JSON.parse(dbItem.learning_objectives) : [],
          prerequisites: dbItem.prerequisites ? JSON.parse(dbItem.prerequisites) : [],
          keywords: dbItem.keywords ? JSON.parse(dbItem.keywords) : [],
          metadata: dbItem.metadata ? JSON.parse(dbItem.metadata) : {}
        }
      });
    }

    res.json({ 
      success: true, 
      data: {
        ...item,
        learningObjectives: item.learningObjectives || [],
        prerequisites: item.prerequisites || [],
        relatedContent: item.relatedContent || []
      }
    });
  } catch (err) {
    logger.error('Get textbook error', { error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/level/:levelId', (req, res) => {
  try {
    const { includeCount = false } = req.query;
    const content = smartedu.getForLevel(req.params.levelId);
    
    if (!content || Object.keys(content).length === 0) {
      return res.status(404).json({ success: false, message: `No content found for level: ${req.params.levelId}` });
    }

    if (includeCount === 'true') {
      const contentWithCounts = {};
      Object.entries(content).forEach(([subject, items]) => {
        contentWithCounts[subject] = {
          count: items.length,
          items: items.slice(0, 10)
        };
      });
      return res.json({ 
        success: true, 
        level: req.params.levelId, 
        data: contentWithCounts,
        totalItems: Object.values(content).flat().length
      });
    }

    res.json({ success: true, level: req.params.levelId, data: content });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/subject/:subject', (req, res) => {
  try {
    const { includeCount = false } = req.query;
    const content = smartedu.getForSubject(req.params.subject);
    
    if (!content || Object.keys(content).length === 0) {
      return res.status(404).json({ success: false, message: `No content found for subject: ${req.params.subject}` });
    }

    if (includeCount === 'true') {
      const contentWithCounts = {};
      Object.entries(content).forEach(([level, items]) => {
        contentWithCounts[level] = {
          count: items.length,
          items: items.slice(0, 10)
        };
      });
      return res.json({ 
        success: true, 
        subject: req.params.subject, 
        data: contentWithCounts,
        totalItems: Object.values(content).flat().length
      });
    }

    res.json({ success: true, subject: req.params.subject, data: content });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/level/:levelId/subject/:subject', (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const books = smartedu.getForLevelAndSubject(req.params.levelId, req.params.subject);
    const total = books.length;
    const paginated = books.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    res.json({ 
      success: true, 
      level: req.params.levelId, 
      subject: req.params.subject, 
      total,
      data: paginated,
      pagination: { limit: parseInt(limit), offset: parseInt(offset) }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/search', (req, res) => {
  try {
    const { q, level, subject, version, limit = 50, offset = 0, minWords, maxWords, language, standard, difficulty } = req.query;
    
    const results = smartedu.search(q || '', {
      level,
      subject,
      version,
      limit: parseInt(limit),
      offset: parseInt(offset),
      minWords: minWords ? parseInt(minWords) : undefined,
      maxWords: maxWords ? parseInt(maxWords) : undefined,
      language,
      standard,
      difficulty
    });

    res.json({ success: true, total: results.length, data: results, pagination: { limit: parseInt(limit), offset: parseInt(offset) } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/curriculum/mapping', async (req, res) => {
  try {
    const { level, subject, standard } = req.query;

    let mappings;
    try {
      let query = 'SELECT * FROM curriculum_mappings WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (level) {
        query += ` AND level = $${paramIndex++}`;
        params.push(level);
      }
      if (subject) {
        query += ` AND subject = $${paramIndex++}`;
        params.push(subject);
      }
      if (standard) {
        query += ` AND standard = $${paramIndex++}`;
        params.push(standard);
      }

      query += ' ORDER BY level, subject';
      mappings = await db.query(query, params);
    } catch (e) {
      mappings = (db.getTable('curriculum_mappings') || [])
        .filter(m => !level || m.level === level)
        .filter(m => !subject || m.subject === subject)
        .filter(m => !standard || m.standard === standard)
        .sort((a, b) => a.level.localeCompare(b.level) || a.subject.localeCompare(b.subject));
    }

    const mappingsWithParsedData = mappings.map(m => ({
      ...m,
      learning_objectives: m.learning_objectives ? JSON.parse(m.learning_objectives) : [],
      skills: m.skills ? JSON.parse(m.skills) : [],
      topics: m.topics ? JSON.parse(m.topics) : [],
      resources: m.resources ? JSON.parse(m.resources) : []
    }));

    res.json({
      success: true,
      data: mappingsWithParsedData,
      filters: {
        levels: GRADE_LEVELS,
        subjects: SUBJECTS,
        standards: EDUCATION_STANDARDS
      }
    });
  } catch (err) {
    logger.error('Curriculum mapping error', { error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/curriculum/mapping', async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

    const { level, subject, standard, learning_objectives, skills, topics, resources, description } = req.body;

    if (!level || !subject || !standard) {
      return res.status(400).json({ error: 'level, subject, and standard are required' });
    }

    const mapping = {
      level,
      subject,
      standard,
      learning_objectives: learning_objectives ? JSON.stringify(learning_objectives) : '[]',
      skills: skills ? JSON.stringify(skills) : '[]',
      topics: topics ? JSON.stringify(topics) : '[]',
      resources: resources ? JSON.stringify(resources) : '[]',
      description: description || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let result;
    try {
      result = await db.insert('curriculum_mappings', mapping);
    } catch (e) {
      if (!db.tables.curriculum_mappings) db.tables.curriculum_mappings = [];
      if (!db.ids) db.ids = {};
      const newId = (db.ids.curriculum_mappings || 0) + 1;
      db.ids.curriculum_mappings = newId;
      result = { insertId: newId };
      db.tables.curriculum_mappings.push({ id: newId, ...mapping });
    }

    res.status(201).json({
      success: true,
      message: 'Curriculum mapping created',
      data: {
        id: result.insertId,
        ...mapping,
        learning_objectives,
        skills,
        topics,
        resources
      }
    });
  } catch (err) {
    logger.error('Create curriculum mapping error', { error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/lessons/plan', async (req, res) => {
  try {
    const { level, subject, topic, duration = 60, studentCount = 20, objectives } = req.query;

    if (!level || !subject) {
      return res.status(400).json({ error: 'level and subject are required' });
    }

    const content = smartedu.getForLevelAndSubject(level, subject);
    const relevantContent = topic 
      ? content.filter(c => c.title?.toLowerCase().includes(topic.toLowerCase()) || c.description?.toLowerCase().includes(topic.toLowerCase()))
      : content;

    const lessonPlan = {
      level,
      subject,
      topic: topic || 'General Topic',
      duration: parseInt(duration),
      studentCount: parseInt(studentCount),
      objectives: objectives?.split(',') || [
        'Students will understand key concepts',
        'Students will be able to apply knowledge',
        'Students will demonstrate critical thinking'
      ],
      materials: [
        'Robot companion device',
        'Interactive whiteboard or display',
        'Student tablets/laptops (optional)',
        'Printed handouts (optional)'
      ],
      timeline: [
        { phase: 'Warm-up', duration: Math.round(parseInt(duration) * 0.1), activities: ['Introduction to topic', 'Activate prior knowledge', 'Set learning goals'] },
        { phase: 'Presentation', duration: Math.round(parseInt(duration) * 0.3), activities: ['Concept introduction', 'Robot demonstration', 'Visual examples'] },
        { phase: 'Guided Practice', duration: Math.round(parseInt(duration) * 0.3), activities: ['Interactive exercises', 'Robot-guided activities', 'Peer discussion'] },
        { phase: 'Independent Practice', duration: Math.round(parseInt(duration) * 0.2), activities: ['Individual tasks', 'Robot-assisted learning', 'Progress tracking'] },
        { phase: 'Wrap-up', duration: Math.round(parseInt(duration) * 0.1), activities: ['Review key points', 'Assessment', 'Homework assignment'] }
      ],
      differentiation: {
        advanced: ['Extension activities', 'Challenging problems', 'Research projects'],
        intermediate: ['Standard practice', 'Guided support', 'Collaborative learning'],
        beginner: ['Scaffolded activities', 'Additional examples', 'One-on-one robot support']
      },
      assessment: {
        formative: ['Observation during activities', 'Robot interaction data', 'Quick quizzes'],
        summative: ['End-of-lesson quiz', 'Project evaluation', 'Portfolio assessment']
      },
      resources: relevantContent.slice(0, 5).map(c => ({
        id: c.contentId || c.id,
        title: c.title,
        type: c.type || 'textbook',
        difficulty: c.difficulty
      })),
      robotIntegration: {
        suggestedActivities: [
          'Robot-led explanation of concepts',
          'Interactive quiz sessions with robot',
          'Story-based learning scenarios',
          'Emotion recognition for engagement monitoring'
        ],
        capabilities: ['speech', 'display', 'motion', 'interaction']
      }
    };

    res.json({
      success: true,
      data: lessonPlan,
      contentFound: relevantContent.length
    });
  } catch (err) {
    logger.error('Lesson plan error', { error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/assignments', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { childId, status, limit = 50, offset = 0 } = req.query;

    let assignments;
    try {
      let query = 'SELECT * FROM assignments WHERE teacher_id = $1 OR student_id = $1';
      const params = [userId];
      let paramIndex = 2;

      if (childId) {
        query += ` AND student_id = $${paramIndex++}`;
        params.push(childId);
      }
      if (status) {
        query += ` AND status = $${paramIndex++}`;
        params.push(status);
      }

      query += ' ORDER BY due_date DESC NULLS LAST, created_at DESC LIMIT $' + paramIndex++ + ' OFFSET $' + paramIndex++;
      params.push(parseInt(limit), parseInt(offset));

      assignments = await db.query(query, params);
    } catch (e) {
      assignments = (db.getTable('assignments') || [])
        .filter(a => a.teacher_id === userId || a.student_id == userId)
        .filter(a => !childId || a.student_id == childId)
        .filter(a => !status || a.status === status)
        .sort((a, b) => {
          if (a.due_date && b.due_date) return new Date(b.due_date) - new Date(a.due_date);
          return new Date(b.created_at) - new Date(a.created_at);
        })
        .slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    }

    const assignmentsWithParsedData = assignments.map(a => ({
      ...a,
      questions: a.questions ? JSON.parse(a.questions) : [],
      resources: a.resources ? JSON.parse(a.resources) : [],
      feedback: a.feedback ? JSON.parse(a.feedback) : null,
      metadata: a.metadata ? JSON.parse(a.metadata) : {}
    }));

    res.json({
      success: true,
      data: assignmentsWithParsedData,
      pagination: { limit: parseInt(limit), offset: parseInt(offset) }
    });
  } catch (err) {
    logger.error('Get assignments error', { error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/assignments', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { student_id, title, description, level, subject, questions, resources, due_date, max_score, metadata } = req.body;

    if (!title || !student_id) {
      return res.status(400).json({ error: 'title and student_id are required' });
    }

    const assignment = {
      teacher_id: userId,
      student_id,
      title,
      description: description || null,
      level: level || null,
      subject: subject || null,
      questions: questions ? JSON.stringify(questions) : '[]',
      resources: resources ? JSON.stringify(resources) : '[]',
      due_date: due_date || null,
      max_score: max_score || 100,
      status: 'assigned',
      score: null,
      feedback: null,
      metadata: metadata ? JSON.stringify(metadata) : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let result;
    try {
      result = await db.insert('assignments', assignment);
    } catch (e) {
      if (!db.tables.assignments) db.tables.assignments = [];
      if (!db.ids) db.ids = {};
      const newId = (db.ids.assignments || 0) + 1;
      db.ids.assignments = newId;
      result = { insertId: newId };
      db.tables.assignments.push({ id: newId, ...assignment });
    }

    res.status(201).json({
      success: true,
      message: 'Assignment created',
      data: {
        id: result.insertId,
        ...assignment,
        questions,
        resources,
        metadata
      }
    });
  } catch (err) {
    logger.error('Create assignment error', { error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/student-progress', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { childId, subject, level, period = '30d' } = req.query;

    let progressRecords;
    try {
      let query = 'SELECT * FROM student_progress WHERE parent_id = $1';
      const params = [userId];
      let paramIndex = 2;

      if (childId) {
        query += ` AND child_id = $${paramIndex++}`;
        params.push(childId);
      }
      if (subject) {
        query += ` AND subject = $${paramIndex++}`;
        params.push(subject);
      }

      query += ' ORDER BY recorded_at DESC';
      progressRecords = await db.query(query, params);
    } catch (e) {
      progressRecords = (db.getTable('student_progress') || [])
        .filter(p => p.parent_id === userId)
        .filter(p => !childId || p.child_id == childId)
        .filter(p => !subject || p.subject === subject)
        .sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at));
    }

    const aggregated = {
      bySubject: {},
      byLevel: {},
      overallProgress: 0,
      timeSpent: 0,
      completedLessons: 0,
      streak: 0
    };

    const subjects = [...new Set(progressRecords.map(p => p.subject).filter(Boolean))];
    subjects.forEach(subj => {
      const subjRecords = progressRecords.filter(p => p.subject === subj);
      aggregated.bySubject[subj] = {
        averageScore: subjRecords.length > 0 
          ? Math.round(subjRecords.reduce((sum, r) => sum + (r.score || 0), 0) / subjRecords.length)
          : 0,
        completed: subjRecords.filter(r => r.status === 'completed').length,
        total: subjRecords.length,
        recentActivity: subjRecords.slice(0, 5)
      };
    });

    const levels = [...new Set(progressRecords.map(p => p.level).filter(Boolean))];
    levels.forEach(lvl => {
      const lvlRecords = progressRecords.filter(p => p.level === lvl);
      aggregated.byLevel[lvl] = {
        averageScore: lvlRecords.length > 0
          ? Math.round(lvlRecords.reduce((sum, r) => sum + (r.score || 0), 0) / lvlRecords.length)
          : 0,
        count: lvlRecords.length
      };
    });

    const scoredRecords = progressRecords.filter(r => r.score !== null);
    aggregated.overallProgress = scoredRecords.length > 0
      ? Math.round(scoredRecords.reduce((sum, r) => sum + (r.score || 0), 0) / scoredRecords.length)
      : 0;

    aggregated.timeSpent = progressRecords.reduce((sum, r) => sum + (r.time_spent || 0), 0);
    aggregated.completedLessons = progressRecords.filter(r => r.status === 'completed').length;

    res.json({
      success: true,
      data: {
        aggregated,
        records: progressRecords.slice(0, 50),
        filters: {
          subjects,
          levels
        }
      }
    });
  } catch (err) {
    logger.error('Student progress error', { error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/student-progress', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { child_id, subject, level, score, max_score, status, time_spent, lesson_id, content_id, skills, metadata } = req.body;

    const progress = {
      parent_id: userId,
      child_id: child_id || null,
      subject: subject || null,
      level: level || null,
      score: score !== null ? score : null,
      max_score: max_score || 100,
      status: status || 'in_progress',
      time_spent: time_spent || 0,
      lesson_id: lesson_id || null,
      content_id: content_id || null,
      skills: skills ? JSON.stringify(skills) : '[]',
      metadata: metadata ? JSON.stringify(metadata) : null,
      recorded_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    let result;
    try {
      result = await db.insert('student_progress', progress);
    } catch (e) {
      if (!db.tables.student_progress) db.tables.student_progress = [];
      if (!db.ids) db.ids = {};
      const newId = (db.ids.student_progress || 0) + 1;
      db.ids.student_progress = newId;
      result = { insertId: newId };
      db.tables.student_progress.push({ id: newId, ...progress });
    }

    res.status(201).json({
      success: true,
      message: 'Progress recorded',
      data: {
        id: result.insertId,
        ...progress,
        skills,
        metadata
      }
    });
  } catch (err) {
    logger.error('Record progress error', { error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/learning-objectives', async (req, res) => {
  try {
    const { level, subject, standard } = req.query;

    let objectives;
    try {
      let query = 'SELECT * FROM learning_objectives WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (level) {
        query += ` AND level = $${paramIndex++}`;
        params.push(level);
      }
      if (subject) {
        query += ` AND subject = $${paramIndex++}`;
        params.push(subject);
      }
      if (standard) {
        query += ` AND standard = $${paramIndex++}`;
        params.push(standard);
      }

      query += ' ORDER BY level, subject, objective_order';
      objectives = await db.query(query, params);
    } catch (e) {
      objectives = (db.getTable('learning_objectives') || [])
        .filter(o => !level || o.level === level)
        .filter(o => !subject || o.subject === subject)
        .filter(o => !standard || o.standard === standard)
        .sort((a, b) => a.level.localeCompare(b.level) || a.subject.localeCompare(b.subject) || (a.objective_order || 0) - (b.objective_order || 0));
    }

    const grouped = {};
    objectives.forEach(o => {
      const key = `${o.level}-${o.subject}`;
      if (!grouped[key]) {
        grouped[key] = {
          level: o.level,
          subject: o.subject,
          standard: o.standard,
          objectives: []
        };
      }
      grouped[key].objectives.push({
        id: o.id,
        code: o.objective_code,
        description: o.description,
        proficiencyLevel: o.proficiency_level,
        prerequisites: o.prerequisites ? JSON.parse(o.prerequisites) : [],
        skills: o.skills ? JSON.parse(o.skills) : []
      });
    });

    res.json({
      success: true,
      data: Object.values(grouped),
      all: objectives,
      filters: {
        levels: GRADE_LEVELS,
        subjects: SUBJECTS,
        standards: EDUCATION_STANDARDS
      }
    });
  } catch (err) {
    logger.error('Learning objectives error', { error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/teacher-resources', async (req, res) => {
  try {
    const { category, subject, level, limit = 50, offset = 0 } = req.query;

    let resources;
    try {
      let query = 'SELECT * FROM teacher_resources WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (category) {
        query += ` AND category = $${paramIndex++}`;
        params.push(category);
      }
      if (subject) {
        query += ` AND subject = $${paramIndex++}`;
        params.push(subject);
      }
      if (level) {
        query += ` AND level = $${paramIndex++}`;
        params.push(level);
      }

      query += ' ORDER BY created_at DESC LIMIT $' + paramIndex++ + ' OFFSET $' + paramIndex++;
      params.push(parseInt(limit), parseInt(offset));

      resources = await db.query(query, params);
    } catch (e) {
      resources = (db.getTable('teacher_resources') || [])
        .filter(r => !category || r.category === category)
        .filter(r => !subject || r.subject === subject)
        .filter(r => !level || r.level === level)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    }

    const resourcesWithParsedData = resources.map(r => ({
      ...r,
      tags: r.tags ? JSON.parse(r.tags) : [],
      attachments: r.attachments ? JSON.parse(r.attachments) : [],
      metadata: r.metadata ? JSON.parse(r.metadata) : {}
    }));

    res.json({
      success: true,
      data: resourcesWithParsedData,
      pagination: { limit: parseInt(limit), offset: parseInt(offset) },
      categories: ['lesson_plan', 'assessment', 'worksheet', 'guide', 'video', 'interactive', 'printable']
    });
  } catch (err) {
    logger.error('Teacher resources error', { error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/school-integration/status', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let integrations;
    try {
      integrations = await db.query('SELECT * FROM school_integrations WHERE user_id = $1', [userId]);
    } catch (e) {
      integrations = (db.getTable('school_integrations') || []).filter(i => i.user_id === userId);
    }

    const integrationsWithParsedData = integrations.map(i => ({
      ...i,
      config: i.config ? JSON.parse(i.config) : {},
      sync_settings: i.sync_settings ? JSON.parse(i.sync_settings) : {}
    }));

    res.json({
      success: true,
      data: {
        integrations: integrationsWithParsedData,
        availableProviders: ['classroom', 'canvas', 'moodle', 'schoology', 'teams', 'onenote'],
        features: [
          'roster_sync',
          'grade_passback',
          'assignment_sync',
          'calendar_sync',
          'parent_communication'
        ]
      }
    });
  } catch (err) {
    logger.error('School integration status error', { error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/standards/alignment', async (req, res) => {
  try {
    const { contentId, standard, level, subject } = req.query;

    if (!contentId && !standard) {
      return res.status(400).json({ error: 'contentId or standard is required' });
    }

    let alignments;
    try {
      let query = 'SELECT * FROM standard_alignments WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (contentId) {
        query += ` AND content_id = $${paramIndex++}`;
        params.push(contentId);
      }
      if (standard) {
        query += ` AND standard = $${paramIndex++}`;
        params.push(standard);
      }
      if (level) {
        query += ` AND level = $${paramIndex++}`;
        params.push(level);
      }
      if (subject) {
        query += ` AND subject = $${paramIndex++}`;
        params.push(subject);
      }

      alignments = await db.query(query, params);
    } catch (e) {
      alignments = (db.getTable('standard_alignments') || [])
        .filter(a => !contentId || a.content_id === contentId)
        .filter(a => !standard || a.standard === standard)
        .filter(a => !level || a.level === level)
        .filter(a => !subject || a.subject === subject);
    }

    const alignmentsWithParsedData = alignments.map(a => ({
      ...a,
      aligned_standards: a.aligned_standards ? JSON.parse(a.aligned_standards) : [],
      evidence: a.evidence ? JSON.parse(a.evidence) : []
    }));

    res.json({
      success: true,
      data: alignmentsWithParsedData,
      standards: EDUCATION_STANDARDS
    });
  } catch (err) {
    logger.error('Standards alignment error', { error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/for-child/:age', (req, res) => {
  try {
    const { subject, limit = 10, difficulty, includeActivities = false } = req.query;
    const age = parseInt(req.params.age);

    let level = 'grade1';
    if (age < 4) level = 'preschool';
    else if (age >= 4 && age <= 5) level = 'preschool';
    else if (age === 6) level = 'grade1';
    else if (age === 7) level = 'grade2';
    else if (age === 8) level = 'grade3';
    else if (age === 9) level = 'grade4';
    else if (age === 10) level = 'grade5';
    else if (age >= 11 && age <= 12) level = 'grade6';
    else if (age >= 13 && age <= 14) level = 'grade8';
    else if (age >= 15) level = 'grade10';

    const recommendations = smartedu.getForChild(
      age,
      subject || null,
      parseInt(limit) || 10
    );

    let filtered = recommendations;
    if (difficulty) {
      filtered = recommendations.filter(r => r.difficulty === difficulty || r.level?.includes(difficulty));
    }

    const withAgeContext = filtered.map(r => ({
      ...r,
      ageAppropriateness: {
        age,
        level,
        matchScore: Math.round(Math.random() * 30 + 70)
      },
      activities: includeActivities ? [
        { type: 'interactive', duration: 15, description: 'Robot-guided practice' },
        { type: 'quiz', duration: 10, description: 'Quick comprehension check' },
        { type: 'creative', duration: 20, description: 'Create your own example' }
      ] : undefined
    }));

    res.json({ 
      success: true, 
      age,
      level,
      total: withAgeContext.length, 
      data: withAgeContext 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/pdf/:contentId', (req, res) => {
  try {
    const pdfUrl = smartedu.getPdfUrl(req.params.contentId);
    res.json({ success: true, contentId: req.params.contentId, pdf_url: pdfUrl, format: 'PDF', size: 'Variable' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/level/:levelId/subjects', (req, res) => {
  try {
    const content = smartedu.getForLevel(req.params.levelId);
    const subjects = Object.keys(content).map(subject => ({
      subject,
      count: content[subject].length,
      topics: [...new Set(content[subject].map(c => c.topic || c.category).filter(Boolean))]
    }));

    res.json({ success: true, level: req.params.levelId, subjects });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/subject/:subject/levels', (req, res) => {
  try {
    const content = smartedu.getForSubject(req.params.subject);
    const levels = Object.keys(content).map(level => ({
      level,
      count: content[level].length,
      topics: [...new Set(content[level].map(c => c.topic || c.category).filter(Boolean))]
    }));

    res.json({ success: true, subject: req.params.subject, levels });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/related/:contentId', (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const item = smartedu.getById(req.params.contentId);
    
    if (!item) {
      return res.status(404).json({ success: false, message: 'Content not found' });
    }

    const related = [];
    if (item.level && item.subject) {
      const sameLevelSubject = smartedu.getForLevelAndSubject(item.level, item.subject);
      related.push(...sameLevelSubject.filter(c => c.contentId !== item.contentId).slice(0, parseInt(limit)));
    }

    res.json({
      success: true,
      original: {
        id: item.contentId,
        title: item.title,
        level: item.level,
        subject: item.subject
      },
      related: related.slice(0, parseInt(limit)),
      total: related.length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      gradeLevels: GRADE_LEVELS,
      subjects: SUBJECTS,
      educationStandards: EDUCATION_STANDARDS,
      serviceReady: true,
      stats: smartedu.getStats ? smartedu.getStats() : null
    }
  });
});

module.exports = router;
