import assert from 'node:assert/strict';
import test from 'node:test';

import { taskResultUrl } from '../src/lib/ai-task-result';

test('delivery resolves media from the JSON text stored by updateTask', () => {
  const url = 'https://media.example.com/result.mp4';
  assert.equal(taskResultUrl(JSON.stringify({ url, urls: [url] })), url);
  assert.equal(taskResultUrl(JSON.stringify({ urls: [url] })), url);
  assert.equal(taskResultUrl({ url }), url);
});

test('missing, malformed and non-web media cannot be delivered', () => {
  for (const value of [
    null,
    '',
    'broken json',
    'null',
    '{}',
    '{"url":42}',
    '{"url":"javascript:alert(1)"}',
    '{"urls":["file:///secret"]}',
  ]) {
    assert.equal(taskResultUrl(value), '');
  }
});
