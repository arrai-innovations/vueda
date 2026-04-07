<!-- this file is excluded from vitepress and does not need frontmatter -->

# Docs Contributor Guide

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

## Diátaxis Types

A way to understand the Diátaxis Types is as an authoring contract:

- Tutorial
  Goal: Teach by doing.
  Step-by-step, linear, success-oriented.
  Assumes no prior success.
  Outcome: the reader completes a task.

- How-to Guide
  Goal: Solve a specific problem.
  Task-focused, non-linear, assumes baseline competence.
  Explains how to achieve X in this system.
  Outcome: the reader accomplishes a concrete objective.

- Explanation
  Goal: Build understanding.
  Describes what is true about the system: boundaries, contracts, invariants, lifecycle, authority, failure modes.
  No steps. No task flow. No prescriptions.
  Outcome: the reader understands why/how the system behaves as it does.

- Reference
  Goal: Provide facts.
  Authoritative, exhaustive, structured lookup.
  Lists APIs, options, fields, commands, schemas.
  Outcome: the reader finds specific information.

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

- `{@api js:module:@arrai-innovations/vueda/router/guards}`
- `{@api py:module:vueda}`
- `{@api rest:endpoint:GET:/vueda.info/model_info/{app_label}/{model}/}` <!-- note: literal `{` and `}` characters are part of some IDs, referring to captured url parameters, not documentation placeholders -->
- `{@api vue:component:FormField}`

## Glossary links

Link glossary terms from authored docs with `{@term ...}`.

1. Ensure the term exists as a `##` heading in `docs/reference/glossary.md`.
2. Use `{@term <term>}` in prose.
3. Keep spelling aligned with the glossary heading text.

See [Backticks vs Links](#backticks-vs-links) for when to use `{@term ...}` versus inline code.

Examples:

- `{@term CRUDL}`
- `{@term Model Info}`

## Backticks vs Links

Use backticks and custom refs for different purposes:

- Use `{@api ...}` and `{@term ...}` (without surrounding backticks) when you want rendered links in prose.
- Use inline code backticks for literal tokens, parameter names, and code identifiers that must stay exact, such as `f`, `e`, `expand`, `permit_list_expands`, or `class Meta(...)`.
- Do not place `{@api ...}` or `{@term ...}` inside inline code spans or fenced code blocks unless you intentionally want literal text instead of a link.
- Backticks around `{@api ...}` and `{@term ...}` shown in this guide are for Markdown examples only.

Examples:

- Correct link usage in prose: `Use {@term Expand} selection via the \`e\` query parameter.`
- Correct literal token usage: `The literal wire parameter name is \`expand\`.`
- Incorrect when you want a link: `` `{@term Expand}` ``
