# Synthesize Bio Docs

Source for the public docs site, served by [Mintlify](https://mintlify.com) at:

- [`https://docs.synthesize.bio`](https://docs.synthesize.bio) — canonical production URL (custom domain, set as `seo.canonical` in `docs.json`)
- `https://<project>.mintlify.app` — Mintlify-hosted default URL (still works as a fallback; it reflects whichever branch Mintlify is configured to deploy, currently `docs`)

The `docs` subdomain is a CNAME → `cname.mintlify-dns.com.` managed in
the platform CDK ([`infrastructure/lib/docs-domain-stack.ts`](https://github.com/synthesizebio/platform/blob/main/infrastructure/lib/docs-domain-stack.ts)).
Mintlify provisions the TLS cert via Vercel automatically.

`main` stores the base docs source for shared pages like `index.mdx` and `get-started/`.
The aggregation workflow writes the combined site into the `docs` branch, and Mintlify deploys that generated branch.

## Project layout

```
.
  docs.json              # Mintlify config: theme, nav, branding
  index.mdx              # landing page
  favicon.svg
  logo/
    light.svg
    dark.svg
  get-started/           # shared intro + quickstart content owned here
  snippets/              # reusable MDX fragments
  images/                # static assets
  .github/workflows/
    aggregate-docs.yml   # syncs docs from source repos into the docs branch
```

Aggregated sections:

- `platform/` is sourced from `platform/docs-external`
- `rsynthbio/` is sourced from `rsynthbio/docs-external`
- `pysynthbio/` is sourced from `pysynthbio/docs-external`

The aggregation workflow mirrors each source repo under its repo name, so the MCP docs live under `platform/`, the R SDK under `rsynthbio/`, and the Python SDK under `pysynthbio/` in the aggregated site rather than `mcp/`, `r-sdk/`, and `python-sdk/`.

For consistency, every source repo keeps the public Mintlify-consumed content in a root `docs-external/` directory.

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

If you want to preview the fully aggregated site locally, check out the generated `docs` branch after the sync workflow runs.

## GitHub automation

The aggregation workflow expects:

- `PUSH_TOKEN` with permission to push to the generated `docs` branch
- `SOURCE_REPO_TOKEN` with permission to read any private source repos listed in `.github/workflows/aggregate-docs.yml`

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

Do not add SDK or MCP content directly in `main`. Those sections should live in their source repos and flow into `docs` through the aggregation workflow.

## Branding

- Primary color: `#3B6297` (set in `docs.json`)
- Logos and favicon under [`logo/`](./logo) and [`favicon.svg`](./favicon.svg) — the current files are simple SVG placeholders. Drop in the real brand assets and they'll be picked up on the next deploy.

## Related Linear tickets

- APP-2301 — Replace the broken docs aggregation action with the custom sync workflow
- APP-2302 — Migrate `pysynthbio` docs into `pysynthbio/`
- APP-2303 — Migrate `rsynthbio` docs into `rsynthbio/`
- APP-2304 — Migrate MCP docs into `platform/`
- APP-2305 — Remove dated help center guide content from the public docs
- APP-2306 — Point `docs.synthesize.bio` at the Mintlify deployment (platform DNS stack)

## Need help?

- If your dev environment isn't running: `mint update` to refresh the CLI
- If a page 404s in preview: confirm the slug is listed in `docs.json` under `navigation.tabs[].groups[].pages`
- Mintlify reference: https://mintlify.com/docs
