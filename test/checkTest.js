const { describe, describe: context, it, beforeEach } = require('mocha');
const visa = require('../');

require('chai').should();

describe('visa.js check', () => {

  beforeEach(() => visa.reset());

  context('Errors', () => {
    context('Rule returns error', () => {
      it('should catch error and enhance with details', () => {
        visa.policy({
          objects: {
            'account': {
              operations: {
                'open': () => { throw new Error('Some rule error') },
              }
            },
          }
        });
        return visa.check().can.open.account()
          .then(() => { throw new Error('Test should fail') })
          .catch(error => error.message.should.equal(`visa.js: object 'account' operation 'open': rule failed with error: Some rule error`));
      });
    });
  });
  context('Same operation name used in 2 different objects', () => {
    it('should be authorized first object and NOT authorize second object', () => {
      visa.policy({
        objects: {
          'account': {
            operations: {
              'open': subject => subject.role === 'teller',
            }
          },
        }
      });
      visa.policy({
        objects: {
          'loan': {
            operations: {
              'open': subject => Promise.resolve(subject.role === 'manager'),
            }
          },
        }
      });
      const subject = { role: 'teller' };
      return Promise.all([
        visa.check(subject).can.open.account(),
        visa.check(subject).can.open.loan()
          .then(() => { throw new Error('Test should fail') })
          .catch(error => { if (!(error instanceof visa.Unauthorized)) throw error })
      ]);
    });
  });
  context('Subject attributes', () => {
    context('Subject attributes are matching', () => {
      it('should be authorized', () => {
        visa.policy({
          objects: {
            'account': {
              operations: {
                'open': subject => subject.role === 'teller',
              }
            }
          }
        });
        const subject = { role: 'teller' };
        return visa.check(subject).can.open.account();
      });
    });
    context('Subject attributes are NOT matching', () => {
      it('should NOT be authorized', () => {
        visa.policy({
          objects: {
            'account': {
              operations: {
                'open': subject => subject.role === 'teller',
              }
            }
          }
        });
        const subject = { role: 'customer' };
        return visa.check(subject).can.open.account()
          .then(() => { throw new Error('Test should fail') })
          .catch(error => { if (!(error instanceof visa.Unauthorized)) throw error })
      });
    });
  });
  context('Object attributes', () => {
    context('Subject and object attributes are matching', () => {
      it('should be authorized', () => {
        visa.policy({
          objects: {
            'account': {
              operations: {
                'open': (subject, account) => subject.role === 'teller' && account.country === 'LT',
              }
            }
          }
        });
        const subject = { role: 'teller' };
        const account = { country: 'LT' };
        return visa.check(subject).can.open.account({ object: account });
      });
    });
    context('Subject and multiple objects attributes are matching', () => {
      it('should be authorized', () => {
        visa.policy({
          objects: {
            'account': {
              operations: {
                'open': (subject, account) => subject.role === 'teller' && account.country === 'LT',
              }
            }
          }
        });
        const subject = { role: 'teller' };
        const account = { country: 'LT' };
        return visa.check(subject).can.open.account({ objects: [account, account] });
      });
    });
    context('Subject attributes are matching but object attributes are NOT matching', () => {
      it('should NOT be authorized', () => {
        visa.policy({
          objects: {
            'account': {
              operations: {
                'open': (subject, account) => subject.role === 'teller' && account.country === 'LT',
              }
            }
          }
        });
        const subject = { role: 'teller' };
        const account = { country: 'GB' };
        return visa.check(subject).can.open.account({ object: account })
          .then(() => { throw new Error('Test should fail') })
          .catch(error => { if (!(error instanceof visa.Unauthorized)) throw error })
      });
    });
    context('Subject and first object attributes are matching but second object attributes are NOT matching', () => {
      it('should NOT be authorized', () => {
        visa.policy({
          objects: {
            'account': {
              operations: {
                'open': (subject, account) => subject.role === 'teller' && account.country === 'LT',
              }
            }
          }
        });
        const subject = { role: 'teller' };
        const account1 = { country: 'LT' };
        const account2 = { country: 'GB' };
        return visa.check(subject).can.open.account({ objects: [account1, account2] })
          .then(() => { throw new Error('Test should fail') })
          .catch(error => { if (!(error instanceof visa.Unauthorized)) throw error })
      });
    });
    context('Rule returns error', () => {
      it('should catch error and enhance with details', () => {
        visa.policy({
          objects: {
            'account': {
              operations: {
                'open': () => { throw new Error('Some rule error') },
              }
            },
          }
        });
        const account = { country: 'GB' };
        return visa.check().can.open.account({ object: account })
          .then(() => { throw new Error('Test should fail') })
          .catch(error => error.message.should.equal(`visa.js: object 'account' operation 'open': rule failed with error: Some rule error`));
      });
    });
  });
  context('Referenced object attributes', () => {
    context('Subject and object reference attributes are matching', () => {
      it('should be authorized', () => {
        visa.policy({
          objects: {
            'account': {
              mapRefsToObjects: refs => Promise.resolve(refs.map(() => ({ country: 'LT' }))),
              operations: {
                'open': (subject, account) => subject.role === 'teller' && account.country === 'LT',
              }
            }
          }
        });
        const subject = { role: 'teller' };
        return visa.check(subject).can.open.account({ ref: 1 })
          .then(account => account.should.deep.equal({ country: 'LT' }));
      });
    });
    context('Subject and multiple objects reference attributes are matching', () => {
      it('should be authorized', () => {
        visa.policy({
          objects: {
            'account': {
              mapRefsToObjects: (refs, cb) => cb(null, refs.map(() => ({ country: 'LT' }))),
              operations: {
                'open': (subject, account) => subject.role === 'teller' && account.country === 'LT',
              }
            }
          }
        });
        const subject = { role: 'teller' };
        return visa.check(subject).can.open.account({ refs: [1, 2] })
          .then(accounts => accounts.should.deep.equal([{ country: 'LT' }, { country: 'LT' }]));
      });
    });
    context('Subject attributes are matching but object reference attributes are not matching', () => {
      it('should NOT be authorized', () => {
        visa.policy({
          objects: {
            'account': {
              mapRefsToObjects: refs => refs.map(() => ({ country: 'EN' })),
              operations: {
                'open': (subject, account) => subject.role === 'teller' && account.country === 'LT',
              }
            }
          }
        });
        const subject = { role: 'teller' };
        return visa.check(subject).can.open.account({ ref: 1 })
          .then(() => { throw new Error('Test should fail') })
          .catch(error => { if (!(error instanceof visa.Unauthorized)) throw error })
      });
    });
    context('Subject attributes are matching but object multiple references attributes are not matching', () => {
      it('should NOT be authorized', () => {
        visa.policy({
          objects: {
            'account': {
              mapRefsToObjects: refs => refs.map(() => ({ country: 'EN' })),
              operations: {
                'open': (subject, account) => subject.role === 'teller' && account.country === 'LT',
              }
            }
          }
        });
        const subject = { role: 'teller' };
        return visa.check(subject).can.open.account({ refs: [1, 2] })
          .then(() => { throw new Error('Test should fail') })
          .catch(error => { if (!(error instanceof visa.Unauthorized)) throw error })
      });
    });
    context('Object reference is provided but mapRefsToObjects function is not provided', () => {
      it('should fail with details provided', () => {
        visa.policy({
          objects: {
            'account': {
              operations: {
                'open': () => true,
              }
            }
          }
        });
        return visa.check().can.open.account({ ref: 1 })
          .then(() => { throw new Error('Test should fail') })
          .catch(error => error.message.should.equal(`visa.js: object 'account' operation 'open': object references (1) can not be resolved because 'mapRefsToObjects' method is not provided`));
      });
    });
    context('mapRefsToObjects function throws error', () => {
      it('should fail with details provided', () => {
        visa.policy({
          objects: {
            'account': {
              mapRefsToObjects: () => { throw new Error('mapRefsToObjects error') },
              operations: {
                'open': () => true,
              }
            }
          }
        });
        return visa.check().can.open.account({ ref: 1 })
          .then(() => { throw new Error('Test should fail') })
          .catch(error => error.message.should.equal(`visa.js: object 'account' operation 'open': object references (1) can not be resolved because of 'mapRefsToObjects' error: mapRefsToObjects error`));
      });
    });
    context('mapRefsToObjects function return error in cb', () => {
      it('should fail with details provided', () => {
        visa.policy({
          objects: {
            'account': {
              mapRefsToObjects: (refs, cb) => cb(new Error('mapRefsToObjects error')),
              operations: {
                'open': () => true,
              }
            }
          }
        });
        return visa.check().can.open.account({ ref: 1 })
          .then(() => { throw new Error('Test should fail') })
          .catch(error => error.message.should.equal(`visa.js: object 'account' operation 'open': object references (1) can not be resolved because of 'mapRefsToObjects' error: mapRefsToObjects error`));
      });
    });
    context('mapRefsToObjects function rejects promise', () => {
      it('should fail with details provided', () => {
        visa.policy({
          objects: {
            'account': {
              mapRefsToObjects: () => Promise.reject(new Error('mapRefsToObjects error')),
              operations: {
                'open': () => true,
              }
            }
          }
        });
        return visa.check().can.open.account({ ref: 1 })
          .then(() => { throw new Error('Test should fail') })
          .catch(error => error.message.should.equal(`visa.js: object 'account' operation 'open': object references (1) can not be resolved because of 'mapRefsToObjects' error: mapRefsToObjects error`));
      });
    });
    context('Provided mapRefsToObjects function returns number of objects that is not equal to number of refs passed', () => {
      it('should not authorize', () => {
        visa.policy({
          objects: {
            'account': {
              mapRefsToObjects: () => [],
              operations: {
                'open': () => true,
              }
            }
          }
        });
        return visa.check().can.open.account({ ref: 1 })
          .then(() => { throw new Error('Test should fail') })
          .catch(error => { if (!(error instanceof visa.Unauthorized)) throw error })
      });
    });
    context('mapRefsToObjects function return null for account reference', () => {
      it('should not authorize', () => {
        visa.policy({
          objects: {
            'account': {
              mapRefsToObjects: () => [null],
              operations: {
                'open': () => true,
              }
            }
          }
        });
        return visa.check().can.open.account({ ref: 1 })
          .then(() => { throw new Error('Test should fail') })
          .catch(error => { if (!(error instanceof visa.Unauthorized)) throw error })
      });
    });
    context('mapRefsToObjects function return undefined for account reference', () => {
      it('should not authorize', () => {
        visa.policy({
          objects: {
            'account': {
              mapRefsToObjects: () => [undefined],
              operations: {
                'open': () => true,
              }
            }
          }
        });
        return visa.check().can.open.account({ ref: 1 })
          .then(() => { throw new Error('Test should fail') })
          .catch(error => { if (!(error instanceof visa.Unauthorized)) throw error });
      });
    });
    context('mapRefsToObjects function returns null', () => {
      it('should fail with details provided', () => {
        visa.policy({
          objects: {
            'account': {
              mapRefsToObjects: () => null,
              operations: {
                'open': () => true,
              }
            }
          }
        });
        return visa.check().can.open.account({ ref: 1 })
          .then(() => { throw new Error('Test should fail') })
          .catch(error => error.message.should.equal(`visa.js: object 'account' operation 'open': 'mapRefsToObjects' function should return array of objects`));
      });
    });
  });
  context('Context attributes', () => {
    context('Subject and context attributes are matching', () => {
      it('should be authorized', () => {
        visa.policy({
          objects: {
            'account': {
              operations: {
                'open': (subject, account, context) => subject.role === 'teller' && context.method === 'POST',
              }
            }
          }
        });
        const subject = { role: 'teller' };
        const context = { method: 'POST' };
        return visa.check(subject).can.open.account({ context });
      });
    });
    context('Subject attributes are matching but context attributes are NOT matching', () => {
      it('should NOT be authorized', () => {
        visa.policy({
          objects: {
            'account': {
              operations: {
                'open': (subject, account, context) => subject.role === 'teller' && context.method === 'POST',
              }
            }
          }
        });
        const subject = { role: 'teller' };
        const context = { method: 'GET' };
        return visa.check(subject).can.open.account({ context })
          .then(() => { throw new Error('Test should fail') })
          .catch(error => { if (!(error instanceof visa.Unauthorized)) throw error });
      });
    });
  });
});
