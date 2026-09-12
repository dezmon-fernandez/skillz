---
name: debug-frontend
description: TRIGGER when asked to run, open, screenshot, click through, or visually verify the Coyote UI in a real browser, or to debug something that only reproduces in the app (layout, routing, auth, console errors). Drives the running app through Envoy mTLS with agent-browser. Not for unit tests — that is angular-testing.
---

# Debug Frontend

Drive the real app in a headless browser to see a change working, capture a screenshot, read the
accessibility tree, or chase an error that unit tests cannot reproduce. The tool is agent-browser; the
target is the app at `https://localhost:8443`, behind Envoy's mutual TLS. Never `:4200`, which skips auth.

## Preflight

Both halves of the stack must be up before the browser can reach anything.

```bash
scripts/local-backend.sh status      # envoy ready: LIVE, registry via mTLS: 200
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:4200   # 200 means npm start is up
```

If Envoy is down: `scripts/local-backend.sh up`. If the dev server is down: `npm start` in the background.

## agent-browser

Fast browser automation CLI for AI agents. Chrome/Chromium via CDP with accessibility-tree snapshots and
compact `@eN` element refs.

This skill is not the agent-browser usage guide. Before running any `agent-browser` command, load the
actual workflow content from the CLI:

```bash
agent-browser skills get core             # start here — workflows, common patterns, troubleshooting
agent-browser skills get core --full      # include full command reference and templates
```

The CLI serves skill content that always matches the installed version, so instructions never go stale.
That is why this skill carries none of it and only points at `skills get core`.

## Open the app

The only Coyote-specific part of driving the browser is where to point it.

```bash
export AGENT_BROWSER_SESSION=coyote
agent-browser open https://localhost:8443
```

A successful open prints `Open Arsenal`. From there, every command in `skills get core` applies as written.

## References

- `references/rhel-setup-and-troubleshooting.md`: one-time machine setup, the error table for every way
  `open` can fail, and Envoy-side diagnosis. Read it on any certificate error, `Page.navigate` timeout, or
  `No Chrome binary found`. Other platforms get their own file in `references/`.
