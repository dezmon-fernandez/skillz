# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Where a real-work round stands: uv run --script status.py <round folder> [--follow]

Reads the logs a round's steps write, <round>/<version>/<nn>-<label>.jsonl from
`claude -p --output-format stream-json --verbose`, and the session transcripts Claude Code
keeps under ~/.claude/projects/. Prints each step's time, cost and tool calls, what is
running now and for how long, and any comment page a session is waiting on. Changes nothing.
--follow redraws every 5 seconds until Ctrl-C. --serve [port] serves it as a page that reloads
every 5 seconds (default port 8700), under the round's `now.md`, the coordinator's own note.
"""

from __future__ import annotations

import html
import http.server
import json
import os
import re
import subprocess
import sys
import time
from collections import Counter
from datetime import datetime
from pathlib import Path

PROJECTS = Path.home() / ".claude" / "projects"
QUIET_SECONDS = 120  # a live session with no log write for this long, beside an open page, is waiting
SLOW_SECONDS = 10  # a call of the session's own shorter than this is not worth a line


_parsed: dict[Path, tuple[tuple[float, int], list[dict]]] = {}


def lines(path: Path) -> list[dict]:
    """The JSON lines of a file, parsed once per change of the file (--serve rereads every 5 s)."""
    try:
        st = path.stat()
        text = path.read_text()
    except OSError:
        return []
    key = (st.st_mtime, st.st_size)
    if path in _parsed and _parsed[path][0] == key:
        return _parsed[path][1]
    out = []
    for line in text.splitlines():
        try:
            out.append(json.loads(line))
        except json.JSONDecodeError:
            pass
    _parsed[path] = (key, out)
    return out


def stamp(event: dict) -> float | None:
    value = event.get("timestamp")
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
    except ValueError:
        return None


def born(path: Path) -> float:
    st = path.stat()
    return getattr(st, "st_birthtime", st.st_ctime)


def minutes(seconds: float) -> str:
    return f"{seconds / 60:.1f} min" if seconds >= 60 else f"{seconds:.0f} s"


def label(block: dict) -> str:
    inp = block.get("input") or {}
    name = block.get("name", "?")
    if name == "Agent":
        text = f'{inp.get("subagent_type", "agent")} "{inp.get("description", "")}"'
    elif inp.get("file_path"):
        text = f'{name} {Path(inp["file_path"]).name}'
    else:
        text = f'{name} {inp.get("description") or inp.get("command") or inp.get("pattern") or inp.get("url") or ""}'
    return re.sub(r"\s+", " ", text).strip()[:80]


def run(cmd: list[str]) -> str:
    try:
        return subprocess.run(cmd, capture_output=True, text=True, timeout=5).stdout
    except (OSError, subprocess.SubprocessError):
        return ""


def headless_sessions() -> dict[str, list[int]]:
    """Working folder -> pids of running `claude -p` sessions. An interactive session the
    developer has open in the same folder is not a step, so it is left out."""
    pids = run(["pgrep", "-f", "^claude -p "]).split()
    found: dict[str, list[int]] = {}
    pid = None
    for row in run(["lsof", "-a", "-p", ",".join(pids), "-d", "cwd", "-Fpn"]).splitlines() if pids else []:
        if row.startswith("p"):
            pid = int(row[1:])
        elif row.startswith("n") and pid:
            found.setdefault(row[1:], []).append(pid)
    return found


def pages() -> dict[str, list[str]]:
    """Working folder -> addresses of open annotate pages started there."""
    found: dict[str, list[str]] = {}
    for pid in run(["pgrep", "-f", "annotate/scripts/annotate.ts"]).split():
        cwd = next((r[1:] for r in run(["lsof", "-a", "-p", pid, "-d", "cwd", "-Fn"]).splitlines() if r.startswith("n")), "")
        port = re.search(r":(\d+) \(LISTEN\)", run(["lsof", "-nP", "-a", "-p", pid, "-iTCP", "-sTCP:LISTEN"]))
        if cwd and port:
            found.setdefault(cwd, []).append(f"http://127.0.0.1:{port.group(1)}/")
    return found


def agents(folder: Path, step_text: str) -> list[dict]:
    out = []
    for meta_path in sorted(folder.glob("*.meta.json")):
        try:
            meta = json.loads(meta_path.read_text())
        except (OSError, json.JSONDecodeError):
            continue
        if meta.get("toolUseId", "-") not in step_text:
            continue
        events = lines(meta_path.with_name(meta_path.name.replace(".meta.json", ".jsonl")))
        times = [t for t in (stamp(e) for e in events) if t]
        meta["events"] = events
        calls, last, models = Counter(), "", Counter()
        for e in events:
            msg = e.get("message") or {}
            if e.get("type") == "assistant":
                models[msg.get("model", "?")] += 1
                for block in msg.get("content") or []:
                    if block.get("type") == "tool_use":
                        calls[block["name"]] += 1
                        last = label(block)
        out.append({
            "name": f'{meta.get("agentType", "?")} "{meta.get("description", "")}"',
            "done": meta.get("finished") is True,
            "start": min(times) if times else 0.0,
            "end": max(times) if times else 0.0,
            "calls": calls, "last": last, "task": current_task(events),
            "briefed": task_ranges(meta.get("description", "")),
            "named": [t for text in own_words(events, tools_only=True) for t, _ in task_ranges(text)],
            "model": models.most_common(1)[0][0].replace("claude-", "") if models else "?",
            "events": events,
        })
    return out


TASK = re.compile(r"\bTask (\d+(?:\.\d+)?)\b")


def current_task(events: list[dict]) -> str:
    """The plan task a session last named in its own words or a tool's description: plans number
    their tasks "Task 3" or "Task 2.1". Empty when it never named one."""
    named = ""
    for e in events:
        if e.get("type") != "assistant" or e.get("parent_tool_use_id"):
            continue
        for block in (e.get("message") or {}).get("content") or []:
            text = block.get("text", "") if block.get("type") == "text" else \
                (block.get("input") or {}).get("description", "") if block.get("type") == "tool_use" else ""
            found = TASK.findall(text or "")
            if found:
                named = f"Task {found[-1]}"
    return named


MENTION = re.compile(r"\btasks? (\d+(?:\.\d+)?)(?:\s*(?:-|–|to)\s*(\d+(?:\.\d+)?))?", re.I)


def own_words(events: list[dict], tools_only: bool = False) -> list[str]:
    """A session's own text and the descriptions it gave its tool calls, in order. With
    tools_only, only the descriptions: what it is doing, not what it says it will do."""
    out = []
    for e in events:
        if e.get("type") != "assistant" or e.get("parent_tool_use_id"):
            continue
        for block in (e.get("message") or {}).get("content") or []:
            if block.get("type") == "text" and not tools_only:
                out.append(block.get("text", ""))
            elif block.get("type") == "tool_use":
                out.append((block.get("input") or {}).get("description", "") or "")
    return out


def task_ranges(text: str) -> list[tuple[str, str]]:
    """(first, last) per task or range named in a text: "task 13" -> (13, 13), "tasks 1-12" -> (1, 12)."""
    return [(m.group(1), m.group(2) or m.group(1)) for m in MENTION.finditer(text or "")]


def order(task_id: str) -> tuple[int, ...]:
    return tuple(int(p) for p in task_id.split("."))


def plan_tasks(plan: Path) -> list[tuple[str, str]]:
    """(id, title) per task: headings like "#### Task 2.1 ...", or the numbered list under a
    STEP-BY-STEP TASKS heading."""
    text = plan.read_text(errors="ignore")
    found = re.findall(r"^#{2,5} Task (\d+(?:\.\d+)?)\s*[:.-]?\s*(.*)$", text, re.M)
    if not found:
        section = re.search(r"^#+ STEP-BY-STEP TASKS\s*$(.*?)(?=^#{1,2} |\Z)", text, re.M | re.S | re.I)
        found = re.findall(r"^(\d+)\. (.*)$", section.group(1), re.M) if section else []
    return [(i, re.sub(r"[*`]", "", title).strip()[:72]) for i, title in found]


def build_plan(window: list[dict]) -> Path | None:
    """The plan a step builds: the plan file its `execute` command names, when it has tasks."""
    for e in window:
        content = (e.get("message") or {}).get("content")
        if e.get("type") != "user" or not isinstance(content, str):
            continue
        name = re.search(r"<command-name>/?(\S+?)</command-name>", content)
        path = re.search(r"<command-args>\s*(/\S+?\.md)", content)
        if name and "execute" in name.group(1) and path and Path(path.group(1)).is_file():
            plan = Path(path.group(1))
            return plan if plan_tasks(plan) else None
    return None


def result_text(block: dict) -> str:
    content = block.get("content")
    if isinstance(content, list):
        content = " ".join(c.get("text", "") for c in content if isinstance(c, dict))
    rows = [r.strip() for r in str(content or "").splitlines() if r.strip()]
    if not rows:
        return ""
    # A failed shell call reads "Exit code N" then its output; the output's last line is usually
    # the verdict (a test summary, the exception).
    return (f"{rows[0]}: {rows[-1]}" if rows[0].startswith("Exit code") and len(rows) > 1 else rows[0])[:120]


# A search that finds nothing exits non-zero. That is an answer, not something that went wrong.
SEARCHES = {"grep", "rg", "find", "ls", "test", "[", "cat", "head", "tail", "sed", "awk", "diff", "which"}


def is_search(command: str) -> bool:
    last = re.split(r"&&|;|\|\|", command or "")[-1].strip().split()
    return bool(last) and last[0] in SEARCHES


def task_log(events: list[dict], known: list[str], start_on: str | None = None) -> dict[str, dict]:
    """Per task: when the session first and last worked on it, its calls, and its failed calls.
    The task is the last one the session named: in a tool call's description, or one task alone
    in its own words ("Task 2.1", never "tasks 1-12"). An agent briefed with one task starts on it."""
    log: dict[str, dict] = {}
    current, owner, before = start_on, {}, None
    for e in events:
        t = stamp(e)
        content = (e.get("message") or {}).get("content")
        if t is None or not isinstance(content, list):
            continue
        # Time counts toward the task that was current while it passed, so a late mention of an
        # old task adds a moment to it, not the whole gap since it was first named.
        if before is not None and current in log:
            log[current]["time"] += t - before
        before = t
        for block in content:
            if block.get("type") == "text" and e.get("type") == "assistant":
                single = [first for first, last in task_ranges(block.get("text", "")) if first == last and first in known]
                if single:
                    current = single[0]
            elif block.get("type") == "tool_use":
                named = [first for first, _ in task_ranges((block.get("input") or {}).get("description", ""))]
                named = [n for n in named if n in known]
                if named:
                    current = named[0]
                if current is None:
                    continue
                owner[block.get("id")] = (current, label(block), (block.get("input") or {}).get("command", ""))
                row = log.setdefault(current, {"start": t, "end": t, "time": 0.0, "calls": 0, "failed": []})
                row["calls"] += 1
                row["end"] = max(row["end"], t)
            elif block.get("type") == "tool_result" and block.get("tool_use_id") in owner:
                task, what, command = owner[block["tool_use_id"]]
                log[task]["end"] = max(log[task]["end"], t)
                if block.get("is_error") and not is_search(command):
                    log[task]["failed"].append(f"{what[:50]}: {result_text(block)}")
    return log


def task_lines(plan: Path, window: list[dict], found: list[dict], running: bool) -> list[str]:
    """The plan's tasks, each marked done, in progress or not reached, with its time and failures."""
    tasks = plan_tasks(plan)
    known = [i for i, _ in tasks]

    def between(first: str, last: str) -> list[str]:
        return [i for i in known if order(first) <= order(i) <= order(last)]

    done: set[str] = set()
    doing: set[str] = set()
    logs = [task_log([e for e in window if e.get("type") in ("assistant", "user")], known)]
    # Evidence only. A finished agent did the tasks it was briefed with. A running one is on the
    # last task it named while working, or on its whole brief until it names one. The session's
    # own tool descriptions say what it is doing; its prose may say what comes later.
    for a in found:
        briefed = [i for first, last in a["briefed"] for i in between(first, last)]
        logs.append(task_log(a["events"], known, start_on=briefed[0] if briefed else None))
        if a["done"]:
            done.update(briefed)
            continue
        own = [t for t in a["named"] if t in briefed] if briefed else [t for t in a["named"] if t in known]
        if own:
            at = max(own, key=order)
            done.update(i for i in briefed if order(i) < order(at))
            doing.add(at)
        else:
            doing.update(briefed)
    # With no agent carrying tasks, the session builds them itself, so the one task it names in its
    # own words is the one it is on. With agents, its words are about what they will do.
    alone = not any(a["briefed"] for a in found)
    mine_named = [t for text in own_words(window, tools_only=not alone)
                  for t, last in task_ranges(text) if t in known and (t == last or not alone)]
    if mine_named:
        at = max(mine_named, key=order)
        done.update(i for i in known if order(i) < order(at) and i not in doing)
        (doing if running else done).add(at)
    doing -= done
    merged: dict[str, dict] = {}
    for one in logs:
        for task, row in one.items():
            m = merged.setdefault(task, {"start": row["start"], "end": row["end"], "time": 0.0, "calls": 0, "failed": []})
            m["start"], m["end"] = min(m["start"], row["start"]), max(m["end"], row["end"])
            m["calls"] += row["calls"]
            m["time"] += row["time"]
            m["failed"] += row["failed"]
    on = ", ".join(i for i in known if i in doing) or "none named"
    out = [f"   tasks in {plan.name}: {len(done)} of {len(tasks)} done; working on: {on}"]
    for i, title in tasks:
        mark = "✓" if i in done else ("▶" if i in doing else " ")
        row = merged.get(i)
        took = minutes(row["time"]) if row else ""
        failed = f'{len(row["failed"])} failed' if row and row["failed"] else ""
        out.append(f"     {mark} {i:>4}  {took:>8}  {failed:<9}  {title}")
    stuck = sorted(((len(r["failed"]), r["end"] - r["start"], i, r) for i, r in merged.items() if r["failed"]), reverse=True)
    if stuck:
        out.append("   what threw it off (failed calls, last one shown):")
        for n, _, i, r in stuck[:5]:
            out.append(f"     Task {i}: {n} failed. {r['failed'][-1]}")
    return out


def call_times(transcript: list[dict], ids: set[str]) -> dict[str, float]:
    """tool_use id -> seconds from the call to its result, from the session transcript."""
    asked, took = {}, {}
    for e in transcript:
        t = stamp(e)
        content = (e.get("message") or {}).get("content")
        if t is None or not isinstance(content, list):
            continue
        for block in content:
            if block.get("type") == "tool_use" and block.get("id") in ids:
                asked[block["id"]] = t
            elif block.get("type") == "tool_result" and block.get("tool_use_id") in asked:
                took[block["tool_use_id"]] = t - asked[block["tool_use_id"]]
    return took


def version_report(folder: Path, live: dict[str, list[int]], open_pages: dict[str, list[str]], now: float) -> tuple[list[str], list[str]]:
    out, needs = [], []
    logs = sorted(p for p in folder.glob("[0-9][0-9]-*.jsonl"))
    if not logs:
        return [f"{folder.name}  no step yet"], needs
    session_total: dict[str, float] = {}
    transcripts: dict[str, list[dict]] = {}
    rows, detail, build = [], [], []
    total_time = total_cost = 0.0
    cwd = ""
    for i, log in enumerate(logs):
        events = lines(log)
        init = next((e for e in events if e.get("type") == "system" and e.get("subtype") == "init"), {})
        cwd = init.get("cwd", cwd)
        session = init.get("session_id", "")
        results = [e for e in events if e.get("type") == "result"]
        total = results[-1].get("total_cost_usd", 0.0) if results else session_total.get(session, 0.0)
        cost = total - session_total.get(session, 0.0)
        session_total[session] = total
        last_write = log.stat().st_mtime
        latest = i == len(logs) - 1
        running = latest and cwd in live
        took = (now if running else last_write) - born(log)
        total_time += took
        total_cost += cost
        mine = [b for e in events if e.get("type") == "assistant" and not e.get("parent_tool_use_id")
                for b in (e.get("message") or {}).get("content") or [] if b.get("type") == "tool_use"]
        project = PROJECTS / re.sub(r"[^A-Za-z0-9]", "-", cwd)
        step_text = log.read_text(errors="ignore")
        found = agents(project / session / "subagents", step_text)
        longest = max(found, key=lambda a: a["end"] - a["start"], default=None)
        agent_note = "-" if not found else f'{len(found)}, longest {longest["name"].split(" ")[0]} {minutes(longest["end"] - longest["start"])}'
        state = f"RUNNING {minutes(took)}" if running else minutes(took)
        rows.append((log.stem[:2], log.stem[3:], state, f"${cost:.2f}" if results else "-", str(len(mine)), agent_note))
        if session not in transcripts:
            transcripts[session] = lines(project / f"{session}.jsonl")
        until = now if running else last_write
        window = [e for e in transcripts[session] if born(log) - 5 <= (stamp(e) or 0) <= until + 5]
        plan = build_plan(window)
        if plan:
            # The last step that built a plan keeps its task list on show after later steps start.
            build = [f"   step {log.stem}:"] + task_lines(plan, window, found, running)
        if not latest:
            continue
        if running:
            quiet = now - last_write
            waiting = open_pages.get(cwd, [])
            if waiting and quiet > QUIET_SECONDS:
                for page in waiting:
                    needs.append(f"{folder.name} is waiting on a comment page: {page} (no log write for {minutes(quiet)})")
            task = current_task(events)
            if task:
                detail.append(f"   on:   {task}")
            if mine:
                detail.append(f"   now:  {label(mine[-1])}  ({minutes(quiet)} since the last write)")
        for a in found:
            if not a["done"]:
                on = f' on {a["task"]},' if a["task"] else ""
                detail.append(f'   agent running: {a["name"]}{on} {a["model"]}, {minutes(now - a["start"])}, '
                              f'{sum(a["calls"].values())} calls, last: {a["last"]}')
        if mine:
            if session not in transcripts:
                transcripts[session] = lines(project / f"{session}.jsonl")
            durations = call_times(transcripts[session], {b["id"] for b in mine})
            slow = sorted(((durations[b["id"]], label(b)) for b in mine
                           if durations.get(b["id"], 0) >= SLOW_SECONDS), reverse=True)[:3]
            by_tool = Counter(b["name"] for b in mine)
            detail.append("   calls this step: " + ", ".join(f"{n} {c}" for n, c in by_tool.most_common()))
            if slow:
                detail.append("   slowest calls: " + " · ".join(f"{text[:60]} {minutes(s)}" for s, text in slow))
        for a in found:
            if a["done"]:
                detail.append(f'   agent: {a["name"]} on {a["model"]}, {minutes(a["end"] - a["start"])}, '
                              f'{sum(a["calls"].values())} calls ({", ".join(f"{n} {c}" for n, c in a["calls"].most_common(3))})')
    out.append(f"{folder.name}  {cwd}")
    widths = [max(len(r[k]) for r in rows + [("#", "step", "took", "cost", "calls", "agents")]) for k in range(6)]
    for r in [("#", "step", "took", "cost", "calls", "agents")] + rows:
        out.append("   " + "  ".join(r[k].ljust(widths[k]) if k != 3 else r[k].rjust(widths[k]) for k in range(6)).rstrip())
    out += detail + build
    out.append(f"   total {minutes(total_time)}, ${total_cost:.2f}")
    return out, needs


def report(round_dir: Path) -> str:
    now = time.time()
    live, open_pages = headless_sessions(), pages()
    out = [f"{round_dir.name}  {datetime.now():%H:%M:%S}", ""]
    needs: list[str] = []
    for folder in sorted(p for p in round_dir.iterdir() if p.is_dir() and any(p.glob("[0-9][0-9]-*.jsonl"))):
        body, waiting = version_report(folder, live, open_pages, now)
        out += body + [""]
        needs += waiting
    out += ["Needs you:"] + [f"   {n}" for n in needs] if needs else ["Needs you: nothing"]
    return "\n".join(out)


def comment_pages() -> list[tuple[str, str]]:
    """(what it shows, address) for every open annotate page on this machine."""
    found = []
    for pid in run(["pgrep", "-f", "annotate/scripts/annotate.ts"]).split():
        port = re.search(r":(\d+) \(LISTEN\)", run(["lsof", "-nP", "-a", "-p", pid, "-iTCP", "-sTCP:LISTEN"]))
        args = run(["ps", "-o", "args=", "-p", pid]).split("annotate.ts", 1)[-1].split()
        shown = ", ".join(Path(a).name for a in args if not a.startswith("-")) or "?"
        if port:
            found.append((shown, f"http://127.0.0.1:{port.group(1)}/"))
    return sorted(set(found))


def page(round_dir: Path) -> str:
    """The report as one page that reloads itself, under the coordinator's own note, `now.md`."""
    note = round_dir / "now.md"
    note_text = note.read_text() if note.is_file() else "(no now.md in the round folder)"
    links = "".join(f'<li><a href="{url}">{html.escape(shown)}</a> {url}</li>' for shown, url in comment_pages())
    return f"""<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="5">
<title>{html.escape(round_dir.name)}</title><style>
body {{ font: 15px/1.5 -apple-system, system-ui, sans-serif; margin: 24px auto; max-width: 1100px; padding: 0 16px;
  background: #fafaf9; color: #1c1917; }}
h2 {{ font-size: 13px; text-transform: uppercase; letter-spacing: .06em; color: #78716c; margin: 28px 0 8px; }}
.note {{ white-space: pre-wrap; background: #fff; border: 1px solid #e7e5e4; border-left: 4px solid #2563eb;
  padding: 12px 16px; border-radius: 6px; }}
pre {{ background: #fff; border: 1px solid #e7e5e4; padding: 12px 16px; border-radius: 6px; overflow-x: auto;
  font: 13px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace; }}
li {{ margin: 4px 0; }} a {{ color: #2563eb; }}
@media (prefers-color-scheme: dark) {{ body {{ background: #1c1917; color: #f5f5f4; }}
  .note, pre {{ background: #292524; border-color: #44403c; }} a {{ color: #60a5fa; }} }}
</style></head><body>
<h2>Now</h2><div class="note">{html.escape(note_text)}</div>
<h2>Comment pages open</h2><ul>{links or "<li>none</li>"}</ul>
<h2>Each side, live</h2><pre>{html.escape(report(round_dir))}</pre>
</body></html>"""


def serve(round_dir: Path, port: int) -> None:
    class Handler(http.server.BaseHTTPRequestHandler):
        def do_GET(self) -> None:
            body = page(round_dir).encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *args: object) -> None:
            pass

    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"Round page: http://127.0.0.1:{port}/  (Ctrl-C stops it)", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


def main() -> None:
    port = None
    if "--serve" in sys.argv:
        port = next((int(a) for a in sys.argv[1:] if a.isdigit()), 8700)
    args = [a for a in sys.argv[1:] if a not in ("--follow", "--serve") and not a.isdigit()]
    if len(args) != 1 or not Path(args[0]).is_dir():
        sys.exit("usage: uv run --script status.py <round folder> [--follow | --serve [port]]")
    round_dir = Path(args[0])
    if port is not None:
        serve(round_dir, port)
        return
    if "--follow" not in sys.argv:
        print(report(round_dir))
        return
    try:
        while True:
            text = report(round_dir)
            os.system("clear")
            print(text, flush=True)
            time.sleep(5)
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
