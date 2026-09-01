# Contributing to TriageCore

Welcome! This guide outlines the standard Git workflow for our team to keep the codebase clean and avoid merge conflicts.

## The Standard Workflow

Whenever you sit down to work on a new feature or bug, follow these exact steps:

### 1. Get the Latest Code
Always start by making sure your local `main` branch is up to date before doing anything else.
```bash
git checkout main
git pull origin main
```

### 2. Create a New Branch
Never commit directly to the `main` branch. Create a new branch for your specific task.
```bash
git checkout -b <type>/<short-description>
```
**Branch Naming Convention:**
- Features: `feature/add-database-models`
- Bug Fixes: `bugfix/fix-login-crash`
- Docs/Chores: `chore/update-readme`

### 3. Make Changes and Commit
As you work, save your progress by making commits. 
```bash
git add .
git commit -m "<type>: <brief description>"
```
**Commit Message Format (Conventional Commits):**
- `feat: added playwright self-healing logic`
- `fix: resolved redis connection timeout`
- `docs: updated contribution guide`
- `chore: updated python dependencies`

### 4. Push Your Branch
Once you're happy with your changes, push your branch up to GitHub.
```bash
git push -u origin <your-branch-name>
```

### 5. Open a Pull Request (PR)
1. Go to the repository on GitHub.
2. You will see a green button that says "Compare & pull request" for your recently pushed branch. Click it!
3. Add a brief description of what you changed.
4. (Optional) Request a review from a group member if you want them to look it over.
5. Once you are confident, you can click "Merge pull request" to combine your code into `main`!
   - **WARNING:** PRs opened automatically by the CI Reliability Agent are not routine. Review the confidence score and reasoning trace in the PR body before merging. Do not fast-merge these.

### 6. Clean Up
After merging, you can delete your branch locally and on GitHub to keep things tidy.
```bash
git checkout main
git pull origin main
git branch -d <your-branch-name>
```
