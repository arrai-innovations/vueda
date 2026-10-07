---
title: Manage Groups and Generate Group Migrations
type: how-to
audience: integrator
status: draft
---

# Manage Groups and Generate Group Migrations

Use the {@term Group Management Page} to add groups to permissions, rename groups, and remove permissions from groups. VUEDA records each change. Then run [`makegroupmigrations`]{@api py:class:vueda.user.management.commands.makegroupmigrations.Command} to write a {@term Group Permission Migration}, which applies the same changes in your other environments.

A group's permissions feed each member's {@term Baseline Permission}. To audit which groups hold each permission without editing anything, use the {@term Permissions and Workflow Overview}, described in [Use the Permissions and Workflow Overview](./permissions-workflow-overview.md).

## Before You Begin

- The server runs with {@api ext:django:setting:DEBUG} on. The group management page and the URLs that it saves through exist only in debug mode.
- `vueda.user` is in {@api ext:django:setting:INSTALLED_APPS}. [`get_defaults`]{@api py:function:vueda.core.default_settings.get_defaults} includes it.
- The project includes the [`vueda.user` URLs]{@api py:module:vueda.user.urls} under `routes/`, as the template app does. The page's script sends its save and remove requests to paths under `/routes/`.
- Your account holds these permissions, directly or through a group:
    - `auth.list_permission` to open the page.
    - `auth.create_group` and `auth.update_group` to add or rename a group.
    - `auth.delete_permission` to remove a permission from a group.

Grant these permissions outside the page, for example in `python manage.py shell`. You need `auth.list_permission` before you can open the page, and the page hides the other three permissions.

## Group Management UI

### Open the Page

1. Sign in to the server. In debug mode, `/routes/vueda.user/dev-login/` serves a Django login form. Add `?next=/routes/vueda.user/permissions/overview/` to that URL to land on the page after you sign in.
2. Open `/routes/vueda.user/permissions/overview/`. On a local template app this is `http://localhost:8000/routes/vueda.user/permissions/overview/`.

An anonymous request redirects to the {@api ext:django:setting:LOGIN_URL} setting. A signed-in user without `auth.list_permission` gets `403`.

The page groups permissions by app, then by model. Apps in `LOCAL_APPS` appear under **My App Permissions**, and the rest under **Other App Permissions**. Historical models stay hidden until you select **Toggle historical**. Each permission shows its codename, its name, and the groups that hold it.

The page hides some permissions. For `auth.Group`, `auth.Permission`, `contenttypes.ContentType`, and the VDQ queue models, it hides the create, update, and delete permissions and shows read and list. For models such as `sessions.Session` and `vueda_user.GroupChange`, it hides every permission. The [`vueda.user.globals`]{@api py:module:vueda.user.globals} module lists each hidden model.

### Add a Group to a Permission

1. Find the permission and select **Add**. A name field appears with **Save** and **X** buttons.
2. Type the group name, then select **Save** or press Enter.

When no group has that name, VUEDA creates the group, adds the permission, and records an `added` change. When the group exists, VUEDA adds the permission to it and records an `associated` change. When the group already holds the permission, the page shows an error and records nothing.

**Save** changes color while its name field has unsaved edits.

### Rename a Group

1. Find any permission that the group holds.
2. Edit the group name, then select **Save**.

VUEDA renames the group and keeps its permissions and members. The page shows the new name on every row for that group. VUEDA records a `changed` change with the old and new names, so the migration can run forward and backward.

### Remove a Permission from a Group

1. Find the permission.
2. Select **X** next to the group name.

The page removes the permission at once, with no confirmation step. VUEDA records an `unassociated` change. The group and its members stay, even when the group holds no permissions.

::: warning

The group management page has no action that deletes a group; [#423](https://github.com/arrai-innovations/vueda/issues/423) tracks one. Do not delete a group through the Django admin or a shell. VUEDA records no change for that deletion, so every other environment keeps the group.

:::

## Generating Group Migrations

1. Write the migration:

    ```console
    python manage.py makegroupmigrations
    ```

    The command writes the migration into the app of {@api ext:django:setting:AUTH_USER_MODEL}, with a name like `0005_group_permission_migrations_2026_04_21`. When there is nothing new to write, it prints `No group changes detected.`

2. Fake the migration in your own database, which already has the changes. The command prints a note that tells you to fake it.

    ```console
    python manage.py migrate myapp 0005_group_permission_migrations_2026_04_21 --fake
    ```

3. Ship the migration with your code. Other environments apply it with `python manage.py migrate`.

To preview the migration name without writing a file, add `--dry-run`. The command passes `--dry-run` to Django's `makemigrations`, and still prints the note to fake the migration.

```console
python manage.py makegroupmigrations --dry-run
```

### Which Changes a Migration Includes

VUEDA stores each recorded change as a [`GroupChange`]{@api py:class:vueda.user.models.GroupChange} row. `makegroupmigrations` skips the rows that an existing group migration in the same app already holds. It writes the rest in the order that VUEDA recorded them.

A change names its group by name and its permission by codename, app label, and model name. It holds no primary keys, because keys differ between databases.

When a group migration runs forward, it adds a `GroupChange` row for each of its changes that has none. A later `makegroupmigrations` run in that environment then skips those changes.

### Change Types

Each change has one of five types, listed in [`GroupChangeTypes`]{@api py:class:vueda.user.management.commands.makegroupmigrations.GroupChangeTypes}. Rolling back a migration applies its changes in reverse order, each with the backward effect below.

| Type           | Recorded when                                                | Forward                                                    | Backward                                                   |
| -------------- | ------------------------------------------------------------ | ---------------------------------------------------------- | ---------------------------------------------------------- |
| `added`        | You save a name that no group has                            | Creates the group if it is missing and adds the permission | Removes the permission and keeps the group                 |
| `associated`   | You save the name of an existing group                       | Adds the permission                                        | Removes the permission                                     |
| `changed`      | You rename a group                                           | Renames the group                                          | Renames the group back                                     |
| `unassociated` | You remove a permission from a group                         | Removes the permission and keeps the group                 | Adds the permission                                        |
| `deleted`      | Earlier releases, when you removed a group's last permission | Removes the permission and keeps the group                 | Creates the group if it is missing and adds the permission |

No change type deletes a group, in either direction.

Each group migration carries its own copy of the code that applies these changes. A group migration generated by an earlier VUEDA release still deletes a group when it replays a `deleted` change or rolls back an `added` change. Review those migrations before you run them in another environment. The `updategroupmigrations` command, described in [Updating Existing Group Migrations](#updating-existing-group-migrations), replaces their copy with the current code.

### What the Migration File Contains

A group migration is a standard Django migration. `makegroupmigrations` adds:

- `changed_data`, the list of changes that the migration applies.
- Copies of [`migrate_step`]{@api py:function:vueda.user.management.commands.makegroupmigrations.migrate_step}, [`forwards_migrate_groups`]{@api py:function:vueda.user.management.commands.makegroupmigrations.forwards_migrate_groups}, [`backwards_migrate_groups`]{@api py:function:vueda.user.management.commands.makegroupmigrations.backwards_migrate_groups}, [`make_sure_permissions_exist`]{@api py:function:vueda.user.management.commands.makegroupmigrations.make_sure_permissions_exist}, `GroupChangeTypes`, and their helpers. The migration runs `make_sure_permissions_exist` first, so every permission it names exists.
- A comment near the top that marks the file as a group migration. VUEDA's group migration commands find group migrations by this comment, so keep it.

### Fill In Missing Change Records

[`sync_group_changes`]{@api py:class:vueda.user.management.commands.sync_group_changes.Command} reads `changed_data` from the group migrations in your project's apps. It creates a `GroupChange` row for each change that has none, and prints how many it created. The `vueda_user` migration `0005_sync_group_changes` runs it once. You can run it again at any time:

```console
python manage.py sync_group_changes
```

## Updating Existing Group Migrations

A group migration runs without updates, because it carries its own copy of the code. Run [`updategroupmigrations`]{@api py:class:vueda.user.management.commands.updategroupmigrations.Command} when a VUEDA release changes that code and you want existing group migrations to use the new version.

```console
python manage.py updategroupmigrations
```

Add `--dry-run` to list the files that the command would update without writing them.

```console
python manage.py updategroupmigrations --dry-run
```

The command finds group migrations in every installed app by their marker comment. In each file it:

- Replaces each copied function, and `GroupChangeTypes`, with the current version, matched by name. It adds any that the file lacks.
- Updates the import lines that it recognizes, and leaves other imports in place.
- Keeps `changed_data` and the `Migration` class. In the class's `operations` list, it renames references to functions that earlier releases named differently.

Code outside the copied functions stays as it is. The command overwrites edits inside a copied function the next time it runs. To add behavior to a group migration, write a separate function and add it to the `operations` list.

An environment that already applied a migration does not run it again. An update affects only rollbacks and environments that have not applied the migration. Running the command when nothing has changed rewrites the same code.
