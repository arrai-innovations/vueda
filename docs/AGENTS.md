# Docs Agent Guide

Use this compact guide when authoring pages under `docs/`. Read `README.md`
only when you need the full authoring reference.

## Frontmatter

Use frontmatter fields consistently:

- `title`: add when the sidebar or browser title should differ from the page h1.
- `status`: `brainstorming`, `briefing`, `draft`, or `final`.
- `audience`: `integrator`, `designer`, or `contributor`.
- `type`: `tutorial`, `explanation`, `how-to`, `reference`, `plan`, or `index`.

## Generated API Docs

Generated API references live under `docs/reference/api/` and
`docs/reference/theming/`. Do not edit generated pages directly. Fix errors in
source code, annotations, or docs-tooling renderers.

When editing source annotations that feed generated docs, consult the relevant
briefing:

- Client annotations: `../docs-tooling/briefings/client-annotations.md`
- Server annotations: `../docs-tooling/briefings/server-annotations.md`

When linking generated API docs in authored Markdown, use `{@api ...}` IDs
instead of hardcoded paths. Search existing frontmatter IDs before writing a
link:

```bash
rg -n "^id:" docs/reference/api | rg "<keyword>"
```

## Changelog

Public changelog pages live under `docs/reference/changelog/`. New entries are
fragment files under `../changelog.d/`, which a release build writes into those
pages; `../CONTRIBUTING.md` ("Changelog entries") covers the workflow. Before
adding or editing an entry, consult `reference/changelog/README.md` for the
shared authoring convention.

## Glossary Links

Link glossary terms with `{@term ...}`. Ensure the term exists as a `##`
heading in `docs/reference/glossary.md`, and keep spelling aligned with that
heading.

## VuedaDemo Blocks

Verify `VuedaDemo` blocks by checking markup, imports or global registrations,
then run `just check-eslint` and `just check-prettier`. Rendered checks are also
welcome: open the page on a running docs site (`just docs-serve`) and inspect or
screenshot the demo.

Do not place blank lines inside `<VuedaDemo>` or other HTML blocks used in docs.
Markdown ends an HTML block at the first blank line.

## Callouts

Use VitePress custom containers for callouts:

```md
::: warning
Body text here.
:::
```

Available containers are `info`, `tip`, `warning`, `danger`, and `details`. Do
not use GitHub-flavored Markdown alert syntax in authored docs.

## Backticks vs Links

- Use `{@api ...}` and `{@term ...}` without surrounding backticks for rendered
  links in prose.
- Use inline code backticks for literal tokens, parameter names, and code
  identifiers.
- Do not place `{@api ...}` or `{@term ...}` inside inline code spans or fenced
  code blocks unless you intentionally want literal text.

## Wording

Use `JSON`, not `json`, in documentation prose.
