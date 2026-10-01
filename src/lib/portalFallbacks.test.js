import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeCourseList, buildCoursePlaceholderImage } from './portalFallbacks.js';

test('normalizeCourseList returns demo content when API fails', () => {
  const courses = normalizeCourseList(undefined);

  assert.ok(Array.isArray(courses));
  assert.ok(courses.length > 0);
  assert.equal(courses[0].title.length > 0, true);
});

test('buildCoursePlaceholderImage creates a valid data SVG for portal cards', () => {
  const image = buildCoursePlaceholderImage('React');

  assert.match(image, /^data:image\/svg\+xml/);
});
