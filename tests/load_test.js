import http from 'k6/http';
import { check, group, sleep, fail } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomIntBetween, randomItem } from 'https://jslib.k6.io/1.2.0/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// Custom metrics
// ─────────────────────────────────────────────────────────────────────────────
const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency', true);
const apiErrors = new Counter('api_errors');
const authAttempts = new Counter('auth_attempts');
const contentRequests = new Counter('content_requests');
const aiRequests = new Counter('ai_requests');
const wsConnections = new Counter('ws_connections');

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────
const BASE_URL = __ENV.API_URL || 'http://localhost:3000';
const VUS = parseInt(__ENV.VUS || '10');
const DURATION = __ENV.DURATION || '1m';
const RAMP_UP = __ENV.RAMP_UP || '10s';
const RAMP_DOWN = __ENV.RAMP_DOWN || '20s';

export const options = {
  stages: [
    { duration: RAMP_UP, target: VUS },
    { duration: DURATION, target: VUS },
    { duration: RAMP_DOWN, target: 0 },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],
    'http_req_failed': ['rate<0.01'],
    'api_latency': ['p(95)<500'],
    'errors': ['rate<0.05'],
  },
  ext: {
    loadimpact: {
      projectID: 3616975,
      name: 'Robot Companion API Load Test',
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Test data
// ─────────────────────────────────────────────────────────────────────────────
const SUBJECTS = ['math', 'english', 'science', 'history', 'geography', 'art', 'music'];
const AGES = [3, 5, 7, 9, 11, 13];
const LANGUAGES = ['en', 'de', 'fr', 'es', 'it', 'pl'];
const EMAILS = Array.from({ length: 100 }, (_, i) => `user${i}@example.com`);
const PASSWORD = 'test123456';

let authToken = '';
let childId = '';
let robotId = '';
let sessionId = '';

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────
export function setup() {
  // Login and get token
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: 'parent@example.com',
    password: 'parent123',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  if (loginRes.status !== 200) {
    fail(`Login failed: ${loginRes.status}`);
  }

  const token = loginRes.json('token');
  authToken = token;

  return { token, childId: 'child_001' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Default function
// ─────────────────────────────────────────────────────────────────────────────
export default function (data) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${data.token}`,
    },
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Group 1: Authentication
  // ───────────────────────────────────────────────────────────────────────────
  group('Authentication', () => {
    authAttempts.add(1);

    // Test profile retrieval
    const res = http.get(`${BASE_URL}/api/auth/me`, params);
    check(res, {
      'profile status is 200': (r) => r.status === 200,
      'profile has email': (r) => r.json('user.email') !== undefined,
      'profile latency < 300ms': (r) => r.timings.duration < 300,
    }) || errorRate.add(1);

    apiLatency.add(res.timings.duration);
  });

  sleep(randomIntBetween(1, 3));

  // ───────────────────────────────────────────────────────────────────────────
  // Group 2: Content Service
  // ───────────────────────────────────────────────────────────────────────────
  group('Content Service', () => {
    const subject = randomItem(SUBJECTS);
    const res = http.get(`${BASE_URL}/api/content-service/content?subject=${subject}&limit=20`, params);

    check(res, {
      'content status is 200': (r) => r.status === 200,
      'content has data': (r) => r.json('data') !== undefined,
      'content latency < 500ms': (r) => r.timings.duration < 500,
    }) || errorRate.add(1);

    contentRequests.add(1);
    apiLatency.add(res.timings.duration);
  });

  sleep(randomIntBetween(1, 3));

  // ───────────────────────────────────────────────────────────────────────────
  // Group 3: Learning Engine
  // ───────────────────────────────────────────────────────────────────────────
  group('Learning Engine', () => {
    const res = http.post(`${BASE_URL}/api/learn`, JSON.stringify({
      userId: data.childId,
      subject: randomItem(SUBJECTS),
      level: 'primary1',
      count: 5,
    }), params);

    check(res, {
      'learn status is 200': (r) => r.status === 200,
      'learn has content': (r) => r.json('data') !== undefined,
      'learn latency < 800ms': (r) => r.timings.duration < 800,
    }) || errorRate.add(1);

    apiLatency.add(res.timings.duration);
  });

  sleep(randomIntBetween(1, 3));

  // ───────────────────────────────────────────────────────────────────────────
  // Group 4: AI Chat / Voice
  // ───────────────────────────────────────────────────────────────────────────
  group('AI Chat', () => {
    const message = randomItem([
      'Hello, how are you?',
      'Can you help me with math?',
      'Tell me a story',
      'What is the capital of France?',
      'I feel sad today',
      'What are dinosaurs?',
    ]);

    const res = http.post(`${BASE_URL}/api/voice-chat`, JSON.stringify({
      messages: [
        { role: 'user', content: message },
      ],
      childAge: randomItem(AGES),
      language: randomItem(LANGUAGES),
    }), params);

    check(res, {
      'chat status is 200': (r) => r.status === 200,
      'chat has reply': (r) => r.json('data.reply') !== undefined,
      'chat latency < 2000ms': (r) => r.timings.duration < 2000,
    }) || errorRate.add(1);

    aiRequests.add(1);
    apiLatency.add(res.timings.duration);
  });

  sleep(randomIntBetween(2, 5));

  // ───────────────────────────────────────────────────────────────────────────
  // Group 5: Edge AI Inference (if available)
  // ───────────────────────────────────────────────────────────────────────────
  group('Edge AI', () => {
    const res = http.get(`${BASE_URL}/api/edge-ai/models`, params);

    check(res, {
      'edge-ai status is 200': (r) => r.status === 200,
      'edge-ai latency < 500ms': (r) => r.timings.duration < 500,
    }) || errorRate.add(1);

    apiLatency.add(res.timings.duration);
  });

  sleep(randomIntBetween(1, 3));

  // ───────────────────────────────────────────────────────────────────────────
  // Group 6: Robot / Device Management
  // ───────────────────────────────────────────────────────────────────────────
  group('Robot Management', () => {
    const res = http.get(`${BASE_URL}/api/robots`, params);

    check(res, {
      'robots status is 200': (r) => r.status === 200,
      'robots latency < 500ms': (r) => r.timings.duration < 500,
    }) || errorRate.add(1);

    apiLatency.add(res.timings.duration);
  });

  sleep(randomIntBetween(1, 3));

  // ───────────────────────────────────────────────────────────────────────────
  // Group 7: Health & Compliance
  // ───────────────────────────────────────────────────────────────────────────
  group('Health & Compliance', () => {
    const health = http.get(`${BASE_URL}/health/live`);
    check(health, {
      'health status is 200': (r) => r.status === 200,
    });

    const ready = http.get(`${BASE_URL}/health/ready`);
    check(ready, {
      'ready status is 200': (r) => r.status === 200,
    });
  });

  sleep(randomIntBetween(1, 3));

  // ───────────────────────────────────────────────────────────────────────────
  // Simulate WebSocket connections tracking
  // ───────────────────────────────────────────────────────────────────────────
  if (Math.random() > 0.9) {
    wsConnections.add(1);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Teardown
// ─────────────────────────────────────────────────────────────────────────────
export function teardown(data) {
  // Cleanup if needed
  console.log('Load test completed');
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────
export function handleSummary(data) {
  return {
    'stdout': `
=== Robot Companion API Load Test ===
  Scenarios: ${data.metrics.scenarios}
  Requests: ${data.metrics.http_reqs.values.count}
  Failed: ${data.metrics.http_req_failed.values.rate * 100}%
  Duration: ${data.metrics.iteration_duration.values.avg}ms avg
  Latency P95: ${data.metrics.http_req_duration.values['p(95)']}ms
  Latency P99: ${data.metrics.http_req_duration.values['p(99)']}ms
  Errors: ${data.metrics.errors.values.rate * 100}%
  API Latency P95: ${data.metrics.api_latency ? data.metrics.api_latency.values['p(95)'] : 0}ms
  Auth Attempts: ${data.metrics.auth_attempts.values.count}
  Content Requests: ${data.metrics.content_requests.values.count}
  AI Requests: ${data.metrics.ai_requests.values.count}
  WS Connections: ${data.metrics.ws_connections.values.count}
    `,
  };
}