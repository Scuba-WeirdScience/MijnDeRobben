---
name: gh-worktree
description: Creates a git worktree for a GitHub Issue. Asks for an issue number, fetches the title from GitHub (Scuba-WeirdScience/MijnDeRobben), pulls latest main, and sets up a worktree with a standardized folder and branch name. USE FOR: new feature branch, start issue, create worktree, new branch for issue, worktree for GitHub issue, feature worktree.
compatibility: opencode
---

# GitHub Worktree Skill

Creates a git worktree for a GitHub Issue in the MijnDeRobben repository.

## Context

- **GitHub repo:** `Scuba-WeirdScience/MijnDeRobben`
- **Main worktree:** `C:\Projects\DeRobben`
- **Worktrees placed next to** the main worktree folder (i.e. in `C:\Projects\`)

## When to Use

Triggered when the user wants to start work on a GitHub Issue and needs a worktree set up.

---

## Workflow

### Step 0: Resolve the Main Worktree Root

Run:

```powershell
git worktree list --porcelain
```

Parse the output. The **first** entry is always the main worktree. Extract its `worktree` path — call this `[repo-root]`. Its parent folder is `[worktree-parent]`.

> Example: if `[repo-root]` is `C:/Projects/DeRobben`, then `[worktree-parent]` is `C:/Projects`.

All worktrees are placed in `[worktree-parent]`, not inside `[repo-root]`.

---

### Step 1: Ask for the Issue Number

Ask the user:

> What is the GitHub Issue number you want to work on?

---

### Step 2: Fetch the Issue from GitHub

Use the `gh` CLI:

```powershell
$env:GH_TOKEN = "..."; gh issue view [issue-number] --repo Scuba-WeirdScience/MijnDeRobben --json number,title,state
```

Extract the title. If the issue is closed, warn the user and ask for confirmation to proceed anyway.

Then **sanitize** the title for use in branch/folder names:
- Convert to lowercase
- Replace spaces with dashes (`-`)
- Remove any characters invalid in git branch names or Windows folder names: `` ` ~ ! @ # $ % ^ & * ( ) = + [ ] { } \ | ; : ' " , < > / ? ``
- Collapse consecutive dashes into one
- Trim leading/trailing dashes
- Truncate to 50 characters max

Call the sanitized title `[sanitized-title]`.

---

### Step 3: Derive Names

| Variable | Value |
|---|---|
| `[repo-root]` | Main worktree path from Step 0 |
| `[worktree-parent]` | Parent folder of `[repo-root]` |
| `[issue-number]` | The GitHub issue number (e.g. `42`) |
| `[sanitized-title]` | Sanitized title (e.g. `add-login-page`) |
| **Branch name** | `feature/[issue-number]-[sanitized-title]` |
| **Folder name** | `feature-[issue-number]` |
| **Worktree path** | `[worktree-parent]/feature-[issue-number]` |

Show the user the derived names and ask for confirmation before proceeding:

> I'll create:
> - Branch: `feature/[issue-number]-[sanitized-title]`
> - Folder: `[worktree-parent]/feature-[issue-number]`
>
> Proceed?

---

### Step 4: Fetch Latest main

```powershell
git -C "[repo-root]" fetch origin main
```

---

### Step 5: Update Local main

```powershell
git -C "[repo-root]" checkout main
git -C "[repo-root]" merge --ff-only origin/main
```

If `--ff-only` fails (local main has diverged), warn the user and stop. Do NOT force-reset without explicit confirmation.

---

### Step 6: Add the Worktree

Check first that the folder does not already exist:

```powershell
Test-Path "[worktree-parent]/feature-[issue-number]"
```

If it exists, warn the user and offer to use the existing folder or pick a different name.

Otherwise create the worktree:

```powershell
git -C "[repo-root]" worktree add "[worktree-parent]/feature-[issue-number]" -b "feature/[issue-number]-[sanitized-title]"
```

If the local branch already exists (e.g. from a previous attempt), omit `-b`:

```powershell
git -C "[repo-root]" worktree add "[worktree-parent]/feature-[issue-number]" "feature/[issue-number]-[sanitized-title]"
```

---

### Step 7: Verify

```powershell
git -C "[repo-root]" worktree list
```

Confirm the new worktree appears in the list.

---

### Step 8: Install Dependencies

Run `npm install` in both `frontend/` and `functions/` inside the new worktree:

```powershell
# workdir: [worktree-parent]/feature-[issue-number]/frontend
npm install

# workdir: [worktree-parent]/feature-[issue-number]/functions
npm install
```

---

### Step 9: Switch Session Directory

Use the `/cd` command (from the `opencode-dir` plugin) to switch the session to the new worktree root:

```text
/cd [worktree-parent]/feature-[issue-number]
```

If the `opencode-dir` plugin is not installed, add it to `~/.config/opencode/opencode.json`:

```json
{
  "plugin": ["opencode-dir"]
}
```

And inform the user it has been installed.

---

### Step 10: Offer to Start Implementation

Ask the user:

> Would you like me to start implementing issue #[issue-number] now?

- If **yes**: load the `feature-dev` skill and begin the feature development workflow using `[worktree-parent]/feature-[issue-number]` as the working directory.
- If **no**: proceed to the summary.

---

### Step 11: Summary

> Worktree ready!
>
> - **Issue:** #[issue-number] — [original title]
> - **Branch:** `feature/[issue-number]-[sanitized-title]`
> - **Folder:** `[worktree-parent]/feature-[issue-number]`
>
> When you're ready to open a PR, push the branch and run the `gh-ship` skill (or `git push -u origin feature/[issue-number]-[sanitized-title]`).

---

## Rules

- Always resolve `[repo-root]` from `git worktree list --porcelain` at runtime — never hardcode.
- Always place worktrees in `[worktree-parent]` (next to, not inside, `[repo-root]`).
- Always use `git -C "[repo-root]"` for git commands — never `cd` into the repo.
- Never create the worktree if the folder already exists — warn and offer alternatives.
- Always confirm branch/folder names with the user before creating anything.
- Do NOT push any commits — just set up the local worktree and branch. The remote branch is created on first push.
