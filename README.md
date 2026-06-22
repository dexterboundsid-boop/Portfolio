# Dexter Bounds — Portfolio

A static portfolio site. No framework, no build tool beyond Node.js, no database —
just markdown files that compile into plain HTML.

## How it's organized

```
index.html             ← generated homepage (don't edit by hand — run build.js instead)
build.js                ← the build script, run this after any change to /projects
assets/
  css/style.css         ← all styling
  images/               ← put your project photos/renders here
projects/               ← YOUR CONTENT GOES HERE. One .md file per project.
work/                   ← generated project detail pages (don't edit by hand)
```

## Adding a new project

1. Drop a new `.md` file in `/projects` — copy the format below.
2. Run `node build.js` from this folder.
3. Open `index.html` to check it.

```markdown
---
title: Project Name
year: 2026
role: Designer / Capstone Project
blurb: One sentence for the homepage list.
tools: Fusion 360, SolidWorks, CNC
thumb: assets/images/your-photo.jpg
order: 1
---

## Overview

Write your project writeup here in plain markdown.

## Process

- Bullet points work
- So does **bold** and *italic*

![Caption for this image](../assets/images/your-photo-2.jpg "Optional caption text")

## Outcome

Wrap up what happened.
```

Notes:
- `order` controls the sort position on the homepage (lower = higher up). Leave it off and it'll sort alphabetically after the ordered ones.
- `thumb` is optional — if you don't have a photo yet, the homepage shows a placeholder instead of a broken image.
- Images referenced *inside* the project body need the `../` prefix (e.g. `../assets/images/photo.jpg`) because project pages live one folder deep, in `/work`. Images referenced in `thumb:` do NOT need `../` — that path is relative to the homepage.
- Re-run `node build.js` every time you add or edit a project. It regenerates everything from scratch, so it's always safe to re-run.

## Before you publish — things to update

- `index.html` is generated, but the *content* comes from `build.js` for the About/Contact sections. Open `build.js` and find:
  - The about-text paragraphs (search for "I'm an industrial designer")
  - The contact links (search for "youremail@example.com") — swap in your real email, LinkedIn, GitHub
- Add real photos to `assets/images/` and reference them in your project frontmatter.

## Deploying for free

**Easiest: GitHub Pages**

1. Create a new GitHub repo (e.g. `portfolio`).
2. Push this whole folder to it.
3. In the repo Settings → Pages, set the source to the `main` branch, root folder.
4. Your site will be live at `https://yourusername.github.io/portfolio/` within a few minutes.

**Alternative: Netlify or Cloudflare Pages**

Drag-and-drop the whole folder onto netlify.com/drop (or connect the GitHub repo for
automatic redeploys whenever you push). Both are free and give you HTTPS automatically.

## Local preview

From this folder, run:

```
python3 -m http.server 8000
```

Then open `http://localhost:8000` in a browser.
