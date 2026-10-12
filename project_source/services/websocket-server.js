const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const url = require('url');
const robotManager = require('./robot-manager');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

const WS_ROLES = {
  ROBOT: 'robot',
  APP: 'app',
  PARENT: 'parent',
  ADMIN: 'admin',
  SCHOOL: 'school'
};

class WSServer {
  constructor(server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.clients = new Map();
    this._setup();
  }

  _setup() {
    this.wss.on('connection', (ws, req) => {
      const params = url.parse(req.url, true).query;
      const token = params.token;
      let clientInfo = { role: 'anonymous', userId: null, robotId: null };

      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          clientInfo.userId = decoded.userId;
          clientInfo.role = decoded.role || 'app';
        } catch (e) {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid token' }));
        }
      }

      if (params.robotId) {
        clientInfo.role = WS_ROLES.ROBOT;
        clientInfo.robotId = params.robotId;
        const robot = robotManager.getRobot(params.robotId);
        if (robot) robot.state = 'online';
      }

      const clientId = `${clientInfo.role}_${clientInfo.userId || clientInfo.robotId || Date.now()}_${Date.now()}`;
      ws.clientId = clientId;
      this.clients.set(clientId, { ws, ...clientInfo });

      ws.send(JSON.stringify({ type: 'connected', clientId, role: clientInfo.role }));

      if (clientInfo.role === WS_ROLES.ROBOT && clientInfo.robotId) {
        this._broadcast({ type: 'robot_online', robotId: clientInfo.robotId }, [WS_ROLES.APP, WS_ROLES.PARENT, WS_ROLES.ADMIN]);
      }

      ws.on('message', (data) => this._handleMessage(ws, clientInfo, data));
      ws.on('close', () => {
        this.clients.delete(clientId);
        if (clientInfo.role === WS_ROLES.ROBOT && clientInfo.robotId) {
          const robot = robotManager.getRobot(clientInfo.robotId);
          if (robot) robot.state = 'offline';
          this._broadcast({ type: 'robot_offline', robotId: clientInfo.robotId }, [WS_ROLES.APP, WS_ROLES.PARENT, WS_ROLES.ADMIN]);
        }
      });
      ws.on('error', () => this.clients.delete(clientId));
    });

    robotManager.on('heartbeat', ({ robotId, status }) => {
      this._broadcast({ type: 'heartbeat', robotId, status }, [WS_ROLES.APP, WS_ROLES.PARENT, WS_ROLES.ADMIN, WS_ROLES.SCHOOL]);
    });

    robotManager.on('state', ({ robotId, state }) => {
      this._broadcast({ type: 'robot_state', robotId, state }, [WS_ROLES.APP, WS_ROLES.PARENT, WS_ROLES.ADMIN, WS_ROLES.SCHOOL]);
    });

    robotManager.on('sensor', ({ robotId, ...data }) => {
      this._broadcast({ type: 'sensor', robotId, ...data }, [WS_ROLES.APP, WS_ROLES.PARENT, WS_ROLES.ADMIN]);
    });

    robotManager.on('speech', ({ robotId, text, lang }) => {
      this._broadcast({ type: 'speech', robotId, text, lang }, [WS_ROLES.APP, WS_ROLES.PARENT, WS_ROLES.ADMIN]);
    });

    robotManager.on('event', ({ robotId, type, message, confidence }) => {
      this._broadcast({ type: 'robot_event', robotId, eventType: type, message, confidence }, [WS_ROLES.PARENT, WS_ROLES.ADMIN]);
    });

    robotManager.on('expression', ({ robotId, expression, emoji }) => {
      this._broadcast({ type: 'expression', robotId, expression, emoji }, [WS_ROLES.APP, WS_ROLES.PARENT, WS_ROLES.ADMIN]);
    });
  }

  _handleMessage(ws, clientInfo, rawData) {
    let msg;
    try { msg = JSON.parse(rawData); } catch (e) { ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' })); return; }

    switch (msg.type) {
      case 'command':
        if (clientInfo.role === WS_ROLES.ROBOT) return ws.send(JSON.stringify({ type: 'error', message: 'Robots cannot send commands' }));
        this._routeCommand(msg, clientInfo);
        break;
      case 'subscribe':
        this._handleSubscribe(ws, clientInfo, msg);
        break;
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        break;
      case 'alert':
        this._broadcast({ type: 'alert', from: clientInfo.userId, ...msg.payload }, [WS_ROLES.PARENT, WS_ROLES.ADMIN]);
        break;
      default:
        ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${msg.type}` }));
    }
  }

  _routeCommand(msg, from) {
    const robotId = msg.robotId || from.robotId;
    const robot = robotManager.getRobot(robotId);
    if (!robot) return this._sendToClient(from, { type: 'error', message: `Robot ${robotId} not found` });
    const result = robot.executeCommand(msg.command);
    const response = { type: 'command_result', robotId, command: msg.command, result, timestamp: new Date().toISOString() };
    const robotClients = Array.from(this.clients.values()).filter(c => c.role === WS_ROLES.ROBOT && c.robotId === robotId);
    robotClients.forEach(c => { try { c.ws.send(JSON.stringify(response)); } catch(e) {} });
    this._sendToClient(from, response);
  }

  _handleSubscribe(ws, clientInfo, msg) {
    if (msg.robotId) {
      ws.subscribedRobots = ws.subscribedRobots || new Set();
      ws.subscribedRobots.add(msg.robotId);
      const robot = robotManager.getRobot(msg.robotId);
      if (robot) ws.send(JSON.stringify({ type: 'robot_status', robotId: msg.robotId, status: robot.getStatus() }));
    }
  }

  _sendToClient(clientInfo, msg) {
    const data = JSON.stringify(msg);
    // Try matching by userId for app/parent clients
    if (clientInfo.userId) {
      const entry = Array.from(this.clients.values()).find(c => c.userId === clientInfo.userId);
      if (entry) try { entry.ws.send(data); return; } catch(e) {}
    }
    // Try matching by clientId
    const entry = this.clients.get(clientInfo.clientId);
    if (entry) try { entry.ws.send(data); } catch(e) { this.clients.delete(clientInfo.clientId); }
  }

  _broadcast(msg, roles) {
    const data = JSON.stringify(msg);
    this.clients.forEach(client => {
      if (roles && !roles.includes(client.role)) return;
      try { client.ws.send(data); } catch(e) { this.clients.delete(client.clientId); }
    });
  }

  broadcastToRole(msg, role) { this._broadcast(msg, [role]); }
}

let instance = null;
function createWSServer(server) {
  if (!instance) instance = new WSServer(server);
  return instance;
}

module.exports = { createWSServer, WSServer };
