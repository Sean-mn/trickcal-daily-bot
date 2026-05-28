---
name: write-pr
description: Generate PR title, body, and labels from commits since the base branch, then create the PR on GitHub. Handles base branch detection, label selection, and PR creation end-to-end.
---

## Step 0 — Determine Base Branch

Check the user's arguments and current context:
- If the user mentions `main`, `배포`, or `release` → `BASE=main`
- Otherwise → `BASE=develop`

## Step 1 — Gather Context

```bash
git branch --show-current
git log origin/${BASE}..HEAD --oneline 2>/dev/null || git log --oneline -15
git diff origin/${BASE}...HEAD --stat 2>/dev/null || git diff HEAD~5...HEAD --stat
git diff origin/${BASE}...HEAD 2>/dev/null || git diff HEAD~5...HEAD
```

Also read the PR template:

```bash
cat .github/PULL_REQUEST_TEMPLATE.md
```

## Step 2 — Determine Labels

Read `references/labels.md` and select 1–2 appropriate labels based on the nature of the changes.

## Step 3 — Generate PR Title

**If `BASE=main` (release PR):**

Calculate the version tag using the same algorithm as the CD pipeline:

```bash
DATE=$(date -u +"%Y%m%d")
EXISTING=$(git tag -l "v${DATE}.*" | wc -l | tr -d ' ')
VERSION="v${DATE}.${EXISTING}"
echo "PR 제목: ${VERSION}"
```

Use `${VERSION}` directly as the PR title. No options needed — this is the tag the CD will create.

**If `BASE=develop` (feature/fix PR):**

Generate 3 options in the format `[scope] description`:
- Scope: Module name (`[user]`, `[authorization]`, `[gateway]`, `[chat]`, etc.) or `[global]` / `[ci/cd]` for cross-cutting changes
- Description: Korean, concise, no emojis, max 50 characters total
- Mark the best option with `← 추천`

**Body (all cases)** — Follow the `.github/PULL_REQUEST_TEMPLATE.md` structure:
- Korean 합쇼체: `~하였습니다`, `~되었습니다`, `~추가하였습니다`
- No emojis
- Max 2500 characters

## Step 4 — Write Body & Show Preview

Write the body to `PR_BODY.md`, then display:

**If `BASE=main`:**
```
## PR 제목 (릴리즈 태그)
${VERSION}

## 선택된 라벨
- label1, label2

## PR 본문 미리보기
[body content]
```
Ask for confirmation before proceeding. If no answer is given within the turn, proceed.

**If `BASE=develop`:**
```
## 추천 PR 제목
1. [title1]
2. [title2]
3. [title3] ← 추천

## 선택된 라벨
- label1, label2

## PR 본문 미리보기
[body content]
```
Ask the user to confirm which title to use. If no answer is given, proceed with the recommended (marked) title.

## Step 5 — Create PR

Run the creation script with the confirmed title, labels, and base branch:

```bash
bash scripts/create-pr.sh "<confirmed-title>" "PR_BODY.md" "<label1>,<label2>" "${BASE}"
```

After creation, display the PR URL.
Cleanup: remove `PR_BODY.md`.
