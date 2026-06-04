<!-- this file is excluded from vitepress and does not need frontmatter -->

# Changelog Authoring Convention

Use this convention when deciding whether to add entries to the public changelog
pages.

The public changelog is for integrators. It should describe changes that affect
applications built on VUEDA, not every internal implementation step.

## Page Split

- `client.md`: npm package changes for `@arrai-innovations/vueda`.
- `server.md`: Python package changes for `vueda`.
- Do not add a docs changelog unless docs releases become something integrators actively track.
- If an entry affects both packages, add matching entries to both pages and cross-reference the related package only when that helps migration.

## When Entries Are Needed

Add a changelog entry when a change does at least one of these:

- breaks an existing integration path, public API, documented behavior, import path, setting, route, endpoint, payload shape, component prop, slot, event, theme key, CSS token, or generated metadata contract
- adds a new capability that an integrator could intentionally use
- changes setup, dependencies, build requirements, package compatibility, migrations, management commands, or deployment assumptions
- changes security-sensitive behavior, authorization behavior, validation behavior, data persistence, or data-loss risk
- fixes a released or documented behavior that integrators may have worked around

Do not add an entry for changes that are only:

- internal refactors with no public behavior change
- test-only changes
- formatting, linting, or type cleanup
- prose-only documentation edits
- temporary CI or release plumbing
- bug fixes for behavior that was never released, documented, or plausibly observed by an integrator

## Fixes Threshold

Bug fixes are useful in changelogs when they change what an integrator can
observe or rely on. They are noise when they only explain internal churn.

Include fixes that affect:

- runtime behavior in consuming applications
- server responses, metadata, permissions, validation, or migrations
- component rendering, events, slots, props, theming, or routing
- security, compatibility, or dependency behavior
- a documented feature or example that previously failed

Skip fixes that only affect private implementation details, unreleased work,
tests, local docs build issues, or typo-level cleanup.

When in doubt, ask: "Would an integrator upgrading packages care, adjust code,
remove a workaround, or understand a changed symptom from this note?" If yes,
include it. If no, leave it out.

## Release Section Template

```md
## vX.Y.Z (unreleased)

### Breaking Changes

- **Component, module, setting, endpoint, or behavior**:
    - Describe what changed in concrete terms.
      _If consuming applications must act, state the required action here._

### Features

- **Component, module, setting, endpoint, or behavior**:
    - Describe the new capability.
      _State adoption steps only when they are not obvious from the entry._

### Fixes

- **Component, module, setting, endpoint, or behavior**:
    - Describe the user-visible or integrator-visible problem that is now fixed.
```

## Empty Section Template

Use this when scaffolding a release before entries exist.

```md
## vNext (unreleased)

### Breaking Changes

No entries yet.

### Features

No entries yet.

### Fixes

No entries yet.
```

## Entry Rules

- Write for integrators, not maintainers.
- Prefer concrete nouns: component names, setting names, endpoint names, management command names.
- Mark required consuming-application action in italics directly below the change it belongs to.
- Do not include pure refactors unless they change public behavior, public API, compatibility, generated docs, or migration work.
- Keep package versions independent below the major version.
