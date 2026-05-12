---
title: Manage Groups and Generate Group Migrations
type: how-to
audience: implementor
status: draft
---

# Manage Groups and Generate Group Migrations

This guide explains how to create, rename, and remove groups through VUEDA's permission overview UI, and how to generate database migrations that replicate those changes on other environments using the `makegroupmigrations` management command.

## Goal and Preconditions

By the end of this guide you will have:

- Group and permission associations configured in the database through the UI.
- A group migration that captures those changes and can be applied on other environments without manually repeating the UI steps.

Before you begin:

The `vueda.user` app must be in `INSTALLED_APPS`. The group management URLs become available when the project is running in debug mode (`DEBUG = True` in settings); they are not exposed in production. You will need a superuser account to access the management UI, because authentication is required.

## Group Management UI

### Navigating to the Permission Overview

Open the permission overview page at `/routes/vueda.user/permissions/overview/`. On a local development server this is typically `http://localhost:8000/routes/vueda.user/permissions/overview/`. This page lists every permission in the project, grouped by app.

If you are not authenticated, you will be redirected to the login form. Log in before proceeding.

### Adding a Group to a Permission

To create a new group and associate it with a permission:

1. Find the permission on the overview page.
2. Click the `Add` button next to the permission name, which will then display an input field with save and delete buttons.
3. Type the new group name and click save.

The group is created and associated with the permission. A record is created to store the change, for use when the management command is run.

The save button will change colour when a change hasn't been saved.

### Renaming a Group

To rename an existing group:

1. Find any permission associated with the group you want to rename.
2. Modify the group name and save.

The group is renamed and all permission associations are retained. All groups with the same name are updated in the UI. A record is created, storing both the old and new name, so the migration can be run forwards and backwards.

### Removing a Permission from a Group

To remove a permission from a group:

1. Find the permission on the overview page.
2. Click the delete button (X) next to the group name on that permission row.

The permission is removed from the group. A record is created to store the change. If the group has no other permissions after the removal, group will be deleted.

The delete button removes the permission immediately without a confirmation step.

::: warning

Do not manually delete a group, let the generated migration handle the deletion, so it can be reversed if needed.

:::

## Generating Group Migrations

After making changes through the UI, run `makegroupmigrations` to produce a migration that applies the same changes on any other environment.

```console
python manage.py makegroupmigrations
```

The migration is created in the same app that contains the project's `AUTH_USER_MODEL`.

### How Change Detection Works

`makegroupmigrations` reads the change records that are stored in the database. It compares those records against the changes already captured in previously created group migrations, to determine which changes have not yet been added to a migration. Only the new, unrecorded changes are included in the migration that gets generated.

Primary keys are not stored in the change data. Because primary keys can differ between databases, all relationships are stored using natural identifiers (group names, permission codenames, app labels, and model names) instead of raw integer ids.

### Change Types

Group changes are broken into five types:

| Type           | When it occurs                                                        | What the migration does                                           |
| -------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `added`        | First permission for a group                                          | Creates the group and associates the permission with it           |
| `associated`   | An additional permission for an existing group                        | Associates the permission with the group                          |
| `changed`      | The group name is changed                                             | Renames the group, retaining all existing permission associations |
| `unassociated` | A permission is removed from a group that still has other permissions | Removes the permission from the group                             |
| `deleted`      | The last permission is removed from a group                           | Removes the permission, then deletes the group                    |

Changes are applied in the same order they were recorded. When migrating backwards, the migration processes changes in reverse order and inverts each type: `added` becomes `deleted`, `associated` becomes `unassociated`, and so on.

### What the Generated Migration Contains

The migration is a standard Django migration file. Django generates an empty shell with placeholder values that are used to locate specific lines in the file. `makegroupmigrations` then rewrites the file to add:

- A `changed_data` variable containing the list of recorded changes.
- A `GroupChangeTypes` enum with the five change types.
- A `migrate_step` function that applies a single change by inspecting the change type and performing the appropriate create, associate, rename, unassociate, or delete operation.
- A `forwards_migrate_groups` function that iterates through `changed_data` in order, calling `migrate_step` for each entry.
- A `backwards_migrate_groups` function that iterates through `changed_data` in reverse, inverting each change type before passing it to `migrate_step`.
- A `make_sure_permissions_exist` function which calls Django's `create_permissions`, to ensures all permissions are present before the migration runs.
- A comment that identifies the file as a VUEDA-generated group migration, used by the command to find and parse previously created migrations. Do not remove this comment.

For example, the `forwards_migrate_groups` function for a migration that adds a `Managers` group with the `read_invoice` permission would:

1. Call `make_sure_permissions_exist` to ensure `read_invoice` exists.
2. Look up the `read_invoice` permission using the stored app label and model name.
3. Create the `Managers` group.
4. Associate `read_invoice` with `Managers`.

When migrating backwards, `backwards_migrate_groups` reverses those steps: it removes `read_invoice` from `Managers` and deletes `Managers`.

### Command Options

`--dry-run`

Prints the output that occurs when the empty migration is created and modified. Mostly useful to see what the new migrations name will be. Dry run is passed to all management commands called by `makegroupmigrations`.

```console
python manage.py makegroupmigrations --dry-run
```

### Faking the Migration on Your Local Machine

If you made the group changes yourself and are the person running `makegroupmigrations`, your local database already contains the changes. A note is printed telling you to fake the migration, so that Django marks it as applied:

```console
python manage.py migrate myapp 0005_group_permission_migrations_2026_04_21 --fake
```

Other environments that do not already have the changes should run the migration normally.

### Syncing Group Changes from Existing Migrations

If you are setting up a new environment, a migration exists that will run the management command `sync_group_changes`, to populate change records in the `GroupChange` table, extracted from existing migration files.

If you think you have missing records locally, you can manually run `sync_group_changes` to see the number of records it creates:

```console
python manage.py sync_group_changes
```

This command scans all project migrations for those created by `makegroupmigrations`, reads the `changed_data` from each, and creates any missing `GroupChange` records. This ensures `makegroupmigrations` can correctly identify which changes have already been captured when you run it next.
