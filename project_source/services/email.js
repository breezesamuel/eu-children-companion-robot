const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || 'hello@robobuddy.eu';
const FROM_NAME = process.env.FROM_NAME || 'RoboBuddy';
const logger = require('../utils/logger');

const emailQueue = [];
let queueProcessing = false;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

const TEMPLATES = {
  welcome: (vars) => ({
    subject: 'Welcome to RoboBuddy, ' + (vars.name || '') + '!',
    html: '<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:20px">'
      + '<h1 style="color:#4f46e5">Welcome, ' + vars.name + '!</h1>'
      + '<p>We\'re excited to have you on board. Your RoboBuddy learning companion is ready to set up.</p>'
      + '<div style="text-align:center;margin:24px 0">'
      + '<a href="' + (vars.appUrl || process.env.APP_URL || 'http://localhost:3000') + '" style="background:#4f46e5;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none">Get Started</a></div>'
      + '<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">'
      + '<p style="color:#6b7280;font-size:12px">Your RoboBuddy Team</p></div>',
  }),
  orderConfirmation: (vars) => ({
    subject: 'Order #' + vars.orderId + ' Confirmed – RoboBuddy',
    html: '<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:20px">'
      + '<h1 style="color:#059669">Thank you for your order!</h1>'
      + '<p>Order <strong>#' + vars.orderId + '</strong></p>'
      + '<p>Total: <strong>€' + vars.amount + '</strong></p>'
      + '<p>' + (vars.items || 'Your RoboBuddy') + '</p>'
      + '<p>We\'ll notify you when your order ships.</p>'
      + '<hr><p style="color:#6b7280;font-size:12px">RoboBuddy Support</p></div>',
  }),
  passwordReset: (vars) => ({
    subject: 'Reset Your RoboBuddy Password',
    html: '<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:20px">'
      + '<h1 style="color:#d97706">Password Reset</h1>'
      + '<p>Click the link below to reset your password. This link expires in 1 hour.</p>'
      + '<div style="text-align:center;margin:24px 0">'
      + '<a href="' + vars.resetUrl + '" style="background:#d97706;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none">Reset Password</a></div>'
      + '<p style="color:#6b7280;font-size:12px">If you didn\'t request this, ignore this email.</p></div>',
  }),
  learningReport: (vars) => ({
    subject: vars.childName + '\'s Weekly Learning Report',
    html: '<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:20px">'
      + '<h1 style="color:#4f46e5">Weekly Learning Report</h1>'
      + '<p><strong>' + vars.childName + '</strong> had a great week!</p>'
      + '<table style="width:100%;border-collapse:collapse;margin:16px 0">'
      + '<tr><td style="padding:8px;border:1px solid #e5e7eb">Sessions</td><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold">' + vars.sessions + '</td></tr>'
      + '<tr><td style="padding:8px;border:1px solid #e5e7eb">Minutes</td><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold">' + vars.minutes + '</td></tr>'
      + '<tr><td style="padding:8px;border:1px solid #e5e7eb">Avg Score</td><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold">' + vars.avgScore + '%</td></tr>'
      + '<tr><td style="padding:8px;border:1px solid #e5e7eb">Subjects</td><td style="padding:8px;border:1px solid #e5e7eb">' + vars.subjects + '</td></tr>'
      + '</table>'
      + '<p style="color:#6b7280;font-size:12px">RoboBuddy Learning</p></div>',
  }),
  achievement: (vars) => ({
    subject: vars.childName + ' Unlocked: ' + vars.achievement + '!',
    html: '<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:20px;text-align:center">'
      + '<div style="font-size:48px;margin:16px 0">🏆</div>'
      + '<h1 style="color:#9c27b0">Achievement Unlocked!</h1>'
      + '<p><strong>' + vars.childName + '</strong> earned the <strong>' + vars.achievement + '</strong> badge!</p>'
      + '<p style="color:#6b7280">Keep up the great learning!</p>'
      + '<hr><p style="color:#6b7280;font-size:12px">RoboBuddy</p></div>',
  }),
  deviceAlert: (vars) => ({
    subject: 'Alert: ' + vars.deviceName + ' (' + vars.alertType + ')',
    html: '<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:20px">'
      + '<h1 style="color:#dc2626">⚠️ Device Alert</h1>'
      + '<p><strong>' + vars.deviceName + '</strong> (' + vars.deviceId + ')</p>'
      + '<p>Type: ' + vars.alertType + '</p>'
      + '<p>' + vars.message + '</p>'
      + '<p style="color:#6b7280;font-size:12px">Logged at ' + vars.timestamp + '</p></div>',
  }),
};

function getTemplate(name, variables) {
  const template = TEMPLATES[name];
  if (!template) return null;
  try { return template(variables || {}); }
  catch (e) { logger.error('Template render failed', { template: name, error: e.message }); return null; }
}

async function sendWithProvider(provider, options) {
  switch (provider) {
    case 'sendgrid': {
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(SENDGRID_API_KEY);
      await sgMail.send({
        to: options.to, from: { email: FROM_EMAIL, name: FROM_NAME },
        subject: options.subject, html: options.html,
      });
      return 'sendgrid';
    }
    case 'smtp': {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST, port: SMTP_PORT, secure: SMTP_PORT === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      });
      await transporter.sendMail({
        from: '"' + FROM_NAME + '" <' + FROM_EMAIL + '>',
        to: options.to, subject: options.subject, html: options.html,
      });
      return 'smtp';
    }
    case 'console': {
      logger.info('Email (console)', { to: options.to, subject: options.subject });
      return 'console';
    }
    default:
      throw new Error('Unknown provider: ' + provider);
  }
}

async function sendEmail(to, subject, html, { retryCount = 0 } = {}) {
  const providers = [];
  if (SENDGRID_API_KEY) providers.push('sendgrid');
  if (SMTP_HOST && SMTP_USER) providers.push('smtp');
  providers.push('console');

  for (const provider of providers) {
    try {
      await sendWithProvider(provider, { to, subject, html });
      logger.info('Email sent', { to, subject, provider });
      return true;
    } catch (e) {
      logger.warn('Email provider failed', { provider, error: e.message, to });
    }
  }

  if (retryCount < MAX_RETRIES) {
    logger.info('Retrying email', { to, subject, attempt: retryCount + 1 });
    await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (retryCount + 1)));
    return sendEmail(to, subject, html, { retryCount: retryCount + 1 });
  }

  logger.error('Email failed after all retries', { to, subject });
  return false;
}

function queueEmail(to, subject, html) {
  emailQueue.push({ to, subject, html, queuedAt: new Date() });
  if (!queueProcessing) processQueue();
  return emailQueue.length;
}

async function processQueue() {
  queueProcessing = true;
  while (emailQueue.length > 0) {
    const item = emailQueue.shift();
    try {
      await sendEmail(item.to, item.subject, item.html);
    } catch (e) {
      logger.error('Queue email failed', { error: e.message, to: item.to });
    }
    await new Promise(r => setTimeout(r, 500));
  }
  queueProcessing = false;
}

async function sendTemplated(template, to, variables) {
  const rendered = getTemplate(template, variables);
  if (!rendered) throw new Error('Unknown template: ' + template);
  return sendEmail(to, rendered.subject, rendered.html);
}

async function sendOrderConfirmation(email, orderDetails) {
  return sendTemplated('orderConfirmation', email, {
    orderId: orderDetails.id,
    amount: ((orderDetails.amount_total || 0) / 100).toFixed(2),
    items: (orderDetails.items || []).map(i => i.name || i.description).join(', ') || 'RoboBuddy items',
  });
}

async function sendWelcomeEmail(email, name) {
  return sendTemplated('welcome', email, { name });
}

async function sendPasswordReset(email, resetUrl) {
  return sendTemplated('passwordReset', email, { resetUrl });
}

async function sendLearningReport(email, data) {
  return sendTemplated('learningReport', email, data);
}

async function sendAchievement(email, data) {
  return sendTemplated('achievement', email, data);
}

async function sendAlert(email, data) {
  return sendTemplated('deviceAlert', email, data);
}

function getQueueLength() { return emailQueue.length; }

module.exports = {
  sendEmail, sendTemplated, queueEmail, getQueueLength, getTemplate,
  sendOrderConfirmation, sendWelcomeEmail, sendPasswordReset,
  sendLearningReport, sendAchievement, sendAlert,
  TEMPLATES,
};
