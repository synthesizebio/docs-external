# Synthesize Bio Docs — Agent Instructions

For Mintlify product knowledge (components, configuration, writing standards),
install the Mintlify skill: `npx skills add https://mintlify.com/docs`

## About this project

- Public-facing documentation for the Synthesize Bio platform
- Built on [Mintlify](https://mintlify.com); pages are MDX with YAML frontmatter
- Configuration lives in [`docs.json`](./docs.json)
- Auto-deployed by the Mintlify GitHub App on merge to `main`
- Preview locally with `mint dev`; check links with `mint broken-links`

## Project structure

```
docs.json              # Mintlify config: theme, nav, branding
index.mdx              # landing page
get-started/           # intro + quickstart (real content)
python-sdk/            # auto-synced from synthesizebio/pysynthbio:docs/ (do NOT edit here)
r-sdk/                 # APP-2303 (rsynthbio migration target)
mcp/                   # APP-2304 (MCP docs migration target)
guides/                # APP-2305 (help.synthesize.bio migration target)
snippets/              # reusable MDX fragments
images/                # static assets
logo/, favicon.svg     # branding
```

When adding a page, also register its slug in the appropriate `navigation.tabs[].groups[].pages` array in `docs.json`, otherwise it won't show in the sidebar.

### Synced sections

Some sections are owned by other repos and synced in by GitHub Actions:

| Section in this repo | Source of truth                                              | Sync workflow                                                                                                                          |
| -------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `python-sdk/`        | [`synthesizebio/pysynthbio:docs/`](https://github.com/synthesizebio/pysynthbio/tree/main/docs) | [`sync-docs-to-mintlify.yml`](https://github.com/synthesizebio/pysynthbio/blob/main/.github/workflows/sync-docs-to-mintlify.yml) |

For synced sections:

- **Edit content in the source repo**, not here. Sync PRs in this repo will overwrite manual edits to MDX files.
- **`docs.json` is owned here** — the sync workflow doesn't touch it. New synced pages won't appear in the sidebar until added to `docs.json` in this repo.

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
