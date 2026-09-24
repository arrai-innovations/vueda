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
- If a change affects both packages, add a fragment for each package and cross-reference the related package only when that helps migration.

## Inclusion Rule

An entry belongs in the public changelog only when an integrator upgrading from
the previous published version would act differently after reading it. Default
to no entry. Write one when at least one of these holds:

- The integrator must change code, configuration, dependencies, or data to
  upgrade.
- The integrator can now do something they could not do before.
- Behavior changed that some integration could reasonably have treated as
  intended and built on, so the change would surprise that integration.

A fix for a defect that no integration could reasonably have relied on gets no
entry, even when the defect was visible. Security and data-loss fixes are the
exception, because integrators need to assess their exposure before upgrading.

Compare against the previous published version, not the previous commit. A
change that alters or reverts behavior no release has shipped edits the
existing fragment instead of adding another.

The author of a change is poorly placed to judge its importance to integrators.
If you cannot name what an integrator would do differently after reading an
entry, leave it out.

## Entry Format

Each entry is a fragment file under `changelog.d/`. `CONTRIBUTING.md` covers
where a fragment goes and how a release writes it into the page. A release
section groups entries by change type (Breaking Changes, Features, Fixes) and
then by topic.

A fragment holds one list entry: a bold title naming the change, then at most
three sentences as nested bullets. Add an italic action line when the
integrator must act.

```md
- **Component, module, setting, endpoint, or behavior**:
    - Describe what changed in concrete terms.
      _If consuming applications must act, state the required action here._
```

Link a guide or reference page for detail the entry cannot hold. The release
build links the issue or pull request that the fragment's name numbers.

## Entry Rules

- Write for integrators, not maintainers.
- Prefer concrete nouns: component names, setting names, endpoint names, management command names.
- Name only public API that integrators touch. Internal functions, helpers, and code paths belong in the pull request.
- Mark required consuming-application action in italics directly below the change it belongs to.
- Do not include pure refactors unless they change public behavior, public API, compatibility, generated docs, or migration work.
- Keep package versions independent below the major version.
