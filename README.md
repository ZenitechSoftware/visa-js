# visa.js

![Build](https://travis-ci.org/ZenitechSoftware/visa-js.svg?branch=master)
![Dependencies](https://david-dm.org/ZenitechSoftware/visa-js.svg)
![Maintainability](https://codeclimate.com/github/ZenitechSoftware/visa-js/badges/gpa.svg)

Simple and flexible Access Control Manager based on [Attribute Based Access Control (ABAC) paradigm](https://nvlpubs.nist.gov/nistpubs/specialpublications/NIST.sp.800-162.pdf) that works well with [Express](https://www.npmjs.com/package/express) and [Passport](https://www.npmjs.com/package/passport) or independently.

*Get a travel Visa, take your Passport and grab next Express train.*

## Quick start

### Installation
```
npm install visa-js -S
```

### Example
```js
const visa = require('visa-js');

visa.policy({
  objects: {
    'account': {
      mapRefsToObjects: refs => Account.find({ _id: { $in: refs } }),
      operations: {
        'open': (subject) => subject.role == 'teller',
        'read': (subject, account) => account && subject.id === account.ownerId,
      }
    },
  }
});

app.post(
  '/api/account',
  passport.authenticate('local'),
  visa.authorize(visa.user.can.open.account),
  (req, res) => {
    // authorized to open account
  }
);

app.get(
  '/api/account/:id',
  passport.authenticate('local'),
  visa.authorize(visa.user.can.read.account),
  (req, res) => {
    // authorized to read specific account
  }
);
```

## Introduction
When talking about WEB app security, Node.js has great [Passport](https://www.npmjs.com/package/passport) module that takes care of user authentication - process of actually confirming user identity. It is simple and flexible and already supports multiple strategies. In case strategy is missing it is easy to add one.

Visa.js tries to follow same principles for another security aspect - authorization - process to actually confirming identified user has access rights to resources provided by WEB app. Visa.js implements [Attribute Based Access Control (ABAC) paradigm](https://nvlpubs.nist.gov/nistpubs/specialpublications/NIST.sp.800-162.pdf) that is a flexible way to control access based on policies. Policy is a set of rules that evaluate attributes of identified user (subject), accessed resource (object) and environment (context) to grant/deny access. There are few initiatives such as [node-abac](https://www.npmjs.com/package/node-abac) or [abac](https://www.npmjs.com/package/abac), however, they only cover some very specific cases.

[Role Based Access Control (RBAC)](https://csrc.nist.gov/CSRC/media/Publications/conference-paper/1992/10/13/role-based-access-controls/documents/ferraiolo-kuhn-92.pdf) is another popular paradigm. There are popular Node.js modules based on RBAC such as [acl](https://www.npmjs.com/package/acl) or [accesscontrol](https://www.npmjs.com/package/accesscontrol). However, RBAC is user-centric and do not take into account additional parameters such as resource information, relationship between the user (the requesting entity) and the resource, and dynamic information e.g. time of the day or user IP. RBAC is in some ways special case of ABAC in terms of the attributes used. RBAC works on the attribute of “role”. The key difference with ABAC is the concept of policies that express a complex Boolean rule set that can evaluate many different attributes.

## Definitions
### Subject
A human user or non-person entity (NPE), such as other systems or bots. Assume that subject and user are synonymous.

### Object
A system resource for which access is managed, such as files, API endpoints or processes.

### Operation
The execution of a function at the request of a subject upon an object, such as read, write, edit, delete, copy, execute, or modify.

### Environment conditions
Operational or situational context in which access requests occur. Environment characteristics are independent of subject or object, and may include the current time, day of the week, location of a user, or the current threat level.

### Policy
Policy is the representation of rules or relationships that makes it possible to determine if a requested access should be allowed, given the values of the attributes of the subject, object, and possibly
environment conditions.

### Access Control Mechanism (ACM)
Assembles authorization information, which may include information about the object being protected, the subject requesting access, the policies governing access to the resource, and any contextual information needed to make a decision regarding access.

## Define policies
Use `visa.policy()` function to define policies (function can be called multiple times for multiple policies):
```js
visa.policy({
  objects: {
    'object1': {
      mapRefsToObjects: refs => // resolve object references to objects
      operations: {
        'operation1': (subject, object, context) => // rule
        'operation2': (subject, object, context) => // rule
      }
    },
    'object2': {
      // mapping and operations
    }
  }
});
```
- Policy contains rules to grant/deny access to perform operations on objects.
- Rule is a function that evaluates user permission to perform operation on object. It receives subject, object (if provided) and context (if provided). Function code use attributes (properties) received to return `true` in case permission is granted and `false` in case denied (`Promise`, callback and sync return are supported).
- `mapRefsToObjects` is a function that receives an array of references to objects and returns an array of objects (`Promise`, callback and sync return are supported). Each object should contain attributes (properties) required to evaluate rules. The function is called when access to object by reference is checked.

## Check permission
Use `visa.check` function to check permission. The outcome is a `Promises` that is resolved if access is granted and rejected with `visa.Unauthorized` error if access is denied.

Check for `subject` permission to perform `operation1` on ALL instances of `object1`:
```js
visa.check(subject).can.operation1.object1();
```

Check for `subject` permission to perform `operation1` on specific `object1`:
```js
visa.check(subject).can.operation1.object1({object: object1);
```

Check for `subject` permission to perform `operation1` on specific instances of `object1`:
```js
visa.check(subject).can.operation1.object1({objects: [object1_1, object1_2]);
```

Check for `subject` permission to perform `operation1` on specific `object1` with reference `1` (to resolve reference to object `mapRefsToObjects` function must be defined for `object1` in policy):
```js
visa.check(subject).can.operation1.object1({ref: 1});
```

Check for `subject` permission to perform `operation1` on specific instances of `object1` with references `1` and `2` (to resolve references to objects `mapRefsToObjects` function must be defined for `object1` in policy):
```js
visa.check(subject).can.operation1.object1({refs: [1, 2]});
```

Context can optionally be passed in case it is required to evaluate policy rules. For instance, Express `req` is passed as context: 
```js
visa.check(subject).can.operation1.object1({context: req});
```
## Integration with Express and Passport
Use `visa.authorize()` as an Express middleware. Middleware use subject as `req.user` property, therefore, `passport.authenticate()` middleware should be used before `visa.authorize()`:
```js
app.get(
  '/api/object',
  passport.authenticate(/* strategy and options */),
  visa.authorize(visa.user.can.operation1.object1),
  (req, res) => {
    // authorized to perform operation1 on any object1
  }
);
```
- `visa.authorize()` function takes permission check as an argument that starts with `visa.user` and follows the same structure `visa.check()` function follows.
- Express `req` object is passed to policy rule as `context` argument.

`visa.authorize()` middleware also use `req.params.id` Express parameter if present to validate rule against object referenced by `req.params.id`:
```js
app.get(
  '/api/object/:id',
  passport.authenticate(/* strategy and options */),
  visa.authorize(visa.user.can.operation1.object1),
  (req, res) => {
    // authorized to perform operation1 on specific object1 referenced by :id
  }
);
```
- `req.params.id` is passed as `refs` array item to `mapRefsToObjects` function defined in policy for `object`.
- Express `req` object is passed to policy rule as `context` argument.

`visa.authorize()` middleware also accepts second argument as function that gets Express `req` object and should return reference to object:
```js
app.get(
  '/api/object/:objectId',
  passport.authenticate(/* strategy and options */),
  visa.authorize(visa.user.can.operation1.object1, req => req.params.objectId),
  (req, res) => {
    // authorized to perform operation1 on specific object1 referenced by :objectId
  }
);
```
- `req.params.objectId` is passed as `refs` array item to `mapRefsToObjects` function defined in policy for `object`.
- Express `req` object is passed to policy rule as `context` argument.

Use `visa.unauthorizedErrorHandler` middleware to handle `visa.Unauthorized` error and to return HTTP status 401:
```js
app.use(visa.unauthorizedErrorHandler); // client receives HTTP status 401 in case access is denied
```
- Make sure that `visa.unauthorizedErrorHandler` usage is declared AFTER all the routes where authorization is used.

## Example
Let's define policy for sample bank app.
```js
visa.policy({
  objects: {
    'account': {
      mapRefsToObjects: refs => Account.find({ _id: { $in: refs } }),
      operations: {
        'open': (user) => user.role == 'teller',
        'read': (user, account) => account && user.id === account.ownerId,
      }
    },
    'transaction': {
      mapRefsToObjects: refs => Transaction.find({ _id: { $in: refs } }),
      operations: {
        'create': async (user, _, req) => {
          if (subject.role === 'manager') {
            return true;
          }
          const fromAccount = Account.find({ _id: req.body.fromAccountId});
          return fromAccount.ownerId === user.id;
        },
        'revert': (user, transaction, req) => user.role === 'cfo'
          && transaction.date > moment().subtract(1, 'day')
          && req.ip === '10.0.0.99',
      }
    }
  }
});
```
- any `account` can only be `open`ed by `teller`
- specific `account` can only be `read` by owner
- any `transaction` can only be `create`ed by `manager` OR by owner of account money are transferred from
- `transaction` that was created less than 1 day ago can only be `revert`ed by CFO from specific machine

Let's secure the sample bank app API:
```js
app.post(
  '/api/account',
  passport.authenticate('test', { session: false }),
  visa.authorize(visa.user.can.open.account),
  (req, res) => res.send()
);
app.get(
  '/api/account/:id',
  passport.authenticate('test', { session: false }),
  visa.authorize(visa.user.can.read.account),
  (req, res) => res.send()
);
app.post(
  '/api/transaction',
  passport.authenticate('test', { session: false }),
  visa.authorize(visa.user.can.create.transaction),
  (req, res) => res.send()
);
app.delete(
  '/api/transaction/:id',
  passport.authenticate('test', { session: false }),
  visa.authorize(visa.user.can.revert.transaction),
  (req, res) => res.send()
);
```

Let's check for permissions in the code:
```js
visa.check(req.user).can.open.account()
  .then(() => {
    /* authorized */
  })
  .catch(error => {
    if (error instanceof visa.Unauthorized) {
      /* unauthorized */
    } else {
      /* handle error */
    }
  };
```
```js
await visa.check(req.user).can.read.account({ ref: req.params.id });
```
```js
await visa.check(req.user).can.create.transaction({ context: req });
```
```js
await visa.check(req.user).can.revert.transaction({
  ref: req.params.id,
  context: req
});
```

## Multiple Access Control Mechanisms (ACMs)
visa.js by default use single global Access Control Mechanism (ACM). In some cases multiple ACMs within same application might be useful. Use `visa.buildACM()` function to build new ACM. ACM instance returned by the function has same functions as `visa` module, except for: `visa.authorize()`, `visa.Unauthorized` and `visa.unauthorizedErrorHandler` (these are not coupled with specific ACM instance).