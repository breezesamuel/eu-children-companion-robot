const express = require('express');
const router = express.Router();
const db = require('../utils/database');
const logger = require('../utils/logger');
const orchestrator = require('../agents/orchestrator');

const AGENT_TYPES = ['chat', 'educational', 'storyteller', 'translator', 'support', 'companion', 'tutor'];
const AGENT_STATES = ['idle', 'active', 'paused', 'error', 'loading'];

router.get('/', async (req, res) => {
  try {
    const agents = Object.entries(orchestrator.AGENTS || {}).map(([id, agent]) => ({
      id,
      name: agent.name,
      description: agent.description,
      type: agent.type || 'chat',
      capabilities: agent.capabilities || [],
      version: agent.version || '1.0.0'
    }));

    const registryAgents = (db.getTable('agent_registry') || []).map(a => ({
      ...a,
      metadata: a.metadata ? JSON.parse(a.metadata) : null
    }));

    const allAgents = [...agents, ...registryAgents.filter(ra => !agents.find(a => a.id === ra.id))];

    res.json({ success: true, data: allAgents, total: allAgents.length });
  } catch (error) {
    logger.error('List agents error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/registry', async (req, res) => {
  try {
    let agents;
    try {
      agents = await db.query('SELECT * FROM agent_registry ORDER BY created_at DESC');
    } catch (e) {
      agents = (db.getTable('agent_registry') || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    const agentsWithCapabilities = agents.map(a => ({
      ...a,
      capabilities: a.capabilities ? JSON.parse(a.capabilities) : [],
      config: a.config ? JSON.parse(a.config) : null,
      metadata: a.metadata ? JSON.parse(a.metadata) : null
    }));

    res.json({ success: true, data: agentsWithCapabilities });
  } catch (error) {
    logger.error('Get agent registry error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/registry', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { name, type, description, capabilities, config, version, endpoint, metadata } = req.body;
    
    if (!name || !type) return res.status(400).json({ error: 'Name and type are required' });
    if (!AGENT_TYPES.includes(type)) {
      return res.status(400).json({ error: `Invalid agent type. Must be one of: ${AGENT_TYPES.join(', ')}` });
    }

    const agent = {
      name,
      type,
      description: description || '',
      capabilities: capabilities ? JSON.stringify(capabilities) : '[]',
      config: config ? JSON.stringify(config) : null,
      version: version || '1.0.0',
      endpoint: endpoint || null,
      status: 'idle',
      metadata: metadata ? JSON.stringify(metadata) : null,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let result;
    try {
      result = await db.insert('agent_registry', agent);
    } catch (e) {
      if (!db.tables.agent_registry) db.tables.agent_registry = [];
      if (!db.ids) db.ids = {};
      const newId = (db.ids.agent_registry || 0) + 1;
      db.ids.agent_registry = newId;
      result = { insertId: newId };
      db.tables.agent_registry.push({ id: newId, ...agent });
    }

    res.status(201).json({ 
      success: true, 
      data: { 
        id: result.insertId, 
        ...agent,
        capabilities,
        config,
        metadata
      }
    });
  } catch (error) {
    logger.error('Register agent error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.get('/registry/:id', async (req, res) => {
  try {
    let agent;
    try {
      agent = await db.queryOne('SELECT * FROM agent_registry WHERE id = $1', [req.params.id]);
    } catch (e) {
      agent = (db.getTable('agent_registry') || []).find(a => a.id == req.params.id);
    }

    if (!agent) return res.status(404).json({ error: 'Agent not found in registry' });

    res.json({
      success: true,
      data: {
        ...agent,
        capabilities: agent.capabilities ? JSON.parse(agent.capabilities) : [],
        config: agent.config ? JSON.parse(agent.config) : null,
        metadata: agent.metadata ? JSON.parse(agent.metadata) : null
      }
    });
  } catch (error) {
    logger.error('Get agent error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/registry/:id', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { name, description, capabilities, config, version, endpoint, status, metadata } = req.body;

    let agent;
    try {
      agent = await db.queryOne('SELECT * FROM agent_registry WHERE id = $1', [req.params.id]);
    } catch (e) {
      agent = (db.getTable('agent_registry') || []).find(a => a.id == req.params.id);
    }

    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    const updates = { updated_at: new Date().toISOString() };
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (capabilities) updates.capabilities = JSON.stringify(capabilities);
    if (config) updates.config = JSON.stringify(config);
    if (version) updates.version = version;
    if (endpoint !== undefined) updates.endpoint = endpoint;
    if (status && AGENT_STATES.includes(status)) updates.status = status;
    if (metadata) updates.metadata = JSON.stringify(metadata);

    try {
      await db.update('agent_registry', updates, { id: req.params.id });
    } catch (e) {
      const idx = (db.tables.agent_registry || []).findIndex(a => a.id == req.params.id);
      if (idx >= 0) db.tables.agent_registry[idx] = { ...db.tables.agent_registry[idx], ...updates };
    }

    res.json({ success: true, message: 'Agent updated' });
  } catch (error) {
    logger.error('Update agent error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.delete('/registry/:id', async (req, res) => {
  try {
    let agent;
    try {
      agent = await db.queryOne('SELECT * FROM agent_registry WHERE id = $1', [req.params.id]);
    } catch (e) {
      agent = (db.getTable('agent_registry') || []).find(a => a.id == req.params.id);
    }

    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    try {
      await db.run('DELETE FROM agent_registry WHERE id = $1', [req.params.id]);
    } catch (e) {
      if (db.tables.agent_registry) {
        db.tables.agent_registry = db.tables.agent_registry.filter(a => a.id != req.params.id);
      }
    }

    res.json({ success: true, message: 'Agent removed from registry' });
  } catch (error) {
    logger.error('Delete agent error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.post('/chat', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { message, sessionId, agentType, context, childId, metadata } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    if (sessionId) {
      try {
        await db.insert('chat_messages', {
          session_id: sessionId,
          user_id: userId,
          child_id: childId || null,
          content: message,
          role: 'user',
          agent_type: agentType || null,
          metadata: metadata ? JSON.stringify(metadata) : null,
          created_at: new Date().toISOString()
        });
      } catch (e) {
        try {
          await db.run(
            'INSERT INTO chat_messages (session_id, user_id, child_id, content, role, agent_type, metadata, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [sessionId, userId, childId || null, message, 'user', agentType || null, metadata ? JSON.stringify(metadata) : null, new Date().toISOString()]
          );
        } catch (e2) { /* ignore */ }
      }
    }

    const result = await orchestrator.handleMessage(userId, message, sessionId, agentType, { context, childId });

    if (sessionId) {
      try {
        await db.insert('chat_messages', {
          session_id: sessionId,
          user_id: userId,
          child_id: childId || null,
          content: result.reply,
          role: 'assistant',
          agent_type: result.agentType,
          metadata: JSON.stringify({ 
            confidence: result.confidence,
            entities: result.entities || [],
            intent: result.intent
          }),
          created_at: new Date().toISOString()
        });
      } catch (e) {
        try {
          await db.run(
            'INSERT INTO chat_messages (session_id, user_id, child_id, content, role, agent_type, metadata, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [sessionId, userId, childId || null, result.reply, 'assistant', result.agentType, JSON.stringify({ confidence: result.confidence, entities: result.entities || [], intent: result.intent }), new Date().toISOString()]
          );
        } catch (e2) { /* ignore */ }
      }

      try {
        await db.run(
          'UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP, last_message = $1, message_count = COALESCE(message_count, 0) + 2 WHERE id = $2',
          [message.substring(0, 100), sessionId]
        );
      } catch (e) { /* ignore */ }
    }

    res.json({ 
      success: true, 
      data: {
        reply: result.reply,
        agentType: result.agentType,
        confidence: result.confidence,
        intent: result.intent,
        entities: result.entities || [],
        context: result.context,
        suggestions: result.suggestions || []
      }
    });
  } catch (error) {
    logger.error('Agent chat error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.post('/chat/stream', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { message, sessionId, agentType, context, childId } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    let fullReply = '';
    let collectedMetadata = {};

    await orchestrator.streamMessage(userId, message, sessionId, agentType, { context, childId }, (chunk, metadata) => {
      fullReply += chunk;
      if (metadata) collectedMetadata = { ...collectedMetadata, ...metadata };
      res.write(`data: ${JSON.stringify({ chunk, metadata })}\n\n`);
    });

    if (sessionId) {
      try {
        await db.run(
          'INSERT INTO chat_messages (session_id, user_id, child_id, content, role, agent_type, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [sessionId, userId, childId || null, message, 'user', agentType || null, new Date().toISOString()]
        );
        await db.run(
          'INSERT INTO chat_messages (session_id, user_id, child_id, content, role, agent_type, metadata, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [sessionId, userId, childId || null, fullReply, 'assistant', agentType || null, JSON.stringify(collectedMetadata), new Date().toISOString()]
        );
        await db.run(
          'UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
          [sessionId]
        );
      } catch (e) { /* ignore */ }
    }

    res.write(`data: ${JSON.stringify({ done: true, fullReply, metadata: collectedMetadata })}\n\n`);
    res.end();
  } catch (error) {
    logger.error('Agent stream error', { error: error.message });
    if (!res.headersSent) res.status(500).json({ error: error.message });
    res.end();
  }
});

router.get('/sessions', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { status, agentType, childId, limit = 50, offset = 0 } = req.query;

    let sessions;
    try {
      let query = 'SELECT * FROM chat_sessions WHERE user_id = $1';
      const params = [userId];
      let paramIndex = 2;

      if (status) {
        query += ` AND status = $${paramIndex++}`;
        params.push(status);
      }
      if (agentType) {
        query += ` AND agent_type = $${paramIndex++}`;
        params.push(agentType);
      }
      if (childId) {
        query += ` AND child_id = $${paramIndex++}`;
        params.push(childId);
      }

      query += ' ORDER BY updated_at DESC LIMIT $' + paramIndex++ + ' OFFSET $' + paramIndex++;
      params.push(parseInt(limit), parseInt(offset));

      sessions = await db.query(query, params);
    } catch (e) {
      sessions = (db.getTable('chat_sessions') || [])
        .filter(s => s.user_id === userId)
        .filter(s => !status || s.status === status)
        .filter(s => !agentType || s.agent_type === agentType)
        .filter(s => !childId || s.child_id == childId)
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        .slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    }

    const sessionsWithCounts = await Promise.all(sessions.map(async (s) => {
      let messageCount = 0;
      try {
        const result = await db.queryOne('SELECT COUNT(*) as count FROM chat_messages WHERE session_id = $1', [s.id]);
        messageCount = result?.count || 0;
      } catch (e) {
        messageCount = (db.getTable('chat_messages') || []).filter(m => m.session_id == s.id).length;
      }
      return { ...s, messageCount };
    }));

    res.json({ 
      success: true, 
      data: sessionsWithCounts,
      pagination: { limit: parseInt(limit), offset: parseInt(offset) }
    });
  } catch (error) {
    logger.error('List sessions error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/sessions/:id', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let session;
    try {
      session = await db.queryOne('SELECT * FROM chat_sessions WHERE id = $1 AND user_id = $2', [req.params.id, userId]);
    } catch (e) {
      session = (db.getTable('chat_sessions') || []).find(s => s.id == req.params.id && s.user_id === userId);
    }

    if (!session) return res.status(404).json({ error: 'Session not found' });

    let messages;
    try {
      messages = await db.query(
        'SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC',
        [req.params.id]
      );
    } catch (e) {
      messages = (db.getTable('chat_messages') || [])
        .filter(m => m.session_id == req.params.id)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }

    const messagesWithParsedMetadata = messages.map(m => ({
      ...m,
      metadata: m.metadata ? JSON.parse(m.metadata) : null
    }));

    res.json({ 
      success: true, 
      data: {
        session,
        messages: messagesWithParsedMetadata,
        messageCount: messagesWithParsedMetadata.length
      }
    });
  } catch (error) {
    logger.error('Get session error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/sessions', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { childId, title, agentType, context, metadata } = req.body;
    const session = {
      user_id: userId,
      child_id: childId || null,
      title: title || 'New Conversation',
      agent_type: agentType || null,
      context: context ? JSON.stringify(context) : null,
      metadata: metadata ? JSON.stringify(metadata) : null,
      status: 'active',
      message_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let result;
    try {
      result = await db.insert('chat_sessions', session);
    } catch (e) {
      await db.run(
        'INSERT INTO chat_sessions (user_id, child_id, title, agent_type, context, metadata, status, message_count, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [session.user_id, session.child_id, session.title, session.agent_type, session.context, session.metadata, session.status, 0, session.created_at, session.updated_at]
      );
      result = { insertId: 0 };
    }

    res.status(201).json({ 
      success: true, 
      data: { 
        id: result.insertId, 
        ...session,
        context,
        metadata
      }
    });
  } catch (error) {
    logger.error('Create session error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.put('/sessions/:id', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { title, status, context, metadata } = req.body;

    let session;
    try {
      session = await db.queryOne('SELECT * FROM chat_sessions WHERE id = $1 AND user_id = $2', [req.params.id, userId]);
    } catch (e) {
      session = (db.getTable('chat_sessions') || []).find(s => s.id == req.params.id && s.user_id === userId);
    }

    if (!session) return res.status(404).json({ error: 'Session not found' });

    const updates = { updated_at: new Date().toISOString() };
    if (title) updates.title = title;
    if (status) updates.status = status;
    if (context !== undefined) updates.context = context ? JSON.stringify(context) : null;
    if (metadata !== undefined) updates.metadata = metadata ? JSON.stringify(metadata) : null;

    try {
      await db.update('chat_sessions', updates, { id: req.params.id });
    } catch (e) {
      const idx = (db.tables.chat_sessions || []).findIndex(s => s.id == req.params.id);
      if (idx >= 0) db.tables.chat_sessions[idx] = { ...db.tables.chat_sessions[idx], ...updates };
    }

    res.json({ success: true, message: 'Session updated' });
  } catch (error) {
    logger.error('Update session error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.delete('/sessions/:id', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let session;
    try {
      session = await db.queryOne('SELECT * FROM chat_sessions WHERE id = $1 AND user_id = $2', [req.params.id, userId]);
    } catch (e) {
      session = (db.getTable('chat_sessions') || []).find(s => s.id == req.params.id && s.user_id === userId);
    }

    if (!session) return res.status(404).json({ error: 'Session not found' });

    try {
      await db.run('DELETE FROM chat_messages WHERE session_id = $1', [req.params.id]);
      await db.run('DELETE FROM chat_sessions WHERE id = $1', [req.params.id]);
    } catch (e) {
      if (db.tables.chat_messages) {
        db.tables.chat_messages = db.tables.chat_messages.filter(m => m.session_id != req.params.id);
      }
      if (db.tables.chat_sessions) {
        db.tables.chat_sessions = db.tables.chat_sessions.filter(s => s.id != req.params.id);
      }
    }

    res.json({ success: true, message: 'Session deleted' });
  } catch (error) {
    logger.error('Delete session error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.get('/sessions/:id/messages', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { limit = 100, offset = 0, role } = req.query;

    let messages;
    try {
      let query = `SELECT cm.*, u.username 
                   FROM chat_messages cm 
                   LEFT JOIN users u ON cm.user_id = u.id 
                   WHERE cm.session_id = $1`;
      const params = [req.params.id];
      let paramIndex = 2;

      if (role) {
        query += ` AND cm.role = $${paramIndex++}`;
        params.push(role);
      }

      query += ' ORDER BY cm.created_at DESC LIMIT $' + paramIndex++ + ' OFFSET $' + paramIndex++;
      params.push(parseInt(limit), parseInt(offset));

      messages = await db.query(query, params);
    } catch (e) {
      messages = (db.getTable('chat_messages') || [])
        .filter(m => m.session_id == req.params.id)
        .filter(m => !role || m.role === role)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    }

    const messagesWithParsedMetadata = messages.map(m => ({
      ...m,
      metadata: m.metadata ? JSON.parse(m.metadata) : null
    })).reverse();

    res.json({ 
      success: true, 
      data: messagesWithParsedMetadata,
      pagination: { limit: parseInt(limit), offset: parseInt(offset) }
    });
  } catch (error) {
    logger.error('Get messages error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/logs', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { limit = 100, offset = 0, agentType, level, startDate, endDate } = req.query;

    let logs;
    try {
      let query = 'SELECT * FROM agent_logs WHERE user_id = $1';
      const params = [userId];
      let paramIndex = 2;

      if (agentType) {
        query += ` AND agent_type = $${paramIndex++}`;
        params.push(agentType);
      }
      if (level) {
        query += ` AND level = $${paramIndex++}`;
        params.push(level);
      }
      if (startDate) {
        query += ` AND created_at >= $${paramIndex++}`;
        params.push(startDate);
      }
      if (endDate) {
        query += ` AND created_at <= $${paramIndex++}`;
        params.push(endDate);
      }

      query += ' ORDER BY created_at DESC LIMIT $' + paramIndex++ + ' OFFSET $' + paramIndex++;
      params.push(parseInt(limit), parseInt(offset));

      logs = await db.query(query, params);
    } catch (e) {
      logs = (db.getTable('agent_logs') || [])
        .filter(l => l.user_id === userId)
        .filter(l => !agentType || l.agent_type === agentType)
        .filter(l => !level || l.level === level)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    }

    res.json({ 
      success: true, 
      data: logs,
      pagination: { limit: parseInt(limit), offset: parseInt(offset) }
    });
  } catch (error) {
    logger.error('Get agent logs error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logs', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { agentType, level = 'info', message, metadata, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    const log = {
      user_id: userId,
      agent_type: agentType || null,
      level,
      message,
      metadata: metadata ? JSON.stringify(metadata) : null,
      session_id: sessionId || null,
      created_at: new Date().toISOString()
    };

    try {
      await db.insert('agent_logs', log);
    } catch (e) {
      if (!db.tables.agent_logs) db.tables.agent_logs = [];
      db.tables.agent_logs.push(log);
    }

    res.status(201).json({ success: true, message: 'Log entry created' });
  } catch (error) {
    logger.error('Create log error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.get('/metrics', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { period = '7d', agentType } = req.query;

    const now = Date.now();
    let since;
    switch (period) {
      case '24h': since = new Date(now - 24 * 60 * 60 * 1000); break;
      case '7d': since = new Date(now - 7 * 24 * 60 * 60 * 1000); break;
      case '30d': since = new Date(now - 30 * 24 * 60 * 60 * 1000); break;
      default: since = new Date(now - 7 * 24 * 60 * 60 * 1000);
    }

    let sessions = (db.getTable('chat_sessions') || [])
      .filter(s => s.user_id === userId)
      .filter(s => !agentType || s.agent_type === agentType);

    let messages = (db.getTable('chat_messages') || [])
      .filter(m => m.user_id === userId)
      .filter(m => !agentType || m.agent_type === agentType);

    const recentSessions = sessions.filter(s => new Date(s.created_at) >= since);
    const recentMessages = messages.filter(m => new Date(m.created_at) >= since);

    const metrics = {
      period,
      totalSessions: sessions.length,
      sessionsInPeriod: recentSessions.length,
      totalMessages: messages.length,
      messagesInPeriod: recentMessages.length,
      activeAgents: [...new Set(messages.map(m => m.agent_type).filter(Boolean))],
      messagesByRole: {
        user: recentMessages.filter(m => m.role === 'user').length,
        assistant: recentMessages.filter(m => m.role === 'assistant').length
      },
      averageMessagesPerSession: recentSessions.length > 0 
        ? Math.round(recentMessages.length / recentSessions.length) 
        : 0,
      sessionsByAgent: {},
      messagesByAgent: {}
    };

    AGENT_TYPES.forEach(type => {
      metrics.sessionsByAgent[type] = recentSessions.filter(s => s.agent_type === type).length;
      metrics.messagesByAgent[type] = recentMessages.filter(m => m.agent_type === type).length;
    });

    res.json({ success: true, data: metrics });
  } catch (error) {
    logger.error('Get metrics error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/health', async (req, res) => {
  try {
    const health = {
      orchestrator: orchestrator.ready ? 'healthy' : 'initializing',
      agents: [],
      timestamp: new Date().toISOString()
    };

    const agentEntries = Object.entries(orchestrator.AGENTS || {});
    health.agents = agentEntries.map(([id, agent]) => ({
      id,
      name: agent.name,
      status: agent.state || 'idle',
      ready: agent.ready !== false,
      version: agent.version || '1.0.0'
    }));

    const registryAgents = (db.getTable('agent_registry') || []);
    registryAgents.forEach(agent => {
      if (!health.agents.find(a => a.id === agent.id)) {
        health.agents.push({
          id: agent.id,
          name: agent.name,
          status: agent.status || 'idle',
          ready: agent.status === 'idle' || agent.status === 'active',
          version: agent.version
        });
      }
    });

    health.totalAgents = health.agents.length;
    health.healthyAgents = health.agents.filter(a => a.ready).length;

    res.json({ success: true, data: health });
  } catch (error) {
    logger.error('Health check error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:agentType/command', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { agentType } = req.params;
    const { command, params, sessionId } = req.body;

    if (!command) return res.status(400).json({ error: 'Command required' });

    const result = await orchestrator.executeCommand(agentType, command, { userId, params, sessionId });

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Agent command error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.get('/capabilities', async (req, res) => {
  try {
    const capabilities = {
      agentTypes: AGENT_TYPES,
      commonCapabilities: [
        'text_chat',
        'streaming_response',
        'context_awareness',
        'intent_recognition',
        'entity_extraction',
        'multi_language',
        'session_management',
        'message_history'
      ],
      agentSpecificCapabilities: {
        educational: ['curriculum_aligned', 'grade_level', 'assessment', 'progress_tracking'],
        storyteller: ['story_generation', 'character_creation', 'plot_continuation', 'themes'],
        translator: ['language_detection', 'real_time', 'context_translation', 'glossary'],
        support: ['faq_knowledge', 'ticket_creation', 'escalation', 'knowledge_base'],
        companion: ['emotional_support', 'daily_checkin', 'mood_tracking', 'reminders'],
        tutor: ['subject_matter', 'explanations', 'practice_problems', 'feedback']
      }
    };

    res.json({ success: true, data: capabilities });
  } catch (error) {
    logger.error('Get capabilities error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
