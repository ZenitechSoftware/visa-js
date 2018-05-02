const { Unauthorized } = require('./acm');

module.exports.authorize = (rule, getRef) => (req, res, next) => {
  const args = [{ context: req }];
  if (getRef) {
    args[0].ref = getRef(req);
  } else if (req.params.id) {
    args[0].ref = req.params.id;
  }
  rule.apply({ subject: req.user }, args)
    .then(() => next())
    .catch(next);
};

module.exports.unauthorizedErrorHandler = (error, req, res, next) => {
  if (error instanceof Unauthorized) {
    return res.sendStatus(401);
  }
  next(error);
};