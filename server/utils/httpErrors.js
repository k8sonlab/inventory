const GENERIC_MESSAGE = 'Internal server error';
const CONFLICT_MESSAGE = 'Request conflicts with existing data';

function isConstraintError(error) {
  return /^23\d{3}$/.test(error?.code || '') || /constraint failed/i.test(error?.message || '');
}

function isDatabaseError(error) {
  return /^[0-9A-Z]{5}$/.test(error?.code || '') ||
    /SQLITE_|no such (table|column)|syntax error|database (is )?(locked|corrupt)|connection terminated|ECONNREFUSED|ETIMEDOUT/i.test(error?.message || '');
}

// Validation messages pass through; database details never reach the client.
export function sendError(res, error, status = 500) {
  if (isConstraintError(error)) {
    console.error('Database constraint error:', error);
    return res.status(409).json({ error: CONFLICT_MESSAGE });
  }
  if (status >= 500 || isDatabaseError(error)) {
    console.error('Request failed:', error);
    return res.status(500).json({ error: GENERIC_MESSAGE });
  }
  return res.status(status).json({ error: error.message });
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const status = err.status || err.statusCode;
  if (status >= 400 && status < 500 && err.expose) {
    return res.status(status).json({ error: err.message });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: GENERIC_MESSAGE });
}
