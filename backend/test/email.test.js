import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contactReplyUpdate, enqueueContactReply, newContactReply } from '../src/email.js';

test('Only changed non-empty contact replies are sent, and appended internal text is excluded', () => {
  assert.equal(newContactReply('', ''), null);
  assert.equal(newContactReply('Already saved', 'Already saved'), null);
  assert.equal(newContactReply('Private note', 'Private note\n\nReply to the visitor'), 'Reply to the visitor');
  assert.equal(newContactReply('Previous note', 'Replacement reply'), 'Replacement reply');
});

test('Saving a new enquiry reply changes its status to RESPONDED', () => {
  assert.deepEqual(contactReplyUpdate('NEW', '', 'Thanks for your enquiry.'), {
    reply: 'Thanks for your enquiry.',
    status: 'RESPONDED',
  });
  assert.deepEqual(contactReplyUpdate('IN_PROGRESS', 'Existing reply', 'Existing reply'), {
    reply: null,
    status: 'IN_PROGRESS',
  });
});

test('Contact replies are queued to the original enquirer with escaped email content', async () => {
  let queued;
  const tx = { emailNotification: { create: async ({ data }) => { queued = data; return data; } } };
  const row = { name: '<Visitor>', email: 'visitor@example.com', reference: 'GUL-ENQ-123' };
  await enqueueContactReply(tx, row, 'Thanks for your message.');

  assert.equal(queued.recipient, row.email);
  assert.equal(queued.subject, 'Reply to Your Enquiry — Gulsaga');
  assert.match(queued.text, /Thanks for your message\./);
  assert.match(queued.html, /&lt;Visitor&gt;/);
  assert.doesNotMatch(queued.html, /<Visitor>/);
});
