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

The `Issue title` check fails an issue whose title has a Conventional Commit
prefix, ends with a period, or starts with `Investigate` without the
`investigation` label. It runs when the issue opens and each time its title or
labels change. The other rules here need a reviewer.

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
module, package, or concern. A scope is optional. It names the code that
changed, not the topic: the pull request's `topic:*` label and its changelog
fragment carry the topic.

The text after the prefix must describe the concrete outcome, not merely
classify the work. The title should account for the whole branch.

Examples:

- `feat(server): support Django 6.1 and MAILERS`
- `fix(FormConfirmDialog): unmount wrappers after each test`
- `docs(configuration): explain MAILERS migration`

Avoid titles such as `fix: server changes` or `chore: updates`.

The `Pull request metadata` check runs commitlint on the title, with the same
configuration as commit messages. It reruns whenever the title changes.

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
| Topic                   | `topic:*`, listed under [Topic labels](#topic-labels)                                       |
| Work character          | `maintenance`, `investigation`, `release`                                                   |
| Impact                  | `impact:breaking`                                                                           |
| Changelog               | `changelog:none`                                                                            |
| Workflow state          | `status:needs-info`, `status:needs-decision`                                                |
| Contributor suitability | `good first issue`, `help wanted`                                                           |
| Resolution              | `resolution:duplicate`, `resolution:invalid`, `resolution:wontfix`, `resolution:superseded` |
| Automation              | `dependencies`, `python:uv` (applied by Dependabot)                                         |

Use `status:needs-decision` only when an unresolved choice prevents
implementation. Name that choice in a `## Decision required` section. A known
dependency or follow-up does not need the label when work can proceed without
the decision.

### Area labels

An `area:*` label names a package that the work changes. Give an issue each
area whose package its fix is expected to change: an issue that needs a client
change and a server change carries `area:client` and `area:server`.

`area:docs` is the exception. It marks work whose main deliverable is
documentation, such as a new guide, a page review, or corrected OpenAPI
examples. A feature or fix that also updates a guide does not earn it, even
though the branch changes files under `docs/`.

### Topic labels

A `topic:*` label names the part of VUEDA that an integrator would look in to
notice a change. The same topics group each package's changelog, and a
changelog fragment's directory repeats its label: `topic:lists` matches
`changelog.d/client/lists/` and `changelog.d/server/lists/`.

| Label                  | Covers                                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `topic:lists`          | List views, columns, filtering, sorting, search, pagination, bulk-action controls, and server query parameters   |
| `topic:forms`          | Create, update, and read forms, fieldsets and inlines, action forms, validation, warnings, and error responses   |
| `topic:field-types`    | How a field type renders anywhere: field and column mappings, widgets, read-only displays, and serializer fields |
| `topic:model-metadata` | Model info, model config, OpenAPI output, field lists, CRUD adapters, and metadata caches                        |
| `topic:permissions`    | Who may see or do what: route access, action availability, `available_actions`, and object permissions           |
| `topic:routing`        | CRUD routes and guards, view routing, page titles, sticky page chrome, and navigation                            |
| `topic:auth`           | Sign-in and authentication forms, users, password reset, and sessions                                            |
| `topic:workflow`       | Workflow states, transitions, their permissions, views, and migrations                                           |
| `topic:history`        | Object history recording, the history API, and history views                                                     |
| `topic:components`     | Generic components and the theme: controls, display, feedback, shell, tokens, theme keys, and icons              |
| `topic:models`         | Model base classes, `formatted_name`, and the `class Vueda` feature policy                                       |
| `topic:vdq`            | The VDQ queue app                                                                                                |
| `topic:setup`          | Installation, dependencies, settings, supported versions, build integration, import paths, and packaging         |

Give a change one topic. When more than one seems to fit, take the first rule
that applies:

1. A change that concerns only workflow or only history takes that topic,
   including its permissions and confirmations.
2. A change to who may see or do something takes `topic:permissions`.
3. Otherwise, take the topic where an integrator notices the change. Filter
   types leaving the filter menu belong to `topic:lists`, even though the
   change edits field mappings.
4. A change that several surfaces notice equally takes the lowest layer they
   share. A change to field naming that every view sees belongs to
   `topic:model-metadata`.
5. A system check takes the topic of the feature it checks.

An issue or pull request that spans two independent topics usually holds two
changes. Split it, or label it with both and give each changelog fragment its
own topic.

Add a topic only when a concern meets all of these conditions:

- The rules above place its changes in no existing topic, or scatter them
  across several.
- It names a part of VUEDA that outlives the issue at hand.
- Enough work is coming to make filtering worthwhile. One issue does not need
  its own label.

A new topic needs a label and a matching section in each package's
`changelog.d/<package>.toml` in the same pull request. Give a new label a
description when you create it, so its meaning does not depend on whoever added
it.

### Pull request labels

Every pull request carries labels. Start from the linked issue's labels, then
adjust them to the files the branch changes. Apply them when you open the pull
request rather than in a later edit.

- Carry every `area:*` label that matches a package the branch changes. The
  `Pull request metadata` check adds any that are missing and never removes
  one. It never adds `area:docs`; add that label by hand when the pull request's
  main deliverable is documentation. See [Area labels](#area-labels).
- Keep the issue's work-character, impact, and topic labels when they still
  describe the branch. Every topic that a changelog fragment's directory names
  needs its `topic:*` label. With no topic label, the check adds the fragments'
  topics. If topic labels exist but miss a fragment's topic, the check fails.
- Drop `status:needs-decision`. A pull request that settles the decision no
  longer needs it, and the issue keeps its own copy until it closes.
- Add a label the issue lacks when the branch grew into another package.
- When a branch fits no existing topic, weigh it against the bar above. Create
  the label and changelog section before opening the pull request.
- Add `changelog:none` when the branch needs no changelog entry. See
  [Changelog entries](#changelog-entries).

## Changelog entries

Each package has an integrator-facing changelog:
`docs/reference/changelog/client.md` and `docs/reference/changelog/server.md`.
A pull request does not edit those pages. It adds a fragment file for each
entry, and a release build writes the fragments into the page. Two pull
requests then never edit the same changelog lines.

[`docs/reference/changelog/README.md`](docs/reference/changelog/README.md)
decides whether a change needs an entry and what the entry says. Most changes
need none.

### Add a fragment

A fragment lives at `changelog.d/<package>/<topic>/<number>.<type>.md`:

- `<package>` is `client` or `server`. A change that both packages' integrators
  notice gets a fragment in each.
- `<topic>` is the directory that matches the pull request's `topic:*` label.
- `<number>` is the number of the issue the pull request closes, or the pull
  request's own number. An issue has its number before the pull request
  exists, so the fragment can land in the branch's first commit. A second
  fragment with the same number, type, and topic adds a counter:
  `328.fix.1.md`. That covers a second fragment from one pull request and a
  second pull request for one issue. A change committed without a pull request
  uses a name that starts with `+`, such as `+cache-url.fix.md`, and renders
  without a link. The metadata check fails a fragment whose package, topic, or
  name towncrier would not recognize.
- `<type>` is `breaking`, `feature`, or `fix`.

`just changelog-new client` prompts for the number, type, and topic. The same
recipe accepts them directly:

```bash
just changelog-new client 349.fix --section "Forms and validation"
```

The fragment holds one complete list entry in the format the changelog README
describes. The release build adds a link to that issue or pull request to its
first line.

A pre-commit hook drafts both changelogs whenever a commit touches
`changelog.d/`, and rejects a fragment filename that does not match a type or
topic.

Preview the next release section with `just changelog-draft client
3.0.0-alpha.6`. The documentation site also shows unreleased fragments at the
top of each changelog page.

To change an unreleased entry, edit its fragment. When a later pull request
alters or reverts behavior that no release has shipped, edit the existing
fragment instead of adding another.

### When no entry is needed

Add the `changelog:none` label to the pull request. The `Pull request
metadata` check fails a pull request that changes no fragment and lacks the
label, and one that has both. It reruns when labels change. The check covers
pull requests only, so a commit made directly to `main` adds its fragment by
hand.

### Release a package

Before tagging a release, reread its fragments grouped by topic:

```bash
just changelog-draft-by-area client 3.0.0-alpha.6
```

Edit fragments that overlap or no longer describe the release. Then write the
release section, dated today, and stage the removal of its fragments:

```bash
just changelog-build client 3.0.0-alpha.6
```

Commit the result with the version bump.

## Commit messages

Commit messages use the same Conventional Commit format, allowed types, and
scope guidance as pull request titles. Lefthook runs commitlint locally to
validate commit messages.
