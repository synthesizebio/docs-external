# Synthesize Bio Docs

Source for the public docs site, served by [Mintlify](https://mintlify.com) at:

- `https://<project>.mintlify.app` — Mintlify-hosted preview for the aggregated site
- `https://docs.synthesize.bio` — custom domain, coming via APP-2306

`main` stores the base docs source for shared pages like `index.mdx`, `get-started/`, and `guides/`.
The multirepo aggregation workflow writes the combined site into the `docs` branch.
Point Mintlify at `docs` if you want the deployed site to use the aggregated output.

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
  guides/                # shared guides owned here
  snippets/              # reusable MDX fragments
  images/                # static assets
  .github/workflows/
    aggregate-docs.yml   # syncs docs from source repos into the docs branch
```

Aggregated sections:

- `mcp/` is sourced from `platform/webapp/app/routes/api/mcp/docs`
- `python-sdk/` will move to `pysynthbio` once that repo exposes a Mintlify docs root
- `r-sdk/` will move to `rsynthbio` once that repo exposes a Mintlify docs root

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

The aggregation workflow expects a `PUSH_TOKEN` repository secret with permission to push to the `docs` branch and read the source repos listed in `.github/workflows/aggregate-docs.yml`.

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

- APP-2301 — Mintlify foundation (this PR)
- APP-2302 — Migrate `pysynthbio` docs into `python-sdk/`
- APP-2303 — Migrate `rsynthbio` docs into `r-sdk/`
- APP-2304 — Migrate MCP docs into `mcp/`
- APP-2305 — Migrate `help.synthesize.bio` content into `guides/`
- APP-2306 — Point `docs.synthesize.bio` at the Mintlify deployment

## Need help?

- If your dev environment isn't running: `mint update` to refresh the CLI
- If a page 404s in preview: confirm the slug is listed in `docs.json` under `navigation.tabs[].groups[].pages`
- Mintlify reference: https://mintlify.com/docs
