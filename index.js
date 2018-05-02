const { build, Unauthorized } = require('./lib/acm');
const { authorize, unauthorizedErrorHandler } = require('./lib/middleware');

const acm = build();

Object.defineProperty(module.exports, 'user', { get: acm.check });

module.exports.Unauthorized = Unauthorized;
module.exports.policy = acm.policy;
module.exports.check = acm.check;
module.exports.reset = acm.reset;

module.exports.authorize = authorize;
module.exports.unauthorizedErrorHandler = unauthorizedErrorHandler;

module.exports.buildACM = build;
