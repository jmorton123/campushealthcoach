# Deploying CampusHealthCoach to GitHub Pages

**Live URL:** https://campushealthcoach.com  (also https://jmorton123.github.io/campushealthcoach/ redirects here; GitHub user `jmorton123`, repo `campushealthcoach`)

## Files that go in the repo
- `index.html` — the page
- `app.js` — signup form logic
- `.nojekyll` — tells GitHub Pages to serve files as-is
- `README.md`, `DEPLOY-GITHUB-PAGES.md`, `deploy-to-github.sh` — docs and helper (optional)

## Option A: Upload in the browser (no command line)
1. Sign in at github.com, click **+** (top right) > **New repository**.
2. Name it `campushealthcoach`, choose **Public**, leave "Add a README" unchecked, click **Create repository**.
3. On the empty repo page, click **uploading an existing file**.
4. Drag in `index.html`, `app.js`, and `README.md`. (The `.nojekyll` file is hidden on most computers; it's optional for this site.)
5. Click **Commit changes**.
6. Go to **Settings > Pages**. Under "Build and deployment", set Source to **Deploy from a branch**, Branch to **main** and folder **/ (root)**, then **Save**.
7. Wait 1–2 minutes and refresh. Your site is live at `https://campushealthcoach.com` (or `https://jmorton123.github.io/campushealthcoach/` before the custom domain is set).

## Option B: Command line
```bash
cd /workspace/campushealthcoach
gh auth login            # once, if using the GitHub CLI
./deploy-to-github.sh jmorton123
```

## Using campushealthcoach.com
Custom domain is configured. DNS at Namecheap:
- Four `A` records for `@` → 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153
- `CNAME` for `www` → `jmorton123.github.io`
Repo root includes a `CNAME` file with `campushealthcoach.com`. Enforce HTTPS in Settings > Pages after the certificate is ready.

## Signup form on GitHub Pages
GitHub Pages only serves static files, so it can't receive form submissions. Without a form service,
visitors see the success message but **you never get their signup**.

Fix (free): use [Formspree](https://formspree.io):
1. Create a free Formspree account and a new form. Copy its endpoint, like `https://formspree.io/f/abcdwxyz`.
2. Open `app.js` and set `var FORM_ENDPOINT = 'https://formspree.io/f/abcdwxyz';` near the top.
3. Commit/upload the updated `app.js`. Submit a test signup and confirm it appears in Formspree.

Alternatives: Web3Forms, Basin, or a Google Form. Free tiers have monthly submission caps; check current limits.

## Checklist
- [ ] Public repo `campushealthcoach` created
- [ ] `index.html` and `app.js` uploaded to the repo root
- [ ] Settings > Pages set to main / (root)
- [ ] Site loads at `https://campushealthcoach.com`
- [ ] Formspree endpoint added to `app.js` and a test signup received
- [ ] (Optional) Custom domain + DNS + Enforce HTTPS
- [ ] Review copy: founding pricing, "cancel anytime", beta framing
