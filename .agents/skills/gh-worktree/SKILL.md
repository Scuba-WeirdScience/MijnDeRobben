---
name: gh-worktree
description: Creates a git worktree for a GitHub Issue in the current repository. Resolves the repo and default branch at runtime, fetches the issue with gh, and creates a standardized branch and worktree folder. USE FOR: new feature branch, start issue, create worktree, new branch for issue, worktree for GitHub issue, feature worktree.
compatibility: opencode
---

# GitHub Worktree Skill

Creates a git worktree for a GitHub Issue in the current repository without assuming a specific agent, plugin, or companion skill.

## Context

- Requires a git repository with an `origin` remote that points to GitHub.
- Requires the `gh` CLI to be installed and authenticated.
- Resolves the repository owner/name, default branch, and main worktree path at runtime.

## When to Use

Triggered when the user wants to start work on a GitHub Issue and needs a clean worktree and branch.

---

## Workflow

### Step 0: Resolve the Main Worktree Root

Run:

```powershell
git worktree list --porcelain
```

Parse the output. The first `worktree` entry is the main worktree. Extract that path and call it `[repo-root]`.

All additional worktrees are placed inside `[repo-root]`, not next to it.

---

### Step 1: Resolve the GitHub Repository and Default Branch

Run:

```powershell
gh repo view --json nameWithOwner,defaultBranchRef --jq "{ repo: .nameWithOwner, defaultBranch: .defaultBranchRef.name }"
```

If that fails, stop and tell the user that `gh` is not authenticated for the current repository.

Call the resolved values `[repo]` and `[default-branch]`.

---

### Step 2: Ask for the Issue Number

Ask the user:

> What is the GitHub Issue number you want to work on?

---

### Step 3: Fetch the Issue from GitHub

Use the `gh` CLI:

```powershell
gh issue view [issue-number] --repo [repo] --json number,title,state
```

Extract the title. If the issue is closed, warn the user and ask for confirmation to proceed anyway.

Then sanitize the title for use in branch and folder names:
- Convert to lowercase.
- Replace spaces with dashes (`-`).
- Remove characters that are invalid in git branch names or Windows folder names.
- Collapse consecutive dashes into one.
- Trim leading and trailing dashes.
- Truncate to 50 characters max.

Call the sanitized title `[sanitized-title]`.

---

### Step 4: Derive Names

| Variable | Value |
|---|---|
| `[repo-root]` | Main worktree path from Step 0 |
| `[repo]` | GitHub repo from Step 1 |
| `[default-branch]` | Default branch from Step 1 |
| `[issue-number]` | The GitHub issue number (for example `42`) |
| `[sanitized-title]` | Sanitized title (for example `add-login-page`) |
| Branch name | `feature/[issue-number]-[sanitized-title]` |
| Folder name | `feature-[issue-number]` |
| Worktree path | `[repo-root]/feature-[issue-number]` |

Show the user the derived names and ask for confirmation before proceeding:

> I'll create:
> - Branch: `feature/[issue-number]-[sanitized-title]`
> - Folder: `[repo-root]/feature-[issue-number]`
>
> Proceed?

---

### Step 5: Fetch the Latest Default Branch

```powershell
git -C "[repo-root]" fetch origin [default-branch]
```

---

### Step 6: Update the Local Default Branch

```powershell
git -C "[repo-root]" checkout [default-branch]
git -C "[repo-root]" merge --ff-only origin/[default-branch]
```

If `--ff-only` fails, warn the user and stop. Do not force-reset without explicit confirmation.

---

### Step 7: Add the Worktree

Check first that the folder does not already exist:

```powershell
Test-Path "[repo-root]/feature-[issue-number]"
```

If it exists, warn the user and offer to use the existing folder or pick a different name.

Otherwise create the worktree:

```powershell
git -C "[repo-root]" worktree add "[repo-root]/feature-[issue-number]" -b "feature/[issue-number]-[sanitized-title]"
```

If the local branch already exists, omit `-b`:

```powershell
git -C "[repo-root]" worktree add "[repo-root]/feature-[issue-number]" "feature/[issue-number]-[sanitized-title]"
```

---

### Step 8: Verify

```powershell
git -C "[repo-root]" worktree list
```

Confirm the new worktree appears in the list.

---

### Step 9: Handle Dependencies if Needed

Inspect the new worktree for package managers or build manifests that normally require installation, then ask the user whether to install dependencies now.

Examples:

```powershell
Test-Path "[repo-root]/feature-[issue-number]/package.json"
Test-Path "[repo-root]/feature-[issue-number]/frontend/package.json"
Test-Path "[repo-root]/feature-[issue-number]/functions/package.json"
```

Only run install commands after confirming with the user.

---

### Step 10: Switch the Working Context

If the current agent can change the active working directory or workspace context, switch to `[repo-root]/feature-[issue-number]`.

If it cannot, tell the user the new path and continue using explicit paths in commands.

---

### Step 11: Offer to Start Implementation

Ask the user:

> Would you like me to start implementing issue #[issue-number] now?

If yes, continue in the new worktree using the current agent's normal implementation workflow.

---

### Step 12: Summary

> Worktree ready.
>
> - Issue: #[issue-number] — [original title]
> - Branch: `feature/[issue-number]-[sanitized-title]`
> - Folder: `[repo-root]/feature-[issue-number]`
>
> When you're ready to open a PR, push the branch to origin and create the PR using your usual GitHub workflow.

---

## Rules

- Always resolve `[repo-root]` from `git worktree list --porcelain` at runtime. Never hardcode it.
- Always resolve `[repo]` and `[default-branch]` at runtime. Never hardcode them.
- Always place worktrees inside `[repo-root]` unless the user asks for a different location.
- Always use `git -C "[repo-root]"` for git commands instead of relying on the current shell directory.
- Never create the worktree if the target folder already exists. Warn and offer alternatives.
- Always confirm branch and folder names with the user before creating anything.
- Do not push any commits during setup. The remote branch is created on first push.
