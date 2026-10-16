import test from 'node:test';
import assert from 'node:assert/strict';
import { welcomeMessage } from '../lib/welcome-content.js';

test('welcome email is a transactional account message',()=>{
  const message=welcomeMessage('Riya Sharma');
  assert.match(message.subject,/Welcome to OppMatcher/);
  assert.match(message.html,/OppMatcher account is ready/);
  assert.match(message.html,/not a marketing subscription/);
  assert.match(message.html,/https:\/\/oppmatcher\.tech\//);
});
test('OAuth profile names are HTML escaped in account messages',()=>{
  const message=welcomeMessage('<img src=x onerror=alert(1)>');
  assert.doesNotMatch(message.html,/<img/);
  assert.match(message.html,/&lt;img/);
});
