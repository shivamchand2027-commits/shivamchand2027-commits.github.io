# Adya Capital

Invitation-only venture network for founders. This repository is the public website, served with GitHub Pages.

Live: https://shivamchand2027-commits.github.io/

## What it is

A single-page, static site with an invite gate. Visitors enter an invite code (ADYA-xxxx) or apply for access. Admitted members get a member view, can nominate other founders, and reach two members-only pages.

## Structure

| File | Purpose |
| --- | --- |
| `index.html` | Landing page, invite gate, application form, SEO and Open Graph tags |
| `vault.html`, `vault.js` | Members-only vault page (noindex) |
| `padhai.html`, `padhai.js` | Members-only learning page (noindex) |
| `theme.css` | All styling |
| `app.js` | Gate, application flow, member view |
| `club.js`, `funds.js` | Member club and fund content |
| `music.js` | Ambient raga (tanpura and bansuri) generated with Web Audio, no audio files |
| `config.js` | Backend endpoint |
| `mark-t.png`, `favicon.png`, `apple-touch-icon.png`, `og.png`, `skyline.jpg` | Logo, icons, link-preview image, hero image |
| `robots.txt`, `sitemap.xml` | Crawler rules and sitemap |
| `.nojekyll` | Serve files as-is on GitHub Pages |

## Backend

Applications, invite codes, nominations and tickets are handled by a Google Apps Script web app that reads and writes a Google Sheet. The endpoint URL is set in `config.js`. Invite rules (founder codes, nominations per member, retired codes) live in the sheet's Settings tab, not in this repo.

## Run locally

No build step. From the repo root:

```
python3 -m http.server 8000
```

Open http://localhost:8000.

## Deploy

GitHub Pages serves the `main` branch from the repo root. Pushing to `main` publishes the site within a minute or two. The repository is named `<username>.github.io` so the site and `robots.txt` sit at the domain root.

To use a custom domain, add a `CNAME` file with the domain, set it under Settings > Pages, and update the canonical, Open Graph and sitemap URLs in `index.html`, `robots.txt` and `sitemap.xml`.

## SEO

Title and description, canonical URL, Open Graph and Twitter tags, JSON-LD Organization data, `sitemap.xml`, and `robots.txt` that allows the landing page and blocks the members-only pages.

## Conventions

Small commits with a clear message (`feat:`, `fix:`, `content:`, `seo:`, `docs:`). Do not commit secrets or member data.
