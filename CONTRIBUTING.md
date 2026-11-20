# Contributing to VUEDA

Thank you for contributing to VUEDA. The root [README](README.md) explains how
to install the workspace and run its checks and tests.

## Make a change

These steps follow one change from a working checkout to a pull request. Each
step links to the rules that it relies on.

1. Set up the workspace. Follow [Develop VUEDA](README.md#develop-vueda) in
   the root README to install the tools, run `just bootstrap`, and configure
   the server test database. Run `just test` to confirm that the suite passes
   before you change anything.
2. Write a test that fails without the change. Server tests live under
   `server/tests/unit/` and run with `just test-server <path>`. Client tests
   live under `client/tests/unit/` and run with `just test-client <path>`. A
   path is relative to its package directory. Before you write a server test,
   read [server/tests/README.md](server/tests/README.md). It explains which
   database a test gets, how to test commands that write migrations, and which
   tests must not run in parallel.
3. Make the change until the test passes. Run `just fix`, then `just check`.
   Run the server suite the way CI does, with
   `just test-server -n2 --dist loadgroup`.
4. Update the documentation that the change affects. Authored pages live under
   `docs/`, and [docs/README.md](docs/README.md) covers their frontmatter,
   topic owners, and link syntax. Docstrings and JSDoc feed the generated API
   reference. They follow the
   [client contract](docs-tooling/briefings/client-annotations.md) and the
   [server contract](docs-tooling/briefings/server-annotations.md). Pages,
   docstrings, and JSDoc all follow the
   [language guardrails](AGENTS.md#documentation-language-guardrails). Run
   `just docs-validate` to check references, and `just docs-serve` to read the
   result.
5. Add a changelog fragment when the change needs one. See
   [Changelog entries](#changelog-entries).
6. Commit, then open the pull request. Follow
   [Commit messages](#commit-messages),
   [Pull request titles](#pull-request-titles), and
   [Pull request labels](#pull-request-labels).

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

Mark a breaking change with `!` before the colon, as in
`fix(checks)!: report get_queryset and default manager orderings`. A change is
breaking when an integrator must change code, configuration, or data to keep a
project working after upgrading. A breaking pull request also carries `impact:breaking`; see
[Pull request labels](#pull-request-labels).

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
| `topic:live-updates`   | Websocket subscriptions, change capture, the listener process, and how views react to pushed changes             |

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
- Carry `impact:breaking` exactly when the title marks the change breaking with
  `!`. The check adds the label to a title with `!`. It fails a pull request
  that carries the label on a title without `!`.
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

## Release the packages

A release publishes the client to npm and the server to PyPI, and then
republishes the documentation site. The two packages can release separately.
Usually they release together from one merge commit.

The procedure has two parts. A release pull request writes the changelog
sections and sets the new versions. After it merges, pushing tags to the merge
commit starts CircleCI, which publishes the packages and the site.

To push the tags, you need write access to this repository. To move the npm
`latest` tag, you need an npm account that can publish
`@arrai-innovations/vueda`. To rerun a failed CircleCI job, you need access to
the project in CircleCI.

### Versions and tags

Each package keeps its version in one place, in its own registry's format. A
tag must match its package's version exactly. CircleCI refuses to publish a tag
that does not.

| Package | Version source                              | Version format               | Tag                    |
| ------- | ------------------------------------------- | ---------------------------- | ---------------------- |
| client  | `version` in `client/package.json`          | npm (semver): `3.0.0-beta.2` | `client-v3.0.0-beta.2` |
| server  | `__version__` in `server/vueda/__init__.py` | Python (PEP 440): `3.0.0b2`  | `server-v3.0.0b2`      |
| docs    | The client version                          | npm (semver): `3.0.0-beta.2` | `docs-v3.0.0-beta.2`   |

The client and server versions match only in their major version, and either
package can release alone. A docs tag carries the client version, so only a
release that changes the client version pushes one. A server-only release
leaves the client version unchanged, and a docs tag with that version already
exists. After a server-only release, publish the site with `just docs-deploy`.
See [Publish the documentation without a tag](#publish-the-documentation-without-a-tag).

The examples in this section release client 3.0.0-beta.2 and server 3.0.0b2.
Replace those versions with the ones you release.

### Prepare the release pull request

1. Start a branch from the current `main`:

    ```bash
    git fetch origin
    git switch -c build/release-beta2 --no-track origin/main
    ```

2. Edit each package's fragments into the release section that an integrator
   reads. Print them grouped by topic:

    ```bash
    just changelog-draft-by-area client 3.0.0-beta.2
    just changelog-draft-by-area server 3.0.0b2
    ```

    This step is an editorial pass. Each fragment's author judged it alone,
    when the change merged. The release is the first point where someone reads
    every change since the last published version together. Apply the
    inclusion rule in
    [`docs/reference/changelog/README.md`](docs/reference/changelog/README.md)
    to each fragment again:
    - Delete a fragment when you cannot name what an integrator would do
      differently after reading it.
    - Delete a fragment that fixes a defect in a change that this release also
      ships. The integrator never saw that defect. Edit the original change's
      fragment instead, so that it describes the final behavior.
    - Merge fragments that describe one change from the integrator's view, even
      when several pull requests made it.
    - Rewrite an entry that describes the implementation, so that it names the
      public API and the action an integrator takes.

    The result should read as what an integrator needs to know to upgrade. A
    list of every merged pull request is too long for that. Expect to delete
    or merge fragments in most releases. Reviewers of the release pull request
    check these edits.

3. Write each release section, dated today, and stage the removal of its
   fragments:

    ```bash
    just changelog-build client 3.0.0-beta.2
    just changelog-build server 3.0.0b2
    ```

4. Set the new versions in `client/package.json` and
   `server/vueda/__init__.py`.

5. Raise every version floor to the new versions. A version floor is the lower
   bound of a VUEDA dependency range, such as `>=3.0.0b1,<4` or
   `^3.0.0-beta.1`. Floors appear in the starter templates and in the install
   commands of the READMEs and guides. This search lists them:

    ```bash
    git grep -n -E 'vueda(\[[a-z,]+\])? *>=|vueda(@|": ")\^' -- ':!changelog.d' ':!docs/reference/changelog'
    ```

    Change only the ranges. Leave a sentence that names a past release, such as
    "a database upgraded with server 3.0.0b1 or earlier". That sentence
    describes the past release. Skip `scripts/check_template_parity.py`, which
    matches the search but holds no floor.

    The template parity check fails when a server template's floor differs from
    `__version__`. It runs in the pre-push hook and in CI. Nothing checks the
    client template floors or the floors in the docs.

6. When the release moves to another channel, such as from beta to release
   candidate, update the files that name the channel:
    - `publishConfig.tag` in `client/package.json`;
    - the `Development Status` classifier in `server/pyproject.toml`; and
    - the npm badges, package links, and install commands in `README.md` and
      `client/README.md`.

7. Commit, and open a pull request titled
   `build(release): cut client beta.2 and server b2`. Give it the `release`
   label. Do not add `changelog:none`: the pull request removes fragments, and
   the `Pull request metadata` check fails a pull request that has both.

The changelog headings carry the date of step 3. If the pull request merges on
a later day, change those dates to the merge date before it merges.

### Publish the release

After the release pull request merges, tag its merge commit and push the tags.
Push a tag only for each package that releases. Push the docs tag only when the
client releases.

```bash
git fetch origin
MERGE=$(gh pr view <number> --json mergeCommit --jq .mergeCommit.oid)
git tag client-v3.0.0-beta.2 "$MERGE"
git tag server-v3.0.0b2 "$MERGE"
git tag docs-v3.0.0-beta.2 "$MERGE"
git push origin client-v3.0.0-beta.2 server-v3.0.0b2 docs-v3.0.0-beta.2
```

Each tag starts its own CircleCI pipeline:

- A `client-v*` tag runs the client tests and checks the tag against
  `client/package.json`. It then publishes to npm and creates a GitHub release.
  The npm dist-tag follows the version: `alpha`, `beta`, `next` for a release
  candidate, and `latest` for a final release.
- A `server-v*` tag runs the server tests on each supported Python version and
  checks the tag against `__version__`. It then builds the wheel, uploads it to
  PyPI, and creates a GitHub release.
- A `docs-v*` tag validates the documentation and publishes the site under
  `/v<major>/`, such as `/v3/`. The site publishes only from a `docs-v*` tag or
  from `just docs-deploy`, so without this tag the site's changelog pages lack
  the release.

CI moves the npm `latest` tag only for a final release. Until v3.0.0, move it
by hand after the client publishes:

```bash
npm dist-tag add @arrai-innovations/vueda@3.0.0-beta.2 latest --@arrai-innovations:registry=https://registry.npmjs.org/
```

Then check the result:

```bash
gh release list --limit 2
npm view @arrai-innovations/vueda dist-tags --registry=https://registry.npmjs.org/
```

The GitHub releases list both tags as prereleases. The npm dist-tags show the
new version on `latest` and on its channel. The PyPI page for the server
version, `https://pypi.org/project/vueda/3.0.0b2/`, exists.

### When a release job fails

Rerun the failed job in CircleCI when the cause is temporary, such as an
unavailable package mirror.

When the fix needs a commit, check whether the package published. npm and PyPI
refuse a second upload of a published version. If the package did not publish,
merge the fix, then move that package's tag to the new merge commit and push it
again:

```bash
git push origin :refs/tags/server-v3.0.0b2
git tag -f server-v3.0.0b2 <new merge commit>
git push origin server-v3.0.0b2
```

If the package did publish, release the fix as a new version.

### Publish the documentation without a tag

`just docs-deploy` validates the documentation on `main` and publishes the
site, with no tag. It takes the major version for the site path from
`client/package.json`. Use it in two cases:

- after a server-only release, so that the site's server changelog page shows
  the release; and
- for documentation fixes that land between releases.

It needs a CircleCI API token, from `circleci setup` or `CIRCLECI_TOKEN`.

## Dependency audit fixes

Keep a dependency audit fix out of a pull request whose focus is other work.
Land it on its own, in a pull request whose focus is that fix.

An audit fix edits files that most branches share: `uv.lock`,
`pnpm-lock.yaml`, and the overrides in `pnpm-workspace.yaml`. A pull request
that carries one conflicts with every other branch that touches those files.
Those conflicts grow while the pull request waits for review and while other
work lands on `main`.

Run both audits from the repository root. The Python audit reads the root
`uv.lock`, so it reports the versions the workspace resolves rather than the
lower bounds in `server/pyproject.toml`:

```bash
uvx pysentry-rs . --config server/pyproject.toml --compact --color never
pnpm audit
```

## Commit messages

Commit messages use the same Conventional Commit format, allowed types, and
scope guidance as pull request titles. Lefthook runs commitlint locally to
validate commit messages.
