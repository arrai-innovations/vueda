# Security Policy

## Reporting a vulnerability

Do not report a security vulnerability in a public issue, pull request, or
discussion.

Report it privately through GitHub instead:

1. Open the
   [new advisory form](https://github.com/arrai-innovations/vueda/security/advisories/new).
2. Describe the problem, the affected package (server, client, or templates),
   and the version or commit.
3. Include the steps to reproduce it and the impact you expect.

Only the maintainers can read the report. We discuss the fix with you in the
advisory's private thread.

## Supported versions

VUEDA 3.0 is in alpha. We fix security problems in the latest release of the
server and client packages. We do not backport fixes to older releases.

## What to expect

- We aim to acknowledge a report within 5 business days.
- We aim to confirm or reject the problem, and tell you why, within 14 days.
- We fix a confirmed problem in a private fork of the repository, then publish
  a release and a GitHub security advisory together.
- We credit you in the advisory unless you ask us not to.

Please give us time to release a fix before you disclose the problem publicly.

## Scope

In scope:

- The `vueda` server package and the `@arrai-innovations/vueda` client
  package.
- The Copier templates in `templates/`, including the settings they generate.
- VUEDA's defaults and its integration with dependencies, such as the
  django-allauth routes it mounts.

Out of scope:

- A vulnerability in a dependency itself. Report it to that project. Tell us
  too if VUEDA's use of the dependency makes it exploitable.
- A problem that exists only because a project changed VUEDA's defaults.
