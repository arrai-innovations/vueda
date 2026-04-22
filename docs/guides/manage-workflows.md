---
title: Manage Workflows and Generate Workflow Migrations
type: how-to
audience: implementor
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

> **Note:** Permissions and groups associated with a workflow must not be deleted until the workflow itself has been removed from all environments, because permissions and groups do not have change history and cannot be restored by rolling back a migration.

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

`makeworkflowmigrations` reads the `django-simple-history` records for every workflow model. It looks for history entries that were created after the last workflow migration was run, and compares those records against the changes already captured in previously created workflow migrations. Only the new, unrecorded changes are included in the migration that gets created.

Each change is stored with a type marker:

- `+` — a record was added
- `~` — a record was changed
- `-` — a record was deleted

Primary keys are excluded from the stored change data. Because primary keys can differ between a developer's local database and a production server, all relationships are stored using natural identifiers (names, codes, content type labels) instead of raw integer ids. When the migration runs, `makeworkflowmigrations` resolves those identifiers to the correct local ids.

Changes are written in the same order they occurred in history. When migrating backwards, the migration processes changes in reverse order and swaps `+` and `-` so that additions become deletions and deletions become re-creations.

### What the Generated Migration Contains

The migration is a standard Django migration file. After Django generates the empty shell, `makeworkflowmigrations` edits the file to add:

- A `changed_data` variable containing the list of recorded changes.
- A `history_change_reason` variable used to identify history records created by the migration.
- A `forwards_migrate_workflow` function that iterates through `changed_data` in order and applies each change by dispatching to the appropriate `handle_*` function (`handle_workflow`, `handle_state`, `handle_transition`, etc.).
- A `backwards_migrate_workflow` function that iterates through `changed_data` in reverse and undoes each change.
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

### Collaborative Workflows

When two developers are making workflow changes in the same branch at the same time, the migration created by the first developer may not include the second developer's history records. The recommended approach is:

1. Have the first developer finish their workflow changes, run `makeworkflowmigrations`, and push the migration.
2. The second developer pulls and runs the migration before making any further workflow changes of their own.
3. The second developer then runs `makeworkflowmigrations` to capture only their additional changes.

Merging workflow migrations created in parallel branches is not straightforward and can produce conflicts. Sequential, coordinated workflow changes are much easier to manage.
