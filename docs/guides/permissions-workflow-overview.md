---
title: Use the Permissions and Workflow Overview
type: how-to
audience: integrator
status: draft
---

# Use the Permissions and Workflow Overview

This guide explains how to use the read-only permissions and workflow overview page to audit which groups have which permissions and workflow transition access, and how to inspect what a specific user can do.

## Goal and Preconditions

By the end of this guide you will be able to:

- Read the overview page to see every registered model's permissions and their group associations.
- Filter the view by a specific user to confirm what that user can access.
- Print the overview as a black-on-white report.

Before you begin:

The `vueda.user` app must be in `INSTALLED_APPS`. The overview URL becomes available when the project is running in debug mode (`DEBUG = True` in settings); it is not exposed in production. You will need a superuser account to access the page, because the `auth.list_permission` permission is required.

## Navigating to the Overview

Open the overview at `/vueda.info/overview/`. On a local development server this is typically `http://localhost:8000/vueda.info/overview/`.

If you are not authenticated, you will be redirected to the login form. Log in before proceeding.

## Reading the Overview

### Groups Section

The top of the page shows a **Groups** section listing every group in the project, in alphabetical order. When no user is selected this section shows only group names. When a user is selected (see [Filtering by User](#filtering-by-user) below), each group row also shows a checkmark (✓) or an X (✗) indicating whether that user belongs to the group.

### Permissions Sections

Below the groups section, permissions are organized by app and model. Each app is a collapsible region with a sticky header showing the app label. Within each app, models are listed in their own subsections with a sticky model header. Permissions within each model are sorted in CRUDL order: create, read, update, delete, list, and then any remaining permissions alphabetically.

Each permission row shows:

- The permission codename (for example, `read_invoice`).
- A human-readable description below the codename.
- The groups that grant this permission, shown as tags on the right.
- A checkmark or X on the right when a user is selected, indicating whether that user currently has this permission.

### Transitions Section

If `vueda.workflow` is in `INSTALLED_APPS`, models that have a workflow show a **Transitions** subsection alongside their permissions. Each transition row shows:

- The transition name.
- The source states and target state (for example, `Draft, Pending → Approved`).
- The groups whose members can trigger the transition, shown as tags on the right.

When a user is selected, the transitions section only shows groups that the selected user belongs to. A dash (—) appears when no matching groups exist for a transition.

## Filtering by User

The header contains a **user** dropdown. Selecting a user from the list immediately reloads the page with that user's context applied:

- The groups section shows a checkmark or X for each group, based on the user's group membership.
- Each permission row shows a checkmark or X indicating whether the user has that permission. This takes all sources of permission into account, including superuser status and active/staff flags.
- The transitions section is filtered to only show groups the user belongs to.

Selecting **All users** from the dropdown removes the user filter and returns to the default view.

## Printing

Use your browser's print function to produce a black-on-white version of the overview. The sticky navigation bar and Back To Top button are hidden in print output. A print header appears at the top of the printed page showing the page title and, if a user was selected, that user's name.

The printed layout uses smaller font sizes and compact spacing suitable for a paper report.
