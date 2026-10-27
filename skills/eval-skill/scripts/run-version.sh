#!/usr/bin/env bash
# One run of one skill version on one test case, in a fresh, sandboxed copy of the repo.
#
#   run-version.sh <case dir> <version> <run dir>
#
#   <version>  a git ref in the skills repo (the old version, such as main), or working-tree
#   <run dir>  where outputs/, run.json, timing.json, sandbox.json, denials.json,
#              sandbox-blocks.txt, outside-reads.txt and the transcript land
#
# The case dir holds prompt.md (an optional settings block between two --- lines, then the
# prompt, word for word) and case.env, sourced as bash:
#   REPO=<the repo the request was made against>     COMMIT=<the pinned commit>
#   SKILLS="<skills to install>"                       AGENTS="<agents to install>"
#   TOOLS=(Read Grep Glob Agent Skill Write Edit "Bash(git log:*)")   what the run may use
#   DENIED=(AskUserQuestion NotebookEdit)              optional; this is the default
#   ALLOWED_DOMAINS=(api.example.com)                  optional; the hosts the run's shell
#                                                      commands may reach; default: none
#   SKILLS_SOURCE=<repo holding the skills>            optional; default: the current repo
#   SKILL_DIR=skills  AGENT_DIR=agents                 optional; where they live in it
#   RUNS_ROOT=<parent folder for the copies>           optional; default: $HOME/eval-runs
#
# The sandbox: the run's file tools and shell commands, its subagents' too, can read the copy
# and nothing else in any user's folders. WebFetch and WebSearch still reach the web. If the
# sandbox cannot start, the run stops instead of running without it.
#
# DRY_RUN=1 sets up the copy, installs, writes sandbox.json, prints the prompt, and tears
# down without a session, so it spends no usage.
set -euo pipefail

usage="usage: run-version.sh <case dir> <version | working-tree> <run dir>"
case_dir=$(cd "${1:?$usage}" && pwd)
version=${2:?$usage}
run_dir=${3:?$usage}

# shellcheck source=/dev/null
source "$case_dir/case.env"
: "${REPO:?case.env needs REPO}" "${COMMIT:?case.env needs COMMIT}"
declare -p TOOLS >/dev/null 2>&1 || { echo "case.env needs TOOLS=(...)" >&2; exit 1; }
declare -p DENIED >/dev/null 2>&1 || DENIED=(AskUserQuestion NotebookEdit)
SKILLS_SOURCE=${SKILLS_SOURCE:-$(git rev-parse --show-toplevel)}
SKILL_DIR=${SKILL_DIR:-skills}
AGENT_DIR=${AGENT_DIR:-agents}
RUNS_ROOT=${RUNS_ROOT:-$HOME/eval-runs}
declare -p ALLOWED_DOMAINS >/dev/null 2>&1 || ALLOWED_DOMAINS=()
command -v claude >/dev/null || { echo "the claude CLI is not installed" >&2; exit 1; }
command -v jq >/dev/null || { echo "jq is not installed" >&2; exit 1; }
need=2.1.257  # the first version whose file tools honor blockReadsOutsideWorkingDirectories
have=$(claude --version 2>/dev/null | awk '{ print $1 }')
[ "$(printf '%s\n' "$need" "$have" | sort -V | head -1)" = "$need" ] \
  || { echo "claude $have is older than $need, which the sandbox needs" >&2; exit 1; }
commit=$(git -C "$REPO" rev-parse --verify --quiet "$COMMIT^{commit}") \
  || { echo "no such commit in $REPO: $COMMIT" >&2; exit 1; }

mkdir -p "$run_dir/outputs" "$RUNS_ROOT"
run_dir=$(cd "$run_dir" && pwd)
copy="$RUNS_ROOT/$(basename "$case_dir")-$(date +%Y%m%d-%H%M%S)-$$"
scratch=$(mktemp -d)
cleanup() {
  rm -rf "$copy" "$scratch"
}
trap cleanup EXIT

# A copy holding the pinned commit and its history, nothing else. A git worktree would keep
# the repo's other branches readable, and with them any later answer to the same request.
git init --quiet "$copy"
git -C "$copy" fetch --quiet --no-tags "$REPO" "$commit"
git -C "$copy" checkout --quiet --detach FETCH_HEAD
rm -f "$copy/.git/FETCH_HEAD"
mkdir -p "$copy/.claude/skills" "$copy/.claude/agents"

# Install the version under test over the repo's own copies.
if [ "$version" != working-tree ]; then
  git -C "$SKILLS_SOURCE" rev-parse --verify --quiet "$version^{commit}" >/dev/null \
    || { echo "no such ref in $SKILLS_SOURCE: $version" >&2; exit 1; }
fi
for skill in ${SKILLS:-}; do
  rm -rf "$copy/.claude/skills/$skill"
  if [ "$version" = working-tree ]; then
    cp -R "$SKILLS_SOURCE/$SKILL_DIR/$skill" "$copy/.claude/skills/"
  else
    git -C "$SKILLS_SOURCE" archive "$version" "$SKILL_DIR/$skill" | tar -x -C "$scratch"
    cp -R "$scratch/$SKILL_DIR/$skill" "$copy/.claude/skills/"
  fi
done
for agent in ${AGENTS:-}; do
  if [ "$version" = working-tree ]; then
    cp "$SKILLS_SOURCE/$AGENT_DIR/$agent.md" "$copy/.claude/agents/$agent.md"
  else
    git -C "$SKILLS_SOURCE" show "$version:$AGENT_DIR/$agent.md" > "$copy/.claude/agents/$agent.md"
  fi
done

# The prompt is everything after the settings block, word for word.
prompt=$(awk 'NR == 1 && $0 == "---" { inside = 1; next }
              inside && $0 == "---" { inside = 0; started = 1; next }
              inside { next }
              started || NR > 0 { print }' "$case_dir/prompt.md" | sed '/./,$!d')
printf '%s\n' "$prompt" > "$run_dir/prompt.txt"
printf '%s\n' "$version" > "$run_dir/version.txt"

# Under the read block, the sandbox denies shell commands every user's folders and re-opens
# only the working directory. Auto-allow stays off so TOOLS remains the only allow list.
jq -n '{permissions: {blockReadsOutsideWorkingDirectories: true},
        sandbox: {enabled: true, failIfUnavailable: true, allowUnsandboxedCommands: false,
                  autoAllowBashIfSandboxed: false,
                  network: {allowedDomains: $ARGS.positional}}}' \
  --args ${ALLOWED_DOMAINS[@]+"${ALLOWED_DOMAINS[@]}"} > "$run_dir/sandbox.json"

if [ "${DRY_RUN:-0}" = 1 ]; then
  echo "copy: $copy at $COMMIT, $(git -C "$copy" rev-list --count HEAD) commits, $(git -C "$copy" for-each-ref | wc -l | tr -d ' ') other refs"
  echo "installed from $version: skills ${SKILLS:-none}; agents ${AGENTS:-none}"
  echo "sandbox: $(jq -c . "$run_dir/sandbox.json")"
  echo "prompt ($(printf '%s' "$prompt" | wc -c | tr -d ' ') bytes): $(printf '%s' "$prompt" | head -c 160)"
  exit 0
fi

(cd "$copy" && claude -p "$prompt" --output-format json --permission-mode dontAsk \
    --settings "$run_dir/sandbox.json" \
    --allowedTools "${TOOLS[@]}" --disallowedTools "${DENIED[@]}") > "$run_dir/run.json"
jq '.permission_denials // []' "$run_dir/run.json" > "$run_dir/denials.json"

# What the run produced: its final message, and every file it wrote outside .claude/.
jq -r '.result' "$run_dir/run.json" > "$run_dir/outputs/report.md"
git -C "$copy" status --porcelain --untracked-files=all | sed 's/^...//' \
  | { grep -v '^\.claude/' || true; } | while IFS= read -r path; do
      mkdir -p "$run_dir/outputs/$(dirname "$path")"
      cp "$copy/$path" "$run_dir/outputs/$path"
    done

jq '{duration_ms, total_duration_seconds: (.duration_ms / 1000), cost_usd: .total_cost_usd,
     turns: .num_turns, total_tokens: (.usage.input_tokens + .usage.cache_creation_input_tokens
       + .usage.cache_read_input_tokens + .usage.output_tokens)}' "$run_dir/run.json" > "$run_dir/timing.json"

# The transcript, its agents, and every path a tool call named outside the copy.
session=$(jq -r '.session_id' "$run_dir/run.json")
transcript=$(find "$HOME/.claude/projects" -maxdepth 2 -name "$session.jsonl" | head -1)
if [ -n "$transcript" ]; then
  cp "$transcript" "$run_dir/transcript.jsonl"
  [ -d "${transcript%.jsonl}/subagents" ] && cp -R "${transcript%.jsonl}/subagents" "$run_dir/subagents"
  jq -r 'select(.type == "assistant") | .message.content[]? | select(.type == "tool_use") | .input | tostring' \
      "$run_dir/transcript.jsonl" "$run_dir"/subagents/*.jsonl 2>/dev/null \
    | grep -oE "$HOME/[^\"[:space:]\\\\\`)]*|\\.\\./[^\"[:space:]\\\\\`)]*" \
    | grep -v "^$copy" | sort | uniq -c | sort -rn > "$run_dir/outside-reads.txt" || true
  # The sandbox under the shell refuses inside the command, so its refusals never reach
  # denials.json. They show only in the command's output.
  jq -r 'select(.type == "user") | .message.content[]? | select(.type == "tool_result")
         | .content | if type == "array" then map(.text? // "") | join(" ") else tostring end
         | select(test("Operation not permitted|sandbox_violations"))
         | select(test("^\\[Subagent hand-back\\]") | not) | gsub("\\s+"; " ") | .[0:300]' \
      "$run_dir/transcript.jsonl" "$run_dir"/subagents/*.jsonl 2>/dev/null \
    > "$run_dir/sandbox-blocks.txt" || true
fi

echo "$version: $(jq -r '"\(.turns) turns, $\(.cost_usd), \(.total_duration_seconds | floor)s"' "$run_dir/timing.json")"
echo "outputs: $(cd "$run_dir/outputs" && find . -type f | sed 's#^\./##' | tr '\n' ' ')"
echo "paths outside its copy: $(wc -l < "$run_dir/outside-reads.txt" 2>/dev/null | tr -d ' ' || echo 0)"
echo "tool calls refused: $(jq length "$run_dir/denials.json")"
echo "commands the sandbox blocked: $(wc -l < "$run_dir/sandbox-blocks.txt" 2>/dev/null | tr -d ' ' || echo 0)"
