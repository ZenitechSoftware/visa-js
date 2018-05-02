const { policy, check, authorize, reset, Unauthorized } = require('./lib/acm');

Object.defineProperty(module.exports, 'user', { get: check });

module.exports.policy = policy;
module.exports.check = check;
module.exports.authorize = authorize;
module.exports.reset = reset;
module.exports.Unauthorized = Unauthorized;
