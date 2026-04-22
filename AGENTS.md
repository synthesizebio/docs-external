# Synthesize Bio Docs — Agent Instructions

For Mintlify product knowledge (components, configuration, writing standards),
install the Mintlify skill: `npx skills add https://mintlify.com/docs`

## About this project

- Public-facing documentation for the Synthesize Bio platform
- Built on [Mintlify](https://mintlify.com); pages are MDX with YAML frontmatter
- Configuration lives in [`docs.json`](./docs.json)
- `main` holds the shared base docs source
- The aggregation workflow publishes the combined docs site to the `docs` branch
- Preview locally with `mint dev`; check links with `mint broken-links`

## Project structure

```
docs.json              # Mintlify config: theme, nav, branding
index.mdx              # landing page
get-started/           # shared intro + quickstart content owned here
guides/                # shared guides owned here
snippets/              # reusable MDX fragments
images/                # static assets
logo/, favicon.svg     # branding
.github/workflows/     # aggregation workflow definitions
```

When adding a page, also register its slug in the appropriate `navigation.tabs[].groups[].pages` array in `docs.json`, otherwise it won't show in the sidebar.
Do not add SDK or MCP pages directly in `main`; those sections should be edited in their source repos and synced into the generated `docs` branch.

## Terminology

- "Synthesize Bio" (two words, capitalized) — the company
- "the platform" — refers to app.synthesize.bio
- `pysynthbio` — Python SDK (lowercase, code-formatted)
- `rsynthbio` — R SDK (lowercase, code-formatted)
- "MCP" — Model Context Protocol (uppercase)
- Use "API key" not "apikey" or "API token"

## Style preferences

- Use active voice and second person ("you")
- Keep sentences concise — one idea per sentence
- Use sentence case for headings (e.g. "Make your first request", not "Make Your First Request")
- Bold for UI elements: Click **Settings**
- Code formatting for file names, commands, paths, env vars, and code references
- Prefer Mintlify components (`<Card>`, `<CardGroup>`, `<Note>`, `<Warning>`, `<Tabs>`, `<Steps>`) over raw markdown / HTML where they fit

## Content boundaries

- Public-facing only — do NOT document internal admin features, internal infra, or anything behind auth that customers can't reach
- Don't link to internal Linear tickets, Notion, or private repos in published pages (it's fine to reference them in PR descriptions and `README.md` / `AGENTS.md`)
- Treat code examples as customer-runnable — they should work against `https://app.synthesize.bio` with a real API key
