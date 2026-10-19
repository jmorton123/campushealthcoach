#!/usr/bin/env bash
# Push the CampusHealthCoach site to GitHub and turn on GitHub Pages.
# Usage: ./deploy-to-github.sh jmorton123   (live at https://jmorton123.github.io/campushealthcoach/)
# Needs: git, plus a GitHub login (GitHub CLI `gh auth login`, or a personal access token when git asks for a password).
set -euo pipefail
USER_NAME="${1:-jmorton123}"
REPO="${2:-campushealthcoach}"
cd "$(dirname "$0")"

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
  # Turn on Pages from the main branch, root folder
  gh api -X POST "repos/$USER_NAME/$REPO/pages" -f "source[branch]=main" -f "source[path]=/" >/dev/null 2>&1 \
    || echo "Pages may already be on; check Settings > Pages."
else
  echo "GitHub CLI not logged in. Create the public repo '$REPO' on github.com first, then:"
  git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/$USER_NAME/$REPO.git"
  git push -u origin main
  echo "Now turn on Pages: repo Settings > Pages > Deploy from a branch > main / (root)."
fi
echo "Your site will be at: https://$USER_NAME.github.io/$REPO/ (allow 1-2 minutes)"
