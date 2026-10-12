const express = require('express');
const router = express.Router();
const contentService = require('../services/content-service');
const contentGenerator = require('../services/content-generator');
const ingestor = require('../services/content-ingestion');
const logger = require('../utils/logger');
const db = require('../utils/database');

const CONTENT_CATEGORIES = ['stories', 'education', 'games', 'music', 'meditation', 'facts', 'jokes', 'riddles', 'poems', 'interactive'];
const DIFFICULTY_LEVELS = ['beginner', 'basic', 'intermediate', 'advanced', 'expert'];
const LANGUAGES = ['en', 'de', 'fr', 'es', 'it', 'nl', 'pl', 'sv', 'da', 'no', 'fi'];

router.get('/status', async (req, res, next) => {
  try {
    await contentService.waitForReady();
    
    const stats = contentService.getStats ? contentService.getStats() : {};
    const cacheStats = {
      hitCount: 0,
      missCount: 0,
      hitRate: '0%'
    };

    res.json({
      success: true,
      data: {
        ready: true,
        stats,
        cache: cacheStats,
        totalItems: contentService.items?.length || 0,
        categories: CONTENT_CATEGORIES,
        difficultyLevels: DIFFICULTY_LEVELS,
        languages: LANGUAGES
      }
    });
  } catch (e) { next(e); }
});

router.get('/search', async (req, res, next) => {
  try {
    await contentService.waitForReady();
    const { 
      q, category, level, limit = 50, offset = 0, 
      minWords, maxWords, language, ageRange, 
      duration, tags, sortBy = 'relevance'
    } = req.query;

    const searchParams = {
      category, 
      level, 
      limit: parseInt(limit), 
      offset: parseInt(offset),
      minWords: minWords ? parseInt(minWords) : undefined,
      maxWords: maxWords ? parseInt(maxWords) : undefined, 
      language,
      ageRange,
      duration: duration ? parseInt(duration) : undefined,
      tags: tags ? tags.split(',') : undefined,
      sortBy
    };

    const result = contentService.search(q || '', searchParams);

    const enhancedResults = result.items ? result.items.map(item => ({
      ...item,
      score: item.score || Math.random() * 100,
      isNew: item.created_at && new Date(item.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    })) : [];

    res.json({
      success: true,
      query: q || '',
      total: result.total || enhancedResults.length,
      items: enhancedResults,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      },
      filters: searchParams
    });
  } catch (e) { next(e); }
});

router.get('/categories', async (req, res, next) => {
  try {
    await contentService.waitForReady();
    const cats = contentGenerator.getAllCategories ? contentGenerator.getAllCategories() : CONTENT_CATEGORIES;
    
    const categoryStats = {};
    for (const cat of cats) {
      const topics = contentGenerator.getTopics ? contentGenerator.getTopics(cat) : [];
      const items = contentService.getByCategory ? contentService.getByCategory(cat, 10000, 0) : { items: [] };
      
      categoryStats[cat] = {
        name: cat,
        topics: topics.slice(0, 20),
        itemCount: items.total || (items.items?.length || 0),
        description: getCategoryDescription(cat)
      };
    }

    res.json({
      success: true,
      categories: cats,
      byCategory: categoryStats,
      topics: {}
    });
  } catch (e) { next(e); }
});

router.get('/category/:category', async (req, res, next) => {
  try {
    await contentService.waitForReady();
    const { limit = 100, offset = 0, level, language, sortBy = 'popularity' } = req.query;
    const category = req.params.category.toLowerCase();

    if (!CONTENT_CATEGORIES.includes(category)) {
      return res.status(400).json({ 
        error: `Invalid category. Must be one of: ${CONTENT_CATEGORIES.join(', ')}` 
      });
    }

    const result = contentService.getByCategory 
      ? contentService.getByCategory(category, parseInt(limit), parseInt(offset))
      : { items: contentService.items?.filter(i => i.category === category) || [], total: 0 };

    let items = result.items || result;
    
    if (level) {
      items = items.filter(i => i.difficulty === level || i.level === level);
    }
    if (language) {
      items = items.filter(i => i.language === language);
    }

    const topics = [...new Set(items.map(i => i.topic || i.subject).filter(Boolean))];

    const aggregated = {
      category,
      totalItems: items.length,
      topics: topics.slice(0, 50),
      byDifficulty: {},
      byLanguage: {},
      popularTags: {}
    };

    for (const item of items) {
      const diff = item.difficulty || item.level || 'unknown';
      const lang = item.language || 'unknown';
      
      aggregated.byDifficulty[diff] = (aggregated.byDifficulty[diff] || 0) + 1;
      aggregated.byLanguage[lang] = (aggregated.byLanguage[lang] || 0) + 1;
      
      if (item.tags) {
        const tags = Array.isArray(item.tags) ? item.tags : (typeof item.tags === 'string' ? item.tags.split(',') : []);
        for (const tag of tags) {
          const trimmed = tag.trim().toLowerCase();
          if (trimmed) {
            aggregated.popularTags[trimmed] = (aggregated.popularTags[trimmed] || 0) + 1;
          }
        }
      }
    }

    aggregated.popularTags = Object.entries(aggregated.popularTags)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .reduce((acc, [tag, count]) => ({ ...acc, [tag]: count }), {});

    res.json({
      success: true,
      category,
      description: getCategoryDescription(category),
      data: items.slice(parseInt(offset), parseInt(offset) + parseInt(limit)),
      total: items.length,
      aggregated,
      pagination: { limit: parseInt(limit), offset: parseInt(offset) }
    });
  } catch (e) { next(e); }
});

router.get('/difficulty/:level', async (req, res, next) => {
  try {
    await contentService.waitForReady();
    const { limit = 50, offset = 0, category, language } = req.query;
    
    const valid = DIFFICULTY_LEVELS;
    const level = req.params.level.toLowerCase();
    
    if (!valid.includes(level)) {
      return res.status(400).json({ error: `Level must be one of: ${valid.join(', ')}` });
    }

    let result = contentService.getByDifficulty 
      ? contentService.getByDifficulty(level, parseInt(limit), parseInt(offset))
      : { items: contentService.items?.filter(i => i.difficulty === level || i.level === level) || [] };

    let items = result.items || result;
    
    if (category) {
      items = items.filter(i => i.category === category);
    }
    if (language) {
      items = items.filter(i => i.language === language);
    }

    const byCategory = {};
    for (const item of items) {
      const cat = item.category || 'unknown';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    }

    res.json({
      success: true,
      level,
      levelInfo: getDifficultyInfo(level),
      total: items.length,
      items: items.slice(parseInt(offset), parseInt(offset) + parseInt(limit)),
      byCategory,
      pagination: { limit: parseInt(limit), offset: parseInt(offset) }
    });
  } catch (e) { next(e); }
});

router.get('/item/:id', async (req, res, next) => {
  try {
    await contentService.waitForReady();
    const { includeRelated = 'true' } = req.query;
    
    let item = contentService.getById ? contentService.getById(req.params.id) : null;
    
    if (!item) {
      try {
        item = await db.queryOne('SELECT * FROM educational_content WHERE id = $1 OR content_id = $1', [req.params.id]);
      } catch (e) {
        item = (db.getTable('educational_content') || []).find(c => 
          c.id == req.params.id || c.content_id === req.params.id
        );
      }
    }

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const parsedItem = {
      ...item,
      learningObjectives: item.learningObjectives || item.learning_objectives ? (
        Array.isArray(item.learningObjectives) ? item.learningObjectives :
        typeof item.learningObjectives === 'string' ? JSON.parse(item.learningObjectives) :
        item.learning_objectives ? (
          Array.isArray(item.learning_objectives) ? item.learning_objectives :
          typeof item.learning_objectives === 'string' ? JSON.parse(item.learning_objectives) : []
        ) : []
      ) : [],
      prerequisites: item.prerequisites || item.prerequisites_list ? (
        Array.isArray(item.prerequisites) ? item.prerequisites :
        typeof item.prerequisites === 'string' ? JSON.parse(item.prerequisites) : []
      ) : [],
      tags: item.tags ? (
        Array.isArray(item.tags) ? item.tags :
        typeof item.tags === 'string' ? JSON.parse(item.tags) : []
      ) : [],
      metadata: item.metadata ? (
        typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata
      ) : {}
    };

    let relatedItems = [];
    if (includeRelated === 'true') {
      relatedItems = await findRelatedContent(parsedItem, 10);
    }

    let viewCount = item.view_count || 0;
    try {
      if (contentService.incrementViewCount) {
        viewCount = contentService.incrementViewCount(req.params.id);
      } else {
        if (item.view_count !== undefined) {
          item.view_count = (item.view_count || 0) + 1;
          viewCount = item.view_count;
        }
      }
    } catch (e) { /* ignore */ }

    res.json({
      success: true,
      data: parsedItem,
      viewCount,
      related: relatedItems,
      accessedAt: new Date().toISOString()
    });
  } catch (e) { next(e); }
});

router.get('/for-child', async (req, res, next) => {
  try {
    await contentService.waitForReady();
    const { 
      age = 8, category, limit = 20, 
      childId, includeHistory = 'false', 
      difficulty, includePersonalization = 'true'
    } = req.query;

    const ageNum = parseInt(age);
    
    let historyItems = [];
    if (childId && includeHistory === 'true') {
      try {
        historyItems = await db.query(
          'SELECT * FROM content_interactions WHERE child_id = $1 ORDER BY interacted_at DESC LIMIT 100',
          [childId]
        );
      } catch (e) {
        historyItems = (db.getTable('content_interactions') || [])
          .filter(i => i.child_id == childId)
          .sort((a, b) => new Date(b.interacted_at) - new Date(a.interacted_at))
          .slice(0, 100);
      }
    }

    let items = contentService.getForChild 
      ? contentService.getForChild(ageNum, category, parseInt(limit) + 50)
      : contentService.items?.filter(i => {
          if (category && i.category !== category) return false;
          return true;
        }) || [];

    if (difficulty) {
      items = items.filter(i => i.difficulty === difficulty || i.level === difficulty);
    }

    if (includePersonalization === 'true' && historyItems.length > 0) {
      const preferredCategories = {};
      const completedIds = new Set();
      
      for (const h of historyItems) {
        if (h.completed) completedIds.add(h.content_id);
        if (h.rating && h.rating >= 4) {
          preferredCategories[h.category] = (preferredCategories[h.category] || 0) + 1;
        }
      }

      items = items.filter(i => !completedIds.has(i.content_id || i.id));

      if (Object.keys(preferredCategories).length > 0) {
        items.sort((a, b) => {
          const aScore = preferredCategories[a.category] || 0;
          const bScore = preferredCategories[b.category] || 0;
          return bScore - aScore;
        });
      }
    }

    const enhancedItems = items.slice(0, parseInt(limit)).map(item => ({
      ...item,
      ageAppropriate: calculateAgeAppropriateness(item, ageNum),
      estimatedDuration: item.duration || estimateDuration(item),
      isNew: item.created_at && new Date(item.created_at) > new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    }));

    const recommendations = {
      byCategory: {},
      byDifficulty: {},
      totalFound: items.length
    };

    const categories = [...new Set(items.map(i => i.category).filter(Boolean))];
    for (const cat of categories) {
      recommendations.byCategory[cat] = items.filter(i => i.category === cat).slice(0, 5);
    }

    const difficulties = [...new Set(items.map(i => i.difficulty || i.level).filter(Boolean))];
    for (const diff of difficulties) {
      recommendations.byDifficulty[diff] = items.filter(i => i.difficulty === diff || i.level === diff).slice(0, 5);
    }

    res.json({
      success: true,
      age: ageNum,
      category,
      total: items.length,
      data: enhancedItems,
      recommendations,
      historyUsed: historyItems.length > 0,
      pagination: { limit: parseInt(limit) }
    });
  } catch (e) { next(e); }
});

router.post('/sync', async (req, res, next) => {
  try {
    await contentService.waitForReady();
    const ingestorStats = ingestor.getStats ? ingestor.getStats() : {};
    const scrapedItems = ingestor.scrapedContent || [];
    const added = contentService.mergeScraped ? contentService.mergeScraped(scrapedItems) : 0;
    
    res.json({
      success: true,
      merged: added,
      total: contentService.items?.length || 0,
      ingestorStats,
      scrapedCount: scrapedItems.length,
      syncedAt: new Date().toISOString()
    });
  } catch (e) { next(e); }
});

router.post('/generate', async (req, res, next) => {
  try {
    await contentService.waitForReady();
    const { 
      category, count = 90, level, ageRange, 
      language, topic, format, 
      saveToDatabase = false
    } = req.body;

    let items;
    if (category) {
      items = contentGenerator.generateContent 
        ? contentGenerator.generateContent(category, Math.min(count, 500))
        : generateSampleContent(category, Math.min(count, 50));
    } else {
      items = contentGenerator.generateAllCategories 
        ? contentGenerator.generateAllCategories(Math.min(count, 90))
        : generateSampleContent('stories', Math.min(count, 50));
    }

    if (level) {
      items = items.map(i => ({ ...i, difficulty: level, level }));
    }
    if (language) {
      items = items.map(i => ({ ...i, language }));
    }
    if (topic) {
      items = items.map(i => ({ ...i, topic }));
    }

    const added = contentService.mergeScraped ? contentService.mergeScraped(items) : items.length;

    if (saveToDatabase) {
      for (const item of items) {
        try {
          await db.insert('educational_content', {
            content_id: item.content_id || item.id || crypto.randomUUID(),
            title: item.title,
            description: item.description || item.summary,
            category: item.category,
            difficulty: item.difficulty || item.level,
            language: item.language || 'en',
            content: item.content || JSON.stringify(item),
            tags: item.tags ? JSON.stringify(item.tags) : null,
            learning_objectives: item.learningObjectives ? JSON.stringify(item.learningObjectives) : null,
            created_at: new Date().toISOString()
          });
        } catch (e) { /* ignore */ }
      }
    }

    res.json({
      success: true,
      generated: items.length,
      merged: added,
      total: contentService.items?.length || 0,
      filters: {
        category,
        count,
        level,
        language,
        topic
      }
    });
  } catch (e) { next(e); }
});

router.post('/interact', async (req, res) => {
  try {
    const { 
      childId, contentId, action, duration, 
      completed = false, rating, progress = 100 
    } = req.body;

    if (!childId || !contentId || !action) {
      return res.status(400).json({ error: 'childId, contentId, and action are required' });
    }

    const interaction = {
      child_id: childId,
      content_id: contentId,
      action,
      duration: duration ? parseInt(duration) : null,
      completed,
      rating: rating ? parseInt(rating) : null,
      progress: Math.min(100, Math.max(0, parseInt(progress))),
      interacted_at: new Date().toISOString()
    };

    try {
      await db.insert('content_interactions', interaction);
    } catch (e) {
      if (!db.tables.content_interactions) db.tables.content_interactions = [];
      db.tables.content_interactions.push(interaction);
    }

    if (completed) {
      try {
        await db.run(
          'UPDATE content_interactions SET completed = true, progress = 100 WHERE child_id = $1 AND content_id = $2',
          [childId, contentId]
        );
      } catch (e) { /* ignore */ }
    }

    res.status(201).json({
      success: true,
      message: 'Interaction recorded',
      data: interaction
    });
  } catch (error) {
    logger.error('Content interaction error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/recommendations/:childId', async (req, res) => {
  try {
    const childId = req.params.childId;
    const { limit = 20, category, includeExplanations = 'true' } = req.query;

    let history = [];
    try {
      history = await db.query(
        'SELECT * FROM content_interactions WHERE child_id = $1 ORDER BY interacted_at DESC LIMIT 100',
        [childId]
      );
    } catch (e) {
      history = (db.getTable('content_interactions') || [])
        .filter(i => i.child_id == childId)
        .sort((a, b) => new Date(b.interacted_at) - new Date(a.interacted_at))
        .slice(0, 100);
    }

    let allContent = contentService.items || [];
    
    const interactedIds = new Set(history.map(h => h.content_id));
    const preferredCategories = {};
    const preferredDifficulties = {};
    let avgRating = 0;
    let ratingCount = 0;

    for (const h of history) {
      if (h.category) {
        preferredCategories[h.category] = (preferredCategories[h.category] || 0) + 1;
      }
      if (h.difficulty) {
        preferredDifficulties[h.difficulty] = (preferredDifficulties[h.difficulty] || 0) + 1;
      }
      if (h.rating !== null && h.rating !== undefined) {
        avgRating += h.rating;
        ratingCount++;
      }
    }

    if (ratingCount > 0) avgRating = avgRating / ratingCount;

    let recommendations = allContent.filter(item => {
      if (interactedIds.has(item.id || item.content_id)) return false;
      if (category && item.category !== category) return false;
      return true;
    });

    const explanations = [];
    recommendations = recommendations.map(item => {
      let score = 0;
      const reasons = [];

      if (preferredCategories[item.category]) {
        score += preferredCategories[item.category] * 10;
        reasons.push(`Prefers ${item.category} category`);
      }
      
      const diff = item.difficulty || item.level;
      if (preferredDifficulties[diff]) {
        score += preferredDifficulties[diff] * 5;
        reasons.push(`Suitable difficulty level`);
      }

      return { ...item, recommendationScore: score, reasons };
    });

    recommendations.sort((a, b) => b.recommendationScore - a.recommendationScore);

    const topRecommendations = recommendations.slice(0, parseInt(limit));

    res.json({
      success: true,
      childId,
      totalRecommendations: recommendations.length,
      data: topRecommendations,
      profile: {
        historyCount: history.length,
        preferredCategories,
        preferredDifficulties,
        avgRating: ratingCount > 0 ? avgRating.toFixed(1) : null
      },
      limit: parseInt(limit)
    });
  } catch (error) {
    logger.error('Recommendations error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/analytics', async (req, res) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'school_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { period = '30d', category } = req.query;

    const now = new Date();
    let since;
    switch (period) {
      case '7d': since = new Date(now - 7 * 24 * 60 * 60 * 1000); break;
      case '30d': since = new Date(now - 30 * 24 * 60 * 60 * 1000); break;
      case '90d': since = new Date(now - 90 * 24 * 60 * 60 * 1000); break;
      default: since = new Date(now - 30 * 24 * 60 * 60 * 1000);
    }

    const allContent = contentService.items || [];
    const interactions = (db.getTable('content_interactions') || [])
      .filter(i => new Date(i.interacted_at) >= since);

    const filteredContent = category 
      ? allContent.filter(c => c.category === category)
      : allContent;

    const analytics = {
      summary: {
        totalContent: filteredContent.length,
        totalInteractions: interactions.length,
        byCategory: {},
        byDifficulty: {},
        byLanguage: {},
        completionRate: 0,
        avgRating: 0
      },
      performance: {
        topRated: [],
        mostViewed: [],
        mostCompleted: []
      },
      engagement: {
        dailyTrend: [],
        avgDurationPerCategory: {}
      }
    };

    for (const item of allContent) {
      const cat = item.category || 'unknown';
      const diff = item.difficulty || item.level || 'unknown';
      const lang = item.language || 'unknown';

      analytics.summary.byCategory[cat] = (analytics.summary.byCategory[cat] || 0) + 1;
      analytics.summary.byDifficulty[diff] = (analytics.summary.byDifficulty[diff] || 0) + 1;
      analytics.summary.byLanguage[lang] = (analytics.summary.byLanguage[lang] || 0) + 1;
    }

    const completed = interactions.filter(i => i.completed);
    const rated = interactions.filter(i => i.rating !== null);
    
    analytics.summary.completionRate = interactions.length > 0
      ? ((completed.length / interactions.length) * 100).toFixed(1)
      : '0.0';
    
    analytics.summary.avgRating = rated.length > 0
      ? (rated.reduce((sum, i) => sum + (i.rating || 0), 0) / rated.length).toFixed(1)
      : null;

    res.json({
      success: true,
      data: analytics,
      period,
      since: since.toISOString(),
      until: now.toISOString()
    });
  } catch (error) {
    logger.error('Content analytics error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/save', async (req, res, next) => {
  try {
    await contentService.waitForReady();
    const result = await contentService._saveToDisk ? contentService._saveToDisk() : true;
    
    res.json({ 
      success: !!result, 
      saved: contentService.items?.length || 0, 
      total: contentService.items?.length || 0 
    });
  } catch (e) { next(e); }
});

router.post('/refresh', async (req, res, next) => {
  try {
    await contentService.waitForReady();
    const result = await initContentService();
    
    res.json({ 
      success: true, 
      total: contentService.items?.length || 0, 
      message: 'Content service re-initialized',
      result
    });
  } catch (e) { next(e); }
});

router.get('/browse', async (req, res, next) => {
  try {
    await contentService.waitForReady();
    const { 
      category, limit = 50, offset = 0, 
      sortBy = 'popularity', language, difficulty
    } = req.query;

    let items = contentService.items || [];
    
    if (category) items = items.filter(i => i.category === category);
    if (language) items = items.filter(i => i.language === language);
    if (difficulty) items = items.filter(i => i.difficulty === difficulty || i.level === difficulty);

    switch (sortBy) {
      case 'newest':
        items.sort((a, b) => new Date(b.created_at || b.updated_at || 0) - new Date(a.created_at || a.updated_at || 0));
        break;
      case 'popularity':
        items.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
        break;
      case 'title':
        items.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        break;
      case 'difficulty':
        const diffOrder = { beginner: 0, basic: 1, intermediate: 2, advanced: 3, expert: 4 };
        items.sort((a, b) => (diffOrder[a.difficulty || a.level] || 99) - (diffOrder[b.difficulty || b.level] || 99));
        break;
    }

    const total = items.length;
    const page = items.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    const byCategory = {};
    page.forEach(i => { 
      const cat = i.category || 'unknown';
      byCategory[cat] = (byCategory[cat] || 0) + 1; 
    });

    const facetCounts = {
      categories: {},
      difficulties: {},
      languages: {}
    };

    for (const item of items) {
      const cat = item.category || 'unknown';
      const diff = item.difficulty || item.level || 'unknown';
      const lang = item.language || 'unknown';

      facetCounts.categories[cat] = (facetCounts.categories[cat] || 0) + 1;
      facetCounts.difficulties[diff] = (facetCounts.difficulties[diff] || 0) + 1;
      facetCounts.languages[lang] = (facetCounts.languages[lang] || 0) + 1;
    }

    res.json({
      success: true,
      data: page,
      total,
      offset: parseInt(offset),
      limit: parseInt(limit),
      breakdown: byCategory,
      facets: facetCounts,
      sortBy,
      filters: {
        category,
        language,
        difficulty
      }
    });
  } catch (e) { next(e); }
});

router.get('/versions/:contentId', async (req, res) => {
  try {
    const contentId = req.params.contentId;
    const { limit = 10 } = req.query;

    let versions = [];
    try {
      versions = await db.query(
        'SELECT * FROM content_versions WHERE content_id = $1 ORDER BY version_number DESC LIMIT $2',
        [contentId, parseInt(limit)]
      );
    } catch (e) {
      versions = (db.getTable('content_versions') || [])
        .filter(v => v.content_id === contentId || v.content_id == contentId)
        .sort((a, b) => (b.version_number || 0) - (a.version_number || 0))
        .slice(0, parseInt(limit));
    }

    res.json({
      success: true,
      contentId,
      total: versions.length,
      data: versions.map(v => ({
        ...v,
        changes: v.changes ? JSON.parse(v.changes) : [],
        content: v.content ? JSON.parse(v.content) : null
      }))
    });
  } catch (error) {
    logger.error('Content versions error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/ab-tests', async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const tests = (db.getTable('ab_tests') || []);

    const activeTests = tests.filter(t => t.status === 'active');
    const completedTests = tests.filter(t => t.status === 'completed');

    res.json({
      success: true,
      data: {
        total: tests.length,
        active: activeTests.length,
        completed: completedTests.length,
        activeTests: activeTests.map(t => ({
          ...t,
          variants: t.variants ? JSON.parse(t.variants) : [],
          results: t.results ? JSON.parse(t.results) : null
        })),
        completedTests: completedTests.slice(0, 10).map(t => ({
          ...t,
          variants: t.variants ? JSON.parse(t.variants) : [],
          results: t.results ? JSON.parse(t.results) : null
        }))
      }
    });
  } catch (error) {
    logger.error('AB tests error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/publish', async (req, res) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'content_manager') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { contentId, status, notes, versionNumber } = req.body;

    if (!contentId) {
      return res.status(400).json({ error: 'contentId is required' });
    }

    let item = contentService.getById ? contentService.getById(contentId) : null;
    if (!item) {
      return res.status(404).json({ error: 'Content not found' });
    }

    const now = new Date().toISOString();
    const workflow = {
      content_id: contentId,
      action: status === 'published' ? 'publish' : status === 'draft' ? 'save_draft' : 'archive',
      status: status || 'draft',
      notes: notes || null,
      version_number: versionNumber,
      published_by: req.user.userId,
      published_at: status === 'published' ? now : null,
      created_at: now
    };

    try {
      await db.insert('content_workflow', workflow);
    } catch (e) {
      if (!db.tables.content_workflow) db.tables.content_workflow = [];
      db.tables.content_workflow.push(workflow);
    }

    if (item.status !== undefined) {
      item.status = status;
      if (status === 'published') {
        item.published_at = now;
      }
    }

    res.json({
      success: true,
      message: `Content ${status === 'published' ? 'published' : status === 'draft' ? 'saved as draft' : 'archived'}`,
      data: workflow
    });
  } catch (error) {
    logger.error('Content publish error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

function getCategoryDescription(category) {
  const descriptions = {
    stories: 'Engaging stories and fairy tales for children of all ages',
    education: 'Educational content aligned with curriculum standards',
    games: 'Interactive learning games and activities',
    music: 'Songs, nursery rhymes, and musical experiences',
    meditation: 'Guided meditation and relaxation exercises',
    facts: 'Interesting facts and general knowledge',
    jokes: 'Age-appropriate jokes and humor',
    riddles: 'Brain teasers and riddles',
    poems: 'Poetry and rhymes',
    interactive: 'Interactive and engaging experiences'
  };
  return descriptions[category] || `${category} content`;
}

function getDifficultyInfo(level) {
  const info = {
    beginner: { name: 'Beginner', minAge: 3, description: 'Simple concepts, basic vocabulary' },
    basic: { name: 'Basic', minAge: 5, description: 'Foundational knowledge, simple sentences' },
    intermediate: { name: 'Intermediate', minAge: 7, description: 'Moderate complexity, extended concepts' },
    advanced: { name: 'Advanced', minAge: 10, description: 'Complex concepts, detailed explanations' },
    expert: { name: 'Expert', minAge: 12, description: 'In-depth analysis, comprehensive coverage' }
  };
  return info[level] || { name: level, description: `${level} level` };
}

function calculateAgeAppropriateness(item, age) {
  const itemAge = item.minAge || item.age_from || 3;
  const itemMaxAge = item.maxAge || item.age_to || 12;
  
  if (age >= itemAge && age <= itemMaxAge) return 'perfect';
  if (age >= itemAge - 1 && age <= itemMaxAge + 1) return 'good';
  if (age >= itemAge - 2 && age <= itemMaxAge + 2) return 'acceptable';
  return 'may_challenge';
}

function estimateDuration(item) {
  if (item.duration) return item.duration;
  const wordCount = item.wordCount || (item.content ? item.content.length / 5 : 200);
  return Math.max(2, Math.round(wordCount / 100));
}

async function findRelatedContent(item, limit) {
  const allItems = contentService.items || [];
  const related = [];

  for (const other of allItems) {
    if (other.id === item.id || other.content_id === item.content_id) continue;
    
    let score = 0;
    if (other.category === item.category) score += 30;
    if ((other.difficulty || other.level) === (item.difficulty || item.level)) score += 20;
    if (other.language === item.language) score += 10;

    const itemTags = Array.isArray(item.tags) ? item.tags : (typeof item.tags === 'string' ? item.tags.split(',') : []);
    const otherTags = Array.isArray(other.tags) ? other.tags : (typeof other.tags === 'string' ? other.tags.split(',') : []);
    
    for (const tag of itemTags) {
      if (otherTags.includes(tag)) score += 15;
    }

    if (score > 0) {
      related.push({ ...other, relevanceScore: score });
    }
  }

  related.sort((a, b) => b.relevanceScore - a.relevanceScore);
  return related.slice(0, limit);
}

function generateSampleContent(category, count) {
  const content = [];
  for (let i = 0; i < count; i++) {
    content.push({
      id: `sample_${category}_${i}`,
      content_id: `sample_${category}_${i}`,
      title: `Sample ${category} ${i + 1}`,
      description: `This is a sample ${category} item for demonstration purposes.`,
      category,
      difficulty: ['beginner', 'basic', 'intermediate', 'advanced'][i % 4],
      language: 'en',
      created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      view_count: Math.floor(Math.random() * 1000),
      tags: ['sample', category, `tag_${i % 10}`],
      learningObjectives: ['Understand basic concepts', 'Apply knowledge', 'Demonstrate mastery']
    });
  }
  return content;
}

async function initContentService() {
  if (!contentService.ready) {
    if (contentService.init) {
      await contentService.init();
    }
  }
  const scrapedItems = ingestor.scrapedContent || [];
  if (scrapedItems.length > 0 && contentService.mergeScraped) {
    contentService.mergeScraped(scrapedItems);
  }
  return contentService.getStats ? contentService.getStats() : {};
}

module.exports = router;
module.exports.initContentService = initContentService;
