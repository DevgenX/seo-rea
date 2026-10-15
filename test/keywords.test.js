import assert from 'node:assert/strict';
import { test } from 'node:test';
import { adLibraryLookups, brandFromDomain } from '../src/ads.js';
import { keywordGap, phrases, tokenize, topKeywords } from '../src/keywords.js';

const page = (url, title, text, h2 = []) => ({ url, title, metaDescription: '', headings: { h1: [], h2, h3: [] }, text });

test('tokenize lowercases and strips possessives', () => {
  assert.deepEqual(tokenize("CardLab's Points-Tracking app!"), ['cardlab', 'points-tracking', 'app']);
});

test('phrases skip grams that start or end with stopwords', () => {
  const p = phrases('the best points tracking app for travel');
  assert.ok(p.has('points tracking'));
  assert.ok(p.has('points tracking app'));
  assert.ok(!p.has('the best'));
  assert.ok(!p.has('app for'));
  assert.ok(p.has('travel'));
});

test('keywordGap returns phrases shared by competitors and missing from target', () => {
  const comps = [
    page('https://a.com/', 'Points tracking apps', 'cashback categories and annual fee alerts', ['Annual fee']),
    page('https://b.com/', 'Points tracking guide', 'annual fee reminders and cashback categories'),
    page('https://c.com/', 'Unrelated', 'only here phrase'),
  ];
  const target = [page('https://t.com/', 'Cashback app', 'cashback for every store')];
  const gap = keywordGap(comps, target);
  const names = gap.map((g) => g.phrase);
  assert.ok(names.includes('points tracking'));
  assert.ok(names.includes('annual fee'));
  assert.ok(names.includes('cashback categories'));
  assert.ok(!names.includes('cashback'), 'target already uses "cashback"');
  assert.ok(!names.includes('phrase'), 'needs at least 2 competitors');
  assert.equal(gap.find((g) => g.phrase === 'annual fee').competitors, 2);
});

test('topKeywords ranks prominent phrases first', () => {
  const top = topKeywords([page('https://t.com/', 'Card optimizer', 'store store', ['Card optimizer'])], 3);
  assert.equal(top[0].phrase, 'card optimizer');
});

test('ad library lookups build URLs from the domain', () => {
  assert.equal(brandFromDomain('https://www.getcardlab.app/x'), 'cardlab');
  assert.equal(brandFromDomain('nerdwallet.com'), 'nerdwallet');
  const l = adLibraryLookups('getcardlab.app');
  assert.deepEqual(l.map((x) => x.platform), ['Google Ads Transparency Center', 'Meta Ad Library', 'LinkedIn Ad Library']);
  assert.match(l[0].url, /domain=getcardlab\.app/);
  assert.match(l[1].url, /q=cardlab/);
  assert.match(l[2].url, /keyword=cardlab/);
});
