# docs/posts — Ready-to-post content, daily

The pipeline auto-generates **1 folder per day**: `docs/posts/<YYYY-MM-DD>/`

Open today's folder and you have everything needed to post — no further searching.

## Daily structure

| File          | Purpose                                                      |
| ------------- | ------------------------------------------------------------ |
| `ready.md`    | Pre-written posts for **X / Reddit / LinkedIn** (copy-paste) |
| `visual.png`  | 1200×630 chart image — attach when posting LinkedIn/X        |
| `visual.html` | HTML source of the image (no need to touch)                  |

## How to post (2 minutes)

1. Open today's folder: `docs/posts/<date>/`
2. Open `ready.md` → copy the **X** section to X, the **Reddit** section to Reddit, the **LinkedIn** section to LinkedIn
3. Attach `visual.png` (LinkedIn/X)
4. After posting → log the post link in `PROGRESS.md` (under "Next steps") to track

## Notes

- Files are created by `bun run posts` + `bun run visual` (run inside `scripts/run.sh`)
- If a day has no files → the pipeline errored somewhere that day; check `data/cron.log` (local) or the repo's Actions tab
- `ready.md` is always generated from the latest snapshot — use that day's folder for the day you post
