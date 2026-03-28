Review recent changes and ship them to GitHub in three steps:

## Step 1 — Update CLAUDE.md

Read the project CLAUDE.md and compare it against the current state of the codebase (recent git diff, modified files, new conventions). Update CLAUDE.md if anything is stale or missing. If nothing needs changing, skip without comment.

## Step 2 — Review .gitignore

Run `git status` to see untracked files. For each untracked file, decide whether it should be committed or ignored:
- If it belongs in the repo, leave it for the commit step.
- If it should be ignored (secrets, generated files, personal media, local tooling), add it to `.gitignore` with a brief comment.

## Step 3 — Commit and push

Stage all appropriate changes and create a single commit. Write a concise commit message that summarizes what changed and why. Push to the remote (origin main).
