<!-- this file is excluded from vitepress and does not need frontmatter -->

# Docs Agent Guide

Use this guide when authoring pages under `docs/`.


## Frontmatter Conventions

### `title`
Vitepress will use the first h1 when there is no title in the frontmatter. Add a title to the frontmatter if you want
to use a different (read: shorter) title in the sidebar or browser tabs than the one used in the page content.

### `status`
- `brainstorming`: early stage, likely to change significantly; sans technical references
- `briefing`: evolved from brainstorming into technical outline; not worried about prose or polish yet
- `draft`: more fleshed out but not yet reviewed or finalized
- `final`: reviewed and ready for implementation reference

### `audience`
- `implementor`: focused on technical details relevant to building with VUEDA (e.g. end-users of the framework)
- `contributor`: focused on details relevant to contributing to VUEDA itself (e.g. maintainers and package authors)

### `type`
- `tutorial`: focused on teaching a concept through a specific example or use case; may include references to concepts but not detailed explanations
- `explanation`: focused on explaining a concept, pattern, or design decision; may include implementation references but not detailed how-to steps
- `how-to`: focused on step-by-step instructions for implementing a specific feature or use case; may include references to concepts but not detailed explanations
- `reference`: focused on providing comprehensive technical details and API documentation; may include examples but not detailed explanations or how-to steps
- `plan`: focused on planning and outlining documentation content; not intended for end-user consumption; may include brainstorming notes and technical references without detailed explanations or how-to steps
- `index`: focused on organizing and linking to other documentation pages; may include brief summaries but not detailed explanations or how-to steps

## Generated API docs
API references for REST, Python, JavaScript, and Vue.js components are generated from source code and stored under `docs/reference/api/`.

These pages are not intended for manual editing; instead, they are generated (see `docs-api` in root `justfile`). Errors or omissions in these pages should be fixed in the source code or generation templates, not by editing the generated markdown.

When linking generated API docs in authored Markdown, use `{@api ...}` IDs instead of hardcoded paths.

1. Find the target id from frontmatter in `docs/reference/api/**/*.md` (`id: ...`).
2. Use `{@api <id>}` in prose.
3. Do not invent IDs; search first.
4. Prefer `@api` links over `/reference/api/...` paths inside authored docs.

> [!INFO]
> Some API IDs (especially REST endpoints) include `{}` to represent URL parameters. These braces are part of the identifier itself and must be written exactly as shown. They are not placeholders to be substituted or templated.

Example searches

```bash
rg -n "^id:" docs/reference/api | rg "<keyword>"
```

Common IDs:

- `api:reference`
- `js:index`
- `py:index`
- `rest:index`
- `vue:index`

Examples:

- `{@api js:module:@arrai-innovations/vueda.router/guards}`
- `{@api py:module:vueda}`
- `{@api rest:endpoint:GET:/vueda.info/model_info/{app_label}/{model}/}` <!-- note: literal `{` and `}` characters are part of some IDs, referring to captured url parameters, not documentation placeholders -->
- `{@api vue:component:FieldBoolean}`
