const async = require('async');
const { wrapToPromise } = require('./utils');

class Unauthorized extends Error {
}

class VisaError extends Error {
  constructor(message) {
    super(message);
  }
}

const evaluateRule = (objectName, operationName, rule, subject, object, context) => new Promise((resolve, reject) => {
  try {
    const authorized = rule(subject, object, context);
    if (authorized) {
      resolve();
    } else {
      reject(new Unauthorized);
    }
  } catch (error) {
    error.message = `visa.js: object '${objectName}' operation '${operationName}': rule failed with error: ${error.message}`;
    reject(error);
  }
});

const evaluateMapRefsToObjects = (objectName, operationName, rule, subject, mapRefsToObjects, args) => {
  const refs = [];
  if (args.ref !== null && args.ref !== undefined) {
    refs.push(args.ref);
  }
  if (args.refs) {
    args.refs.forEach(ref => refs.push(ref));
  }
  if (!refs.length) {
    return Promise.resolve(refs);
  }
  if (!mapRefsToObjects) {
    return Promise.reject(new VisaError(`visa.js: object '${objectName}' operation '${operationName}': object references (${refs}) can not be resolved because 'mapRefsToObjects' method is not provided`));
  }
  return wrapToPromise(mapRefsToObjects, refs)
    .catch(error => {
      error.message = `visa.js: object '${objectName}' operation '${operationName}': object references (${refs}) can not be resolved because of 'mapRefsToObjects' error: ${error.message}`;
      throw error;
    })
    .then(objects => {
      if (!Array.isArray(objects)) {
        return Promise.reject(new VisaError(`visa.js: object '${objectName}' operation '${operationName}': 'mapRefsToObjects' function should return array of objects`));
      }
      if (objects.length !== refs.length) {
        return Promise.reject(new Unauthorized());
      }
      if (objects.findIndex(object => object === null || object === undefined) !== -1) {
        return Promise.reject(new Unauthorized());
      }
      return Promise.resolve(objects);
    });
};

const evaluateRuleForObjects = (objectName, operationName, rule, subject, objects, args) => {
  if (args.object) {
    objects.push(args.object);
  }
  if (args.objects) {
    args.objects.forEach(object => objects.push(object));
  }
  return new Promise((resolve, reject) => async.eachLimit(
    objects,
    5,
    (object, cb) => evaluateRule(objectName, operationName, rule, subject, object, args.context)
      .then(cb)
      .catch(cb),
    (error, authorized) => {
      if (error) {
        return reject(error);
      }
      return resolve(objects.length === 1 ? objects[0] : objects);
    })
  );
};

const createEvaluationFunction = (rule, mapRefsToObjects, objectName, operationName) => function (args) {
  if (args && (args.ref || args.refs || args.object || args.objects)) {
    return evaluateMapRefsToObjects(objectName, operationName, rule, this.subject, mapRefsToObjects, args)
      .then(objects => evaluateRuleForObjects(objectName, operationName, rule, this.subject, objects, args));
  }
  return evaluateRule(objectName, operationName, rule, this.subject, undefined, args && args.context);
};

let Check = null;
let Can = null;

module.exports.Unauthorized = Unauthorized;

module.exports.use = policy => {
  for (let objectName of Object.keys(policy.objects)) {
    for (let operationName of Object.keys(policy.objects[objectName].operations)) {
      if (!Can.prototype[operationName]) {
        class Operation {
          constructor(subject) {
            this.subject = subject;
          }
        };
        Can.prototype[`_${operationName}Class`] = Operation;
        Can.prototype.__defineGetter__(operationName, function () {
          return new Operation(this.subject);
        });
      }
      Can.prototype[`_${operationName}Class`].prototype[objectName] = createEvaluationFunction(
        policy.objects[objectName].operations[operationName],
        policy.objects[objectName].mapRefsToObjects,
        objectName,
        operationName
      );
    }
  }
};

module.exports.check = subject => new Check(subject);

module.exports.authorize = rule => (req, res, next) => {
  const args = [];
  if (req.params.id) {
    args.push({ ref: req.params.id })
  }
  rule.apply({ subject: req.user }, args)
    .then(() => next())
    .catch(error => {
      if (error instanceof Unauthorized) {
        return res.sendStatus(401);
      }
      next(error);
    });
};

module.exports.reset = () => {
  class NewCheck {
    constructor(subject) {
      this.subject = subject;
    }
  };
  class NewCan {
    constructor(subject) {
      this.subject = subject;
    }
  };
  NewCheck.prototype.__defineGetter__('can', function () {
    return new NewCan(this.subject);
  });
  Check = NewCheck;
  Can = NewCan;
};

module.exports.reset();
