# Docs Tooling

This folder is the home for internal documentation tooling that turns multiple tool outputs into a unified docs experience in `docs/` (VitePress). It may be open sourced later, but it is not designed as a public-facing framework today.

## Goals (Brainstorm)
- Provide a single pipeline that converts tool-specific outputs into a shared, predictable schema.
- Generate Markdown suitable for VitePress alongside authored content.
- Keep adapters thin and focused on extraction/normalization.
- Make outputs deterministic and easy to review in PRs.
- Allow incremental adoption by package or tool.
- Extend SFC documentation to cover dynamic slot names (e.g. `field(<name>)`, `header(<name>)`) via JSDoc tags or custom annotations.

## Non-Goals (For Now)
- Replacing upstream doc tooling entirely.
- Building a full static-site generator.
- Real-time docs in dev server (can be explored later).
- Plugin systems or third-party extension points.
- Public configuration DSLs or user-facing extensibility.

## Architecture (Brainstorm)

Data flow:
1. Source tooling (pdoc, redocly, typedoc, vue-docgen-api) emits JSON.
2. Adapters normalize tool JSON into a canonical schema.
3. Renderers convert canonical schema into Markdown for VitePress.
4. Output lands in `docs/` under a clear, tool-specific or package-specific path.

## Layers
- **Extractors**: invoke tools, capture JSON.
- **Normalizers**: map tool JSON -> canonical schema.
- **Schema**: shared types/spec for API doc nodes.
- **Renderers**: canonical schema -> Markdown (and/or MDX later).
- **Orchestrator**: CLI and config for running tasks.

## Proposed Layout
- `docs-tooling/py/`
  - pdoc + DRF schema extraction/adapters
- `docs-tooling/js/`
  - typedoc + vue-docgen extraction/adapters
- `docs-tooling/core/`
  - shared schema definitions
  - markdown renderers
- `docs-tooling/bin/`
  - CLI entrypoints and task runners

## Canonical Schema (Idea)
A shared JSON schema should be the center of gravity. Example high-level node types:
- `Package` / `Module`
- `Class` / `Interface`
- `Function` / `Method`
- `Property` / `Field`
- `Type`
- `Endpoint` (DRF/OpenAPI)
- `Example` / `Code`

If we converge on one schema, there is **one** JSON -> Markdown path rather than four.

## Output Conventions (Idea)
- `docs/generated/<tool or package>/...`
- Include a small manifest file describing versions and timestamps.
- Keep generated content in separate directories to avoid mixing with authored docs.

## Open Questions
- Should we keep a single schema or accept minor variants for API vs. component docs?
- How much should the renderer handle formatting vs. template files?
- How do we version the schema and prevent drift?
- Do we want generated docs to be fully deterministic (sorted, stable IDs)?
- How should we standardize dynamic slot docs (custom JSDoc tags, docgen plugins, or a post-processor that rewrites slot entries)?

## Next Steps
- Decide on a canonical schema shape.
- Choose a CLI approach (Python, Node, or hybrid).
- Write one adapter end-to-end to validate the pipeline.
