# A run's config

One JSON file per project, kept by the project itself, usually untracked in its `.agents/`. It holds everything about
the project the runner needs: the folder the steps run in, its ports, its env file, what the steps may not read, and
the steps with their prompts and answers. `run.ts check <config>` reads it and names every problem, one line each,
before any session starts. The run copies it into its folder as `config.json`, so a later edit never changes a run
already going.

Relative paths are relative to the config file's folder.

## The shape

```json
{
  "name": "<short-kebab-case>",
  "workdir": "<the git checkout the steps run in>",
  "runs": "<where run folders go, outside workdir>",
  "envFile": "<an env file sourced for each step>",
  "path": ["<a folder of the project's own wrappers>"],
  "env": { "<NAME>": "<value>" },
  "ports": [0],
  "watchdogWait": 120,
  "deny": ["<a permission rule>"],
  "settings": { "hooks": { "PreToolUse": [] } },
  "note": "<added to a new session's system prompt>",
  "steps": [
    { "id": "<id>", "label": "<what the page calls it>", "prompt": "<the prompt>", "session": "new" },
    {
      "id": "<id>", "label": "<label>", "prompt": "/<skill> {request}", "session": "continue",
      "effort": { "<model id>": "<effort level>" },
      "done": { "file": "<glob under workdir>", "says": "<words its last reply contains>" },
      "answers": ["<sent at its first stop>", "<at its second>"],
      "answerIfAsks": false
    }
  ]
}
```

## The run

| Field | Required | Default | What it does |
|---|---|---|---|
| `name` | yes | | Short kebab-case. Names the run's folder and its line on the page. |
| `workdir` | yes | | The git checkout the steps run in. Must exist and be a checkout. |
| `runs` | yes | | Where run folders go. Never inside `workdir`: a step would read the run's records. |
| `steps` | yes | | The steps, in order; at least one. |
| `envFile` | | none | Sourced by bash at each step's start and exported to it. Never copied, never printed, never read by the runner itself. |
| `path` | | `[]` | Folders put first on every step's PATH: the project's own wrappers, such as one that keeps a browser headless. |
| `env` | | `{}` | Plain variables for every step, such as its dev server's port. Not for keys: put those in `envFile`. |
| `ports` | | `[]` | Ports a step's dev server may hold. Once a turn is over and quiet for `watchdogWait`, what listens on them is stopped, so the step can end. |
| `watchdogWait` | | `120` | Seconds a turn must be over, with nothing written, before its ports are freed. |
| `deny` | | `[]` | Permission rules for `--disallowedTools`, such as reads of other checkouts. Every git command but a read is blocked by the `deny-git-writes` hook whatever this holds. |
| `settings` | | `{}` | Merged into every step's `--settings`, such as the project's own hooks. The runner puts the `deny-git-writes` hook first and adds each step's `modelSettings`. |
| `note` | | none | Appended to a new session's system prompt. A continued session ignores it. |
| `model` | | `claude-opus-5-5` | The model every step runs. |
| `permissionMode` | | `bypassPermissions` | Every turn's `--permission-mode`. |
| `watcher` | | `{"model": "claude-sonnet-5-5", "effort": "medium"}` | The read-only session that notes what to improve after every turn. |
| `reporter` | | `{"model": "claude-opus-5-5", "effort": "high"}` | The read-only session that writes the report at the end. |

## A step

| Field | Required | Default | What it does |
|---|---|---|---|
| `id` | yes | | `[a-z0-9-]+`, unique. A later prompt names the file this step left as `{file:<id>}`. |
| `label` | yes | | What the page calls the step. |
| `prompt` | yes | | Sent verbatim once `{request}` (the request, verbatim) and `{file:<id>}` (an earlier step's file) are filled. Starts with `/<skill>` to run a skill. |
| `session` | yes | | `new` starts a session; `continue` resumes the previous step's. The first step is always `new`. |
| `effort` | | none | Model id to effort level, sent as `modelSettings`, for the step's model and its agents' models. |
| `done` | | none | What the step leaves when it has finished. Absent: it has finished when its first turn ends. |
| `done.file` | | | A glob under `workdir` (`**` any depth, `*` within a folder, `?` one character). A matching file written since the run started; the newest is the step's file. |
| `done.says` | | | Text the step's last reply contains. With `file`, both must hold. |
| `answers` | | `[]` | In speed mode, one at each stop before the step has finished: the second stop gets the second answer, even when you answered the first on the page. Used up, or slotted in, the step waits on the page. |
| `answerIfAsks` | | `false` | Also answer when the step has finished but its reply asks something, such as a review that asks after it writes. Slotted in, a reply that asks always waits. |

A skill stops for an answer by ending its turn, and nothing in the stream tells that stop from a finish. So a step
that stops to ask needs a `done` the runner can check, and an `answers` list as long as its stops. When unsure how
many times it stops, give one answer too many: an answer left over is never sent, and one too few leaves the step
waiting on the page.

- ❌ `"done": {}` on a plan step that stops three times: its first stop reads as finished, and the next step runs on no plan.
- ✅ `"done": {"file": "<where the plan is written>", "says": "<the words its last reply names>"}` with an `answers` list as long as its stops.
