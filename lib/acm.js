const async = require('async');
const { wrapToPromise } = require('./utils');

class Unauthorized extends Error {
}

class VisaError extends Error {
  constructor(message) {
    super(message);
  }
}

const evaluateRule = (objectName, operationName, rule, subject, object, context) =>
  wrapToPromise(rule, subject, object, context)
    .catch(error => {
      error.message = `visa.js: object '${objectName}' operation '${operationName}': rule failed with error: ${error.message}`;
      throw error;
    })
    .then(authorized => {
      if (!authorized) {
        throw new Unauthorized();
      }
    });

const evaluateObjects = (objectName, operationName, objects, refs) => {
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
};

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
    .then(objects => evaluateObjects(objectName, operationName, objects, refs));
};

const evaluateRuleForObjects = (objectName, operationName, rule, subject, objects, context) =>
  new Promise((resolve, reject) => async.eachLimit(
    objects,
    5,
    (object, cb) => evaluateRule(objectName, operationName, rule, subject, object, context).then(cb).catch(cb),
    error => {
      if (error) {
        return reject(error);
      }
      resolve(objects.length === 1 ? objects[0] : objects);
    })
  );

const evaluateRulesForObjects = (objectName, operationName, rule, subject, mapRefsToObjects, args) =>
  evaluateMapRefsToObjects(objectName, operationName, rule, subject, mapRefsToObjects, args)
    .then(objects => {
      if (args.object) {
        objects.push(args.object);
      }
      if (args.objects) {
        args.objects.forEach(object => objects.push(object));
      }
      return evaluateRuleForObjects(objectName, operationName, rule, subject, objects, args.context)
    });

const createEvaluationFunction = (rule, mapRefsToObjects, objectName, operationName) => function (args) {
  if (args && (args.ref || args.refs || args.object || args.objects)) {
    return evaluateRulesForObjects(objectName, operationName, rule, this.subject, mapRefsToObjects, args);
  }
  return evaluateRule(objectName, operationName, rule, this.subject, undefined, args && args.context);
};

const createPolicyFunction = (Check, Can) => policy => {
  for (let objectName of Object.keys(policy.objects)) {
    for (let operationName of Object.keys(policy.objects[objectName].operations)) {
      if (!Can.prototype[operationName]) {
        class Operation {
          constructor(subject) {
            this.subject = subject;
          }
        }
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

module.exports.Unauthorized = Unauthorized;

module.exports.build = () => {
  let Can = function (subject) {
    this.subject = subject;
  }
  let Check = function (subject) {
    this.subject = subject;
  }
  Check.prototype.__defineGetter__('can', function () {
    return new Can(this.subject);
  });
  return {
    policy: createPolicyFunction(Check, Can),
    check: subject => new Check(subject),
  };
};
