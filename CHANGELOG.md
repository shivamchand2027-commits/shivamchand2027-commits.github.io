# Changelog

## October 22, 2026

- SEO fix (Google Search Console: "Excluded by noindex"): Founder Academy (padhai), Fund Vault, Communities and FAQ all carried `noindex,follow` while sitemap.xml listed them and robots.txt Disallowed two of them - contradictory. All four pages are now `index,follow,max-image-preview:large` with self-referencing canonical URLs; robots.txt now allows the whole site; sitemap lastmod bumped. Homepage was already correct; "/index.html -> /" canonical consolidation is expected behavior.

## October 17, 2026

- Mobile polish: nav links are ~40px tap targets, chips 42px, vault and Academy pills enlarged, micro text bumped (corner labels 10.5px, community tags 11px), communities rows stack on small screens. Verified at 360/390/412px with zero horizontal overflow on all five pages.
