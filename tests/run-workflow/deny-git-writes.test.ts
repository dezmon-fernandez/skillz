// node --no-warnings --test tests/run-workflow/deny-git-writes.test.ts
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = join(import.meta.dirname, '../..');
const hook = join(root, 'skills/run-workflow/scripts/deny-git-writes.ts');

function call(stdin: string): { code: number | null; out: string; err: string } {
  const r = spawnSync(process.execPath, ['--no-warnings', hook], { input: stdin, encoding: 'utf8' });
  return { code: r.status, out: r.stdout, err: r.stderr };
}
const bash = (command: string) => call(JSON.stringify({ tool_name: 'Bash', tool_input: { command } }));

// The review step's own commands, as dk-review-code writes them.
function reviewCommands(): string[] {
  const text = readFileSync(join(root, 'skills/dk-review-code/SKILL.md'), 'utf8');
  const block = /## 1\. Gather[\s\S]*?```bash\n([\s\S]*?)```/.exec(text);
  assert.ok(block, 'the review skill still has its Gather block');
  return block[1].split('\n').filter(Boolean);
}

describe('deny-git-writes', () => {
  it("lets the review's read-only git through", () => {
    const commands = reviewCommands();
    assert.equal(commands.length, 4);
    for (const command of commands) assert.deepEqual(bash(command), { code: 0, out: '', err: '' }, command);
  });

  it('blocks commit, push, reset and checkout, however they are written', () => {
    const cases: [string, string][] = [
      ['git commit -m x', 'commit'], ['git -C /tmp/r push', 'push'], ['cd a && git reset --hard', 'reset'],
      ['git -c a=b checkout x', 'checkout'], ['/usr/bin/git rebase main', 'rebase'], ['env GIT_DIR=x git merge y', 'merge'],
      ['git status; git stash', 'stash']
    ];
    for (const [command, sub] of cases) {
      const r = bash(command);
      assert.equal(r.code, 2, command);
      assert.equal(r.out, '', command);
      assert.equal(r.err.trim().split('\n').length, 1, command);
      // Found as a git call, not only by the text backstop.
      assert.match(r.err, new RegExp(`^deny-git-writes: blocked git ${sub}:`), command);
    }
  });

  it('lets the reading forms of branch, tag, remote, config, stash and worktree through', () => {
    for (const command of ['git branch --show-current', 'git tag -l', 'git remote -v', 'git config --get user.name',
      'git stash list', 'git worktree list', 'git symbolic-ref --short HEAD']) {
      assert.deepEqual(bash(command), { code: 0, out: '', err: '' }, command);
    }
  });

  it('blocks their writing forms', () => {
    for (const command of ['git branch -D x', 'git tag v1', 'git remote add o u', 'git config user.name x',
      'git stash pop', 'git worktree add ../x', 'git symbolic-ref HEAD refs/heads/x']) {
      assert.equal(bash(command).code, 2, command);
    }
  });

  it('a command with no git, or input that is not a Bash call, has no opinion', () => {
    for (const r of [bash('ls -la'), bash('echo digit'), call('not json'), call(JSON.stringify({ tool_input: {} }))]) {
      assert.deepEqual(r, { code: 0, out: '', err: '' });
    }
  });

  it('a quote it cannot parse is still checked', () => {
    const r = bash('git commit -m "unclosed');
    assert.equal(r.code, 2);
    assert.match(r.err, /could not be parsed/);
    assert.match(r.err, /git write/);
  });

  it('git inside a substitution or after a wrapper is found', () => {
    for (const command of ['echo $(git push)', 'x=`git commit -am y`', 'nohup git fetch &', 'time git pull',
      'FOO=1 git add .', 'ls | xargs git rm']) {
      const r = bash(command);
      assert.equal(r.code, 2, command);
      assert.match(r.err, /^deny-git-writes: blocked git [a-z]+:/, command);
    }
  });

  it('a conditional write is found past git options and paths', () => {
    for (const command of ['/usr/bin/git stash pop', 'git -c a=b branch -D x', 'git -C /tmp/r stash', 'git status && git tag v1']) {
      assert.equal(bash(command).code, 2, command);
    }
  });
});
