# Synthesize Bio Docs

Source for the public docs site, served by [Mintlify](https://mintlify.com) at:

- [`https://docs.synthesize.bio`](https://docs.synthesize.bio) — canonical production URL (custom domain, set as `seo.canonical` in `docs.json`)
- `https://<project>.mintlify.app` — Mintlify-hosted default URL (still works as a fallback; auto-deployed on merge to `main`)

The `docs` subdomain is a CNAME → `cname.mintlify-dns.com.` managed in
the platform CDK ([`infrastructure/lib/docs-domain-stack.ts`](https://github.com/synthesizebio/platform/blob/main/infrastructure/lib/docs-domain-stack.ts)).
Mintlify provisions the TLS cert via Vercel automatically.

The Mintlify GitHub App watches this repo's `main` branch and auto-deploys. PRs get a preview URL posted as a check.

## Project layout

```
.
  docs.json              # Mintlify config: theme, nav, branding
  index.mdx              # landing page
  favicon.svg
  logo/
    light.svg
    dark.svg
  get-started/           # intro + quickstart
  python-sdk/            # filled by APP-2302 (pysynthbio migration)
  r-sdk/                 # filled by APP-2303 (rsynthbio migration)
  mcp/                   # filled by APP-2304 (MCP docs migration)
  guides/                # filled by APP-2305 (help.synthesize.bio migration)
  snippets/              # reusable MDX fragments
  images/                # static assets
```

## Local development

Mintlify ships a CLI that renders the site locally with hot reload.

```bash
npm i -g mint     # one-time; requires Node 20+
mint dev          # serves http://localhost:3000
```

Other useful commands:

```bash
mint broken-links   # check for broken internal/external links
mint update         # update the CLI to the latest version
```

## Adding a page

1. Create `<section>/<slug>.mdx` with frontmatter:
   ```mdx
   ---
   title: "Page Title"
   description: "One-line description shown in search and meta tags."
   ---
   ```
2. Add the page slug (without `.mdx`) to the appropriate `groups[].pages` array in [`docs.json`](./docs.json).
3. Use Mintlify's [built-in MDX components](https://www.mintlify.com/docs/components) (`<Card>`, `<CardGroup>`, `<Note>`, `<Tabs>`, etc.) instead of raw HTML where possible — they pick up the theme automatically.

## Branding

- Primary color: `#16A34A` (set in `docs.json`)
- Logos and favicon under [`logo/`](./logo) and [`favicon.svg`](./favicon.svg) — the current files are simple SVG placeholders. Drop in the real brand assets and they'll be picked up on the next deploy.

## Related Linear tickets

- APP-2301 — Mintlify foundation (this PR)
- APP-2302 — Migrate `pysynthbio` docs into `python-sdk/`
- APP-2303 — Migrate `rsynthbio` docs into `r-sdk/`
- APP-2304 — Migrate MCP docs into `mcp/`
- APP-2305 — Migrate `help.synthesize.bio` content into `guides/`
- APP-2306 — Point `docs.synthesize.bio` at the Mintlify deployment (this PR / DNS stack in platform)

## Need help?

- If your dev environment isn't running: `mint update` to refresh the CLI
- If a page 404s in preview: confirm the slug is listed in `docs.json` under `navigation.tabs[].groups[].pages`
- Mintlify reference: https://mintlify.com/docs
