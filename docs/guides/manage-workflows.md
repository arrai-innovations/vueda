---
title: Manage Workflows and Generate Workflow Migrations
type: how-to
audience: integrator
status: draft
---

# Manage Workflows and Generate Workflow Migrations

This guide explains how to create, edit, and delete workflows through VUEDA's workflow management UI, and how to generate database migrations that replicate those changes on other environments using the `makeworkflowmigrations` management command.

For background on how workflow permissions and state transitions work, see [Add Workflow State and Transition Permissions](workflow-state-permissions.md). For transition UX on the client, see [Design Transition UX and Redirects](transition-ux-and-redirects.md).

## Goal and Preconditions

By the end of this guide you will have:

- A workflow with states, transitions, permissions, and transition sources configured in the database.
- A workflow migration that captures all of those changes and can be applied on other environments without manually repeating the UI steps.

Before you begin:

The `vueda.workflow` app must be in `INSTALLED_APPS`. The workflow management URLs become available when the project is running in debug mode (`DEBUG = True` in settings); they are not exposed in production. You will need a superuser account to access the management UI, because authentication is required.

## Workflow Management UI

### Navigating to the Workflow Overview

Open the workflow overview page at `/routes/vueda.workflow/overview/`. For example, on a local development server this is typically `http://localhost:8000/routes/vueda.workflow/overview/`. This page lists every registered workflow and provides entry points for editing and deleting each one. The **Add Workflow** button is also located here.

If you are not authenticated, you will be redirected to the login form. Log in with a superuser account before proceeding.

### Adding a Workflow

1. Go to `/routes/vueda.workflow/overview/`.
2. Click **Add Workflow** to open the form at `/routes/vueda.workflow/add/`.
3. Fill in the workflow details and save. After saving, you are redirected to the workflow edit form at `/routes/vueda.workflow/edit/<pk>/`.
4. Add states using the state fields on the edit form and save. Because the initial state and transitions require a state to exist before they can be selected, state additions are saved even when the form has other validation errors. This is intentional: after saving, the state dropdown updates, so that you can select the new state for the initial state or a transition target.
5. Once at least one state exists, you can set the initial state and add transitions on the same edit form. Save the form after each set of changes.
6. To add or edit permissions and transition sources on individual states and transitions, go back to the workflow overview page and click through to the state or transition edit form:
    - State edit form: `/routes/vueda.workflow/edit/state/<pk>/`
    - Transition edit form: `/routes/vueda.workflow/edit/transition/<pk>/`

    From these forms you can add, edit, or delete state permissions, transition permissions, and transition sources.

### Deleting a Workflow

Deleting a workflow requires removing associated objects in a specific order to avoid database constraint violations. If any model still references the workflow, remove that association first.

1. Go to `/routes/vueda.workflow/overview/`.
2. Open each state that has state permissions. Check delete on every state permission row and save.
3. Open each transition that has transition permissions or transition sources. Check delete on every permission and source row and save.
4. Open the workflow edit form at `/routes/vueda.workflow/edit/<pk>/`. Check delete on workflow permissions, transitions, and states that are not the initial state. Save.
5. Check delete on the remaining state and the initial state that references it. Save.
6. Return to the workflow overview page. A **Delete Workflow** button will now appear for this workflow. Click it to complete the deletion at `/routes/vueda.workflow/delete/<pk>/`.

::: warning

Django `Permission` rows (auto-generated from content types) have no change history, and `Group` rows only have history when edited through the permission overview UI. Do not delete workflow-associated permissions or groups manually until the workflow has been removed from all environments, since rolling back a workflow migration cannot restore them.

:::

## Generating Workflow Migrations

After creating or deleting a workflow locally, run `makeworkflowmigrations` to produce a migration that applies the same changes on any other environment.

```console
python manage.py makeworkflowmigrations
```

To limit the migration to a specific app:

```console
python manage.py makeworkflowmigrations myapp
```

### How Change Detection Works

`makeworkflowmigrations` reads the pghistory events for every workflow model. It looks for events recorded after the last workflow migration ran, and compares them against the changes already captured in previously created workflow migrations. Only the new, unrecorded changes go into the migration it writes.

Each change is stored with a type marker:

- `added` — a record was created
- `changed` — a record was modified
- `deleted` — a record was removed

Primary keys are excluded from the stored change data. Because primary keys can differ between a developer's local database and a production server, all relationships are stored using natural identifiers (names, codes, content type labels) instead of raw integer ids. When the migration runs, `makeworkflowmigrations` resolves those identifiers to the correct local ids.

A code identifies a record only among the records that exist at one moment, not across the life of a workflow: a state can be deleted and another added under the same code later, and a workflow code released by one model can be taken over by another. So a change also records enough to say which record its codes meant when the change happened. A workflow is named by its code together with the app label and model it was written for, and a reference to a state or a transition is resolved against the record each candidate write actually names rather than against whichever record carries that code now.

Changes are written in the same order they occurred in history. When migrating backwards, the migration processes changes in reverse order and swaps `added` and `deleted` so that additions become deletions and deletions become re-creations.

### What the Generated Migration Contains

The migration is a standard Django migration file. After Django generates the empty shell, `makeworkflowmigrations` edits the file to add:

- A replaced import block. Django's generated import is replaced rather than left in place, so the full set of imports the generated code needs is written in a controlled order.
- A `changed_data` variable containing the list of recorded changes.
- A `history_change_reason` variable used to identify history records created by the migration.
- A `migration_app_label` variable identifying the app whose permissions must exist before the migration runs.
- A `forwards_migrate_workflow` function that iterates through `changed_data` in order and applies each change by dispatching to the appropriate `handle_*` function (`handle_workflow`, `handle_state`, `handle_transition`, etc.).
- A `backwards_migrate_workflow` function that iterates through `changed_data` in reverse and undoes each change. See [Reversing a Workflow Migration](#reversing-a-workflow-migration) for what it does to object states.
- A call to `handle_state_objects` that gives existing objects without an object state the workflow's initial state, once one is set. On an initial state change, it moves object states with no update recorded after creation. That move records an update, so a later initial state change does not move those objects again.
- Comments that allow the command to identify and parse previously created workflow migrations.
- Other utility functions used by the `handle_*` functions.

The `handle_*` functions look up the associated database record using the natural identifiers stored in the change data, then apply the appropriate create, update, or delete operation.

### How `changed_data` Is Formatted

`makeworkflowmigrations` and `updateworkflowmigrations` format `changed_data` with the Python formatter your project uses, [black](https://black.readthedocs.io/) or [ruff](https://docs.astral.sh/ruff/), when one is installed. These are usually installed as development dependencies. `makegroupmigrations` formats its `changed_data` the same way. See [How `changed_data` Is Formatted](manage-groups.md#how-changed-data-is-formatted) in the group guide.

The commands use the first of these that applies:

1. **black, when your project configures it** with a `[tool.black]` section, even an empty one, in the `pyproject.toml` at your project root. A project can have ruff installed only to lint, so black configuration takes priority. A black configuration in your home directory, such as `~/.config/black`, does not count, so one developer's file cannot choose the formatter for the whole project.
2. **ruff, when it is installed.**
3. **black with its default settings, when it is installed** but not configured.
4. **Python's `pprint`** with a narrow width, when neither is installed. That output uses single quotes and does not follow your settings.

If the formatter that applies fails, for example because your `pyproject.toml` cannot be read or a setting has the wrong type, the commands do not switch to another formatter that would ignore your settings. They print the formatter's error, write `changed_data` with `pprint`, and ask you to fix the problem and then format that migration manually. `updateworkflowmigrations --dry-run` still runs the formatter, so it reports the same error, but it writes nothing and says that a run without `--dry-run` would fall back to `pprint`.

With black or ruff:

- **Your project's settings apply.** black reads `[tool.black]` from the `pyproject.toml` at your project root, and ruff reads the configuration that covers the migration file, such as your `pyproject.toml` or `ruff.toml`. The list follows your line length and quote style. ruff applies its settings even when they exclude migrations from ruff.
- **Every change and every key gets its own line.** Each dictionary and list ends in a trailing comma, which keeps the formatter from joining the items onto one line. The commands keep the magic trailing comma on for this, even when your configuration skips it. An `(old, new)` pair from a changed field stays on one line.
- **Keys are sorted**, as earlier versions of the commands wrote them.

Only `changed_data` is formatted this way. The rest of the migration, including the embedded functions, is written in the commands' own layout.

### Command Options

`--dry-run`

Prints what the migration would contain without writing any files. Use this to verify that the detected changes match what you expect before committing.

```console
python manage.py makeworkflowmigrations --dry-run
```

### Faking the Migration on Your Local Machine

If you made the workflow changes yourself and are the person running `makeworkflowmigrations`, your local database already contains the changes. You do not need to re-apply the migration locally; fake it instead so that Django marks it as applied:

```console
python manage.py migrate myapp 0005_workflow_changes --fake
```

Other environments that do not already have the changes should run the migration normally.

Faking and running are not interchangeable, and `makeworkflowmigrations` treats them differently. A faked migration wrote nothing, so the edits you made by hand are the only record of its changes, and the command matches its changes against those edits. A migration that ran also recorded its own writes. The command still matches its changes, but only against edits made before it first ran on that environment. So rolling a faked migration back and applying it again is safe, and an edit made after the migration ran is never mistaken for one of its changes.

### Reversing a Workflow Migration

Reversing a workflow migration changes object states only for the workflows named in its `changed_data`:

- An object in a state the reversal removes moves back to the most recent state in its history that the workflow still has. An object with no such state gets the workflow's initial state as it stands after the reversal. Either way, the object keeps its object state row, so its history continues.
- A workflow the reversal removes loses its object states, because no state remains for them.
- A workflow the reversal re-creates gives its objects its initial state.
- Every other object state stays as it is.

`migrate` prints one line for each workflow whose object states the reversal changed, with the count for each outcome.

Restoring an object moves only its object state. Anything else a transition changed, such as a field it set or a message it sent, stays as it is.

Workflow migrations generated before this behavior delete the object states of every workflow in the project when reversed. Run `updateworkflowmigrations` to give them the current reverse code. See [Updating Existing Workflow Migrations](#updating-existing-workflow-migrations).

Older reverse code can also fail with `ValueError: Cannot query "Workflow object (2)": Must be "Workflow" instance.` This happens when the reversal leaves applied a later migration that changes model options or triggers, such as one that adds pghistory triggers. Django hands the reverse code models whose relations point at outdated classes ([Django ticket #33586](https://code.djangoproject.com/ticket/33586)), and the current reverse code rebuilds them first. Running `updateworkflowmigrations` fixes this too.

### Collaborative Workflows

When two developers are making workflow changes in the same branch at the same time, the migration created by the first developer may not include the second developer's history records. The recommended approach is:

1. Have the first developer finish their workflow changes, run `makeworkflowmigrations`, and push the migration.
2. The second developer pulls and runs the migration before making any further workflow changes of their own.
3. The second developer then runs `makeworkflowmigrations` to capture only their additional changes.

Merging workflow migrations created in parallel branches is not straightforward and can produce conflicts. Sequential, coordinated workflow changes are much easier to manage.

## Enabling Workflow on a Model with Existing Rows

A model that enables `class Vueda.Workflow` needs its workflow definition before the release that enables it serves traffic. Without one, saving an object and every workflow request fail with `WorkflowNotConfiguredError`. The migration that sets the initial state assigns it to objects present when it runs, so the order is:

1. In development, enable workflow on the model, create its workflow in the management UI, and run `makeworkflowmigrations`.
2. Deploy with migrations applied before the new release serves traffic. `migrate` runs VUEDA's database checks, and `vueda_workflow.W001` warns about an enabled model without a definition. `vueda_workflow.W003` warns about a workflow without an initial state.
3. After the new release serves traffic, run `manage.py backfillworkflowstates <app_label>.<ModelName>`.

The previous release does not know the model has workflow. Objects it creates after the migration assigns states and before the new release takes over have no object state after cutover. They show a null state, drop out of `workflow_state` filters and state grants, and fail on transitions. The backfill gives each of them the initial state, which is the state the new release would have given them. It only creates missing object states, so running it again changes nothing.

`manage.py check --database default` reports `vueda_workflow.W002` while any object of an enabled model still has no object state. The warning names the model and the command that fixes it.

## Updating Existing Workflow Migrations

When the function implementations embedded in a workflow migration become out of date — for example, after upgrading VUEDA but before the migration is run anywhere, or if you are squashing migrations — run `updateworkflowmigrations` to bring your project's workflow migrations in line with the current implementations from `makeworkflowmigrations.py`. With no app label, it updates every app in your project's source tree:

```console
python manage.py updateworkflowmigrations
```

Name apps to update only those:

```console
python manage.py updateworkflowmigrations myapp otherapp
```

### Which Apps a Run Covers

The command never updates an app installed as a package. An app counts as installed when its migrations folder is inside a directory Python installs packages into (`site-packages`). That covers the environment's own, the base interpreter's that a virtual environment created with `--system-site-packages` also uses, and the user directory that `pip install --user` installs into. VUEDA's own `vueda_vdq` is one such app. Your project cannot commit a change to those files, and the next reinstall or upgrade of the package puts the originals back.

The command still reads migrations from installed packages, and from apps you did not name, without rewriting them. It reads them for two reasons:

- **Workflow history.** A package's migration can be the only record of which app and model a workflow code belonged to. Your project's migrations can refer to that workflow by code. See [What the Command Updates](#what-the-command-updates).
- **Dependency checks.** Checking a migration's dependencies loads Django's whole migration graph, which imports every installed app's migrations. If one of those raises an error on import, the command reports it and leaves your migration unchanged.

Naming an installed app is an error. The command reports that it will not update installed packages, names the app, and exits with status 2 before it reads any migration, as it does for an app label that does not exist. A run that finds nothing in your project to update reports that and stops, without reading any package migration.

An app installed in editable mode, such as a uv workspace member, keeps its files in its source tree. It counts as part of your project and is updated.

### What the Command Updates

`updateworkflowmigrations` scans the apps you name, or every app in your project's source tree when you name none, for migrations created by `makeworkflowmigrations` (identified by a comment marker near the top of each file). It first checks whether each file's dependencies include the workflow schema the current functions need. For each compatible file, the command:

- Replaces the import block with the current imports from `makeworkflowmigrations.py`.
- Replaces the embedded function implementations (`forwards_migrate_workflow`, `backwards_migrate_workflow`, `handle_*`, and related helpers) with the current versions.
- Updates any stale function names referenced in the `operations` list.
- Adds the app label and model name to every workflow that `changed_data` refers to by code alone.

A migration written before workflow references carried the app and model names each workflow by its code. A code identifies one workflow at a time but not across the life of a project, so once another model takes a code over, a code on its own no longer says which workflow a change meant. The command works out what each code meant when each change was recorded, reading the workflow's own change, and writes that alongside the code. It reads those changes from every app's generated migrations, including installed packages and apps you did not name, so a reference keeps the workflow it meant even when only a package recorded that workflow. What the changes record is only added to: no change gains or loses an entry, no value already recorded is replaced, and no value other than these two is written. That holds for the values, not the text of the file. See the note on `changed_data` below. A workflow whose own change is not in any migration the command reads is left as it is, because there is nothing to derive from. A reference recorded before every workflow that has held its code is left as it is too, unless only one workflow has ever held that code. When several have, the command cannot tell which one the reference means. Running the command twice makes no further difference.

Working out what a code meant when a change was recorded means ordering the dates that migrations record against each other, and every date a generated migration records carries a time zone. A date without one reached the file by hand, so the command reports the file and reads that date as UTC, which is what the generated dates hold. The date in the file is left exactly as it was written.

If the command cannot read a migration's `changed_data`, it skips that file and reports the fault. Examples include a syntax error, a file that no longer imports on its own, or a change missing `model_name`, `history_date`, or `changes`. It continues updating files whose changes and dependencies it can read, then exits with status 1. If a broken file prevents Django from loading the migration graph, dependency checks fail too. A skipped file stays exactly as it was, including its imports and functions. Fix the reported fault, then run the command again.

A migration the command reads but does not rewrite, such as one in an installed package, is reported as a warning instead. The command leaves out the workflows it records and does not count it as a failure. References are then resolved from the history that remains, so fix the reported fault where you can before relying on the result.

The following are preserved exactly as written in each migration file:

- `history_change_reason` — the change reason text stored in the migration.
- `migration_app_label` — the app label used to ensure permissions exist before the migration runs.
- The `class Migration` block (dependencies and `operations` list), aside from updating any function names within it.

Only the imports and functions listed above are replaced, matched by name. Any other hand-added imports or helper functions elsewhere in the file are left exactly where they are, so custom code is never lost.

`changed_data` is the exception. When the command adds the app and model to any reference in it, it writes the whole list back in the form `makeworkflowmigrations` writes it. See [How `changed_data` Is Formatted](#how-changed-data-is-formatted). The list can be laid out differently, strings can change quotes, and time zones are written as `datetime.timezone.utc`, so a comment or deliberate formatting inside the list is not kept, even though every value it records is. A list with nothing to add is left exactly as it was. Write a note about a change outside the list, where it is preserved along with the rest of your code.

That said, any changes you make inside the listed functions themselves are overwritten the next time `updateworkflowmigrations` runs, since each one is replaced wholesale with the current implementation. If you need a workflow migration to do something beyond what `makeworkflowmigrations` generates, add your logic as an additional, self-contained function referenced from the `class Migration` `operations` list, rather than editing `forwards_migrate_workflow`, `backwards_migrate_workflow`, or the other recognized functions directly.

### Command Options

`--dry-run`

Shows which migration files would be updated without writing any changes to disk. It runs the same compatibility checks as a normal update, reports skipped files separately, and exits with status 1 if any file cannot be updated.

```console
python manage.py updateworkflowmigrations myapp --dry-run
```

### When to Run It

Workflow migrations are self-contained: they carry everything they need to run, so you do not have to update them after every VUEDA upgrade. Running `updateworkflowmigrations` is optional.

If a bug is found in the embedded functions, the VUEDA release notes will describe the issue and state that running `updateworkflowmigrations` is needed to apply the fix to your existing migrations. Outside of that, running the command on migrations that already carry the current implementations changes nothing about how they behave, as long as none of them is one the command must not rewrite.

Run it once for your own apps, and commit the rewritten files, for migrations generated before workflow references carried the app and model. Those migrations name each workflow by code alone, which cannot distinguish workflows when a different model takes a code over. Compatible migrations can receive those identities even if another environment has already applied them. Skipped migrations still need review, as described below.

### Migrations the Command Must Not Rewrite

The current functions require the event models and triggers from `vueda_workflow` migration `0008_initialstateevent_objectstateevent_stateevent_and_more`. The command checks for that migration in the dependency graph, including indirect dependencies and replacement migrations that include it. The installed database's migration status does not affect the decision: the rewritten file must also apply on a fresh database.

If that prerequisite is missing, the command names the file and the required migration, leaves the whole file unchanged, and counts it as a failure. It continues updating compatible files and exits with status 1. This applies to both copied functions and migrations generated with `--import-instead`; skipping an import-form migration does not freeze the functions it imports from VUEDA.

Keep a skipped migration's existing functions. Review its historical schema and ordering before changing its dependencies: raising a dependency can create a cycle or require a schema the recorded changes do not match. If its workflow references still name only a code, add `historical_app_label` and `historical_model` to those references using the workflow's recorded identity, while keeping the functions compatible with that migration's schema. Test the result on a fresh database. If an earlier version of the command already broke a migration, restore that file from version control first; the compatibility check does not repair a previous rewrite.

VUEDA ships the identities in its own `vueda_vdq` workflow migrations, together with their original functions and dependencies. They remain too early to rewrite with the current functions. In particular, `vueda_vdq` migration `0005` must run before workflow `0006`, so making it depend on workflow `0008` would create a cycle.

### Before Committing the Rewritten Files

The command writes the embedded functions in its own layout, which does not follow any project's formatting or lint rules. `changed_data` follows your black or ruff settings only when one of them is installed. See [How `changed_data` Is Formatted](#how-changed-data-is-formatted). A rewritten file can fail a check such as `ruff format --check` or `ruff check` until your tools have run on it. Run your formatter and linter on the rewritten files, then apply your migrations to an empty database, for example by running your test suite, before committing them.

Run it as a development step and commit what it writes. It is not something to call from a migration or a deploy: the command rewrites migration source files, so running it on a deployed checkout edits files that are never committed, and the next deploy starts from the unchanged ones again. The migration being applied at the time is already loaded, so rewriting it has no effect on that run either.
