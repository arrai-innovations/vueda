---
name: using-vueda
description: Build and troubleshoot applications that use VUEDA's Django server and Vue client. Use for VUEDA setup, model registration, CRUD views, fields, actions, permissions, and workflows in a consuming application. Not for contributing to the VUEDA library itself.
---

# Using VUEDA

Work in the consuming application's structure and follow its instructions,
package managers, and checks. Find an existing model or view that serves a
similar purpose before introducing another pattern. VUEDA's contributor
commands and monorepo layout are not requirements for applications.

## Establish the package versions

Find the Python `vueda` and JavaScript `@arrai-innovations/vueda` dependencies
in the application packages involved in the task. Read their exact versions
from the active environments or lockfiles. A dependency range is not an
installed version. If the two sources disagree, identify which environment
the task concerns before relying on a version-specific API.

Client and server must share a major version. Their minor and patch versions
can differ. For example, client `3.2.1` and server `3.0.4` select the same
documentation site; that difference alone is not a reason to upgrade either.
Prereleases retain their major: `3.0.0-beta.1` and `3.0.0b1` both belong to 3.

If the majors differ, report the mismatch before relying on the combined
client/server contract. Do not choose an upgrade or downgrade without the
user's direction. For a task involving only one package, use its version;
do not install the other package just to complete this check. For a new
application, establish the intended major before selecting setup guidance.

## Load the relevant documentation

VUEDA publishes one evolving documentation site per major at
`https://vueda.dev/v<major>/`. For major 3, fetch
`https://vueda.dev/v3/llms.txt`. Substitute the established major for other
release lines; do not invent minor or patch documentation URLs.

Search the index for the task and fetch the relevant Markdown links before
choosing VUEDA APIs. Fetch individual pages rather than loading
`llms-full.txt` by default. The index supplies exact filenames, including
directory `index.md` files and generated API paths.

Use these page titles to narrow the search; read only what the task needs:

| Task                                    | Starting documentation                                                                                           |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| New application or missing client setup | Start Building; Client Plugin Prerequisites                                                                      |
| New model or missing model info         | Create a CRUDL Surface for a New Model; Canonical Registration and Model Discovery                               |
| View, field, or widget customization    | Configure `list`/`read`/`create`/`update` Views; Contract-First Dynamic UI; Customize Field and Widget Rendering |
| Hidden actions or rejected requests     | Action Contract and Availability; Authorization vs UI Semantics; Permission Model                                |
| Workflow transitions                    | Add Workflow State and Transition Permissions; Design Transition UX and Redirects                                |
| Nested forms or writes                  | Render a Relation as an Inline; Build Nested/Inlined Writes                                                      |

Follow the guide's API links for signatures and supported options. The major
site can describe features newer than the application's installed packages.
When availability matters, check the affected package's changelog and installed
API before using the feature. Treat an unreleased entry as unreleased. Matching
majors does not establish that every documented feature is present.

If you cannot fetch the documentation, use installed source and application
examples where they establish the behavior. State what remains unverified.
Do not silently substitute documentation from another major or upgrade a
dependency to match an example.

## Make the application change

VUEDA derives its UI from model info, the metadata that the server generates
from registered models, serializers, and viewsets. For missing fields,
actions, or routes, inspect that metadata and registration before replacing
the generated view. For presentation changes, use the documented model config,
component props, or slots that fit the application.

Trace the relevant path from server definition to metadata to client config.
Keep serializer write rules and server authorization distinct from UI
visibility. Hiding a field, button, or route does not enforce a server rule.
For an action problem, distinguish model-level actions from an object's
`available_actions`; check the response for the affected user and object.

Preserve the application's API base, authentication, route layout, and existing
registrations. Copy only the relevant parts of documentation examples. Demo
setup scripts and mock data explain examples; they are not application setup.

Verify the changed behavior using the application's own checks. For a new
model, check registration, model info, and the intended view or request. For
permission changes, verify server responses for allowed and denied cases as
well as the UI. Report the package versions, documentation used, and any
checks that could not run.
