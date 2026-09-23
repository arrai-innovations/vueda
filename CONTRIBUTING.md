# Contributing to VUEDA

Thank you for contributing to VUEDA. The root [README](README.md) explains how
to install the workspace and run its checks and tests.

## Issue and pull request titles

A title should identify the affected behavior and the intended outcome. It
should remain useful in search results, release notes, and cross-references
after the original discussion has been forgotten.

Prefer an active verb and a concrete object. Avoid vague titles such as `Fix
bug`, `Updates`, or `Cleanup`. Do not end a title with a period. Include an
implementation detail only when that implementation is the public contract or
the point of the work.

### Issue titles

Phrase an issue title as the outcome that closing the issue will deliver. Do
not add a Conventional Commit prefix such as `fix:` or `feat:`. Issue types and
labels classify proposed work.

Use `Investigate` only when evidence gathering or a decision is itself the
deliverable.

Examples:

- `Reject invalid OpenAPI documents before publishing`
- `Preserve list filters when returning from detail`
- `Investigate duplicate webhook deliveries after retries`

### Pull request titles

Write a pull request title as the commit subject that should represent the
merged change:

```text
<type>(<optional-scope>): <outcome>
```

The allowed types are:

```text
build, ci, chore, content, docs, feat, fix, perf, refactor, remove, revert, style, test, wip
```

The scope should identify the affected filename (without its extension),
module, package, or concern. A scope is optional.

The text after the prefix must describe the concrete outcome, not merely
classify the work. The title should account for the whole branch.

Examples:

- `feat(server): support Django 6.1 and MAILERS`
- `fix(FormConfirmDialog): unmount wrappers after each test`
- `docs(configuration): explain MAILERS migration`

Avoid titles such as `fix: server changes` or `chore: updates`.

## Issue types and labels

Classify an issue with GitHub's native issue type:

- `Bug`: current supported behavior, a documented contract, or a required
  check is wrong. Add `bug:regression` when the behavior used to work.
- `Feature`: the issue adds a user-facing or integrator-facing capability.
- `Task`: documentation, maintenance, migration, or bounded investigation work
  that is neither a defect nor a new capability.

Do not add `bug` or `enhancement` labels; the issue type already carries that
meaning. Labels describe everything else:

| Family                  | Labels                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| Area                    | `area:client`, `area:server`, `area:docs`, `area:docs-tooling`, `area:templates`, `area:ci` |
| Subsystem               | `feature:history`, `feature:workflow`                                                       |
| Work character          | `documentation`, `maintenance`, `investigation`, `release`                                  |
| Impact                  | `impact:breaking`                                                                           |
| Workflow state          | `status:needs-info`, `status:needs-decision`                                                |
| Contributor suitability | `good first issue`, `help wanted`                                                           |
| Resolution              | `resolution:duplicate`, `resolution:invalid`, `resolution:wontfix`, `resolution:superseded` |
| Automation              | `dependencies`, `python:uv` (applied by Dependabot)                                         |

Use `status:needs-decision` only when an unresolved choice prevents
implementation. Name that choice in a `## Decision required` section. A known
dependency or follow-up does not need the label when work can proceed without
the decision.

### Subsystem labels

A `feature:*` label names a subsystem that spans server, client, and
documentation, which no single `area:*` label groups. Create a new one only
when a concern meets all three conditions:

- It reaches more than one package, so `area:*` labels alone scatter it.
- It names a subsystem that outlives the issue at hand.
- Enough work is coming to make filtering worthwhile. One issue does not need
  its own label.

Otherwise, prefer the existing `area:*` labels. Give a new label a description
when you create it, so its meaning does not depend on whoever added it.

### Pull request labels

Every pull request carries labels. Start from the linked issue's labels, then
adjust them to the files the branch changes. Apply them when you open the pull
request rather than in a later edit.

- Carry every `area:*` label that matches a package the branch changes. A
  changelog entry alone does not earn `area:docs`; substantive pages under
  `docs/` do.
- Keep the issue's work-character, impact, and subsystem labels when they still
  describe the branch.
- Drop `status:needs-decision`. A pull request that settles the decision no
  longer needs it, and the issue keeps its own copy until it closes.
- Add a label the issue lacks when the branch grew into another package.
- When a branch belongs to a subsystem with no `feature:*` label yet, weigh it
  against the bar above. Create the label before opening the pull request.

## Commit messages

Commit messages use the same Conventional Commit format, allowed types, and
scope guidance as pull request titles. Lefthook runs commitlint locally to
validate commit messages.
