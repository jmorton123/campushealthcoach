#!/usr/bin/env bash
# CampusHealthCoach site deploy helper.
#
# Day-to-day deploy (the live site is GitHub Pages from the gh-pages branch):
#   ./deploy-to-github.sh --pages index.html sms-terms.html privacy.html ["Deploy: what changed"]
#   Pushes main, copies ONLY the named files from main onto gh-pages, commits "Deploy: ...",
#   pushes normally (never --force), never touches CNAME, then waits for the Pages build.
#
# First-time setup (create the repo and push main):
#   ./deploy-to-github.sh jmorton123
# Needs: git, plus a GitHub login (GitHub CLI `gh auth login`, or a personal access token when git asks for a password).
set -euo pipefail
cd "$(dirname "$0")"

if [ "${1:-}" = "--pages" ]; then
  shift
  FILES=() MSG="Deploy: site update"
  for a in "$@"; do
    if [ -f "$a" ]; then FILES+=("$a"); else MSG="$a"; fi
  done
  [ ${#FILES[@]} -gt 0 ] || { echo "Name the changed files, e.g. index.html sms-terms.html"; exit 1; }
  for f in "${FILES[@]}"; do
    [ "$f" != "CNAME" ] || { echo "Refusing to touch CNAME"; exit 1; }
  done
  REPO_SLUG="$(git remote get-url origin | sed -E 's#.*github.com[:/](.*)\.git$#\1#; s#.*github.com[:/](.*)$#\1#')"
  git push origin main
  git fetch origin
  WT="$(mktemp -d)/ghp"
  git worktree add "$WT" origin/gh-pages -b ghp-deploy-$$
  trap 'git worktree remove --force "$WT" >/dev/null 2>&1; git branch -D ghp-deploy-$$ >/dev/null 2>&1 || true' EXIT
  (cd "$WT" && git checkout main -- "${FILES[@]}" && git commit -m "$MSG" && git push origin "HEAD:gh-pages")
  echo "Waiting for the Pages build..."
  for _ in $(seq 1 30); do
    st="$(gh api "repos/$REPO_SLUG/pages/builds/latest" --jq .status 2>/dev/null || echo unknown)"
    echo "  build: $st"
    [ "$st" = "built" ] && break
    [ "$st" = "errored" ] && { echo "Pages build errored"; exit 1; }
    sleep 10
  done
  echo "Live at https://$(cat CNAME 2>/dev/null || echo "$REPO_SLUG")/"
  exit 0
fi

USER_NAME="${1:-jmorton123}"
REPO="${2:-campushealthcoach}"

if [ ! -d .git ]; then
  git init -b main
fi
git add index.html app.js README.md DEPLOY-GITHUB-PAGES.md .nojekyll deploy-to-github.sh
git -c user.name="${GIT_NAME:-$USER_NAME}" -c user.email="${GIT_EMAIL:-$USER_NAME@users.noreply.github.com}" \
  commit -m "CampusHealthCoach landing page" || echo "Nothing new to commit."

if command -v gh >/dev/null && gh auth status >/dev/null 2>&1; then
  if ! gh repo view "$USER_NAME/$REPO" >/dev/null 2>&1; then
    gh repo create "$USER_NAME/$REPO" --public --source=. --remote=origin --push
  else
    git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/$USER_NAME/$REPO.git"
    git push -u origin main
  fi
  echo "Note: the live site serves the gh-pages branch. Deploy changes with: ./deploy-to-github.sh --pages <files>"
else
  echo "GitHub CLI not logged in. Create the public repo '$REPO' on github.com first, then:"
  git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/$USER_NAME/$REPO.git"
  git push -u origin main
fi
echo "Your site will be at: https://campushealthcoach.com (allow 1-2 minutes)"
