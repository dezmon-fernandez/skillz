#!/usr/bin/env bash
# PostToolUse on Edit|Write: after Claude edits annotate's page or its Tailwind source, rebuild the
# compiled stylesheet that ships (skills/annotate/scripts/annotate.css), so it never falls behind.
# Fails open: a missing jq, an unreadable event, or no installed tooling leaves the build to `npm run check`.
command -v jq >/dev/null 2>&1 || exit 0
file=$(jq -r '.tool_input.file_path // empty' 2>/dev/null) || exit 0
case "$file" in
  */skills/annotate/scripts/annotate.html | */skills/annotate/scripts/styles.css) ;;
  *) exit 0 ;;
esac
cd "${CLAUDE_PROJECT_DIR:-}" 2>/dev/null || exit 0
[ -x node_modules/.bin/tailwindcss ] || exit 0
if output=$(npm run --silent build:annotate 2>&1); then
  note="Rebuilt skills/annotate/scripts/annotate.css after the edit to ${file##*/skillz/}. Commit it with the change."
else
  note="Rebuilding skills/annotate/scripts/annotate.css failed after the edit to ${file##*/skillz/}: $(printf '%s' "$output" | grep -m1 -i error)"
fi
jq -n --arg note "$note" '{hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext: $note}}'
exit 0
