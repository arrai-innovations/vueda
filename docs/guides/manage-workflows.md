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

## Updating Existing Workflow Migrations

When the function implementations embedded in a workflow migration become out of date — for example, after upgrading VUEDA but before the migration is run anywhere, or if you are squashing migrations — run `updateworkflowmigrations` to bring your app's workflow migrations in line with the current implementations from `makeworkflowmigrations.py`. Name each of your own apps:

```console
python manage.py updateworkflowmigrations myapp otherapp
```

::: warning
Always name the apps to update. With no app label, the command rewrites the workflow migrations of every installed app, including VUEDA's own migrations inside the installed package, such as `vueda_vdq`'s. You cannot commit those files, and the rewritten ones fail to apply. See [Migrations the command must not rewrite](#migrations-the-command-must-not-rewrite).
:::

### What the Command Updates

`updateworkflowmigrations` scans the apps you name, or every installed app when you name none, for migrations created by `makeworkflowmigrations` (identified by a comment marker near the top of each file). For each file it finds, the command:

- Replaces the import block with the current imports from `makeworkflowmigrations.py`.
- Replaces the embedded function implementations (`forwards_migrate_workflow`, `backwards_migrate_workflow`, `handle_*`, and related helpers) with the current versions.
- Updates any stale function names referenced in the `operations` list.
- Adds the app label and model name to every workflow that `changed_data` refers to by code alone.

A migration written before workflow references carried the app and model names each workflow by its code. A code identifies one workflow at a time but not across the life of a project, so once another model takes a code over, a code on its own no longer says which workflow a change meant. The command works out what each code meant when each change was recorded, reading the workflow's own change, and writes that alongside the code. What the changes record is only added to: no change gains or loses an entry, no value already recorded is replaced, and no value other than these two is written. That holds for the values, not the text of the file. See the note on `changed_data` below. A workflow whose own change is not in any migration the command reads is left as it is, because there is nothing to derive from. Running the command twice makes no further difference.

Working out what a code meant when a change was recorded means ordering the dates that migrations record against each other, and every date a generated migration records carries a time zone. A date without one reached the file by hand, so the command reports the file and reads that date as UTC, which is what the generated dates hold. The date in the file is left exactly as it was written.

If the command cannot read a migration's `changed_data` — the file has a syntax error, has been altered so that it no longer runs on its own, or holds a change without the `model_name`, `history_date`, or `changes` the command reads — it skips that file, reports it and the change at fault, updates the migrations it can read, and finishes with a failure. A skipped file is left exactly as it was, imports and functions included, because a file the command cannot read is one it cannot update safely. Fix the file by hand, then run the command again.

The following are preserved exactly as written in each migration file:

- `history_change_reason` — the change reason text stored in the migration.
- `migration_app_label` — the app label used to ensure permissions exist before the migration runs.
- The `class Migration` block (dependencies and `operations` list), aside from updating any function names within it.

Only the imports and functions listed above are replaced, matched by name. Any other hand-added imports or helper functions elsewhere in the file are left exactly where they are, so custom code is never lost.

`changed_data` is the exception. When the command adds the app and model to any reference in it, it writes the whole list back in the form `makeworkflowmigrations` writes it. The list is laid out differently, strings change quotes, and time zones are written as `datetime.timezone.utc`, so a comment or deliberate formatting inside the list is not kept, even though every value it records is. A list with nothing to add is left exactly as it was. Write a note about a change outside the list, where it is preserved along with the rest of your code.

That said, any changes you make inside the listed functions themselves are overwritten the next time `updateworkflowmigrations` runs, since each one is replaced wholesale with the current implementation. If you need a workflow migration to do something beyond what `makeworkflowmigrations` generates, add your logic as an additional, self-contained function referenced from the `class Migration` `operations` list, rather than editing `forwards_migrate_workflow`, `backwards_migrate_workflow`, or the other recognized functions directly.

### Command Options

`--dry-run`

Shows which migration files would be updated without writing any changes to disk.

```console
python manage.py updateworkflowmigrations myapp --dry-run
```

### When to Run It

Workflow migrations are self-contained: they carry everything they need to run, so you do not have to update them after every VUEDA upgrade. Running `updateworkflowmigrations` is optional.

If a bug is found in the embedded functions, the VUEDA release notes will describe the issue and state that running `updateworkflowmigrations` is needed to apply the fix to your existing migrations. Outside of that, running the command on migrations that already carry the current implementations changes nothing about how they behave, as long as none of them is one the command must not rewrite.

Run it once for your own apps, and commit the rewritten files, for migrations generated before workflow references carried the app and model. Those migrations name each workflow by code alone, which is enough until a different model takes a workflow code over — after that, a change naming a workflow by code cannot say which workflow it meant. Migrations that have already been applied elsewhere can be updated safely: the change data describes the same workflow records either way, so a migration that has run produces the same result if it runs again.

### Migrations the Command Must Not Rewrite

The command replaces a migration's embedded functions with the current ones but keeps its dependencies as they were. The current functions use workflow models that `vueda_workflow` migration `0008_initialstateevent_objectstateevent_stateevent_and_more` adds. A migration whose `vueda_workflow` dependency is earlier than that one, which is any workflow migration generated with VUEDA v3.0.0a0 or earlier, stops applying once rewritten:

```text
LookupError: App 'vueda_workflow' doesn't have a 'ObjectStateEvent' model.
```

After running the command, check the `vueda_workflow` entry in each rewritten file's `dependencies`, and restore from version control any file that depends on an earlier migration. A restored migration keeps naming its workflow by code alone. [#298](https://github.com/arrai-innovations/vueda/issues/298) tracks making the rewrite safe for these migrations.

VUEDA's own workflow migrations, such as `vueda_vdq`'s, are among them, which is one more reason to always name your apps.

### Before Committing the Rewritten Files

The command writes `changed_data` and the embedded functions in its own layout, which does not follow any project's formatting or lint rules. A rewritten file fails a check such as `ruff format --check` or `ruff check` until your tools have run on it. Run your formatter and linter on the rewritten files, then apply your migrations to an empty database, for example by running your test suite, before committing them.

Run it as a development step and commit what it writes. It is not something to call from a migration or a deploy: the command rewrites migration source files, so running it on a deployed checkout edits files that are never committed, and the next deploy starts from the unchanged ones again. The migration being applied at the time is already loaded, so rewriting it has no effect on that run either.
