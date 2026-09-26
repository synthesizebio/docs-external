# Synthesize Bio platform docs (Mintlify source)

Customer-facing documentation for the Synthesize Bio MCP connector and other
platform-level integrations.

## Where it's published

These pages are aggregated by the
[`synthesizebio/docs-external`](https://github.com/synthesizebio/docs-external)
[multirepo workflow](https://github.com/synthesizebio/docs-external/blob/main/.github/workflows/aggregate-docs.yml)
into the canonical docs site at
[`https://docs.synthesize.bio/platform`](https://docs.synthesize.bio/platform).

The aggregator prefixes each source repo by its name, so files in this directory
appear under the `platform/` URL prefix. For example, `index.mdx` is served at
`/platform`, and `connect-in-claude.mdx` at `/platform/connect-in-claude`.

## Authoring

This directory is the **source of truth** — edit MDX pages here directly. There
is no separate generator or in-app rendering: the legacy `app.synthesize.bio/mcp/docs`
viewer was retired in APP-2313 and replaced with a 301 redirect to
`docs.synthesize.bio/platform`.

When adding a page:

1. Create `<slug>.mdx` with YAML frontmatter (`title`, `description`).
2. Register the slug in the appropriate `navigation.groups[].pages` array in
   [`docs.json`](./docs.json).
3. Use [Mintlify components](https://mintlify.com/docs/components) (`<Card>`,
   `<CardGroup>`, `<Note>`, `<Warning>`, `<Tabs>`, `<Steps>`) where they fit
   instead of raw HTML.

## Local preview

```bash
cd docs-external
npx mint dev          # serves http://localhost:3000
npx mint broken-links # check internal/external links
```

`mint dev` previews this directory standalone. To preview the full aggregated
site, check out the generated `docs` branch of `synthesizebio/docs-external`
after the aggregation workflow has run.

## Style

Follow the conventions in the shared
[`docs-external/AGENTS.md`](https://github.com/synthesizebio/docs-external/blob/main/AGENTS.md):
sentence-case headings, second-person voice, code formatting for file names and
commands, and `MCP` (uppercase) when referring to Model Context Protocol.
