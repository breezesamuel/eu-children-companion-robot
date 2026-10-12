// Learning Companion Robot - Backend Server
// This server provides REST API for educational content

// Load .env file if present
try { require('dotenv').config(); } catch (e) { /* dotenv optional */ }

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
const MAX_BODY_SIZE = process.env.MAX_BODY_SIZE || '1mb';
app.use(cors());
app.use(express.json({ limit: MAX_BODY_SIZE }));

// Static web assets live in ./docs, but it also holds internal notes (audit/bugfix/architecture
// markdown). Never expose those over HTTP — only serve the actual web asset types.
app.use((req, res, next) => {
    if (/\.(md|markdown|txt|log|env|ya?ml|bak)$/i.test(req.path)) return res.status(404).end();
    next();
});
app.use(express.static(path.join(__dirname, 'docs')));

// Security & monitoring middleware.
//
// Reuse-first decision (docs/OPEN_SOURCE_REUSE_SOP.md §10, docs/SECURITY_AUDIT.md):
// the hand-rolled `securityHeaders` and `rate-limiter` were replaced by the maintained
// wheels `helmet` and `express-rate-limit` (both MIT, license-gate pass). The in-house
// `corsRestricted` (allow-list CORS) is kept because neither wheel provides it.
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { corsRestricted } = require('./middleware/security');
const monitoringMiddleware = require('./middleware/monitoring');

const isProd = process.env.NODE_ENV === 'production';

// Only trust X-Forwarded-For when explicitly configured (i.e. behind a known proxy/LB).
app.set('trust proxy', process.env.TRUST_PROXY ? (parseInt(process.env.TRUST_PROXY, 10) || true) : false);

app.use(helmet({
    // CSP/HSTS only in production, matching the previous behaviour so local dev and the
    // bundled static pages (Stripe, jsDelivr, inline scripts, websockets) keep working.
    contentSecurityPolicy: isProd ? {
        useDefaults: false,
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", 'https://js.stripe.com', 'https://cdn.jsdelivr.net'],
            frameSrc: ['https://js.stripe.com'],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
            connectSrc: ["'self'", 'https://api.stripe.com', 'wss://*.robobuddy.eu'],
            fontSrc: ["'self'", 'data:'],
            mediaSrc: ["'self'", 'blob:'],
        },
    } : false,
    hsts: isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
app.use((req, res, next) => {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(self), geolocation=(self), fullscreen=(self)');
    next();
});

const globalLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10),
    limit: parseInt(process.env.RATE_LIMIT_MAX || '100', 10) + parseInt(process.env.RATE_LIMIT_BURST || '20', 10),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, error: 'Too many requests, please try again later.' },
});

app.use(corsRestricted);
app.use(globalLimiter);
app.use(monitoringMiddleware);

// Database
const db = require('./utils/database');
app.locals.db = db;

// Import Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const learningRoutes = require('./routes/learning');
const robotRoutes = require('./routes/robots');
let childRoutes = (req, res) => res.json({ success: false, message: 'Child API module not loaded' });
let chatRoutes = (req, res) => res.json({ success: false, message: 'Chat API module not loaded' });
try { childRoutes = require('./backend/api/v1/child'); } catch (e) { /* optional module */ }
try { chatRoutes = require('./backend/api/v1/chat'); } catch (e) { /* optional module */ }
let learningV1Routes = (req, res) => res.json({ success: false, message: 'Learning API v1 not loaded' });
let healthRoutes = (req, res) => res.json({ success: false, message: 'Health API not loaded' });
let contentV1Routes = (req, res) => res.json({ success: false, message: 'Content API v1 not loaded' });
let analyticsRoutes = (req, res) => res.json({ success: false, message: 'Analytics API not loaded' });
let entertainmentV1Routes = (req, res) => res.json({ success: false, message: 'Entertainment API v1 not loaded' });
let lifeV1Routes = (req, res) => res.json({ success: false, message: 'Life Services API v1 not loaded' });
let videoV1Routes = (req, res) => res.json({ success: false, message: 'Video Call API v1 not loaded' });
try { learningV1Routes = require('./backend/api/v1/learning'); } catch (e) { /* optional module */ }
try { healthRoutes = require('./backend/api/v1/health'); } catch (e) { /* optional module */ }
try { contentV1Routes = require('./backend/api/v1/content'); } catch (e) { /* optional module */ }
try { analyticsRoutes = require('./backend/api/v1/analytics'); } catch (e) { /* optional module */ }
try { entertainmentV1Routes = require('./backend/api/v1/entertainment'); } catch (e) { /* optional module */ }
try { lifeV1Routes = require('./backend/api/v1/life-services'); } catch (e) { /* optional module */ }
try { videoV1Routes = require('./backend/api/v1/video-call'); } catch (e) { /* optional module */ }
const gdprRoutes = require('./routes/gdpr');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const subscriptionRoutes = require('./routes/subscriptions');
const storefrontRoutes = require('./routes/storefront');
const supportRoutes = require('./routes/support');
const agentRoutes = require('./routes/agents');
const contentRoutes = require('./routes/content');
const learningEngineRoutes = require('./routes/unified-learning');
const voiceChatRoutes = require('./routes/voice-chat');
const adminRoutes = require('./routes/admin');
const robotManager = require('./services/robot-manager');
const robotHwRoutes = require('./routes/robot');
const contentIngestionRoutes = require('./routes/content-ingestion');
const ttsRoutes = require('./routes/tts');
const contentServiceRoutes = require('./routes/content-service');
const { authenticateToken } = require('./middleware/auth');
const logger = require('./utils/logger');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/learning', authenticateToken, learningRoutes);
app.use('/api/robots', authenticateToken, robotRoutes);
app.use('/api/v1/children', authenticateToken, childRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/learning', authenticateToken, learningV1Routes);
app.use('/api/v1/health', authenticateToken, healthRoutes);
app.use('/api/v1/content', contentV1Routes);
app.use('/api/v1/analytics', authenticateToken, analyticsRoutes);
app.use('/api/v1/entertainment', authenticateToken, entertainmentV1Routes);
app.use('/api/v1/life-services', authenticateToken, lifeV1Routes);
app.use('/api/v1/video-call', authenticateToken, videoV1Routes);
app.use('/api/gdpr', authenticateToken, gdprRoutes);

// Commerce Routes
app.use('/api/products', productRoutes);
app.use('/api/orders', authenticateToken, orderRoutes);
app.use('/api/subscriptions', authenticateToken, subscriptionRoutes);
// Storefront (public pricing/features, dashboard checks auth internally)
app.use('/api/storefront', storefrontRoutes);

// FAQ (must be before auth middleware)
const faqData = [
  { q: 'How do I set up my RoboBuddy?', a: 'Unbox, press the power button, connect to WiFi via the app, and follow the on-screen setup wizard.' },
  { q: 'What is the warranty period?', a: 'All RoboBuddy devices come with a 1-year warranty. Extended Care adds 2 more years.' },
  { q: 'Can I use RoboBuddy without a subscription?', a: 'Yes! The device works out of the box with basic features. The subscription unlocks the full learning curriculum and AI tutoring.' },
  { q: 'Is my child\'s data safe?', a: 'Absolutely. We are fully GDPR compliant. All personal data is encrypted at rest and in transit. Data is stored exclusively on EU servers.' },
  { q: 'How do I return my RoboBuddy?', a: 'Contact our support team within 30 days of delivery for a full refund. We\'ll provide a prepaid return label.' },
  { q: 'Do you ship to my country?', a: 'We ship to all EU countries, UK, Switzerland, and Norway. Free standard shipping on orders over €299.' }
];
app.get('/api/support/faq', (req, res) => { res.json({ success: true, data: faqData }); });

// Support Routes (tickets are auth-protected)
app.use('/api/support', authenticateToken, supportRoutes);

// AI Agent Routes
app.use('/api/agents', authenticateToken, agentRoutes);

// Agent-Scraper Bridge (public conversational scraping)
const agentScraperRoutes = require('./routes/agent-scraper');
app.use('/api/agent-scraper', agentScraperRoutes);

// Content Routes (public educational content)
app.use('/api/content', contentRoutes);
app.use('/api/v2/content', contentRoutes);

// Unified Learning Route (public real-time learning API)
app.use('/api/learn', learningEngineRoutes);

// Voice Chat Route (public voice conversation API)
app.use('/api/voice-chat', voiceChatRoutes);

// Admin Routes
app.use('/api/admin', authenticateToken, adminRoutes);
const adminDataRoutes = require('./admin/admin-routes');
app.use('/api/admin/data', authenticateToken, adminDataRoutes.router);

// Content Ingestion Routes (Firecrawl)
app.use('/api/content-ingestion', authenticateToken, contentIngestionRoutes);

// Unified Content Service Routes
app.use('/api/content-service', authenticateToken, contentServiceRoutes);

// OurTeacher Scraper Routes
const ourteacherScraperRoutes = require('./routes/ourteacher-scraper');
app.use('/api/ourteacher', ourteacherScraperRoutes);

// SmartEdu (国家中小学智慧教育平台) Routes
const smarteduRoutes = require('./routes/smartedu');
app.use('/api/smartedu', authenticateToken, smarteduRoutes);

// TTS Routes
app.use('/api/tts', authenticateToken, ttsRoutes);

// Robot Hardware Routes
app.use('/api/robot', authenticateToken, robotHwRoutes);

// Life Services & Entertainment Routes
const lifeServicesRoutes = require('./routes/life-services');
app.use('/api/life', authenticateToken, lifeServicesRoutes);

// Health Monitor Routes
const healthMonitor = require('./services/health-monitor');
const healthMonitorRoutes = require('./routes/health-monitor');
app.use('/api/health-monitor', authenticateToken, healthMonitorRoutes);

// Video Call Routes
const videoCallRoutes = require('./routes/video-call');
app.use('/api/video-call', authenticateToken, videoCallRoutes);

// Active Service Routes
const activeService = require('./services/active-service');
const activeServiceRoutes = require('./routes/active-service');
app.use('/api/active', authenticateToken, activeServiceRoutes);

// Smart Home Routes
const smartHomeRoutes = require('./routes/smart-home');
app.use('/api/smart-home', authenticateToken, smartHomeRoutes);

// Entertainment Routes
const entertainmentRoutes = require('./routes/entertainment');
app.use('/api/entertainment', authenticateToken, entertainmentRoutes);

// Long-Term Memory Routes
const memoryRoutes = require('./routes/memory');
app.use('/api/memory', authenticateToken, memoryRoutes);

// Voice Chat Routes
const voiceRoutes = require('./routes/voice');
app.use('/api/voice', authenticateToken, voiceRoutes);

// Self-Hosted Service Routes
const selfHostedRoutes = require('./routes/self-hosted');
app.use('/api/self-hosted', authenticateToken, selfHostedRoutes);

// Hardware Integration Routes (IR sensing, voice wake, camera, etc.)
const hardwareRoutes = require('./routes/hardware');
app.use('/api/hardware', hardwareRoutes);

// Scraping Service Routes
const scrapingRoutes = require('./routes/scraping');
app.use('/api/scraping', authenticateToken, scrapingRoutes);

// LLM Service Routes
const llmRoutes = require('./routes/llm');
app.use('/api/llm', authenticateToken, llmRoutes);

// Public Chat Proxy (no auth — accepts API key from frontend)
const chatProxyRoutes = require('./routes/chat-proxy');
app.use('/api/chat-proxy', chatProxyRoutes);

// Log startup
logger.info('All routes registered', { count: app._router ? app._router.stack.length : 0 });

// ==================== MATH QUESTIONS API ====================
function generateMathQuestions(count, type, level = 'random') {
    const questions = [];
    const levels = ['primary1', 'primary2', 'primary3', 'primary4', 'primary5', 'primary6', 'junior1', 'junior2', 'junior3'];

    for (let i = 0; i < count; i++) {
        let num1, num2, num3, answer, question;
        const selectedLevel = level === 'random' ? levels[Math.floor(Math.random() * levels.length)] : level;

        switch (type) {
            case 'addition':
                switch (selectedLevel) {
                    case 'primary1': num1 = Math.floor(Math.random() * 10) + 1; num2 = Math.floor(Math.random() * 10) + 1; answer = num1 + num2; question = `${num1} + ${num2} = ?`; break;
                    case 'primary2': num1 = Math.floor(Math.random() * 50) + 1; num2 = Math.floor(Math.random() * 50) + 1; answer = num1 + num2; question = `${num1} + ${num2} = ?`; break;
                    case 'primary3': num1 = Math.floor(Math.random() * 100) + 1; num2 = Math.floor(Math.random() * 100) + 1; answer = num1 + num2; question = `${num1} + ${num2} = ?`; break;
                    case 'primary4': num1 = Math.floor(Math.random() * 1000) + 1; num2 = Math.floor(Math.random() * 1000) + 1; answer = num1 + num2; question = `${num1} + ${num2} = ?`; break;
                    case 'primary5': num1 = Math.floor(Math.random() * 10000) + 1; num2 = Math.floor(Math.random() * 10000) + 1; answer = num1 + num2; question = `${num1} + ${num2} = ?`; break;
                    case 'primary6': num1 = Math.floor(Math.random() * 100000) + 1; num2 = Math.floor(Math.random() * 100000) + 1; answer = num1 + num2; question = `${num1} + ${num2} = ?`; break;
                    default: num1 = Math.floor(Math.random() * 1000000) + 1; num2 = Math.floor(Math.random() * 1000000) + 1; answer = num1 + num2; question = `${num1} + ${num2} = ?`;
                }
                break;
            case 'subtraction':
                switch (selectedLevel) {
                    case 'primary1': num1 = Math.floor(Math.random() * 10) + 1; num2 = Math.floor(Math.random() * num1) + 1; answer = num1 - num2; question = `${num1} - ${num2} = ?`; break;
                    case 'primary2': num1 = Math.floor(Math.random() * 50) + 1; num2 = Math.floor(Math.random() * num1) + 1; answer = num1 - num2; question = `${num1} - ${num2} = ?`; break;
                    case 'primary3': num1 = Math.floor(Math.random() * 100) + 1; num2 = Math.floor(Math.random() * num1) + 1; answer = num1 - num2; question = `${num1} - ${num2} = ?`; break;
                    case 'primary4': num1 = Math.floor(Math.random() * 1000) + 1; num2 = Math.floor(Math.random() * num1) + 1; answer = num1 - num2; question = `${num1} - ${num2} = ?`; break;
                    case 'primary5': num1 = Math.floor(Math.random() * 10000) + 1; num2 = Math.floor(Math.random() * num1) + 1; answer = num1 - num2; question = `${num1} - ${num2} = ?`; break;
                    case 'primary6': num1 = Math.floor(Math.random() * 100000) + 1; num2 = Math.floor(Math.random() * num1) + 1; answer = num1 - num2; question = `${num1} - ${num2} = ?`; break;
                    default: num1 = Math.floor(Math.random() * 1000000) + 1; num2 = Math.floor(Math.random() * num1) + 1; answer = num1 - num2; question = `${num1} - ${num2} = ?`;
                }
                break;
            case 'multiplication':
                switch (selectedLevel) {
                    case 'primary1': num1 = Math.floor(Math.random() * 5) + 1; num2 = Math.floor(Math.random() * 5) + 1; answer = num1 * num2; question = `${num1} × ${num2} = ?`; break;
                    case 'primary2': num1 = Math.floor(Math.random() * 9) + 1; num2 = Math.floor(Math.random() * 9) + 1; answer = num1 * num2; question = `${num1} × ${num2} = ?`; break;
                    case 'primary3': num1 = Math.floor(Math.random() * 12) + 1; num2 = Math.floor(Math.random() * 12) + 1; answer = num1 * num2; question = `${num1} × ${num2} = ?`; break;
                    case 'primary4': num1 = Math.floor(Math.random() * 20) + 1; num2 = Math.floor(Math.random() * 20) + 1; answer = num1 * num2; question = `${num1} × ${num2} = ?`; break;
                    case 'primary5': num1 = Math.floor(Math.random() * 50) + 1; num2 = Math.floor(Math.random() * 20) + 1; answer = num1 * num2; question = `${num1} × ${num2} = ?`; break;
                    case 'primary6': num1 = Math.floor(Math.random() * 100) + 1; num2 = Math.floor(Math.random() * 50) + 1; answer = num1 * num2; question = `${num1} × ${num2} = ?`; break;
                    default: num1 = Math.floor(Math.random() * 1000) + 1; num2 = Math.floor(Math.random() * 100) + 1; answer = num1 * num2; question = `${num1} × ${num2} = ?`;
                }
                break;
            case 'division':
                switch (selectedLevel) {
                    case 'primary1': num2 = Math.floor(Math.random() * 5) + 1; answer = Math.floor(Math.random() * 5) + 1; num1 = num2 * answer; question = `${num1} ÷ ${num2} = ?`; break;
                    case 'primary2': num2 = Math.floor(Math.random() * 9) + 1; answer = Math.floor(Math.random() * 9) + 1; num1 = num2 * answer; question = `${num1} ÷ ${num2} = ?`; break;
                    case 'primary3': num2 = Math.floor(Math.random() * 12) + 1; answer = Math.floor(Math.random() * 12) + 1; num1 = num2 * answer; question = `${num1} ÷ ${num2} = ?`; break;
                    case 'primary4': num2 = Math.floor(Math.random() * 20) + 1; answer = Math.floor(Math.random() * 20) + 1; num1 = num2 * answer; question = `${num1} ÷ ${num2} = ?`; break;
                    case 'primary5': num2 = Math.floor(Math.random() * 50) + 1; answer = Math.floor(Math.random() * 20) + 1; num1 = num2 * answer; question = `${num1} ÷ ${num2} = ?`; break;
                    case 'primary6': num2 = Math.floor(Math.random() * 100) + 1; answer = Math.floor(Math.random() * 50) + 1; num1 = num2 * answer; question = `${num1} ÷ ${num2} = ?`; break;
                    default: num2 = Math.floor(Math.random() * 100) + 1; answer = Math.floor(Math.random() * 1000) + 1; num1 = num2 * answer; question = `${num1} ÷ ${num2} = ?`;
                }
                break;
            case 'mixed':
                const ops = ['+', '-', '×', '÷'];
                const op = ops[Math.floor(Math.random() * ops.length)];
                num1 = Math.floor(Math.random() * 100) + 1;
                num2 = Math.floor(Math.random() * 100) + 1;
                if (op === '+') { answer = num1 + num2; }
                else if (op === '-') { num1 = Math.max(num1, num2); num2 = Math.min(num1, num2); answer = num1 - num2; }
                else if (op === '×') { answer = num1 * num2; }
                else { num1 = num1 * num2; answer = num2; }
                question = `${num1} ${op} ${num2} = ?`;
                break;
        }

        questions.push({
            id: i + 1,
            question: question,
            answer: answer,
            level: selectedLevel,
            type: type
        });
    }
    return questions;
}

// ==================== GEOMETRY API ====================
const geometryShapes = {
    '2d': [
        { name: 'Circle', sides: 0, vertices: 0, symmetry: 'infinite', description: 'A round shape with no corners or edges', areaFormula: 'πr²', perimeterFormula: '2πr', examples: ['Coin', 'Sun', 'Wheel'] },
        { name: 'Square', sides: 4, vertices: 4, symmetry: 4, description: 'Four equal sides with all angles 90°', areaFormula: 's²', perimeterFormula: '4s', examples: ['Book', 'Window', 'Tile'] },
        { name: 'Rectangle', sides: 4, vertices: 4, symmetry: 2, description: 'Opposite sides equal, all angles 90°', areaFormula: 'l×w', perimeterFormula: '2(l+w)', examples: ['Door', 'Table', 'Phone'] },
        { name: 'Triangle', sides: 3, vertices: 3, symmetry: 3, description: 'Three sides and three angles', areaFormula: '½bh', perimeterFormula: 'a+b+c', examples: ['Pyramid', 'Pizza slice', 'Roof'] },
        { name: 'Equilateral Triangle', sides: 3, vertices: 3, symmetry: 3, description: 'Three equal sides, all angles 60°', areaFormula: '(√3/4)s²', perimeterFormula: '3s', examples: ['Traffic sign', 'Pyramid face'] },
        { name: 'Isosceles Triangle', sides: 3, vertices: 3, symmetry: 1, description: 'Two equal sides', areaFormula: '½bh', perimeterFormula: '2a+b', examples: ['Party hat', 'Roof'] },
        { name: 'Right Triangle', sides: 3, vertices: 3, symmetry: 1, description: 'One 90° angle', areaFormula: '½ab', perimeterFormula: 'a+b+c', examples: ['Staircase', 'Roof'] },
        { name: 'Pentagon', sides: 5, vertices: 5, symmetry: 5, description: 'Five equal sides', areaFormula: '(5/2)sa', perimeterFormula: '5s', examples: ['House', 'Star'] },
        { name: 'Hexagon', sides: 6, vertices: 6, symmetry: 6, description: 'Six equal sides', areaFormula: '(3√3/2)s²', perimeterFormula: '6s', examples: ['Honeycomb', 'Snowflake'] },
        { name: 'Octagon', sides: 8, vertices: 8, symmetry: 8, description: 'Eight equal sides', areaFormula: '2(1+√2)s²', perimeterFormula: '8s', examples: ['Stop sign', 'Umbrella'] },
        { name: 'Trapezoid', sides: 4, vertices: 4, symmetry: 1, description: 'At least one pair of parallel sides', areaFormula: '½(a+b)h', perimeterFormula: 'a+b+c+d', examples: ['Bridge', 'Table'] },
        { name: 'Rhombus', sides: 4, vertices: 4, symmetry: 2, description: 'Four equal sides, opposite sides parallel', areaFormula: 'd1×d2/2', perimeterFormula: '4s', examples: ['Kite', 'Diamond'] },
        { name: 'Parallelogram', sides: 4, vertices: 4, symmetry: 2, description: 'Opposite sides parallel and equal', areaFormula: 'b×h', perimeterFormula: '2(a+b)', examples: ['Eraser', 'Book'] },
        { name: 'Kite', sides: 4, vertices: 4, symmetry: 1, description: 'Two pairs of adjacent sides equal', areaFormula: 'd1×d2/2', perimeterFormula: '2(a+b)', examples: ['Kite', 'Diamond'] },
        { name: 'Star', sides: 10, vertices: 5, symmetry: 5, description: 'Five-pointed star shape', examples: ['Starfish', 'Christmas star'] }
    ],
    '3d': [
        { name: 'Cube', vertices: 8, edges: 12, faces: 6, description: 'Six square faces', volumeFormula: 's³', surfaceAreaFormula: '6s²', examples: ['Dice', 'Box', 'Rubik\'s cube'] },
        { name: 'Sphere', vertices: 0, edges: 0, faces: 1, description: 'Perfectly round 3D shape', volumeFormula: '(4/3)πr³', surfaceAreaFormula: '4πr²', examples: ['Ball', 'Planet', 'Orange'] },
        { name: 'Cylinder', vertices: 0, edges: 2, faces: 3, description: 'Two circular bases connected by a curved surface', volumeFormula: 'πr²h', surfaceAreaFormula: '2πr(r+h)', examples: ['Can', 'Bottle', 'Pencil'] },
        { name: 'Cone', vertices: 1, edges: 1, faces: 2, description: 'Circular base tapering to a point', volumeFormula: '(1/3)πr²h', surfaceAreaFormula: 'πr(r+l)', examples: ['Ice cream cone', 'Party hat', 'Tent'] },
        { name: 'Square Pyramid', vertices: 5, edges: 8, faces: 5, description: 'Square base with four triangular sides', volumeFormula: '(1/3)Bh', surfaceAreaFormula: 'B + ½Pl', examples: ['Pyramid', 'Tent'] },
        { name: 'Rectangular Prism', vertices: 8, edges: 12, faces: 6, description: 'Six rectangular faces', volumeFormula: 'l×w×h', surfaceAreaFormula: '2(lw+lh+wh)', examples: ['Box', 'Brick', 'Book'] },
        { name: 'Triangular Prism', vertices: 6, edges: 9, faces: 5, description: 'Two triangular bases connected by three rectangles', volumeFormula: '½×b×h×l', surfaceAreaFormula: 'Perimeter×l + 2×Base', examples: ['Tent', 'Roof'] },
        { name: 'Tetrahedron', vertices: 4, edges: 6, faces: 4, description: 'Four equilateral triangular faces', volumeFormula: '(√2/12)s³', surfaceAreaFormula: '√3s²', examples: ['Pyramid', 'Crystal'] },
        { name: 'Octahedron', vertices: 6, edges: 12, faces: 8, description: 'Eight equilateral triangular faces', volumeFormula: '(√2/3)s³', surfaceAreaFormula: '2√3s²', examples: ['Diamond', 'Crystal'] },
        { name: 'Dodecahedron', vertices: 20, edges: 30, faces: 12, description: 'Twelve pentagonal faces', volumeFormula: '(15+7√5)/4 s³', surfaceAreaFormula: '3√(25+10√5) s²', examples: ['Soccer ball pattern', 'Dice'] },
        { name: 'Icosahedron', vertices: 12, edges: 30, faces: 20, description: 'Twenty equilateral triangular faces', volumeFormula: '(5(3+√5)/12)s³', surfaceAreaFormula: '5√3s²', examples: ['Soccer ball', 'Viruses'] },
        { name: 'Hemisphere', vertices: 0, edges: 1, faces: 2, description: 'Half of a sphere', volumeFormula: '(2/3)πr³', surfaceAreaFormula: '3πr²', examples: ['Bowl', 'Dome', 'Hat'] },
        { name: 'Torus', vertices: 0, edges: 0, faces: 1, description: 'Donut-shaped', volumeFormula: '2π²Rr²', surfaceAreaFormula: '4π²Rr', examples: ['Donut', 'Inner tube', 'Ring'] }
    ]
};

// ==================== ENGLISH VOCABULARY API ====================
const englishVocabulary = require('./data/english-vocabulary-server.json');

// ==================== GRAMMAR RULES API ====================
const grammarRules = [
    { rule: 'Present Simple Tense', description: 'For habits, routines, and general truths', example: 'I eat breakfast every day.', level: 'primary1' },
    { rule: 'Present Simple - Third Person', description: 'Add -s or -es for he/she/it', example: 'She reads books.', level: 'primary1' },
    { rule: 'Present Simple - Negative', description: 'Use do not/don\'t or does not/doesn\'t', example: 'I don\'t like carrots.', level: 'primary2' },
    { rule: 'Present Simple - Question', description: 'Start with Do or Does', example: 'Do you like apples?', level: 'primary2' },
    { rule: 'Present Continuous Tense', description: 'For actions happening now', example: 'I am eating lunch.', level: 'primary2' },
    { rule: 'Present Continuous - Negative', description: 'Add not after am/is/are', example: 'She is not sleeping.', level: 'primary2' },
    { rule: 'Past Simple Tense', description: 'For completed actions in the past', example: 'I ate breakfast.', level: 'primary3' },
    { rule: 'Past Simple - Irregular', description: 'Irregular verbs have special past forms', example: 'She went to school.', level: 'primary3' },
    { rule: 'Past Simple - Negative', description: 'Use did not/didn\'t', example: 'I didn\'t go to the park.', level: 'primary3' },
    { rule: 'Future Simple with Will', description: 'For future predictions or decisions', example: 'I will help you.', level: 'primary4' },
    { rule: 'Future Simple - Negative', description: 'Use will not/won\'t', example: 'She won\'t come.', level: 'primary4' },
    { rule: 'Present Perfect Tense', description: 'For actions that started in the past and continue', example: 'I have lived here for 5 years.', level: 'primary5' },
    { rule: 'Present Perfect - Negative', description: 'Use have not/haven\'t or has not/hasn\'t', example: 'She hasn\'t finished.', level: 'primary5' },
    { rule: 'Modal Verb - Can', description: 'Ability or possibility', example: 'I can swim.', level: 'primary2' },
    { rule: 'Modal Verb - May', description: 'Permission or possibility', example: 'May I go?', level: 'primary3' },
    { rule: 'Modal Verb - Must', description: 'Obligation', example: 'You must study.', level: 'primary3' },
    { rule: 'Modal Verb - Should', description: 'Advice', example: 'You should drink water.', level: 'primary4' },
    { rule: 'Comparative Adjectives', description: 'Compare two things', example: 'The cat is bigger than the mouse.', level: 'primary3' },
    { rule: 'Superlative Adjectives', description: 'Compare three or more things', example: 'This is the biggest apple.', level: 'primary3' },
    { rule: 'Possessive Adjectives', description: 'Show ownership', example: 'My book, your pen.', level: 'primary2' },
    { rule: 'Possessive Nouns', description: "Add 's to show ownership", example: 'The cat\'s tail.', level: 'primary3' },
    { rule: 'Contractions', description: 'Shortened forms', example: 'I\'m = I am, don\'t = do not', level: 'primary2' },
    { rule: 'Zero Conditional', description: 'For general truths', example: 'If it rains, the ground gets wet.', level: 'primary5' },
    { rule: 'First Conditional', description: 'For possible future', example: 'If it rains, we will stay home.', level: 'primary5' },
    { rule: 'Second Conditional', description: 'For hypothetical situations', example: 'If I had wings, I would fly.', level: 'primary6' },
    { rule: 'Passive Voice', description: 'Focus on the receiver of action', example: 'The cake was eaten.', level: 'primary5' },
    { rule: 'Subject-Verb Agreement', description: 'Subject and verb must agree', example: 'He plays. They play.', level: 'primary3' },
    { rule: 'Yes/No Questions', description: 'Questions that can be answered yes or no', example: 'Do you like ice cream?', level: 'primary2' },
    { rule: 'Wh-Questions', description: 'Questions with who, what, where, when, why, how', example: 'What is your name?', level: 'primary2' },
    { rule: 'Simple Sentences', description: 'One independent clause', example: 'The cat is black.', level: 'primary1' },
    { rule: 'Compound Sentences', description: 'Two independent clauses joined by and, but, or', example: 'I like apples and she likes oranges.', level: 'primary3' },
    { rule: 'Complex Sentences', description: 'One independent and one dependent clause', example: 'When it rains, we stay inside.', level: 'primary4' },
    { rule: 'Nouns', description: 'Naming words', example: 'apple, book, cat', level: 'primary1' },
    { rule: 'Verbs', description: 'Action or state of being', example: 'eat, run, be', level: 'primary1' },
    { rule: 'Adjectives', description: 'Describing words', example: 'big, happy, red', level: 'primary2' },
    { rule: 'Adverbs', description: 'Describe verbs, adjectives, or other adverbs', example: 'quickly, happily, very', level: 'primary3' },
    { rule: 'Pronouns', description: 'Replace nouns', example: 'I, you, he, she, it', level: 'primary2' },
    { rule: 'Prepositions', description: 'Show position or direction', example: 'in, on, under', level: 'primary2' },
    { rule: 'Articles', description: 'a, an, the', example: 'a cat, an apple, the book', level: 'primary1' }
];

// ==================== SCIENCE FACTS API ====================
const scienceFacts = [
    { topic: 'plants', fact: 'Plants make their own food through photosynthesis.', explanation: 'They use sunlight, water, and carbon dioxide to make glucose.', level: 'primary3' },
    { topic: 'plants', fact: 'Leaves are green because they contain chlorophyll.', explanation: 'Chlorophyll helps plants capture sunlight for photosynthesis.', level: 'primary3' },
    { topic: 'plants', fact: 'Flowers help plants reproduce.', explanation: 'They produce seeds that grow into new plants.', level: 'primary2' },
    { topic: 'plants', fact: 'Trees take in carbon dioxide and release oxygen.', explanation: 'This helps clean the air we breathe.', level: 'primary2' },
    { topic: 'plants', fact: 'Edelweiss grows in the Alps mountains.', explanation: 'It is a symbol of the Alps and Switzerland.', level: 'primary4' },
    { topic: 'plants', fact: 'Tulips are the national flower of the Netherlands.', explanation: 'Millions of tulips bloom in Holland each spring.', level: 'primary4' },
    { topic: 'animals', fact: 'Bees help plants grow by carrying pollen.', explanation: 'This process is called pollination.', level: 'primary2' },
    { topic: 'animals', fact: 'Butterflies go through metamorphosis.', explanation: 'They change from caterpillars to butterflies.', level: 'primary2' },
    { topic: 'animals', fact: 'Fish breathe underwater using gills.', explanation: 'Gills extract oxygen from water.', level: 'primary3' },
    { topic: 'animals', fact: 'Birds have hollow bones to help them fly.', explanation: 'Hollow bones make them lighter.', level: 'primary3' },
    { topic: 'animals', fact: 'European bison are the largest land animals in Europe.', explanation: 'They can weigh over 1000 kg.', level: 'primary4' },
    { topic: 'animals', fact: 'Scottish wildcats are one of the rarest cats.', explanation: 'There are very few left in the wild.', level: 'primary4' },
    { topic: 'weather', fact: 'Rain forms when water vapor condenses.', explanation: 'Water vapor turns into liquid water droplets.', level: 'primary3' },
    { topic: 'weather', fact: 'Thunder is caused by lightning.', explanation: 'Lightning heats the air, causing it to expand rapidly.', level: 'primary3' },
    { topic: 'weather', fact: 'Rainbows appear when sunlight passes through water droplets.', explanation: 'The light bends and separates into colors.', level: 'primary2' },
    { topic: 'weather', fact: 'Norway has the midnight sun in summer.', explanation: 'The sun stays visible at midnight in the north.', level: 'primary4' },
    { topic: 'weather', fact: 'Iceland has geysers that shoot hot water.', explanation: 'Underground heat boils water, creating geysers.', level: 'primary4' },
    { topic: 'space', fact: 'Earth is the third planet from the Sun.', explanation: 'The order is: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune.', level: 'primary3' },
    { topic: 'space', fact: 'The Moon orbits around Earth.', explanation: 'It takes about 27 days to complete one orbit.', level: 'primary2' },
    { topic: 'space', fact: 'Stars are huge balls of hot gas.', explanation: 'They produce light and heat through nuclear fusion.', level: 'primary3' },
    { topic: 'space', fact: 'The Sun is a star.', explanation: 'It is the closest star to Earth.', level: 'primary2' },
    { topic: 'space', fact: 'The European Space Agency explores space.', explanation: 'ESA has missions to Mars and beyond.', level: 'primary4' },
    { topic: 'space', fact: 'Galileo Galilei was an Italian astronomer.', explanation: 'He made important discoveries with his telescope.', level: 'primary4' },
    { topic: 'chemistry', fact: 'Water is made of hydrogen and oxygen.', explanation: 'The chemical formula is H2O.', level: 'primary4' },
    { topic: 'chemistry', fact: 'Air is mostly nitrogen and oxygen.', explanation: 'About 78% nitrogen, 21% oxygen.', level: 'primary4' },
    { topic: 'chemistry', fact: 'Plants produce oxygen through photosynthesis.', explanation: 'This oxygen is what we breathe.', level: 'primary3' },
    { topic: 'chemistry', fact: 'Iron rusts when exposed to water and air.', explanation: 'This is a chemical reaction called oxidation.', level: 'primary4' },
    { topic: 'biology', fact: 'The human body has 206 bones.', explanation: 'Babies are born with more bones that fuse together.', level: 'primary4' },
    { topic: 'biology', fact: 'The heart pumps blood around the body.', explanation: 'It beats about 70 times per minute.', level: 'primary3' },
    { topic: 'biology', fact: 'Cells are the building blocks of life.', explanation: 'All living things are made of cells.', level: 'primary4' },
    { topic: 'biology', fact: 'DNA contains genetic information.', explanation: 'It tells cells how to grow and function.', level: 'primary5' },
    { topic: 'physics', fact: 'Gravity keeps us on the ground.', explanation: 'Earth\'s gravity pulls objects toward its center.', level: 'primary3' },
    { topic: 'physics', fact: 'Light travels faster than sound.', explanation: 'That\'s why we see lightning before we hear thunder.', level: 'primary3' },
    { topic: 'physics', fact: 'Magnets attract iron and steel.', explanation: 'They have north and south poles.', level: 'primary2' },
    { topic: 'physics', fact: 'Electricity flows through wires.', explanation: 'Electrons move from atom to atom.', level: 'primary4' },
    { topic: 'physics', fact: 'Sound is caused by vibrations.', explanation: 'Vibrations travel through air to our ears.', level: 'primary3' }
];

// ==================== PUBLIC API ENDPOINTS ====================

// Math Questions
app.get('/api/math/questions', (req, res) => {
    const count = parseInt(req.query.count) || 10;
    const type = req.query.type || 'mixed';
    const level = req.query.level || 'random';
    
    const questions = generateMathQuestions(count, type, level);
    res.json({ success: true, data: questions });
});

// Geometry Shapes
app.get('/api/geometry/shapes', (req, res) => {
    const dimension = req.query.dimension;
    if (dimension && (dimension === '2d' || dimension === '3d')) {
        res.json({ success: true, data: geometryShapes[dimension] });
    } else {
        res.json({ success: true, data: geometryShapes });
    }
});

// English Vocabulary
app.get('/api/english/vocabulary', (req, res) => {
    const level = req.query.level;
    const limit = parseInt(req.query.limit) || englishVocabulary.length;
    
    let filtered = englishVocabulary;
    if (level) {
        filtered = englishVocabulary.filter(word => word.level === level);
    }
    
    res.json({ success: true, data: filtered.slice(0, limit) });
});

// Grammar Rules
app.get('/api/english/grammar', (req, res) => {
    const level = req.query.level;
    
    let filtered = grammarRules;
    if (level) {
        filtered = grammarRules.filter(rule => rule.level === level);
    }
    
    res.json({ success: true, data: filtered });
});

// Science Facts
app.get('/api/science/facts', (req, res) => {
    const topic = req.query.topic;
    const level = req.query.level;
    
    let filtered = scienceFacts;
    if (topic) {
        filtered = filtered.filter(fact => fact.topic === topic);
    }
    if (level) {
        filtered = filtered.filter(fact => fact.level === level);
    }
    
    res.json({ success: true, data: filtered });
});

// Health Tips
app.get('/api/health/tips', (req, res) => {
    const healthTips = [
        { id: 1, title: 'Drink Water', tip: 'Drink 8 glasses of water every day', category: 'hydration' },
        { id: 2, title: 'Eat Vegetables', tip: 'Eat at least 5 servings of vegetables daily', category: 'nutrition' },
        { id: 3, title: 'Exercise', tip: 'Exercise for at least 30 minutes a day', category: 'fitness' },
        { id: 4, title: 'Sleep Well', tip: 'Get 8-10 hours of sleep each night', category: 'sleep' },
        { id: 5, title: 'Wash Hands', tip: 'Wash your hands before eating and after using the bathroom', category: 'hygiene' },
        { id: 6, title: 'Brush Teeth', tip: 'Brush your teeth twice a day', category: 'hygiene' },
        { id: 7, title: 'Eat Fruit', tip: 'Eat fresh fruit every day', category: 'nutrition' },
        { id: 8, title: 'Play Outside', tip: 'Spend time playing outside in the sunshine', category: 'fitness' },
        { id: 9, title: 'Breathe Fresh Air', tip: 'Open windows to let fresh air in', category: 'health' },
        { id: 10, title: 'Smile', tip: 'Smile and be happy every day!', category: 'mental' }
    ];
    res.json({ success: true, data: healthTips });
});

// Stories
app.get('/api/stories', (req, res) => {
    const stories = [
        { id: 1, title: 'The Little Prince', author: 'Antoine de Saint-Exupéry', summary: 'A story about a prince who travels from planet to planet.', category: 'fantasy', level: 'primary3' },
        { id: 2, title: 'Charlotte\'s Web', author: 'E.B. White', summary: 'A pig named Wilbur and his spider friend Charlotte.', category: 'animal', level: 'primary3' },
        { id: 3, title: 'Matilda', author: 'Roald Dahl', summary: 'A little girl with special powers.', category: 'fantasy', level: 'primary4' },
        { id: 4, title: 'Charlie and the Chocolate Factory', author: 'Roald Dahl', summary: 'A boy wins a tour of a magical chocolate factory.', category: 'fantasy', level: 'primary3' },
        { id: 5, title: 'Alice in Wonderland', author: 'Lewis Carroll', summary: 'A girl falls down a rabbit hole into a magical world.', category: 'fantasy', level: 'primary4' },
        { id: 6, title: 'Peter Pan', author: 'J.M. Barrie', summary: 'The boy who never grows up.', category: 'fantasy', level: 'primary3' },
        { id: 7, title: 'The Tale of Peter Rabbit', author: 'Beatrix Potter', summary: 'A mischievous rabbit named Peter.', category: 'animal', level: 'primary2' },
        { id: 8, title: 'Winnie the Pooh', author: 'A.A. Milne', summary: 'The adventures of Pooh and his friends in the Hundred Acre Wood.', category: 'animal', level: 'primary2' },
        { id: 9, title: 'James and the Giant Peach', author: 'Roald Dahl', summary: 'A boy escapes to New York City inside a giant peach.', category: 'fantasy', level: 'primary4' },
        { id: 10, title: 'The BFG', author: 'Roald Dahl', summary: 'A Big Friendly Giant and a little girl go on an adventure.', category: 'fantasy', level: 'primary4' }
    ];
    res.json({ success: true, data: stories });
});

// Daily Affirmations
app.get('/api/affirmations', (req, res) => {
    const affirmations = [
        { id: 1, text: 'I am smart and capable.', category: 'confidence' },
        { id: 2, text: 'I can do hard things.', category: 'courage' },
        { id: 3, text: 'Mistakes help me learn.', category: 'learning' },
        { id: 4, text: 'I am kind and helpful.', category: 'kindness' },
        { id: 5, text: 'I love learning new things.', category: 'curiosity' },
        { id: 6, text: 'I am special and unique.', category: 'self-esteem' },
        { id: 7, text: 'I can make a difference.', category: 'impact' },
        { id: 8, text: 'Today is going to be a great day!', category: 'positivity' },
        { id: 9, text: 'I am loved and cared for.', category: 'love' },
        { id: 10, text: 'I believe in myself.', category: 'confidence' }
    ];
    res.json({ success: true, data: affirmations });
});

// Random Jokes
app.get('/api/jokes', (req, res) => {
    const jokes = [
        { id: 1, question: 'Why did the teddy bear say no to dessert?', answer: 'Because it was already stuffed!' },
        { id: 2, question: 'What do you call fake spaghetti?', answer: 'An impasta!' },
        { id: 3, question: 'Why don\'t skeletons fight each other?', answer: 'They don\'t have the guts!' },
        { id: 4, question: 'What do you call a snowman in July?', answer: 'A puddle!' },
        { id: 5, question: 'Why did the scarecrow win an award?', answer: 'Because he was outstanding in his field!' },
        { id: 6, question: 'What do you get when you cross a snowman and a vampire?', answer: 'Frostbite!' },
        { id: 7, question: 'Why did the math book look sad?', answer: 'Because it had too many problems!' },
        { id: 8, question: 'What do you call a bear with no teeth?', answer: 'A gummy bear!' },
        { id: 9, question: 'Why don\'t scientists trust atoms?', answer: 'Because they make up everything!' },
        { id: 10, question: 'What do you call a dog that can do magic?', answer: 'A labracadabrador!' }
    ];
    res.json({ success: true, data: jokes });
});

// European Culture
app.get('/api/culture/europe', (req, res) => {
    const europeanCulture = [
        { country: 'United Kingdom', capital: 'London', language: 'English', famousFood: 'Fish and Chips', landmark: 'Big Ben', funFact: 'The UK has more castles than any other country in Europe.' },
        { country: 'France', capital: 'Paris', language: 'French', famousFood: 'Croissant', landmark: 'Eiffel Tower', funFact: 'France is the most visited country in the world.' },
        { country: 'Germany', capital: 'Berlin', language: 'German', famousFood: 'Sausages', landmark: 'Brandenburg Gate', funFact: 'Germany has over 1,500 different types of sausages.' },
        { country: 'Italy', capital: 'Rome', language: 'Italian', famousFood: 'Pizza', landmark: 'Colosseum', funFact: 'Italy is home to the oldest university in Europe.' },
        { country: 'Spain', capital: 'Madrid', language: 'Spanish', famousFood: 'Paella', landmark: 'Sagrada Familia', funFact: 'Spain produces more olive oil than any other country.' },
        { country: 'Netherlands', capital: 'Amsterdam', language: 'Dutch', famousFood: 'Stroopwafel', landmark: 'Windmills', funFact: 'The Netherlands has more bicycles than people.' },
        { country: 'Switzerland', capital: 'Bern', language: 'German, French, Italian', famousFood: 'Chocolate', landmark: 'Matterhorn', funFact: 'Switzerland has the highest mountains in Europe.' },
        { country: 'Greece', capital: 'Athens', language: 'Greek', famousFood: 'Gyro', landmark: 'Acropolis', funFact: 'Greece invented democracy.' },
        { country: 'Norway', capital: 'Oslo', language: 'Norwegian', famousFood: 'Salmon', landmark: 'Fjords', funFact: 'Norway has the longest coastline in Europe.' },
        { country: 'Poland', capital: 'Warsaw', language: 'Polish', famousFood: 'Pierogi', landmark: 'Warsaw Old Town', funFact: 'Poland has the largest castle in the world.' }
    ];
    res.json({ success: true, data: europeanCulture });
});

// Fun Facts
app.get('/api/funfacts', (req, res) => {
    const funFacts = [
        { id: 1, fact: 'A group of flamingos is called a flamboyance.', category: 'animals' },
        { id: 2, fact: 'Bananas are berries, but strawberries are not.', category: 'food' },
        { id: 3, fact: 'The shortest war in history lasted only 38 minutes.', category: 'history' },
        { id: 4, fact: 'Octopuses have three hearts.', category: 'animals' },
        { id: 5, fact: 'The Eiffel Tower can grow up to 15 cm taller in summer.', category: 'science' },
        { id: 6, fact: 'Honey never spoils.', category: 'food' },
        { id: 7, fact: 'A day on Venus is longer than a year on Venus.', category: 'space' },
        { id: 8, fact: 'There are more stars in the universe than grains of sand on all beaches.', category: 'space' },
        { id: 9, fact: 'Cows have best friends.', category: 'animals' },
        { id: 10, fact: 'The first computer mouse was made of wood.', category: 'technology' }
    ];
    res.json({ success: true, data: funFacts });
});

// Health Check
app.get('/api/health', (req, res) => {
    const watchdog = require('./services/watchdog');
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: '2.0.0',
        watchdog: watchdog.metrics
    });
});

// Alert Routes
const alertRoutes = require('./routes/alerts');
app.use('/api/alerts', authenticateToken, alertRoutes);

// Prometheus Metrics
const metrics = require('./utils/metrics');
app.get('/api/metrics', async (req, res) => {
    const metricsBody = await metrics.getMetrics();
    res.set('Content-Type', metrics.getContentType());
    res.send(metricsBody);
});

// Root Route - Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'docs', 'robot_terminal.html'));
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Endpoint not found' });
});

// WebSocket Server
const { createWSServer } = require('./services/websocket-server');

// Start Server (only when run directly, not when required as module)
if (require.main === module) {
    const http = require('http');
    const server = http.createServer(app);
    createWSServer(server);

    // Xiaozhi-style agent WebSocket server (supports Xiaozhi protocol)
    // Save all current upgrade listeners (from the existing /ws WebSocketServer)
    const upgradeListeners = server.listeners('upgrade');
    server.removeAllListeners('upgrade');

    // Create our Xiaozhi handler
    const { WebSocketServer: XiaozhiWSS } = require('ws');
    const xiaozhiWss = new XiaozhiWSS({ noServer: true });

    // Unified upgrade router
    server.on('upgrade', (req, socket, head) => {
      const pathname = new URL(req.url, 'http://localhost').pathname;
      if (pathname === '/xiaozhi') {
        xiaozhiWss.handleUpgrade(req, socket, head, (ws) => {
          xiaozhiWss.emit('connection', ws, req);
        });
      } else {
        // Forward to the existing /ws handlers
        for (const listener of upgradeListeners) {
          // ws library uses an internal method, call it or check path
          listener.call(server, req, socket, head);
        }
        // If no handler handled it, close the socket
        socket.destroy();
      }
    });

    xiaozhiWss.on('connection', (ws, req) => {
      const sessionId = 'ws_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
      const dialogue = [];
      let aborted = false;

      ws.on('message', async (data) => {
        let msg;
        try { msg = JSON.parse(data.toString()); } catch (e) { return; }

        if (msg.type === 'hello') {
          aborted = false;
          ws.send(JSON.stringify({
            type: 'welcome',
            session_id: sessionId,
            audio_params: { sample_rate: 24000, format: 'opus' },
            code: 0
          }));
          return;
        }

        if (msg.type === 'listen' && msg.text) {
          dialogue.push({ role: 'user', content: msg.text });
          aborted = false;
          ws.send(JSON.stringify({ type: 'tts', state: 'start' }));

          let fullText = '';
          try {
            const resp = await fetch('http://localhost:' + PORT + '/api/voice-chat/llm/chat/stream', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: msg.text,
                sessionId: msg.session_id || sessionId,
                systemPrompt: 'You are a learning companion robot. Be friendly and educational.',
                maxTokens: 512
              })
            });

            const reader = resp.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
              if (aborted) break;
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value);
              const lines = chunk.split('\n');
              for (const line of lines) {
                if (aborted) break;
                if (line.startsWith('data: ')) {
                  try {
                    const d = JSON.parse(line.slice(6));
                    if (d.text) {
                      fullText += d.text;
                      ws.send(JSON.stringify({ type: 'tts', state: 'sentence_start', text: d.text }));
                    }
                  } catch (_) {}
                }
              }
            }
          } catch (e) {
            if (!aborted) {
              ws.send(JSON.stringify({ type: 'tts', state: 'sentence_start', text: 'Sorry, I had an error.' }));
            }
          }

          dialogue.push({ role: 'assistant', content: fullText });
          if (!aborted) {
            ws.send(JSON.stringify({ type: 'tts', state: 'stop' }));
          }
          return;
        }

        if (msg.type === 'abort') {
          aborted = true;
          dialogue.length = 0;
          ws.send(JSON.stringify({ type: 'tts', state: 'stop' }));
          return;
        }

        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
          return;
        }
      });

      ws.on('close', () => {});
      ws.on('error', () => {});
    });

    console.log('🤖 Xiaozhi agent WebSocket available at: ws://localhost:' + PORT + '/xiaozhi');

    // Create default demo robot
    const demoRobot = robotManager.createRobot('robomate-001', 2);
    demoRobot.start();
    
    // Initialize crawler engine (Playwright) in background
    const crawlerEngine = require('./services/crawler-engine');
    crawlerEngine.init().then(() => {
        console.log(`🌐 Playwright JS rendering engine: ${crawlerEngine.isReady ? 'READY' : 'UNAVAILABLE'}`);
    });
    
    // Content service auto-initializes on require; wait for readiness
    const contentService = require('./services/content-service');
    contentService.waitForReady().then(() => {
        console.log(`📚 Content service: ${contentService.items.length} items across ${Object.keys(contentService.getStats().byCategory).length} categories`);
    });

    // Initialize TTS
    const tts = require('./services/tts');

    // Start Watchdog (CPU/memory monitoring & auto-restart)
    const watchdog = require('./services/watchdog');
    watchdog.start();
    // Register robot heartbeat as a service check
    watchdog.registerServiceCheck('robot-hal', () => {
      return demoRobot && demoRobot.state !== 'offline';
    });

    // Start Health Monitor
    healthMonitor.start(30000);
    healthMonitor.registerCheck('database', async () => {
      try { await db.get('SELECT 1'); return { status: 'ok' }; } catch (e) { return { status: 'error', error: e.message }; }
    });
    healthMonitor.registerCheck('demo-robot', () => ({ status: demoRobot.state, battery: demoRobot.getStatus().battery }));

    // Start Active Service (proactive reminders & schedules)
    activeService.start();
    // Add a daily learning reminder schedule for demo
    activeService.addSchedule(2, 'learning_reminder', {
      type: 'cron', times: ['09:00', '14:00', '18:00'],
      data: { message: 'Time for fun learning with RoboBuddy!' }
    });

    // Configure Smart Home simulated devices
    const smartHome = require('./services/smart-home');
    smartHome.discoverDevices();

    server.listen(PORT, () => {
        console.log(`🚀 Learning Companion Robot Server running on http://localhost:${PORT}`);
        console.log(`📁 Static files served from: ${path.join(__dirname, 'docs')}`);
        console.log(`🔗 API endpoints available at: http://localhost:${PORT}/api/`);
        console.log(`🔌 WebSocket available at: ws://localhost:${PORT}/ws`);
        console.log(`🤖 Demo robot: robomate-001 [${demoRobot.state}]`);
        console.log(`🗣️  TTS engine: ${tts.isAvailable ? `AVAILABLE (${tts.engineName})` : 'unavailable (no permissive engine)'}`);
        console.log(`🛡️  Watchdog: ${watchdog.metrics.status} (CPU>${watchdog.cpuThreshold}%/${watchdog.cpuWindow}ms, MEM>${watchdog.memThreshold}MB)`);
        console.log(`📊 Health Monitor: active (${Object.keys(healthMonitor.checks).length} checks)`);
        console.log(`📅 Active Service: running (${activeService.getStats().pendingReminders} pending reminders)`);
        console.log(`🏠 Smart Home: ${smartHome.getStats().totalDevices} devices configured`);
        console.log(`🌐 Playwright JS rendering engine: ${crawlerEngine.isReady ? 'READY' : 'UNAVAILABLE (run "npx playwright install chromium")'}`);
    });
}

module.exports = app;