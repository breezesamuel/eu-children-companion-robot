'use strict';
function validateDateRange(query) {
  const now = new Date();
  const end = query.end ? new Date(query.end) : now;
  const start = query.start ? new Date(query.start) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { start, end };
}
module.exports = { validateDateRange };