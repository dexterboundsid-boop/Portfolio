#!/usr/bin/env node
/**
 * build.js — compiles /projects/*.md into the static site.
 *
 * Usage:
 *   node build.js
 *
 * Each project is a markdown file with frontmatter:
 *
 *   ---
 *   title: Formlabs Mold 1
 *   year: 2026
 *   role: Capstone Project
 *   blurb: Short one-line description for the homepage list.
 *   tools: Fusion 360, Formlabs 3L, Resin Casting
 *   thumb: assets/images/mold1-thumb.jpg   (optional)
 *   order: 1   (optional — lower numbers show first; default 999)
 *   ---
 *
 *   Markdown body becomes the project detail page.
 *
 * Re-run this script any time you add/edit a file in /projects.
 */

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PROJECTS_DIR = path.join(ROOT, "projects");
const OUT_DIR = ROOT;
const WORK_OUT_DIR = path.join(ROOT, "work"); // generated project pages live here, separate from markdown sources

// ---------- tiny frontmatter parser (no deps) ----------
function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };
  const [, fmBlock, body] = match;
  const data = {};
  fmBlock.split("\n").forEach((line) => {
    const idx = line.indexOf(":");
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    data[key] = val;
  });
  return { data, body };
}

// ---------- tiny markdown -> HTML (no deps) ----------
// Supports: headings (##), paragraphs, images ![alt](src "caption"),
// bold/italic, links, unordered lists.
function mdToHtml(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  let html = "";
  let inList = false;
  let paraBuffer = [];

  const inline = (text) =>
    text
      .replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_, alt, src, cap) => {
        const figcap = cap ? `<figcaption>${cap}</figcaption>` : "";
        return `<figure><img src="${src}" alt="${alt}" loading="lazy">${figcap}</figure>`;
      })
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>");

  const flushPara = () => {
    if (paraBuffer.length) {
      html += `<p>${inline(paraBuffer.join(" "))}</p>\n`;
      paraBuffer = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "") {
      flushPara();
      if (inList) { html += "</ul>\n"; inList = false; }
      continue;
    }
    if (/^##\s+/.test(trimmed)) {
      flushPara();
      if (inList) { html += "</ul>\n"; inList = false; }
      html += `<h2>${inline(trimmed.replace(/^##\s+/, ""))}</h2>\n`;
      continue;
    }
    if (/^-\s+/.test(trimmed)) {
      flushPara();
      if (!inList) { html += "<ul>\n"; inList = true; }
      html += `<li>${inline(trimmed.replace(/^-\s+/, ""))}</li>\n`;
      continue;
    }
    if (inList) { html += "</ul>\n"; inList = false; }
    if (/^!\[/.test(trimmed)) {
      flushPara();
      html += `${inline(trimmed)}\n`;
    } else {
      paraBuffer.push(trimmed);
    }
  }
  flushPara();
  if (inList) html += "</ul>\n";
  return html;
}

function slugify(str) {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// ---------- load projects ----------
if (!fs.existsSync(PROJECTS_DIR)) fs.mkdirSync(PROJECTS_DIR, { recursive: true });

const files = fs.readdirSync(PROJECTS_DIR).filter((f) => f.endsWith(".md"));

const projects = files.map((file) => {
  const raw = fs.readFileSync(path.join(PROJECTS_DIR, file), "utf8");
  const { data, body } = parseFrontmatter(raw);
  const slug = data.slug || slugify(data.title || file.replace(/\.md$/, ""));
  let thumb = data.thumb || data.thumbnail || "";
  if (thumb && !fs.existsSync(path.join(ROOT, thumb))) {
    thumb = ""; // file doesn't exist yet — fall back to placeholder instead of a broken image
  }
  return {
    slug,
    title: data.title || "Untitled Project",
    year: data.year || "",
    role: data.role || "",
    blurb: data.blurb || data.summary || "",
    category: data.category || "",
    tools: (data.tools || "").split(",").map((t) => t.trim()).filter(Boolean),
    thumb,
    order: data.order ? parseInt(data.order, 10) : 999,
    bodyHtml: mdToHtml(body),
  };
});

projects.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));

// ---------- templates ----------
const head = (title, depth = "") => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;700&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${depth}assets/css/style.css">
</head>
<body>`;

const header = (depth = "") => `
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="${depth}index.html">DBDS<span class="mark">_</span>PORTFOLIO</a>
    <nav class="nav">
      <a href="${depth}index.html#work">Work</a>
      <a href="${depth}index.html#about">About</a>
      <a href="${depth}index.html#contact">Contact</a>
    </nav>
  </div>
</header>`;

const footer = () => `
<footer class="site-footer">
  <div class="wrap">REV ${new Date().getFullYear()} — BUILT BY HAND, NOT TEMPLATE</div>
</footer>`;

function renderHomepage() {
  const rows = projects.length
    ? projects
        .map(
          (p) => `
        <li class="project-row">
          ${
            p.thumb
              ? `<img class="project-thumb" src="${p.thumb}" alt="${p.title} thumbnail" loading="lazy">`
              : `<div class="project-thumb-fallback">NO<br>IMAGE</div>`
          }
          <div class="project-info">
            <a href="work/${p.slug}.html">
              <h3 class="project-title">${p.title}</h3>
            </a>
            <p class="project-blurb">${p.blurb}</p>
            <div class="spec-strip">${p.tools.map((t) => `<span>${t}</span>`).join("")}</div>
          </div>
          <div class="project-year">${p.year}</div>
        </li>`
        )
        .join("\n")
    : "";

  const workSection = projects.length
    ? `<ul class="project-list">${rows}</ul>`
    : `<div class="empty-state">// No projects yet. Add a .md file to /projects and run build.js to populate this section.</div>`;

  return `${head("Dexter Bounds — Industrial Design Portfolio")}
${header()}

<section class="titleblock">
  <div class="titleblock-inner crop">
    <span class="ca"></span><span class="cb"></span>
    <p class="tb-eyebrow">Industrial Design / Fabrication</p>
    <h1 class="tb-name">Dexter Bounds</h1>
    <p class="tb-role">Industrial Designer &amp; Fabricator</p>
    <dl class="tb-specs">
      <div class="tb-spec"><dt>Based</dt><dd>Lafayette, LA</dd></div>
      <div class="tb-spec"><dt>Education</dt><dd>B.S. Industrial Design, UL Lafayette</dd></div>
      <div class="tb-spec"><dt>Core Tools</dt><dd>Fusion 360 / SolidWorks / Rhino</dd></div>
      <div class="tb-spec"><dt>Fabrication</dt><dd>CNC, 3D Print, Resin, Casting</dd></div>
    </dl>
  </div>
</section>

<section class="section" id="work">
  <div class="wrap">
    <div class="section-head">
      <span class="section-num">01</span>
      <h2 class="section-title">Selected Work</h2>
      <span class="section-rule"></span>
    </div>
    ${workSection}
  </div>
</section>

<section class="section" id="about">
  <div class="wrap">
    <div class="section-head">
      <span class="section-num">02</span>
      <h2 class="section-title">About</h2>
      <span class="section-rule"></span>
    </div>
    <div class="about-grid">
      <div class="about-text">
        <p>I'm an industrial designer and fabricator based in Lafayette, Louisiana, recently graduated from the University of Louisiana at Lafayette with a minor in Moving Image Arts. My work moves between digital modeling and hands-on shop time — I like designs I can actually hold, test, and break before someone else does.</p>
        <p>My capstone project, the Formlabs Mold 1, is a desktop injection molder concept built in Fusion 360. Outside of coursework, I run a small fabrication practice under the maker's mark <strong>DBds</strong>, covering everything from cosplay armor to film props to CNC-milled parts.</p>
      </div>
      <dl class="skills-block">
        <dt>CAD / Software</dt>
        <dd>Fusion 360, SolidWorks, Rhino 7, AutoCAD, Blender, Tinkercad</dd>
        <dt>Fabrication</dt>
        <dd>CNC routing, laser cutting, FDM &amp; resin 3D printing, mold making, casting, finishing &amp; painting</dd>
        <dt>Other</dt>
        <dd>DaVinci Resolve, stop motion animation, prop fabrication</dd>
      </dl>
    </div>
  </div>
</section>

<section class="section" id="contact">
  <div class="wrap">
    <div class="section-head">
      <span class="section-num">03</span>
      <h2 class="section-title">Contact</h2>
      <span class="section-rule"></span>
    </div>
    <div class="contact-row">
      <a href="mailto:youremail@example.com">youremail@example.com</a>
      <a href="https://linkedin.com/in/yourprofile">LinkedIn</a>
      <a href="https://github.com/yourprofile">GitHub</a>
    </div>
  </div>
</section>

${footer()}
</body>
</html>`;
}

function renderProjectPage(p) {
  return `${head(`${p.title} — Dexter Bounds`, "../")}
${header("../")}

<section class="project-header">
  <div class="wrap">
    <a class="back-link" href="../index.html#work">&larr; Back to work</a>
    <h1>${p.title}</h1>
    <dl class="project-meta">
      <div class="tb-spec"><dt>Year</dt><dd>${p.year}</dd></div>
      <div class="tb-spec"><dt>Role</dt><dd>${p.role}</dd></div>
      <div class="tb-spec"><dt>Tools</dt><dd>${p.tools.join(", ")}</dd></div>
    </dl>
  </div>
</section>

<article class="project-body">
  ${p.bodyHtml}
</article>

${footer()}
</body>
</html>`;
}

// ---------- write files ----------
fs.writeFileSync(path.join(OUT_DIR, "index.html"), renderHomepage());

if (!fs.existsSync(WORK_OUT_DIR)) fs.mkdirSync(WORK_OUT_DIR, { recursive: true });

projects.forEach((p) => {
  fs.writeFileSync(path.join(WORK_OUT_DIR, `${p.slug}.html`), renderProjectPage(p));
});

console.log(`Built index.html + ${projects.length} project page(s).`);
if (projects.length === 0) {
  console.log("Tip: add a .md file to /projects (see example-project.md) then re-run: node build.js");
}
