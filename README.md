# visa.js

Simple and flexible Access Control Manager based on [Attribute Based Access Control (ABAC) paradigm](https://nvlpubs.nist.gov/nistpubs/specialpublications/NIST.sp.800-162.pdf).

## Quick start

### Installation
```
npm install visa-js -S
```

### Example
```js
const visa = require('visa-js');

visa.use({
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
