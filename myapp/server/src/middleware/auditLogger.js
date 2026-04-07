const pool = require('../../config/db');

/**
 * Audit Logger Middleware
 * Logs all mutating (POST, PATCH, PUT, DELETE) requests to the audit_logs table.
 */
const auditLogger = async (req, res, next) => {
  // Only log mutating requests
  if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
    return next();
  }

  // Store original res.json to intercept the response
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    // Log asynchronously — don't block the response
    const userId = req.user?.id || null;
    const action = `${req.method} ${req.originalUrl}`;
    const entityType = extractEntityType(req.originalUrl);
    const entityId = extractEntityId(req.originalUrl, body);
    const details = {
      body: sanitizeBody(req.body),
      responseStatus: res.statusCode,
      entityType: extractEntityType(req.originalUrl),
      entityId: extractEntityId(req.originalUrl, body),
      ip: req.ip || req.headers['x-forwarded-for'] || 'unknown'
    };

    pool.execute(
      'INSERT INTO audit_logs (action, user_id, details) VALUES (?, ?, ?)',
      [action, userId, JSON.stringify(details)]
    ).catch(err => console.error('Audit log error:', err.message));

    return originalJson(body);
  };

  next();
};

function extractEntityType(url) {
  const parts = url.split('/').filter(Boolean);
  // /api/leaves -> leaves, /api/users -> users
  if (parts.length >= 2) return parts[1];
  return 'unknown';
}

function extractEntityId(url, body) {
  const parts = url.split('/').filter(Boolean);
  // /api/leaves/5 -> 5
  for (const part of parts) {
    if (/^\d+$/.test(part)) return parseInt(part);
  }
  // From response body
  if (body?.id) return body.id;
  return null;
}

function sanitizeBody(body) {
  if (!body) return {};
  const sanitized = { ...body };
  // Remove sensitive fields
  delete sanitized.password;
  delete sanitized.token;
  return sanitized;
}

module.exports = auditLogger;
