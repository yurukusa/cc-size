# cc-size

How much conversation history have you accumulated? Shows total disk usage and growth rate of your Claude Code sessions.

```
cc-size — Your Claude Code conversation history

  Total size:    6.1 GB
  Total files:   755 sessions
  Date range:    2026-01-10 → 2026-03-01
  Daily growth:  ~81.8 MB/day (last 30 days)
  Largest file:  1.0 GB
  At this rate:  10 GB by ~2026-04

──────────────────────────────────────────────────────
  Monthly growth

  2026-01  ████████████████████████    3.7 GB
  2026-02  ██████████████░░░░░░░░░░    2.2 GB
  2026-03  █░░░░░░░░░░░░░░░░░░░░░░░  231.1 MB (in progress)

──────────────────────────────────────────────────────
  By project (top 8)

  ~/ (home)          ████████████████████████    5.7 GB
  projects-cc-loop   █░░░░░░░░░░░░░░░░░░░░░░░  224.8 MB
  draemorth          ░░░░░░░░░░░░░░░░░░░░░░░░   59.0 MB
```

## Usage

```bash
npx cc-size              # Total history size and growth
npx cc-size --all        # Include subagent session files
npx cc-size --json       # JSON output
```

## What it shows

- **Total size** — cumulative disk usage of all `.jsonl` session files
- **Sessions** — number of conversation files
- **Daily growth** — average bytes added per day over the last 30 days
- **Largest file** — size of your biggest single session
- **Growth projection** — estimated date to reach 10 GB at current rate
- **Monthly chart** — month-by-month storage breakdown
- **By project** — top 8 projects by storage consumed

## Privacy

Reads file **metadata only** (size + modification time). No file content is accessed or transmitted. Everything runs locally.

## Browser version

Drop your `~/.claude` folder into [cc-size on the web](https://yurukusa.github.io/cc-size/) for the same analysis — no install required.

---

Part of [cc-toolkit](https://yurukusa.github.io/cc-toolkit/) — 53 free tools for Claude Code
