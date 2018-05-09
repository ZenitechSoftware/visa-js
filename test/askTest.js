const { describe, describe: context, it, beforeEach } = require('mocha');
const visa = require('../');

require('chai').should();

describe('visa.js ask', () => {

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
        return visa.ask().can.open.account()
          .then(() => { throw new Error('Test should fail') })
          .catch(error => error.message.should.equal(`visa.js: object 'account' operation 'open': rule failed with error: Some rule error`));
      });
    });
  });
  context('Rule returns true', () => {
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
      return visa.ask(subject).can.open.account().then(answer => answer.should.equal(true));
    });
  });
  context('Rule returns false', () => {
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
      const subject = { role: 'manager' };
      return visa.ask(subject).can.open.account().then(answer => answer.should.equal(false));
    });
  });
  context('can.not', () => {
    context('Rule fails', () => {
      it('should return true', () => {
        visa.policy({
          objects: {
            'account': {
              operations: {
                'open': () => false
              }
            }
          }
        });
        return visa.ask().can.not.open.account().then(answer => answer.should.equal(true));
      });
    });
    context('Rule passes', () => {
      it('should return false', () => {
        visa.policy({
          objects: {
            'account': {
              operations: {
                'open': () => true
              }
            }
          }
        });
        return visa.ask().can.not.open.account().then(answer => answer.should.equal(false));
      });
    });
  });
});
