const { describe, describe: context, it } = require('mocha');
const visa = require('../');
const should = require('chai').should();
const express = require('express');
const request = require('supertest');
const passport = require('passport')
const Strategy = require('passport-strategy').Strategy;

describe('visa.js example', () => {
  context('express app is running and passport local strategy is used', () => {
    let app = null;
    let server = null;

    class TestStrategy extends Strategy {
      authenticate(req, options) {
        this.success({ id: 999, role: 'teller' });
      }
    }
    passport.use('test', new TestStrategy());

    beforeEach(() => {
      visa.reset();
      app = express();
      app.use(passport.initialize());
      server = app.listen(3001);
    });

    afterEach(() => {
      server.close();
    });

    it('should run', () => {
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
              'create': (user, _, req) => new Promise((resolve, reject) => {
                if (subject.role === 'manager') {
                  return resolve(true);
                }
                const fromAccount = Account.find({ _id: req.body.fromAccountId });
                resolve(fromAccount.ownerId === user.id);
              }),
              'revert': (user, transaction, req) => user.role === 'cfo'
                && transaction.date > moment().subtract(1, 'day')
                && req.ip === '10.0.0.99',
            }
          }
        }
      });
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
      return Promise.all([
        request(app)
          .post('/api/account')
          .expect(200),
      ]);
    });
  });
});
