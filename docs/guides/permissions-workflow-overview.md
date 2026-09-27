---
title: Use the Permissions and Workflow Overview
type: how-to
audience: integrator
status: draft
---

# Use the Permissions and Workflow Overview

The {@term Permissions and Workflow Overview} is a read-only page. Use it to audit which groups hold each permission and workflow permission, and to check what one user holds. To add groups to permissions or remove them, use the {@term Group Management Page}, described in [Manage Groups and Generate Group Migrations](./manage-groups.md).

## Before You Begin

- The server runs with {@api ext:django:setting:DEBUG} on. The overview URL exists only in debug mode.
- The project includes the [`vueda.info` URLs]{@api py:module:vueda.info.urls}. The template app mounts them under `routes/`.
- Your account holds `auth.list_permission`, directly or through a group. The group management page requires the same permission.

## Open the Overview

1. Sign in to the server. In debug mode, `/routes/vueda.user/dev-login/` serves a Django login form.
2. Open `/routes/vueda.info/overview/`. On a local template app this is `http://localhost:8000/routes/vueda.info/overview/`.

An anonymous request redirects to the {@api ext:django:setting:LOGIN_URL} setting. A signed-in user without `auth.list_permission` gets `403`.

## Read Group Permissions

The page lists only [registered]{@term Canonical Registration} models. It has three levels:

- **Groups** at the top lists every group in name order.
- Each app has a section under its app label. Apps are in app label order.
- Each model has a subsection under its model name, with a **Permissions** list.

Permissions follow {@term CRUD} order: create (or `add`), read (or `view`), update (or `change`), delete, then list. Any other permissions follow, sorted by codename. Each permission row shows its codename, its description, and the groups that hold it as tags.

The page header, app headers, and model headers stay visible while you scroll. **Back To Top** returns to the top of the page.

## Read Workflow Access

A {@term Workflow-Enabled Model} with a {@term Workflow} definition also has a **Transitions** subsection. It needs `vueda.workflow` in {@api ext:django:setting:INSTALLED_APPS}. The subsection has these rows:

- **Workflow Access** shows the workflow name and the groups that hold its {@term Workflow Permission} codenames.
- **State Permissions** appears when the workflow has {@term State Permission} rules. Each tag names the state, the group, the codename, and whether the rule grants or denies.
- One row per {@term Transition} shows its name, its source states, and its target state, for example `Draft, Pending → Approved`. The tags are the groups that hold its {@term Transition Permission} codenames.

## Check One User

Pick a user from the list in the page header, which starts on **All users**. The page reloads with a check mark (✓) or a cross (✕) on each row:

- **Groups:** whether the user belongs to the group.
- **Permissions:** whether the user holds the permission without an object, the {@term Baseline Permission}. Group and direct grants count. An inactive user holds none.
- **Workflow Access:** whether one of the user's groups holds each workflow permission. The row shows no mark when the workflow has state permission rules, because those depend on the object's state. A workflow with no workflow permissions shows a cross.
- **Transitions:** whether one of the user's groups holds each transition permission. Direct user grants and state permission rules do not count here. A transition with no transition permissions shows a cross.

Selecting a user leaves the group tags unchanged. Pick **All users** to clear the selection. The list leaves out system users.

## Print a Report

Use the browser's print command. The printout is black on white and omits the page header, the user list, and **Back To Top**. It starts with the page title and the selected user's name, or "All Users" when you have not picked one.
