const express = require('express');
const router = express.Router();
const lifeServices = require('../services/life-services');

router.get('/music', (req, res) => {
  try {
    const { category, age } = req.query;
    const result = lifeServices.getMusicByCategory(category, age ? parseInt(age) : undefined);
    if (!result.success) return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Get music error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/music/playlist', (req, res) => {
  try {
    const { mood = 'happy', age } = req.query;
    const result = lifeServices.getMusicByMood(mood, age ? parseInt(age) : undefined);
    if (!result.success) return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Get music playlist error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/music/white-noise', (req, res) => {
  try {
    const { type, age } = req.query;
    const result = lifeServices.getWhiteNoise(type, age ? parseInt(age) : undefined);
    if (!result.success) return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Get white noise error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/games', (req, res) => {
  try {
    const { age, type } = req.query;
    const result = lifeServices.getAvailableGames(type, age ? parseInt(age) : undefined);
    if (!result.success) return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Get games error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/games/start', (req, res) => {
  try {
    const { gameId, age } = req.body;
    if (!gameId) return res.status(400).json({ success: false, error: 'gameId is required' });
    const result = lifeServices.startGame(gameId, age ? parseInt(age) : undefined);
    if (!result.success) return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Start game error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/games/turn', (req, res) => {
  try {
    const { sessionId, answer } = req.body;
    if (!sessionId) return res.status(400).json({ success: false, error: 'sessionId is required' });
    const result = lifeServices.playTurn(sessionId, answer);
    if (!result.success) return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Play turn error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/games/result/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = lifeServices.getGameResult(sessionId);
    if (!result.success) return res.status(404).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Get game result error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/stories', (req, res) => {
  try {
    const { category, age, mood } = req.query;
    if (category) {
      const result = lifeServices.getStoriesByCategory(category, age ? parseInt(age) : undefined);
      if (!result.success) return res.status(400).json({ success: false, error: result.error });
      return res.json({ success: true, data: result.data });
    }
    const result = lifeServices.getTodaysStory(age ? parseInt(age) : undefined);
    if (!result.success) return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Get stories error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/stories/:storyId', (req, res) => {
  try {
    const { storyId } = req.params;
    const result = lifeServices.getStoryById(storyId);
    if (!result.success) return res.status(404).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Get story error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/daily/routine', (req, res) => {
  try {
    const { age } = req.query;
    const result = lifeServices.getDailyRoutine(age ? parseInt(age) : undefined);
    if (!result.success) return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Get daily routine error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/daily/health-tip', (req, res) => {
  try {
    const { age } = req.query;
    const result = lifeServices.getHealthTips(undefined, age ? parseInt(age) : undefined);
    if (!result.success) return res.status(400).json({ success: false, error: result.error });
    const tips = result.data;
    const tip = tips.length > 0 ? tips[Math.floor(Math.random() * tips.length)] : null;
    res.json({ success: true, data: tip });
  } catch (error) {
    console.error('Get health tip error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/daily/weather-activity', (req, res) => {
  try {
    const { weather = 'sunny', age } = req.query;
    const result = lifeServices.getWeatherActivities(weather, age ? parseInt(age) : undefined);
    if (!result.success) return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Get weather activity error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/daily/seasonal-activity', (req, res) => {
  try {
    const { season = 'summer', age } = req.query;
    const result = lifeServices.getSeasonalActivities(season, age ? parseInt(age) : undefined);
    if (!result.success) return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Get seasonal activity error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/daily/holiday', (req, res) => {
  try {
    const { country = 'de' } = req.query;
    const result = lifeServices.getHolidays(country);
    if (!result.success) return res.status(404).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Get holiday error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/emotion/calming', (req, res) => {
  try {
    const { age } = req.query;
    const result = lifeServices.getCalmingActivity(age ? parseInt(age) : undefined);
    if (!result.success) return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Get calming activity error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/emotion/encouragement', (req, res) => {
  try {
    const { age } = req.query;
    const result = lifeServices.getEncouragement(age ? parseInt(age) : undefined);
    if (!result.success) return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Get encouragement error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/emotion/anger-tip', (req, res) => {
  try {
    const { age } = req.query;
    const result = lifeServices.getAngerTip(age ? parseInt(age) : undefined);
    if (!result.success) return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Get anger tip error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/emotion/social-skill', (req, res) => {
  try {
    const { age } = req.query;
    const result = lifeServices.getSocialSkillTip(age ? parseInt(age) : undefined);
    if (!result.success) return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Get social skill error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/emotion/detect', (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false, error: 'text is required' });
    const result = lifeServices.detectMood(text);
    if (!result.success) return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Detect mood error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/jokes', (req, res) => {
  try {
    const { category, age } = req.query;
    const result = lifeServices.getRandomJoke(category, age ? parseInt(age) : undefined);
    if (!result.success) return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Get joke error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/jokes/tongue-twister', (req, res) => {
  try {
    const { language } = req.query;
    const result = lifeServices.getTongueTwister(language);
    if (!result.success) return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Get tongue twister error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/jokes/fun-fact', (req, res) => {
  try {
    const { age } = req.query;
    const result = lifeServices.getFunFact(undefined, age ? parseInt(age) : undefined);
    if (!result.success) return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Get fun fact error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/summary', (req, res) => {
  try {
    const result = lifeServices.getServiceSummary();
    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
