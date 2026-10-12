const express = require('express');
const router = express.Router();
const db = require('../../utils/database');
const logger = require('../../utils/logger');

const DATE_FORMATS = {
  daily: 'YYYY-MM-DD',
  weekly: 'YYYY-WW',
  monthly: 'YYYY-MM'
};

router.get('/dashboard', async (req, res) => {
  try {
    const { period = '30d' } = req.query;

    const users = db.getTable('users') || [];
    const children = db.getTable('children') || [];
    const orders = db.getTable('orders') || [];
    const subscriptions = db.getTable('user_subscriptions') || [];
    const tickets = db.getTable('support_tickets') || [];
    const robots = db.getTable('robots') || [];
    const chatSessions = db.getTable('chat_sessions') || [];

    const now = new Date();
    let since;
    switch (period) {
      case '7d': since = new Date(now - 7 * 24 * 60 * 60 * 1000); break;
      case '30d': since = new Date(now - 30 * 24 * 60 * 60 * 1000); break;
      case '90d': since = new Date(now - 90 * 24 * 60 * 60 * 1000); break;
      case '365d': since = new Date(now - 365 * 24 * 60 * 60 * 1000); break;
      default: since = new Date(now - 30 * 24 * 60 * 60 * 1000);
    }

    const completedOrders = orders.filter(o => o.status === 'completed' || o.status === 'paid' || o.status === 'delivered');
    const activeSubscriptions = subscriptions.filter(s => s.status === 'active' || s.status === 'trialing');
    const recentUsers = users.filter(u => new Date(u.created_at) >= since);
    const recentOrders = orders.filter(o => new Date(o.created_at) >= since);
    const recentCompletedOrders = completedOrders.filter(o => new Date(o.created_at) >= since);

    const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.amount_total || 0), 0);
    const recentRevenue = recentCompletedOrders.reduce((sum, o) => sum + (o.amount_total || 0), 0);

    const analytics = {
      summary: {
        totalUsers: users.length,
        totalChildren: children.length,
        totalOrders: orders.length,
        totalRevenue,
        activeSubscriptions: activeSubscriptions.length,
        totalRobots: robots.length,
        openTickets: tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length,
        totalChatSessions: chatSessions.length
      },
      periodMetrics: {
        period,
        since: since.toISOString(),
        until: now.toISOString(),
        newUsers: recentUsers.length,
        newOrders: recentOrders.length,
        revenue: recentRevenue,
        averageOrderValue: recentCompletedOrders.length > 0
          ? Math.round(recentRevenue / recentCompletedOrders.length)
          : 0
      },
      conversion: {
        conversionRate: users.length > 0 ? ((completedOrders.length / users.length) * 100).toFixed(1) : '0.0',
        trialToPaidRate: subscriptions.filter(s => s.status === 'active').length > 0 && subscriptions.filter(s => s.status === 'trialing').length > 0
          ? ((subscriptions.filter(s => s.status === 'active').length / (subscriptions.filter(s => s.status === 'active').length + subscriptions.filter(s => s.status === 'trialing').length)) * 100).toFixed(1)
          : '0.0'
      },
      orders: {
        byStatus: aggregateByField(orders, 'status'),
        byCurrency: aggregateByField(completedOrders, 'currency'),
        recentOrders: orders
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 20)
          .map(o => ({
            ...o,
            items: o.items ? (typeof o.items === 'string' ? JSON.parse(o.items) : o.items) : []
          })),
        revenueByMonth: aggregateByMonth(completedOrders)
      },
      subscriptions: {
        byStatus: aggregateByField(subscriptions, 'status'),
        total: subscriptions.length,
        active: subscriptions.filter(s => s.status === 'active').length,
        trialing: subscriptions.filter(s => s.status === 'trialing').length,
        pastDue: subscriptions.filter(s => s.status === 'past_due').length,
        canceled: subscriptions.filter(s => s.status === 'canceled').length,
        mrr: calculateMRR(subscriptions),
        list: subscriptions.slice(0, 50)
      },
      users: {
        byRole: aggregateByField(users, 'role'),
        byStatus: aggregateByField(users, 'status'),
        recentRegistrations: recentUsers
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 20)
      },
      support: {
        total: tickets.length,
        open: tickets.filter(t => t.status === 'open').length,
        inProgress: tickets.filter(t => t.status === 'in_progress').length,
        pendingCustomer: tickets.filter(t => t.status === 'pending_customer').length,
        resolved: tickets.filter(t => t.status === 'resolved').length,
        closed: tickets.filter(t => t.status === 'closed').length,
        byPriority: aggregateByField(tickets, 'priority'),
        byCategory: aggregateByField(tickets, 'category'),
        satisfaction: {
          rated: tickets.filter(t => t.satisfaction_rating !== null).length,
          averageRating: calculateAverageRating(tickets),
          distribution: {
            1: tickets.filter(t => t.satisfaction_rating === 1).length,
            2: tickets.filter(t => t.satisfaction_rating === 2).length,
            3: tickets.filter(t => t.satisfaction_rating === 3).length,
            4: tickets.filter(t => t.satisfaction_rating === 4).length,
            5: tickets.filter(t => t.satisfaction_rating === 5).length
          }
        },
        recent: tickets
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 10)
      },
      robots: {
        total: robots.length,
        byStatus: aggregateByField(robots, 'status'),
        online: robots.filter(r => r.status === 'online').length,
        offline: robots.filter(r => r.status === 'offline').length,
        charging: robots.filter(r => r.status === 'charging').length,
        error: robots.filter(r => r.status === 'error').length,
        avgBattery: calculateAverageBattery(robots)
      },
      engagement: {
        chatSessions: chatSessions.length,
        messages: (db.getTable('chat_messages') || []).length,
        activeChatsToday: chatSessions.filter(s => {
          const updated = new Date(s.updated_at);
          const today = new Date();
          return updated.toDateString() === today.toDateString();
        }).length,
        weeklyActiveUsers: calculateWeeklyActiveUsers(users, chatSessions)
      },
      trends: {
        userGrowth: calculateUserGrowth(users, since),
        revenueTrend: calculateRevenueTrend(completedOrders, since),
        subscriptionTrend: calculateSubscriptionTrend(subscriptions, since)
      }
    };

    res.json({ success: true, data: analytics });
  } catch (error) {
    logger.error('Analytics dashboard error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/revenue', async (req, res) => {
  try {
    const { currency, period = '30d', groupBy = 'day' } = req.query;

    const orders = db.getTable('orders') || [];
    const subscriptions = db.getTable('user_subscriptions') || [];

    const now = new Date();
    let since;
    switch (period) {
      case '7d': since = new Date(now - 7 * 24 * 60 * 60 * 1000); break;
      case '30d': since = new Date(now - 30 * 24 * 60 * 60 * 1000); break;
      case '90d': since = new Date(now - 90 * 24 * 60 * 60 * 1000); break;
      case '365d': since = new Date(now - 365 * 24 * 60 * 60 * 1000); break;
      default: since = new Date(now - 30 * 24 * 60 * 60 * 1000);
    }

    const completedOrders = orders.filter(o =>
      (o.status === 'completed' || o.status === 'paid' || o.status === 'delivered') &&
      new Date(o.created_at) >= since &&
      (!currency || o.currency === currency)
    );

    const revenue = calculateRevenueBreakdown(completedOrders, groupBy, since);

    const summary = {
      totalRevenue: completedOrders.reduce((sum, o) => sum + (o.amount_total || 0), 0),
      totalOrders: completedOrders.length,
      averageOrderValue: completedOrders.length > 0
        ? Math.round(completedOrders.reduce((sum, o) => sum + (o.amount_total || 0), 0) / completedOrders.length)
        : 0,
      byCurrency: aggregateByField(completedOrders, 'currency'),
      recentOrders: completedOrders
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 20)
        .map(o => ({
          ...o,
          items: o.items ? (typeof o.items === 'string' ? JSON.parse(o.items) : o.items) : []
        }))
    };

    res.json({
      success: true,
      data: {
        summary,
        revenue,
        period,
        groupBy
      }
    });
  } catch (error) {
    logger.error('Revenue analytics error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const { role, status, period = '30d' } = req.query;

    const users = db.getTable('users') || [];
    const children = db.getTable('children') || [];
    const orders = db.getTable('orders') || [];
    const subscriptions = db.getTable('user_subscriptions') || [];

    const now = new Date();
    let since;
    switch (period) {
      case '7d': since = new Date(now - 7 * 24 * 60 * 60 * 1000); break;
      case '30d': since = new Date(now - 30 * 24 * 60 * 60 * 1000); break;
      case '90d': since = new Date(now - 90 * 24 * 60 * 60 * 1000); break;
      default: since = new Date(now - 30 * 24 * 60 * 60 * 1000);
    }

    let filteredUsers = users;
    if (role) filteredUsers = filteredUsers.filter(u => u.role === role);
    if (status) filteredUsers = filteredUsers.filter(u => u.status === status);

    const usersWithStats = filteredUsers.map(u => ({
      ...u,
      childrenCount: children.filter(c => c.parent_id === u.id).length,
      orderCount: orders.filter(o => o.user_id === u.id).length,
      totalSpent: orders.filter(o => o.user_id === u.id && (o.status === 'completed' || o.status === 'paid' || o.status === 'delivered'))
        .reduce((sum, o) => sum + (o.amount_total || 0), 0),
      subscriptionStatus: subscriptions.find(s => s.user_id === u.id)?.status || 'none',
      lastLoginAt: u.last_login_at,
      createdAt: u.created_at
    }));

    const summary = {
      total: users.length,
      filtered: filteredUsers.length,
      byRole: aggregateByField(users, 'role'),
      byStatus: aggregateByField(users, 'status'),
      newUsersInPeriod: users.filter(u => new Date(u.created_at) >= since).length,
      activeUsers: users.filter(u => u.status === 'active').length,
      parents: users.filter(u => u.role === 'parent').length,
      admins: users.filter(u => u.role === 'admin').length,
      withChildren: users.filter(u => children.some(c => c.parent_id === u.id)).length
    };

    const growth = calculateUserGrowth(users, since);

    res.json({
      success: true,
      data: {
        summary,
        users: usersWithStats.slice(0, 100),
        growth,
        period
      }
    });
  } catch (error) {
    logger.error('User analytics error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/subscriptions', async (req, res) => {
  try {
    const { status, period = '30d' } = req.query;

    const subscriptions = db.getTable('user_subscriptions') || [];
    const plans = db.getTable('subscription_plans') || [];

    const now = new Date();
    let since;
    switch (period) {
      case '7d': since = new Date(now - 7 * 24 * 60 * 60 * 1000); break;
      case '30d': since = new Date(now - 30 * 24 * 60 * 60 * 1000); break;
      case '90d': since = new Date(now - 90 * 24 * 60 * 60 * 1000); break;
      default: since = new Date(now - 30 * 24 * 60 * 60 * 1000);
    }

    let filteredSubs = subscriptions;
    if (status) filteredSubs = filteredSubs.filter(s => s.status === status);

    const byPlan = {};
    plans.forEach(plan => {
      const planSubs = subscriptions.filter(s => s.plan_id == plan.id);
      byPlan[plan.name || plan.id] = {
        planId: plan.id,
        planName: plan.name,
        price: plan.price,
        total: planSubs.length,
        active: planSubs.filter(s => s.status === 'active').length,
        trialing: planSubs.filter(s => s.status === 'trialing').length,
        mrr: calculatePlanMRR(planSubs, plan)
      };
    });

    const newSubsInPeriod = subscriptions.filter(s => new Date(s.created_at) >= since);
    const canceledInPeriod = subscriptions.filter(s => s.canceled_at && new Date(s.canceled_at) >= since);

    const summary = {
      total: subscriptions.length,
      active: subscriptions.filter(s => s.status === 'active').length,
      trialing: subscriptions.filter(s => s.status === 'trialing').length,
      pastDue: subscriptions.filter(s => s.status === 'past_due').length,
      canceled: subscriptions.filter(s => s.status === 'canceled').length,
      pendingCancellation: subscriptions.filter(s => s.cancel_at_period_end).length,
      mrr: calculateMRR(subscriptions),
      newInPeriod: newSubsInPeriod.length,
      canceledInPeriod: canceledInPeriod.length,
      churnRate: subscriptions.filter(s => s.status === 'active' || s.status === 'trialing').length > 0
        ? ((canceledInPeriod.length / (subscriptions.filter(s => s.status === 'active' || s.status === 'trialing').length + canceledInPeriod.length)) * 100).toFixed(1)
        : '0.0'
    };

    const trend = calculateSubscriptionTrend(subscriptions, since);

    res.json({
      success: true,
      data: {
        summary,
        byPlan,
        list: filteredSubs.slice(0, 100),
        trend,
        period
      }
    });
  } catch (error) {
    logger.error('Subscription analytics error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/support', async (req, res) => {
  try {
    const { status, priority, period = '30d' } = req.query;

    const tickets = db.getTable('support_tickets') || [];
    const responses = db.getTable('support_ticket_responses') || [];

    const now = new Date();
    let since;
    switch (period) {
      case '7d': since = new Date(now - 7 * 24 * 60 * 60 * 1000); break;
      case '30d': since = new Date(now - 30 * 24 * 60 * 60 * 1000); break;
      case '90d': since = new Date(now - 90 * 24 * 60 * 60 * 1000); break;
      default: since = new Date(now - 30 * 24 * 60 * 60 * 1000);
    }

    let filteredTickets = tickets;
    if (status) filteredTickets = filteredTickets.filter(t => t.status === status);
    if (priority) filteredTickets = filteredTickets.filter(t => t.priority === priority);

    const periodTickets = tickets.filter(t => new Date(t.created_at) >= since);

    const summary = {
      total: tickets.length,
      open: tickets.filter(t => t.status === 'open').length,
      inProgress: tickets.filter(t => t.status === 'in_progress').length,
      pendingCustomer: tickets.filter(t => t.status === 'pending_customer').length,
      resolved: tickets.filter(t => t.status === 'resolved').length,
      closed: tickets.filter(t => t.status === 'closed').length,
      byPriority: aggregateByField(tickets, 'priority'),
      byCategory: aggregateByField(tickets, 'category'),
      averageResponseTime: calculateAverageResponseTime(tickets, responses),
      averageResolutionTime: calculateAverageResolutionTime(tickets),
      newInPeriod: periodTickets.length,
      resolvedInPeriod: periodTickets.filter(t => t.resolved_at && new Date(t.resolved_at) >= since).length
    };

    const satisfaction = {
      rated: tickets.filter(t => t.satisfaction_rating !== null).length,
      averageRating: calculateAverageRating(tickets),
      distribution: {
        1: tickets.filter(t => t.satisfaction_rating === 1).length,
        2: tickets.filter(t => t.satisfaction_rating === 2).length,
        3: tickets.filter(t => t.satisfaction_rating === 3).length,
        4: tickets.filter(t => t.satisfaction_rating === 4).length,
        5: tickets.filter(t => t.satisfaction_rating === 5).length
      }
    };

    const recent = tickets
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 20);

    res.json({
      success: true,
      data: {
        summary,
        satisfaction,
        recent,
        period
      }
    });
  } catch (error) {
    logger.error('Support analytics error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/engagement', async (req, res) => {
  try {
    const { period = '30d' } = req.query;

    const users = db.getTable('users') || [];
    const chatSessions = db.getTable('chat_sessions') || [];
    const chatMessages = db.getTable('chat_messages') || [];
    const robots = db.getTable('robots') || [];

    const now = new Date();
    let since;
    switch (period) {
      case '7d': since = new Date(now - 7 * 24 * 60 * 60 * 1000); break;
      case '30d': since = new Date(now - 30 * 24 * 60 * 60 * 1000); break;
      case '90d': since = new Date(now - 90 * 24 * 60 * 60 * 1000); break;
      default: since = new Date(now - 30 * 24 * 60 * 60 * 1000);
    }

    const periodSessions = chatSessions.filter(s => new Date(s.created_at) >= since);
    const periodMessages = chatMessages.filter(m => new Date(m.created_at) >= since);

    const summary = {
      totalChatSessions: chatSessions.length,
      totalMessages: chatMessages.length,
      sessionsInPeriod: periodSessions.length,
      messagesInPeriod: periodMessages.length,
      avgMessagesPerSession: periodSessions.length > 0
        ? Math.round(periodMessages.length / periodSessions.length)
        : 0,
      activeUsersInPeriod: [...new Set(periodSessions.map(s => s.user_id))].length,
      uniqueUsers: [...new Set(chatSessions.map(s => s.user_id))].length,
      sessionsByAgent: aggregateByField(chatSessions, 'agent_type'),
      activeRobots: robots.filter(r => r.status === 'online').length,
      robotInteractions: calculateRobotInteractions(robots, period)
    };

    const dailyTrend = calculateEngagementTrend(chatSessions, chatMessages, since);

    const byAgeGroup = calculateEngagementByAge(chatSessions, users);

    res.json({
      success: true,
      data: {
        summary,
        dailyTrend,
        byAgeGroup,
        period
      }
    });
  } catch (error) {
    logger.error('Engagement analytics error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/robots', async (req, res) => {
  try {
    const { period = '30d' } = req.query;

    const robots = db.getTable('robots') || [];
    const metrics = db.getTable('robot_metrics') || [];

    const now = new Date();
    let since;
    switch (period) {
      case '7d': since = new Date(now - 7 * 24 * 60 * 60 * 1000); break;
      case '30d': since = new Date(now - 30 * 24 * 60 * 60 * 1000); break;
      default: since = new Date(now - 30 * 24 * 60 * 60 * 1000);
    }

    const periodMetrics = metrics.filter(m => new Date(m.recorded_at) >= since);

    const summary = {
      total: robots.length,
      byStatus: aggregateByField(robots, 'status'),
      online: robots.filter(r => r.status === 'online').length,
      offline: robots.filter(r => r.status === 'offline').length,
      sleeping: robots.filter(r => r.status === 'sleeping').length,
      charging: robots.filter(r => r.status === 'charging').length,
      error: robots.filter(r => r.status === 'error').length,
      avgBatteryLevel: calculateAverageBattery(robots),
      avgCpuUsage: calculateAverageMetric(periodMetrics, 'cpu_usage'),
      avgMemoryUsage: calculateAverageMetric(periodMetrics, 'memory_usage'),
      byModel: aggregateByField(robots, 'model'),
      byFirmware: aggregateByField(robots, 'firmware_version')
    };

    const healthScores = calculateRobotHealthScores(robots, periodMetrics);

    const batteryTrend = calculateBatteryTrend(periodMetrics);

    res.json({
      success: true,
      data: {
        summary,
        healthScores,
        batteryTrend,
        period
      }
    });
  } catch (error) {
    logger.error('Robot analytics error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/content', async (req, res) => {
  try {
    const { period = '30d' } = req.query;

    const content = db.getTable('educational_content') || [];
    const progress = db.getTable('student_progress') || [];

    const now = new Date();
    let since;
    switch (period) {
      case '7d': since = new Date(now - 7 * 24 * 60 * 60 * 1000); break;
      case '30d': since = new Date(now - 30 * 24 * 60 * 60 * 1000); break;
      default: since = new Date(now - 30 * 24 * 60 * 60 * 1000);
    }

    const periodProgress = progress.filter(p => new Date(p.recorded_at) >= since);

    const summary = {
      totalContent: content.length,
      bySubject: aggregateByField(content, 'subject'),
      byLevel: aggregateByField(content, 'level'),
      byType: aggregateByField(content, 'type'),
      totalProgressRecords: progress.length,
      recordsInPeriod: periodProgress.length,
      avgScore: calculateAverageScore(periodProgress),
      completedCount: periodProgress.filter(p => p.status === 'completed').length,
      totalTimeSpent: periodProgress.reduce((sum, p) => sum + (p.time_spent || 0), 0)
    };

    const performance = {
      bySubject: calculatePerformanceByField(periodProgress, 'subject'),
      byLevel: calculatePerformanceByField(periodProgress, 'level'),
      trendingTopics: calculateTrendingTopics(periodProgress, content)
    };

    res.json({
      success: true,
      data: {
        summary,
        performance,
        period
      }
    });
  } catch (error) {
    logger.error('Content analytics error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/custom-report', async (req, res) => {
  try {
    const { metrics, dimensions, filters, startDate, endDate, format = 'json' } = req.query;

    if (!metrics) {
      return res.status(400).json({ error: 'metrics parameter is required' });
    }

    const metricList = metrics.split(',');
    const dimensionList = dimensions ? dimensions.split(',') : [];

    const users = db.getTable('users') || [];
    const orders = db.getTable('orders') || [];
    const subscriptions = db.getTable('user_subscriptions') || [];

    let start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let end = endDate ? new Date(endDate) : new Date();

    const filteredOrders = orders.filter(o => {
      const created = new Date(o.created_at);
      return created >= start && created <= end;
    });

    const filteredUsers = users.filter(u => {
      const created = new Date(u.created_at);
      return created >= start && created <= end;
    });

    const report = {
      metadata: {
        generatedAt: new Date().toISOString(),
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        metrics: metricList,
        dimensions: dimensionList,
        format
      },
      data: {}
    };

    if (metricList.includes('total_users')) {
      report.data.total_users = users.length;
    }
    if (metricList.includes('new_users')) {
      report.data.new_users = filteredUsers.length;
    }
    if (metricList.includes('total_orders')) {
      report.data.total_orders = orders.length;
    }
    if (metricList.includes('orders_in_period')) {
      report.data.orders_in_period = filteredOrders.length;
    }
    if (metricList.includes('total_revenue')) {
      report.data.total_revenue = orders
        .filter(o => o.status === 'completed' || o.status === 'paid' || o.status === 'delivered')
        .reduce((sum, o) => sum + (o.amount_total || 0), 0);
    }
    if (metricList.includes('revenue_in_period')) {
      report.data.revenue_in_period = filteredOrders
        .filter(o => o.status === 'completed' || o.status === 'paid' || o.status === 'delivered')
        .reduce((sum, o) => sum + (o.amount_total || 0), 0);
    }
    if (metricList.includes('active_subscriptions')) {
      report.data.active_subscriptions = subscriptions.filter(s => s.status === 'active' || s.status === 'trialing').length;
    }
    if (metricList.includes('mrr')) {
      report.data.mrr = calculateMRR(subscriptions);
    }
    if (metricList.includes('avg_order_value')) {
      const completedInPeriod = filteredOrders.filter(o => o.status === 'completed' || o.status === 'paid' || o.status === 'delivered');
      report.data.avg_order_value = completedInPeriod.length > 0
        ? Math.round(completedInPeriod.reduce((sum, o) => sum + (o.amount_total || 0), 0) / completedInPeriod.length)
        : 0;
    }
    if (metricList.includes('conversion_rate')) {
      const completedInPeriod = filteredOrders.filter(o => o.status === 'completed' || o.status === 'paid' || o.status === 'delivered');
      report.data.conversion_rate = filteredUsers.length > 0
        ? ((completedInPeriod.length / filteredUsers.length) * 100).toFixed(1)
        : '0.0';
    }

    res.json({ success: true, data: report });
  } catch (error) {
    logger.error('Custom report error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/export', async (req, res) => {
  try {
    const { type, format = 'json', startDate, endDate } = req.query;

    if (!type) {
      return res.status(400).json({ error: 'type parameter is required' });
    }

    let start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let end = endDate ? new Date(endDate) : new Date();

    let data;
    let filename;

    switch (type) {
      case 'users':
        data = (db.getTable('users') || []).filter(u => {
          const created = new Date(u.created_at);
          return created >= start && created <= end;
        }).map(u => ({
          id: u.id,
          username: u.username,
          email: u.email,
          role: u.role,
          status: u.status,
          email_verified: u.email_verified,
          created_at: u.created_at,
          last_login_at: u.last_login_at
        }));
        filename = `users_export_${new Date().toISOString().split('T')[0]}`;
        break;

      case 'orders':
        data = (db.getTable('orders') || []).filter(o => {
          const created = new Date(o.created_at);
          return created >= start && created <= end;
        }).map(o => ({
          id: o.id,
          order_number: o.order_number,
          user_id: o.user_id,
          amount_total: o.amount_total,
          currency: o.currency,
          status: o.status,
          created_at: o.created_at
        }));
        filename = `orders_export_${new Date().toISOString().split('T')[0]}`;
        break;

      case 'subscriptions':
        data = (db.getTable('user_subscriptions') || []).filter(s => {
          const created = new Date(s.created_at);
          return created >= start && created <= end;
        }).map(s => ({
          id: s.id,
          user_id: s.user_id,
          plan_id: s.plan_id,
          price: s.price,
          currency: s.currency,
          status: s.status,
          created_at: s.created_at
        }));
        filename = `subscriptions_export_${new Date().toISOString().split('T')[0]}`;
        break;

      default:
        return res.status(400).json({ error: 'Invalid type. Supported: users, orders, subscriptions' });
    }

    const exportResult = {
      success: true,
      data: {
        type,
        filename,
        format,
        recordCount: data.length,
        generatedAt: new Date().toISOString(),
        dateRange: { start, end },
        records: data
      }
    };

    if (format === 'csv') {
      if (data.length > 0) {
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(row => Object.values(row).map(v => `"${v}"`).join(','));
        exportResult.data.csvContent = [headers, ...rows].join('\n');
      }
    }

    res.json(exportResult);
  } catch (error) {
    logger.error('Export error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/scheduled-reports', async (req, res) => {
  try {
    const reports = db.getTable('scheduled_reports') || [];
    
    res.json({
      success: true,
      data: reports.map(r => ({
        ...r,
        parameters: r.parameters ? JSON.parse(r.parameters) : {},
        recipients: r.recipients ? JSON.parse(r.recipients) : []
      }))
    });
  } catch (error) {
    logger.error('Scheduled reports error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/scheduled-reports', async (req, res) => {
  try {
    const { name, description, schedule, parameters, recipients, format, enabled = true } = req.body;

    if (!name || !schedule) {
      return res.status(400).json({ error: 'name and schedule are required' });
    }

    const report = {
      name,
      description: description || null,
      schedule,
      parameters: parameters ? JSON.stringify(parameters) : '{}',
      recipients: recipients ? JSON.stringify(recipients) : '[]',
      format: format || 'json',
      enabled,
      last_run_at: null,
      next_run_at: calculateNextRun(schedule),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      const result = await db.insert('scheduled_reports', report);
      report.id = result.insertId;
    } catch (e) {
      if (!db.tables.scheduled_reports) db.tables.scheduled_reports = [];
      if (!db.ids) db.ids = {};
      const newId = (db.ids.scheduled_reports || 0) + 1;
      db.ids.scheduled_reports = newId;
      report.id = newId;
      db.tables.scheduled_reports.push({ id: newId, ...report });
    }

    res.status(201).json({
      success: true,
      message: 'Scheduled report created',
      data: {
        ...report,
        parameters,
        recipients
      }
    });
  } catch (error) {
    logger.error('Create scheduled report error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.get('/available-metrics', (req, res) => {
  res.json({
    success: true,
    data: {
      userMetrics: [
        { key: 'total_users', name: 'Total Users', description: 'Total number of registered users' },
        { key: 'new_users', name: 'New Users', description: 'Users registered in period' },
        { key: 'active_users', name: 'Active Users', description: 'Users with recent activity' }
      ],
      revenueMetrics: [
        { key: 'total_revenue', name: 'Total Revenue', description: 'All-time revenue' },
        { key: 'revenue_in_period', name: 'Revenue in Period', description: 'Revenue within date range' },
        { key: 'avg_order_value', name: 'Average Order Value', description: 'Average order amount' },
        { key: 'mrr', name: 'Monthly Recurring Revenue', description: 'Subscription MRR' }
      ],
      orderMetrics: [
        { key: 'total_orders', name: 'Total Orders', description: 'All-time order count' },
        { key: 'orders_in_period', name: 'Orders in Period', description: 'Orders within date range' },
        { key: 'conversion_rate', name: 'Conversion Rate', description: 'User to customer conversion' }
      ],
      subscriptionMetrics: [
        { key: 'active_subscriptions', name: 'Active Subscriptions', description: 'Active and trialing subscriptions' },
        { key: 'churn_rate', name: 'Churn Rate', description: 'Subscription cancellation rate' }
      ]
    }
  });
});

function aggregateByField(records, field) {
  const counts = {};
  for (const r of records) {
    const val = r[field] || 'unknown';
    counts[val] = (counts[val] || 0) + 1;
  }
  return counts;
}

function aggregateByMonth(records) {
  const months = {};
  for (const r of records) {
    if (!r.created_at) continue;
    const key = r.created_at.substring(0, 7);
    months[key] = (months[key] || 0) + (r.amount_total || 0);
  }
  return Object.entries(months).map(([month, revenue]) => ({ month, revenue }));
}

function calculateMRR(subscriptions) {
  const activeSubs = subscriptions.filter(s => s.status === 'active');
  let mrr = 0;

  for (const sub of activeSubs) {
    const price = sub.price || 0;
    mrr += price;
  }

  return Math.round(mrr);
}

function calculatePlanMRR(subs, plan) {
  const activeSubs = subs.filter(s => s.status === 'active');
  const planPrice = plan?.price || 0;
  return activeSubs.length * planPrice;
}

function calculateAverageRating(tickets) {
  const rated = tickets.filter(t => t.satisfaction_rating !== null);
  if (rated.length === 0) return null;
  return (rated.reduce((sum, t) => sum + t.satisfaction_rating, 0) / rated.length).toFixed(1);
}

function calculateAverageBattery(robots) {
  const withBattery = robots.filter(r => r.battery_level != null);
  if (withBattery.length === 0) return 0;
  return Math.round(withBattery.reduce((sum, r) => sum + r.battery_level, 0) / withBattery.length);
}

function calculateAverageMetric(metrics, field) {
  const withValue = metrics.filter(m => m[field] != null);
  if (withValue.length === 0) return null;
  return Math.round(withValue.reduce((sum, m) => sum + m[field], 0) / withValue.length);
}

function calculateUserGrowth(users, since) {
  const trend = [];
  const now = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    const count = users.filter(u => new Date(u.created_at) <= date).length;
    trend.push({ date: dateStr, totalUsers: count });
  }

  return trend;
}

function calculateRevenueTrend(orders, since) {
  const trend = [];
  const now = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    const dayStart = new Date(dateStr + 'T00:00:00');
    const dayEnd = new Date(dateStr + 'T23:59:59');
    
    const dayOrders = orders.filter(o => {
      const created = new Date(o.created_at);
      return created >= dayStart && created <= dayEnd;
    });
    
    const revenue = dayOrders.reduce((sum, o) => sum + (o.amount_total || 0), 0);
    trend.push({ date: dateStr, revenue, orders: dayOrders.length });
  }

  return trend;
}

function calculateSubscriptionTrend(subscriptions, since) {
  const trend = [];
  const now = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    
    const active = subscriptions.filter(s => {
      const created = new Date(s.created_at);
      const canceled = s.canceled_at ? new Date(s.canceled_at) : null;
      return created <= date && (!canceled || canceled > date);
    }).length;
    
    trend.push({ date: dateStr, activeSubscriptions: active });
  }

  return trend;
}

function calculateAverageResponseTime(tickets, responses) {
  let total = 0;
  let count = 0;

  for (const ticket of tickets) {
    const ticketResponses = responses.filter(r => r.ticket_id == ticket.id && r.user_id !== ticket.user_id);
    if (ticketResponses.length > 0) {
      ticketResponses.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      const firstResponse = ticketResponses[0];
      const diff = new Date(firstResponse.created_at) - new Date(ticket.created_at);
      total += diff / (1000 * 60);
      count++;
    }
  }

  return count > 0 ? Math.round(total / count) : null;
}

function calculateAverageResolutionTime(tickets) {
  const resolved = tickets.filter(t => t.resolved_at);
  if (resolved.length === 0) return null;

  let totalHours = 0;
  for (const ticket of resolved) {
    const diff = new Date(ticket.resolved_at) - new Date(ticket.created_at);
    totalHours += diff / (1000 * 60 * 60);
  }

  return Math.round(totalHours / resolved.length);
}

function calculateWeeklyActiveUsers(users, sessions) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentSessions = sessions.filter(s => new Date(s.updated_at) >= weekAgo);
  return [...new Set(recentSessions.map(s => s.user_id))].length;
}

function calculateRevenueBreakdown(orders, groupBy, since) {
  const breakdown = {};

  for (const order of orders) {
    let key;
    const date = new Date(order.created_at);

    switch (groupBy) {
      case 'day':
        key = date.toISOString().split('T')[0];
        break;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        key = date.toISOString().substring(0, 7);
        break;
      default:
        key = date.toISOString().split('T')[0];
    }

    if (!breakdown[key]) {
      breakdown[key] = { date: key, revenue: 0, orders: 0 };
    }
    breakdown[key].revenue += order.amount_total || 0;
    breakdown[key].orders++;
  }

  return Object.values(breakdown).sort((a, b) => a.date.localeCompare(b.date));
}

function calculateRobotInteractions(robots, period) {
  return robots.filter(r => r.status === 'online').length * 5;
}

function calculateRobotHealthScores(robots, metrics) {
  const scores = [];
  
  for (const robot of robots) {
    let score = 100;
    
    if (robot.status === 'error') score -= 50;
    if (robot.status === 'offline') score -= 25;
    if (robot.battery_level != null && robot.battery_level < 20) score -= 20;
    
    scores.push({
      robot_id: robot.id,
      device_id: robot.device_id,
      name: robot.name,
      status: robot.status,
      healthScore: Math.max(0, score)
    });
  }

  return scores;
}

function calculateBatteryTrend(metrics) {
  const trend = {};
  
  for (const m of metrics) {
    if (m.battery_level == null) continue;
    const date = new Date(m.recorded_at).toISOString().split('T')[0];
    if (!trend[date]) {
      trend[date] = { date, total: 0, count: 0 };
    }
    trend[date].total += m.battery_level;
    trend[date].count++;
  }

  return Object.values(trend).map(t => ({
    date: t.date,
    avgBattery: Math.round(t.total / t.count)
  })).sort((a, b) => a.date.localeCompare(b.date));
}

function calculateAverageScore(progress) {
  const withScore = progress.filter(p => p.score != null);
  if (withScore.length === 0) return 0;
  return Math.round(withScore.reduce((sum, p) => sum + p.score, 0) / withScore.length);
}

function calculatePerformanceByField(progress, field) {
  const byField = {};
  
  for (const p of progress) {
    const key = p[field] || 'unknown';
    if (!byField[key]) {
      byField[key] = { total: 0, count: 0, completed: 0 };
    }
    if (p.score != null) {
      byField[key].total += p.score;
      byField[key].count++;
    }
    if (p.status === 'completed') {
      byField[key].completed++;
    }
  }

  const result = {};
  for (const [key, data] of Object.entries(byField)) {
    result[key] = {
      avgScore: data.count > 0 ? Math.round(data.total / data.count) : 0,
      totalAttempts: data.count,
      completed: data.completed
    };
  }

  return result;
}

function calculateTrendingTopics(progress, content) {
  const topics = {};
  
  for (const p of progress) {
    const topic = p.lesson_id || 'unknown';
    if (!topics[topic]) {
      topics[topic] = { topic, count: 0 };
    }
    topics[topic].count++;
  }

  return Object.values(topics)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function calculateEngagementTrend(sessions, messages, since) {
  const trend = {};
  
  const recentSessions = sessions.filter(s => new Date(s.created_at) >= since);
  const recentMessages = messages.filter(m => new Date(m.created_at) >= since);

  for (const s of recentSessions) {
    const date = new Date(s.created_at).toISOString().split('T')[0];
    if (!trend[date]) {
      trend[date] = { date, sessions: 0, messages: 0 };
    }
    trend[date].sessions++;
  }

  for (const m of recentMessages) {
    const date = new Date(m.created_at).toISOString().split('T')[0];
    if (!trend[date]) {
      trend[date] = { date, sessions: 0, messages: 0 };
    }
    trend[date].messages++;
  }

  return Object.values(trend).sort((a, b) => a.date.localeCompare(b.date));
}

function calculateEngagementByAge(sessions, users) {
  const byAge = {};
  
  for (const s of sessions) {
    const user = users.find(u => u.id === s.user_id);
    const ageGroup = 'adult';
    if (!byAge[ageGroup]) {
      byAge[ageGroup] = { ageGroup, sessions: 0 };
    }
    byAge[ageGroup].sessions++;
  }

  return Object.values(byAge);
}

function calculateNextRun(schedule) {
  const now = new Date();
  switch (schedule) {
    case 'daily':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    case 'weekly':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    case 'monthly':
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  }
}

module.exports = router;
