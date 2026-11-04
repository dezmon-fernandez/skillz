// node --no-warnings --test tests/run-workflow/deny-git-writes.test.ts
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = join(import.meta.dirname, '../..');
const hook = join(root, 'hooks/deny-git-writes/deny-git-writes.ts');

function call(stdin: string): { code: number | null; out: string; err: string } {
  const r = spawnSync(process.execPath, ['--no-warnings', hook], { input: stdin, encoding: 'utf8' });
  return { code: r.status, out: r.stdout, err: r.stderr };
}
const bash = (command: string) => call(JSON.stringify({ tool_name: 'Bash', tool_input: { command } }));
const PASS = { code: 0, out: '', err: '' };

// The review step's own commands, as dk-review-code writes them.
function reviewCommands(): string[] {
  const text = readFileSync(join(root, 'skills/dk-review-code/SKILL.md'), 'utf8');
  const block = /## 1\. Gather[\s\S]*?```bash\n([\s\S]*?)```/.exec(text);
  assert.ok(block, 'the review skill still has its Gather block');
  return block[1].split('\n').filter(Boolean);
}

function blocked(command: string, reason: RegExp): void {
  const r = bash(command);
  assert.equal(r.code, 2, command);
  assert.equal(r.out, '', command);
  assert.equal(r.err.trim().split('\n').length, 1, command);
  assert.match(r.err, reason, command);
}

describe('deny-git-writes', () => {
  it("lets the review's read-only git through", () => {
    const commands = reviewCommands();
    assert.equal(commands.length, 4);
    for (const command of commands) assert.deepEqual(bash(command), PASS, command);
  });

  it('lets the readers through, past git options, paths and wrappers', () => {
    for (const command of ['git status', 'git -C /tmp/r log --oneline -5', 'git --no-pager diff --stat', '/usr/bin/git show HEAD',
      'git ls-files', 'git rev-parse HEAD', 'git -c color.ui=never log', 'git --version', 'env A=1 git blame f',
      'git branch --show-current', 'git tag -l', 'git remote -v', 'git config --get user.name', 'git stash list',
      'git worktree list', 'git symbolic-ref --short HEAD', 'git reflog', 'git reflog show main', 'git sparse-checkout list',
      'git hash-object f', 'git status 2>/dev/null']) {
      assert.deepEqual(bash(command), PASS, command);
    }
  });

  it('blocks a write, however it is written, and names it', () => {
    const cases: [string, string][] = [
      ['git commit -m x', 'commit'], ['git -C /tmp/r push', 'push'], ['cd a && git reset --hard', 'reset'],
      ['git -c a=b checkout x', 'checkout'], ['/usr/bin/git rebase main', 'rebase'], ['env GIT_DIR=x git merge y', 'merge'],
      ['echo $(git push)', 'push'], ['x=`git commit -am y`', 'commit'], ['nohup git fetch &', 'fetch'],
      ['ls | xargs git rm', 'rm'], ["bash -c 'git push origin'", 'push'], ['eval git add .', 'add']
    ];
    for (const [command, sub] of cases) blocked(command, new RegExp(`^deny-git-writes: blocked git ${sub}:`));
  });

  it('blocks the writing forms of the commands that also read', () => {
    for (const command of ['git branch -D x', 'git branch x', 'git tag v1', 'git remote add o u', 'git remote show origin',
      'git config user.name x', 'git stash', 'git status; git stash pop', 'git worktree add ../x', 'git symbolic-ref HEAD refs/heads/x',
      'git reflog expire --all', 'git sparse-checkout set a', 'git hash-object -w f']) {
      blocked(command, /^deny-git-writes: blocked git [\w-]+: this form changes the repository or reaches a remote;/);
    }
  });

  it('blocks what it does not recognize: plumbing, a remote read, an alias, an external command', () => {
    for (const [command, sub] of [['git stage .', 'stage'], ['git checkout-index -a -f', 'checkout-index'],
      ['git ls-remote origin', 'ls-remote'], ['git ci -m x', 'ci'], ['git -c alias.p=push p', 'p'],
      ['git --config-env=alias.p=X p', 'p'], ['git lfs push origin', 'lfs'], ['git-lfs push origin', 'lfs'],
      ['git annex sync', 'annex']]) {
      blocked(command, new RegExp(`^deny-git-writes: blocked git ${sub}: not a git command this hook recognizes as read-only;`));
    }
  });

  it('blocks text that reads as a git write, even in quotes, and a quote it cannot parse', () => {
    blocked('echo "run git push now"', /text that reads as a git write \(git push\).*Rephrase it/);
    blocked('git commit -m "unclosed', /could not be parsed and looks like a git write \(git commit\)/);
  });

  it('a command with no git, or input that is not a Bash call, has no opinion', () => {
    for (const r of [bash('ls -la'), bash('echo digit'), bash('cat .gitignore'), call('not json'), call(''),
      call(JSON.stringify({ tool_input: {} }))]) {
      assert.deepEqual(r, PASS);
    }
  });
});
