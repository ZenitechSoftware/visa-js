const { policy, check, authorize, reset, unauthorizedErrorHandler, Unauthorized } = require('./lib/acm');

Object.defineProperty(module.exports, 'user', { get: check });

module.exports.policy = policy;
module.exports.check = check;
module.exports.authorize = authorize;
module.exports.reset = reset;
module.exports.unauthorizedErrorHandler = unauthorizedErrorHandler;
module.exports.Unauthorized = Unauthorized;
