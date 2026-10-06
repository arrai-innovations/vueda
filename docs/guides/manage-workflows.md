---
title: Manage Workflows and Generate Workflow Migrations
type: how-to
audience: integrator
status: draft
---

# Manage Workflows and Generate Workflow Migrations

Build a {@term Workflow} in the workflow management pages, then run [`makeworkflowmigrations`]{@api py:class:vueda.workflow.management.commands.makeworkflowmigrations.Command} to write a {@term Workflow Migration}. The migration applies the same changes in your other environments, so you do not repeat the steps there.

[Add Workflow State and Transition Permissions](workflow-state-permissions.md) describes which permission rows to create. [Workflow as a Permission Overlay](../core-concepts/workflow-permission-overlay.md) describes how VUEDA evaluates them. To audit who holds each workflow permission without editing anything, use the {@term Permissions and Workflow Overview}, described in [Use the Permissions and Workflow Overview](permissions-workflow-overview.md#read-workflow-access).

## Before You Begin

- The server runs with {@api ext:django:setting:DEBUG} on. The workflow management URLs exist only in debug mode.
- `vueda.workflow` is in {@api ext:django:setting:INSTALLED_APPS}.
- The project includes the [`vueda.workflow` URLs]{@api py:module:vueda.workflow.urls} under `routes/`. The template app does not include them; [Wire Up Workflow URLs](../tutorials/add-workflow.md#wire-up-workflow-urls) adds them.
- Your account holds the permissions in the table below through its groups. Add groups to these permissions on the {@term Group Management Page}, described in [Manage Groups and Generate Group Migrations](manage-groups.md).

Each page requires one permission. The `<pk>` in a URL is the primary key of the workflow, state, or transition.

| Page                                                                                  | URL                                            | Permission                         |
| ------------------------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------- |
| [Workflow overview]{@api py:class:vueda.workflow.views.WorkflowOverviewView}          | `/routes/vueda.workflow/overview/`             | `vueda_workflow.read_workflow`     |
| [Add workflow form]{@api py:class:vueda.workflow.views.WorkflowAddView}               | `/routes/vueda.workflow/add/`                  | `vueda_workflow.create_workflow`   |
| [Workflow edit form]{@api py:class:vueda.workflow.views.WorkflowEditView}             | `/routes/vueda.workflow/edit/<pk>/`            | `vueda_workflow.update_workflow`   |
| [State edit form]{@api py:class:vueda.workflow.views.WorkflowStateEditView}           | `/routes/vueda.workflow/edit/state/<pk>/`      | `vueda_workflow.update_state`      |
| [Transition edit form]{@api py:class:vueda.workflow.views.WorkflowTransitionEditView} | `/routes/vueda.workflow/edit/transition/<pk>/` | `vueda_workflow.update_transition` |
| [Workflow delete]{@api py:class:vueda.workflow.views.WorkflowDeleteView}              | `/routes/vueda.workflow/delete/<pk>/` (POST)   | `vueda_workflow.delete_workflow`   |

An anonymous request redirects to the {@api ext:django:setting:LOGIN_URL} setting. A signed-in user without the page's permission gets `403`.

## Workflow Management UI

### Open the Workflow Overview

1. Sign in to the server. In debug mode, `/routes/vueda.user/dev-login/` serves a Django login form. Add `?next=/routes/vueda.workflow/overview/` to that URL to land on the overview after you sign in.
2. Open `/routes/vueda.workflow/overview/`. On a local template app this is `http://localhost:8000/routes/vueda.workflow/overview/`.

The overview lists every workflow by app. Each workflow shows its workflow permissions, its states with their state permissions, and its transitions with their sources, target, and transition permissions. Each state has an **Edit State** button, and each transition has an **Edit Transition** button.

The overview also warns about two mismatches: a model that enables workflow but has no workflow, and a workflow whose model does not enable workflow.

### Add a Workflow

1. On the overview, select **Add Workflow**, or open `/routes/vueda.workflow/add/`.
2. Fill in the workflow details and select **Save**. The page redirects to the workflow edit form at `/routes/vueda.workflow/edit/<pk>/`.
3. Under **States**, add each state and select **Save**. The form saves valid states even when another section has errors, so the new states appear in the initial state and transition target lists.
4. Under **Initial States**, choose the initial state. Under **Transitions**, add each transition with its target state. Under **Workflow Permissions**, add the permissions that gate the workflow. Select **Save**.
5. Return to the overview. For each state that needs {@term State Permission} rows, select **Edit State**, add the rows under **State Permissions**, and save.
6. For each transition, select **Edit Transition**. Add its source states under **Transition Sources** and its {@term Transition Permission} rows under **Transition Permissions**, then save.

To edit an existing workflow, select **Edit Workflow** on the overview. Each row under a section heading on the edit forms has a **Delete** checkbox. Check it and save to remove the row.

### Delete a Workflow

The overview shows **Delete Workflow** only when the workflow has no states, transitions, initial state, workflow permissions, or {@term Object State} rows. A state that any object is in cannot be deleted, so these steps apply to a workflow whose model has no object states.

1. In the model's `class Vueda.Workflow`, set `enabled = False`. While the model enables workflow, saving an object and every workflow request raise [`WorkflowNotConfiguredError`]{@api py:class:vueda.workflow.exceptions.WorkflowNotConfiguredError} once the workflow is gone.
2. For each state with state permissions, select **Edit State**, check **Delete** on every state permission row, and save.
3. For each transition with transition permissions or transition sources, select **Edit Transition**, check **Delete** on each of those rows, and save.
4. Select **Edit Workflow**. Check **Delete** on the workflow permissions, the transitions, and every state except the initial state. Save.
5. Check **Delete** on the initial state row and on the remaining state. Save.
6. Return to the overview and select **Delete Workflow**.

::: warning
Django `Permission` rows have no change history. `Group` rows have history only for changes made on the {@term Group Management Page}. Rolling back a workflow migration cannot restore a permission or group deleted outside that page. Keep the permissions and groups that a workflow uses until every environment has removed the workflow.
:::

## Generating Workflow Migrations

After you change workflows locally, run `makeworkflowmigrations`. It writes one migration for each app with workflow changes that no workflow migration records yet.

```console
python manage.py makeworkflowmigrations myapp
```

Name one or more apps to limit the run to them. With no app label, the command checks every app.

### What the Migration Records

The command reads the history that VUEDA records for the workflow models. It skips writes that a workflow migration made. It also skips edits that match a change in an existing workflow migration. The rest go into the new migration in the order they happened, each marked `added`, `changed`, or `deleted`.

The migration identifies each record by code, app label, and model, since primary keys differ between databases. A workflow is named by its code together with the app label and model that it belongs to. When the migration runs, its embedded functions find each record by those names. When the migration runs backwards, it applies the changes in reverse order, with `added` and `deleted` swapped.

The generated file is a standard Django migration with these additions:

- `changed_data`, the list of recorded changes.
- `history_change_reason`, which marks the history that the migration writes.
- `migration_app_label`, the app whose permissions the migration creates before it applies the changes.
- Copies of [`forwards_migrate_workflow`]{@api py:function:vueda.workflow.management.commands.makeworkflowmigrations.forwards_migrate_workflow}, [`backwards_migrate_workflow`]{@api py:function:vueda.workflow.management.commands.makeworkflowmigrations.backwards_migrate_workflow}, and the functions they call. After applying the changes, they give each object without an object state the workflow's initial state. When the initial state changes, they move object states that nothing has moved since creation.
- A comment marker that `makeworkflowmigrations` and `updateworkflowmigrations` use to find workflow migrations.

### Command Options

- `--dry-run` runs the same detection and prints the name of each migration it would create, without writing files.
- `--debug <app_name>.<model>.<workflow_model>`, or `--debug all`, prints the existing migration changes that matched history, those that did not, and the history that the new migration adds. `<app_name>` is the app's `AppConfig.name`, and `<workflow_model>` is a workflow model name such as `state`. The list of changes that did not match includes that workflow model's changes for every model in the app.

### Fake the Migration Locally

Your local database already has the changes, so mark the migration as applied without running it:

```console
python manage.py migrate myapp 0005_workflow_migrations_2026_09_28 --fake
```

Other environments run the migration normally.

`makeworkflowmigrations` treats a faked migration differently from a migration that ran. A faked migration wrote nothing, so the command matches its changes against your hand edits. A migration that ran also recorded its own writes. The command matches its changes only against edits made before it first ran in that environment. So you can roll a faked migration back and apply it again, and an edit made after a migration ran is never mistaken for one of its changes.

### Coordinate Changes Between Developers

When two developers change workflows on the same branch, the first developer's migration can miss the second developer's changes. Work in sequence:

1. The first developer finishes their changes, runs `makeworkflowmigrations`, and pushes the migration.
2. The second developer pulls and runs the migration before making further workflow changes.
3. The second developer runs `makeworkflowmigrations` to capture only their own changes.

Workflow migrations created on parallel branches can conflict when merged.

### Group Changes and Workflow Migrations

A migration names the group of each state permission by the group's name. Two group changes affect the next migration:

- After you rename a group, the migration records the group's current name for state permission rows written under its former name.
- After a group is deleted and created again under the same name, the migration repeats every earlier permission change for that group, including changes that existing migrations already record.

Review the generated `changed_data` after either change.

## Enabling Workflow on a Model with Existing Rows

A model that enables `class Vueda.Workflow` needs its workflow before the release that enables it serves traffic. Without one, saving an object and every workflow request fail with `WorkflowNotConfiguredError`. The migration that sets the initial state assigns it to the objects present when it runs, so the order is:

1. In development, enable workflow on the model, create its workflow in the management pages, and run `makeworkflowmigrations`.
2. Deploy with migrations applied before the new release serves traffic. `migrate` runs VUEDA's [database checks]{@api py:module:vueda.workflow.checks}. `vueda_workflow.W001` warns about an enabled model without a workflow, and `vueda_workflow.W003` warns about a workflow without an initial state.
3. After the new release serves traffic, run [`backfillworkflowstates`]{@api py:class:vueda.workflow.management.commands.backfillworkflowstates.Command}:

    ```console
    python manage.py backfillworkflowstates <app_label>.<ModelName>
    ```

The previous release does not know that the model has workflow. Objects that it creates between the migration and cutover have no object state. They show a null state, drop out of `workflow_state` filters and state grants, and fail on transitions. The backfill gives each of them the initial state, which the new release would have given them. It only creates missing object states, so running it again changes nothing.

`python manage.py check --database default` reports `vueda_workflow.W002` while any object of an enabled model has no object state. The warning names the model and the command that fixes it.

## Updating Existing Workflow Migrations

[`updateworkflowmigrations`]{@api py:class:vueda.workflow.management.commands.updateworkflowmigrations.Command} replaces the functions embedded in your workflow migrations with the current versions from `makeworkflowmigrations`. Name each of your own apps:

```console
python manage.py updateworkflowmigrations myapp otherapp
```

::: warning
Always name the apps to update. With no app label, the command scans every installed app, including VUEDA's own workflow migrations inside the installed package, such as `vueda_vdq`'s. It cannot rewrite the `vueda_vdq` migrations, so it reports them as failures and exits with status 1. It would also rewrite any compatible workflow migration inside an installed package, which is a file that you cannot commit. See [Migrations the Command Must Not Rewrite](#migrations-the-command-must-not-rewrite).
:::

`--dry-run` lists the migration files that the command would update, without writing them. It runs the same checks as an update, reports each file that it would skip, and exits with status 1 if any file fails.

### When to Run It

Workflow migrations carry everything they need to run, so you do not need to update them after each VUEDA upgrade. Run the command in these cases:

- The VUEDA release notes say that a fix to the embedded functions needs it.
- You are squashing migrations.
- A migration names a workflow by code alone: a workflow reference in its `changed_data` has `code` but no `historical_app_label`. That reference becomes ambiguous once another model takes over the workflow code. The command adds the app label and model that each code meant when the change was recorded. Run it once for your own apps and commit the result.

You can update migrations that other environments have already applied. The change data names the same workflow records either way, so a rewritten migration that runs again produces the same result. The command skips a migration that it cannot rewrite safely, as [Migrations the Command Must Not Rewrite](#migrations-the-command-must-not-rewrite) describes.

### What the Command Changes

For each workflow migration in the named apps that passes the dependency check, the command:

- Replaces the import block and the embedded functions, matched by name, with the current versions.
- Updates stale function names in the `operations` list.
- Adds the app label and model to each workflow that `changed_data` names by code alone.

It keeps `history_change_reason`, `migration_app_label`, and the rest of the `class Migration` block as written. It also keeps any imports and helper functions that you added under other names.

When it adds to `changed_data`, it writes the whole list back in its own layout, so comments and formatting inside the list are lost. The values stay the same. Put notes about a change outside the list.

The next run overwrites any edit inside the embedded functions. To add behavior, write your own function and reference it from the `operations` list.

If the command cannot read a file's `changed_data`, it reports the file and skips it, updates the others, and exits with status 1. Fix the file by hand and run the command again. A file that stops Django from loading the migration graph also fails the dependency check of every other file.

### Migrations the Command Must Not Rewrite

The current functions need the event models and triggers that `vueda_workflow` migration `0008_initialstateevent_objectstateevent_stateevent_and_more` adds. Before it rewrites a migration, the command checks that `0008` comes before that migration in the migration graph. The check follows indirect dependencies, and it accepts a squashed migration that replaces `0008`. It reads the migration files, not the database's migration records, because the rewritten file must also apply to an empty database.

When the check fails, the command names the file and the required migration, and it leaves the whole file unchanged. It counts the file as a failure, continues with the other files, and exits with status 1.

Any workflow migration generated with VUEDA v3.0.0a0 or earlier fails this check. A migration that `makeworkflowmigrations --import-instead` generated gets the same check. It imports its functions from VUEDA when it runs, so it uses the current functions whether or not the command skips it.

For each skipped migration:

1. Keep its functions as they are.
2. Before you change its dependencies, review its schema and its order in the graph. A later dependency can create a cycle, or require a schema that the recorded changes do not match.
3. If a workflow reference in its `changed_data` has `code` but no `historical_app_label`, add `historical_app_label` and `historical_model` by hand from the workflow's recorded identity.
4. Apply your migrations to an empty database.

If an earlier VUEDA version of the command already rewrote such a migration, restore the file from version control first. The dependency check does not repair an earlier rewrite.

VUEDA's own `vueda_vdq` workflow migrations already name each workflow by app and model, and they keep their original functions and dependencies. Their dependencies come before `0008`, so the command cannot rewrite them. `vueda_vdq` migration `0005` must also run before `vueda_workflow` migration `0006`, so it cannot depend on `0008`.

### Before Committing the Rewritten Files

1. Run your formatter and linter on the rewritten files. The command's layout fails checks such as `ruff format --check` or `ruff check` until then.
2. Apply your migrations to an empty database, for example by running your test suite.
3. Commit the rewritten files.

Run the command only as a development step. On a deployed checkout, it edits files that are never committed, and the next deploy starts from the unchanged files. A migration being applied at the time is already loaded, so rewriting it does not change that run.
