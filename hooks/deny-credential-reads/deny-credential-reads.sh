#!/usr/bin/env bash
# Denies reading a file that holds keys or passwords (a .env file, a credentials file, a
# private key) through Read, Grep, or a shell command. Exit 2 blocks; exit 0 is no opinion.
# It fails open when jq is missing or the payload cannot be parsed: a broken guard that
# blocked every Read, Grep and shell call would stop all work.
command -v jq >/dev/null 2>&1 || exit 0
payload=$(cat) || exit 0
tool=$(jq -r '.tool_name // empty' <<<"$payload" 2>/dev/null) || exit 0
case "$tool" in
  Read) targets=$(jq -r '.tool_input.file_path // empty' <<<"$payload" 2>/dev/null) ;;
  Grep) targets=$(jq -r '[.tool_input.path, .tool_input.glob] | map(select(. != null)) | .[]' <<<"$payload" 2>/dev/null) ;;
  Bash) targets=$(jq -r '.tool_input.command // empty' <<<"$payload" 2>/dev/null) ;;
  *) exit 0 ;;
esac
[ -n "$targets" ] || exit 0

# A secret file's name as a whole word: .env, .envrc and .env.<name>, netrc and package-registry
# credentials, a cloud credentials file, a private key. A public key (.pub) and a .env
# example, sample, template or dist file pass.
before='(^|[[:space:]/'"'"'"=:(<])'
after='($|[[:space:]'"'"'";|&)<>])'
names='\.env(\.[[:alnum:]_-]+)?|\.envrc|\.netrc|\.git-credentials|\.npmrc|\.pypirc|\.aws/credentials|credentials\.json|id_(rsa|dsa|ecdsa|ed25519)|[^[:space:]/'"'"'"]+\.(pem|p12|pfx)'
hit=$(grep -oE "${before}(${names})${after}" <<<"$targets" \
  | grep -vE '\.env\.(example|sample|template|dist)' | head -1 \
  | sed -E "s/^[[:space:]/'\"=:(<]//; s/[[:space:]'\";|&)<>]$//")
[ -n "$hit" ] || exit 0

echo "Blocked: ${hit} holds keys or passwords. Do not read credential files; if the work needs a secret, stop and ask the developer." >&2
exit 2
