const { describe, describe: context, it, beforeEach, afterEach } = require('mocha');
const visa = require('../');
const express = require('express');
const expressPromiseRouter = require('express-promise-router');
const request = require('supertest');
const passport = require('passport')
const Strategy = require('passport-strategy').Strategy;

require('chai').should();

describe('visa.js middleware', () => {
  context('express app is running and passport local strategy is used', () => {
    let app = null;
    let router = null;
    let server = null;

    class TestStrategy extends Strategy {
      authenticate() {
        this.success({ id: 999, role: 'teller' });
      }
    }
    passport.use('test', new TestStrategy());

    beforeEach(() => {
      visa.reset();
      router = expressPromiseRouter();
      app = express();
      app.use(passport.initialize());
      app.use(router);
      app.use(visa.unauthorizedErrorHandler);
      server = app.listen(3001);
    });

    afterEach(() => {
      server.close();
    });

    context('user role is matching', () => {
      it('should be authorized', () => {
        visa.policy({
          objects: {
            'account': {
              operations: {
                'open': (subject, _, context) => subject.role === 'teller'
                  && context.ip === '::ffff:127.0.0.1'
              }
            },
          }
        });
        router.post(
          '/api/account',
          passport.authenticate('test', { session: false }),
          visa.authorize(visa.user.can.open.account),
          (req, res) => res.send()
        );
        return request(app)
          .post('/api/account')
          .expect(200);
      });
    });
    context('user is the owner of specific object', () => {
      it('should be authorized', () => {
        visa.policy({
          objects: {
            'account': {
              mapRefsToObjects: refs => refs.map(() => ({ ownerId: 999 })),
              operations: {
                'close': (subject, account) => account.ownerId === subject.id,
              }
            },
          }
        });
        router.delete(
          '/api/account/:id',
          passport.authenticate('test', { session: false }),
          visa.authorize(visa.user.can.close.account),
          (req, res) => res.send()
        );
        return request(app)
          .delete('/api/account/1')
          .expect(200);
      });
    });
    context('user is the owner of specific object referenced with :objectId Express param', () => {
      it('should be authorized', () => {
        visa.policy({
          objects: {
            'account': {
              mapRefsToObjects: refs => refs.map(() => ({ ownerId: 999 })),
              operations: {
                'close': (subject, account) => account.ownerId === subject.id,
              }
            },
          }
        });
        router.delete(
          '/api/account/:objectId',
          passport.authenticate('test', { session: false }),
          visa.authorize(visa.user.can.close.account, req => req.params.objectId),
          (req, res) => res.send()
        );
        return request(app)
          .delete('/api/account/1')
          .expect(200);
      });
    });
    context('user role is not matching', () => {
      it('should NOT be authorized and return 401', () => {
        visa.policy({
          objects: {
            'account': {
              operations: {
                'open': (subject) => subject.role === 'manager',
              }
            },
          }
        });
        router.post(
          '/api/account',
          passport.authenticate('test', { session: false }),
          visa.authorize(visa.user.can.open.account),
          (req, res) => res.send()
        );
        return request(app)
          .post('/api/account')
          .expect(401);
      });
    });
    context('api method throws visa.Unauthorized', () => {
      it('should NOT be authorized and return 401', () => {
        visa.policy({
          objects: {
            'account': {
              operations: {
                'open': (subject) => subject.role === 'manager',
              }
            },
          }
        });
        router.post(
          '/api/account',
          passport.authenticate('test', { session: false }),
          () => visa.check({ role: 'user' }).can.open.account()
        );
        return request(app)
          .post('/api/account')
          .expect(401);
      });
    });
    context('visa rule fails', () => {
      it('should NOT be authorized and return 500', () => {
        visa.policy({
          objects: {
            'account': {
              operations: {
                'open': () => { throw new Error('test error') },
              }
            },
          }
        });
        router.post(
          '/api/account',
          passport.authenticate('test', { session: false }),
          visa.authorize(visa.user.can.open.account),
          (req, res) => res.send()
        );
        return request(app)
          .post('/api/account')
          .expect(500);
      });
    });
  });
});
