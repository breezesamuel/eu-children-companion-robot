const express = require('express');
const router = express.Router();
const db = require('../utils/database');
const logger = require('../utils/logger');
const orchestrator = require('../agents/orchestrator');

const TICKET_STATUSES = ['open', 'in_progress', 'pending_customer', 'resolved', 'closed', 'reopened'];
const TICKET_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const TICKET_CATEGORIES = ['technical', 'billing', 'account', 'product', 'education', 'robot', 'other'];
const SATISFACTION_RATINGS = [1, 2, 3, 4, 5];

router.get('/tickets', async (req, res) => {
  try {
    const userId = req.user?.userId;
    const isAdmin = req.user?.role === 'admin';
    
    if (!userId && !isAdmin) return res.status(401).json({ error: 'Unauthorized' });

    const { status, priority, category, assignee_id, limit = 50, offset = 0, search } = req.query;

    let tickets;
    try {
      let query = 'SELECT * FROM support_tickets WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (!isAdmin) {
        query += ` AND user_id = $${paramIndex++}`;
        params.push(userId);
      }

      if (status) {
        query += ` AND status = $${paramIndex++}`;
        params.push(status);
      }
      if (priority) {
        query += ` AND priority = $${paramIndex++}`;
        params.push(priority);
      }
      if (category) {
        query += ` AND category = $${paramIndex++}`;
        params.push(category);
      }
      if (assignee_id && isAdmin) {
        query += ` AND assignee_id = $${paramIndex++}`;
        params.push(assignee_id);
      }

      query += ' ORDER BY created_at DESC LIMIT $' + paramIndex++ + ' OFFSET $' + paramIndex++;
      params.push(parseInt(limit), parseInt(offset));

      tickets = await db.query(query, params);
    } catch (e) {
      tickets = (db.getTable('support_tickets') || [])
        .filter(t => isAdmin || t.user_id === userId)
        .filter(t => !status || t.status === status)
        .filter(t => !priority || t.priority === priority)
        .filter(t => !category || t.category === category)
        .filter(t => !assignee_id || !isAdmin || t.assignee_id == assignee_id)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    }

    const ticketsWithCounts = await Promise.all(tickets.map(async (ticket) => {
      let responseCount = 0;
      try {
        const result = await db.queryOne('SELECT COUNT(*) as count FROM support_ticket_responses WHERE ticket_id = $1', [ticket.id]);
        responseCount = result?.count || 0;
      } catch (e) {
        responseCount = (db.getTable('support_ticket_responses') || []).filter(r => r.ticket_id == ticket.id).length;
      }

      return {
        ...ticket,
        responseCount,
        lastResponseAt: ticket.updated_at || ticket.created_at
      };
    }));

    const summary = {
      total: ticketsWithCounts.length,
      byStatus: {},
      byPriority: {},
      byCategory: {}
    };

    TICKET_STATUSES.forEach(s => {
      summary.byStatus[s] = ticketsWithCounts.filter(t => t.status === s).length;
    });
    TICKET_PRIORITIES.forEach(p => {
      summary.byPriority[p] = ticketsWithCounts.filter(t => t.priority === p).length;
    });
    TICKET_CATEGORIES.forEach(c => {
      summary.byCategory[c] = ticketsWithCounts.filter(t => t.category === c).length;
    });

    res.json({
      success: true,
      data: ticketsWithCounts,
      summary,
      pagination: { limit: parseInt(limit), offset: parseInt(offset) }
    });
  } catch (error) {
    logger.error('Get tickets error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/tickets/:id', async (req, res) => {
  try {
    const userId = req.user?.userId;
    const isAdmin = req.user?.role === 'admin';

    if (!userId && !isAdmin) return res.status(401).json({ error: 'Unauthorized' });

    let ticket;
    try {
      ticket = await db.queryOne('SELECT * FROM support_tickets WHERE id = $1', [req.params.id]);
    } catch (e) {
      ticket = (db.getTable('support_tickets') || []).find(t => t.id == req.params.id);
    }

    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    if (!isAdmin && ticket.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let responses;
    try {
      responses = await db.query(
        `SELECT r.*, u.username, u.role as user_role
         FROM support_ticket_responses r
         LEFT JOIN users u ON r.user_id = u.id
         WHERE r.ticket_id = $1
         ORDER BY r.created_at ASC`,
        [ticket.id]
      );
    } catch (e) {
      responses = (db.getTable('support_ticket_responses') || [])
        .filter(r => r.ticket_id == ticket.id)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }

    let history;
    try {
      history = await db.query(
        `SELECT th.*, u.username
         FROM ticket_history th
         LEFT JOIN users u ON th.user_id = u.id
         WHERE th.ticket_id = $1
         ORDER BY th.created_at ASC`,
        [ticket.id]
      );
    } catch (e) {
      history = (db.getTable('ticket_history') || [])
        .filter(h => h.ticket_id == ticket.id)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }

    res.json({
      success: true,
      data: {
        ticket: {
          ...ticket,
          metadata: ticket.metadata ? JSON.parse(ticket.metadata) : {}
        },
        responses: responses.map(r => ({
          ...r,
          metadata: r.metadata ? JSON.parse(r.metadata) : {}
        })),
        history
      }
    });
  } catch (error) {
    logger.error('Get ticket error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/tickets', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { subject, message, priority = 'medium', category = 'general', robot_id, child_id, order_id, metadata } = req.body;

    if (!subject || !message) return res.status(400).json({ error: 'Subject and message required' });

    const ticket = {
      user_id: userId,
      subject,
      description: message,
      priority: TICKET_PRIORITIES.includes(priority) ? priority : 'medium',
      category: TICKET_CATEGORIES.includes(category) ? category : 'other',
      status: 'open',
      robot_id: robot_id || null,
      child_id: child_id || null,
      order_id: order_id || null,
      assignee_id: null,
      satisfaction_rating: null,
      satisfaction_comment: null,
      first_response_at: null,
      resolved_at: null,
      closed_at: null,
      metadata: metadata ? JSON.stringify(metadata) : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let result;
    try {
      result = await db.insert('support_tickets', ticket);
    } catch (e) {
      if (!db.tables.support_tickets) db.tables.support_tickets = [];
      if (!db.ids) db.ids = {};
      const newId = (db.ids.support_tickets || 0) + 1;
      db.ids.support_tickets = newId;
      result = { insertId: newId };
      db.tables.support_tickets.push({ id: newId, ...ticket });
    }

    const aiReply = await orchestrator.handleMessage(userId, `[Support Ticket] ${subject}: ${message}`, null, 'support');
    
    const response = {
      id: result.insertId,
      ticket,
      aiSuggestion: aiReply.reply
    };

    const initialResponse = {
      ticket_id: result.insertId,
      user_id: 0,
      content: aiReply.reply,
      is_ai: true,
      is_internal: false,
      created_at: new Date().toISOString()
    };

    try {
      await db.insert('support_ticket_responses', initialResponse);
    } catch (e) {
      if (!db.tables.support_ticket_responses) db.tables.support_ticket_responses = [];
      db.tables.support_ticket_responses.push(initialResponse);
    }

    await addTicketHistory(result.insertId, 'created', userId, {
      status: 'open',
      priority: ticket.priority,
      category: ticket.category
    });

    res.status(201).json({ success: true, data: response });
  } catch (error) {
    logger.error('Ticket creation error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.put('/tickets/:id', async (req, res) => {
  try {
    const userId = req.user?.userId;
    const isAdmin = req.user?.role === 'admin';

    if (!userId && !isAdmin) return res.status(401).json({ error: 'Unauthorized' });

    const { status, priority, category, assignee_id, metadata } = req.body;

    let ticket;
    try {
      ticket = await db.queryOne('SELECT * FROM support_tickets WHERE id = $1', [req.params.id]);
    } catch (e) {
      ticket = (db.getTable('support_tickets') || []).find(t => t.id == req.params.id);
    }

    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    if (!isAdmin && ticket.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updates = { updated_at: new Date().toISOString() };
    const oldValues = {};

    if (status && TICKET_STATUSES.includes(status) && (isAdmin || ['closed'].includes(status))) {
      oldValues.status = ticket.status;
      updates.status = status;
      
      if (status === 'resolved' && ticket.status !== 'resolved') {
        updates.resolved_at = new Date().toISOString();
      }
      if (status === 'closed' && ticket.status !== 'closed') {
        updates.closed_at = new Date().toISOString();
      }
    }

    if (isAdmin && priority && TICKET_PRIORITIES.includes(priority)) {
      oldValues.priority = ticket.priority;
      updates.priority = priority;
    }

    if (isAdmin && category && TICKET_CATEGORIES.includes(category)) {
      oldValues.category = ticket.category;
      updates.category = category;
    }

    if (isAdmin && assignee_id !== undefined) {
      oldValues.assignee_id = ticket.assignee_id;
      updates.assignee_id = assignee_id;
    }

    if (metadata) {
      updates.metadata = JSON.stringify({
        ...(ticket.metadata ? JSON.parse(ticket.metadata) : {}),
        ...metadata
      });
    }

    try {
      await db.update('support_tickets', updates, { id: ticket.id });
    } catch (e) {
      const idx = (db.tables.support_tickets || []).findIndex(t => t.id == ticket.id);
      if (idx >= 0) {
        db.tables.support_tickets[idx] = { ...db.tables.support_tickets[idx], ...updates };
      }
    }

    if (Object.keys(oldValues).length > 0) {
      await addTicketHistory(ticket.id, 'updated', userId, {
        oldValues,
        newValues: updates
      });
    }

    res.json({ success: true, message: 'Ticket updated', data: updates });
  } catch (error) {
    logger.error('Update ticket error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.post('/tickets/:id/reply', async (req, res) => {
  try {
    const userId = req.user?.userId;
    const isAdmin = req.user?.role === 'admin';

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { message, is_internal = false, attachments } = req.body;

    if (!message) return res.status(400).json({ error: 'Message required' });

    let ticket;
    try {
      ticket = await db.queryOne('SELECT * FROM support_tickets WHERE id = $1', [req.params.id]);
    } catch (e) {
      ticket = (db.getTable('support_tickets') || []).find(t => t.id == req.params.id);
    }

    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    if (!isAdmin && ticket.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const response = {
      ticket_id: ticket.id,
      user_id: userId,
      content: message,
      is_ai: false,
      is_internal: is_internal && isAdmin,
      attachments: attachments ? JSON.stringify(attachments) : null,
      created_at: new Date().toISOString()
    };

    try {
      await db.insert('support_ticket_responses', response);
    } catch (e) {
      if (!db.tables.support_ticket_responses) db.tables.support_ticket_responses = [];
      db.tables.support_ticket_responses.push(response);
    }

    const ticketUpdates = { updated_at: new Date().toISOString() };

    if (ticket.first_response_at === null && isAdmin) {
      ticketUpdates.first_response_at = new Date().toISOString();
    }

    if (isAdmin && ticket.status === 'open') {
      ticketUpdates.status = 'in_progress';
    }

    if (isAdmin && ticket.status === 'pending_customer') {
      ticketUpdates.status = 'in_progress';
    }

    if (!isAdmin && (ticket.status === 'in_progress' || ticket.status === 'pending_customer')) {
      ticketUpdates.status = 'in_progress';
    }

    try {
      await db.update('support_tickets', ticketUpdates, { id: ticket.id });
    } catch (e) {
      const idx = (db.tables.support_tickets || []).findIndex(t => t.id == ticket.id);
      if (idx >= 0) {
        db.tables.support_tickets[idx] = { ...db.tables.support_tickets[idx], ...ticketUpdates };
      }
    }

    await addTicketHistory(ticket.id, 'response_added', userId, {
      is_internal: response.is_internal,
      messageLength: message.length
    });

    res.json({ success: true, message: 'Reply added', data: response });
  } catch (error) {
    logger.error('Ticket reply error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/tickets/:id/assign', async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

    const { assignee_id } = req.body;
    const userId = req.user.userId;

    let ticket;
    try {
      ticket = await db.queryOne('SELECT * FROM support_tickets WHERE id = $1', [req.params.id]);
    } catch (e) {
      ticket = (db.getTable('support_tickets') || []).find(t => t.id == req.params.id);
    }

    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const oldAssignee = ticket.assignee_id;

    try {
      await db.run(
        'UPDATE support_tickets SET assignee_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [assignee_id, ticket.id]
      );
    } catch (e) {
      const idx = (db.tables.support_tickets || []).findIndex(t => t.id == ticket.id);
      if (idx >= 0) {
        db.tables.support_tickets[idx].assignee_id = assignee_id;
        db.tables.support_tickets[idx].updated_at = new Date().toISOString();
      }
    }

    await addTicketHistory(ticket.id, 'assigned', userId, {
      from: oldAssignee,
      to: assignee_id
    });

    res.json({
      success: true,
      message: 'Ticket assigned',
      data: { ticketId: ticket.id, assigneeId: assignee_id, oldAssigneeId: oldAssignee }
    });
  } catch (error) {
    logger.error('Assign ticket error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.post('/tickets/:id/escalate', async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

    const { reason, escalate_to } = req.body;
    const userId = req.user.userId;

    let ticket;
    try {
      ticket = await db.queryOne('SELECT * FROM support_tickets WHERE id = $1', [req.params.id]);
    } catch (e) {
      ticket = (db.getTable('support_tickets') || []).find(t => t.id == req.params.id);
    }

    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const newPriority = ticket.priority === 'urgent' ? 'urgent' : 
                        ticket.priority === 'high' ? 'urgent' : 'high';

    try {
      await db.run(
        'UPDATE support_tickets SET priority = $1, escalated = true, escalated_at = CURRENT_TIMESTAMP, escalation_reason = $2, escalated_to = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4',
        [newPriority, reason || null, escalate_to || null, ticket.id]
      );
    } catch (e) {
      const idx = (db.tables.support_tickets || []).findIndex(t => t.id == ticket.id);
      if (idx >= 0) {
        db.tables.support_tickets[idx].priority = newPriority;
        db.tables.support_tickets[idx].escalated = true;
        db.tables.support_tickets[idx].escalated_at = new Date().toISOString();
        db.tables.support_tickets[idx].escalation_reason = reason || null;
        db.tables.support_tickets[idx].escalated_to = escalate_to || null;
        db.tables.support_tickets[idx].updated_at = new Date().toISOString();
      }
    }

    await addTicketHistory(ticket.id, 'escalated', userId, {
      oldPriority: ticket.priority,
      newPriority,
      reason,
      escalate_to
    });

    res.json({
      success: true,
      message: 'Ticket escalated',
      data: { ticketId: ticket.id, newPriority, reason }
    });
  } catch (error) {
    logger.error('Escalate ticket error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.post('/tickets/:id/satisfaction', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { rating, comment } = req.body;

    if (rating === undefined || !SATISFACTION_RATINGS.includes(rating)) {
      return res.status(400).json({ error: `Invalid rating. Must be one of: ${SATISFACTION_RATINGS.join(', ')}` });
    }

    let ticket;
    try {
      ticket = await db.queryOne('SELECT * FROM support_tickets WHERE id = $1', [req.params.id]);
    } catch (e) {
      ticket = (db.getTable('support_tickets') || []).find(t => t.id == req.params.id);
    }

    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    if (ticket.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (ticket.status !== 'resolved' && ticket.status !== 'closed') {
      return res.status(400).json({ error: 'Can only rate resolved or closed tickets' });
    }

    try {
      await db.run(
        'UPDATE support_tickets SET satisfaction_rating = $1, satisfaction_comment = $2, satisfaction_rated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [rating, comment || null, ticket.id]
      );
    } catch (e) {
      const idx = (db.tables.support_tickets || []).findIndex(t => t.id == ticket.id);
      if (idx >= 0) {
        db.tables.support_tickets[idx].satisfaction_rating = rating;
        db.tables.support_tickets[idx].satisfaction_comment = comment || null;
        db.tables.support_tickets[idx].satisfaction_rated_at = new Date().toISOString();
        db.tables.support_tickets[idx].updated_at = new Date().toISOString();
      }
    }

    await addTicketHistory(ticket.id, 'satisfaction_rated', userId, {
      rating,
      comment: comment || null
    });

    res.json({
      success: true,
      message: 'Satisfaction recorded',
      data: { rating, comment }
    });
  } catch (error) {
    logger.error('Satisfaction rating error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.get('/knowledge-base', async (req, res) => {
  try {
    const { category, limit = 50, offset = 0, search, published_only = true } = req.query;

    let articles;
    try {
      let query = 'SELECT * FROM kb_articles WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (published_only !== 'false') {
        query += ` AND published = $${paramIndex++}`;
        params.push(true);
      }

      if (category) {
        query += ` AND category = $${paramIndex++}`;
        params.push(category);
      }

      query += ' ORDER BY sort_order ASC, view_count DESC, created_at DESC LIMIT $' + paramIndex++ + ' OFFSET $' + paramIndex++;
      params.push(parseInt(limit), parseInt(offset));

      articles = await db.query(query, params);
    } catch (e) {
      articles = (db.getTable('kb_articles') || [])
        .filter(a => published_only !== 'false' ? a.published : true)
        .filter(a => !category || a.category === category)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || (b.view_count || 0) - (a.view_count || 0))
        .slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    }

    const categories = [...new Set(articles.map(a => a.category).filter(Boolean))];

    res.json({
      success: true,
      data: articles.map(a => ({
        ...a,
        tags: a.tags ? JSON.parse(a.tags) : [],
        related_articles: a.related_articles ? JSON.parse(a.related_articles) : []
      })),
      categories,
      pagination: { limit: parseInt(limit), offset: parseInt(offset) }
    });
  } catch (error) {
    logger.error('Knowledge base error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/knowledge-base/:id', async (req, res) => {
  try {
    let article;
    try {
      article = await db.queryOne('SELECT * FROM kb_articles WHERE id = $1 OR slug = $1', [req.params.id]);
    } catch (e) {
      article = (db.getTable('kb_articles') || []).find(a => a.id == req.params.id || a.slug === req.params.id);
    }

    if (!article) return res.status(404).json({ error: 'Article not found' });

    try {
      await db.run('UPDATE kb_articles SET view_count = COALESCE(view_count, 0) + 1 WHERE id = $1', [article.id]);
    } catch (e) {
      const idx = (db.tables.kb_articles || []).findIndex(a => a.id === article.id);
      if (idx >= 0) {
        db.tables.kb_articles[idx].view_count = (db.tables.kb_articles[idx].view_count || 0) + 1;
      }
    }

    let related = [];
    if (article.related_articles) {
      try {
        related = await db.query('SELECT id, title, slug, category FROM kb_articles WHERE id = ANY($1)', [JSON.parse(article.related_articles)]);
      } catch (e) {
        const relatedIds = JSON.parse(article.related_articles);
        const allArticles = db.getTable('kb_articles') || [];
        related = allArticles.filter(a => relatedIds.includes(a.id)).map(a => ({
          id: a.id,
          title: a.title,
          slug: a.slug,
          category: a.category
        }));
      }
    }

    res.json({
      success: true,
      data: {
        ...article,
        tags: article.tags ? JSON.parse(article.tags) : [],
        related_articles: related
      }
    });
  } catch (error) {
    logger.error('Get KB article error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/faqs', async (req, res) => {
  try {
    const { category, limit = 100, offset = 0 } = req.query;

    let faqs;
    try {
      let query = 'SELECT * FROM faqs WHERE active = true';
      const params = [];
      let paramIndex = 1;

      if (category) {
        query += ` AND category = $${paramIndex++}`;
        params.push(category);
      }

      query += ' ORDER BY sort_order ASC, created_at DESC LIMIT $' + paramIndex++ + ' OFFSET $' + paramIndex++;
      params.push(parseInt(limit), parseInt(offset));

      faqs = await db.query(query, params);
    } catch (e) {
      faqs = (db.getTable('faqs') || [])
        .filter(f => f.active !== false)
        .filter(f => !category || f.category === category)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        .slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    }

    const categories = [...new Set(faqs.map(f => f.category).filter(Boolean))];

    res.json({
      success: true,
      data: faqs,
      categories,
      pagination: { limit: parseInt(limit), offset: parseInt(offset) }
    });
  } catch (error) {
    logger.error('FAQs error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/analytics', async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

    const tickets = db.getTable('support_tickets') || [];
    const responses = db.getTable('support_ticket_responses') || [];
    const now = Date.now();
    const last30d = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const recentTickets = tickets.filter(t => new Date(t.created_at) >= last30d);
    const ratedTickets = tickets.filter(t => t.satisfaction_rating !== null);

    const analytics = {
      summary: {
        total: tickets.length,
        open: tickets.filter(t => t.status === 'open').length,
        in_progress: tickets.filter(t => t.status === 'in_progress').length,
        pending_customer: tickets.filter(t => t.status === 'pending_customer').length,
        resolved: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
        escalated: tickets.filter(t => t.escalated).length
      },
      byPriority: {},
      byCategory: {},
      byStatus: {},
      satisfaction: {
        totalRated: ratedTickets.length,
        averageRating: ratedTickets.length > 0
          ? (ratedTickets.reduce((sum, t) => sum + (t.satisfaction_rating || 0), 0) / ratedTickets.length).toFixed(1)
          : null,
        distribution: {}
      },
      recentActivity: {
        last30d: {
          created: recentTickets.length,
          resolved: recentTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length
        }
      },
      responseTimes: {
        firstResponse: calculateAverageFirstResponse(tickets),
        resolutionTime: calculateAverageResolution(tickets)
      }
    };

    TICKET_PRIORITIES.forEach(p => {
      analytics.byPriority[p] = tickets.filter(t => t.priority === p).length;
    });

    TICKET_CATEGORIES.forEach(c => {
      analytics.byCategory[c] = tickets.filter(t => t.category === c).length;
    });

    TICKET_STATUSES.forEach(s => {
      analytics.byStatus[s] = tickets.filter(t => t.status === s).length;
    });

    SATISFACTION_RATINGS.forEach(r => {
      analytics.satisfaction.distribution[r] = ratedTickets.filter(t => t.satisfaction_rating === r).length;
    });

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Support analytics error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/live-chat/status', async (req, res) => {
  try {
    const userId = req.user?.userId;
    const isAdmin = req.user?.role === 'admin';

    if (!userId && !isAdmin) return res.status(401).json({ error: 'Unauthorized' });

    let sessions;
    if (isAdmin) {
      sessions = (db.getTable('chat_support_sessions') || []);
    } else {
      sessions = (db.getTable('chat_support_sessions') || []).filter(s => s.user_id === userId);
    }

    const activeSessions = sessions.filter(s => s.status === 'active');

    res.json({
      success: true,
      data: {
        available: isAdmin || activeSessions.length > 0,
        queueLength: isAdmin ? activeSessions.length : 0,
        estimatedWaitTime: activeSessions.length > 5 ? '5-10 minutes' : '1-2 minutes',
        activeSessions: activeSessions.length
      },
      features: ['text_chat', 'file_sharing', 'screen_sharing', 'ai_assistant']
    });
  } catch (error) {
    logger.error('Live chat status error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      ticketStatuses: TICKET_STATUSES,
      ticketPriorities: TICKET_PRIORITIES,
      ticketCategories: TICKET_CATEGORIES,
      satisfactionRatings: SATISFACTION_RATINGS,
      features: [
        'ticket_creation',
        'ticket_tracking',
        'ai_support',
        'knowledge_base',
        'faqs',
        'live_chat',
        'satisfaction_surveys',
        'escalation_rules'
      ]
    }
  });
});

async function addTicketHistory(ticketId, event, userId, details = {}) {
  const history = {
    ticket_id: ticketId,
    user_id: userId,
    event,
    details: Object.keys(details).length > 0 ? JSON.stringify(details) : null,
    created_at: new Date().toISOString()
  };

  try {
    await db.insert('ticket_history', history);
  } catch (e) {
    if (!db.tables.ticket_history) db.tables.ticket_history = [];
    db.tables.ticket_history.push(history);
  }
}

function calculateAverageFirstResponse(tickets) {
  const withFirstResponse = tickets.filter(t => t.first_response_at);
  if (withFirstResponse.length === 0) return null;

  const totalMinutes = withFirstResponse.reduce((sum, t) => {
    const diff = new Date(t.first_response_at) - new Date(t.created_at);
    return sum + (diff / (1000 * 60));
  }, 0);

  return Math.round(totalMinutes / withFirstResponse.length);
}

function calculateAverageResolution(tickets) {
  const withResolution = tickets.filter(t => t.resolved_at);
  if (withResolution.length === 0) return null;

  const totalHours = withResolution.reduce((sum, t) => {
    const diff = new Date(t.resolved_at) - new Date(t.created_at);
    return sum + (diff / (1000 * 60 * 60));
  }, 0);

  return Math.round(totalHours / withResolution.length);
}

module.exports = router;
