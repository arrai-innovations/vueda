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
- A `backwards_migrate_workflow` function that iterates through `changed_data` in reverse and undoes each change.
- A call to `handle_state_objects` that gives existing objects without an object state the workflow's initial state, once one is set. On an initial state change, it moves object states with no update recorded after creation. That move records an update, so a later initial state change does not move those objects again.
- Comments that allow the command to identify and parse previously created workflow migrations.
- Other utility functions used by the `handle_*` functions.

The `handle_*` functions look up the associated database record using the natural identifiers stored in the change data, then apply the appropriate create, update, or delete operation.

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

When the function implementations embedded in a workflow migration become out of date — for example, after upgrading VUEDA but before the migration is run anywhere, or if you are squashing migrations — run `updateworkflowmigrations` to bring all existing workflow migrations in line with the current implementations from `makeworkflowmigrations.py`.

```console
python manage.py updateworkflowmigrations
```

To limit the update to a specific app:

```console
python manage.py updateworkflowmigrations myapp
```

### What the Command Updates

`updateworkflowmigrations` scans all installed apps for migrations created by `makeworkflowmigrations` (identified by a comment marker near the top of each file). For each file it finds, the command:

- Replaces the import block with the current imports from `makeworkflowmigrations.py`.
- Replaces the embedded function implementations (`forwards_migrate_workflow`, `backwards_migrate_workflow`, `handle_*`, and related helpers) with the current versions.
- Updates any stale function names referenced in the `operations` list.

The following are preserved exactly as written in each migration file:

- `history_change_reason` — the change reason text stored in the migration.
- `migration_app_label` — the app label used to ensure permissions exist before the migration runs.
- `changed_data` — the recorded list of workflow changes the migration applies.
- The `class Migration` block (dependencies and `operations` list), aside from updating any function names within it.

Only the imports and functions listed above are replaced, matched by name. Any other hand-added imports or helper functions elsewhere in the file are left exactly where they are, so custom code is never lost.

That said, any changes you make inside the listed functions themselves are overwritten the next time `updateworkflowmigrations` runs, since each one is replaced wholesale with the current implementation. If you need a workflow migration to do something beyond what `makeworkflowmigrations` generates, add your logic as an additional, self-contained function referenced from the `class Migration` `operations` list, rather than editing `forwards_migrate_workflow`, `backwards_migrate_workflow`, or the other recognized functions directly.

### Command Options

`--dry-run`

Shows which migration files would be updated without writing any changes to disk.

```console
python manage.py updateworkflowmigrations --dry-run
```

### When to Run It

Workflow migrations are self-contained: they carry everything they need to run, so you do not have to update them after every VUEDA upgrade. Running `updateworkflowmigrations` is optional.

If a bug is found in the embedded functions, the VUEDA release notes will describe the issue and state that running `updateworkflowmigrations` is needed to apply the fix to your existing migrations. Outside of that, running the command when nothing has changed is safe — the function bodies are rewritten with the same current implementations, so migration behavior is unchanged.
