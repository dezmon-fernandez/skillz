// node --test .claude/skills/annotate/scripts/image-file.test.ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { imageFile } from './image-file.ts';

describe('imageFile', () => {
  const folder = '/work/walk';

  it('finds an image in the document folder or below it', () => {
    assert.deepEqual(imageFile(folder, '01-step.png'), { path: '/work/walk/01-step.png', type: 'image/png' });
    assert.deepEqual(imageFile(folder, './shots/02-step.JPG'), { path: '/work/walk/shots/02-step.JPG', type: 'image/jpeg' });
  });

  it('refuses a path outside the document folder', () => {
    assert.equal(imageFile(folder, '../secret.png'), null);
    assert.equal(imageFile(folder, 'shots/../../secret.png'), null);
    assert.equal(imageFile(folder, '/etc/secret.png'), null);
    assert.equal(imageFile(folder, '../walk-other/01-step.png'), null);
  });

  it('refuses a file that is not an image', () => {
    assert.equal(imageFile(folder, 'walk.md'), null);
    assert.equal(imageFile(folder, 'diagram.svg'), null);
  });
});
