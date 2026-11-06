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
- Copies of [`forwards_migrate_workflow`]{@api py:function:vueda.workflow.management.commands.makeworkflowmigrations.forwards_migrate_workflow}, [`backwards_migrate_workflow`]{@api py:function:vueda.workflow.management.commands.makeworkflowmigrations.backwards_migrate_workflow}, and the functions they call. [How Object States Are Updated](#how-object-states-are-updated) describes the forward behavior. [Reversing a Workflow Migration](#reversing-a-workflow-migration) describes the backwards behavior.
- A comment marker that `makeworkflowmigrations` and `updateworkflowmigrations` use to find workflow migrations.

### How Object States Are Updated

After applying its recorded changes, a workflow migration checks the objects of every workflow. An object without an object state gets its workflow's initial state. An existing object state moves to the current initial state only when its event history contains an `insert` event and no other event. A state with any later event stays where it is.

An object state with no events also stays where it is, even when the initial state changes, because its history cannot show whether it moved. An object state carried over from v2 has events when `vueda_workflow` migration `0009` copied its v2 history. A database upgraded with server 3.0.0b1 or earlier has no copied history, so its v2 object states have no events.

`makeworkflowmigrations` performs the same checks on the local database, even when it detects no workflow changes. Its `--dry-run` leaves object states unchanged.

Older v3-generated migration files can still reset states with no events because they contain copies of the functions. After upgrading VUEDA, run `python manage.py updateworkflowmigrations myapp` for the apps that own those files, review the changes, and commit them before applying the migrations to an upgraded database. [Updating Existing Workflow Migrations](#updating-existing-workflow-migrations) describes the dependency checks and files that the command skips. Migrations generated with `--import-instead` use VUEDA's current functions when they run and receive the fix through the package upgrade.

This fix prevents future resets. It does not restore states that an older migration or command already reset.

### How `changed_data` Is Formatted

`makeworkflowmigrations` and `updateworkflowmigrations` format `changed_data` with the Python formatter that your project uses, [black](https://black.readthedocs.io/) or [ruff](https://docs.astral.sh/ruff/), when one is installed. Projects usually install these as development dependencies. `makegroupmigrations` formats its `changed_data` the same way, as [How `changed_data` Is Formatted](manage-groups.md#how-changed-data-is-formatted) in the group guide describes.

The commands use the first formatter in this list that applies:

1. black, when the `pyproject.toml` at your project root has a `[tool.black]` section, even an empty one. A project can install ruff only to lint, so black configuration comes first. A black configuration in your home directory, such as `~/.config/black`, does not count. One developer's file therefore cannot choose the formatter for the whole project.
2. ruff, when it is installed.
3. black with its default settings, when it is installed but not configured.
4. Python's `pprint` with a narrow width, when neither is installed. Its output uses single quotes and ignores your settings.

If the chosen formatter fails, the commands do not switch to another formatter that would ignore your settings. A formatter fails, for example, when your `pyproject.toml` cannot be read or a setting has the wrong type. The commands print the formatter's error and write `changed_data` with `pprint`. They then ask you to fix the problem and format that migration yourself. `updateworkflowmigrations --dry-run` still runs the formatter and reports the same error. It writes nothing, and it says that a run without `--dry-run` would fall back to `pprint`.

With black or ruff, the output has these properties:

- Your project's settings apply. black reads `[tool.black]` from the `pyproject.toml` at your project root. ruff reads the configuration that covers the migration file, such as your `pyproject.toml` or `ruff.toml`, even when that configuration excludes migrations. The list follows your line length and quote style.
- Every change and every key gets its own line. Each dictionary and list ends in a trailing comma, which keeps the formatter from joining the items onto one line. The commands turn the magic trailing comma on even when your configuration turns it off. The `(old, new)` pair of a changed field stays on one line.
- Keys are sorted, as earlier versions of the commands wrote them.

The commands format only `changed_data` this way. They write the rest of the migration, including the embedded functions, in their own layout.

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

### Reversing a Workflow Migration

Reversing a workflow migration changes object states only for the workflows that its `changed_data` names:

- An object in a state that the reversal removes moves back to the most recent state in its history that the workflow still has. An object with no such state gets the workflow's initial state as it stands after the reversal. In both cases the object keeps its object state row, so its history continues. When the workflow has no initial state after the reversal, the object loses its object state.
- A workflow that the reversal removes loses its object states, because it has no state left to give them.
- A workflow that the reversal creates again gives its objects its initial state.
- Every other object state stays as it is.

`migrate` prints one line for each outcome in each workflow whose object states the reversal changed, with a count.

A reversal moves only object states. Anything else that a transition changed, such as a field that it set or a message that it sent, stays as it is.

When reversed, workflow migrations generated before VUEDA added this behavior delete the object states of every workflow in the project. Run `updateworkflowmigrations` to give them the current reverse code, as [Updating Existing Workflow Migrations](#updating-existing-workflow-migrations) describes.

Older reverse code can also fail with `ValueError: Cannot query "Workflow object (2)": Must be "Workflow" instance.` This happens when a later migration that changes model options or triggers stays applied, such as one that adds pghistory triggers. Django hands the reverse code models whose relations point at outdated classes ([Django ticket #33586](https://code.djangoproject.com/ticket/33586)). The current reverse code rebuilds those models first, so running `updateworkflowmigrations` fixes this failure too.

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

[`updateworkflowmigrations`]{@api py:class:vueda.workflow.management.commands.updateworkflowmigrations.Command} replaces the functions embedded in your workflow migrations with the current versions from `makeworkflowmigrations`. With no app label, it updates every app in your project's source tree:

```console
python manage.py updateworkflowmigrations
```

Name apps to update only those apps:

```console
python manage.py updateworkflowmigrations myapp otherapp
```

`--dry-run` lists the migration files that the command would update, without writing them. It runs the same checks as an update, reports each file that it would skip, and exits with status 1 if any file fails.

### Which Apps a Run Covers

The command never updates an app installed as a package. An app counts as installed when its migrations folder is inside a directory that Python installs packages into (`site-packages`). These directories include the following:

- The environment's own package directories.
- The base interpreter's package directories, which a virtual environment created with `--system-site-packages` also uses.
- The user directory that `pip install --user` installs into.

VUEDA's own `vueda_vdq` app is one such app. Your project cannot commit a change to those files, and the next reinstall or upgrade of the package puts the original files back.

An app installed in editable mode, such as a uv workspace member, keeps its files in its source tree. The command counts it as part of your project and updates it.

The command still reads migrations from installed packages and from apps that you did not name. It does not rewrite them. It reads them for two reasons:

- Workflow history. A package's migration can be the only record of which app and model a workflow code belonged to, and your project's migrations can refer to that workflow by code. [What the Command Changes](#what-the-command-changes) describes how the command uses that record.
- Dependency checks. Checking a migration's dependencies loads Django's whole migration graph, which imports every installed app's migrations. If one of those migrations raises an error on import, the command reports it and leaves your migration unchanged.

Naming an installed app is an error. The command names the app, reports that it will not update installed packages, and exits with status 2 before it reads any migration. It does the same for an app label that does not exist. A run that finds nothing in your project to update reports that and stops, without reading any package migration.

### When to Run It

Workflow migrations carry everything they need to run, so you do not need to update them after each VUEDA upgrade. Run the command in these cases:

- The VUEDA release notes say that a fix to the embedded functions needs it.
- You have v3-generated migrations whose embedded functions reset object states with no events. Update them before applying them to a database upgraded from v2, as [How Object States Are Updated](#how-object-states-are-updated) describes.
- You are squashing migrations.
- A migration names a workflow by code alone: a workflow reference in its `changed_data` has `code` but no `historical_app_label`. That reference becomes ambiguous once another model takes over the workflow code. The command adds the app label and model that each code meant when the change was recorded. Run it once for your own apps and commit the result.

You can update migrations that other environments have already applied. The change data names the same workflow records either way, so a rewritten migration that runs again produces the same result. The command skips a migration that it cannot rewrite safely, as [Migrations the Command Must Not Rewrite](#migrations-the-command-must-not-rewrite) describes.

### What the Command Changes

For each workflow migration in the named apps that passes the dependency check, the command:

- Replaces the import block and the embedded functions, matched by name, with the current versions.
- Updates stale function names in the `operations` list.
- Adds the app label and model to each workflow that `changed_data` names by code alone.

It keeps `history_change_reason`, `migration_app_label`, and the rest of the `class Migration` block as written. It also keeps any imports and helper functions that you added under other names.

To add the app and model to a reference, the command works out which workflow the code meant when the change was recorded. It reads the workflow's own changes from every app's generated migrations, including installed packages and apps that you did not name. It leaves a reference unchanged in two cases:

- No migration that the command reads records the workflow's own change.
- The reference was recorded before every workflow that has held its code, and more than one workflow has held that code. The command cannot tell which of them the reference means.

When it adds to `changed_data`, it writes the whole list back, as [How `changed_data` Is Formatted](#how-changed-data-is-formatted) describes. Comments and formatting inside the list are lost. The values stay the same. Put notes about a change outside the list. A list with nothing to add stays exactly as it was.

The next run overwrites any edit inside the embedded functions. To add behavior, write your own function and reference it from the `operations` list.

If the command cannot read a file's `changed_data`, it reports the file and skips it, updates the others, and exits with status 1. Fix the file by hand and run the command again. A file that stops Django from loading the migration graph also fails the dependency check of every other file.

When the command cannot read the `changed_data` of a migration that it does not rewrite, such as one in an installed package, it reports a warning. It leaves out the workflows that the migration records, and it does not count the migration as a failure. The command then resolves references from the history that remains, so fix the reported fault where you can before you rely on the result.

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

VUEDA's own `vueda_vdq` workflow migrations already name each workflow by app and model. The command never rewrites them in an installed package, and they would fail the dependency check in any case. Their dependencies come before `0008`, and `vueda_vdq` migration `0005` must run before `vueda_workflow` migration `0006`, so it cannot depend on `0008`. Their reverse code differs from the code that the current command generates. Reversing `0002` or `0005` deletes the object states of the workflows that the migration added, and it leaves every other object state as it is.

### Before Committing the Rewritten Files

1. Run your formatter and linter on the rewritten files. The command writes the embedded functions in its own layout, and `changed_data` follows your settings only when black or ruff is installed. A rewritten file can fail checks such as `ruff format --check` or `ruff check` until then.
2. Apply your migrations to an empty database, for example by running your test suite.
3. Commit the rewritten files.

Run the command only as a development step. On a deployed checkout, it edits files that are never committed, and the next deploy starts from the unchanged files. A migration being applied at the time is already loaded, so rewriting it does not change that run.
