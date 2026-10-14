import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseSRT, searchCues, formatTime, activeCue } from '../core.mjs';
const demo = parseSRT(readFileSync(new URL('../assets/demo.srt', import.meta.url), 'utf8'));
test('demo has 12 timed bilingual captions within the 60-second video', () => {
  assert.equal(demo.length, 12);
  assert.deepEqual([demo[0].start, demo[5].start, demo[10].start], [0, 25, 50]);
  assert.ok(demo.every(c => c.start >= 0 && c.end <= 60 && c.start < c.end));
});
test('case-insensitive English, Chinese, clear search and no match', () => {
  assert.deepEqual(searchCues(demo, 'VECTOR'), searchCues(demo, 'vector'));
  assert.ok(searchCues(demo, '向量').length > 0);
  assert.equal(searchCues(demo, '   ').length, 12);
  assert.equal(searchCues(demo, 'no-such-phrase').length, 0);
});
test('BOM, CRLF, multiline text, missing sequence numbers and sorted cues', () => {
  const parsed = parseSRT('\uFEFF2\r\n00:00:05,000 --> 00:00:09,500\r\nSecond\r\n第二\r\n\r\n00:00:00.000 --> 00:00:02.000\r\nFirst');
  assert.equal(parsed[0].start, 0); assert.equal(parsed[1].text, 'Second\n第二');
});
test('invalid input is rejected as a whole', () => {
  for (const text of ['', 'bad file', '1\n00:61:00,000 --> 01:00:00,000\nBad', '1\n00:00:05,000 --> 00:00:04,000\nBad', '1\n00:00:00,000 --> 00:00:01,000']) assert.throws(() => parseSRT(text));
});
test('active captions use exclusive end boundaries and time labels', () => {
  assert.equal(activeCue(demo, 25).start, 25); assert.equal(activeCue(demo, 60), undefined);
  assert.equal(formatTime(65.8), '01:05'); assert.equal(formatTime(3665), '01:01:05');
});
