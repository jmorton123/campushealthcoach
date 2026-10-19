# CampusHealthCoach — Marketing Site

Single-page marketing and early-access signup site for **CampusHealthCoach** (campushealthcoach.com): SMS-based AI health coaching for college students.

## What’s included

| File | Purpose |
|------|---------|
| `index.html` | Full landing page (Hero, How it works, Pillars, Pricing, Signup, Footer) |
| `app.js` | Client-side form validation, success UI, localStorage backup, Netlify Forms POST |
| `README.md` | This file |

Stack: semantic HTML, Tailwind CSS via CDN, Inter font, inline SVG icons. No build step required.

## Preview locally

**Option A — open the file**

```bash
open index.html
# or double-click index.html in your file manager
```

**Option B — simple static server** (recommended; form fetch behaves more like production)

```bash
cd /path/to/campushealthcoach
python3 -m http.server 8080
# then visit http://localhost:8080
```

Or with Node:

```bash
npx --yes serve -l 8080 .
```

## Deploy

### Netlify (recommended for the form)

1. Drag-and-drop this folder in the [Netlify Drop](https://app.netlify.com/drop) UI, **or**
2. Connect the repo / folder in Netlify:
   - **Publish directory:** `/` (or the folder that contains `index.html`)
   - **Build command:** leave empty (static site)
3. The form uses `data-netlify="true"` and `name="early-access"`. After the first deploy, submissions appear under **Forms → early-access** in the Netlify dashboard.
4. Point `campushealthcoach.com` to the Netlify site in Domain settings.

### Vercel

```bash
npx vercel --cwd .
# or import the folder in the Vercel dashboard; framework: Other, output: root
```

Note: Netlify Forms will not collect submissions on Vercel. The page still shows a success state and stores a copy in `localStorage`. Hook the form to your own endpoint or a form service if you need server-side capture on Vercel.

### GitHub Pages

1. Push this folder to a repo (e.g. as `/docs` or the repo root).
2. Settings → Pages → Deploy from branch → select the branch and folder.
3. Custom domain: add `campushealthcoach.com` and configure DNS.

Same note as Vercel for form capture — success UI + localStorage still work.

## Form behavior

- Required: name, email, phone. Optional: school/university.
- Client-side validation with accessible error messages.
- On valid submit: success panel, entry saved to `localStorage` under `chc_early_access`.
- When hosted on Netlify: also POSTs as a Netlify Form (`early-access`) with honeypot `bot-field`.

## Product facts (for editors)

- SMS/text AI coaching for college students
- Daily check-ins, accountability teams, weekly summaries
- $8/month
- Pillars: Hydration, Food, Exercise, Sleep, Low-stress Reset
- Now in beta with a small group of college students
