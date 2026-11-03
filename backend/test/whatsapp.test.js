import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { matchRule, toChatId, verifySignature } from '../src/whatsapp.js';

test('toChatId normalises phone numbers', () => {
  assert.equal(toChatId('+91 98765-43210'), '919876543210@c.us');
  assert.equal(toChatId('9876543210'), '919876543210@c.us');
  assert.equal(toChatId('123'), null);
});

test('matchRule picks reply rules by keyword', () => {
  assert.equal(matchRule('Hello!').keywords.includes('hello'), true);
  assert.equal(matchRule('STOP').optOut, true);
  assert.equal(matchRule('random text'), null);
});

test('verifySignature accepts only the correct HMAC', () => {
  const body = Buffer.from('{"a":1}');
  const good = 'sha256=' + crypto.createHmac('sha256', 's3cret').update(body).digest('hex');
  assert.equal(verifySignature(body, good, 's3cret'), true);
  assert.equal(verifySignature(body, good, 'other'), false);
  assert.equal(verifySignature(body, undefined, 's3cret'), false);
});
