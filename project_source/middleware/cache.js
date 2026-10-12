'use strict';
module.exports = function cache(ttl) {
  return (req, res, next) => next();
};