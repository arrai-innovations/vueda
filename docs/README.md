<!-- this file is excluded from vitepress and does not need frontmatter -->

# Docs Contributor Guide

Use this guide when authoring pages under `docs/`.

<!-- prettier-ignore-start -->
<!--TOC-->

- [Docs Contributor Guide](#docs-contributor-guide)
  - [Frontmatter Conventions](#frontmatter-conventions)
    - [`title`](#title)
    - [`status`](#status)
    - [`audience`](#audience)
    - [`type`](#type)
  - [Diátaxis Types](#diátaxis-types)
  - [Topic Owners](#topic-owners)
  - [Generated API docs](#generated-api-docs)
  - [Changelog authoring](#changelog-authoring)
    - [Theming IDs](#theming-ids)
  - [Glossary links](#glossary-links)
  - [Verifying VuedaDemo blocks](#verifying-vuedademo-blocks)
    - [InputOTP dependency patch](#inputotp-dependency-patch)
  - [HTML blocks inside VuedaDemo](#html-blocks-inside-vuedademo)
  - [Callouts](#callouts)
  - [Backticks vs Links](#backticks-vs-links)
  - [Wording Cases](#wording-cases)

<!--TOC-->
<!-- prettier-ignore-end -->

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

- `integrator`: focused on technical details relevant to building applications with VUEDA (e.g. end-users of the framework)
- `designer`: focused on the visual contract and customization surface (tokens, theme keys, family meta keys); concerned with reskinning or rebranding VUEDA, not building features with it
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

## Topic Owners

Each contract below has one owner page, which explains it in full. Any other page that needs the contract states the fact it relies on in one sentence and links the owner. Do not restate the owner's rules, tables, or edge cases elsewhere. Two copies drift apart, and readers cannot tell which one is current.

Before explaining a contract on a page, find it in this table. When a topic is missing, pick its owner by Diátaxis type and add a row in the same change. Rules belong on an explanation page, steps on a how-to, and lookup values on a reference page.

| Topic                                                               | Owner page                                                                      | Other pages keep                                                                                                                                                                                    |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `409` warnings payload and client error classes                     | `core-concepts/error-and-validation-contract.md`                                | `form-state-and-validation-lifecycle.md` owns the client confirmation flow; `action-contract-and-availability.md` keeps gate order and `confirm=True`; `crud-adapter-layer.md` keeps its status map |
| Dry-run scope and the action-side warning gate                      | `core-concepts/action-contract-and-availability.md`                             | Workflow how-tos keep transition-only facts; others name the `Dry-Run` header and link                                                                                                              |
| Action availability (model scope, object scope, button sources)     | `core-concepts/action-contract-and-availability.md`                             | A link; field lists belong to the generated reference                                                                                                                                               |
| Route admission: route allowlist, guard order, view resolution      | `core-concepts/routing-and-view-resolution-model.md`                            | One sentence and a link                                                                                                                                                                             |
| Store caches, cached errors, and when they clear                    | `core-concepts/reactive-data-flow.md`                                           | The action page keeps the user-visible effect of a cached workflow `403`                                                                                                                            |
| Permission layer order                                              | `core-concepts/permission-model.md`                                             | One sentence and a link                                                                                                                                                                             |
| State permission rules (tri-state, deny wins) and the workflow gate | `core-concepts/workflow-permission-overlay.md`                                  | `permission-model.md` links                                                                                                                                                                         |
| Permission and workflow status codes, hook signatures               | `reference/permissions.md`                                                      | The overlay page keeps its endpoint gate table                                                                                                                                                      |
| Server authority versus UI visibility                               | `core-concepts/authorization-vs-ui-semantics.md`                                | `architecture-overview.md` keeps one paragraph                                                                                                                                                      |
| Permission name mapping procedure                                   | `guides/permission-name-mapping.md`                                             | `reference/permissions.md` owns the setting values                                                                                                                                                  |
| API URL convention (`/routes/<app_label>/<model_name>/`)            | `guides/create-crudl-surface.md`                                                | The routing page separates client route segments from the API path in one sentence                                                                                                                  |
| `formatted_name` configuration and label chain                      | `guides/create-crudl-surface.md`                                                | `core-concepts/filtering-and-ordering-semantics.md` owns its ordering and filtering rules                                                                                                           |
| Query parameter validation and rejection                            | `core-concepts/filtering-and-ordering-semantics.md`                             | `configuration-surface-and-defaults.md` owns the wire names (`f`, `e`, `om`)                                                                                                                        |
| Expand and sparse fields, including `f` and `om` on writes          | `core-concepts/field-and-expand-semantics.md`                                   | `nested-write-compatibility.md` owns the nested write body                                                                                                                                          |
| Model-info sections and key casing                                  | `core-concepts/server-client-metadata-contract.md`                              | One sentence and a link                                                                                                                                                                             |
| Registration and serializer-only models                             | `core-concepts/canonical-registration-and-discovery.md`                         | One sentence and a link                                                                                                                                                                             |
| Configuration precedence and field and widget resolution            | `core-concepts/contract-first-dynamic-ui.md`                                    | `guides/custom-field-widget-rendering.md` owns the steps and the unmapped fallback; the list column chain stays on `guides/customize-list-column-rendering.md`                                      |
| `storeModelConfig` lifecycle                                        | `core-concepts/reactive-data-flow.md`                                           | Precedence stays on `contract-first-dynamic-ui.md`                                                                                                                                                  |
| Choices endpoints and choice values                                 | `guides/choices-and-lookups.md`                                                 | Endpoint detail belongs to the generated REST reference                                                                                                                                             |
| Pk marker and identifier transport                                  | `core-concepts/pk-and-identifier-discipline.md`                                 | `crud-adapter-layer.md` keeps the adapter view                                                                                                                                                      |
| Composite primary keys                                              | `guides/composite-primary-keys.md`                                              | A link                                                                                                                                                                                              |
| Feature policy                                                      | `core-concepts/model-feature-policy.md`                                         | `architecture-overview.md` keeps two sentences                                                                                                                                                      |
| History storage cost and retention                                  | `guides/purge-model-history.md`                                                 | A link                                                                                                                                                                                              |
| Transaction behavior                                                | `core-concepts/configuration-surface-and-defaults.md`, beside `ATOMIC_REQUESTS` | `architecture-overview.md` keeps one sentence                                                                                                                                                       |
| Column-totals OpenAPI parameter                                     | The generated Python reference (`get_override_parameters`)                      | The configuration page keeps one sentence                                                                                                                                                           |
| Cache contents and the cache requirement                            | `guides/configure-cache-and-sessions.md`                                        | `architecture-overview.md` names the dependency and links                                                                                                                                           |
| Client setup steps, including the Vite `@` alias                    | `guides/client-plugin-prerequisites.md`                                         | The tutorial keeps the scaffolded `main.js`                                                                                                                                                         |
| Theme registration                                                  | `core-concepts/theming-and-customization.md`                                    | A link                                                                                                                                                                                              |
| Auth views and flows                                                | `guides/build-auth-views.md`                                                    | The routing page owns `requireAuth`                                                                                                                                                                 |
| Page title and page action wiring                                   | `guides/place-page-title-and-actions.md`                                        | `views-crudl.md` keeps the visual contract                                                                                                                                                          |
| Redirects after actions (`actionRedirects`)                         | `guides/transition-ux-and-redirects.md`                                         | `configure-crud-views.md` names `redirectAfter` and what reads `actionRedirects`                                                                                                                    |
| List preferences                                                    | `guides/configure-crud-views.md`                                                | One sentence and a link                                                                                                                                                                             |
| Row links to detail views                                           | `guides/link-list-rows-to-detail-views.md`                                      | The tutorial sets `detailLinkField` and links                                                                                                                                                       |
| Workflow management UI                                              | `guides/manage-workflows.md`                                                    | The workflow tutorial links                                                                                                                                                                         |
| Component skin rules shared by every component page                 | `reference/components/index.md`                                                 | Component pages link instead of repeating the intro                                                                                                                                                 |

Two further rules keep definitions and names in one place:

- A glossary entry is one definition plus a link to the topic's owner page. The glossary does not restate the owner's rules.
- Write permission codenames as `<app_label>.<codename>`, for example `vueda_vdq.list_queueitem`, which is the form the code checks.

## Generated API docs

API references for REST, Python, JavaScript, and Vue.js components, plus theme keys and CSS tokens, are generated from source code and stored under `docs/reference/api/` and `docs/reference/theming/`.

These pages are not intended for manual editing; instead, they are generated (see `docs-api` in root `justfile`). Errors or omissions in these pages should be fixed in the source code or generation templates, not by editing the generated markdown.

The pipeline lives in [`docs-tooling/`](../docs-tooling/README.md). The annotation conventions each extractor reads from the source trees it walks are documented in package-scoped briefings:

- [Client annotation contract](../docs-tooling/briefings/client-annotations.md) (Vue SFCs, `@vueda-spread`, dynamic slots, theme keys in `client/lib/`)
- [Server annotation contract](../docs-tooling/briefings/server-annotations.md) (Python docstrings for pdoc, DRF Spectacular schema decorators in `server/vueda/`)

When the extractors change, the briefings should change in the same commit. Treat them as the source of truth for what you need to write in source files to make something appear in the rendered docs.

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
- `theming:keys`
- `theming:tokens`

Examples:

- `{@api js:module:@arrai-innovations/vueda/router/guards}`
- `{@api py:module:vueda}`
- `{@api rest:endpoint:GET:/vueda.info/model_info/{app_label}/{model}/}` <!-- note: literal `{` and `}` characters are part of some IDs, referring to captured url parameters, not documentation placeholders -->
- `{@api vue:component:FormField}`
- `{@api theme-key:Card}` (links to the per-component theme-keys page)
- `{@api theme-key:Card.root}` (links to a slot anchor on that page)
- `{@api css-token:vueda-card-radius}` (links to the token anchor under its group page)

## Changelog authoring

Public changelog pages live under `docs/reference/changelog/`. Use the ignored
convention file when deciding whether a client or server change needs an
integrator-facing entry:

[Changelog authoring convention](reference/changelog/README.md)

@reference/changelog/README.md

### Theming IDs

The theme-keys and css-tokens renderers publish member IDs through the `member_ids` frontmatter on each page. To discover an unfamiliar slot or token ID, search there:

```bash
grep -nR "^member_ids" docs/reference/theming/
```

Theme-key IDs are `theme-key:<Component>` for the component as a whole and `theme-key:<Component>.<slot>` for individual slots. CSS-token IDs are `css-token:<name>`, where `<name>` is the custom property without the leading `--`. Page-level IDs (used as link targets for `[…](…)` rather than `{@api …}`) follow `theming:keys`, `theming:keys:family:<family-slug>`, `theming:keys:<Component>`, `theming:tokens`, and `theming:tokens:<group-slug>`.

## Glossary links

Link glossary terms from authored docs with `{@term ...}`.

1. Ensure the term exists as a `##` heading in `docs/reference/glossary.md`.
2. Use `{@term <term>}` in prose.
3. Keep spelling aligned with the glossary heading text.

See [Backticks vs Links](#backticks-vs-links) for when to use `{@term ...}` versus inline code.

Examples:

- `{@term CRUDL}`
- `{@term Model Info}`

## Verifying VuedaDemo blocks

`VuedaDemo` blocks exist so that readers can review rendered component output visually in the VitePress site.

When you write or edit a `VuedaDemo` block, confirm correctness by:

1. Checking that the markup is syntactically valid (no unclosed tags, no blank lines inside the block -- see below).
2. Ensuring any referenced components are imported or globally registered in the docs site.
3. Running `just check-eslint` and `just check-prettier` to pass linting and formatting.

To check the rendered result, open the page on a running docs site (`just docs-serve`). Browser automation such as screenshots or computed-style checks is fine for this.

### InputOTP dependency patch

The workspace applies `patches/vue-input-otp@0.3.2.patch` through pnpm so OTP
examples work inside VuedaDemo's shadow DOM. The patch reads focus from the
input's own DOM root, listens for selection changes in that root and its
document, and installs the native input's selection/autofill styles once per
root. Other demos retain the same shadow boundary and style isolation.

This is a repository dependency patch, not part of the published VUEDA package.
Consuming applications do not inherit it. Remove it once an upstream version
supports these behaviors; the published 0.4.0 package still uses the document-only
focus check. `InputOTP.integration.spec.js` exercises the real installed
component in document and shadow DOM. After changing the patch, also check
focus, arrow keys, replacement, paste, blur, and disabled examples on the inputs
reference page in the running docs site.

## HTML blocks inside VuedaDemo

Markdown ends an HTML block at the first blank line. Any blank line inside a `<VuedaDemo>` (or any other HTML block) splits it into separate fragments, so closing tags end up in a different block from their openers. Vue's template compiler then sees unclosed elements and throws `Element X is not closed`.

**Rule: no blank lines inside `<VuedaDemo>` or any other HTML block used in docs.**

Use comments to visually separate sections if needed:

```html
<VuedaDemo>
    <SidebarProvider>
        <Sidebar>
            <!-- Operations group -->
            <SidebarMenuItem>...</SidebarMenuItem>
            <!-- Workspace group -->
            <SidebarMenuItem>...</SidebarMenuItem>
        </Sidebar>
    </SidebarProvider>
</VuedaDemo>
```

## Callouts

Use VitePress custom containers for callouts in authored docs:

```
::: warning
Body text here.
:::
```

Available containers: `info`, `tip`, `warning`, `danger`, `details`. See https://vitepress.dev/guide/markdown#custom-containers.

Do not use GitHub-flavored Markdown alert syntax (`> [!WARNING]`) in authored docs. The exception is this `README.md`, which is rendered by GitHub.

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

## Wording Cases

In documentation, the following rules should be applied:

- Use 'JSON' instead of 'json'.
